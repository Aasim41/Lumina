import { supabase } from './supabase';

export interface DBUser {
  id?: string;
  name?: string;
  email?: string;
  monthly_budget?: number;
  last_budget_update?: string;
  budget_days?: number;
  vault_balance?: number;
  user_persona?: string;
}

export interface DBTransaction {
  id?: string;
  amount: number;
  date: string;
  category: string;
  merchant_clean?: string;
}

export interface DBSubscription {
  id?: string;
  amount: number;
  billing_day: number;
  merchant?: string;
}

export interface DBCategoryBudget {
  id?: string;
  category: string;
  amount: number;
  rollover_balance?: number;
  month_updated?: string;
}

export interface DBGoal {
  id?: string;
  name: string;
  target_amount: number;
  saved_amount: number;
  target_date?: string;
}

const todayISO = () => new Date().toISOString().split('T')[0];
const generateId = () => crypto.randomUUID();

export function getBudgetCycle(user?: DBUser) {
  const today = new Date();
  const defaultStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
  const startStr = user?.last_budget_update || defaultStart;
  const startDate = new Date(startStr);
  
  let currentStart = new Date(startDate);
  const days = user?.budget_days || new Date(currentStart.getFullYear(), currentStart.getMonth() + 1, 0).getDate();
  
  // Roll forward if currentStart is in the past by more than `days`
  while (true) {
    const nextStart = new Date(currentStart);
    nextStart.setDate(nextStart.getDate() + days);
    if (nextStart > today) break;
    currentStart = nextStart;
  }
  
  const endDate = new Date(currentStart);
  endDate.setDate(endDate.getDate() + days - 1);
  
  // Calculate how many days have passed in this cycle
  const diffTime = Math.abs(today.getTime() - currentStart.getTime());
  const elapsedDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

  // Calculate previous cycle
  const prevStart = new Date(currentStart);
  prevStart.setDate(prevStart.getDate() - days);
  const prevEnd = new Date(currentStart);
  prevEnd.setDate(prevEnd.getDate() - 1);
  
  return { 
    startStr: currentStart.toISOString().split('T')[0], 
    endStr: endDate.toISOString().split('T')[0], 
    prevStartStr: prevStart.toISOString().split('T')[0],
    prevEndStr: prevEnd.toISOString().split('T')[0],
    days,
    elapsedDays: Math.min(elapsedDays, days)
  };
}

// 1. computeSummary
export async function computeSummary(user: DBUser) {
  const userId = (await supabase.auth.getUser()).data.user!.id;
  const { data: allTransactions = [] } = await supabase.from('transactions').select('*').eq('user_id', userId);
  const cycle = getBudgetCycle(user);

  const thisMonthTxs = (allTransactions || []).filter(t => t.date >= cycle.startStr && t.date <= cycle.endStr);
  const lastMonthTxs = (allTransactions || []).filter(t => t.date >= cycle.prevStartStr && t.date <= cycle.prevEndStr);

  const excludeCats = ['Savings', 'SecretVault'];
  
  const thisMonthExpenses = thisMonthTxs.filter(t => !excludeCats.includes(t.category));
  const lastMonthExpenses = lastMonthTxs.filter(t => !excludeCats.includes(t.category));
  
  const total_this_month = thisMonthExpenses.reduce((sum, t) => sum + t.amount, 0);
  const total_saved_this_month = thisMonthTxs.filter(t => excludeCats.includes(t.category)).reduce((sum, t) => sum + t.amount, 0);
  const total_last_month = lastMonthExpenses.reduce((sum, t) => sum + t.amount, 0);
  
  let month_over_month_change = 0;
  if (total_last_month > 0) {
    month_over_month_change = ((total_this_month - total_last_month) / total_last_month) * 100;
  }
  
  const categoryTotals: Record<string, number> = {};
  thisMonthExpenses.forEach(t => {
    categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
  });
  
  let top_category = '';
  let top_category_amount = 0;
  for (const [cat, amt] of Object.entries(categoryTotals)) {
    if (amt > top_category_amount) {
      top_category_amount = amt;
      top_category = cat;
    }
  }
  
  const daily_average = total_this_month / cycle.elapsedDays;
  
  const { data: subs = [] } = await supabase.from('subscriptions').select('*').eq('user_id', userId);
  const total_subscriptions_this_month = (subs || []).reduce((sum, s) => sum + s.amount, 0);
  
  const { data: profiles } = await supabase.from('profiles').select('*').eq('id', userId).limit(1);
  const vault = profiles?.[0];
  const db_vault_balance = vault?.vault_balance || 0;
  
  // Badges logic (simplified example)
  const badges: string[] = [];
  if ((allTransactions || []).filter(t => t.category !== 'SecretVault').length > 0) badges.push('First Steps');
  
  const monthly_budget = user.monthly_budget || 0;
  if (monthly_budget > 0 && total_saved_this_month > (monthly_budget * 0.2)) badges.push('Super Saver');
  
  const projected = daily_average * cycle.days;
  if (monthly_budget > 0 && projected < monthly_budget) badges.push('On Track');
  
  const todayDate = new Date(todayISO());
  const daily_budget = monthly_budget > 0 ? monthly_budget / cycle.days : 0;
  
  const dailyTotals: Record<string, number> = {};
  (allTransactions || []).forEach(t => {
    if (!excludeCats.includes(t.category)) {
      dailyTotals[t.date.split('T')[0]] = (dailyTotals[t.date.split('T')[0]] || 0) + t.amount;
    }
  });

  let current_streak = 0;
  let d = new Date(todayDate);
  while (true) {
    const dStr = d.toISOString().split('T')[0];
    if ((dailyTotals[dStr] || 0) <= daily_budget) {
      current_streak++;
      d.setDate(d.getDate() - 1);
    } else {
      break;
    }
  }
  
  let best_streak = current_streak; 
  let current_run = 0;
  const sortedDates = Object.keys(dailyTotals).sort();
  if (sortedDates.length > 0) {
    const earliest = new Date(sortedDates[0]);
    let tmpD = new Date(earliest);
    while (tmpD <= todayDate) {
      const dStr = tmpD.toISOString().split('T')[0];
      if ((dailyTotals[dStr] || 0) <= daily_budget) {
        current_run++;
        if (current_run > best_streak) best_streak = current_run;
      } else {
        current_run = 0;
      }
      tmpD.setDate(tmpD.getDate() + 1);
    }
  }

  const streak_status = current_streak > 0 ? 'Active' : 'Broken';
  
  // Vault balance
  const vault_balance = (allTransactions || []).filter(t => t.category === 'SecretVault').reduce((sum, t) => sum + t.amount, 0) 
                      - (allTransactions || []).filter(t => t.category === 'SecretVault_Processed').reduce((sum, t) => sum + t.amount, 0);
  
  return {
    total_this_month,
    total_saved_this_month,
    total_subscriptions_this_month,
    total_last_month,
    month_over_month_change,
    top_category,
    top_category_amount,
    transaction_count: thisMonthTxs.length,
    daily_average,
    vault_balance,
    badges,
    next_badge_target: 'Consistent Saver',
    current_streak,
    best_streak,
    streak_status
  };
}

// 2. computeCategories
export async function computeCategories() {
  const userId = (await supabase.auth.getUser()).data.user!.id;
  const { data: allTransactions = [] } = await supabase.from('transactions').select('*').eq('user_id', userId);
  const todayDate = new Date(todayISO());
  const firstOfThisMonthStr = new Date(todayDate.getFullYear(), todayDate.getMonth(), 1).toISOString().split('T')[0];
  const endOfThisMonthStr = new Date(todayDate.getFullYear(), todayDate.getMonth() + 1, 0).toISOString().split('T')[0];
  const excludeCats = ['Savings', 'SecretVault'];
  
  const thisMonthExpenses = (allTransactions || []).filter(t => 
    t.date >= firstOfThisMonthStr && 
    t.date <= endOfThisMonthStr &&
    !excludeCats.includes(t.category)
  );

  const total = thisMonthExpenses.reduce((sum, t) => sum + t.amount, 0);
  
  const categoryMap: Record<string, { amount: number, count: number }> = {};
  thisMonthExpenses.forEach(t => {
    if (!categoryMap[t.category]) categoryMap[t.category] = { amount: 0, count: 0 };
    categoryMap[t.category].amount += t.amount;
    categoryMap[t.category].count += 1;
  });

  const categories = Object.keys(categoryMap).map(cat => ({
    category: cat,
    amount: categoryMap[cat].amount,
    percentage: total > 0 ? (categoryMap[cat].amount / total) * 100 : 0,
    count: categoryMap[cat].count
  })).sort((a, b) => b.amount - a.amount);

  return categories;
}

// 3. computeTrends
export async function computeTrends() {
  const userId = (await supabase.auth.getUser()).data.user!.id;
  const { data: allTransactions = [] } = await supabase.from('transactions').select('*').eq('user_id', userId);
  const todayDate = new Date(todayISO());
  const excludeCats = ['Savings', 'SecretVault'];
  
  const result: { month: string, amount: number }[] = [];
  const map: Record<string, number> = {};

  for (let i = 11; i >= 0; i--) {
    const d = new Date(todayDate.getFullYear(), todayDate.getMonth() - i, 1);
    const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    map[monthStr] = 0;
  }

  const twelveMonthsAgo = new Date(todayDate.getFullYear(), todayDate.getMonth() - 11, 1);

  (allTransactions || []).forEach(t => {
    if (!excludeCats.includes(t.category)) {
      const d = new Date(t.date);
      if (d >= twelveMonthsAgo) {
        const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (map[monthStr] !== undefined) {
          map[monthStr] += t.amount;
        }
      }
    }
  });

  for (const [month, amount] of Object.entries(map)) {
    result.push({ month, amount });
  }

  return result.sort((a, b) => a.month.localeCompare(b.month));
}

// 4. computeHeatmap
export async function computeHeatmap() {
  const userId = (await supabase.auth.getUser()).data.user!.id;
  const { data: allTransactions = [] } = await supabase.from('transactions').select('*').eq('user_id', userId);
  const todayDate = new Date(todayISO());
  const firstOfThisMonthStr = new Date(todayDate.getFullYear(), todayDate.getMonth(), 1).toISOString().split('T')[0];
  const endOfThisMonthStr = new Date(todayDate.getFullYear(), todayDate.getMonth() + 1, 0).toISOString().split('T')[0];
  const excludeCats = ['Savings', 'SecretVault'];

  const thisMonthExpenses = (allTransactions || []).filter(t => 
    t.date >= firstOfThisMonthStr && 
    t.date <= endOfThisMonthStr &&
    !excludeCats.includes(t.category)
  );

  const heatmapMap: Record<string, number> = {
    'Mon': 0, 'Tue': 0, 'Wed': 0, 'Thu': 0, 'Fri': 0, 'Sat': 0, 'Sun': 0
  };
  
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  thisMonthExpenses.forEach(t => {
    const d = new Date(t.date);
    const dayName = days[d.getDay()];
    heatmapMap[dayName] += t.amount;
  });

  const orderedDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  return orderedDays.map(day => ({
    day,
    amount: heatmapMap[day]
  }));
}

// 5. computeTopMerchants
export async function computeTopMerchants() {
  const userId = (await supabase.auth.getUser()).data.user!.id;
  const { data: allTransactions = [] } = await supabase.from('transactions').select('*').eq('user_id', userId);
  const excludeCats = ['Savings', 'SecretVault'];

  const map: Record<string, { amount: number, count: number }> = {};
  
  (allTransactions || []).forEach(t => {
    if (!excludeCats.includes(t.category) && t.merchant_clean) {
      const key = t.merchant_clean.trim();
      if (!map[key]) map[key] = { amount: 0, count: 0 };
      map[key].amount += t.amount;
      map[key].count += 1;
    }
  });

  return Object.keys(map).map(merchant => ({
    merchant,
    amount: map[merchant].amount,
    count: map[merchant].count
  })).sort((a, b) => b.amount - a.amount).slice(0, 10);
}

// 6. computeInsights
export async function computeInsights(user: DBUser) {
  const userId = (await supabase.auth.getUser()).data.user!.id;
  const { data: allTransactions = [] } = await supabase.from('transactions').select('*').eq('user_id', userId);
  const excludeCats = ['Savings', 'SecretVault'];
  const todayDate = new Date(todayISO());
  
  const sevenDaysAgo = new Date(todayDate);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  const fourteenDaysAgo = new Date(todayDate);
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

  const thisWeekTxs = (allTransactions || []).filter(t => new Date(t.date) >= sevenDaysAgo && new Date(t.date) <= todayDate && !excludeCats.includes(t.category));
  const lastWeekTxs = (allTransactions || []).filter(t => new Date(t.date) >= fourteenDaysAgo && new Date(t.date) < sevenDaysAgo && !excludeCats.includes(t.category));

  const insights: Array<{ message: string, type: string, icon: string }> = [];

  const thisWeekCats: Record<string, number> = {};
  thisWeekTxs.forEach(t => thisWeekCats[t.category] = (thisWeekCats[t.category] || 0) + t.amount);
  
  const lastWeekCats: Record<string, number> = {};
  lastWeekTxs.forEach(t => lastWeekCats[t.category] = (lastWeekCats[t.category] || 0) + t.amount);

  for (const cat in thisWeekCats) {
    const lwAmt = lastWeekCats[cat] || 0;
    const twAmt = thisWeekCats[cat];
    if (lwAmt > 0) {
      const change = ((twAmt - lwAmt) / lwAmt) * 100;
      if (change > 30) {
        insights.push({ message: `Your spending in ${cat} went up by ${change.toFixed(0)}% this week!`, type: 'warning', icon: 'trending-up' });
      } else if (change < -20) {
        insights.push({ message: `Great job cutting down ${cat} spending by ${Math.abs(change).toFixed(0)}% this week!`, type: 'positive', icon: 'trending-down' });
      }
    }
  }

  const firstOfThisMonth = new Date(todayDate.getFullYear(), todayDate.getMonth(), 1);
  const thisMonthExpenses = (allTransactions || []).filter(t => new Date(t.date) >= firstOfThisMonth && new Date(t.date) <= todayDate && !excludeCats.includes(t.category));
  const total_this_month = thisMonthExpenses.reduce((sum, t) => sum + t.amount, 0);
  const daily_average = total_this_month / todayDate.getDate();
  const projected = daily_average * new Date(todayDate.getFullYear(), todayDate.getMonth() + 1, 0).getDate();
  
  const monthly_budget = user.monthly_budget || 0;
  if (monthly_budget > 0) {
    if (projected > monthly_budget * 1.1) {
      insights.push({ message: `At this pace, you will exceed your monthly budget. Watch out!`, type: 'warning', icon: 'alert-triangle' });
    } else if (projected < monthly_budget * 0.8) {
      insights.push({ message: `You are spending well below your budget! Keep it up!`, type: 'positive', icon: 'smile' });
    }
  }

  const topMerchants = await computeTopMerchants();
  if (topMerchants.length > 0) {
    const thisMonthTop = topMerchants[0];
    if (thisMonthTop.amount > 500) {
       insights.push({ message: `You spent ₹${thisMonthTop.amount} at ${thisMonthTop.merchant} this month.`, type: 'info', icon: 'shopping-cart' });
    }
  }

  const totalThisWeek = thisWeekTxs.reduce((sum, t) => sum + t.amount, 0);
  const totalLastWeek = lastWeekTxs.reduce((sum, t) => sum + t.amount, 0);
  if (totalLastWeek > 0) {
    const diff = totalThisWeek - totalLastWeek;
    if (diff > 0) {
      insights.push({ message: `Overall spending is up by ₹${diff} compared to last week.`, type: 'warning', icon: 'activity' });
    } else if (diff < 0) {
      insights.push({ message: `Overall spending is down by ₹${Math.abs(diff)} compared to last week.`, type: 'positive', icon: 'activity' });
    }
  }

  if (insights.length === 0) {
    insights.push({ message: `Keep adding expenses to see personalized insights!`, type: 'info', icon: 'activity' });
  }

  return insights;
}

// 7. computeAlerts
export async function computeAlerts(user: DBUser) {
  const alerts: Array<{ id: string, type: string, title: string, message: string, icon: string }> = [];
  const userId = (await supabase.auth.getUser()).data.user!.id;
  
  const summary = await computeSummary(user);
  const monthly_budget = user.monthly_budget || 0;
  
  if (monthly_budget > 0 && summary.total_this_month >= monthly_budget * 0.8) {
    alerts.push({
      id: generateId(),
      type: 'danger',
      title: 'Budget Alert',
      message: `You have spent ${(summary.total_this_month / monthly_budget * 100).toFixed(0)}% of your monthly budget.`,
      icon: 'alert-triangle'
    });
  }

  const todayDate = new Date(todayISO());
  const daysInMonth = new Date(todayDate.getFullYear(), todayDate.getMonth() + 1, 0).getDate();
  const daily_limit = monthly_budget / daysInMonth;
  const { data: allTransactions = [] } = await supabase.from('transactions').select('*').eq('user_id', userId);
  const todayStr = todayDate.toISOString().split('T')[0];
  const todayTxs = (allTransactions || []).filter(t => t.date.startsWith(todayStr) && !['Savings', 'SecretVault'].includes(t.category));
  const todayTotal = todayTxs.reduce((sum, t) => sum + t.amount, 0);
  
  if (daily_limit > 0 && todayTotal > daily_limit * 1.5) {
    alerts.push({
      id: generateId(),
      type: 'danger',
      title: 'Overspending',
      message: `You have exceeded your daily limit by spending ₹${todayTotal} today.`,
      icon: 'alert-triangle'
    });
  }

  const { data: categories = [] } = await supabase.from('category_budgets').select('*').eq('user_id', userId);
  for (const cat of (categories || [])) {
    const spent = await computeSpentThisMonth(cat.category);
    if (cat.amount > 0 && spent >= cat.amount * 0.8) {
      alerts.push({
        id: generateId(),
        type: 'warning',
        title: 'Category Budget Alert',
        message: `You have spent ₹${spent} out of ₹${cat.amount} for ${cat.category}.`,
        icon: 'pie-chart'
      });
    }
  }

  const { data: subs = [] } = await supabase.from('subscriptions').select('*').eq('user_id', userId);
  const todayDay = todayDate.getDate();
  for (const sub of (subs || [])) {
    let diff = sub.billing_day - todayDay;
    if (diff < 0) diff += daysInMonth; 
    if (diff <= 3) {
      alerts.push({
        id: generateId(),
        type: 'info',
        title: 'Subscription Reminder',
        message: `${sub.merchant} (₹${sub.amount}) is due in ${diff} day(s).`,
        icon: 'calendar'
      });
    }
  }

  const { data: goals = [] } = await supabase.from('goals').select('*').eq('user_id', userId);
  for (const goal of (goals || [])) {
    if (goal.target_amount > 0) {
      const progress = goal.saved_amount / goal.target_amount;
      if (progress >= 1) {
        alerts.push({
          id: generateId(),
          type: 'positive',
          title: 'Goal Achieved!',
          message: `Congratulations! You have reached your goal: ${goal.name}.`,
          icon: 'target'
        });
      } else if (progress >= 0.5) {
        alerts.push({
          id: generateId(),
          type: 'info',
          title: 'Goal Milestone',
          message: `You are ${Math.floor(progress * 100)}% of the way to your goal: ${goal.name}.`,
          icon: 'target'
        });
      }
    }
  }

  return alerts;
}

// 8. generateRoast
export async function generateRoast(user: DBUser, data: { amount: number, category: string, merchant: string }) {
  const userId = (await supabase.auth.getUser()).data.user!.id;
  const { data: allTransactions = [] } = await supabase.from('transactions').select('*').eq('user_id', userId);
  const firstOfThisMonthStr = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
  
  const categoryTxs = (allTransactions || []).filter(t => t.category === data.category && t.date >= firstOfThisMonthStr);
  const total = categoryTxs.reduce((sum, t) => sum + t.amount, 0) + data.amount;
  const count = categoryTxs.length + 1;

  const monthly_budget = user.monthly_budget || 0;
  
  let barrierHit = false;
  if (count > 5 || (monthly_budget > 0 && total > monthly_budget * 0.25)) {
    barrierHit = true;
  }

  if (!barrierHit) return { message: null };

  const roasts: Record<string, string[]> = {
    'Food & Dining': [
      `₹${data.amount} at ${data.merchant}? Are you allergic to your own kitchen?`,
      `Another ₹${data.amount} on food? Your tastebuds are living better than you.`
    ],
    'Entertainment': [
      `₹${data.amount} on ${data.merchant}? I hope you're having fun, because your wallet is crying.`,
      `Entertainment is cool, but is ${data.merchant} really worth ₹${data.amount}?`
    ],
    'Shopping': [
      `₹${data.amount} at ${data.merchant}?! Do you really need more stuff?`,
      `Your closet might be full, but your bank account is getting empty after that ₹${data.amount} at ${data.merchant}.`
    ],
    'General': [
      `₹${data.amount} on ${data.merchant}? Are we made of money now?`,
      `That's ₹${data.amount} you could have saved. Just saying.`
    ]
  };

  const templates = roasts[data.category] || roasts['General'];
  const template = templates[Math.floor(Math.random() * templates.length)];

  let context = '';
  if (count > 5) context = ` (This is your ${count}th time spending on ${data.category} this month!)`;
  else if (monthly_budget > 0 && total > monthly_budget * 0.25) context = ` (You've spent over 25% of your budget on ${data.category}!)`;

  return { message: template + context };
}

// 9. computeWrapUp
export async function computeWrapUp() {
  const userId = (await supabase.auth.getUser()).data.user!.id;
  const { data: allTransactions = [] } = await supabase.from('transactions').select('*').eq('user_id', userId);
  const todayDate = new Date(todayISO());
  const firstOfThisMonthStr = new Date(todayDate.getFullYear(), todayDate.getMonth(), 1).toISOString().split('T')[0];
  const firstOfLastMonthStr = new Date(todayDate.getFullYear(), todayDate.getMonth() - 1, 1).toISOString().split('T')[0];
  const excludeCats = ['Savings', 'SecretVault', 'SecretVault_Processed'];

  const thisMonthExpenses = (allTransactions || []).filter(t => t.date >= firstOfThisMonthStr && t.date <= todayISO() && !excludeCats.includes(t.category));
  const lastMonthExpenses = (allTransactions || []).filter(t => t.date >= firstOfLastMonthStr && t.date < firstOfThisMonthStr && !excludeCats.includes(t.category));

  const total_spent = thisMonthExpenses.reduce((sum, t) => sum + t.amount, 0);
  const total_last_month = lastMonthExpenses.reduce((sum, t) => sum + t.amount, 0);

  const categoryTotals: Record<string, number> = {};
  let biggest_splurge_merchant = '';
  let biggest_splurge_amount = 0;

  thisMonthExpenses.forEach(t => {
    categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
    if (t.amount > biggest_splurge_amount) {
      biggest_splurge_amount = t.amount;
      biggest_splurge_merchant = t.merchant_clean || 'Unknown';
    }
  });

  let top_category = '';
  let top_category_amount = 0;
  for (const [cat, amt] of Object.entries(categoryTotals)) {
    if (amt > top_category_amount) {
      top_category_amount = amt;
      top_category = cat;
    }
  }

  const top_category_percentage = total_spent > 0 ? (top_category_amount / total_spent) * 100 : 0;
  const savings_vs_last_month = total_last_month - total_spent;
  const is_positive_savings = savings_vs_last_month > 0;

  return {
    month: todayDate.toLocaleString('default', { month: 'long' }),
    total_spent,
    top_category,
    top_category_amount,
    top_category_percentage,
    biggest_splurge_merchant,
    biggest_splurge_amount,
    savings_vs_last_month: Math.abs(savings_vs_last_month),
    is_positive_savings
  };
}

// 10. computeGoalMetrics
export function computeGoalMetrics(goal: DBGoal, user: DBUser) {
  let progress_percent = (goal.saved_amount / goal.target_amount) * 100;
  if (progress_percent > 100) progress_percent = 100;

  let months_remaining = 0;
  let monthly_needed = 0;
  let weekly_needed = 0;
  let daily_needed = 0;

  if (goal.target_date) {
    const today = new Date(todayISO());
    const target = new Date(goal.target_date);
    if (target > today) {
      const diffTime = Math.abs(target.getTime() - today.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      months_remaining = diffDays / 30; 
      const remaining_amount = goal.target_amount - goal.saved_amount;
      
      if (months_remaining > 0) monthly_needed = remaining_amount / months_remaining;
      weekly_needed = remaining_amount / (diffDays / 7);
      daily_needed = remaining_amount / diffDays;
    }
  }

  let strategy = "Keep saving!";
  if (user.user_persona === 'hostel_student') {
    strategy = "Skip ordering snacks 2-3 times a week to boost your savings.";
  } else if (user.user_persona === 'school_student') {
    strategy = "Save a small portion of your pocket money immediately when you receive it.";
  } else if (user.user_persona === 'married_employee') {
    strategy = "Try cooking at home more often instead of dining out to reach this goal faster.";
  } else if (user.user_persona === 'unmarried_employee') {
    strategy = "Skip an outing or two this month, and you'll hit your target sooner.";
  }

  return {
    progress_percent,
    monthly_needed,
    weekly_needed,
    daily_needed,
    strategy
  };
}

// 11. syncRollover
export async function syncRollover(budget: DBCategoryBudget) {
  const todayDate = new Date(todayISO());
  const currentMonthStartStr = new Date(todayDate.getFullYear(), todayDate.getMonth(), 1).toISOString().split('T')[0];
  
  if (budget.month_updated && budget.month_updated < currentMonthStartStr) {
    const userId = (await supabase.auth.getUser()).data.user!.id;
    const { data: allTransactions = [] } = await supabase.from('transactions').select('*').eq('user_id', userId);
    
    const updatedMonthStart = new Date(budget.month_updated);
    const nextMonthStart = new Date(updatedMonthStart.getFullYear(), updatedMonthStart.getMonth() + 1, 1);
    
    const lastTrackedTxs = (allTransactions || []).filter(t => 
      t.category === budget.category && 
      new Date(t.date) >= updatedMonthStart && 
      new Date(t.date) < nextMonthStart
    );
    
    const spent = lastTrackedTxs.reduce((sum, t) => sum + t.amount, 0);
    const rolloverBalance = budget.rollover_balance || 0;
    const savings = (budget.amount + rolloverBalance) - spent;
    
    const newRolloverBalance = savings > 0 ? savings : 0;
    
    budget.rollover_balance = newRolloverBalance;
    budget.month_updated = currentMonthStartStr;
    
    await supabase.from('category_budgets').update({
      rollover_balance: newRolloverBalance,
      month_updated: currentMonthStartStr
    }).eq('id', budget.id);
  }
  return budget;
}

// 12. computeSpentThisMonth
export async function computeSpentThisMonth(category: string) {
  const userId = (await supabase.auth.getUser()).data.user!.id;
  const { data: allTransactions = [] } = await supabase.from('transactions').select('*').eq('user_id', userId);
  const todayDate = new Date(todayISO());
  const firstOfThisMonthStr = new Date(todayDate.getFullYear(), todayDate.getMonth(), 1).toISOString().split('T')[0];
  const endOfThisMonthStr = new Date(todayDate.getFullYear(), todayDate.getMonth() + 1, 0).toISOString().split('T')[0];

  const spent = (allTransactions || [])
    .filter(t => t.category === category && t.date >= firstOfThisMonthStr && t.date <= endOfThisMonthStr)
    .reduce((sum, t) => sum + t.amount, 0);
    
  return spent;
}
