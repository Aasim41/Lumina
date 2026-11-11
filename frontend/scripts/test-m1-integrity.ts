import { generateQrDataUrl } from '../src/lib/qr.ts';
import { formatLocalDate, formatDate, formatMonth } from '../src/lib/utils.ts';
import { todayISO } from '../src/lib/db.ts';
import { normalizeBankDate, parseCSV } from '../src/lib/csvParser.ts';
import { csvEscape } from '../src/lib/dataBackup.ts';

let passedCount = 0;

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ [FAIL] ${message}`);
    process.exit(1);
  }
  passedCount++;
  console.log(`✅ [PASS] ${message}`);
}

async function runTests() {
  console.log('\n========================================================');
  console.log('🚀 RUNNING MILESTONE 1 INTEGRITY VERIFICATION SUITE');
  console.log('========================================================\n');

  // ── 1. Feature 1: Offline QR Generator ────────────────────────────
  console.log('--- Feature 1: Offline QR Generation ---');
  const qrUrl = await generateQrDataUrl('upi://pay?pa=test@okaxis&pn=Merchant&am=250', 200);
  assert(qrUrl.startsWith('data:image/png;base64,'), 'generateQrDataUrl outputs PNG Data URL');
  const emptyQr = await generateQrDataUrl('');
  assert(emptyQr === '', 'generateQrDataUrl handles empty string gracefully');

  // ── 2. Feature 2: Timezone-Safe Date Math ─────────────────────────
  console.log('\n--- Feature 2: Timezone-Safe Date Math ---');
  const d1 = new Date(2026, 10, 1); // 1st Nov 2026 local
  const formattedLocal = formatLocalDate(d1);
  assert(formattedLocal === '2026-11-01', 'formatLocalDate preserves local 1st of month (no off-by-one shift)');

  const endOfMonth = new Date(2026, 11, 0); // Last day of Nov 2026 (Nov 30)
  assert(formatLocalDate(endOfMonth) === '2026-11-30', 'formatLocalDate preserves local last day of month');

  const todayStr = todayISO();
  assert(/^\d{4}-\d{2}-\d{2}$/.test(todayStr), `todayISO returns valid YYYY-MM-DD: ${todayStr}`);
  assert(todayStr === formatLocalDate(new Date()), 'todayISO matches local formatLocalDate(new Date())');

  // ── 3. Feature 3: Bank Statement Date & CSV Parsing ───────────────
  console.log('\n--- Feature 3: Bank Statement Date & CSV Parsing ---');
  assert(normalizeBankDate('15/08/2024') === '2024-08-15', 'normalizeBankDate: Indian DD/MM/YYYY (Day > 12)');
  assert(normalizeBankDate('05/08/2024') === '2024-08-05', 'normalizeBankDate: Indian DD/MM/YYYY (Day <= 12 no month swap)');
  assert(normalizeBankDate('15-08-2024') === '2024-08-15', 'normalizeBankDate: Indian DD-MM-YYYY');
  assert(normalizeBankDate('15.08.2024') === '2024-08-15', 'normalizeBankDate: Indian DD.MM.YYYY');
  assert(normalizeBankDate('15/08/24') === '2024-08-15', 'normalizeBankDate: Indian 2-digit year DD/MM/YY');
  assert(normalizeBankDate('15-Aug-2024') === '2024-08-15', 'normalizeBankDate: Named month DD-MMM-YYYY');
  assert(normalizeBankDate('15-AUG-24') === '2024-08-15', 'normalizeBankDate: Named month 2-digit year');
  assert(normalizeBankDate('2024-08-15') === '2024-08-15', 'normalizeBankDate: ISO YYYY-MM-DD');
  assert(normalizeBankDate('15/08/2024 14:32:00') === '2024-08-15', 'normalizeBankDate: DD/MM/YYYY with trailing timestamp');
  assert(normalizeBankDate('invalid-date') === null, 'normalizeBankDate: Invalid date returns null');
  assert(normalizeBankDate('') === null, 'normalizeBankDate: Empty string returns null');

  // CSV dual debit/credit test
  const sampleDualCsv = `Txn Date,Description,Withdrawal Amt.,Deposit Amt.
15/08/2024,Swiggy Bangalore,450.00,
16/08/2024,Salary Credit,,75000.00
17/08/2024,Uber Ride,220.50,`;

  const parsedDual = await parseCSV(sampleDualCsv);
  assert(parsedDual.length === 3, `parseCSV parsed 3 rows from dual debit/credit CSV (got ${parsedDual.length})`);
  assert(parsedDual[0].date === '2024-08-15', 'Dual CSV row 0 date is 2024-08-15');
  assert(parsedDual[0].amount === 450, 'Dual CSV row 0 debit amount is 450');
  assert(parsedDual[0].type === 'debit', 'Dual CSV row 0 type is debit');
  assert(parsedDual[1].date === '2024-08-16', 'Dual CSV row 1 date is 2024-08-16');
  assert(parsedDual[1].amount === 75000, 'Dual CSV row 1 credit amount is 75000');
  assert(parsedDual[1].type === 'credit', 'Dual CSV row 1 type is credit');

  // ── 4. Feature 4: Defensive Date Formatting ───────────────────────
  console.log('\n--- Feature 4: Defensive Date Formatting ---');
  assert(formatDate(null) === 'N/A', 'formatDate(null) returns "N/A"');
  assert(formatDate(undefined) === 'N/A', 'formatDate(undefined) returns "N/A"');
  assert(formatDate('') === 'N/A', 'formatDate("") returns "N/A"');
  assert(formatDate('   ') === 'N/A', 'formatDate whitespace returns "N/A"');
  assert(formatDate('invalid-date-string') === 'N/A', 'formatDate invalid string returns "N/A"');
  assert(formatDate('2026-03-15') === 'Mar 15, 2026', 'formatDate YYYY-MM-DD renders Mar 15, 2026 in UTC');

  assert(formatMonth(null) === '', 'formatMonth(null) returns ""');
  assert(formatMonth(undefined) === '', 'formatMonth(undefined) returns ""');
  assert(formatMonth('') === '', 'formatMonth("") returns ""');
  assert(formatMonth('2026-03') === 'Mar 2026', 'formatMonth("2026-03") returns "Mar 2026"');
  assert(formatMonth('invalid') === 'invalid', 'formatMonth("invalid") returns fallback "invalid"');

  // ── 5. Feature 7: csvEscape ───────────────────────────────────────
  console.log('\n--- Feature 7: csvEscape RFC 4180 Escaping ---');
  assert(csvEscape(undefined) === '""', 'csvEscape(undefined) returns \'""\'');
  assert(csvEscape(null) === '""', 'csvEscape(null) returns \'""\'');
  assert(csvEscape('') === '', 'csvEscape("") returns \'\'');
  assert(csvEscape('Swiggy') === 'Swiggy', 'csvEscape plain text returns unquoted');
  assert(csvEscape('Swiggy, India') === '"Swiggy, India"', 'csvEscape comma quoted');
  assert(csvEscape('Said "Hello"') === '"Said ""Hello"""', 'csvEscape double quotes escaped');
  assert(csvEscape('Line1\nLine2') === '"Line1\nLine2"', 'csvEscape newline quoted');
  assert(csvEscape('Carriage\rReturn') === '"Carriage\rReturn"', 'csvEscape CR quoted');
  assert(csvEscape(500) === '500', 'csvEscape number returns stringified');

  console.log('\n========================================================');
  console.log(`🏁 TEST RESULTS: ${passedCount} PASSED, 0 FAILED (TOTAL: ${passedCount})`);
  console.log('========================================================\n');
}

runTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
