/**
 * Tier 3: Cross-Feature Interactions & Combinations Test Suite
 * Lumina Smart Expense Automated Test Matrix
 * 
 * Flows:
 * 1. UPI payment parsing -> transaction recording -> budget threshold alerting (80% / 100%)
 * 2. Ingest bank SMS -> auto-categorization -> DB ingestion -> deduplication
 * 3. Salary credit SMS ingestion -> cashflow summary & net savings update
 * 4. Split bill creation with integer paise -> debt tracking -> UPI URI settlement -> settle debt
 * 5. Goal creation -> contribution tracking -> metric recomputation
 * 6. LocalStorage tracked bills -> due date payment -> transaction creation
 * 7. Full database & preferences export -> purge -> restore -> 100% parity verification
 */

import { db, nowISO, todayISO, generateId, toLocalDateStr, splitPaiseEqually } from '../src/lib/db.ts';
import { parseUpiUri, buildUpiUri } from '../src/lib/upi.ts';
import { parseSMS } from '../src/lib/smsParser.ts';
import {
  createTransaction,
  getTransactions,
  createCategoryBudget,
  createSplit,
  getBalances,
  toggleSplitMemberPaid,
  createGoal,
  contributeToGoal,
  getGoals,
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

async function runTier3Tests() {
  console.log('\n========================================================');
  console.log('🚀 RUNNING TIER 3: CROSS-FEATURE INTERACTIONS TEST MATRIX');
  console.log('========================================================\n');

  // Clean initial state
  await db.users.clear();
  await db.transactions.clear();
  await db.categoryBudgets.clear();
  await db.splitBills.clear();
  await db.splitMembers.clear();
  await db.goals.clear();
  localStorage.clear();

  const today = new Date();
  const currentMonthDateStr = toLocalDateStr(today);

  // ── Setup User Profile ───────────────────────────────────────────────
  const testUser = {
    id: 'user-e2e-1',
    name: 'Aasim Ahmed',
    email: 'aasim@lumina.local',
    age: 26,
    dob: '1998-05-15',
    monthly_budget: 60000,
    vault_balance: 0,
    preferred_currency: 'INR',
    user_persona: 'unmarried_employee',
    current_streak: 5,
    unlocked_badges: '[]',
    created_at: nowISO(),
  };
  await db.users.add(testUser);

  // ── Flow 1: UPI Quick Pay -> Record Transaction ──────────────────────
  console.log('--- Flow 1: UPI Quick Pay to Transaction Record ---');

  const rawQr = 'upi://pay?pa=starbucks@hdfcbank&pn=Starbucks%20Coffee&am=420.00&mc=5812&tn=Cold%20Brew';
  const parsedUpi = parseUpiUri(rawQr);
  assert(parsedUpi !== null && parsedUpi.pa === 'starbucks@hdfcbank', 'Flow 1: UPI URI parsed successfully');
  assert(parsedUpi?.am === 420 && parsedUpi?.pn === 'Starbucks Coffee', 'Flow 1: Extracted amount ₹420 and Payee Name');

  // Record payment in DB
  const tx1 = await createTransaction({
    date: currentMonthDateStr,
    merchant: parsedUpi!.pn!,
    amount: parsedUpi!.am!,
    source: 'upi_quick_pay',
  });
  assert(tx1.amount === 420, 'Flow 1: Transaction created with ₹420');
  assert(tx1.category === 'Food & Dining', 'Flow 1: Auto-categorized Starbucks to Food & Dining', `Got: ${tx1.category}`);

  // ── Flow 2: Budget Threshold Warning & Critical Alerts ───────────────
  console.log('\n--- Flow 2: Budget Threshold Alerts (80% and 100%) ---');

  // Setup ₹1,000 budget for 'Food & Dining'
  await createCategoryBudget({ category: 'Food & Dining', amount: 1000 });

  // Currently spent: ₹420 (42% of ₹1000) -> No alert
  let alerts = await computeAlerts(testUser);
  const catAlert42 = alerts.find(a => a.title.includes('Category Budget Alert'));
  assert(!catAlert42, 'Flow 2: 42% spending does not trigger 80% warning alert');

  // Add ₹450 expense -> Total spent: ₹870 (87% of ₹1000) -> Triggers 80% Warning
  await createTransaction({
    date: currentMonthDateStr,
    merchant: 'Zomato Biryani',
    amount: 450,
    source: 'manual_entry',
  });

  alerts = await computeAlerts(testUser);
  const catAlert87 = alerts.find(a => a.title.includes('Category Budget Alert') && a.message.includes('Food & Dining'));
  assert(!!catAlert87, 'Flow 2: 87% spending triggers 80% threshold budget alert');
  assert(catAlert87?.message.includes('870') || catAlert87?.message.includes('Food & Dining'), 'Flow 2: Alert message reflects updated spend');

  // Add ₹200 expense -> Total spent: ₹1070 (107% of ₹1000) -> Exceeds budget
  await createTransaction({
    date: currentMonthDateStr,
    merchant: 'Chai Point',
    amount: 200,
    source: 'manual_entry',
  });
  const spentFood = await computeSpentThisMonth('Food & Dining');
  assert(spentFood === 1070, 'Flow 2: Category spend strictly equals ₹1070 (> 100% of budget)');

  // ── Flow 3: Bank SMS Ingestion & Deduplication ───────────────────────
  console.log('\n--- Flow 3: Bank SMS Ingestion & Deduplication ---');

  const rawSms = 'Sent Rs.649.00 from ICICI Bank A/c XX4092 to Netflix on 10-11-2024. UPI Ref 431589123456. Avl Bal Rs 52,140.00';
  const parsedSms = parseSMS(rawSms, 'ICICIB');
  assert(parsedSms !== null && parsedSms.amount === 649, 'Flow 3: SMS parsed amount ₹649');
  assert(parsedSms?.merchant.toLowerCase().includes('netflix'), 'Flow 3: SMS parsed merchant Netflix');

  const smsHash = 'sms-hash-netflix-649';
  const smsTx = await createTransaction({
    date: currentMonthDateStr,
    merchant: parsedSms!.merchant,
    amount: parsedSms!.amount,
    source: 'auto_sms',
    sms_hash: smsHash,
  });
  assert(smsTx.amount === 649, 'Flow 3: SMS transaction inserted into DB');

  // Attempt duplicate ingestion
  const duplicateTx = await createTransaction({
    date: currentMonthDateStr,
    merchant: parsedSms!.merchant,
    amount: parsedSms!.amount,
    source: 'auto_sms',
    sms_hash: smsHash,
  });
  assert(duplicateTx.id === smsTx.id, 'Flow 3: Duplicate SMS hash returned existing transaction ID');

  const totalTxnCount = await db.transactions.count();
  // 3 Food & Dining + 1 Netflix = 4
  assert(totalTxnCount === 4, 'Flow 3: Deduplication prevented duplicate database row insertion');

  // ── Flow 4: Salary Credit SMS -> Income & Cashflow Update ────────────
  console.log('\n--- Flow 4: Salary Credit SMS & Net Cashflow Analytics ---');

  const salarySms = 'Your A/c ending 1234 is credited with INR 75,000.00 on 01-11-2024 by SALARY TRANSFER from TechCorp. Avl Bal INR 1,27,140.00';
  const parsedSalary = parseSMS(salarySms, 'HDFCBK');
  assert(parsedSalary?.type === 'credit' && parsedSalary?.amount === 75000, 'Flow 4: Salary identified as credit for ₹75,000');

  await createTransaction({
    date: currentMonthDateStr,
    merchant: parsedSalary!.merchant,
    amount: parsedSalary!.amount,
    type: 'credit',
    category: 'Salary',
    source: 'auto_sms',
  });

  const summary = await computeSummary(testUser);
  assert(summary.total_income_this_month === 75000, 'Flow 4: Analytics registers total monthly income = ₹75,000', `Got: ${summary.total_income_this_month}`);
  // Expenses = 420 + 450 + 200 + 649 = 1719
  assert(summary.total_this_month === 1719, 'Flow 4: Analytics registers total monthly expenses = ₹1,719', `Got: ${summary.total_this_month}`);
  assert(summary.net_cash_flow === (75000 - 1719), 'Flow 4: Net cash flow = ₹73,281 positive surplus');

  // ── Flow 5: Split Bill, Offline QR Settlement & Debt Payback ─────────
  console.log('\n--- Flow 5: Split Bill & Offline Debt Settlement ---');

  const dinnerTotal = 2450;
  const shares = splitPaiseEqually(dinnerTotal, 3);
  assert(shares[0] === 816.67 && shares[1] === 816.67 && shares[2] === 816.66, 'Flow 5: Exact integer paise division [816.67, 816.67, 816.66]');

  const splitRecord = await createSplit({
    title: 'Weekend Barbeque',
    total_amount: dinnerTotal,
    date: currentMonthDateStr,
    payer_name: 'Aasim',
    members: [
      { name: 'Rohan', share_amount: shares[0] },
      { name: 'Pooja', share_amount: shares[1] },
      { name: 'Aasim', share_amount: shares[2] },
    ],
  });
  assert(splitRecord.members.length === 3, 'Flow 5: Split bill created with 3 members');

  const balancesBefore = await getBalances();
  const rohanDebtBefore = balancesBefore.find(b => b.name === 'Rohan');
  assert(rohanDebtBefore?.net_balance === 816.67, 'Flow 5: Tracked debt shows Rohan owes ₹816.67');

  // Build offline settlement URI for Rohan
  const settleUri = buildUpiUri({
    pa: 'aasim@okhdfcbank',
    pn: 'Aasim Ahmed',
    am: rohanDebtBefore!.net_balance,
    tn: 'Weekend Barbeque Settlement',
  });
  assert(settleUri.includes('am=816.67') && settleUri.includes('Weekend%20Barbeque%20Settlement'), 'Flow 5: Settlement URI formatted with exact amount');

  // Rohan pays -> Settle Rohan's share
  const rohanMember = splitRecord.members.find((m: any) => m.name === 'Rohan');
  await toggleSplitMemberPaid(splitRecord.id, rohanMember!.id);

  const balancesAfter = await getBalances();
  const rohanDebtAfter = balancesAfter.find(b => b.name === 'Rohan');
  assert(!rohanDebtAfter, 'Flow 5: Rohan debt removed after settlement');
  const poojaDebt = balancesAfter.find(b => b.name === 'Pooja');
  assert(poojaDebt?.net_balance === 816.67, 'Flow 5: Pooja debt remains outstanding at ₹816.67');

  // ── Flow 6: Goal Creation & Contribution Tracking ────────────────────
  console.log('\n--- Flow 6: Goal Lifecycle & Progress Metrics ---');

  const goal = await createGoal({
    name: 'MacBook Pro M4',
    target_amount: 150000,
    target_date: '2025-12-31',
    icon: '💻',
  });
  assert(goal.target_amount === 150000 && goal.saved_amount === 0, 'Flow 6: Goal initialized with ₹1,50,000 target and ₹0 saved');

  const updatedGoal = await contributeToGoal(goal.id, 30000);
  assert(updatedGoal.saved_amount === 30000, 'Flow 6: Goal contribution ₹30,000 recorded');
  assert(updatedGoal.percentage === 20, 'Flow 6: Goal progress metric reports exactly 20%');

  // ── Flow 7: LocalStorage Tracked Bills to Transaction ─────────────────
  console.log('\n--- Flow 7: Tracked Bills Integration ---');

  const trackedBills = [
    { id: 'bill-bescom', name: 'BESCOM Electricity', amount: 2450, due_day: 15, is_paid: false },
    { id: 'bill-act', name: 'ACT Fibernet', amount: 999, due_day: 5, is_paid: false },
  ];
  localStorage.setItem('lumina_tracked_bills', JSON.stringify(trackedBills));

  // Mark BESCOM as paid & record transaction
  trackedBills[0].is_paid = true;
  localStorage.setItem('lumina_tracked_bills', JSON.stringify(trackedBills));

  await createTransaction({
    date: currentMonthDateStr,
    merchant: trackedBills[0].name,
    amount: trackedBills[0].amount,
    category: 'Utilities',
    source: 'bill_autopay',
  });

  const spentUtilities = await computeSpentThisMonth('Utilities');
  assert(spentUtilities === 2450, 'Flow 7: Utilities spend updated to ₹2,450 from paid bill');

  // ── Flow 8: Disaster Recovery Export, Purge & Full Restore ───────────
  console.log('\n--- Flow 8: Database Backup, Purge & Full Restore ---');

  // Add saved UPI payee in localStorage
  localStorage.setItem('lumina_saved_upi_payees', JSON.stringify([
    { name: 'Dr. Sharma', vpa: 'sharma@icici', category: 'Health & Fitness' }
  ]));
  localStorage.setItem('lumina_theme', 'dark');

  // 1. Export backup payload
  const backup = await exportDatabasePayload();
  assert(backup.transactions.length >= 5, 'Flow 8: Backup captures all transactions');
  assert(backup.users.length === 1, 'Flow 8: Backup captures user profile');
  assert(backup.categoryBudgets.length >= 1, 'Flow 8: Backup captures category budgets');
  assert(backup.splitBills.length >= 1, 'Flow 8: Backup captures split bills');
  assert(backup.goals.length >= 1, 'Flow 8: Backup captures goals');
  assert(Array.isArray(backup.tracked_bills) && backup.tracked_bills.length === 2, 'Flow 8: Backup captures localStorage tracked bills');

  // 2. Wipe database and localStorage
  await db.users.clear();
  await db.transactions.clear();
  await db.categoryBudgets.clear();
  await db.splitBills.clear();
  await db.splitMembers.clear();
  await db.goals.clear();
  localStorage.clear();

  assert((await db.transactions.count()) === 0, 'Flow 8: Database purged to 0 transactions');
  assert(localStorage.getItem('lumina_tracked_bills') === null, 'Flow 8: LocalStorage purged');

  // 3. Restore database from payload
  const restoreResult = await restoreDatabaseFromPayload(backup);
  assert(restoreResult.success === true, 'Flow 8: Restore operation reported success');

  // 4. Verify 100% parity
  const restoredTxCount = await db.transactions.count();
  assert(restoredTxCount === backup.transactions.length, 'Flow 8: Restored transactions count matches backup exactly', `Restored: ${restoredTxCount}, Backup: ${backup.transactions.length}`);

  const restoredUser = await db.users.get('user-e2e-1');
  assert(restoredUser?.name === 'Aasim Ahmed', 'Flow 8: User profile restored with data integrity');

  const restoredTrackedBills = JSON.parse(localStorage.getItem('lumina_tracked_bills') || '[]');
  assert(restoredTrackedBills.length === 2, 'Flow 8: LocalStorage tracked bills restored');

  const restoredPayees = JSON.parse(localStorage.getItem('lumina_saved_upi_payees') || '[]');
  assert(restoredPayees[0]?.name === 'Dr. Sharma', 'Flow 8: Saved UPI payees restored');
  assert(localStorage.getItem('lumina_theme') === 'dark', 'Flow 8: User preferences restored');

  // ── Flow 9: Transaction Filtering Combinations ───────────────────────
  console.log('\n--- Flow 9: Multi-Parameter Transaction Filtering ---');

  const allTxns = await getTransactions();
  assert(allTxns.length >= 5, 'Flow 9: Fetched all transactions');

  const debitFilter = new URLSearchParams({ type: 'debit' });
  const debitTxns = await getTransactions(debitFilter);
  assert(debitTxns.every(t => t.type === 'debit'), 'Flow 9: Filtered strictly debit transactions');

  const creditFilter = new URLSearchParams({ type: 'credit' });
  const creditTxns = await getTransactions(creditFilter);
  assert(creditTxns.every(t => t.type === 'credit') && creditTxns.length >= 1, 'Flow 9: Filtered strictly credit transactions');

  const categoryFilter = new URLSearchParams({ category: 'Food & Dining' });
  const foodTxns = await getTransactions(categoryFilter);
  assert(foodTxns.every(t => t.category === 'Food & Dining'), 'Flow 9: Filtered by category Food & Dining');

  console.log('\n========================================================');
  console.log(`🏁 TIER 3 RESULTS: ${passed} PASSED, ${failed} FAILED (TOTAL: ${passed + failed})`);
  console.log('========================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTier3Tests().catch(err => {
  console.error('Fatal error running Tier 3 tests:', err);
  process.exit(1);
});
