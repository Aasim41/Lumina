import { useEffect, useRef, useCallback } from 'react';
import { parseMultipleSMS, ParsedTransaction } from '@/lib/smsParser';
import { categorize } from '@/lib/categorizer';
import { cleanMerchantName, normalizeAmount } from '@/lib/cleaner';
import { db, DBTransaction, generateId, nowISO, toPaise } from '@/lib/db';
import { isAuthenticated, getUser } from '@/lib/auth';
import { parseBillFromSMS, saveTrackedBill } from '@/lib/billTracker';
import toast from 'react-hot-toast';

const SMS_PARSER_VERSION = 'v6';

// One-time migration to clean up outdated SMS caches and re-sync cleanly
async function ensureParserMigration(): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    const currentVersion = localStorage.getItem('lumina_sms_parser_version');
    if (currentVersion === SMS_PARSER_VERSION) return;

    // Reset synced hashes cache to allow full re-sync of past 60 days
    localStorage.removeItem('lumina_synced_sms');
    localStorage.removeItem('lumina_last_sms_sync');
    localStorage.removeItem('lumina_transactions');
    localStorage.removeItem('lumina_summary');
    localStorage.removeItem('lumina_categories');
    localStorage.removeItem('lumina_trends');
    localStorage.setItem('lumina_sms_parser_version', SMS_PARSER_VERSION);

    window.dispatchEvent(new Event('lumina_refresh_data'));
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
    const result = await NativeSms.getSms();
    if (!result || !result.smsList || !Array.isArray(result.smsList)) return [];

    const sixtyDaysAgo = Date.now() - (60 * 24 * 60 * 60 * 1000);

    return result.smsList
      .filter((sms: any) => {
        let smsTime = parseInt(sms.date || '0');
        if (smsTime > 0 && smsTime < 1e11) smsTime *= 1000;
        return smsTime >= sixtyDaysAgo;
      })
      .map((sms: any) => {
        let smsTime = parseInt(sms.date || '0');
        if (smsTime > 0 && smsTime < 1e11) smsTime *= 1000;
        if (!smsTime || isNaN(smsTime)) smsTime = Date.now();
        return {
          body: sms.body || '',
          sender: sms.address || '',
          date: new Date(smsTime).toISOString().split('T')[0],
        };
      });
  } catch (e) {
    console.warn('SMS read failed (permission likely denied):', e);
    return [];
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
  // 1. Fetch all current transactions from IndexedDB in ONE fast query
  const allExistingTxns = await db.transactions.toArray();
  const existingHashes = new Set(allExistingTxns.map(t => t.sms_hash).filter(Boolean));
  const cachedHashes = getSyncedHashes();

  // Filter parsed transactions to only those not already logged
  const newTransactions = parsed.filter(t => !existingHashes.has(t.smsHash) && !cachedHashes.has(t.smsHash));

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

  // Pre-index pending transactions for O(1) matching
  const pendingTxns = allExistingTxns.filter(t => t.status === 'pending');
  const pendingUpdates: Array<{ id: string; changes: any }> = [];

  // Pre-index existing non-cancelled transactions for cross-source deduplication
  const existingKeySet = new Set(
    allExistingTxns
      .filter(t => t.status !== 'cancelled')
      .map(t => `${t.date}_${t.amount}_${(t.merchant_clean || '').toLowerCase().trim()}`)
  );

  let userId: string | undefined;
  try {
    const cachedUser = getUser();
    if (cachedUser?.id) {
      userId = cachedUser.id;
    } else {
      const dbUser = await db.users.toCollection().first();
      if (dbUser?.id) userId = dbUser.id;
    }
  } catch {}

  const txnsToInsert: DBTransaction[] = [];
  const newlySyncedHashes: string[] = [];

  let syncedCredits = 0;
  let syncedDebits = 0;
  let totalCreditAmount = 0;
  let totalDebitAmount = 0;
  let lastCreditMerchant = '';
  let lastDebitMerchant = '';

  for (const txn of newTransactions) {
    // A. Reconcile with pending manual/UPI payment
    const pendingIdx = pendingTxns.findIndex(p => Math.abs(p.amount - txn.amount) < 0.01);
    if (pendingIdx !== -1) {
      const matchedPending = pendingTxns[pendingIdx];
      pendingTxns.splice(pendingIdx, 1);
      if (matchedPending.id) {
        pendingUpdates.push({
          id: matchedPending.id,
          changes: {
            status: 'confirmed',
            sms_hash: txn.smsHash,
            merchant_raw: txn.merchant || matchedPending.merchant_raw,
          }
        });
        localStorage.removeItem('lumina_pending_payment');
        newlySyncedHashes.push(txn.smsHash);
        if (txn.type === 'credit') {
          syncedCredits++;
          totalCreditAmount += txn.amount;
        } else {
          syncedDebits++;
          totalDebitAmount += txn.amount;
        }
        continue;
      }
    }

    // B. Cross-source deduplication
    const cleanMerchant = cleanMerchantName(txn.merchant);
    const dedupeKey = `${txn.date}_${txn.amount}_${cleanMerchant.toLowerCase().trim()}`;
    if (cleanMerchant !== 'Upi Payment' && cleanMerchant !== 'Money Received' && existingKeySet.has(dedupeKey)) {
      newlySyncedHashes.push(txn.smsHash);
      continue;
    }
    existingKeySet.add(dedupeKey);

    const category = categorize(txn.merchant, txn.type, txn.rawBody);
    const normAmount = normalizeAmount(txn.amount);

    txnsToInsert.push({
      id: generateId(),
      user_id: userId,
      sms_hash: txn.smsHash,
      date: txn.date,
      merchant_raw: txn.merchant,
      merchant_clean: cleanMerchant,
      amount: normAmount,
      amount_paise: toPaise(normAmount),
      status: 'confirmed',
      currency: 'INR',
      category,
      type: txn.type,
      source: 'auto_sms',
      created_at: nowISO(),
    });

    newlySyncedHashes.push(txn.smsHash);

    if (txn.type === 'credit') {
      syncedCredits++;
      totalCreditAmount += normAmount;
      lastCreditMerchant = cleanMerchant;
    } else {
      syncedDebits++;
      totalDebitAmount += normAmount;
      lastDebitMerchant = cleanMerchant;
    }
  }

  // C. Atomic batch write to Dexie
  if (txnsToInsert.length > 0) {
    await db.transactions.bulkAdd(txnsToInsert);
  }

  // D. Update reconciled pending items
  if (pendingUpdates.length > 0) {
    await Promise.all(pendingUpdates.map(u => db.transactions.update(u.id, u.changes)));
  }

  if (newlySyncedHashes.length > 0) {
    addSyncedHashes(newlySyncedHashes);
  }

  // Invalidate UI caches and notify all components in ONE broadcast
  if (typeof window !== 'undefined' && (txnsToInsert.length > 0 || pendingUpdates.length > 0)) {
    localStorage.removeItem('lumina_transactions');
    localStorage.removeItem('lumina_summary');
    localStorage.removeItem('lumina_categories');
    localStorage.removeItem('lumina_trends');
    window.dispatchEvent(new Event('lumina_refresh_data'));
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

  const doSync = useCallback(async (isManual: boolean = false) => {
    if (isSyncing.current) return;
    if (!isAuthenticated()) return;

    isSyncing.current = true;
    let toastId: string | undefined;

    if (isManual) {
      toastId = toast.loading('Scanning SMS for transactions... 🔍');
    }

    try {
      // Ensure one-time migration to clean up outdated caches
      await ensureParserMigration();

      const messages = await readSMSMessages();
      if (messages.length === 0) {
        if (isManual) {
          toast.dismiss(toastId);
          toast('No bank SMS messages found in the last 60 days.', { icon: 'ℹ️' });
        }
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
        if (isManual) {
          toast.dismiss(toastId);
          toast.success('All transactions are up to date! ✨', { icon: '✅' });
        }
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

      if (isManual) {
        toast.dismiss(toastId);
      }

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

        // Native notification
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
        } catch {}

        if (onSyncComplete) onSyncComplete(totalCount);
      } else if (isManual) {
        toast.success('All transactions are up to date! ✨', { icon: '✅' });
      }
    } catch (e: any) {
      console.warn('SMS sync error:', e);
      if (isManual) {
        toast.dismiss(toastId);
        toast.error('Could not sync SMS. Make sure SMS permission is allowed in Android Settings.');
      }
    } finally {
      isSyncing.current = false;
    }
  }, [onSyncComplete]);

  // Sync on app open
  useEffect(() => {
    const timer = setTimeout(() => {
      doSync(false);
    }, 1200);

    return () => clearTimeout(timer);
  }, [doSync]);

  // Background sync: re-sync every 15 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      doSync(false);
    }, 15 * 60 * 1000);

    return () => clearInterval(interval);
  }, [doSync]);

  // Sync when app comes back to foreground
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        doSync(false);
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [doSync]);

  return { syncNow: (isManual: boolean = true) => doSync(isManual) };
}
