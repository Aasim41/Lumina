/**
 * Tier 1: Feature Coverage Test Suite
 * Lumina Smart Expense Automated Test Matrix
 * 
 * Domains:
 * 1. Bank CSV date parsing (DD/MM/YYYY, DD-MM-YYYY, ISO, named months)
 * 2. Defensive date/month utilities (null/undefined/empty/invalid handling)
 * 3. Offline QR code SVG generation (100% client-side, zero network calls)
 * 4. Exact integer paise splitting & arithmetic
 * 5. Category budget aggregation & spend tracking
 * 6. Investment valuation & default fallbacks
 */

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { QRCodeSVG } from 'qrcode.react';

import { parseCsvDate } from '../src/lib/csvParser.ts';
import { formatDate, formatMonth, formatCurrency } from '../src/lib/utils.ts';
import { db, toPaise, fromPaise, splitPaiseEqually, nowISO, todayISO, generateId } from '../src/lib/db.ts';
import { computeSpentThisMonth, syncRollover } from '../src/lib/analytics.ts';
import { createCategoryBudget, getCategoryBudgets, createInvestment, getInvestments } from '../src/lib/api.ts';

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

async function runTier1Tests() {
  console.log('\n========================================================');
  console.log('🚀 RUNNING TIER 1: FEATURE COVERAGE TEST MATRIX');
  console.log('========================================================\n');

  // Reset Dexie tables for clean test state
  await db.transactions.clear();
  await db.categoryBudgets.clear();
  await db.investments.clear();
  await db.users.clear();

  // Create base user for API context
  await db.users.add({
    id: 'test-user-1',
    name: 'Test User',
    email: 'test@lumina.local',
    monthly_budget: 50000,
    vault_balance: 0,
    preferred_currency: 'INR',
    current_streak: 0,
    unlocked_badges: '[]',
    created_at: nowISO(),
  });

  // ── 1. Bank CSV Date Parsing ─────────────────────────────────────────
  console.log('\n--- 1. Bank Statement CSV Date Parsing ---');
  
  assert(parseCsvDate('2024-05-18') === '2024-05-18', 'CSV Date: Standard ISO YYYY-MM-DD');
  assert(parseCsvDate('2023/11/04') === '2023-11-04', 'CSV Date: ISO with forward slash YYYY/MM/DD');
  assert(parseCsvDate('2024.01.20') === '2024-01-20', 'CSV Date: ISO with dot YYYY.MM.DD');
  assert(parseCsvDate('28/02/2024') === '2024-02-28', 'CSV Date: Indian bank DD/MM/YYYY');
  assert(parseCsvDate('15-08-2024') === '2024-08-15', 'CSV Date: Indian bank DD-MM-YYYY');
  assert(parseCsvDate('01.12.2023') === '2023-12-01', 'CSV Date: Indian bank DD.MM.YYYY');
  assert(parseCsvDate('05/09/24') === '2024-09-05', 'CSV Date: 2-digit year Indian format DD/MM/YY');
  assert(parseCsvDate('3/7/2024') === '2024-07-03', 'CSV Date: Single-digit day and month D/M/YYYY');
  assert(parseCsvDate('15-Aug-2024') === '2024-08-15', 'CSV Date: Named month DD-MMM-YYYY');
  assert(parseCsvDate('05 Sep 2023') === '2023-09-05', 'CSV Date: Named month with spaces DD MMM YYYY');
  assert(parseCsvDate('24/10/2024 16:45:10') === '2024-10-24', 'CSV Date: Date with trailing timestamp');

  // ── 2. Defensive Date & Month Utilities ──────────────────────────────
  console.log('\n--- 2. Defensive Date & Month Utilities ---');

  assert(formatDate(null) === 'N/A', 'formatDate: Handles null safely');
  assert(formatDate(undefined) === 'N/A', 'formatDate: Handles undefined safely');
  assert(formatDate('') === 'N/A', 'formatDate: Handles empty string safely');
  assert(formatDate('invalid-date') === 'invalid-date', 'formatDate: Non-date string returns original without throwing');
  const formattedIso = formatDate('2024-03-25');
  assert(formattedIso.includes('2024') && formattedIso.includes('25'), 'formatDate: Valid ISO date formatted properly', `Got: ${formattedIso}`);

  assert(formatMonth(null) === 'N/A', 'formatMonth: Handles null safely');
  assert(formatMonth(undefined) === 'N/A', 'formatMonth: Handles undefined safely');
  assert(formatMonth('') === 'N/A', 'formatMonth: Handles empty string safely');
  assert(formatMonth('non-month-value') === 'non-month-value', 'formatMonth: Invalid string returns original without throwing');
  assert(formatMonth('2024-15') === '2024-15', 'formatMonth: Out-of-bounds month (>12) returns original string');
  assert(formatMonth('2024-06') === 'Jun 2024', 'formatMonth: Valid YYYY-MM produces Jun 2024');
  assert(formatMonth('2024-12') === 'Dec 2024', 'formatMonth: Valid YYYY-MM produces Dec 2024');

  // ── 3. Offline QR Code Generation ────────────────────────────────────
  console.log('\n--- 3. Offline QR Code SVG Generation ---');

  const upiUri = 'upi://pay?pa=merchant@upi&pn=Merchant%20Store&am=250.00&cu=INR';
  const qrSvg = renderToStaticMarkup(
    React.createElement(QRCodeSVG, {
      value: upiUri,
      size: 192,
      level: 'M',
      includeMargin: false,
    })
  );

  assert(typeof qrSvg === 'string' && qrSvg.length > 100, 'QR Generator: Produces non-empty SVG markup offline');
  assert(qrSvg.startsWith('<svg') && qrSvg.endsWith('</svg>'), 'QR Generator: Output has valid <svg> container');
  assert(qrSvg.includes('<path') || qrSvg.includes('<rect'), 'QR Generator: Output contains QR matrix path/rect elements');
  assert(qrSvg.includes('width="192"') && qrSvg.includes('height="192"'), 'QR Generator: Reflects custom dimensions (192x192)');

  const largeQrSvg = renderToStaticMarkup(
    React.createElement(QRCodeSVG, {
      value: 'upi://pay?pa=user@okhdfcbank&pn=Lumina%20User&am=12500.50&tn=Project%20Expense%20Reimbursement&mc=5411',
      size: 256,
      level: 'H',
    })
  );
  assert(largeQrSvg.includes('width="256"') && largeQrSvg.includes('height="256"'), 'QR Generator: High error-correction 256x256 SVG rendered');

  // ── 4. Exact Currency & Integer Paise Splitting ───────────────────────
  console.log('\n--- 4. Exact Integer Paise Math ---');

  assert(toPaise(100) === 10000, 'toPaise: ₹100 converts to 10000 paise');
  assert(toPaise(49.99) === 4999, 'toPaise: ₹49.99 converts to 4999 paise');
  assert(toPaise(0.01) === 1, 'toPaise: ₹0.01 converts to 1 paisa');
  assert(fromPaise(10000) === 100, 'fromPaise: 10000 paise converts to ₹100');
  assert(fromPaise(4999) === 49.99, 'fromPaise: 4999 paise converts to ₹49.99');

  // Split ₹100 among 3 people -> 33.34, 33.33, 33.33 (sum strictly 100.00)
  const split3 = splitPaiseEqually(100, 3);
  assert(split3.length === 3, 'splitPaiseEqually: 3 shares generated');
  assert(split3[0] === 33.34 && split3[1] === 33.33 && split3[2] === 33.33, 'splitPaiseEqually: Distributes 1 paisa remainder to first person');
  const sum3 = split3.reduce((acc, v) => acc + v, 0);
  assert(Math.round(sum3 * 100) === 10000, 'splitPaiseEqually: Sum of 3 shares equals exactly 100.00');

  // Split ₹10 among 4 people -> 2.50 each
  const split4 = splitPaiseEqually(10, 4);
  assert(split4.every(v => v === 2.5), 'splitPaiseEqually: Clean division ₹10 / 4 = ₹2.50 each');

  // Split ₹0.05 among 2 people -> 0.03, 0.02
  const split5 = splitPaiseEqually(0.05, 2);
  assert(split5[0] === 0.03 && split5[1] === 0.02, 'splitPaiseEqually: Micro-amount ₹0.05 split into 3p and 2p');

  // Large split ₹12,345.67 among 7 people
  const split7 = splitPaiseEqually(12345.67, 7);
  const sum7 = split7.reduce((acc, v) => acc + toPaise(v), 0);
  assert(sum7 === toPaise(12345.67), 'splitPaiseEqually: Large split ₹12,345.67 / 7 preserves total paise exactly');

  // Single person split
  const split1 = splitPaiseEqually(500, 1);
  assert(split1.length === 1 && split1[0] === 500, 'splitPaiseEqually: 1 person receives 100% share');

  // ── 5. Category Budget Aggregation & Spend Tracking ──────────────────
  console.log('\n--- 5. Category Budget Calculations ---');

  const today = new Date();
  const currentMonthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  const currentDate = `${currentMonthStr}-10`;
  const prevMonthDate = '2023-01-15';

  // Seed sample transactions
  await db.transactions.bulkAdd([
    {
      id: generateId(),
      date: currentDate,
      merchant_raw: 'Swiggy',
      merchant_clean: 'Swiggy',
      amount: 450,
      category: 'Food & Dining',
      type: 'debit',
      source: 'manual_entry',
      currency: 'INR',
      created_at: nowISO(),
    },
    {
      id: generateId(),
      date: currentDate,
      merchant_raw: 'Zomato',
      merchant_clean: 'Zomato',
      amount: 550,
      category: 'Food & Dining',
      type: 'debit',
      source: 'manual_entry',
      currency: 'INR',
      created_at: nowISO(),
    },
    {
      id: generateId(),
      date: currentDate,
      merchant_raw: 'Uber',
      merchant_clean: 'Uber',
      amount: 300,
      category: 'Transport',
      type: 'debit',
      source: 'manual_entry',
      currency: 'INR',
      created_at: nowISO(),
    },
    {
      id: generateId(),
      date: prevMonthDate,
      merchant_raw: 'Old Dinner',
      merchant_clean: 'Old Dinner',
      amount: 1000,
      category: 'Food & Dining',
      type: 'debit',
      source: 'manual_entry',
      currency: 'INR',
      created_at: nowISO(),
    },
    {
      id: generateId(),
      date: currentDate,
      merchant_raw: 'Food Refund',
      merchant_clean: 'Food Refund',
      amount: 200,
      category: 'Food & Dining',
      type: 'credit',
      source: 'manual_entry',
      currency: 'INR',
      created_at: nowISO(),
    },
  ]);

  const spentFood = await computeSpentThisMonth('Food & Dining');
  assert(spentFood === 1000, 'computeSpentThisMonth: Correctly sums ₹450 + ₹550 = ₹1000 for current month', `Got: ${spentFood}`);

  const spentTransport = await computeSpentThisMonth('Transport');
  assert(spentTransport === 300, 'computeSpentThisMonth: Transport spend isolated at ₹300', `Got: ${spentTransport}`);

  const spentShopping = await computeSpentThisMonth('Shopping');
  assert(spentShopping === 0, 'computeSpentThisMonth: Category with no spend returns 0');

  // Create category budget and verify getCategoryBudgets aggregation
  const budgetRecord = await createCategoryBudget({ category: 'Food & Dining', amount: 5000 });
  assert(budgetRecord.category === 'Food & Dining' && budgetRecord.amount === 5000, 'createCategoryBudget: Budget created with amount ₹5000');
  assert(budgetRecord.spent_this_month === 1000, 'createCategoryBudget: Returns current month spent');

  const allBudgets = await getCategoryBudgets();
  const foodBudget = allBudgets.find(b => b.category === 'Food & Dining');
  assert(!!foodBudget && foodBudget.spent_this_month === 1000, 'getCategoryBudgets: Returns list with aggregated spend');

  // ── 6. Investment Valuation Fallbacks ─────────────────────────────────
  console.log('\n--- 6. Investment Valuation & Fallbacks ---');

  const newInvestment = await createInvestment({
    name: 'NIFTY 50 Index Fund',
    ticker: 'NIFTYBEES',
    asset_class: 'Mutual Funds',
    quantity: 50,
    average_buy_price: 240,
    invested_amount: 12000,
  });

  assert(newInvestment.name === 'NIFTY 50 Index Fund', 'createInvestment: Investment record created');
  assert(newInvestment.invested_amount === 12000, 'createInvestment: Invested amount preserved');

  const investmentsList = await getInvestments();
  assert(investmentsList.length >= 1, 'getInvestments: Fetches persisted investments array');
  const persisted = investmentsList.find(i => i.name === 'NIFTY 50 Index Fund');
  assert(persisted?.current_value === null || persisted?.current_value === undefined, 'getInvestments: Safely defaults unquoted current_value without crashing');

  // Format currency check
  const currZero = formatCurrency(0);
  assert(currZero.includes('0'), 'formatCurrency: Formats ₹0 correctly');
  const currLakh = formatCurrency(150000);
  assert(currLakh.includes('1,50,000'), 'formatCurrency: Formats ₹1,50,000 with Indian numbering');

  console.log('\n========================================================');
  console.log(`🏁 TIER 1 RESULTS: ${passed} PASSED, ${failed} FAILED (TOTAL: ${passed + failed})`);
  console.log('========================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTier1Tests().catch(err => {
  console.error('Fatal error running Tier 1 tests:', err);
  process.exit(1);
});
