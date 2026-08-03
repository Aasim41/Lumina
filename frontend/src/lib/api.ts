/**
 * api.ts — Local-first implementation
 *
 * Every function keeps the same name and return shape as before,
 * but reads/writes from the local Dexie.js database instead of
 * calling the FastAPI backend.
 */

import { db, generateId, nowISO, todayISO } from './db';
import type { DBTransaction, DBUser } from './db';
import { isAuthenticated } from './auth';
import { categorize } from './categorizer';
import { cleanMerchantName, normalizeAmount } from './cleaner';
import { forecastSpending } from './forecaster';
import { parseCSV } from './csvParser';
import {
  computeSummary,
  computeCategories,
  computeTrends,
  computeHeatmap,
  computeTopMerchants,
  computeInsights,
  computeAlerts,
  generateRoast,
  computeWrapUp,
  computeGoalMetrics,
  syncRollover,
  computeSpentThisMonth,
} from './analytics';

// ── Helpers ────────────────────────────────────────────────────────

async function getLocalUser(): Promise<DBUser> {
  const user = await db.users.toCollection().first();
  if (!user) throw new Error('No user profile found');
  return user;
}

// ── Auth ───────────────────────────────────────────────────────────

export const guestLogin = async (data: { name: string; age: number; dob: string; monthly_budget: number; user_persona?: string }) => {
  const userId = generateId();
  const email = `local-${userId}@smartexpense.app`;

  const newUser = {
    id: userId,
    name: data.name,
    email,
    age: data.age,
    dob: data.dob,
    monthly_budget: data.monthly_budget,
    last_budget_update: todayISO(),
    vault_balance: 0,
    preferred_currency: 'INR',
    user_persona: data.user_persona || 'unmarried_employee',
    current_streak: 0,
    unlocked_badges: '[]',
    created_at: nowISO(),
  };

  await db.users.add(newUser);

  return {
    access_token: 'local',
    token_type: 'bearer',
    user: newUser,
  };
};

// ── User Profile ──────────────────────────────────────────────────

export const getUserProfile = async () => {
  return getLocalUser();
};

export const updateUserProfile = async (data: any) => {
  const user = await getLocalUser();
  await db.users.update(user.id!, data);
  return { ...user, ...data };
};

// ── Transactions ──────────────────────────────────────────────────

export const getTransactions = async (params?: URLSearchParams) => {
  let txns = await db.transactions.orderBy('date').reverse().toArray();

  // Support basic filtering via params
  if (params) {
    const category = params.get('category');
    const month = params.get('month');
    if (category) txns = txns.filter(t => t.category === category);
    if (month) txns = txns.filter(t => t.date.startsWith(month));
  }

  return txns;
};

export const createTransaction = async (data: { date: string; merchant: string; amount: number; category?: string; currency?: string; original_amount?: number }) => {
  const merchantClean = cleanMerchantName(data.merchant);
  const category = data.category || categorize(merchantClean);

  const txn: DBTransaction = {
    id: generateId(),
    date: data.date,
    merchant_raw: data.merchant,
    merchant_clean: merchantClean,
    amount: normalizeAmount(data.amount),
    currency: data.currency || 'INR',
    original_amount: data.original_amount,
    category,
    source: 'manual_entry',
    created_at: nowISO(),
  };

  await db.transactions.add(txn);
  return txn;
};

export const updateTransaction = async (id: string, data: any) => {
  await db.transactions.update(id, data);
  return db.transactions.get(id);
};

export const deleteTransaction = async (id: string) => {
  await db.transactions.delete(id);
  return null;
};

// ── CSV Upload ────────────────────────────────────────────────────

export const uploadCSV = async (file: File) => {
  const parsed = await parseCSV(file);

  const transactions: DBTransaction[] = parsed.map(row => ({
    id: generateId(),
    date: row.date,
    merchant_raw: row.merchant_raw,
    merchant_clean: row.merchant_clean,
    amount: row.amount,
    currency: 'INR',
    category: row.category,
    source: 'csv_upload',
    created_at: nowISO(),
  }));

  await db.transactions.bulkAdd(transactions);

  const uniqueCategories = new Set(transactions.map(t => t.category));

  return {
    rows_processed: transactions.length,
    categories_found: uniqueCategories.size,
    skipped_rows: 0,
    transactions,
  };
};

export const uploadReceipt = async (_file: File) => {
  // Stub — receipt OCR was mock in the backend anyway
  const today = todayISO();
  return {
    merchant: 'Scanned Receipt',
    date: today,
    total_amount: 0,
    tax_amount: 0,
    items: [],
  };
};

export const confirmReceipt = async (data: { merchant: string; date: string; items: Array<{ name: string; price: number; qty: number; category: string }> }) => {
  const transactions: DBTransaction[] = data.items.map(item => ({
    id: generateId(),
    date: data.date,
    merchant_raw: `${data.merchant} - ${item.name}`,
    merchant_clean: data.merchant,
    amount: item.price * item.qty,
    currency: 'INR',
    category: item.category || 'Miscellaneous',
    source: 'receipt_scan',
    created_at: nowISO(),
  }));

  await db.transactions.bulkAdd(transactions);
  return transactions;
};

// ── Analytics ─────────────────────────────────────────────────────

export const getSummary = async () => {
  const user = await getLocalUser();
  return computeSummary(user);
};

export const getCategories = async () => {
  return computeCategories();
};

export const getTrends = async () => {
  return computeTrends();
};

export const getHeatmap = async () => {
  return computeHeatmap();
};

export const getTopMerchants = async () => {
  return computeTopMerchants();
};

export const getForecast = async () => {
  const txns = await db.transactions.toArray();
  return forecastSpending(txns.map(t => ({ date: t.date, category: t.category, amount: t.amount })));
};

export const getInsights = async () => {
  const user = await getLocalUser();
  return computeInsights(user);
};

export const getAlerts = async () => {
  const user = await getLocalUser();
  return computeAlerts(user);
};

export const getRoast = async (data: { amount: number; category: string; merchant: string }) => {
  const user = await getLocalUser();
  return generateRoast(user, data);
};

// ── Wrap Up ───────────────────────────────────────────────────────

export const getWrapUp = async () => {
  return computeWrapUp();
};

// ── Export ─────────────────────────────────────────────────────────

export const exportCSV = async () => {
  const { exportTransactionsCSV } = await import('./dataBackup');
  await exportTransactionsCSV();
};

export const exportPDF = async () => {
  // PDF generation is handled client-side via jspdf (already in the frontend)
  // The PDFGenerator.ts in lib/ handles this
  const { exportTransactionsCSV } = await import('./dataBackup');
  await exportTransactionsCSV();
};

// ── Subscriptions ─────────────────────────────────────────────────

export const getSubscriptions = async () => {
  return db.subscriptions.toArray();
};

export const createSubscription = async (data: { merchant: string; amount: number; billing_day: number }) => {
  const sub = {
    id: generateId(),
    merchant: data.merchant,
    amount: data.amount,
    billing_day: data.billing_day,
    created_at: nowISO(),
  };
  await db.subscriptions.add(sub);
  return sub;
};

export const deleteSubscription = async (id: string) => {
  await db.subscriptions.delete(id);
  return null;
};

// ── Wishlist ──────────────────────────────────────────────────────

export const getWishlist = async () => {
  return db.wishlistItems.toArray();
};

export const createWishlistItem = async (data: { name: string; price: number; priority: string; image_url?: string; link_url?: string }) => {
  const item = {
    id: generateId(),
    ...data,
    is_purchased: 'false',
    created_at: nowISO(),
  };
  await db.wishlistItems.add(item);
  return item;
};

export const markWishlistPurchased = async (id: string) => {
  const item = await db.wishlistItems.get(id);
  if (!item) return null;
  const newStatus = item.is_purchased === 'true' ? 'false' : 'true';
  await db.wishlistItems.update(id, { is_purchased: newStatus });
  return { ...item, is_purchased: newStatus };
};

export const deleteWishlistItem = async (id: string) => {
  await db.wishlistItems.delete(id);
  return null;
};

// ── Splits ────────────────────────────────────────────────────────

export const getSplits = async () => {
  const bills = await db.splitBills.toArray();
  const members = await db.splitMembers.toArray();

  return bills.map(bill => ({
    ...bill,
    members: members.filter(m => m.bill_id === bill.id),
  }));
};

export const getBalances = async () => {
  const bills = await db.splitBills.toArray();
  const members = await db.splitMembers.toArray();

  const balances: Record<string, number> = {};

  for (const bill of bills) {
    const billMembers = members.filter(m => m.bill_id === bill.id);
    for (const m of billMembers) {
      if (m.name.toLowerCase() === bill.payer_name.toLowerCase()) continue;
      if (m.is_paid === 'true') continue;
      balances[m.name] = (balances[m.name] || 0) + m.share_amount;
    }
  }

  return Object.entries(balances).map(([name, net_balance]) => ({ name, net_balance }));
};

export const createSplit = async (data: { title: string; total_amount: number; date: string; category?: string; payer_name?: string; members: Array<{ name: string; share_amount: number }> }) => {
  const billId = generateId();
  const bill = {
    id: billId,
    title: data.title,
    total_amount: data.total_amount,
    date: data.date,
    category: data.category || 'Miscellaneous',
    payer_name: data.payer_name || 'You',
    created_at: nowISO(),
  };

  await db.splitBills.add(bill);

  const memberRecords = data.members.map(m => ({
    id: generateId(),
    bill_id: billId,
    name: m.name,
    share_amount: m.share_amount,
    is_paid: 'false',
    created_at: nowISO(),
  }));

  await db.splitMembers.bulkAdd(memberRecords);

  return { ...bill, members: memberRecords };
};

export const toggleSplitMemberPaid = async (billId: string, memberId: string) => {
  const member = await db.splitMembers.get(memberId);
  if (!member) return null;
  const newStatus = member.is_paid === 'true' ? 'false' : 'true';
  await db.splitMembers.update(memberId, { is_paid: newStatus });
  return { ...member, is_paid: newStatus };
};

export const deleteSplit = async (id: string) => {
  await db.splitMembers.where('bill_id').equals(id).delete();
  await db.splitBills.delete(id);
  return null;
};

// ── Currency ──────────────────────────────────────────────────────

const RATES: Record<string, number> = {
  USD: 83.50, EUR: 91.20, GBP: 106.00, AED: 22.70, SGD: 62.50,
  JPY: 0.56, THB: 2.38, AUD: 55.80, CAD: 62.00, CHF: 94.50,
};

export const getCurrencyRates = async () => {
  return { base: 'INR', rates: RATES };
};

export const convertCurrency = async (amount: number, from: string) => {
  const rate = RATES[from.toUpperCase()] || 1.0;
  return {
    from_currency: from.toUpperCase(),
    original_amount: amount,
    rate,
    inr_amount: Math.round(amount * rate * 100) / 100,
  };
};

// ── Budgets ───────────────────────────────────────────────────────

export const getCategoryBudgets = async () => {
  const budgets = await db.categoryBudgets.toArray();
  const results = [];

  for (const b of budgets) {
    const synced = await syncRollover(b);
    const spent = await computeSpentThisMonth(synced.category);
    results.push({ ...synced, spent_this_month: spent });
  }

  return results;
};

export const createCategoryBudget = async (data: { category: string; amount: number }) => {
  // Check for existing budget in this category
  const existing = await db.categoryBudgets.where('category').equals(data.category).first();
  if (existing) throw new Error('Budget for this category already exists');

  const today = new Date();
  const monthStart = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;

  const budget = {
    id: generateId(),
    category: data.category,
    amount: data.amount,
    rollover_balance: 0,
    month_updated: monthStart,
    created_at: nowISO(),
  };

  await db.categoryBudgets.add(budget);
  const spent = await computeSpentThisMonth(data.category);
  return { ...budget, spent_this_month: spent };
};

export const updateCategoryBudget = async (id: string, data: { amount: number }) => {
  await db.categoryBudgets.update(id, { amount: data.amount });
  const budget = await db.categoryBudgets.get(id);
  if (!budget) throw new Error('Budget not found');
  const spent = await computeSpentThisMonth(budget.category);
  return { ...budget, spent_this_month: spent };
};

export const deleteCategoryBudget = async (id: string) => {
  await db.categoryBudgets.delete(id);
  return { detail: 'Budget deleted' };
};

// ── Settings ──────────────────────────────────────────────────────

export const updateSettings = async (data: any) => {
  const user = await getLocalUser();
  await db.users.update(user.id!, data);
  return { ...user, ...data };
};

export const updateBudget = async (monthly_budget: number) => {
  const user = await getLocalUser();
  await db.users.update(user.id!, { monthly_budget, last_budget_update: todayISO() });
  return { ...user, monthly_budget };
};

// ── Debts ─────────────────────────────────────────────────────────

export const getDebts = async () => {
  return db.debts.toArray();
};

export const createDebt = async (data: { name: string; total_amount: number; paid_amount?: number; interest_rate?: number; next_emi_date?: string }) => {
  const debt = {
    id: generateId(),
    name: data.name,
    total_amount: data.total_amount,
    paid_amount: data.paid_amount || 0,
    interest_rate: data.interest_rate,
    next_emi_date: data.next_emi_date,
    created_at: nowISO(),
  };
  await db.debts.add(debt);
  return debt;
};

export const updateDebt = async (id: string, data: any) => {
  await db.debts.update(id, data);
  return db.debts.get(id);
};

export const deleteDebt = async (id: string) => {
  await db.debts.delete(id);
  return null;
};

// ── Investments ───────────────────────────────────────────────────

export const getInvestments = async () => {
  const investments = await db.investments.toArray();
  return investments.map(inv => ({
    ...inv,
    current_price: null,
    current_value: null,
  }));
};

export const createInvestment = async (data: { name: string; ticker?: string; asset_class: string; quantity?: number; average_buy_price?: number; invested_amount?: number }) => {
  const inv = {
    id: generateId(),
    name: data.name,
    ticker: data.ticker,
    asset_class: data.asset_class,
    quantity: data.quantity || 0,
    average_buy_price: data.average_buy_price || 0,
    invested_amount: data.invested_amount || 0,
    created_at: nowISO(),
  };
  await db.investments.add(inv);
  return { ...inv, current_price: null, current_value: null };
};

export const updateInvestment = async (id: string, data: any) => {
  await db.investments.update(id, data);
  const inv = await db.investments.get(id);
  return inv ? { ...inv, current_price: null, current_value: null } : null;
};

export const deleteInvestment = async (id: string) => {
  await db.investments.delete(id);
  return null;
};

// ── Goals ─────────────────────────────────────────────────────────

export const getGoals = async () => {
  const goals = await db.goals.orderBy('created_at').reverse().toArray();
  const user = await getLocalUser();

  return goals.map(g => {
    const metrics = computeGoalMetrics(g, user);
    return { ...g, ...metrics };
  });
};

export const createGoal = async (data: { name: string; target_amount: number; target_date?: string; icon?: string }) => {
  const goal = {
    id: generateId(),
    name: data.name,
    target_amount: data.target_amount,
    saved_amount: 0,
    target_date: data.target_date,
    icon: data.icon || '🎯',
    created_at: nowISO(),
  };
  await db.goals.add(goal);
  const user = await getLocalUser();
  const metrics = computeGoalMetrics(goal, user);
  return { ...goal, ...metrics };
};

export const contributeToGoal = async (id: string, amount: number) => {
  const goal = await db.goals.get(id);
  if (!goal) throw new Error('Goal not found');
  const newSaved = (goal.saved_amount || 0) + amount;
  await db.goals.update(id, { saved_amount: newSaved });
  const updated = await db.goals.get(id);
  if (!updated) throw new Error('Goal not found after update');
  const user = await getLocalUser();
  const metrics = computeGoalMetrics(updated, user);
  return { ...updated, ...metrics };
};

export const deleteGoal = async (id: string) => {
  await db.goals.delete(id);
  return { message: 'Goal deleted successfully' };
};

// ── Mystery / Stealth Savings ─────────────────────────────────────

export const getMysteryEnvelope = async () => {
  return { has_envelope: false };
};

export const openMysteryEnvelope = async () => {
  return { message: 'No envelope available' };
};

// Auto-deduct stealth savings (called from dashboard)
export const autoDeductStealth = async () => {
  const today = todayISO();

  // Check if already deducted today
  const existing = await db.transactions
    .where('date').equals(today)
    .filter(t => t.category === 'SecretVault')
    .first();

  if (existing) return { status: 'already_deducted' };

  // Check if user has real transactions
  const realTxns = await db.transactions
    .filter(t => !['SecretVault', 'SecretVault_Processed', 'Savings'].includes(t.category))
    .first();

  if (!realTxns) return { status: 'no_transactions' };

  // Random deduction between 10 and 50
  const amount = Math.floor(Math.random() * 41) + 10;

  const txn: DBTransaction = {
    id: generateId(),
    date: today,
    merchant_raw: 'System Cache',
    merchant_clean: 'System Cache',
    amount,
    currency: 'INR',
    category: 'SecretVault',
    source: 'auto_stealth',
    created_at: nowISO(),
  };

  await db.transactions.add(txn);
  return { status: 'deducted', amount };
};

// ── Rollover ──────────────────────────────────────────────────────

export const getRolloverStatus = async () => {
  const today = new Date();
  const startThisMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;

  let startLastMonth: string;
  if (today.getMonth() === 0) {
    startLastMonth = `${today.getFullYear() - 1}-12-01`;
  } else {
    startLastMonth = `${today.getFullYear()}-${String(today.getMonth()).padStart(2, '0')}-01`;
  }

  const txns = await db.transactions
    .where('date').between(startLastMonth, startThisMonth, true, false)
    .filter(t => t.category === 'SecretVault')
    .toArray();

  const totalSaved = txns.reduce((sum, t) => sum + t.amount, 0);

  return { has_unprocessed_savings: totalSaved > 0, amount: totalSaved };
};

export const processRollover = async (action: string) => {
  const today = new Date();
  const startThisMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;

  let startLastMonth: string;
  if (today.getMonth() === 0) {
    startLastMonth = `${today.getFullYear() - 1}-12-01`;
  } else {
    startLastMonth = `${today.getFullYear()}-${String(today.getMonth()).padStart(2, '0')}-01`;
  }

  const txns = await db.transactions
    .where('date').between(startLastMonth, startThisMonth, true, false)
    .filter(t => t.category === 'SecretVault')
    .toArray();

  const totalSaved = txns.reduce((sum, t) => sum + t.amount, 0);
  if (totalSaved <= 0) return { status: 'no_savings' };

  const user = await getLocalUser();

  if (action === 'budget') {
    const newBudget = (user.monthly_budget || 0) + totalSaved;
    await db.users.update(user.id!, { monthly_budget: newBudget });
  } else if (action === 'vault') {
    const newVault = (user.vault_balance || 0) + totalSaved;
    await db.users.update(user.id!, { vault_balance: newVault });
  } else {
    return { error: 'Invalid action' };
  }

  // Mark as processed
  for (const txn of txns) {
    await db.transactions.update(txn.id!, { category: 'SecretVault_Processed' });
  }

  return { status: 'success', rolled_over: totalSaved };
};

// ── Chat (kept as a pass-through — ChatModal handles Groq directly) ──

export const sendChatMessage = async (message: string) => {
  // This is now handled directly in ChatModal.tsx
  return { response: 'Chat is handled locally via Groq API.' };
};

// ── Legacy compat: apiFetch ───────────────────────────────────────
// Some components import apiFetch directly. Provide a stub that
// routes to the correct local function based on the endpoint.

export async function apiFetch(endpoint: string, options: RequestInit = {}): Promise<any> {
  // Chat endpoint — handled in ChatModal directly, but provide fallback
  if (endpoint === '/api/chat' && options.method === 'POST') {
    const body = JSON.parse(options.body as string);
    return sendChatMessage(body.message);
  }

  // Stealth auto-deduct
  if (endpoint === '/api/stealth/auto-deduct' && options.method === 'POST') {
    return autoDeductStealth();
  }

  // Rollover
  if (endpoint === '/api/analytics/rollover' && options.method === 'POST') {
    const body = JSON.parse(options.body as string);
    return processRollover(body.action);
  }

  if (endpoint === '/api/analytics/rollover-status') {
    return getRolloverStatus();
  }

  // Wrap-up
  if (endpoint === '/api/analytics/wrap-up') {
    return getWrapUp();
  }

  console.warn(`[api.ts] Unhandled apiFetch call: ${endpoint}`);
  return {};
}
