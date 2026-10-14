import { useEffect, useRef, useCallback } from 'react';
import { parseMultipleSMS, ParsedTransaction } from '@/lib/smsParser';
import { categorize } from '@/lib/categorizer';
import { createTransaction } from '@/lib/api';
import { db } from '@/lib/db';
import { isAuthenticated } from '@/lib/auth';
import { parseBillFromSMS, saveTrackedBill } from '@/lib/billTracker';
import toast from 'react-hot-toast';

const SMS_PARSER_VERSION = 'v5';

// One-time migration to clean up old SMS transactions that showed bank account names/numbers
async function ensureParserMigration(): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    const currentVersion = localStorage.getItem('lumina_sms_parser_version');
    if (currentVersion === SMS_PARSER_VERSION) return;

    // Remove previously auto-synced SMS transactions so they can be cleanly re-parsed with v5
    const allTxns = await db.transactions.toArray();
    const autoSmsIds = allTxns
      .filter(t => t.source === 'auto_sms' || Boolean(t.sms_hash))
      .map(t => t.id!)
      .filter(Boolean);

    if (autoSmsIds.length > 0) {
      await db.transactions.bulkDelete(autoSmsIds);
    }

    localStorage.removeItem('lumina_synced_sms');
    localStorage.removeItem('lumina_last_sms_sync');
    localStorage.removeItem('lumina_transactions');
    localStorage.removeItem('lumina_summary');
    localStorage.removeItem('lumina_categories');
    localStorage.removeItem('lumina_trends');
    localStorage.setItem('lumina_sms_parser_version', SMS_PARSER_VERSION);

    window.dispatchEvent(new Event('lumina-data-changed'));
  } catch (e) {
    console.warn('SMS parser migration warning:', e);
  }
}

// Get stored hashes of already-synced SMS to avoid duplicates
function getSyncedHashes(): Set<string> {
  try {
    const stored = localStorage.getItem('lumina_synced_sms');
    if (stored) return new Set(JSON.parse(stored));
  } catch {}
  return new Set();
}

function addSyncedHashes(hashes: string[]) {
  const existing = getSyncedHashes();
  hashes.forEach(h => existing.add(h));
  const arr = Array.from(existing);
  const trimmed = arr.slice(Math.max(0, arr.length - 5000));
  localStorage.setItem('lumina_synced_sms', JSON.stringify(trimmed));
}

function getLastSyncTime(): number {
  try {
    return parseInt(localStorage.getItem('lumina_last_sms_sync') || '0');
  } catch {
    return 0;
  }
}

function setLastSyncTime(time: number) {
  localStorage.setItem('lumina_last_sms_sync', String(time));
}

async function readSMSMessages(): Promise<Array<{ body: string; sender: string; date: string }>> {
  try {
    const { Capacitor, registerPlugin } = await import('@capacitor/core');
    if (!Capacitor.isNativePlatform()) {
      return []; // Silently return empty on web
    }

    const NativeSms = registerPlugin<any>('NativeSms');

    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    const lastSync = getLastSyncTime();
    const since = Math.max(thirtyDaysAgo, lastSync);

    const result = await NativeSms.getSms();
    if (!result.smsList) return [];

    return result.smsList
      .filter((sms: any) => {
        const smsTime = parseInt(sms.date || '0');
        return smsTime >= since;
      })
      .map((sms: any) => ({
        body: sms.body || '',
        sender: sms.address || '',
        date: new Date(parseInt(sms.date || Date.now())).toISOString().split('T')[0],
      }));
  } catch (e) {
    console.warn('SMS read failed (permission likely denied):', e);
    return []; // Never crash — just return empty
  }
}

async function syncTransactions(parsed: ParsedTransaction[]): Promise<{
  syncedCredits: number;
  syncedDebits: number;
  totalCreditAmount: number;
  totalDebitAmount: number;
  lastCreditMerchant: string;
  lastDebitMerchant: string;
}> {
  const syncedHashes = getSyncedHashes();
  const newTransactions = parsed.filter(t => !syncedHashes.has(t.smsHash));

  if (newTransactions.length === 0) {
    return {
      syncedCredits: 0,
      syncedDebits: 0,
      totalCreditAmount: 0,
      totalDebitAmount: 0,
      lastCreditMerchant: '',
      lastDebitMerchant: '',
    };
  }

  let syncedCredits = 0;
  let syncedDebits = 0;
  let totalCreditAmount = 0;
  let totalDebitAmount = 0;
  let lastCreditMerchant = '';
  let lastDebitMerchant = '';
  const newHashes: string[] = [];

  for (const txn of newTransactions) {
    try {
      const category = categorize(txn.merchant, txn.type, txn.rawBody);
      await createTransaction({
        date: txn.date,
        merchant: txn.merchant,
        amount: txn.amount,
        category,
        type: txn.type, // 'credit' | 'debit'
        source: 'auto_sms',
        sms_hash: txn.smsHash,
      });
      newHashes.push(txn.smsHash);

      if (txn.type === 'credit') {
        syncedCredits++;
        totalCreditAmount += txn.amount;
        lastCreditMerchant = txn.merchant;
      } else {
        syncedDebits++;
        totalDebitAmount += txn.amount;
        lastDebitMerchant = txn.merchant;
      }
    } catch (e) {
      console.error('Failed to sync transaction:', e);
    }
  }

  if (newHashes.length > 0) {
    addSyncedHashes(newHashes);
  }

  setLastSyncTime(Date.now());
  return {
    syncedCredits,
    syncedDebits,
    totalCreditAmount,
    totalDebitAmount,
    lastCreditMerchant,
    lastDebitMerchant,
  };
}

export function useSMSSync(onSyncComplete?: (count: number) => void) {
  const isSyncing = useRef(false);

  const doSync = useCallback(async () => {
    if (isSyncing.current) return;

    if (!isAuthenticated()) return;

    isSyncing.current = true;

    try {
      // Ensure one-time migration removes old bank-account-named SMS entries
      await ensureParserMigration();

      const messages = await readSMSMessages();
      if (messages.length === 0) {
        isSyncing.current = false;
        return;
      }

      // Detect credit card and utility bill statements
      for (const msg of messages) {
        try {
          const bill = parseBillFromSMS(msg.body);
          if (bill) {
            saveTrackedBill(bill);
          }
        } catch {}
      }

      const parsed = parseMultipleSMS(messages);
      if (parsed.length === 0) {
        isSyncing.current = false;
        return;
      }

      const {
        syncedCredits,
        syncedDebits,
        totalCreditAmount,
        totalDebitAmount,
        lastCreditMerchant,
        lastDebitMerchant,
      } = await syncTransactions(parsed);

      const totalCount = syncedCredits + syncedDebits;

      if (totalCount > 0) {
        let notificationTitle = 'Transactions Tracked! 💰';
        let notificationBody = `Synced ${totalCount} new transaction${totalCount > 1 ? 's' : ''}.`;

        if (syncedCredits > 0 && syncedDebits === 0) {
          notificationTitle = 'Money Received! 💵';
          notificationBody = `₹${totalCreditAmount.toLocaleString('en-IN')} credited from ${lastCreditMerchant || 'UPI/Bank'}.`;
          toast.success(notificationBody, { icon: '💵', duration: 4500 });
        } else if (syncedDebits > 0 && syncedCredits === 0) {
          notificationTitle = 'Expense Tracked! 💳';
          notificationBody = `₹${totalDebitAmount.toLocaleString('en-IN')} spent at ${lastDebitMerchant || 'merchant'}.`;
          toast.success(notificationBody, { icon: '💳', duration: 4000 });
        } else {
          notificationTitle = 'Cash Flow Updated! 📊';
          notificationBody = `+₹${totalCreditAmount.toLocaleString('en-IN')} inflow (${syncedCredits}) & -₹${totalDebitAmount.toLocaleString('en-IN')} outflow (${syncedDebits}).`;
          toast.success(notificationBody, { icon: '💰', duration: 4500 });
        }

        // Try native notification but don't crash if it fails
        try {
          const { Capacitor } = await import('@capacitor/core');
          if (Capacitor.isNativePlatform()) {
            const { LocalNotifications } = await import('@capacitor/local-notifications');
            await LocalNotifications.schedule({
              notifications: [
                {
                  title: notificationTitle,
                  body: notificationBody,
                  id: Math.floor(Math.random() * 2000000000),
                },
              ],
            });
          }
        } catch (e) {
          console.warn('Local notification error (non-fatal):', e);
        }

        if (onSyncComplete) onSyncComplete(totalCount);
      }
    } catch (e: any) {
      console.warn('SMS sync error (non-fatal):', e);
    } finally {
      isSyncing.current = false;
    }
  }, [onSyncComplete]);

  // Sync on app open
  useEffect(() => {
    const timer = setTimeout(() => {
      doSync();
    }, 1500);

    return () => clearTimeout(timer);
  }, [doSync]);

  // Background sync: re-sync every 15 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      doSync();
    }, 15 * 60 * 1000);

    return () => clearInterval(interval);
  }, [doSync]);

  // Sync when app comes back to foreground
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        doSync();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [doSync]);

  return { syncNow: doSync };
}
