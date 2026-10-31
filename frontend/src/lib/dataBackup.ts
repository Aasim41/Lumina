import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { db, type DBUser, type DBTransaction, type DBSubscription, type DBCategoryBudget, type DBWishlistItem, type DBSplitBill, type DBSplitMember, type DBDebt, type DBInvestment, type DBGoal } from './db';

// ── Types ─────────────────────────────────────────────────────────

export interface BackupData {
  version: number;
  exported_at: string;
  users: DBUser[];
  transactions: DBTransaction[];
  subscriptions: DBSubscription[];
  categoryBudgets: DBCategoryBudget[];
  wishlistItems: DBWishlistItem[];
  splitBills: DBSplitBill[];
  splitMembers: DBSplitMember[];
  debts: DBDebt[];
  investments: DBInvestment[];
  goals: DBGoal[];
}

// ── Encryption Helpers (PBKDF2 + AES-GCM 256) ─────────────────────

async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as any,
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

function bufToB64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function b64ToBuf(b64: string): ArrayBuffer {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

// ── Database Serialization & Restore Primitives ───────────────────

export async function exportDatabasePayload(): Promise<BackupData> {
  const users = await db.users.toArray();
  const transactions = await db.transactions.toArray();
  const subscriptions = await db.subscriptions.toArray();
  const categoryBudgets = await db.categoryBudgets.toArray();
  const wishlistItems = await db.wishlistItems.toArray();
  const splitBills = await db.splitBills.toArray();
  const splitMembers = await db.splitMembers.toArray();
  const debts = await db.debts.toArray();
  const investments = await db.investments.toArray();
  const goals = await db.goals.toArray();

  return {
    version: 1,
    exported_at: new Date().toISOString(),
    users,
    transactions,
    subscriptions,
    categoryBudgets,
    wishlistItems,
    splitBills,
    splitMembers,
    debts,
    investments,
    goals,
  };
}

export async function restoreDatabaseFromPayload(data: BackupData): Promise<{ success: boolean; txCount: number }> {
  if (!data || !Array.isArray(data.transactions)) {
    return { success: false, txCount: 0 };
  }

  // Clear all tables first, then bulk insert in a single Dexie transaction
  await (db as any).transaction('rw', [
    db.users, db.transactions, db.subscriptions, db.categoryBudgets,
    db.wishlistItems, db.splitBills, db.splitMembers, db.debts,
    db.investments, db.goals
  ], async () => {
    await db.users.clear();
    await db.transactions.clear();
    await db.subscriptions.clear();
    await db.categoryBudgets.clear();
    await db.wishlistItems.clear();
    await db.splitBills.clear();
    await db.splitMembers.clear();
    await db.debts.clear();
    await db.investments.clear();
    await db.goals.clear();

    if (data.users?.length) await db.users.bulkAdd(data.users);
    if (data.transactions?.length) await db.transactions.bulkAdd(data.transactions);
    if (data.subscriptions?.length) await db.subscriptions.bulkAdd(data.subscriptions);
    if (data.categoryBudgets?.length) await db.categoryBudgets.bulkAdd(data.categoryBudgets);
    if (data.wishlistItems?.length) await db.wishlistItems.bulkAdd(data.wishlistItems);
    if (data.splitBills?.length) await db.splitBills.bulkAdd(data.splitBills);
    if (data.splitMembers?.length) await db.splitMembers.bulkAdd(data.splitMembers);
    if (data.debts?.length) await db.debts.bulkAdd(data.debts);
    if (data.investments?.length) await db.investments.bulkAdd(data.investments);
    if (data.goals?.length) await db.goals.bulkAdd(data.goals);
  });

  return { success: true, txCount: data.transactions.length };
}

// ── Automated Filesystem Vault Snapshot (Anti-Wipe Recovery) ───────

const SNAPSHOT_FILE = 'lumina_vault_autosave.json';
const SNAPSHOT_LOCALSTORAGE_KEY = 'lumina_vault_autosave';
let snapshotDebounceTimer: any = null;

export function triggerAutoSnapshot(): void {
  if (snapshotDebounceTimer) clearTimeout(snapshotDebounceTimer);
  snapshotDebounceTimer = setTimeout(() => {
    saveAutoFilesystemSnapshot().catch(err => console.warn('Auto snapshot failed:', err));
  }, 2000);
}

export async function saveAutoFilesystemSnapshot(): Promise<boolean> {
  try {
    const payload = await exportDatabasePayload();
    // Do not overwrite a healthy backup with an empty database
    if (!payload.transactions || payload.transactions.length === 0) {
      return false;
    }

    const json = JSON.stringify(payload);

    // 1. Write to Native App Filesystem (Directory.Data - persistent private storage)
    if (Capacitor.isNativePlatform()) {
      try {
        await Filesystem.writeFile({
          path: SNAPSHOT_FILE,
          data: json,
          directory: Directory.Data,
        });
      } catch (fsErr) {
        console.warn('Native filesystem snapshot failed:', fsErr);
      }
    }

    // 2. LocalStorage mirror as redundancy
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(SNAPSHOT_LOCALSTORAGE_KEY, json);
        localStorage.setItem('lumina_last_snapshot_time', new Date().toISOString());
      } catch {}
    }

    return true;
  } catch (err) {
    console.error('saveAutoFilesystemSnapshot failed:', err);
    return false;
  }
}

export async function restoreFromAutoFilesystemSnapshotIfEmpty(): Promise<{ restored: boolean; txCount: number }> {
  try {
    const count = await db.transactions.count();
    if (count > 0) {
      return { restored: false, txCount: count };
    }

    let rawJson: string | null = null;

    // 1. Attempt recovery from Native private Filesystem
    if (Capacitor.isNativePlatform()) {
      try {
        const fileRes = await Filesystem.readFile({
          path: SNAPSHOT_FILE,
          directory: Directory.Data,
        });
        if (typeof fileRes.data === 'string' && fileRes.data.length > 10) {
          rawJson = fileRes.data;
        }
      } catch {}
    }

    // 2. Fallback to LocalStorage mirror
    if (!rawJson && typeof window !== 'undefined') {
      rawJson = localStorage.getItem(SNAPSHOT_LOCALSTORAGE_KEY);
    }

    if (!rawJson) {
      return { restored: false, txCount: 0 };
    }

    const parsed: BackupData = JSON.parse(rawJson);
    if (!parsed || !Array.isArray(parsed.transactions) || parsed.transactions.length === 0) {
      return { restored: false, txCount: 0 };
    }

    const restoreRes = await restoreDatabaseFromPayload(parsed);
    console.log(`[Lumina Anti-Wipe Engine] Automatically restored ${restoreRes.txCount} transactions from persistent vault!`);
    return { restored: true, txCount: restoreRes.txCount };
  } catch (err) {
    console.error('[Lumina Anti-Wipe Engine] Restore error:', err);
    return { restored: false, txCount: 0 };
  }
}

// ── Export All Data (Plain or Password Encrypted) ──────────────────

export async function exportAllData(password?: string): Promise<{ success: boolean; txCount: number }> {
  const data = await exportDatabasePayload();

  const rawJson = JSON.stringify(data, null, 2);
  let fileContent: string;
  let filename = `smart-expense-backup-${new Date().toISOString().split('T')[0]}`;

  if (password && password.trim().length > 0) {
    // AES-GCM 256-bit encryption
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await deriveKey(password, salt);
    const enc = new TextEncoder();
    const ciphertext = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      enc.encode(rawJson)
    );

    const encryptedContainer = {
      encrypted: true,
      cipher: 'AES-GCM-256',
      salt: bufToB64(salt.buffer),
      iv: bufToB64(iv.buffer),
      ciphertext: bufToB64(ciphertext),
      exported_at: data.exported_at,
    };
    fileContent = JSON.stringify(encryptedContainer, null, 2);
    filename += '.lumina.enc';
  } else {
    fileContent = rawJson;
    filename += '.json';
  }

  const blob = new Blob([fileContent], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  URL.revokeObjectURL(url);
  document.body.removeChild(a);

  if (typeof window !== 'undefined') {
    localStorage.setItem('lumina_last_backup_time', new Date().toISOString());
  }

  return { success: true, txCount: data.transactions.length };
}

export function getLastBackupTime(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('lumina_last_backup_time');
}

export async function getBackupSummaryStats() {
  return {
    transactions: await db.transactions.count(),
    budgets: await db.categoryBudgets.count(),
    goals: await db.goals.count(),
    debts: await db.debts.count()
  };
}

// ── Import Data ──────────────────────────────────────────────────

export async function importData(file: File, providedPassword?: string): Promise<{ success: boolean; message: string }> {
  try {
    const text = await file.text();
    let rawObj: any = JSON.parse(text);

    // Handle Password-Encrypted AES-GCM backup container
    if (rawObj.encrypted && rawObj.ciphertext) {
      const password = providedPassword || window.prompt('🔒 Enter the password to decrypt this backup:');
      if (!password) {
        return { success: false, message: 'Decryption password is required.' };
      }

      try {
        const salt = new Uint8Array(b64ToBuf(rawObj.salt));
        const iv = new Uint8Array(b64ToBuf(rawObj.iv));
        const ciphertext = b64ToBuf(rawObj.ciphertext);
        const key = await deriveKey(password, salt);
        const decrypted = await crypto.subtle.decrypt(
          { name: 'AES-GCM', iv },
          key,
          ciphertext
        );
        const decText = new TextDecoder().decode(decrypted);
        rawObj = JSON.parse(decText);
      } catch {
        return { success: false, message: 'Incorrect decryption password or file corrupted.' };
      }
    }

    const data: BackupData = rawObj;

    if (!data.version || !data.transactions) {
      return { success: false, message: 'Invalid backup file format.' };
    }

    const restoreRes = await restoreDatabaseFromPayload(data);
    triggerAutoSnapshot();

    if (typeof window !== 'undefined') {
      localStorage.setItem('lumina_last_backup_time', new Date().toISOString());
    }

    return {
      success: true,
      message: `Restored ${restoreRes.txCount} transactions and all associated data.`,
    };
  } catch (e: any) {
    return { success: false, message: `Import failed: ${e.message}` };
  }
}

// ── Export Transactions as CSV ────────────────────────────────────

export async function exportTransactionsCSV(): Promise<void> {
  const transactions = await db.transactions.orderBy('date').reverse().toArray();

  const header = 'Date,Merchant,Amount,Category,Type,Source\n';
  const rows = transactions.map(t => {
    const txnType = t.type || (['Income', 'Salary', 'Refund'].includes(t.category) ? 'credit' : 'debit');
    return `${t.date},${csvEscape(t.merchant_clean)},${t.amount},${csvEscape(t.category)},${txnType},${t.source}`;
  }).join('\n');

  const csv = header + rows;
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'transactions_export.csv';
  document.body.appendChild(a);
  a.click();
  URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

function csvEscape(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
