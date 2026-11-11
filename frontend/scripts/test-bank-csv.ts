import { normalizeBankDate, parseCSV } from '../src/lib/csvParser.ts';

let passedCount = 0;

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ [FAIL] ${message}`);
    process.exit(1);
  }
  passedCount++;
  console.log(`✅ [PASS] ${message}`);
}

async function runBankCsvTests() {
  console.log('\n========================================================');
  console.log('🏦 TESTING REAL-WORLD INDIAN BANK STATEMENT CSV PARSING');
  console.log('========================================================\n');

  // Test 1: SBI Statement Format (DD/MM/YYYY, Txn Date, Description, Debit, Credit)
  console.log('--- Bank 1: State Bank of India (SBI) ---');
  const sbiCsv = `Txn Date,Value Date,Description,Ref No./Cheque No.,Debit,Credit,Balance
01/10/2024,01/10/2024,UPI/CR/427519827391/SWIGGY/ICIC/swiggy@icici,TRANSFER TO,340.00,,45210.50
05/10/2024,05/10/2024,BY TRANSFER/NEFT*N123456789*SALARY,TRANSFER FROM,,85000.00,130210.50
18/10/2024,18/10/2024,ATM WDL-ATM KORAMANGALA BLR,CASH WITHDRAWAL,2000.00,,128210.50`;

  const sbiParsed = await parseCSV(sbiCsv);
  assert(sbiParsed.length === 3, 'SBI: Parsed 3 transactions');
  assert(sbiParsed[0].date === '2024-10-01', 'SBI: Row 0 date 2024-10-01');
  assert(sbiParsed[0].amount === 340, 'SBI: Row 0 amount 340');
  assert(sbiParsed[0].type === 'debit', 'SBI: Row 0 type debit');
  assert(sbiParsed[1].date === '2024-10-05', 'SBI: Row 1 date 2024-10-05');
  assert(sbiParsed[1].amount === 85000, 'SBI: Row 1 amount 85000');
  assert(sbiParsed[1].type === 'credit', 'SBI: Row 1 type credit');
  assert(sbiParsed[2].date === '2024-10-18', 'SBI: Row 2 date 2024-10-18');
  assert(sbiParsed[2].amount === 2000, 'SBI: Row 2 amount 2000');

  // Test 2: HDFC Bank Statement Format (DD/MM/YYYY, Narration, Withdrawal Amount, Deposit Amount)
  console.log('\n--- Bank 2: HDFC Bank ---');
  const hdfcCsv = `Date,Narration,Chq./Ref.No.,Value Dt,Withdrawal Amt.,Deposit Amt.,Closing Balance
12/09/2024,UPI-ZOMATO-PAY-1234@HDFC-UTIB0001234,425612345678,12/09/2024,450.00,,62300.00
15/09/2024,ACH CR-MUTUAL FUND DIVIDEND-DIV123,000000000000,15/09/2024,,1250.00,63550.00
29/09/2024,POS 421098XXXXXX1234 AMAZON INDIA,000012345678,29/09/2024,2499.00,,61051.00`;

  const hdfcParsed = await parseCSV(hdfcCsv);
  assert(hdfcParsed.length === 3, 'HDFC: Parsed 3 transactions');
  assert(hdfcParsed[0].date === '2024-09-12', 'HDFC: Row 0 date 2024-09-12');
  assert(hdfcParsed[0].amount === 450, 'HDFC: Row 0 amount 450');
  assert(hdfcParsed[0].type === 'debit', 'HDFC: Row 0 type debit');
  assert(hdfcParsed[1].date === '2024-09-15', 'HDFC: Row 1 date 2024-09-15');
  assert(hdfcParsed[1].amount === 1250, 'HDFC: Row 1 amount 1250');
  assert(hdfcParsed[1].type === 'credit', 'HDFC: Row 1 type credit');

  // Test 3: ICICI Bank Statement Format (DD-MM-YYYY or DD-MMM-YYYY)
  console.log('\n--- Bank 3: ICICI Bank ---');
  const iciciCsv = `Transaction Date,Particulars,Withdrawal Amount (INR ),Deposit Amount (INR ),Balance (INR )
02-Aug-2024,BIL/ONL/BLINKIT GROCERY/MUMBAI,850.00,,34100.00
14-Aug-2024,NEFT-AXIS0001-RAHUL SHARMA-PAYMENT,,3500.00,37600.00
22-Aug-2024,INF*INFT*STARBUCKS COFFEE,420.00,,37180.00`;

  const iciciParsed = await parseCSV(iciciCsv);
  assert(iciciParsed.length === 3, 'ICICI: Parsed 3 transactions');
  assert(iciciParsed[0].date === '2024-08-02', 'ICICI: Row 0 date 2024-08-02');
  assert(iciciParsed[0].amount === 850, 'ICICI: Row 0 amount 850');
  assert(iciciParsed[1].date === '2024-08-14', 'ICICI: Row 1 date 2024-08-14');
  assert(iciciParsed[1].amount === 3500, 'ICICI: Row 1 amount 3500');

  // Test 4: Axis Bank Statement Format (DD-MM-YYYY, Particulars, Debit, Credit)
  console.log('\n--- Bank 4: Axis Bank ---');
  const axisCsv = `Tran Date,CHQNO,PARTICULARS,DR,CR,BAL
05-07-2024,-,UPI/UBER INDIA/BANGALORE/1234,180.00,,12400.00
10-07-2024,-,IMPS/P2A/TRANSFER FROM PRIYA,,5000.00,17400.00
25-07-2024,-,ECOM/FLIPKART INTERNET/BANGALORE,3199.00,,14201.00`;

  const axisParsed = await parseCSV(axisCsv);
  assert(axisParsed.length === 3, 'Axis: Parsed 3 transactions');
  assert(axisParsed[0].date === '2024-07-05', 'Axis: Row 0 date 2024-07-05');
  assert(axisParsed[0].amount === 180, 'Axis: Row 0 amount 180');
  assert(axisParsed[1].date === '2024-07-10', 'Axis: Row 1 date 2024-07-10');
  assert(axisParsed[1].amount === 5000, 'Axis: Row 1 amount 5000');

  console.log('\n========================================================');
  console.log(`🏁 TEST RESULTS: ${passedCount} PASSED, 0 FAILED (TOTAL: ${passedCount})`);
  console.log('========================================================\n');
}

runBankCsvTests().catch(err => {
  console.error('Bank CSV test execution failed:', err);
  process.exit(1);
});
