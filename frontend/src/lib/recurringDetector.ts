/**
 * Lumina Recurring Payment & Subscription Inference Engine
 * 
 * Automatically detects hidden EMIs, recurring subscriptions, and utility bills
 * by analyzing historical transaction intervals and amount stability.
 */

import { DBTransaction } from './db';

export interface InferredSubscription {
  merchant: string;
  amount: number;
  cadence: 'monthly' | 'weekly';
  averageIntervalDays: number;
  occurrences: number;
  nextPredictedDate: string;
  confidence: number;
}

export function detectRecurringSubscriptions(transactions: DBTransaction[]): InferredSubscription[] {
  if (!transactions || transactions.length < 3) return [];

  // Group debit transactions by normalized merchant name
  const byMerchant: Map<string, DBTransaction[]> = new Map();

  for (const txn of transactions) {
    if (txn.type === 'credit' || txn.amount <= 0) continue;
    const name = (txn.merchant_clean || txn.merchant_raw || '').trim().toLowerCase();
    if (!name || name === 'cash' || name === 'atm' || name === 'upi') continue;

    const list = byMerchant.get(name) || [];
    list.push(txn);
    byMerchant.set(name, list);
  }

  const results: InferredSubscription[] = [];

  for (const [merchant, txns] of byMerchant.entries()) {
    if (txns.length < 2) continue;

    // Sort chronologically ascending
    const sorted = [...txns].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Check intervals between consecutive transactions
    const intervals: number[] = [];
    let amountSum = 0;
    let amountVariance = 0;

    for (let i = 1; i < sorted.length; i++) {
      const prevDate = new Date(sorted[i - 1].date).getTime();
      const currDate = new Date(sorted[i].date).getTime();
      const diffDays = Math.round((currDate - prevDate) / (1000 * 60 * 60 * 24));
      intervals.push(diffDays);
      amountSum += sorted[i].amount;
    }

    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const avgAmount = Math.round((sorted.reduce((sum, t) => sum + t.amount, 0) / sorted.length) * 100) / 100;

    // Variance check
    const isAmountStable = sorted.every(t => Math.abs(t.amount - avgAmount) <= avgAmount * 0.08 || Math.abs(t.amount - avgAmount) <= 10);

    // Monthly pattern: 26 to 34 days
    const isMonthly = avgInterval >= 26 && avgInterval <= 35 && intervals.every(d => d >= 24 && d <= 38);
    // Weekly pattern: 6 to 8 days
    const isWeekly = avgInterval >= 6 && avgInterval <= 8;

    if (isAmountStable && (isMonthly || isWeekly)) {
      const lastDate = new Date(sorted[sorted.length - 1].date);
      const nextDate = new Date(lastDate);
      nextDate.setDate(lastDate.getDate() + Math.round(avgInterval));

      const capitalizedMerchant = merchant
        .split(' ')
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');

      results.push({
        merchant: capitalizedMerchant,
        amount: avgAmount,
        cadence: isMonthly ? 'monthly' : 'weekly',
        averageIntervalDays: Math.round(avgInterval),
        occurrences: sorted.length,
        nextPredictedDate: nextDate.toISOString().split('T')[0],
        confidence: Math.min(0.65 + (sorted.length * 0.1), 0.98),
      });
    }
  }

  return results.sort((a, b) => b.confidence - a.confidence);
}

