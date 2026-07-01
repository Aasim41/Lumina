/**
 * Indian Bank SMS Parser
 * Parses transaction SMS from all major Indian banks and UPI apps.
 * Extracts amount, merchant/description, date, and transaction type (debit/credit).
 */

export interface ParsedTransaction {
  amount: number;
  merchant: string;
  date: string; // ISO date string YYYY-MM-DD
  type: 'debit' | 'credit';
  source: string; // bank name
  smsHash: string; // unique hash to prevent duplicates
}

// Simple hash to deduplicate SMS
function hashSMS(body: string, date: string): string {
  let hash = 0;
  const str = body + date;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

// Amount patterns: Rs.500, Rs 500.00, INR 1,500.00, Rs.1,23,456.78
const AMOUNT_PATTERNS = [
  /(?:rs\.?|inr\.?|rupees?)\s*([0-9,]+(?:\.[0-9]{1,2})?)/i,
  /(?:amount|amt)\s*(?:of\s*)?(?:rs\.?|inr\.?)?\s*([0-9,]+(?:\.[0-9]{1,2})?)/i,
  /([0-9,]+(?:\.[0-9]{1,2})?)\s*(?:has been|is|was)\s*(?:debited|credited)/i,
  /(?:debited|credited)\s*(?:with|by|for)?\s*(?:rs\.?|inr\.?)?\s*([0-9,]+(?:\.[0-9]{1,2})?)/i,
  /(?:spent|paid|received|sent)\s*(?:rs\.?|inr\.?)?\s*([0-9,]+(?:\.[0-9]{1,2})?)/i,
  /(?:txn|transaction)\s*(?:of|for|:)\s*(?:rs\.?|inr\.?)?\s*([0-9,]+(?:\.[0-9]{1,2})?)/i,
];

// Debit indicators
const DEBIT_KEYWORDS = [
  /debited/i, /spent/i, /paid/i, /sent/i, /purchase/i, /withdrawn/i, /withdrawal/i,
  /payment/i, /transferred/i, /deducted/i, /charged/i, /auto.?pay/i, /emi/i,
  /bill\s*pay/i, /neft/i, /rtgs/i, /imps/i, /upi/i,
];

// Credit indicators
const CREDIT_KEYWORDS = [
  /credited/i, /received/i, /refund/i, /cashback/i, /reversal/i, /deposit/i,
  /salary/i,
];

// Merchant/payee patterns
const MERCHANT_PATTERNS = [
  /(?:to|at|for|@)\s+([A-Za-z0-9][A-Za-z0-9\s&.'_-]{2,30})/i,
  /(?:paid|sent)\s+(?:to\s+)?([A-Za-z0-9][A-Za-z0-9\s&.'_-]{2,30})/i,
  /(?:VPA|upi)\s*[:/-]?\s*([a-zA-Z0-9._-]+@[a-zA-Z]+)/i,
  /(?:merchant|payee|beneficiary)\s*[:/-]?\s*([A-Za-z0-9][A-Za-z0-9\s&.'_-]{2,30})/i,
];

// Bank sender IDs and names
const BANK_SENDERS: Record<string, string> = {
  // Public Sector Banks
  'SBIINB': 'SBI', 'SBIPSG': 'SBI', 'SBIBNK': 'SBI', 'ATMSBI': 'SBI',
  'BOIIND': 'BOI', 'BOBNK': 'BOB', 'BOBANK': 'BOB',
  'CANBNK': 'Canara Bank', 'CANARA': 'Canara Bank',
  'PNBSMS': 'PNB', 'PUNBNK': 'PNB',
  'UBIONL': 'Union Bank', 'UBINML': 'Union Bank',
  'INDBNK': 'Indian Bank', 'IOBINB': 'IOB',
  'BKIDIN': 'Bank of India', 'CBIINB': 'CBI',
  'UCOBNK': 'UCO Bank', 'IDBINB': 'IDBI',
  'MAHBNK': 'Bank of Maharashtra',
  'PSBINB': 'PSB',

  // Private Banks
  'HDFCBK': 'HDFC', 'HDFCBN': 'HDFC',
  'ICICIB': 'ICICI', 'ICICBK': 'ICICI',
  'AXISBK': 'Axis', 'AXSBNK': 'Axis',
  'KOTAKB': 'Kotak', 'KOTKBK': 'Kotak',
  'YESBKL': 'Yes Bank', 'YESBK': 'Yes Bank',
  'IDFCFB': 'IDFC First', 'IDFCBK': 'IDFC First',
  'RBLBNK': 'RBL Bank',
  'FEDBK': 'Federal Bank', 'FEDBNK': 'Federal Bank',
  'INDUSB': 'IndusInd', 'INDUSL': 'IndusInd',
  'SCBANK': 'Standard Chartered',
  'CITIBK': 'Citibank',
  'HSBCBK': 'HSBC',
  'DCBBNK': 'DCB Bank',
  'BANDHN': 'Bandhan Bank',
  'AUSFIN': 'AU Small Finance',

  // Small Finance Banks
  'UJJIVN': 'Ujjivan SFB', 'EQUTSF': 'Equitas SFB',
  'FINCRE': 'Fincare SFB', 'JANABN': 'Jana SFB',
  'ESAFBN': 'ESAF SFB', 'NESFBN': 'NE SFB',
  'SURBNK': 'Suryoday SFB', 'UTKABN': 'Utkarsh SFB',
  'CAPSFB': 'Capital SFB',

  // Payment Banks / Wallets
  'ABORIG': 'Airtel Payments Bank', 'JIOBNK': 'Jio Payments Bank',
  'PAYTMB': 'Paytm Payments Bank', 'PPBNK': 'Paytm Payments Bank',
  'FINOBN': 'Fino Payments Bank',

  // UPI / Wallets
  'GPAY': 'Google Pay', 'GPAYTM': 'Google Pay',
  'PYTM': 'Paytm', 'PAYTM': 'Paytm',
  'PHONEPE': 'PhonePe', 'PHOPEY': 'PhonePe',
  'MOBIKW': 'Mobikwik', 'FREERC': 'Freecharge',
  'AMAZONP': 'Amazon Pay', 'AMZNPY': 'Amazon Pay',
  'CRED': 'CRED',
  'WHATSAP': 'WhatsApp Pay',
  'JUPITE': 'Jupiter',
  'SLICE': 'Slice',
  'FIAPP': 'Fi Money',
  'NIYOX': 'Niyo',
};

// OTP / promotional / non-transaction keywords to skip
const IGNORE_PATTERNS = [
  /otp/i, /one.time.password/i, /verification/i, /verify/i,
  /kyc/i, /aadhar/i, /aadhaar/i, /pan\s*card/i,
  /apply now/i, /offer/i, /pre.?approved/i, /loan\s*offer/i,
  /click here/i, /download/i, /install/i, /update/i,
  /dear customer.*welcome/i, /thank you for/i, /congratulations/i,
  /balance.*enquiry/i, /mini.?statement/i,
  /login/i, /password/i, /pin/i, /reset/i,
];

function parseAmount(text: string): number | null {
  for (const pattern of AMOUNT_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      const raw = match[1].replace(/,/g, '');
      const val = parseFloat(raw);
      if (!isNaN(val) && val > 0 && val < 10000000) { // max 1 crore sanity check
        return val;
      }
    }
  }
  return null;
}

function parseType(text: string): 'debit' | 'credit' {
  for (const pat of CREDIT_KEYWORDS) {
    if (pat.test(text)) return 'credit';
  }
  // Default to debit (most UPI messages are debits)
  return 'debit';
}

function parseMerchant(text: string): string {
  // Try UPI VPA first
  const vpaMatch = text.match(/([a-zA-Z0-9._-]+@[a-zA-Z]+)/i);
  if (vpaMatch) {
    const vpa = vpaMatch[1];
    // Extract readable name from VPA
    const name = vpa.split('@')[0].replace(/[._-]/g, ' ').trim();
    if (name.length > 2) return name.charAt(0).toUpperCase() + name.slice(1);
  }

  for (const pattern of MERCHANT_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      let merchant = match[1].trim();
      // Remove trailing garbage
      merchant = merchant.replace(/\s*(a\/c|ac|account|ref|txn|on|dated).*$/i, '').trim();
      if (merchant.length > 2 && merchant.length < 40) {
        return merchant;
      }
    }
  }

  return 'UPI Transaction';
}

function identifyBank(sender: string, body: string): string {
  // Check sender ID
  const senderUpper = sender.replace(/[^A-Za-z]/g, '').toUpperCase();
  for (const [key, bankName] of Object.entries(BANK_SENDERS)) {
    if (senderUpper.includes(key)) return bankName;
  }

  // Check body content for bank names
  const bankBodyPatterns: [RegExp, string][] = [
    [/\bSBI\b/i, 'SBI'], [/\bHDFC\b/i, 'HDFC'], [/\bICICI\b/i, 'ICICI'],
    [/\bAxis\b/i, 'Axis'], [/\bKotak\b/i, 'Kotak'], [/\bPNB\b/i, 'PNB'],
    [/\bCanara\b/i, 'Canara Bank'], [/\bUnion Bank/i, 'Union Bank'],
    [/\bBOB\b|Bank of Baroda/i, 'BOB'], [/\bBOI\b|Bank of India/i, 'BOI'],
    [/\bIDFC/i, 'IDFC First'], [/\bYes Bank/i, 'Yes Bank'],
    [/\bRBL/i, 'RBL Bank'], [/\bFederal/i, 'Federal Bank'],
    [/\bIndusInd/i, 'IndusInd'], [/\bIDBI/i, 'IDBI'],
    [/\bPaytm/i, 'Paytm'], [/\bPhonePe/i, 'PhonePe'],
    [/\bGPay|Google Pay/i, 'Google Pay'], [/\bAmazon Pay/i, 'Amazon Pay'],
  ];

  for (const [pat, name] of bankBodyPatterns) {
    if (pat.test(body)) return name;
  }

  return 'Bank';
}

function isTransactionalSMS(body: string): boolean {
  // Must have an amount
  if (!parseAmount(body)) return false;

  // Must NOT be OTP/promo
  for (const pat of IGNORE_PATTERNS) {
    if (pat.test(body)) return false;
  }

  // Must have debit/credit context
  const allKeywords = [...DEBIT_KEYWORDS, ...CREDIT_KEYWORDS];
  return allKeywords.some(pat => pat.test(body));
}

export function parseSMS(body: string, sender: string, dateStr: string): ParsedTransaction | null {
  if (!isTransactionalSMS(body)) return null;

  const amount = parseAmount(body);
  if (!amount) return null;

  const type = parseType(body);
  const merchant = parseMerchant(body);
  const source = identifyBank(sender, body);
  const smsHash = hashSMS(body, dateStr);

  // Parse date - try to extract from SMS or use SMS received date
  let date = dateStr;
  const dateMatch = body.match(/(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})/);
  if (dateMatch) {
    const [, d, m, y] = dateMatch;
    const year = y.length === 2 ? '20' + y : y;
    const month = m.padStart(2, '0');
    const day = d.padStart(2, '0');
    date = `${year}-${month}-${day}`;
  }

  return { amount, merchant, date, type, source, smsHash };
}

export function parseMultipleSMS(messages: Array<{ body: string; sender: string; date: string }>): ParsedTransaction[] {
  const results: ParsedTransaction[] = [];
  const seenHashes = new Set<string>();

  for (const msg of messages) {
    const parsed = parseSMS(msg.body, msg.sender, msg.date);
    if (parsed && !seenHashes.has(parsed.smsHash)) {
      seenHashes.add(parsed.smsHash);
      results.push(parsed);
    }
  }

  return results;
}
