/**
 * Tier 2: Boundary & Corner Cases Test Suite
 * Lumina Smart Expense Automated Test Matrix
 * 
 * Domains:
 * 1. Null, undefined, empty, and whitespace input resilience
 * 2. Zero, negative, and extreme financial amounts (e.g. ₹10 Crore)
 * 3. Leap years, month boundaries, and year transitions
 * 4. UPI protocol edge cases, raw inputs, and invalid formats
 * 5. Non-transactional SMS rejection (OTPs, promotional spam, bill reminders)
 */

import { cleanMerchantName, normalizeAmount } from '../src/lib/cleaner.ts';
import { parseCsvDate } from '../src/lib/csvParser.ts';
import { formatDate, formatMonth, formatCurrency } from '../src/lib/utils.ts';
import { toPaise, fromPaise, splitPaiseEqually } from '../src/lib/db.ts';
import { validateVpa, parseUpiUri, buildUpiUri } from '../src/lib/upi.ts';
import { parseSMS } from '../src/lib/smsParser.ts';

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

async function runTier2Tests() {
  console.log('\n========================================================');
  console.log('🚀 RUNNING TIER 2: BOUNDARY & CORNER CASES TEST MATRIX');
  console.log('========================================================\n');

  // ── 1. Null, Undefined, Empty & Whitespace Input Resilience ──────────
  console.log('--- 1. Null, Empty & Whitespace Inputs ---');

  assert(cleanMerchantName(null as any) === 'Unknown', 'cleanMerchantName: Handles null argument');
  assert(cleanMerchantName(undefined as any) === 'Unknown', 'cleanMerchantName: Handles undefined argument');
  assert(cleanMerchantName('') === '', 'cleanMerchantName: Empty string returns empty string');
  assert(cleanMerchantName('   \t\n   ') === '', 'cleanMerchantName: Whitespace-only string returns trimmed empty');
  assert(cleanMerchantName('SWIGGY_BLR-1234') === 'Swiggy Blr', 'cleanMerchantName: Strips trailing counter numbers and underscores');

  assert(normalizeAmount(null as any) === 0, 'normalizeAmount: Handles null argument');
  assert(normalizeAmount(undefined as any) === 0, 'normalizeAmount: Handles undefined argument');
  assert(normalizeAmount('') === 0, 'normalizeAmount: Empty string returns 0');
  assert(normalizeAmount('   ') === 0, 'normalizeAmount: Whitespace string returns 0');
  assert(normalizeAmount('NaN') === 0, 'normalizeAmount: String "NaN" returns 0');
  assert(normalizeAmount('FREE') === 0, 'normalizeAmount: Non-numeric text returns 0');

  assert(parseCsvDate('') === null, 'parseCsvDate: Empty string returns null');
  assert(parseCsvDate('   ') === null, 'parseCsvDate: Whitespace-only string returns null');
  assert(parseCsvDate(null as any) === null, 'parseCsvDate: Null argument returns null');
  assert(parseCsvDate(undefined as any) === null, 'parseCsvDate: Undefined argument returns null');

  assert(formatDate(null) === 'N/A', 'formatDate: Null returns N/A');
  assert(formatDate('') === 'N/A', 'formatDate: Empty string returns N/A');
  assert(formatDate('not-a-date-at-all') === 'not-a-date-at-all' || formatDate('not-a-date-at-all') === 'N/A', 'formatDate: Corrupted string does not throw');

  assert(formatMonth(null) === '', 'formatMonth: Null returns empty');
  assert(formatMonth('') === '', 'formatMonth: Empty string returns empty');
  assert(formatMonth('gibberish') === 'gibberish', 'formatMonth: Invalid string returned as-is');

  // ── 2. Zero, Negative & Extreme Currency Values ──────────────────────
  console.log('\n--- 2. Zero, Negative & Extreme Financial Amounts ---');

  assert(normalizeAmount(0) === 0, 'normalizeAmount: Numeric 0 returns 0');
  assert(normalizeAmount(-450) === 450, 'normalizeAmount: Negative number converts to absolute magnitude');
  assert(normalizeAmount('-₹ 1,500.50') === 1500.5, 'normalizeAmount: Negative currency string normalized to positive float');
  assert(normalizeAmount('₹ 10,00,00,000') === 100000000, 'normalizeAmount: Extreme amount (₹10 Crore) parsed accurately');

  assert(toPaise(0) === 0, 'toPaise: ₹0 converts to 0 paise');
  assert(fromPaise(0) === 0, 'fromPaise: 0 paise converts to ₹0');
  assert(toPaise(100000000) === 10000000000, 'toPaise: ₹10 Crore converts to 10 billion paise without precision truncation');
  assert(fromPaise(10000000000) === 100000000, 'fromPaise: 10 billion paise converts back to ₹10 Crore');

  assert(splitPaiseEqually(100, 0).length === 0, 'splitPaiseEqually: Count 0 returns empty array without divide-by-zero error');
  assert(splitPaiseEqually(100, -3).length === 0, 'splitPaiseEqually: Negative count returns empty array');
  const zeroSplits = splitPaiseEqually(0, 5);
  assert(zeroSplits.length === 5 && zeroSplits.every(v => v === 0), 'splitPaiseEqually: ₹0 split among 5 yields all zeroes');

  const extremeSplit = splitPaiseEqually(10000000, 3);
  const extremeSum = extremeSplit.reduce((acc, v) => acc + toPaise(v), 0);
  assert(extremeSum === toPaise(10000000), 'splitPaiseEqually: ₹1 Crore split among 3 preserves 100% paise sum');

  const formattedZero = formatCurrency(0);
  assert(formattedZero.includes('0'), 'formatCurrency: Zero formats properly');
  const formattedCrore = formatCurrency(100000000);
  assert(formattedCrore.includes('10,00,00,000'), 'formatCurrency: Formats ₹10 Crore with Indian number formatting');

  // ── 3. Leap Years & Month Boundary Transitions ───────────────────────
  console.log('\n--- 3. Leap Years, Month Boundaries & Date Arithmetic ---');

  assert(parseCsvDate('29/02/2024') === '2024-02-29', 'Leap Year: Parses Feb 29 on leap year 2024');
  assert(parseCsvDate('29-02-2020') === '2020-02-29', 'Leap Year: Parses Feb 29 on leap year 2020');
  assert(parseCsvDate('31/12/2024') === '2024-12-31', 'Year End: Dec 31 boundary parsed');
  assert(parseCsvDate('01/01/2025') === '2025-01-01', 'Year Start: Jan 1 boundary parsed');
  assert(parseCsvDate('30/04/2024') === '2024-04-30', 'Month Boundary: 30-day month (April 30)');
  assert(parseCsvDate('31/07/2024') === '2024-07-31', 'Month Boundary: 31-day month (July 31)');
  assert(parseCsvDate('32/01/2024') === null, 'Date Validation: Rejects invalid day 32');
  assert(parseCsvDate('15/13/2024') === null, 'Date Validation: Rejects invalid month 13');
  assert(parseCsvDate('99/99/9999') === null, 'Date Validation: Rejects corrupted date 99/99/9999');

  // ── 4. UPI Protocol Boundaries & Edge Cases ──────────────────────────
  console.log('\n--- 4. UPI Protocol Boundaries & VPA Validation ---');

  assert(validateVpa('') === false, 'validateVpa: Empty string is invalid');
  assert(validateVpa('   ') === false, 'validateVpa: Whitespace is invalid');
  assert(validateVpa(null as any) === false, 'validateVpa: Null is invalid');
  assert(validateVpa(undefined as any) === false, 'validateVpa: Undefined is invalid');
  assert(validateVpa('user@') === false, 'validateVpa: Missing PSP handle is invalid');
  assert(validateVpa('@okaxis') === false, 'validateVpa: Missing username is invalid');
  assert(validateVpa('user@@bank') === false, 'validateVpa: Double @ is invalid');
  assert(validateVpa('user name@okhdfcbank') === false, 'validateVpa: Space in username is invalid');
  assert(validateVpa('user@bank') === true, 'validateVpa: Standard VPA is valid');
  assert(validateVpa('9876543210@paytm') === true, 'validateVpa: Phone number VPA is valid');
  assert(validateVpa('merchant.store-1@icici') === true, 'validateVpa: Dot and hyphen in username is valid');

  assert(parseUpiUri('') === null, 'parseUpiUri: Empty URI returns null');
  assert(parseUpiUri('   ') === null, 'parseUpiUri: Whitespace URI returns null');
  assert(parseUpiUri('https://example.com') === null, 'parseUpiUri: HTTP URL returns null');
  assert(parseUpiUri('upi://') === null, 'parseUpiUri: Empty upi:// scheme returns null');
  assert(parseUpiUri('upi://pay') === null, 'parseUpiUri: Missing pa parameter returns null');

  // URI encoding spaces with %20 instead of +
  const builtUri = buildUpiUri({
    pa: 'friend@upi',
    pn: 'First Middle Last',
    am: 500,
    tn: 'Dinner & Drinks',
  });
  assert(builtUri.includes('pn=First%20Middle%20Last'), 'buildUpiUri: Encodes spaces with %20, not + signs');
  assert(builtUri.includes('am=500'), 'buildUpiUri: Formats integer amount without .00');
  assert(!builtUri.includes('mode=00'), 'buildUpiUri: Does NOT inject artificial mode=00 on peer payments');

  // ── 5. Non-Transactional SMS & Spam Rejection ────────────────────────
  console.log('\n--- 5. Non-Transactional SMS Rejection ---');

  const otp1 = parseSMS('Your OTP for txn of Rs 1,499.00 at Flipkart is 837492. Do not share this OTP with anyone.', 'VM-HDFCBK');
  assert(otp1 === null, 'Reject OTP: Transaction authorization OTP with amount rejected');

  const otp2 = parseSMS('SBI Card: 482910 is your OTP for transaction of INR 450.00 at Swiggy. Valid for 5 mins.', 'AD-SBICRD');
  assert(otp2 === null, 'Reject OTP: Card OTP containing merchant and amount rejected');

  const aadhaarOtp = parseSMS('192837 is your OTP for Aadhaar online authentication. UIDAI never calls for OTP.', 'VM-AADHAR');
  assert(aadhaarOtp === null, 'Reject OTP: Aadhaar verification OTP rejected');

  const loanSpam = parseSMS('Dear Customer, you are eligible for an INSTANT Pre-Approved Personal Loan of Rs. 5,00,000 at 10.5% interest. Apply now at bit.ly/easyloan', 'VK-LOANS');
  assert(loanSpam === null, 'Reject Spam: Promotional loan offer with Rs. 5,00,000 rejected');

  const limitOffer = parseSMS('Axis Bank: Great news! Your credit limit on card ending 4321 is upgraded from Rs 1,20,000 to Rs 2,50,000. Send LIMIT to 567678 to accept.', 'BZ-AXISBK');
  assert(limitOffer === null, 'Reject Spam: Credit limit enhancement offer rejected');

  const billReminder = parseSMS('Reminder: Your Tata Play DTH recharge of Rs. 499 is due tomorrow. Pay now to avoid deactivation.', 'JD-TATAPL');
  assert(billReminder === null, 'Reject Reminder: Future bill reminder notice rejected');

  const emptySms = parseSMS('', 'UNKNOWN');
  assert(emptySms === null, 'Reject Empty: Empty SMS string rejected');

  const whitespaceSms = parseSMS('   \n\t   ', 'UNKNOWN');
  assert(whitespaceSms === null, 'Reject Whitespace: Whitespace-only SMS string rejected');

  console.log('\n========================================================');
  console.log(`🏁 TIER 2 RESULTS: ${passed} PASSED, ${failed} FAILED (TOTAL: ${passed + failed})`);
  console.log('========================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTier2Tests().catch(err => {
  console.error('Fatal error running Tier 2 tests:', err);
  process.exit(1);
});
