/**
 * Lumina Financial Anomaly Detection Engine
 * 
 * Uses Robust Modified Z-Score with Median Absolute Deviation (MAD):
 *   M_i = 0.6745 * (x_i - median) / MAD
 * 
 * Flags statistically anomalous expenses per category without being distorted by historical spikes.
 */

import { DBTransaction } from './db';

export interface AnomalyReport {
  isAnomaly: boolean;
  score: number;             // Modified Z-score
  median: number;            // Category median spend
  factorAboveMedian: number; // e.g. 8.5x usual spend
  explanation?: string;
}

export function detectSpendAnomaly(
  amount: number,
  category: string,
  historicalTransactions: DBTransaction[]
): AnomalyReport {
  if (amount <= 0 || !historicalTransactions || historicalTransactions.length < 5) {
    return { isAnomaly: false, score: 0, median: amount, factorAboveMedian: 1 };
  }

  // Filter historical debit amounts in the same category (excluding current)
  const categoryAmounts = historicalTransactions
    .filter(t => t.category === category && (t.type === 'debit' || !t.type) && t.amount > 0)
    .map(t => t.amount)
    .sort((a, b) => a - b);

  if (categoryAmounts.length < 4) {
    return { isAnomaly: false, score: 0, median: amount, factorAboveMedian: 1 };
  }

  // Calculate Median
  const mid = Math.floor(categoryAmounts.length / 2);
  const median = categoryAmounts.length % 2 !== 0 
    ? categoryAmounts[mid] 
    : (categoryAmounts[mid - 1] + categoryAmounts[mid]) / 2;

  // Calculate Median Absolute Deviation (MAD)
  const deviations = categoryAmounts
    .map(val => Math.abs(val - median))
    .sort((a, b) => a - b);

  const mad = deviations.length % 2 !== 0
    ? deviations[mid]
    : (deviations[mid - 1] + deviations[mid]) / 2;

  if (mad === 0) {
    // If MAD is 0 (e.g. repeated same amounts), check relative factor
    const factor = amount / Math.max(median, 1);
    const isAnomaly = factor >= 3.5 && amount >= 500;
    return {
      isAnomaly,
      score: isAnomaly ? 3.5 : 0,
      median,
      factorAboveMedian: parseFloat(factor.toFixed(1)),
      explanation: isAnomaly ? `₹${amount} is ${factor.toFixed(1)}x higher than your usual ${category} spend (₹${Math.round(median)})` : undefined
    };
  }

  // Modified Z-Score: 0.6745 * (x - median) / MAD
  const modifiedZ = (0.6745 * (amount - median)) / mad;
  const isAnomaly = modifiedZ >= 3.0 && amount >= 300 && amount > median * 2.2;
  const factorAboveMedian = parseFloat((amount / Math.max(median, 1)).toFixed(1));

  return {
    isAnomaly,
    score: parseFloat(modifiedZ.toFixed(2)),
    median: Math.round(median),
    factorAboveMedian,
    explanation: isAnomaly 
      ? `High Spend Alert: ₹${amount} is ${factorAboveMedian}x higher than your usual ${category} spend (₹${Math.round(median)})`
      : undefined
  };
}

/**
 * Scan all user transactions to detect and rank anomalies
 */
export function findTopAnomalies(transactions: DBTransaction[], limit = 3): Array<DBTransaction & { anomaly: AnomalyReport }> {
  const anomalies: Array<DBTransaction & { anomaly: AnomalyReport }> = [];

  for (const txn of transactions) {
    if (txn.type === 'credit') continue;
    const report = detectSpendAnomaly(txn.amount, txn.category, transactions);
    if (report.isAnomaly) {
      anomalies.push({ ...txn, anomaly: report });
    }
  }

  return anomalies
    .sort((a, b) => b.anomaly.score - a.anomaly.score)
    .slice(0, limit);
}
