import { supabase } from './supabase';

export async function exportAllData(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const userId = user.id;

  const [
    { data: profiles },
    { data: transactions },
    { data: subscriptions },
    { data: categoryBudgets },
    { data: wishlistItems },
    { data: splitBills },
    { data: splitMembers },
    { data: debts },
    { data: investments },
    { data: goals },
  ] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId),
    supabase.from('transactions').select('*').eq('user_id', userId),
    supabase.from('subscriptions').select('*').eq('user_id', userId),
    supabase.from('category_budgets').select('*').eq('user_id', userId),
    supabase.from('wishlist_items').select('*').eq('user_id', userId),
    supabase.from('split_bills').select('*').eq('user_id', userId),
    supabase.from('split_members').select('*').eq('user_id', userId),
    supabase.from('debts').select('*').eq('user_id', userId),
    supabase.from('investments').select('*').eq('user_id', userId),
    supabase.from('goals').select('*').eq('user_id', userId),
  ]);

  const data = {
    version: 1,
    exported_at: new Date().toISOString(),
    users: profiles || [],
    transactions: transactions || [],
    subscriptions: subscriptions || [],
    categoryBudgets: categoryBudgets || [],
    wishlistItems: wishlistItems || [],
    splitBills: splitBills || [],
    splitMembers: splitMembers || [],
    debts: debts || [],
    investments: investments || [],
    goals: goals || [],
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

export async function importData(file: File): Promise<{ success: boolean; message: string }> {
  try {
    const text = await file.text();
    const data = JSON.parse(text);

    if (!data.version || !data.transactions) {
      return { success: false, message: 'Invalid backup file format.' };
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, message: 'Not authenticated.' };
    const userId = user.id;

    // Delete existing records for user
    await Promise.all([
      supabase.from('transactions').delete().eq('user_id', userId),
      supabase.from('subscriptions').delete().eq('user_id', userId),
      supabase.from('category_budgets').delete().eq('user_id', userId),
      supabase.from('wishlist_items').delete().eq('user_id', userId),
      supabase.from('split_bills').delete().eq('user_id', userId),
      supabase.from('split_members').delete().eq('user_id', userId),
      supabase.from('debts').delete().eq('user_id', userId),
      supabase.from('investments').delete().eq('user_id', userId),
      supabase.from('goals').delete().eq('user_id', userId),
    ]);

    const mapUserId = (item: any) => {
      const { id, user_id, ...rest } = item;
      return { ...rest, user_id: userId };
    };

    if (data.transactions?.length) await supabase.from('transactions').insert(data.transactions.map(mapUserId));
    if (data.subscriptions?.length) await supabase.from('subscriptions').insert(data.subscriptions.map(mapUserId));
    if (data.categoryBudgets?.length) await supabase.from('category_budgets').insert(data.categoryBudgets.map(mapUserId));
    if (data.wishlistItems?.length) await supabase.from('wishlist_items').insert(data.wishlistItems.map(mapUserId));
    if (data.splitBills?.length) await supabase.from('split_bills').insert(data.splitBills.map(mapUserId));
    if (data.splitMembers?.length) await supabase.from('split_members').insert(data.splitMembers.map(mapUserId));
    if (data.debts?.length) await supabase.from('debts').insert(data.debts.map(mapUserId));
    if (data.investments?.length) await supabase.from('investments').insert(data.investments.map(mapUserId));
    if (data.goals?.length) await supabase.from('goals').insert(data.goals.map(mapUserId));
    
    if (data.users?.length) {
        const { id, ...profileData } = data.users[0];
        await supabase.from('profiles').update(profileData).eq('id', userId);
    }

    return {
      success: true,
      message: `Restored ${data.transactions.length} transactions and all associated data.`,
    };
  } catch (e: any) {
    return { success: false, message: `Import failed: ${e.message}` };
  }
}

export async function exportTransactionsCSV(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  
  const { data: transactions } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', user.id)
    .order('date', { ascending: false });

  if (!transactions) return;

  const header = 'Date,Merchant,Amount,Category,Source\n';
  const rows = transactions.map(t =>
    `${t.date},${csvEscape(t.merchant_clean || '')},${t.amount},${csvEscape(t.category || '')},${t.source || ''}`
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
