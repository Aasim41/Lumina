/**
 * Indian Bank SMS Parser (v5)
 * Parses transaction SMS from all major Indian banks and UPI apps.
 * Extracts amount, clean merchant/sender (never user's bank/account), date, and transaction type (debit/credit).
 */

export interface ParsedTransaction {
  amount: number;
  merchant: string;
  date: string; // ISO date string YYYY-MM-DD
  type: 'debit' | 'credit';
  source: string; // bank name
  smsHash: string; // unique hash to prevent duplicates
  rawBody: string; // original SMS text for secondary keyword categorization
}

// Simple hash to deduplicate SMS
function hashSMS(body: string, date: string): string {
  let hash = 0;
  const str = body.trim() + '|' + date;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

// Amount patterns: Rs.500, Rs 500.00, INR 1,500.00, Rs.1,23,456.78, ₹ 500, debited by 120.0
const AMOUNT_PATTERNS = [
  /(?:debited|credited|spent|paid|received|sent|withdrawn|deducted|charged|trf|transferred|payment)\s*(?:with|by|for|of|:)?\s*(?:rs\.?|inr\.?|rupees?|₹)\s*([0-9,]+(?:\.[0-9]{1,2})?)/i,
  /(?:rs\.?|inr\.?|rupees?|₹)\s*([0-9,]+(?:\.[0-9]{1,2})?)\s*(?:has\s+been|is|was)?\s*(?:debited|credited|spent|paid|received|sent|withdrawn|deducted)/i,
  /(?:debited|credited)\s+(?:by|with|for)\s*(?:rs\.?|inr\.?|₹)?\s*([0-9,]+(?:\.[0-9]{1,2})?)/i,
  /(?:amount|amt|txn|transaction|payment)\s*(?:of|for|:)?\s*(?:rs\.?|inr\.?|₹)\s*([0-9,]+(?:\.[0-9]{1,2})?)/i,
  /([0-9,]+(?:\.[0-9]{1,2})?)\s*(?:has\s+been|is|was)\s*(?:debited|credited)/i,
  /(?:rs\.?|inr\.?|rupees?|₹)\s*([0-9,]+(?:\.[0-9]{1,2})?)/i,
];

// Debit indicators
const DEBIT_KEYWORDS = [
  /\bdebited\b/i, /\bspent\b/i, /\bpaid\b/i, /\bsent\b/i, /\bpurchase(?:d)?\b/i,
  /\bwithdrawn\b/i, /\bwithdrawal\b/i, /\btransferred\s+to\b/i, /\btrf\s+to\b/i,
  /\bdeducted\b/i, /\bcharged\b/i, /\bauto.?pay\b/i, /\bdr\.?\b/i,
  /\bpayment\s+(?:of|towards|was\s+successful)\b/i,
  /\b(?:transaction|txn)\s+of\b/i,
  /\bmade\s+on\b/i,
];

// Credit indicators
const CREDIT_KEYWORDS = [
  /\bcredited\b/i, /\breceived\b/i, /\brefund(?:ed)?\b/i, /\bcashback\b/i,
  /\breversal\b/i, /\bdeposit(?:ed)?\b/i, /\bsalary\b/i, /\bcr\.?\b/i,
  /\bhas\s+a\s+credit\b/i,
];

// Bank sender IDs and names
const BANK_SENDERS: Record<string, string> = {
  // Public Sector Banks
  'SBIINB': 'SBI', 'SBIPSG': 'SBI', 'SBIBNK': 'SBI', 'ATMSBI': 'SBI', 'SBIUPI': 'SBI', 'CBSSBI': 'SBI',
  'BOIIND': 'BOI', 'BOBNK': 'BOB', 'BOBANK': 'BOB', 'BOBTXN': 'BOB', 'BOBSMS': 'BOB',
  'CANBNK': 'Canara Bank', 'CANARA': 'Canara Bank',
  'PNBSMS': 'PNB', 'PUNBNK': 'PNB',
  'UBIONL': 'Union Bank', 'UBINML': 'Union Bank',
  'INDBNK': 'Indian Bank', 'IOBINB': 'IOB',
  'BKIDIN': 'Bank of India', 'CBIINB': 'CBI',
  'UCOBNK': 'UCO Bank', 'IDBINB': 'IDBI',
  'MAHBNK': 'Bank of Maharashtra',
  'PSBINB': 'PSB',

  // Private Banks
  'HDFCBK': 'HDFC', 'HDFCBN': 'HDFC', 'HDFCUP': 'HDFC',
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
  'ABORIG': 'Airtel Payments Bank', 'AIRBNK': 'Airtel Payments Bank',
  'JIOBNK': 'Jio Payments Bank',
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

// True non-transactional patterns (OTPs, login security, future reminders, payment requests, marketing)
const NON_TRANSACTIONAL_PATTERNS = [
  /\b(?:is\s+your\s+otp|use\s+otp|otp\s+is|secret\s+otp|do\s+not\s+share\s+(?:your\s+)?otp|enter\s+otp|verification\s+code\s+is|one[\s-]*time[\s-]*password\s+is)\b/i,
  /\b(?:login\s+otp|register\s+otp|netbanking\s+otp)\b/i,
  /\bpayment\s+request\b/i,
  /\brequest(?:ed)?\s+(?:to\s+pay|money)\b/i,
  /\b(?:scheduled|due)\s+to\s+be\s+debited\b/i,
  /\bwill\s+be\s+debited\s+on\b/i,
  /\bmandate\s+(?:created|scheduled|active)\b/i,
  /\bpre-?approved\s+(?:for\s+a\s+)?loan\b/i,
  /\bapply\s+now\b/i,
];

function isTransactionalSMS(body: string): boolean {
  if (!body || body.trim().length === 0) return false;

  // 1. If it matches any non-transactional disqualifier, reject immediately
  for (const pat of NON_TRANSACTIONAL_PATTERNS) {
    if (pat.test(body)) return false;
  }

  // 2. If it's just an OTP code message without debit/credit context
  if (/\botp\b/i.test(body) && /\b(?:code|pin|share|valid\s+for)\b/i.test(body) && !/\b(?:debited|credited|spent|withdrawn)\b/i.test(body)) {
    return false;
  }

  // 3. Must have an extractable financial amount
  if (!parseAmount(body)) return false;

  // 4. Must have debit or credit indicator
  const allKeywords = [...DEBIT_KEYWORDS, ...CREDIT_KEYWORDS];
  return allKeywords.some(pat => pat.test(body));
}

function stripBalanceClauses(text: string): string {
  return text
    .replace(/(?:avl\.?|avail\.?|available|clear|closing|total|eff\.?|net|updated)\s*(?:a\/c\s*)?(?:bal(?:ance)?|limit)\s*(?:is)?\s*[:=-]?\s*(?:rs\.?|inr\.?|₹)?\s*[0-9,]+(?:\.[0-9]{1,2})?/gi, ' ')
    .replace(/\b(?:bal(?:ance)?)\s*(?:is|:|-)?\s*(?:rs\.?|inr\.?|₹)\s*[0-9,]+(?:\.[0-9]{1,2})?/gi, ' ');
}

function parseAmount(text: string): number | null {
  const cleaned = stripBalanceClauses(text);
  for (const pattern of AMOUNT_PATTERNS) {
    const match = cleaned.match(pattern);
    if (match) {
      const raw = match[1].replace(/,/g, '');
      const val = parseFloat(raw);
      if (!isNaN(val) && val > 0 && val < 10000000) {
        return val;
      }
    }
  }
  return null;
}

function parseType(text: string): 'debit' | 'credit' {
  // Remove clauses where the counterparty is credited in a debit SMS:
  // e.g. "; SWIGGY credited" or "and credited to ZOMATO" or "credited to VPA..." when preceded by debited
  const hasDebited = /\b(?:debited|spent|withdrawn|deducted|charged|paid\s+(?:rs\.?|inr\.?|₹)?\s*[0-9]|sent\s+(?:rs\.?|inr\.?|₹)?\s*[0-9]|amt\s+sent|trf\s+to|transferred\s+to)\b/i.test(text);
  const hasCredited = /\b(?:credited|received\s+(?:rs\.?|inr\.?|₹)?\s*[0-9]|money\s*received|refund(?:ed)?|cashback|reversal|deposit(?:ed)?|has\s+a\s+credit\s+by)\b/i.test(text);

  if (hasCredited && !hasDebited) return 'credit';
  if (hasDebited && !hasCredited) return 'debit';

  if (hasCredited && hasDebited) {
    // When both appear (e.g. "Acct XX123 debited for Rs 350; SWIGGY credited" or "debited from A/c XX123 and credited to VPA..."),
    // whichever action appears FIRST in the SMS describes what happened to the user's own bank account.
    const debitMatch = text.match(/\b(?:debited|spent|withdrawn|deducted|sent|paid)\b/i);
    const creditMatch = text.match(/\b(?:credited|received|refund(?:ed)?|cashback|deposited)\b/i);

    const debitIdx = debitMatch?.index ?? Infinity;
    const creditIdx = creditMatch?.index ?? Infinity;

    if (creditIdx < debitIdx) {
      return 'credit';
    }
    return 'debit';
  }

  // Fallback to Dr / Cr tokens
  if (/\bcr\.?\b/i.test(text) && !/\bdr\.?\b/i.test(text)) return 'credit';
  return 'debit';
}

/**
 * Strips all references to the user's own bank name, account number, and card number,
 * replacing them with " | " so prepositions attached to the bank account ("from HDFC Bank A/c XX1234",
 * "to your SBI A/c X1234", "in Kotak Bank AC X1234") are completely removed before merchant matching.
 */
function stripBankAccountClauses(text: string): string {
  return text
    // 1. "<prep> [your] <Bank Name> Bank [Savings/Current] [A/c|Acct|AC|Card] [No.] <MaskedNum>"
    .replace(
      /(?:(?:from|to|in|into|on|of|for|with|by)\s+)?(?:your\s+)?(?:[A-Za-z]+\s+){0,3}bank(?:\s+of\s+[A-Za-z]+)?(?:\s+ltd\.?)?\s+(?:saving(?:s)?\s+|current\s+)?(?:a\/c|acct|account|\bac\b|card)?\s*(?:no\.?|number|#)?\s*(?:ending(?:\s+with)?\s*)?[:.-]?\s*[xX*.0-9-]*\d{2,}/gi,
      ' | '
    )
    // 2. "<prep> [your] [BankAbbr] <A/c|Acct|Account|AC|Card> [No.] <MaskedNum>"
    .replace(
      /(?:(?:from|to|in|into|on|of|for|with|by)\s+)?(?:your\s+)?(?:[A-Za-z]+\s+)?(?:saving(?:s)?\s+|current\s+)?(?:a\/c|acct|account|\bac\b|card)\s*(?:no\.?|number|#)?\s*(?:ending(?:\s+with)?\s*)?[:.-]?\s*[xX*.0-9-]*\d{2,}/gi,
      ' | '
    )
    // 3. "<prep> [your] <KnownBank> <MaskedNum>" (even without A/c keyword)
    .replace(
      /(?:(?:from|to|in|into|on|of|for|with|by)\s+)?(?:your\s+)?\b(?:sbi|hdfc|icici|axis|kotak|pnb|bob|boi|canara|union|indusind|yes|idfc|federal|rbl|cbi|iob|uco|idbi|bandhan|equitas|ujjivan|paytm|airtel|jio)(?:\s+bank)?\s*(?:a\/c|acct|account|\bac\b|card)?\s*(?:no\.?|number|#)?\s*[xX*.0-9-]*[xX*.]+\d{2,}/gi,
      ' | '
    )
    // 4. "<prep> your [Bank] account/a/c" without number
    .replace(
      /(?:from|to|in|into|on)\s+(?:your\s+)?(?:[A-Za-z]+\s+)?(?:bank\s+)?(?:a\/c|acct|account|\bac\b|card)\b/gi,
      ' | '
    )
    // 5. Standalone masked account/card tokens (e.g. XX1234, **1234, X1234, ...1234)
    .replace(/\b(?:[xX*]{1,}\d{2,}|\.{2,}\d{2,})\b/g, ' | ');
}

const INVALID_MERCHANT_REGEX = new RegExp(
  '^(?:' +
    'your|the|my|self|user|customer|dear\\s+customer|dear\\s+upi\\s+user|upi\\s+user|' +
    'bank|account|a\\/c|acct|ac|card|savings|current|wallet|' +
    'sbi|state\\s+bank(?:\\s+of\\s+india)?|hdfc(?:\\s+bank)?|icici(?:\\s+bank)?|' +
    'axis(?:\\s+bank)?|kotak(?:\\s+mahindra)?(?:\\s+bank)?|pnb|punjab\\s+national\\s+bank|' +
    'bob|bank\\s+of\\s+baroda|boi|bank\\s+of\\s+india|canara(?:\\s+bank)?|union\\s+bank|' +
    'indusind(?:\\s+bank)?|yes\\s+bank|idfc(?:\\s+first)?(?:\\s+bank)?|federal(?:\\s+bank)?|' +
    'rbl(?:\\s+bank)?|indian\\s+bank|iob|uco\\s+bank|idbi(?:\\s+bank)?|bandhan(?:\\s+bank)?|' +
    'standard\\s+chartered|citibank|hsbc|au\\s+small\\s+finance(?:\\s+bank)?|equitas|ujjivan|' +
    'paytm\\s+payments\\s+bank|airtel\\s+payments\\s+bank|jio\\s+payments\\s+bank|' +
    'upi|imps|neft|rtgs|mmt|mbk|pos|ecom|atm|cash|transfer|trf|txn|transaction|' +
    'rs|inr|rupees|dr|cr|debited|credited|sent|paid|received|spent|info|vpa|ref|refno|utr' +
  ')(?:\\s+(?:bank|ltd|limited|a\\/c|ac|acct|account|card|no|number|user|customer|[xX*0-9.-]+))*$',
  'i'
);

function cleanAndValidateMerchant(raw: string): string | null {
  if (!raw) return null;

  let cleaned = raw
    // Strip anything after pipe marker
    .split('|')[0]
    // Strip trailing "has been credited / is credited" clauses
    .replace(/\s+(?:has\s+been|is|was)?\s*(?:debited|credited|deposited|transferred|reversed)\b.*$/i, '')
    // Strip trailing "using <App>" or "via <App/UPI>" or "thru <UPI>"
    .replace(/\s+(?:using|via|thru|through)\s+.*$/i, '')
    // Strip trailing reference, date, balance, bank footer, or helpline text
    .replace(/\s+(?:on|dated|dt|at\s+\d|ref(?:\s*no|\s*id|\.|\b)|upi\s*ref|txn(?:\s*id|\b)|utr|avl|avail|available|bal(?:ance)?|clear|not\s+you|if\s+not|call|sms|block|dispute|helpline|http|www)\b.*$/i, '')
    // Strip trailing "- Bank Name" footer (e.g. "- Axis Bank", "- HDFC Bank", "- SBI")
    .replace(/\s*[-–]\s*(?:sbi|hdfc|icici|axis|kotak|pnb|bob|boi|canara|union|indusind|yes|idfc|federal|rbl|paytm|bank)[A-Za-z\s]*$/i, '')
    // Strip leading prepositions or VPA prefix if still attached
    .replace(/^(?:vpa|to|from|by|at|for|towards|mr|mrs|ms|shri|smt|m\/s)\.?\s+/i, '')
    // Strip punctuation at boundaries
    .replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9)]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (cleaned.length < 2 || cleaned.length > 40) return null;

  // Reject if it contains masked account numbers or explicit account markers
  if (/\b(?:a\/c|acct|account|\bac\s+no|\bac\s+[xX*0-9]|[xX*]{2,}\d|[xX*]\d{3,})\b/i.test(cleaned)) {
    return null;
  }

  // Reject if it starts with an amount (e.g. "Rs 500", "INR 200", "120.0")
  if (/^(?:rs\.?|inr\.?|rupees?|₹)?\s*\d+(?:[.,]\d+)*$/i.test(cleaned)) {
    return null;
  }
  if (/^(?:rs\.?|inr\.?|rupees?|₹)\s*\d/i.test(cleaned)) {
    return null;
  }

  // Reject pure numbers or long numeric IDs
  if (/^\d+$/.test(cleaned)) {
    return null;
  }

  // Reject if it matches bank names or generic noise words
  if (INVALID_MERCHANT_REGEX.test(cleaned)) {
    return null;
  }

  // Convert to clean Title Case if all uppercase or all lowercase
  if (cleaned === cleaned.toUpperCase() || cleaned === cleaned.toLowerCase()) {
    cleaned = cleaned
      .toLowerCase()
      .split(' ')
      .map(w => (w.length <= 2 && /^(?:hp|vi|pg)$/.test(w) ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1)))
      .join(' ');
  }

  return cleaned;
}

function parseVpaToName(vpa: string): string | null {
  const handle = vpa.split('@')[0]?.trim();
  if (!handle || handle.length < 2) return null;

  // Known QR / merchant aggregator handles
  if (/^paytmqr/i.test(handle)) return 'Paytm Merchant';
  if (/^bharatpe/i.test(handle)) return 'BharatPe Merchant';
  if (/^q\d{6,}$/i.test(handle)) return 'PhonePe Merchant';
  if (/^gpay/i.test(handle)) return 'Google Pay Merchant';
  if (/^phonepe/i.test(handle)) return 'PhonePe Merchant';
  if (/^pinepos|^pinelabs/i.test(handle)) return 'Pine Labs POS';
  if (/^razorpay|^rzp/i.test(handle)) return 'Razorpay Merchant';
  if (/^cashfree/i.test(handle)) return 'Cashfree Merchant';
  if (/^billdesk/i.test(handle)) return 'BillDesk';

  // Pure phone number handle e.g. 9876543210@ybl
  if (/^(?:91)?[6-9]\d{9}$/.test(handle)) {
    return `UPI (${handle.slice(-10)})`;
  }

  // Strip trailing numeric digits attached to a name (e.g. "swiggy123" -> "swiggy", "rahul.sharma98" -> "rahul sharma")
  const cleanedHandle = handle
    .replace(/[._-]+/g, ' ')
    .replace(/([a-zA-Z]{3,})\d+$/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();

  return cleanAndValidateMerchant(cleanedHandle);
}

function parseMerchant(text: string, type: 'debit' | 'credit'): string {
  // 1. Check structured UPI slash format first: e.g. UPI/P2M/123456789/DMART AVENUE or UPI/CR/123456789/RAHUL
  const upiSlashPatterns = [
    /UPI\/(?:P2A|P2M|CR|DR|INT|MOB|COLLECT|[A-Za-z0-9_-]{1,10})\/[0-9]{5,}\/([A-Za-z][A-Za-z0-9\s&.'_-]{1,35})/i,
    /UPI\/[0-9]{5,}\/([A-Za-z][A-Za-z0-9\s&.'_-]{1,35})/i,
  ];
  for (const pat of upiSlashPatterns) {
    const match = text.match(pat);
    if (match) {
      const candidate = cleanAndValidateMerchant(match[1]);
      if (candidate) return candidate;
    }
  }

  // 1b. Check Credit Card Bill payments (CRED, Netbanking, Auto-debit)
  if (/\b(?:credit\s+card\s+bill|card\s+bill|cc\s+bill|bill\s+payment)\b/i.test(text)) {
    const bankMatch = text.match(/\b(SBI|HDFC|ICICI|Axis|Kotak|PNB|BOB|Canara|IndusInd|IDFC|Federal|RBL|OneCard|Amex)\b/i);
    if (bankMatch) {
      const bName = bankMatch[1].toUpperCase();
      return `${bName === 'ONECARD' ? 'OneCard' : bName} Credit Card Bill`;
    }
    return 'Credit Card Bill';
  }

  // 2. Check structured NEFT / IMPS / RTGS format: e.g. NEFT Cr-SBIN0001234-ACME CORP PVT LTD
  const neftMatch = text.match(/\b(?:NEFT|IMPS|RTGS)[/:\s-]+(?:Cr|Dr|[A-Za-z0-9]{4,})[/:\s-]+([A-Za-z][A-Za-z0-9\s&.'-]{2,35})/i);
  if (neftMatch) {
    const candidate = cleanAndValidateMerchant(neftMatch[1]);
    if (candidate) return candidate;
  }

  // 3. Strip all user bank account / card clauses before running preposition patterns
  const stripped = stripBankAccountClauses(text);

  // 4. Direction-aware extraction on stripped text
  if (type === 'debit') {
    const debitPatterns = [
      // ICICI style: "; SWIGGY INDIA credited" or ". BLINKIT credited."
      /(?:[.;,]|\bon\s+\S+|\bdate\s+\S+)\s*([A-Za-z][A-Za-z0-9\s&.'_-]{1,35}?)\s+credited\b/i,
      // BOB / ICICI style: "debited ... and credited to ZOMATO"
      /\bcredited\s+to\s+(?:VPA\s+)?([A-Za-z][A-Za-z0-9\s&.'_@-]{1,35})/i,
      // Kotak / UPI txn style: "towards UPI txn to CHAI POINT" or "for txn to ZOMATO"
      /\b(?:towards|for)\s+(?:UPI\s+)?(?:txn|payment|transfer|trf)?\s*(?:to\s+)(?:VPA\s+)?([A-Za-z][A-Za-z0-9\s&.'_@-]{1,35})/i,
      // SBI / HDFC / Kotak style: "trf to ZOMATO", "transferred to Swiggy", "paid to Rahul", "sent to Swiggy"
      /\b(?:trf|transfer|transferred|paid|sent)\s+to\s+(?:VPA\s+)?([A-Za-z][A-Za-z0-9\s&.'_@-]{1,35})/i,
      // Card / POS style: "spent ... at NETFLIX COM" or "transaction of ... at STARBUCKS"
      /\b(?:spent|purchase(?:d)?|used|txn|transaction|made\s+on)\b[^|.;]{0,40}?\bat\s+([A-Za-z][A-Za-z0-9\s&.'_-]{1,35})/i,
      // Generic "to / at / towards <Merchant>" (safe now that bank accounts are stripped)
      /\b(?:towards|to|at)\s+(?:VPA\s+)?([A-Za-z][A-Za-z0-9\s&.'_@-]{1,35})/i,
    ];

    for (const pat of debitPatterns) {
      const match = stripped.match(pat);
      if (match) {
        const rawMatch = match[1].trim();
        if (rawMatch.includes('@')) {
          const vpaName = parseVpaToName(rawMatch);
          if (vpaName) return vpaName;
        }
        const candidate = cleanAndValidateMerchant(rawMatch);
        if (candidate) return candidate;
      }
    }
  } else {
    // Credit / incoming payment patterns
    const creditPatterns = [
      // Prefix sender style: "IRCTC: Refund of Rs...", "SWIGGY: Cashback of..."
      /^([A-Za-z][A-Za-z0-9\s&.'_-]{2,30})[:\s-]+(?:Refund|Cashback|Reversal|Credit|Deposit)\b/i,
      // "refund from SWIGGY", "cashback from GOOGLE PAY"
      /\b(?:refund|cashback|reversal)\s+(?:of\s+[^|]+?\s+)?(?:from|by|for|towards)\s+([A-Za-z][A-Za-z0-9\s&.'_-]{1,35})/i,
      // "transfer from RAHUL", "received ... from PRIYA", "credited ... from ANKIT", "refund ... from AMAZON"
      /\b(?:transfer(?:red)?|received|credited|deposit(?:ed)?|refund(?:ed)?|cashback|salary)\b[^|.;]{0,40}?\b(?:from|by)\s+(?:VPA\s+)?([A-Za-z][A-Za-z0-9\s&.'_@-]{1,35})/i,
      // Generic "from <Sender>" or "by <Sender>" (safe now that bank accounts & amounts are filtered)
      /\b(?:from|by)\s+(?:VPA\s+)?([A-Za-z][A-Za-z0-9\s&.'_@-]{1,35})/i,
    ];

    for (const pat of creditPatterns) {
      const match = stripped.match(pat);
      if (match) {
        const rawMatch = match[1].trim();
        if (rawMatch.includes('@')) {
          const vpaName = parseVpaToName(rawMatch);
          if (vpaName) return vpaName;
        }
        const candidate = cleanAndValidateMerchant(rawMatch);
        if (candidate) return candidate;
      }
    }
  }

  // 5. Fallback: Check any UPI VPA anywhere in the message
  const vpaMatch = text.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9]+)/);
  if (vpaMatch) {
    const vpaName = parseVpaToName(vpaMatch[1]);
    if (vpaName) return vpaName;
  }

  // 6. Clean fallback based on transaction type
  if (type === 'credit') {
    if (/\bsalary\b/i.test(text)) return 'Salary Credit';
    if (/\b(?:refund|reversal)\b/i.test(text)) return 'Refund Received';
    if (/\bcashback\b/i.test(text)) return 'Cashback Received';
    return 'Money Received';
  }

  if (/\batm\b|\bwithdrawn\b|\bcash\s+withdrawal\b/i.test(text)) {
    return 'ATM Withdrawal';
  }

  return 'UPI Payment';
}

function identifyBank(sender: string, body: string): string {
  // Check sender ID
  const senderUpper = sender.replace(/[^A-Za-z]/g, '').toUpperCase();
  for (const [key, bankName] of Object.entries(BANK_SENDERS)) {
    if (senderUpper.includes(key)) return bankName;
  }

  // Check body content for bank names
  const bankBodyPatterns: [RegExp, string][] = [
    [/\bSBI\b|State Bank of India/i, 'SBI'],
    [/\bHDFC\b/i, 'HDFC'],
    [/\bICICI\b/i, 'ICICI'],
    [/\bAxis\b/i, 'Axis'],
    [/\bKotak\b/i, 'Kotak'],
    [/\bPNB\b|Punjab National/i, 'PNB'],
    [/\bCanara\b/i, 'Canara Bank'],
    [/\bUnion Bank/i, 'Union Bank'],
    [/\bBOB\b|Bank of Baroda/i, 'BOB'],
    [/\bBOI\b|Bank of India/i, 'BOI'],
    [/\bIDFC/i, 'IDFC First'],
    [/\bYes Bank/i, 'Yes Bank'],
    [/\bRBL/i, 'RBL Bank'],
    [/\bFederal/i, 'Federal Bank'],
    [/\bIndusInd/i, 'IndusInd'],
    [/\bIDBI/i, 'IDBI'],
    [/\bPaytm/i, 'Paytm'],
    [/\bPhonePe/i, 'PhonePe'],
    [/\bGPay|Google Pay/i, 'Google Pay'],
    [/\bAmazon Pay/i, 'Amazon Pay'],
  ];

  for (const [pat, name] of bankBodyPatterns) {
    if (pat.test(body)) return name;
  }

  return 'Bank';
}



export function parseSMS(body: string, sender: string, dateStr: string): ParsedTransaction | null {
  if (!isTransactionalSMS(body)) return null;

  const amount = parseAmount(body);
  if (!amount) return null;

  const type = parseType(body);
  const merchant = parseMerchant(body, type);
  const source = identifyBank(sender, body);
  const smsHash = hashSMS(body, dateStr);

  // Use the SMS received timestamp dateStr (YYYY-MM-DD) as primary date since it's always accurate from Android SMS cursor
  let date = dateStr;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    date = new Date().toISOString().split('T')[0];
  }

  return { amount, merchant, date, type, source, smsHash, rawBody: body };
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
