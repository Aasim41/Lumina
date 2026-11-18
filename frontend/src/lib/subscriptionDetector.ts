import { type DBTransaction, type DBSubscription } from './db';

export interface DetectedSubscription {
  merchant: string;
  amount: number;
  billing_day: number;
  category: string;
  occurrences: number;
  reason: string;
}

const KNOWN_SUBSCRIPTION_PATTERNS = [
  /netflix/i,
  /spotify/i,
  /prime\s*video|amazon\s*prime/i,
  /hotstar|disney/i,
  /youtube|yt\s*premium/i,
  /jiocinema/i,
  /sonyliv/i,
  /zee5/i,
  /apple\s*(?:music|tv|one|icloud)/i,
  /google\s*one/i,
  /chatgpt|openai/i,
  /claude|anthropic/i,
  /midjourney/i,
  /github/i,
  /cult\.?fit|cure\.?fit|gym/i,
  /act\s*fibernet|airtel\s*(?:broadband|xstream)|jio\s*fiber|tata\s*(?:play|sky)|broadband/i,
  /housing\s*society|rent|maintenance/i,
];

const DISMISSED_KEY = 'lumina_dismissed_subscriptions';

export function getDismissedSubscriptions(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(DISMISSED_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function dismissSubscription(merchant: string): void {
  if (typeof window === 'undefined') return;
  const current = getDismissedSubscriptions();
  const lower = merchant.toLowerCase().trim();
  if (!current.includes(lower)) {
    current.push(lower);
    localStorage.setItem(DISMISSED_KEY, JSON.stringify(current));
  }
}

export function detectRecurringSubscriptions(
  transactions: DBTransaction[],
  activeSubscriptions: DBSubscription[]
): DetectedSubscription[] {
  if (!transactions || transactions.length === 0) return [];

  const existingMerchants = new Set(
    activeSubscriptions.map(s => s.merchant.toLowerCase().trim())
  );
  const dismissed = new Set(getDismissedSubscriptions());

  // Group transactions by normalized merchant name
  const merchantGroups: Record<string, DBTransaction[]> = {};

  transactions.forEach(t => {
    // Only look at debits/expenses (skip income/refunds)
    const isCredit = t.type === 'credit' || ['Income', 'Salary', 'Refund', 'Savings', 'SecretVault'].includes(t.category);
    if (isCredit || t.amount <= 0) return;

    const name = (t.merchant_clean || t.merchant_raw || '').trim();
    if (!name) return;

    const key = name.toLowerCase();
    if (!merchantGroups[key]) merchantGroups[key] = [];
    merchantGroups[key].push(t);
  });

  const detected: DetectedSubscription[] = [];

  for (const [key, txns] of Object.entries(merchantGroups)) {
    // Skip if already tracked or explicitly dismissed
    if (existingMerchants.has(key) || dismissed.has(key)) continue;

    const displayName = txns[0].merchant_clean || txns[0].merchant_raw || key;
    const category = txns[0].category || 'Entertainment';

    // Check if this merchant matches known subscription providers
    const isKnownSubscription = KNOWN_SUBSCRIPTION_PATTERNS.some(p => p.test(displayName));

    if (isKnownSubscription) {
      // Known subscription provider: even 1 transaction can trigger recommendation
      const latestTx = [...txns].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
      const dateObj = new Date(latestTx.date);
      const billingDay = isNaN(dateObj.getDate()) ? 1 : dateObj.getDate();

      detected.push({
        merchant: displayName,
        amount: latestTx.amount,
        billing_day: billingDay,
        category,
        occurrences: txns.length,
        reason: txns.length > 1
          ? `Billed ${txns.length} times in past statements`
          : `Recognized subscription provider (${displayName})`
      });
      continue;
    }

    // Otherwise, check for recurring pattern across multiple months with similar amount
    if (txns.length >= 2) {
      // Count distinct months
      const months = new Set(txns.map(t => (t.date ? t.date.substring(0, 7) : '')));
      months.delete('');

      if (months.size >= 2) {
        // Calculate average and variance
        const amounts = txns.map(t => t.amount);
        const avg = amounts.reduce((a, b) => a + b, 0) / amounts.length;
        const allClose = amounts.every(a => Math.abs(a - avg) / avg < 0.15); // within 15%

        if (allClose) {
          const latestTx = [...txns].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
          const dateObj = new Date(latestTx.date);
          const billingDay = isNaN(dateObj.getDate()) ? 1 : dateObj.getDate();

          detected.push({
            merchant: displayName,
            amount: Math.round(avg),
            billing_day: billingDay,
            category,
            occurrences: txns.length,
            reason: `Recurring charge detected across ${months.size} separate months`
          });
        }
      }
    }
  }

  // Sort by highest confidence / amount
  return detected.sort((a, b) => b.occurrences - a.occurrences || b.amount - a.amount);
}
