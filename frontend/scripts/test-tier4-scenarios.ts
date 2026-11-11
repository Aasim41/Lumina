/**
 * Tier 4: Real-World Scenarios Test Suite
 * Lumina Smart Expense Automated Test Matrix
 * 
 * Scenarios:
 * 1. Monthly Salary Credit & Cashflow Lifecycle (SMS -> DB -> Analytics)
 * 2. Dinner Bill Split with Friends, Offline QR & Debt Settlement (Integer paise, SVG QR, Debt tracking)
 * 3. Monthly Recurring Utility Bills & Due Date Alert Lifecycle (Tracked bills -> Payment -> Budget thresholds)
 * 4. Multi-Bank Statement CSV Import & Reconciliation (DD/MM/YYYY, DD-MM-YYYY, ISO -> Ingestion)
 * 5. Disaster Recovery Vault Backup, Wiping & 100% Parity Restore (Atomic transaction, LocalStorage parity)
 * 6. Year-End Financial Wrap-Up Analytics Across 12 Months (Timezone safety, No RangeError)
 */

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { QRCodeSVG } from 'qrcode.react';

import { db, nowISO, todayISO, generateId, toLocalDateStr, splitPaiseEqually, toPaise } from '../src/lib/db.ts';
import { parseUpiUri, buildUpiUri } from '../src/lib/upi.ts';
import { parseSMS } from '../src/lib/smsParser.ts';
import { parseCsvDate } from '../src/lib/csvParser.ts';
import { formatDate, formatMonth, formatCurrency } from '../src/lib/utils.ts';
import {
  createTransaction,
  getTransactions,
  createCategoryBudget,
  createSplit,
  getBalances,
  toggleSplitMemberPaid,
  createGoal,
  contributeToGoal,
  createDebt,
  updateDebt,
  createInvestment,
} from '../src/lib/api.ts';
import { computeAlerts, computeSummary, computeSpentThisMonth } from '../src/lib/analytics.ts';
import { exportDatabasePayload, restoreDatabaseFromPayload } from '../src/lib/dataBackup.ts';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, details?: string) {
  if (condition) {
    console.log(`✅ [PASS] ${testName}`);
    passed++;
  } else {
    console.error(`❌ [FAIL] ${testName}${details ? ` -> ${details}` : ''}`);
    failed++;
  }
}

async function runTier4Scenarios() {
  console.log('\n========================================================');
  console.log('🚀 RUNNING TIER 4: REAL-WORLD APPLICATION SCENARIOS');
  console.log('========================================================\n');

  // ── Scenario 1: Monthly Income & Salary Credit Lifecycle ──────────────
  console.log('=== Scenario 1: Monthly Income & Salary Credit Lifecycle ===');
  await db.users.clear();
  await db.transactions.clear();
  await db.categoryBudgets.clear();
  localStorage.clear();

  const user1 = {
    id: 'user-scenario-1',
    name: 'Priya Sharma',
    email: 'priya@lumina.local',
    monthly_budget: 70000,
    vault_balance: 0,
    preferred_currency: 'INR',
    user_persona: 'unmarried_employee',
    current_streak: 1,
    unlocked_badges: '[]',
    created_at: nowISO(),
  };
  await db.users.add(user1);

  const today = new Date();
  const currentMonthDateStr = toLocalDateStr(today);

  // 1. Salary SMS arrives
  const salarySms = 'HDFC Bank: Rs 92,000.00 credited to A/c ending 8812 on 01-Nov-2024 by SALARY TRANSFER from Infosys Ltd. Net Avl Bal: Rs 1,45,210.00';
  const parsedSalary = parseSMS(salarySms, 'HDFCBK');
  assert(parsedSalary !== null && parsedSalary.type === 'credit', 'Scenario 1: Salary SMS identified as credit');
  assert(parsedSalary?.amount === 92000, 'Scenario 1: Salary credit parsed amount ₹92,000');

  // 2. Ingest salary into DB
  await createTransaction({
    date: currentMonthDateStr,
    merchant: parsedSalary!.merchant,
    amount: parsedSalary!.amount,
    type: 'credit',
    category: 'Salary',
    source: 'auto_sms',
  });

  // 3. User makes daily transactions
  await createTransaction({
    date: currentMonthDateStr,
    merchant: 'Apartment Rent',
    amount: 25000,
    category: 'Housing',
    type: 'debit',
  });
  await createTransaction({
    date: currentMonthDateStr,
    merchant: 'Nature Basket Groceries',
    amount: 4500,
    category: 'Shopping',
    type: 'debit',
  });

  // 4. Analytics reflects cashflow
  const summary1 = await computeSummary(user1);
  assert(summary1.total_income_this_month === 92000, 'Scenario 1: Analytics income reflects ₹92,000');
  assert(summary1.total_this_month === 29500, 'Scenario 1: Analytics expenses reflect ₹29,500 (Rent + Groceries)');
  assert(summary1.net_cash_flow === (92000 - 29500), 'Scenario 1: Net cash flow = ₹62,500 positive surplus');

  // ── Scenario 2: Dinner Bill Split, Offline QR & Debt Settlement ───────
  console.log('\n=== Scenario 2: Dinner Bill Split, Offline QR & Debt Settlement ===');
  await db.splitBills.clear();
  await db.splitMembers.clear();

  const dinnerTotal = 3890;
  const splitShares = splitPaiseEqually(dinnerTotal, 4);
  assert(splitShares.length === 4, 'Scenario 2: Bill divided among 4 members');
  assert(splitShares[0] === 972.50 && splitShares[1] === 972.50 && splitShares[2] === 972.50 && splitShares[3] === 972.50, 'Scenario 2: Equal division ₹3,890 / 4 = ₹972.50 each');

  const splitBill = await createSplit({
    title: 'BBQ Nation Team Dinner',
    total_amount: dinnerTotal,
    date: currentMonthDateStr,
    payer_name: 'Priya',
    members: [
      { name: 'Alice', share_amount: splitShares[0] },
      { name: 'Bob', share_amount: splitShares[1] },
      { name: 'Charlie', share_amount: splitShares[2] },
      { name: 'Priya', share_amount: splitShares[3] },
    ],
  });
  assert(splitBill.members.length === 4, 'Scenario 2: Split bill created with 4 member records');

  // Render offline QR SVG for Alice
  const aliceUri = buildUpiUri({
    pa: 'priya@okhdfcbank',
    pn: 'Priya Sharma',
    am: 972.50,
    tn: 'BBQ Nation Dinner Share',
  });
  const aliceQrSvg = renderToStaticMarkup(
    React.createElement(QRCodeSVG, {
      value: aliceUri,
      size: 192,
      level: 'M',
    })
  );
  assert(aliceQrSvg.includes('<svg') && aliceQrSvg.includes('width="192"'), 'Scenario 2: Offline QR SVG rendered for Alice');

  // Alice settles debt
  const aliceMember = splitBill.members.find((m: any) => m.name === 'Alice');
  await toggleSplitMemberPaid(splitBill.id, aliceMember!.id);

  const balances = await getBalances();
  const aliceDebt = balances.find(b => b.name === 'Alice');
  assert(!aliceDebt, 'Scenario 2: Alice debt marked paid and cleared from active balances');

  const bobDebt = balances.find(b => b.name === 'Bob');
  const charlieDebt = balances.find(b => b.name === 'Charlie');
  assert(bobDebt?.net_balance === 972.50 && charlieDebt?.net_balance === 972.50, 'Scenario 2: Bob and Charlie outstanding debts tracked at ₹972.50 each');

  // ── Scenario 3: Recurring Utility Bills & Due Date Alert Lifecycle ────
  console.log('\n=== Scenario 3: Recurring Bills & Budget Threshold Alerts ===');
  await db.categoryBudgets.clear();

  // Setup ₹4,000 budget for Utilities
  await createCategoryBudget({ category: 'Utilities', amount: 4000 });

  const bills = [
    { id: 'bill-elec', name: 'BESCOM Power', amount: 2800, due_day: 10, is_paid: false },
    { id: 'bill-net', name: 'Airtel Broadband', amount: 999, due_day: 15, is_paid: false },
    { id: 'bill-water', name: 'Water Tanker', amount: 450, due_day: 20, is_paid: false },
  ];
  localStorage.setItem('lumina_tracked_bills', JSON.stringify(bills));

  // 1. Pay Bill 1: Electricity (₹2,800) -> 70% of budget
  bills[0].is_paid = true;
  localStorage.setItem('lumina_tracked_bills', JSON.stringify(bills));
  await createTransaction({
    date: currentMonthDateStr,
    merchant: bills[0].name,
    amount: bills[0].amount,
    category: 'Utilities',
    source: 'bill_autopay',
  });
  let alerts3 = await computeAlerts(user1);
  const alert70 = alerts3.find(a => a.message.includes('Utilities'));
  assert(!alert70, 'Scenario 3: 70% spending (₹2,800) does not trigger budget alert');

  // 2. Pay Bill 2: Internet (₹999) -> Total ₹3,799 (94.975%) -> Triggers 80% threshold!
  bills[1].is_paid = true;
  localStorage.setItem('lumina_tracked_bills', JSON.stringify(bills));
  await createTransaction({
    date: currentMonthDateStr,
    merchant: bills[1].name,
    amount: bills[1].amount,
    category: 'Utilities',
    source: 'bill_autopay',
  });
  alerts3 = await computeAlerts(user1);
  const alert95 = alerts3.find(a => a.title.includes('Category Budget Alert') && a.message.includes('Utilities'));
  assert(!!alert95, 'Scenario 3: 94.9% spending (₹3,799) triggers 80% budget threshold alert');

  // 3. Pay Bill 3: Water (₹450) -> Total ₹4,249 (> 100% of budget)
  bills[2].is_paid = true;
  localStorage.setItem('lumina_tracked_bills', JSON.stringify(bills));
  await createTransaction({
    date: currentMonthDateStr,
    merchant: bills[2].name,
    amount: bills[2].amount,
    category: 'Utilities',
    source: 'bill_autopay',
  });
  const spentUtilities = await computeSpentThisMonth('Utilities');
  assert(spentUtilities === 4249, 'Scenario 3: Total utilities spend correctly totals ₹4,249 (106% of budget)');

  // ── Scenario 4: Bank Statement CSV Import & Reconciliation ───────────
  console.log('\n=== Scenario 4: Multi-Bank Statement CSV Import & Reconciliation ===');

  const csvRows = [
    { date: '15/04/2024', merchant: 'Swiggy Food Blr', amount: 450, category: 'Food & Dining' },
    { date: '20-04-2024', merchant: 'Amazon India Retail', amount: 1499, category: 'Shopping' },
    { date: '2024-04-25', merchant: 'Uber India Trip', amount: 280, category: 'Transport' },
    { date: '01.05.2024', merchant: 'Apollo Pharmacy Meds', amount: 650, category: 'Health & Fitness' },
    { date: '10-May-2024', merchant: 'Blue Tokai Cafe', amount: 320, category: 'Chai & Snacks' },
  ];

  let csvSuccessCount = 0;
  let totalCsvDebit = 0;
  for (const row of csvRows) {
    const parsedDate = parseCsvDate(row.date);
    if (parsedDate) {
      csvSuccessCount++;
      totalCsvDebit += row.amount;
      await createTransaction({
        date: parsedDate,
        merchant: row.merchant,
        amount: row.amount,
        category: row.category,
        source: 'csv_upload',
      });
    }
  }

  assert(csvSuccessCount === 5, 'Scenario 4: All 5 mixed-format CSV rows parsed without error');
  assert(totalCsvDebit === (450 + 1499 + 280 + 650 + 320), 'Scenario 4: Total statement debit equals exactly ₹3,199');

  const aprTxns = await getTransactions(new URLSearchParams({ month: '2024-04' }));
  assert(aprTxns.length === 3, 'Scenario 4: Exactly 3 transactions isolated to April 2024 statement');

  const mayTxns = await getTransactions(new URLSearchParams({ month: '2024-05' }));
  assert(mayTxns.length === 2, 'Scenario 4: Exactly 2 transactions isolated to May 2024 statement');

  // ── Scenario 5: Disaster Recovery Vault Backup, Wiping & Restore ──────
  console.log('\n=== Scenario 5: Disaster Recovery Vault Backup, Wiping & Restore ===');

  // Add supplementary data: debt, investment, goal
  await createDebt({
    name: 'Education Loan',
    total_amount: 300000,
    paid_amount: 50000,
    interest_rate: 8.5,
  });
  await createInvestment({
    name: 'Gold ETF',
    ticker: 'GOLDBEES',
    asset_class: 'Commodities',
    quantity: 100,
    average_buy_price: 55,
    invested_amount: 5500,
  });
  await createGoal({
    name: 'Emergency Fund',
    target_amount: 200000,
    target_date: '2025-12-31',
  });

  localStorage.setItem('lumina_saved_upi_payees', JSON.stringify([
    { name: 'Landlord', vpa: 'landlord@hdfcbank' },
    { name: 'Maid Service', vpa: 'maid@paytm' },
  ]));
  localStorage.setItem('lumina_theme', 'dark');
  localStorage.setItem('lumina_biometric_enabled', 'true');

  // 1. Export vault snapshot
  const vaultBackup = await exportDatabasePayload();
  assert(vaultBackup.users.length === 1, 'Scenario 5: Backup contains user');
  assert(vaultBackup.transactions.length >= 10, 'Scenario 5: Backup contains 10+ transactions');
  assert(vaultBackup.debts.length === 1, 'Scenario 5: Backup contains debt');
  assert(vaultBackup.investments.length === 1, 'Scenario 5: Backup contains investment');
  assert(vaultBackup.goals.length === 1, 'Scenario 5: Backup contains goal');

  // 2. Wipe database completely
  await db.users.clear();
  await db.transactions.clear();
  await db.categoryBudgets.clear();
  await db.splitBills.clear();
  await db.splitMembers.clear();
  await db.debts.clear();
  await db.investments.clear();
  await db.goals.clear();
  localStorage.clear();

  assert((await db.transactions.count()) === 0, 'Scenario 5: Database successfully wiped');
  assert(localStorage.length === 0, 'Scenario 5: LocalStorage successfully wiped');

  // 3. Execute recovery restore
  const restoreOutcome = await restoreDatabaseFromPayload(vaultBackup);
  assert(restoreOutcome.success === true, 'Scenario 5: Vault restore succeeded');

  // 4. Parity verification
  const restoredTx = await db.transactions.count();
  assert(restoredTx === vaultBackup.transactions.length, 'Scenario 5: Transaction count matches pre-wipe count exactly');

  const restoredDebt = (await db.debts.toArray())[0];
  assert(restoredDebt?.name === 'Education Loan' && restoredDebt?.total_amount === 300000, 'Scenario 5: Debt record restored with data integrity');

  const restoredInv = (await db.investments.toArray())[0];
  assert(restoredInv?.name === 'Gold ETF' && restoredInv?.invested_amount === 5500, 'Scenario 5: Investment record restored with data integrity');

  const restoredPayees = JSON.parse(localStorage.getItem('lumina_saved_upi_payees') || '[]');
  assert(restoredPayees.length === 2 && restoredPayees[0].name === 'Landlord', 'Scenario 5: LocalStorage payees restored with data integrity');
  assert(localStorage.getItem('lumina_biometric_enabled') === 'true', 'Scenario 5: LocalStorage preferences restored');

  // ── Scenario 6: Year-End Financial Wrap-Up Across 12 Months ───────────
  console.log('\n=== Scenario 6: Year-End Financial Wrap-Up Across 12 Months ===');

  const yearMonths = [
    '2024-01-15', '2024-02-20', '2024-03-10', '2024-04-05',
    '2024-05-18', '2024-06-22', '2024-07-14', '2024-08-30',
    '2024-09-12', '2024-10-25', '2024-11-11', '2024-12-31'
  ];

  let allDatesFormattedSafely = true;
  for (const dateStr of yearMonths) {
    const formatted = formatDate(dateStr);
    const monthFormatted = formatMonth(dateStr.slice(0, 7));
    if (!formatted || formatted === 'N/A' || !monthFormatted) {
      allDatesFormattedSafely = false;
    }
  }
  assert(allDatesFormattedSafely, 'Scenario 6: All 12 calendar month dates format safely without RangeError');

  // Seed 1 transaction per month in 2024
  for (let m = 0; m < 12; m++) {
    const monthNum = String(m + 1).padStart(2, '0');
    await createTransaction({
      date: `2024-${monthNum}-15`,
      merchant: `Month ${m + 1} Grocery`,
      amount: 3000 + m * 200,
      category: 'Food & Dining',
      type: 'debit',
    });
  }

  // Verify transactions exist across 12 months
  const yearTxns = await db.transactions.where('date').between('2024-01-01', '2024-12-31', true, true).toArray();
  assert(yearTxns.length >= 12, 'Scenario 6: Transactions populated across all 12 months of 2024');

  const totalYearSpend = yearTxns.reduce((sum, t) => sum + t.amount, 0);
  assert(totalYearSpend > 0 && !isNaN(totalYearSpend), 'Scenario 6: Total annual spend computed without NaN');

  const formattedYearSpend = formatCurrency(totalYearSpend);
  assert(formattedYearSpend.includes('₹'), 'Scenario 6: Annual total formatted as Indian Rupees');

  console.log('\n========================================================');
  console.log(`🏁 TIER 4 RESULTS: ${passed} PASSED, ${failed} FAILED (TOTAL: ${passed + failed})`);
  console.log('========================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTier4Scenarios().catch(err => {
  console.error('Fatal error running Tier 4 scenarios:', err);
  process.exit(1);
});
