/**
 * api.ts — Supabase implementation
 *
 * Every function keeps the same name and return shape as before,
 * but reads/writes from Supabase instead of Dexie.js.
 */

import { supabase } from './supabase';
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

export interface DBUser {
  id: string;
  name: string;
  email: string;
  age: number;
  dob: string;
  monthly_budget: number;
  last_budget_update: string;
  vault_balance: number;
  preferred_currency: string;
  user_persona: string;
  current_streak: number;
  unlocked_badges: string;
  created_at: string;
}

export interface DBTransaction {
  id: string;
  user_id?: string;
  date: string;
  merchant_raw: string;
  merchant_clean: string;
  amount: number;
  currency: string;
  original_amount?: number;
  category: string;
  source: string;
  created_at: string;
}

// ── Helpers ────────────────────────────────────────────────────────

async function getAuthUserId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  return user.id;
}

async function getLocalUser(): Promise<DBUser> {
  const userId = await getAuthUserId();
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
  if (error || !data) throw new Error('No user profile found');
  return data as DBUser;
}

// ── User Profile ──────────────────────────────────────────────────

export const getUserProfile = async () => {
  return getLocalUser();
};

export const updateUserProfile = async (data: any) => {
  const userId = await getAuthUserId();
  const { error } = await supabase.from('profiles').update(data).eq('id', userId);
  if (error) throw error;
  return getLocalUser();
};

// ── Transactions ──────────────────────────────────────────────────

export const getTransactions = async (params?: URLSearchParams) => {
  const userId = await getAuthUserId();
  let query = supabase.from('transactions').select('*').eq('user_id', userId).order('date', { ascending: false });

  if (params) {
    const category = params.get('category');
    const month = params.get('month');
    if (category) query = query.eq('category', category);
    if (month) query = query.like('date', `${month}%`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as DBTransaction[];
};

export const createTransaction = async (data: { date: string; merchant: string; amount: number; category?: string; currency?: string; original_amount?: number }) => {
  const userId = await getAuthUserId();
  const merchantClean = cleanMerchantName(data.merchant);
  const category = data.category || categorize(merchantClean);

  const txn: DBTransaction = {
    id: crypto.randomUUID(),
    user_id: userId,
    date: data.date,
    merchant_raw: data.merchant,
    merchant_clean: merchantClean,
    amount: normalizeAmount(data.amount),
    currency: data.currency || 'INR',
    original_amount: data.original_amount,
    category,
    source: 'manual_entry',
    created_at: new Date().toISOString(),
  };

  const { error } = await supabase.from('transactions').insert(txn);
  if (error) throw error;
  return txn;
};

export const updateTransaction = async (id: string, data: any) => {
  const { error } = await supabase.from('transactions').update(data).eq('id', id);
  if (error) throw error;
  const { data: txn, error: getError } = await supabase.from('transactions').select('*').eq('id', id).single();
  if (getError) throw getError;
  return txn;
};

export const deleteTransaction = async (id: string) => {
  const { error } = await supabase.from('transactions').delete().eq('id', id);
  if (error) throw error;
  return null;
};

// ── CSV Upload ────────────────────────────────────────────────────

export const uploadCSV = async (file: File) => {
  const userId = await getAuthUserId();
  const parsed = await parseCSV(file);

  const transactions: DBTransaction[] = parsed.map(row => ({
    id: crypto.randomUUID(),
    user_id: userId,
    date: row.date,
    merchant_raw: row.merchant_raw,
    merchant_clean: row.merchant_clean,
    amount: row.amount,
    currency: 'INR',
    category: row.category,
    source: 'csv_upload',
    created_at: new Date().toISOString(),
  }));

  const { error } = await supabase.from('transactions').insert(transactions);
  if (error) throw error;

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
  const today = new Date().toISOString().split('T')[0];
  return {
    merchant: 'Scanned Receipt',
    date: today,
    total_amount: 0,
    tax_amount: 0,
    items: [],
  };
};

export const confirmReceipt = async (data: { merchant: string; date: string; items: Array<{ name: string; price: number; qty: number; category: string }> }) => {
  const userId = await getAuthUserId();
  const transactions: DBTransaction[] = data.items.map(item => ({
    id: crypto.randomUUID(),
    user_id: userId,
    date: data.date,
    merchant_raw: `${data.merchant} - ${item.name}`,
    merchant_clean: data.merchant,
    amount: item.price * item.qty,
    currency: 'INR',
    category: item.category || 'Miscellaneous',
    source: 'receipt_scan',
    created_at: new Date().toISOString(),
  }));

  const { error } = await supabase.from('transactions').insert(transactions);
  if (error) throw error;
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
  const userId = await getAuthUserId();
  const { data: txns } = await supabase.from('transactions').select('*').eq('user_id', userId);
  return forecastSpending((txns || []).map(t => ({ date: t.date, category: t.category, amount: t.amount })));
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
  const userId = await getAuthUserId();
  const { data } = await supabase.from('subscriptions').select('*').eq('user_id', userId);
  return data || [];
};

export const createSubscription = async (data: { merchant: string; amount: number; billing_day: number }) => {
  const userId = await getAuthUserId();
  const sub = {
    id: crypto.randomUUID(),
    user_id: userId,
    merchant: data.merchant,
    amount: data.amount,
    billing_day: data.billing_day,
    created_at: new Date().toISOString(),
  };
  const { error } = await supabase.from('subscriptions').insert(sub);
  if (error) throw error;
  return sub;
};

export const deleteSubscription = async (id: string) => {
  const { error } = await supabase.from('subscriptions').delete().eq('id', id);
  if (error) throw error;
  return null;
};

// ── Wishlist ──────────────────────────────────────────────────────

export const getWishlist = async () => {
  const userId = await getAuthUserId();
  const { data } = await supabase.from('wishlist_items').select('*').eq('user_id', userId);
  return data || [];
};

export const createWishlistItem = async (data: { name: string; price: number; priority: string; image_url?: string; link_url?: string }) => {
  const userId = await getAuthUserId();
  const item = {
    id: crypto.randomUUID(),
    user_id: userId,
    ...data,
    is_purchased: 'false',
    created_at: new Date().toISOString(),
  };
  const { error } = await supabase.from('wishlist_items').insert(item);
  if (error) throw error;
  return item;
};

export const markWishlistPurchased = async (id: string) => {
  const { data: item } = await supabase.from('wishlist_items').select('*').eq('id', id).single();
  if (!item) return null;
  const newStatus = item.is_purchased === 'true' ? 'false' : 'true';
  const { error } = await supabase.from('wishlist_items').update({ is_purchased: newStatus }).eq('id', id);
  if (error) throw error;
  return { ...item, is_purchased: newStatus };
};

export const deleteWishlistItem = async (id: string) => {
  const { error } = await supabase.from('wishlist_items').delete().eq('id', id);
  if (error) throw error;
  return null;
};

// ── Splits ────────────────────────────────────────────────────────

export const getSplits = async () => {
  const userId = await getAuthUserId();
  const { data: bills } = await supabase.from('split_bills').select('*').eq('user_id', userId);
  const { data: members } = await supabase.from('split_members').select('*');

  return (bills || []).map(bill => ({
    ...bill,
    members: (members || []).filter(m => m.bill_id === bill.id),
  }));
};

export const getBalances = async () => {
  const userId = await getAuthUserId();
  const { data: bills } = await supabase.from('split_bills').select('*').eq('user_id', userId);
  const { data: members } = await supabase.from('split_members').select('*');

  const balances: Record<string, number> = {};

  for (const bill of (bills || [])) {
    const billMembers = (members || []).filter(m => m.bill_id === bill.id);
    for (const m of billMembers) {
      if (m.name.toLowerCase() === bill.payer_name.toLowerCase()) continue;
      if (m.is_paid === 'true') continue;
      balances[m.name] = (balances[m.name] || 0) + m.share_amount;
    }
  }

  return Object.entries(balances).map(([name, net_balance]) => ({ name, net_balance }));
};

export const createSplit = async (data: { title: string; total_amount: number; date: string; category?: string; payer_name?: string; members: Array<{ name: string; share_amount: number }> }) => {
  const userId = await getAuthUserId();
  const billId = crypto.randomUUID();
  const bill = {
    id: billId,
    user_id: userId,
    title: data.title,
    total_amount: data.total_amount,
    date: data.date,
    category: data.category || 'Miscellaneous',
    payer_name: data.payer_name || 'You',
    created_at: new Date().toISOString(),
  };

  const { error: billError } = await supabase.from('split_bills').insert(bill);
  if (billError) throw billError;

  const memberRecords = data.members.map(m => ({
    id: crypto.randomUUID(),
    bill_id: billId,
    name: m.name,
    share_amount: m.share_amount,
    is_paid: 'false',
    created_at: new Date().toISOString(),
  }));

  const { error: membersError } = await supabase.from('split_members').insert(memberRecords);
  if (membersError) throw membersError;

  return { ...bill, members: memberRecords };
};

export const toggleSplitMemberPaid = async (billId: string, memberId: string) => {
  const { data: member } = await supabase.from('split_members').select('*').eq('id', memberId).single();
  if (!member) return null;
  const newStatus = member.is_paid === 'true' ? 'false' : 'true';
  const { error } = await supabase.from('split_members').update({ is_paid: newStatus }).eq('id', memberId);
  if (error) throw error;
  return { ...member, is_paid: newStatus };
};

export const deleteSplit = async (id: string) => {
  await supabase.from('split_members').delete().eq('bill_id', id);
  await supabase.from('split_bills').delete().eq('id', id);
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
  const userId = await getAuthUserId();
  const { data: budgets } = await supabase.from('category_budgets').select('*').eq('user_id', userId);
  const results = [];

  for (const b of (budgets || [])) {
    const synced = await syncRollover(b);
    const spent = await computeSpentThisMonth(synced.category);
    results.push({ ...synced, spent_this_month: spent });
  }

  return results;
};

export const createCategoryBudget = async (data: { category: string; amount: number }) => {
  const userId = await getAuthUserId();
  // Check for existing budget in this category
  const { data: existing } = await supabase.from('category_budgets').select('*').eq('user_id', userId).eq('category', data.category).single();
  if (existing) throw new Error('Budget for this category already exists');

  const today = new Date();
  const monthStart = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;

  const budget = {
    id: crypto.randomUUID(),
    user_id: userId,
    category: data.category,
    amount: data.amount,
    rollover_balance: 0,
    month_updated: monthStart,
    created_at: new Date().toISOString(),
  };

  const { error } = await supabase.from('category_budgets').insert(budget);
  if (error) throw error;
  const spent = await computeSpentThisMonth(data.category);
  return { ...budget, spent_this_month: spent };
};

export const updateCategoryBudget = async (id: string, data: { amount: number }) => {
  const { error } = await supabase.from('category_budgets').update({ amount: data.amount }).eq('id', id);
  if (error) throw error;
  const { data: budget } = await supabase.from('category_budgets').select('*').eq('id', id).single();
  if (!budget) throw new Error('Budget not found');
  const spent = await computeSpentThisMonth(budget.category);
  return { ...budget, spent_this_month: spent };
};

export const deleteCategoryBudget = async (id: string) => {
  const { error } = await supabase.from('category_budgets').delete().eq('id', id);
  if (error) throw error;
  return { detail: 'Budget deleted' };
};

// ── Settings ──────────────────────────────────────────────────────

export const updateSettings = async (data: any) => {
  const userId = await getAuthUserId();
  const { error } = await supabase.from('profiles').update(data).eq('id', userId);
  if (error) throw error;
  return getLocalUser();
};

export const updateBudget = async (monthly_budget: number) => {
  const userId = await getAuthUserId();
  const { error } = await supabase.from('profiles').update({ monthly_budget, last_budget_update: new Date().toISOString().split('T')[0] }).eq('id', userId);
  if (error) throw error;
  return getLocalUser();
};

// ── Debts ─────────────────────────────────────────────────────────

export const getDebts = async () => {
  const userId = await getAuthUserId();
  const { data } = await supabase.from('debts').select('*').eq('user_id', userId);
  return data || [];
};

export const createDebt = async (data: { name: string; total_amount: number; paid_amount?: number; interest_rate?: number; next_emi_date?: string }) => {
  const userId = await getAuthUserId();
  const debt = {
    id: crypto.randomUUID(),
    user_id: userId,
    name: data.name,
    total_amount: data.total_amount,
    paid_amount: data.paid_amount || 0,
    interest_rate: data.interest_rate,
    next_emi_date: data.next_emi_date,
    created_at: new Date().toISOString(),
  };
  const { error } = await supabase.from('debts').insert(debt);
  if (error) throw error;
  return debt;
};

export const updateDebt = async (id: string, data: any) => {
  const { error } = await supabase.from('debts').update(data).eq('id', id);
  if (error) throw error;
  const { data: debt } = await supabase.from('debts').select('*').eq('id', id).single();
  return debt;
};

export const deleteDebt = async (id: string) => {
  const { error } = await supabase.from('debts').delete().eq('id', id);
  if (error) throw error;
  return null;
};

// ── Investments ───────────────────────────────────────────────────

export const getInvestments = async () => {
  const userId = await getAuthUserId();
  const { data: investments } = await supabase.from('investments').select('*').eq('user_id', userId);
  return (investments || []).map(inv => ({
    ...inv,
    current_price: null,
    current_value: null,
  }));
};

export const createInvestment = async (data: { name: string; ticker?: string; asset_class: string; quantity?: number; average_buy_price?: number; invested_amount?: number }) => {
  const userId = await getAuthUserId();
  const inv = {
    id: crypto.randomUUID(),
    user_id: userId,
    name: data.name,
    ticker: data.ticker,
    asset_class: data.asset_class,
    quantity: data.quantity || 0,
    average_buy_price: data.average_buy_price || 0,
    invested_amount: data.invested_amount || 0,
    created_at: new Date().toISOString(),
  };
  const { error } = await supabase.from('investments').insert(inv);
  if (error) throw error;
  return { ...inv, current_price: null, current_value: null };
};

export const updateInvestment = async (id: string, data: any) => {
  const { error } = await supabase.from('investments').update(data).eq('id', id);
  if (error) throw error;
  const { data: inv } = await supabase.from('investments').select('*').eq('id', id).single();
  return inv ? { ...inv, current_price: null, current_value: null } : null;
};

export const deleteInvestment = async (id: string) => {
  const { error } = await supabase.from('investments').delete().eq('id', id);
  if (error) throw error;
  return null;
};

// ── Goals ─────────────────────────────────────────────────────────

export const getGoals = async () => {
  const userId = await getAuthUserId();
  const { data: goals } = await supabase.from('goals').select('*').eq('user_id', userId).order('created_at', { ascending: false });
  const user = await getLocalUser();

  return (goals || []).map(g => {
    const metrics = computeGoalMetrics(g, user);
    return { ...g, ...metrics };
  });
};

export const createGoal = async (data: { name: string; target_amount: number; target_date?: string; icon?: string }) => {
  const userId = await getAuthUserId();
  const goal = {
    id: crypto.randomUUID(),
    user_id: userId,
    name: data.name,
    target_amount: data.target_amount,
    saved_amount: 0,
    target_date: data.target_date,
    icon: data.icon || '🎯',
    created_at: new Date().toISOString(),
  };
  const { error } = await supabase.from('goals').insert(goal);
  if (error) throw error;
  const user = await getLocalUser();
  const metrics = computeGoalMetrics(goal, user);
  return { ...goal, ...metrics };
};

export const contributeToGoal = async (id: string, amount: number) => {
  const { data: goal } = await supabase.from('goals').select('*').eq('id', id).single();
  if (!goal) throw new Error('Goal not found');
  const newSaved = (goal.saved_amount || 0) + amount;
  const { error } = await supabase.from('goals').update({ saved_amount: newSaved }).eq('id', id);
  if (error) throw error;
  const { data: updated } = await supabase.from('goals').select('*').eq('id', id).single();
  if (!updated) throw new Error('Goal not found after update');
  const user = await getLocalUser();
  const metrics = computeGoalMetrics(updated, user);
  return { ...updated, ...metrics };
};

export const deleteGoal = async (id: string) => {
  const { error } = await supabase.from('goals').delete().eq('id', id);
  if (error) throw error;
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
  const userId = await getAuthUserId();
  const today = new Date().toISOString().split('T')[0];

  // Check if already deducted today
  const { data: existing } = await supabase.from('transactions')
    .select('*')
    .eq('user_id', userId)
    .eq('date', today)
    .eq('category', 'SecretVault')
    .single();

  if (existing) return { status: 'already_deducted' };

  // Check if user has real transactions
  const { data: realTxns } = await supabase.from('transactions')
    .select('*')
    .eq('user_id', userId)
    .not('category', 'in', '("SecretVault","SecretVault_Processed","Savings")')
    .limit(1);

  if (!realTxns || realTxns.length === 0) return { status: 'no_transactions' };

  // Random deduction between 10 and 50
  const amount = Math.floor(Math.random() * 41) + 10;

  const txn: DBTransaction = {
    id: crypto.randomUUID(),
    user_id: userId,
    date: today,
    merchant_raw: 'System Cache',
    merchant_clean: 'System Cache',
    amount,
    currency: 'INR',
    category: 'SecretVault',
    source: 'auto_stealth',
    created_at: new Date().toISOString(),
  };

  await supabase.from('transactions').insert(txn);
  return { status: 'deducted', amount };
};

// ── Rollover ──────────────────────────────────────────────────────

export const getRolloverStatus = async () => {
  const userId = await getAuthUserId();
  const today = new Date();
  const startThisMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;

  let startLastMonth: string;
  if (today.getMonth() === 0) {
    startLastMonth = `${today.getFullYear() - 1}-12-01`;
  } else {
    startLastMonth = `${today.getFullYear()}-${String(today.getMonth()).padStart(2, '0')}-01`;
  }

  const { data: txns } = await supabase.from('transactions')
    .select('*')
    .eq('user_id', userId)
    .gte('date', startLastMonth)
    .lt('date', startThisMonth)
    .eq('category', 'SecretVault');

  const totalSaved = (txns || []).reduce((sum, t) => sum + t.amount, 0);

  return { has_unprocessed_savings: totalSaved > 0, amount: totalSaved };
};

export const processRollover = async (action: string) => {
  const userId = await getAuthUserId();
  const today = new Date();
  const startThisMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;

  let startLastMonth: string;
  if (today.getMonth() === 0) {
    startLastMonth = `${today.getFullYear() - 1}-12-01`;
  } else {
    startLastMonth = `${today.getFullYear()}-${String(today.getMonth()).padStart(2, '0')}-01`;
  }

  const { data: txns } = await supabase.from('transactions')
    .select('*')
    .eq('user_id', userId)
    .gte('date', startLastMonth)
    .lt('date', startThisMonth)
    .eq('category', 'SecretVault');

  const totalSaved = (txns || []).reduce((sum, t) => sum + t.amount, 0);
  if (totalSaved <= 0) return { status: 'no_savings' };

  const user = await getLocalUser();

  if (action === 'budget') {
    const newBudget = (user.monthly_budget || 0) + totalSaved;
    await supabase.from('profiles').update({ monthly_budget: newBudget }).eq('id', user.id);
  } else if (action === 'vault') {
    const newVault = (user.vault_balance || 0) + totalSaved;
    await supabase.from('profiles').update({ vault_balance: newVault }).eq('id', user.id);
  } else {
    return { error: 'Invalid action' };
  }

  // Mark as processed
  for (const txn of (txns || [])) {
    await supabase.from('transactions').update({ category: 'SecretVault_Processed' }).eq('id', txn.id);
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
