import { useEffect, useRef, useCallback } from 'react';
import { parseMultipleSMS, ParsedTransaction } from '@/lib/smsParser';
import { createTransaction } from '@/lib/api';
import { getToken } from '@/lib/auth';

// Category mapping based on merchant/description keywords
const CATEGORY_MAP: [RegExp, string][] = [
  [/swiggy|zomato|food|restaurant|cafe|eat|pizza|burger|biryani|domino|mcd|kfc/i, 'Food & Dining'],
  [/uber|ola|rapido|metro|irctc|rail|bus|petrol|fuel|hp\s|iocl|bpcl|shell|parking/i, 'Transport'],
  [/amazon|flipkart|myntra|ajio|meesho|nykaa|shopping|mart|store|shop|mall|dmart|reliance/i, 'Shopping'],
  [/netflix|hotstar|spotify|prime|youtube|disney|jiocinema|game|movie|pvr|inox|book/i, 'Entertainment'],
  [/pharma|medic|hospital|doctor|apollo|diagnostic|lab|health|gym|fit/i, 'Healthcare'],
  [/rent|landlord|society|maintenance|housing|pg\b|hostel/i, 'Rent & Housing'],
  [/jio|airtel|vodafone|vi\b|bsnl|recharge|broadband|wifi|internet|mobile\s*bill/i, 'Bills & Utilities'],
  [/electricity|elec|power|water|gas|lpg|dth|tata\s*sky|dish/i, 'Bills & Utilities'],
  [/insurance|lic|policy|premium|mutual\s*fund|sip|invest|stock|zerodha|groww|upstox/i, 'Investment'],
  [/school|college|university|tuition|course|udemy|education|exam|fee/i, 'Education'],
  [/atm|cash|withdraw/i, 'Cash Withdrawal'],
  [/emi|loan|credit\s*card|interest|repay/i, 'EMI & Loans'],
  [/salary|income|credit.*salary/i, 'Income'],
  [/refund|cashback|reversal/i, 'Refund'],
];

function categorize(merchant: string, type: string): string {
  if (type === 'credit') {
    // Check if it's a refund
    if (/refund|cashback|reversal/i.test(merchant)) return 'Refund';
    return 'Income';
  }

  for (const [pattern, category] of CATEGORY_MAP) {
    if (pattern.test(merchant)) return category;
  }
  return 'Miscellaneous';
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
  // Keep only last 5000 hashes to prevent localStorage bloat
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
  const { Capacitor, registerPlugin } = await import('@capacitor/core');
  if (!Capacitor.isNativePlatform()) {
    throw new Error('Not running on native Android device');
  }

  const NativeSms = registerPlugin<any>('NativeSms');

  // Read SMS from the last 7 days
  const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
  const lastSync = getLastSyncTime();
  const since = Math.max(sevenDaysAgo, lastSync);

  const result = await NativeSms.getSms();
  if (!result.smsList) return [];

  // Filter to messages since last sync and map to our format
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
}

async function syncTransactions(parsed: ParsedTransaction[]): Promise<number> {
  const syncedHashes = getSyncedHashes();
  const newTransactions = parsed.filter(t => !syncedHashes.has(t.smsHash));

  if (newTransactions.length === 0) return 0;

  let synced = 0;
  const newHashes: string[] = [];

  for (const txn of newTransactions) {
    // Only sync debits as expenses (credits are income, handled differently)
    if (txn.type === 'credit') {
      newHashes.push(txn.smsHash);
      continue;
    }

    try {
      const category = categorize(txn.merchant, txn.type);
      await createTransaction({
        date: txn.date,
        merchant: `${txn.merchant} (${txn.source})`,
        amount: txn.amount,
        category,
      });
      newHashes.push(txn.smsHash);
      synced++;
    } catch (e) {
      console.error('Failed to sync transaction:', e);
    }
  }

  if (newHashes.length > 0) {
    addSyncedHashes(newHashes);
  }

  setLastSyncTime(Date.now());
  return synced;
}

import toast from 'react-hot-toast';

export function useSMSSync(onSyncComplete?: (count: number) => void) {
  const isSyncing = useRef(false);

  const doSync = useCallback(async () => {
    // Prevent concurrent syncs
    if (isSyncing.current) return;
    // Only sync if logged in
    if (!getToken()) return;

    isSyncing.current = true;

    try {
      const messages = await readSMSMessages();
      if (messages.length === 0) {
        toast('No recent messages found (or permission denied)', { icon: 'ℹ️' });
        isSyncing.current = false;
        return;
      }

      const parsed = parseMultipleSMS(messages);
      if (parsed.length === 0) {
        toast(`Read ${messages.length} SMS, but none matched transaction formats`, { icon: 'ℹ️' });
        isSyncing.current = false;
        return;
      }

      const count = await syncTransactions(parsed);
      if (count > 0 && onSyncComplete) {
        onSyncComplete(count);
      } else if (count === 0) {
        toast(`Found ${parsed.length} transactions, but they were already synced`, { icon: 'ℹ️' });
      }
    } catch (e: any) {
      toast.error('SMS sync error: ' + (e?.message || 'Unknown error'));
      console.error('SMS sync error:', e);
    } finally {
      isSyncing.current = false;
    }
  }, [onSyncComplete]);

  // Sync on app open (mount)
  useEffect(() => {
    // Small delay to let the UI render first
    const timer = setTimeout(() => {
      doSync();
    }, 2000);

    return () => clearTimeout(timer);
  }, [doSync]);

  // Background sync: re-sync every 15 minutes while the app is open
  useEffect(() => {
    const interval = setInterval(() => {
      doSync();
    }, 15 * 60 * 1000); // 15 minutes

    return () => clearInterval(interval);
  }, [doSync]);

  // Sync when app comes back to foreground (e.g., user switches back to the app)
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
