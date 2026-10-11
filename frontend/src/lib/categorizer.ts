export const CATEGORIES: string[] = [
  'Food & Dining',
  'Entertainment',
  'Shopping',
  'Transport',
  'Utilities',
  'Housing',
  'Health & Fitness',
  'Savings',
  'Miscellaneous',
];

const EXACT_LOOKUP = new Map<string, string>([
  ['Zomato', 'Food & Dining'], ['Swiggy', 'Food & Dining'], ['McDonalds', 'Food & Dining'], ['Dominos', 'Food & Dining'],
  ['Pizza Hut', 'Food & Dining'], ['Starbucks', 'Food & Dining'], ['KFC', 'Food & Dining'], ['Subway', 'Food & Dining'],
  ['Burger King', 'Food & Dining'], ['Haldirams', 'Food & Dining'], ['Barbeque Nation', 'Food & Dining'],
  ['Chai Point', 'Food & Dining'], ['Chaayos', 'Food & Dining'], ['Dunkin', 'Food & Dining'], ['Baskin Robbins', 'Food & Dining'],
  ['Blinkit', 'Food & Dining'], ['Zepto', 'Food & Dining'], ['BigBasket', 'Food & Dining'], ['EatSure', 'Food & Dining'],
  ['Behrouz Biryani', 'Food & Dining'], ['Faasos', 'Food & Dining'], ['Amul', 'Food & Dining'], ['Mother Dairy', 'Food & Dining'],

  ['Netflix', 'Entertainment'], ['Spotify', 'Entertainment'], ['Amazon Prime', 'Entertainment'], ['Hotstar', 'Entertainment'],
  ['JioCinema', 'Entertainment'], ['YouTube Premium', 'Entertainment'], ['BookMyShow', 'Entertainment'],
  ['PVR Cinemas', 'Entertainment'], ['PVR', 'Entertainment'], ['INOX', 'Entertainment'], ['Sony LIV', 'Entertainment'],
  ['ZEE5', 'Entertainment'], ['Apple Music', 'Entertainment'], ['Steam', 'Entertainment'],

  ['Amazon', 'Shopping'], ['Flipkart', 'Shopping'], ['Myntra', 'Shopping'], ['Ajio', 'Shopping'], ['Meesho', 'Shopping'],
  ['Nykaa', 'Shopping'], ['Decathlon', 'Shopping'], ['IKEA', 'Shopping'], ['H&M', 'Shopping'], ['Zara', 'Shopping'],
  ['Zudio', 'Shopping'], ['Westside', 'Shopping'], ['Pantaloons', 'Shopping'], ['Nike', 'Shopping'],
  ['Reliance Digital', 'Shopping'], ['Reliance Smart', 'Shopping'], ['DMart', 'Shopping'], ['Dmart Avenue', 'Shopping'],
  ['Croma', 'Shopping'], ['Vijay Sales', 'Shopping'], ['Lenskart', 'Shopping'], ['FirstCry', 'Shopping'],

  ['Uber', 'Transport'], ['Ola', 'Transport'], ['Rapido', 'Transport'], ['Namma Yatri', 'Transport'],
  ['Metro', 'Transport'], ['IRCTC', 'Transport'], ['RedBus', 'Transport'], ['MakeMyTrip', 'Transport'],
  ['Goibibo', 'Transport'], ['IndiGo', 'Transport'], ['Air India', 'Transport'], ['Yulu', 'Transport'],
  ['Bounce', 'Transport'], ['Shell Petrol', 'Transport'], ['HP Petrol', 'Transport'], ['Indian Oil', 'Transport'],
  ['Bharat Petroleum', 'Transport'],

  ['Jio', 'Utilities'], ['Airtel', 'Utilities'], ['Vi', 'Utilities'], ['BSNL', 'Utilities'],
  ['Electricity Board', 'Utilities'], ['Water Board', 'Utilities'], ['Gas', 'Utilities'], ['Tata Power', 'Utilities'],
  ['Adani Electricity', 'Utilities'], ['Broadband', 'Utilities'], ['ACT Fibernet', 'Utilities'], ['Tata Play', 'Utilities'],
  ['BillDesk', 'Utilities'],

  ['Rent', 'Housing'], ['Housing Society', 'Housing'], ['Maintenance', 'Housing'], ['Property Tax', 'Housing'],
  ['Home Loan EMI', 'Housing'], ['NoBroker', 'Housing'], ['Urban Company', 'Housing'], ['Stanza Living', 'Housing'],

  ['Gym', 'Health & Fitness'], ['Cult Fit', 'Health & Fitness'], ['Apollo Pharmacy', 'Health & Fitness'],
  ['Netmeds', 'Health & Fitness'], ['PharmEasy', 'Health & Fitness'], ['1mg', 'Health & Fitness'],
  ['Tata 1mg', 'Health & Fitness'], ['MedPlus', 'Health & Fitness'], ['Practo', 'Health & Fitness'],

  ['Zerodha', 'Savings'], ['Groww', 'Savings'], ['Upstox', 'Savings'], ['Angel One', 'Savings'],
  ['LIC', 'Savings'], ['INDmoney', 'Savings'], ['Kuvera', 'Savings'],

  ['ATM Withdrawal', 'Miscellaneous'], ['Bank Transfer', 'Miscellaneous'], ['Cash', 'Miscellaneous'],
  ['UPI', 'Miscellaneous'], ['UPI Payment', 'Miscellaneous'],
]);

const EXACT_LOOKUP_LOWER = new Map<string, string>();
EXACT_LOOKUP.forEach((val, key) => {
  EXACT_LOOKUP_LOWER.set(key.toLowerCase(), val);
});

const CATEGORY_PATTERNS: [RegExp, string][] = [
  [
    /swiggy|zomato|eatsure|magicpin|blinkit|zepto|instamart|bigbasket|dunzo|food|restaurant|restro|bistro|cafe|coffee|tea\b|chai|starbucks|ccd|barista|mcdonald|mcd\b|domino|pizza|burger|kfc|subway|wendy|taco|haldiram|bikanervala|barbeque|bbq|biryani|behrouz|faasos|ovenstory|box8|wow\s*momo|chaayos|dunkin|baskin|naturals?\s*ice|amul|mother\s*dairy|dairy|milk|bakery|bakers|cake|pastry|sweet|sweets|mithai|namkeen|snacks|tiffin|mess\b|canteen|dhaba|hotel|bhojanalaya|rasoi|kitchen|dining|dineout|eazy\s*diner|juice|lassi|shawarma|roll|momos|panipuri|chaat|tadka|thali|dosa|idli|samosa|kachori|kebabs?|tandoor/i,
    'Food & Dining',
  ],
  [
    /uber|ola|rapido|namma\s*yatri|blu\s*smart|meru|indrive|porter|metro|dmrc|bmrc|cmrl|mmrda|irctc|railway|indian\s*rail|rail\b|redbus|abhibus|bus\b|makemytrip|goibibo|cleartrip|easemytrip|ixigo|yatra|indigo|air\s*india|vistara|spicejet|akasa|flight|airline|airport|yulu|bounce|vogo|zoomcar|revv|fastag|nhai|toll|petrol|diesel|fuel|filling\s*station|service\s*station|indian\s*oil|iocl|bharat\s*petroleum|bpcl|hindustan\s*petroleum|hpcl|\bhp\s*pay|shell|nayara|jio\s*bp|essar|cng|auto\s*rickshaw|cab\b|taxi|parking|garage|tyre|car\s*wash/i,
    'Transport',
  ],
  [
    /amazon|flipkart|myntra|ajio|meesho|nykaa|tatacliq|snapdeal|shopclues|jiomart|dmart|d-mart|avenue\s*supermarts|reliance\s*(?:smart|fresh|digital|trends|retail)|more\s*retail|spencer|star\s*bazaar|vishal\s*mega|big\s*bazaar|zudio|westside|pantaloons|lifestyle|shoppers\s*stop|max\s*fashion|h&m|zara|uniqlo|decathlon|ikea|pepperfry|urban\s*ladder|firstcry|lenskart|titan|tanishq|kalyan\s*jewel|malabar\s*gold|croma|vijay\s*sales|poorvika|sangeetha|kirana|general\s*store|supermarket|hypermarket|provision|grocery|groceries|mart\b|store\b|shop\b|mall\b|fashion|garments|textiles|apparel|footwear|shoes|bata|khadi|stationery|book\s*depot|xerox|fancy\s*store|emart|bazar|bazaar/i,
    'Shopping',
  ],
  [
    /netflix|spotify|prime\s*video|amazon\s*prime|hotstar|disney|jiocinema|sonyliv|zee5|aha\b|hoichoi|voot|youtube|yt\s*premium|apple\s*(?:music|tv|one)|gaana|wynk|jiosaavn|audible|kindle|bookmyshow|paytm\s*insider|district|pvr|inox|cinepolis|miraj|carnival\s*cinema|movie|cinema|theatre|multiplex|steam|playstation|psn|xbox|nintendo|epic\s*games|riot|valorant|bgmi|pubg|dream11|mpl|my11circle|zupee|winzo|gaming|game|arcade|bowling|smaaash|timezone|wonderla|imagica|amusement|club\b|pub\b|lounge/i,
    'Entertainment',
  ],
  [
    /apollo|pharmeasy|netmeds|1mg|tata\s*1mg|medplus|wellness\s*forever|frank\s*ross|pharmacy|pharma|medical|medicos|chemist|druggist|medicine|hospital|clinic|nursing\s*home|healthcare|fortis|max\s*health|manipal|narayana|medanta|aiims|aster|kauvery|kims|care\s*hospital|cloudnine|motherhood|practo|lybrate|mfine|dr\s*lal|lal\s*path|thyrocare|metropolis|srl\s*diag|vijaya\s*diag|diagnostic|pathology|lab\b|scan|x-?ray|mri|dental|dentist|eye\s*care|optical|doctor|dr\.\s|gym|cult\.?fit|cure\.?fit|gold'?s\s*gym|anytime\s*fitness|fitness|yoga|zumba|nutrition|healthkart|muscleblaze|protein|salon|spa\b|barber|parlour/i,
    'Health & Fitness',
  ],
  [
    /jio|rjio|airtel|bharti|vodafone|\bvi\b|bsnl|mtnl|act\s*fibernet|hathway|tikona|excitel|tata\s*play|tata\s*sky|dish\s*tv|d2h|sun\s*direct|recharge|prepaid|postpaid|broadband|wifi|internet|fiber|electricity|bescom|mseb|mahadiscom|tsspdcl|tneb|tangedco|uppcl|wbsetcl|bses|tata\s*power|adani\s*elec|torrent\s*power|cesc|power\s*corp|electric|water\s*board|bwssb|djb|hmwssb|indane|bharat\s*gas|hp\s*gas|mahanagar\s*gas|igl|adani\s*gas|gujarat\s*gas|lpg|cylinder|gas\s*agency|billdesk|bbps|bharat\s*bill|ebill|utility|municipal/i,
    'Utilities',
  ],
  [
    /rent\b|house\s*rent|room\s*rent|pg\b|paying\s*guest|hostel|stanza\s*living|zolostays|colive|nestaway|nobroker|magicbricks|99acres|housing\.com|mygate|adda|apnacomplex|society|maintenance|home\s*loan|housing\s*loan|hdfc\s*ltd|lic\s*housing|property\s*tax|plumber|electrician|carpenter|urban\s*company|urbanclap|laundry|dry\s*clean|tumbledry/i,
    'Housing',
  ],
  [
    /zerodha|groww|upstox|angel\s*one|angel\s*broking|5paisa|icici\s*direct|hdfc\s*sec|kotak\s*sec|motilal|sharekhan|edelweiss|paytm\s*money|et\s*money|kuvera|coin\b|indmoney|smallcase|mutual\s*fund|sip\b|nippon|sbi\s*mf|hdfc\s*mf|icici\s*pru|axis\s*mf|mirae|parag\s*parikh|quant\s*mf|uti\s*mf|dsp\s*mf|aditya\s*birla|lic\b|life\s*insurance|star\s*health|hdfc\s*ergo|icici\s*lombard|bajaj\s*allianz|max\s*life|sbi\s*life|tata\s*aia|policybazaar|ditto|insurance|premium|ppf\b|nps\b|epfo|fixed\s*deposit|recurring\s*deposit|gold\s*bond|jar\s*app|gullak|invest/i,
    'Savings',
  ],
];

export function categorize(
  merchantName: string,
  type?: 'debit' | 'credit',
  rawText?: string
): string {
  const combinedForCredit = `${merchantName || ''} ${rawText || ''}`;

  if (type === 'credit') {
    if (/\b(?:refund|cashback|reversal|reversed)\b/i.test(combinedForCredit)) {
      return 'Refund';
    }
    if (/\b(?:salary|stipend|payroll|wages)\b/i.test(combinedForCredit)) {
      return 'Salary';
    }
    return 'Income';
  }

  if (!merchantName) return 'Miscellaneous';

  const cleanLower = merchantName.toLowerCase().trim();
  const exactMatch = EXACT_LOOKUP_LOWER.get(cleanLower);
  if (exactMatch) {
    return exactMatch;
  }

  // First test against extracted merchant name
  for (const [pattern, category] of CATEGORY_PATTERNS) {
    if (pattern.test(merchantName)) {
      return category;
    }
  }

  // Secondary check: test against raw SMS body if available (for cases where merchant name is generic like "Paytm Merchant" or VPA)
  if (rawText) {
    for (const [pattern, category] of CATEGORY_PATTERNS) {
      if (pattern.test(rawText)) {
        return category;
      }
    }
  }

  return 'Miscellaneous';
}

export function categorizeBatch(merchants: string[]): string[] {
  return merchants.map(m => categorize(m));
}
