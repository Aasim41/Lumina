import { parseSMS, parseMultipleSMS } from '../src/lib/smsParser.ts';

interface TestCase {
  name: string;
  sender: string;
  body: string;
  expected: {
    shouldParse: boolean;
    amount?: number;
    type?: 'debit' | 'credit';
    merchantSubstring?: string;
  };
}

const testCases: TestCase[] = [
  // ── SBI Bank Tests ───────────────────────────────────────────────
  {
    name: 'SBI UPI Debit with Ref and trailing bank',
    sender: 'SBIUPI',
    body: 'Dear UPI user A/C X1234 debited by 350.0 on date 24Oct26 trf to SWIGGY Refno 123456789. If not u call 1800111109 - SBI',
    expected: { shouldParse: true, amount: 350, type: 'debit', merchantSubstring: 'SWIGGY' }
  },
  {
    name: 'SBI ATM Cash Withdrawal with balance clause',
    sender: 'ATMSBI',
    body: 'Rs 2,000.00 withdrawn from A/c XX1234 on 24-10-26 at ATM KORAMANGALA BLR. Avail Bal: Rs 15,400.00 - SBI',
    expected: { shouldParse: true, amount: 2000, type: 'debit', merchantSubstring: 'Atm' }
  },
  {
    name: 'SBI Salary Credit',
    sender: 'CBSSBI',
    body: 'Your A/C XX1234 is credited by Rs 75,000.00 on 31-10-26 by salary trf. Avail Bal: Rs 90,400.00',
    expected: { shouldParse: true, amount: 75000, type: 'credit' }
  },
  {
    name: 'SBI Card POS Swipe at Croma',
    sender: 'SBICRD',
    body: 'Rs. 4,999.00 spent on your SBI Card ending 3456 at CROMA ELECTRONICS on 24-Oct-26.',
    expected: { shouldParse: true, amount: 4999, type: 'debit', merchantSubstring: 'Croma' }
  },

  // ── HDFC Bank Tests ──────────────────────────────────────────────
  {
    name: 'HDFC UPI Debit to Zomato',
    sender: 'HDFCBK',
    body: 'Sent Rs.420.00 from HDFC Bank A/C **1234 to ZOMATO on 25-10-26. UPI Ref 3291823912. Bal: Rs 12,000.00',
    expected: { shouldParse: true, amount: 420, type: 'debit', merchantSubstring: 'ZOMATO' }
  },
  {
    name: 'HDFC Credit Card Purchase at Amazon India',
    sender: 'HDFCBK',
    body: "Alert: You've spent Rs. 1,499.00 on your HDFC Bank Credit Card ending 5678 at AMAZON INDIA on 26-OCT-26. Avail Lmt: Rs. 98,501.00",
    expected: { shouldParse: true, amount: 1499, type: 'debit', merchantSubstring: 'AMAZON' }
  },
  {
    name: 'HDFC Refund from Myntra',
    sender: 'HDFCBK',
    body: 'Rs. 499.00 has been credited to your HDFC Bank A/c ending 1234 on 27-OCT-26 towards refund from MYNTRA. Avail bal: Rs 12,499.00',
    expected: { shouldParse: true, amount: 499, type: 'credit', merchantSubstring: 'MYNTRA' }
  },
  {
    name: 'HDFC Autopay OTT Subscription',
    sender: 'HDFCBK',
    body: 'Autopay of Rs 649.00 for NETFLIX was debited from HDFC Bank A/C **1234 on 25-10-26. Bal: Rs 8,300.00',
    expected: { shouldParse: true, amount: 649, type: 'debit', merchantSubstring: 'NETFLIX' }
  },

  // ── ICICI Bank Tests ─────────────────────────────────────────────
  {
    name: 'ICICI UPI Counterparty Credited',
    sender: 'ICICIB',
    body: 'Dear Customer, your ICICI Bank Acc XX987 is debited for Rs 850.00 on 24-Oct-26. BLINKIT credited. UPI:329182. Call 18002003344 if not you.',
    expected: { shouldParse: true, amount: 850, type: 'debit', merchantSubstring: 'BLINKIT' }
  },
  {
    name: 'ICICI Credit Card at Starbucks',
    sender: 'ICICIB',
    body: 'Transaction of INR 2,240.00 made on ICICI Bank Card XX4001 at STARBUCKS on 26-Oct-26.',
    expected: { shouldParse: true, amount: 2240, type: 'debit', merchantSubstring: 'STARBUCKS' }
  },
  {
    name: 'ICICI FASTag Auto-Recharge',
    sender: 'ICICIB',
    body: 'Rs 1,000.00 debited from ICICI Bank A/c XX987 on 26-10-26 towards ICICI FASTag recharge. Avail Bal: Rs 21,300.00',
    expected: { shouldParse: true, amount: 1000, type: 'debit', merchantSubstring: 'FASTAG' }
  },

  // ── Axis Bank Tests ──────────────────────────────────────────────
  {
    name: 'Axis Bank UPI to Uber India',
    sender: 'AXISBK',
    body: 'Axis Bank: Rs. 180.00 debited from A/C no. XX3456 on 25-10-26 to UBER INDIA. UPI Ref: 39182. Bal: Rs 4,120.00',
    expected: { shouldParse: true, amount: 180, type: 'debit', merchantSubstring: 'UBER' }
  },
  {
    name: 'Axis Flipkart Credit Card',
    sender: 'AXISBK',
    body: 'Spent Rs. 3,599.00 on your Axis Bank Flipkart Credit Card ending 8901 at FLIPKART on 25-10-26.',
    expected: { shouldParse: true, amount: 3599, type: 'debit', merchantSubstring: 'FLIPKART' }
  },
  {
    name: 'Axis Bank ATM Cash Withdrawal',
    sender: 'AXISBK',
    body: 'Axis Bank: INR 5,000.00 withdrawn from A/c no. XX3456 at ATM INDIRANAGAR on 27-10-26. Available Bal: INR 12,050.00',
    expected: { shouldParse: true, amount: 5000, type: 'debit', merchantSubstring: 'Atm' }
  },

  // ── Kotak Bank Tests ─────────────────────────────────────────────
  {
    name: 'Kotak 811 UPI to Chai Point',
    sender: 'KOTAKB',
    body: 'Kotak Bank: Rs 250.00 debited from A/c ...7890 on 26-10-26 towards UPI txn to CHAI POINT. Avl Bal: Rs 3,450.00',
    expected: { shouldParse: true, amount: 250, type: 'debit', merchantSubstring: 'CHAI POINT' }
  },
  {
    name: 'Kotak Debit Card at Zepto',
    sender: 'KOTAKB',
    body: 'Kotak Bank: Rs 389.00 spent on Kotak Debit Card ending 4567 at ZEPTO on 26-10-26. Bal: Rs 4,120.00',
    expected: { shouldParse: true, amount: 389, type: 'debit', merchantSubstring: 'ZEPTO' }
  },

  // ── PNB, BOB, Canara, Union, IndusInd, Federal, IDFC ──────────────
  {
    name: 'PNB UPI to Reliance Retail',
    sender: 'PNBSMS',
    body: 'PNB Alert: Rs. 1200.00 debited from A/C *5678 on 24-10-2026 by UPI to RELIANCE RETAIL. Avail Bal: Rs 8,300.00',
    expected: { shouldParse: true, amount: 1200, type: 'debit', merchantSubstring: 'RELIANCE' }
  },
  {
    name: 'BOB UPI to Apollo Pharmacy',
    sender: 'BOBNK',
    body: 'BOB Alert: Your A/C *4321 is debited for INR 640.00 on 25-10-2026 by UPI/3910283/APOLLO PHARMACY. Bal: INR 14,200.00',
    expected: { shouldParse: true, amount: 640, type: 'debit', merchantSubstring: 'APOLLO' }
  },
  {
    name: 'Canara Bank UPI to McDonalds',
    sender: 'CANBNK',
    body: 'Canara Bank: Rs 150.00 debited from A/c ...3214 on 26-10-26 for UPI/P2M to MCDONALDS. Bal Rs 5,600.00',
    expected: { shouldParse: true, amount: 150, type: 'debit', merchantSubstring: 'MCDONALDS' }
  },
  {
    name: 'Union Bank UPI to Mother Dairy',
    sender: 'UBIONL',
    body: 'Union Bank: A/C *7654 debited by Rs.85.00 on 24-10-26 trf to MOTHER DAIRY via UPI. Avl Bal Rs 2,100.00',
    expected: { shouldParse: true, amount: 85, type: 'debit', merchantSubstring: 'MOTHER DAIRY' }
  },
  {
    name: 'IndusInd Card at BookMyShow',
    sender: 'INDUSB',
    body: 'IndusInd Bank: INR 2,100.00 spent on your Card ending 1234 at BOOKMYSHOW on 25-10-2026. Available limit INR 45,000.00',
    expected: { shouldParse: true, amount: 2100, type: 'debit', merchantSubstring: 'BOOKMYSHOW' }
  },
  {
    name: 'Federal Bank UPI to Dominos',
    sender: 'FEDBK',
    body: 'Federal Bank: Rs 350.00 debited from A/c ending 9012 on 26-10-2026 for UPI to DOMINOS. Avail Bal Rs 7,800.00',
    expected: { shouldParse: true, amount: 350, type: 'debit', merchantSubstring: 'DOMINOS' }
  },
  {
    name: 'IDFC FIRST UPI to Decathlon',
    sender: 'IDFCFB',
    body: 'IDFC FIRST Bank: Rs 1,890.00 debited from A/C **6789 on 25-Oct-26 to DECATHLON via UPI. Total Avail Bal: Rs 24,110.00',
    expected: { shouldParse: true, amount: 1890, type: 'debit', merchantSubstring: 'DECATHLON' }
  },
  {
    name: 'Yes Bank UPI to Cinepolis',
    sender: 'YESBK',
    body: 'YES BANK: Rs. 420.00 debited from A/C ending 4567 on 26-10-26 via UPI to CINEPOLIS. Avail Bal: Rs 6,580.00',
    expected: { shouldParse: true, amount: 420, type: 'debit', merchantSubstring: 'CINEPOLIS' }
  },
  {
    name: 'Bank of India UPI to Shell Fuel',
    sender: 'BOIIND',
    body: 'BOI Alert: Rs 800.00 debited from A/C XX2233 on 25-10-26 to SHELL PETROL via UPI. Bal: Rs 3,400.00',
    expected: { shouldParse: true, amount: 800, type: 'debit', merchantSubstring: 'SHELL' }
  },

  // ── FinTech Apps & Wallets ───────────────────────────────────────
  {
    name: 'CRED Credit Card Bill Payment',
    sender: 'CRED',
    body: 'CRED: Payment of Rs 15,000.00 towards your HDFC Credit Card bill was successful.',
    expected: { shouldParse: true, amount: 15000, type: 'debit', merchantSubstring: 'HDFC Credit Card Bill' }
  },
  {
    name: 'Paytm UPI Merchant Payment',
    sender: 'PAYTM',
    body: 'Paid Rs. 65.00 successfully to Chai Shai via Paytm UPI. UPI Ref: 3918239.',
    expected: { shouldParse: true, amount: 65, type: 'debit', merchantSubstring: 'Chai Shai' }
  },
  {
    name: 'PhonePe UPI to Fresh Fruits',
    sender: 'PHONEPE',
    body: 'Paid Rs. 320 to Fresh Fruits on PhonePe. Debited from SBI A/c XX1234.',
    expected: { shouldParse: true, amount: 320, type: 'debit', merchantSubstring: 'Fresh Fruits' }
  },
  {
    name: 'Google Pay to Pizza Hut',
    sender: 'GPAY',
    body: 'You paid ₹450 to Pizza Hut using Google Pay.',
    expected: { shouldParse: true, amount: 450, type: 'debit', merchantSubstring: 'Pizza Hut' }
  },
  {
    name: 'Amazon Pay Balance for Electricity Bill',
    sender: 'AMAZONP',
    body: 'Paid Rs. 1,280.00 for BESCOM Electricity Bill using Amazon Pay balance on 25-10-26.',
    expected: { shouldParse: true, amount: 1280, type: 'debit', merchantSubstring: 'BESCOM' }
  },
  {
    name: 'OneCard Coffee Spends',
    sender: 'FEDBK',
    body: 'OneCard: INR 850.00 spent at BLUE TOKAI COFFEE on 25-Oct-26 with card **4321.',
    expected: { shouldParse: true, amount: 850, type: 'debit', merchantSubstring: 'BLUE TOKAI' }
  },
  {
    name: 'Jupiter Federal Bank UPI to Dunzo',
    sender: 'JUPITE',
    body: 'Jupiter: Rs. 95.00 debited from your A/c XX4321 towards payment to DUNZO. Bal Rs 1,450.00',
    expected: { shouldParse: true, amount: 95, type: 'debit', merchantSubstring: 'DUNZO' }
  },
  {
    name: 'Fi Money Federal Bank UPI to Rapido',
    sender: 'FIAPP',
    body: 'Fi: Rs. 55.00 debited from your account to RAPIDO on 26-10-26 via UPI. Bal Rs 6,200.00',
    expected: { shouldParse: true, amount: 55, type: 'debit', merchantSubstring: 'RAPIDO' }
  },

  // ── Direct VPA Transfers (P2P) ──────────────────────────────────
  {
    name: 'P2P UPI Transfer to VPA Handle',
    sender: 'HDFCBK',
    body: 'Paid Rs 700.00 from HDFC Bank A/c XX1234 to rahul.sharma@okaxis on 26-10-26. UPI Ref 39281923.',
    expected: { shouldParse: true, amount: 700, type: 'debit', merchantSubstring: 'Rahul Sharma' }
  },
  {
    name: 'P2P UPI Transfer to Phone Number VPA',
    sender: 'SBIBNK',
    body: 'Sent Rs. 1,000.00 from SBI A/c XX1234 to 9876543210@paytm on 26-10-26. Ref 3918239.',
    expected: { shouldParse: true, amount: 1000, type: 'debit', merchantSubstring: 'UPI (9876543210)' }
  },

  // ── Rides & Deliveries ───────────────────────────────────────────
  {
    name: 'Ola Cabs Auto-Debit',
    sender: 'ICICIB',
    body: 'Rs. 235.00 debited from ICICI Bank A/c XX987 for OLA CABS on 25-10-26. UPI Ref: 391829.',
    expected: { shouldParse: true, amount: 235, type: 'debit', merchantSubstring: 'OLA' }
  },
  {
    name: 'Blinkit Grocery Order',
    sender: 'AXISBK',
    body: 'Axis Bank: Rs. 670.00 debited from A/C no. XX3456 on 26-10-26 to BLINKIT GROCERY. Bal: Rs 3,450.00',
    expected: { shouldParse: true, amount: 670, type: 'debit', merchantSubstring: 'BLINKIT' }
  },
  {
    name: 'BigBasket Supermarket',
    sender: 'HDFCBK',
    body: 'Sent Rs.1,840.00 from HDFC Bank A/C **1234 to BIGBASKET on 26-10-26. UPI Ref 3829102.',
    expected: { shouldParse: true, amount: 1840, type: 'debit', merchantSubstring: 'BIGBASKET' }
  },

  // ── Refunds, Cashbacks & Credits ─────────────────────────────────
  {
    name: 'Swiggy Instamart Refund',
    sender: 'HDFCBK',
    body: 'Refund of Rs. 145.00 from SWIGGY has been credited to your account on 26-Oct-26.',
    expected: { shouldParse: true, amount: 145, type: 'credit', merchantSubstring: 'SWIGGY' }
  },
  {
    name: 'IRCTC Train Cancellation Refund',
    sender: 'SBIINB',
    body: 'IRCTC: Refund of Rs 1,240.00 credited to your Bank A/c XX3456 on 25-10-2026. Ref: 3918239.',
    expected: { shouldParse: true, amount: 1240, type: 'credit', merchantSubstring: 'IRCTC' }
  },
  {
    name: 'Google Pay Cashback Credit',
    sender: 'SBIBNK',
    body: 'Cashback of Rs. 50.00 credited to your A/c XX9876 on 26-10-26 for Google Pay scratch card.',
    expected: { shouldParse: true, amount: 50, type: 'credit' }
  },
  {
    name: 'Dividend Income Credit',
    sender: 'HDFCBK',
    body: 'Your A/C XX1234 is credited with Rs 450.00 on 24-10-26 by Dividend from TATA MOTORS.',
    expected: { shouldParse: true, amount: 450, type: 'credit', merchantSubstring: 'TATA MOTORS' }
  },
  {
    name: 'P2P Money Received from Friend',
    sender: 'ICICIB',
    body: 'Rs 1,500.00 credited to your ICICI Bank A/c XX987 on 26-10-26 by transfer from PRIYA VERMA. UPI Ref: 391823.',
    expected: { shouldParse: true, amount: 1500, type: 'credit', merchantSubstring: 'Priya Verma' }
  },

  // ── False Positive Rejections (OTPs, Security, Future Requests) ──
  {
    name: 'Reject Login OTP',
    sender: 'SBIINB',
    body: '394812 is your OTP for SBI Netbanking login. Do not share this with anyone.',
    expected: { shouldParse: false }
  },
  {
    name: 'Reject Card Swipe OTP Code',
    sender: 'HDFCBK',
    body: 'Use OTP 827401 for transaction of INR 2,500.00 at Flipkart on card 4321. OTP valid for 10 mins. Do not share.',
    expected: { shouldParse: false }
  },
  {
    name: 'Reject Aadhaar OTP',
    sender: 'UIDAI',
    body: 'Your OTP for Aadhaar authentication is 918230. Valid for 10 minutes. Do not share.',
    expected: { shouldParse: false }
  },
  {
    name: 'Reject UPI Collect Request Reminder',
    sender: 'BHIM',
    body: 'Payment request of Rs. 500.00 received from rahul@upi. Approve on BHIM app to pay.',
    expected: { shouldParse: false }
  },
  {
    name: 'Reject Future Mandate Scheduled Notice',
    sender: 'HDFCBK',
    body: 'Your mandate for Rs 199.00 for NETFLIX is scheduled to be debited on 05-Nov-26.',
    expected: { shouldParse: false }
  },
  {
    name: 'Reject Future EMI Due Reminder',
    sender: 'BAJAJF',
    body: 'Dear Customer, your EMI of Rs 3,450.00 is due to be debited on 02-Nov-26. Maintain sufficient balance.',
    expected: { shouldParse: false }
  },
  {
    name: 'Reject Spam Loan Marketing',
    sender: 'AXISBK',
    body: 'Congratulations! You are pre-approved for a personal loan of Rs 5,00,000 at 10.5%. Apply now.',
    expected: { shouldParse: false }
  },
  {
    name: 'Reject Credit Limit Enhancement Offer',
    sender: 'ICICIB',
    body: 'Upgrade your ICICI Bank Credit Card limit to Rs 3,50,000 at zero cost. SMS CRUP to 5676766.',
    expected: { shouldParse: false }
  }
];

let passed = 0;
let failed = 0;

console.log(`\n========================================================`);
console.log(`🚀 RUNNING LUMINA BANK SMS ENGINE TEST MATRIX (${testCases.length} TESTS)`);
console.log(`========================================================\n`);

for (const tc of testCases) {
  const result = parseSMS(tc.body, tc.sender, '2026-10-26');

  if (!tc.expected.shouldParse) {
    if (result === null) {
      console.log(`✅ [PASS] ${tc.name} -> Correctly rejected non-transactional/OTP message`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${tc.name} -> Expected rejection but parsed as:`, result);
      failed++;
    }
    continue;
  }

  if (result === null) {
    console.error(`❌ [FAIL] ${tc.name} -> Expected valid transaction but returned null!`);
    failed++;
    continue;
  }

  let errorDetails: string[] = [];

  if (tc.expected.amount !== undefined && result.amount !== tc.expected.amount) {
    errorDetails.push(`Amount mismatch: expected ${tc.expected.amount}, got ${result.amount}`);
  }

  if (tc.expected.type !== undefined && result.type !== tc.expected.type) {
    errorDetails.push(`Type mismatch: expected ${tc.expected.type}, got ${result.type}`);
  }

  if (tc.expected.merchantSubstring) {
    const merchantUpper = result.merchant.toUpperCase();
    const expectedUpper = tc.expected.merchantSubstring.toUpperCase();
    if (!merchantUpper.includes(expectedUpper)) {
      errorDetails.push(`Merchant mismatch: expected substring "${tc.expected.merchantSubstring}", got "${result.merchant}"`);
    }
  }

  if (errorDetails.length > 0) {
    console.error(`❌ [FAIL] ${tc.name}: ${errorDetails.join(', ')}`);
    console.error(`       Parsed object:`, result);
    failed++;
  } else {
    console.log(`✅ [PASS] ${tc.name} -> Amount: ₹${result.amount} | Type: ${result.type} | Merchant: "${result.merchant}" | Source: ${result.source}`);
    passed++;
  }
}

console.log(`\n========================================================`);
console.log(`🏁 TEST RESULTS: ${passed} PASSED, ${failed} FAILED (TOTAL: ${testCases.length})`);
console.log(`========================================================\n`);

if (failed > 0) {
  process.exit(1);
} else {
  console.log(`🎉 100% OF ALL ${testCases.length} REAL-WORLD BANK SMS TESTS PASSED WITH ZERO ERRORS!\n`);
}
