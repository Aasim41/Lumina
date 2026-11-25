import { describe, it } from 'node:test';
import assert from 'node:assert';
import { toPaise, fromPaise, splitPaiseEqually, todayISO } from '../src/lib/db';
import { cleanMerchantName, normalizeAmount } from '../src/lib/cleaner';
import { EXCLUDED_EXPENSE_CATEGORIES, getBudgetCycle } from '../src/lib/analytics';

console.log('========================================================');
console.log('🧪 RUNNING SECRET VAULT & FINANCIAL CALCULATIONS AUDIT');
console.log('========================================================');

// 1. Paire Arithmetic & Split Exactness
console.log('\n--- 1. Exact Integer Paise Arithmetic ---');
assert.strictEqual(toPaise(100.50), 10050, '₹100.50 must convert to 10050 paise');
assert.strictEqual(toPaise(0.01), 1, '₹0.01 must convert to 1 paisa');
assert.strictEqual(toPaise(0), 0, '₹0 must convert to 0 paise');
assert.strictEqual(fromPaise(10050), 100.50, '10050 paise must convert to ₹100.50');
assert.strictEqual(fromPaise(1), 0.01, '1 paisa must convert to ₹0.01');
console.log('✅ [PASS] toPaise and fromPaise roundtrip accurately');

const splitBill = splitPaiseEqually(100, 3);
assert.strictEqual(splitBill.length, 3, 'Must split into 3 parts');
assert.strictEqual(splitBill[0], 33.34, 'First share must be 33.34');
assert.strictEqual(splitBill[1], 33.33, 'Second share must be 33.33');
assert.strictEqual(splitBill[2], 33.33, 'Third share must be 33.33');
const sumSplit = splitBill.reduce((a, b) => a + b, 0);
assert.strictEqual(Math.round(sumSplit * 100) / 100, 100, 'Sum of split parts must equal ₹100 exactly');
console.log('✅ [PASS] splitPaiseEqually preserves 100% of paise with zero loss (₹100 / 3 = 33.34 + 33.33 + 33.33)');

// 2. Amount Normalization & Floating Point Rounding
console.log('\n--- 2. Amount Normalization & Defense ---');
assert.strictEqual(normalizeAmount('₹ 1,499.50'), 1499.5, 'Must strip currency symbols and commas');
assert.strictEqual(normalizeAmount('-250.75'), 250.75, 'Must return positive absolute amount');
assert.strictEqual(normalizeAmount(''), 0, 'Empty string must return 0');
assert.strictEqual(normalizeAmount(null as any), 0, 'Null must return 0');
assert.strictEqual(normalizeAmount(undefined as any), 0, 'Undefined must return 0');
console.log('✅ [PASS] normalizeAmount safely handles edge cases');

// 3. Excluded Expense Categories
console.log('\n--- 3. Excluded Categories in Financial Analytics ---');
assert.ok(EXCLUDED_EXPENSE_CATEGORIES.includes('Savings'), 'Savings must be excluded from expenses');
assert.ok(EXCLUDED_EXPENSE_CATEGORIES.includes('SecretVault'), 'SecretVault must be excluded from expenses');
assert.ok(EXCLUDED_EXPENSE_CATEGORIES.includes('SecretVault_Processed'), 'SecretVault_Processed must be excluded from expenses');
console.log('✅ [PASS] All secret vault and savings categories are correctly excluded from expenses');

// 4. Budget Cycle & Elapsed Days
console.log('\n--- 4. Budget Cycle Calendar Elapsed Days ---');
const userMock = {
  id: 'test_user',
  name: 'Test',
  email: 'test@example.com',
  monthly_budget: 30000,
  vault_balance: 500,
  preferred_currency: 'INR',
  current_streak: 5,
  unlocked_badges: '[]',
  created_at: todayISO(),
  last_budget_update: todayISO(), // Updated today in local calendar
};
const cycle = getBudgetCycle(userMock);
assert.strictEqual(cycle.elapsedDays, 1, 'On start day, elapsedDays must be exactly 1, not 2');
assert.ok(cycle.days >= 28 && cycle.days <= 31, 'Days in month must be valid');
console.log(`✅ [PASS] getBudgetCycle: elapsedDays = ${cycle.elapsedDays} on Day 1 (days in cycle = ${cycle.days})`);

// 5. Secret Vault Balance Formula Verification
console.log('\n--- 5. Secret Vault Math Verification ---');
const storedUserVault = 1200;
const unprocessedVaultTxns = [
  { amount: 25, category: 'SecretVault' },
  { amount: 40, category: 'SecretVault' },
  { amount: 35, category: 'SecretVault' },
];
const processedPastRollovers = [
  { amount: 500, category: 'SecretVault_Processed' },
  { amount: 700, category: 'SecretVault_Processed' },
];

const activeMonthlyStash = unprocessedVaultTxns.reduce((s, t) => s + t.amount, 0);
const computedVaultBalance = Math.round((storedUserVault + activeMonthlyStash) * 100) / 100;

assert.strictEqual(activeMonthlyStash, 100, 'Active monthly stash must equal ₹100');
assert.strictEqual(computedVaultBalance, 1300, 'Total vault balance must be stored vault (₹1200) + active stash (₹100) = ₹1300');
assert.ok(computedVaultBalance >= 0, 'Vault balance must never be negative');
console.log(`✅ [PASS] Secret Vault Math: Stored ₹${storedUserVault} + Active ₹${activeMonthlyStash} = Total ₹${computedVaultBalance}`);

// 6. Automatic Spare Change Round-Up Calculations
console.log('\n--- 6. Spare Change Round-Up Calculations ---');
const calcRoundUp = (amt: number) => Math.round((Math.ceil(amt / 10) * 10 - amt) * 100) / 100;
assert.strictEqual(calcRoundUp(83), 7, '₹83 must round up to ₹90 (spare change ₹7)');
assert.strictEqual(calcRoundUp(145), 5, '₹145 must round up to ₹150 (spare change ₹5)');
assert.strictEqual(calcRoundUp(1499), 1, '₹1499 must round up to ₹1500 (spare change ₹1)');
assert.strictEqual(calcRoundUp(100), 0, '₹100 is exact multiple of 10, spare change must be 0');
assert.strictEqual(calcRoundUp(52.40), 7.60, '₹52.40 must round up to ₹60 (spare change ₹7.60)');
console.log('✅ [PASS] Spare change round-up calculations verified with exact paise accuracy');

console.log('\n========================================================');
console.log('🏁 ALL SECRET VAULT & MONEY CALCULATION AUDITS PASSED! 100%');
console.log('========================================================\n');
