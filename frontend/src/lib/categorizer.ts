export const CATEGORIES: string[] = [
  'Food & Dining',
  'Entertainment',
  'Shopping',
  'Transport',
  'Utilities',
  'Housing',
  'Health & Fitness',
  'Miscellaneous'
];

const EXACT_LOOKUP = new Map<string, string>([
  ['Zomato', 'Food & Dining'], ['Swiggy', 'Food & Dining'], ['McDonalds', 'Food & Dining'], ['Dominos', 'Food & Dining'], ['Pizza Hut', 'Food & Dining'], ['Starbucks', 'Food & Dining'], ['KFC', 'Food & Dining'], ['Subway', 'Food & Dining'], ['Burger King', 'Food & Dining'], ['Haldirams', 'Food & Dining'], ['Barbeque Nation', 'Food & Dining'], ['Chai Point', 'Food & Dining'], ['Dunkin', 'Food & Dining'], ['Baskin Robbins', 'Food & Dining'],
  ['Netflix', 'Entertainment'], ['Spotify', 'Entertainment'], ['Amazon Prime', 'Entertainment'], ['Hotstar', 'Entertainment'], ['YouTube Premium', 'Entertainment'], ['BookMyShow', 'Entertainment'], ['PVR Cinemas', 'Entertainment'], ['INOX', 'Entertainment'], ['Sony LIV', 'Entertainment'], ['Apple Music', 'Entertainment'],
  ['Amazon', 'Shopping'], ['Flipkart', 'Shopping'], ['Myntra', 'Shopping'], ['Ajio', 'Shopping'], ['Meesho', 'Shopping'], ['Nykaa', 'Shopping'], ['Decathlon', 'Shopping'], ['IKEA', 'Shopping'], ['H&M', 'Shopping'], ['Zara', 'Shopping'], ['Nike', 'Shopping'], ['Reliance Digital', 'Shopping'], ['Croma', 'Shopping'],
  ['Uber', 'Transport'], ['Ola', 'Transport'], ['Rapido', 'Transport'], ['Metro', 'Transport'], ['IRCTC', 'Transport'], ['MakeMyTrip', 'Transport'], ['Goibibo', 'Transport'], ['Yulu', 'Transport'], ['Bounce', 'Transport'], ['Shell Petrol', 'Transport'], ['HP Petrol', 'Transport'], ['Indian Oil', 'Transport'],
  ['Jio', 'Utilities'], ['Airtel', 'Utilities'], ['Vi', 'Utilities'], ['BSNL', 'Utilities'], ['Electricity Board', 'Utilities'], ['Water Board', 'Utilities'], ['Gas', 'Utilities'], ['Tata Power', 'Utilities'], ['Adani Electricity', 'Utilities'], ['Broadband', 'Utilities'],
  ['Rent', 'Housing'], ['Housing Society', 'Housing'], ['Maintenance', 'Housing'], ['Property Tax', 'Housing'], ['Home Loan EMI', 'Housing'], ['NoBroker', 'Housing'],
  ['Gym', 'Health & Fitness'], ['Cult Fit', 'Health & Fitness'], ['Apollo Pharmacy', 'Health & Fitness'], ['Netmeds', 'Health & Fitness'], ['PharmEasy', 'Health & Fitness'], ['1mg', 'Health & Fitness'], ['Practo', 'Health & Fitness'], ['Lenskart', 'Health & Fitness'],
  ['ATM Withdrawal', 'Miscellaneous'], ['Bank Transfer', 'Miscellaneous'], ['Cash', 'Miscellaneous'], ['UPI', 'Miscellaneous']
]);

const EXACT_LOOKUP_LOWER = new Map<string, string>();
EXACT_LOOKUP.forEach((val, key) => {
  EXACT_LOOKUP_LOWER.set(key.toLowerCase(), val);
});

function basicCategorize(merchant: string): string {
  const lower = merchant.toLowerCase();
  if (['zomato', 'swiggy', 'mcdonalds', 'kfc', 'pizza', 'restaurant'].some(x => lower.includes(x))) {
    return 'Food & Dining';
  } else if (['netflix', 'spotify', 'amazon prime', 'hotstar', 'movie', 'cinema'].some(x => lower.includes(x))) {
    return 'Entertainment';
  } else if (['amazon', 'flipkart', 'myntra', 'shopping', 'store', 'mall'].some(x => lower.includes(x))) {
    return 'Shopping';
  } else if (['uber', 'ola', 'irctc', 'petrol', 'flight', 'railway', 'transport'].some(x => lower.includes(x))) {
    return 'Transport';
  } else if (['jio', 'airtel', 'electricity', 'water', 'gas', 'recharge'].some(x => lower.includes(x))) {
    return 'Utilities';
  } else if (['rent', 'maintenance', 'housing', 'broker'].some(x => lower.includes(x))) {
    return 'Housing';
  } else if (['gym', 'pharmacy', 'hospital', 'doctor', 'med'].some(x => lower.includes(x))) {
    return 'Health & Fitness';
  }
  return 'Miscellaneous';
}

export function categorize(merchantName: string): string {
  if (!merchantName) return 'Miscellaneous';
  const exactMatch = EXACT_LOOKUP_LOWER.get(merchantName.toLowerCase());
  if (exactMatch) {
    return exactMatch;
  }
  return basicCategorize(merchantName);
}

export function categorizeBatch(merchants: string[]): string[] {
  return merchants.map(categorize);
}
