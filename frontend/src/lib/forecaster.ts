// Transaction type for forecasting
interface DBTransaction {
  date: string;
  category: string;
  amount: number;
  [key: string]: any;
}

export interface ForecastResult {
  predicted_next_month: number;
  confidence_low: number;
  confidence_high: number;
  per_category: Array<{ category: string; predicted_amount: number }>;
  historical: Array<{ month: string; amount: number; extrapolated_amount: number }>;
  projected: Array<{ month: string; amount: number }>;
}

export function forecastSpending(transactions: Array<{date: string, category: string, amount: number}>): ForecastResult {
  if (!transactions || transactions.length === 0) {
    return {
      predicted_next_month: 0.0,
      confidence_low: 0.0,
      confidence_high: 0.0,
      per_category: [],
      historical: [],
      projected: []
    };
  }

  const monthlyTotals: Record<string, number> = {};
  const categoryMonthlyTotals: Record<string, Record<string, number>> = {};
  const excludedCategories = ["Savings", "SecretVault", "SecretVault_Processed"];

  for (const t of transactions) {
    if (excludedCategories.includes(t.category)) {
      continue;
    }
    const d = new Date(t.date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const monthStr = `${year}-${month}`;

    monthlyTotals[monthStr] = (monthlyTotals[monthStr] || 0) + t.amount;

    if (!categoryMonthlyTotals[t.category]) {
      categoryMonthlyTotals[t.category] = {};
    }
    categoryMonthlyTotals[t.category][monthStr] = (categoryMonthlyTotals[t.category][monthStr] || 0) + t.amount;
  }

  const sortedMonths = Object.keys(monthlyTotals).sort();
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = String(today.getMonth() + 1).padStart(2, '0');
  const currentMonthStr = `${currentYear}-${currentMonth}`;

  const nextMonthFirst = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  nextMonthFirst.setDate(nextMonthFirst.getDate() - 1);
  const daysInCurrentMonth = nextMonthFirst.getDate();

  const historicalData: Array<{ month: string; amount: number; extrapolated_amount: number }> = [];

  for (const m of sortedMonths) {
    const amount = monthlyTotals[m];
    if (m === currentMonthStr) {
      const currentDay = Math.max(1, today.getDate());

      // ── Day-of-Week & Payday-Aware Extrapolation ───────────────────
      let paydaySpikeAmount = 0;
      let dailyDiscretionaryAmount = 0;
      let pastWeekdays = 0;
      let pastWeekends = 0;

      for (const t of transactions) {
        if (t.date.startsWith(currentMonthStr)) {
          const day = parseInt(t.date.split('-')[2] || '1');
          const dayOfWeek = new Date(t.date).getDay();
          // Fixed payday commitments on days 1-7 (Rent, EMIs, Bills) don't repeat daily
          if (day <= 7 && ['Housing', 'Utilities', 'Debts', 'Savings'].includes(t.category)) {
            paydaySpikeAmount += t.amount;
          } else {
            dailyDiscretionaryAmount += t.amount;
            if (dayOfWeek === 0 || dayOfWeek === 6) {
              pastWeekends++;
            } else {
              pastWeekdays++;
            }
          }
        }
      }

      // Weekend spending multiplier: weekend burn is empirically ~1.55x weekday burn
      const effectivePastDays = Math.max(1, pastWeekdays + (pastWeekends * 1.55));
      const baseDailyRate = dailyDiscretionaryAmount / effectivePastDays;

      // Project remaining days based on calendar day-of-week composition
      let remainingWeekdays = 0;
      let remainingWeekends = 0;
      for (let d = currentDay + 1; d <= daysInCurrentMonth; d++) {
        const testDate = new Date(today.getFullYear(), today.getMonth(), d);
        const dow = testDate.getDay();
        if (dow === 0 || dow === 6) remainingWeekends++;
        else remainingWeekdays++;
      }

      const projectedRemaining = (remainingWeekdays * baseDailyRate) + (remainingWeekends * baseDailyRate * 1.55);
      const extrapolated = Math.round(amount + projectedRemaining);

      historicalData.push({ month: m, amount: amount, extrapolated_amount: extrapolated });
    } else {
      historicalData.push({ month: m, amount: amount, extrapolated_amount: amount });
    }
  }

  if (!(currentMonthStr in monthlyTotals)) {
    historicalData.push({ month: currentMonthStr, amount: 0.0, extrapolated_amount: 0.0 });
  }

  let nextMonthVal = today.getMonth() + 1;
  let nextYearVal = today.getFullYear();
  if (nextMonthVal > 11) {
    nextMonthVal = 0;
    nextYearVal++;
  }
  const nextMonthStr = `${nextYearVal}-${String(nextMonthVal + 1).padStart(2, '0')}`;

  const n = sortedMonths.length;
  let predictedTotal = 0;
  let confidenceStd = 0;

  if (n < 3) {
    let sumExtrapolated = 0;
    for (let i = 0; i < n; i++) {
      sumExtrapolated += historicalData[i].extrapolated_amount;
    }
    predictedTotal = n > 0 ? sumExtrapolated / n : 0;
    confidenceStd = predictedTotal * 0.1;
  } else {
    const x = Array.from({ length: n }, (_, i) => i);
    const y = x.map(i => historicalData[i].extrapolated_amount);

    let sumX = 0, sumY = 0, sumXX = 0, sumXY = 0;
    for (let i = 0; i < n; i++) {
      sumX += x[i];
      sumY += y[i];
      sumXX += x[i] * x[i];
      sumXY += x[i] * y[i];
    }

    let denominator = n * sumXX - sumX * sumX;
    let slope = 0;
    if (denominator !== 0) {
        slope = (n * sumXY - sumX * sumY) / denominator;
    }
    
    const intercept = (sumY - slope * sumX) / n;
    predictedTotal = slope * n + intercept;

    const predictions = x.map(i => slope * i + intercept);
    const residuals = x.map(i => y[i] - predictions[i]);

    let sumRes = 0;
    for (const r of residuals) sumRes += r;
    const meanRes = sumRes / n;

    let varSum = 0;
    for (const r of residuals) varSum += Math.pow(r - meanRes, 2);
    const variance = varSum / n;

    confidenceStd = Math.pow(variance, 0.5);
  }

  predictedTotal = Math.max(0.0, predictedTotal);

  const perCategory: Array<{ category: string; predicted_amount: number }> = [];
  for (const [cat, monthData] of Object.entries(categoryMonthlyTotals)) {
    let catTotal = 0;
    const monthKeys = Object.keys(monthData);
    for (const m of monthKeys) {
      catTotal += monthData[m];
    }
    const catMonthsActive = monthKeys.length;
    const catPred = catMonthsActive > 0 ? catTotal / catMonthsActive : 0;
    perCategory.push({ category: cat, predicted_amount: catPred });
  }

  return {
    predicted_next_month: predictedTotal,
    confidence_low: Math.max(0, predictedTotal - confidenceStd),
    confidence_high: predictedTotal + confidenceStd,
    per_category: perCategory,
    historical: historicalData,
    projected: [{ month: nextMonthStr, amount: predictedTotal }]
  };
}
