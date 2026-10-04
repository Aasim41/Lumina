import { db, type DBUser, type DBTransaction, type DBSubscription, type DBCategoryBudget, type DBWishlistItem, type DBSplitBill, type DBSplitMember, type DBDebt, type DBInvestment, type DBGoal } from './db';

// ── Types ─────────────────────────────────────────────────────────

interface BackupData {
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

// ── Export All Data ───────────────────────────────────────────────

export async function exportAllData(): Promise<void> {
  const data: BackupData = {
    version: 1,
    exported_at: new Date().toISOString(),
    users: await db.users.toArray(),
    transactions: await db.transactions.toArray(),
    subscriptions: await db.subscriptions.toArray(),
    categoryBudgets: await db.categoryBudgets.toArray(),
    wishlistItems: await db.wishlistItems.toArray(),
    splitBills: await db.splitBills.toArray(),
    splitMembers: await db.splitMembers.toArray(),
    debts: await db.debts.toArray(),
    investments: await db.investments.toArray(),
    goals: await db.goals.toArray(),
  };

  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `smart-expense-backup-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

// ── Import Data ──────────────────────────────────────────────────

export async function importData(file: File): Promise<{ success: boolean; message: string }> {
  try {
    const text = await file.text();
    const data: BackupData = JSON.parse(text);

    if (!data.version || !data.transactions) {
      return { success: false, message: 'Invalid backup file format.' };
    }

    // Clear all tables first, then bulk insert
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

    // Bulk insert all data
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

    return {
      success: true,
      message: `Restored ${data.transactions.length} transactions and all associated data.`,
    };
  } catch (e: any) {
    return { success: false, message: `Import failed: ${e.message}` };
  }
}

// ── Export Transactions as CSV ────────────────────────────────────

export async function exportTransactionsCSV(): Promise<void> {
  const transactions = await db.transactions.orderBy('date').reverse().toArray();

  const header = 'Date,Merchant,Amount,Category,Source\n';
  const rows = transactions.map(t =>
    `${t.date},${csvEscape(t.merchant_clean)},${t.amount},${csvEscape(t.category)},${t.source}`
  ).join('\n');

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
