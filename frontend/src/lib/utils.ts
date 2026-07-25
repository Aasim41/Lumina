import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(date);
}

export function formatMonth(monthStr: string): string {
  // expects "YYYY-MM"
  const [year, month] = monthStr.split('-');
  const date = new Date(Date.UTC(parseInt(year, 10), parseInt(month, 10) - 1, 1));
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC'
  }).format(date);
}

export const CATEGORY_COLORS: Record<string, string> = {
  "Food & Dining": "#f97316", // cat-food
  "Entertainment": "#a855f7", // cat-entertainment
  "Shopping": "#3b82f6", // cat-shopping
  "Transport": "#06b6d4", // cat-transport
  "Utilities": "#eab308", // cat-utilities
  "Housing": "#ec4899", // cat-housing
  "Health & Fitness": "#0ea5e9", // sky blue instead of green
  "Savings": "#6366f1", // indigo instead of emerald green
  "Miscellaneous": "#64748b", // cat-misc
};

export function getCategoryColor(category: string): string {
  return CATEGORY_COLORS[category] || CATEGORY_COLORS["Miscellaneous"];
}

export function getCategoryIcon(category: string): string {
  const icons: Record<string, string> = {
    "Food & Dining": "utensils",
    "Entertainment": "film",
    "Shopping": "shopping-bag",
    "Transport": "car",
    "Utilities": "zap",
    "Housing": "home",
    "Health & Fitness": "heart-pulse",
    "Savings": "piggy-bank",
    "Miscellaneous": "circle-ellipsis"
  };
  return icons[category] || "circle-ellipsis";
}

// Persona configurations
export const PERSONA_CONFIGS: Record<string, {
  label: string;
  icon: string;
  color: string;
  categories: string[];
  budgetRange: [number, number];
  budgetPlaceholder: string;
  quickActions: string[];
}> = {
  hostel_student: {
    label: 'Hostel Student',
    icon: '🎓',
    color: '#f59e0b',
    categories: ['Mess & Food', 'Canteen & Snacks', 'Transport', 'Books & Xerox', 'Stationery', 'Laundry', 'Entertainment', 'Miscellaneous'],
    budgetRange: [3000, 12000],
    budgetPlaceholder: '8000',
    quickActions: ['Split Bill', 'Canteen', 'Books'],
  },
  school_student: {
    label: 'School Student',
    icon: '🎒',
    color: '#3b82f6',
    categories: ['School Fees', 'Stationery', 'Snacks & Tiffin', 'Transport / Bus', 'Hobbies & Gaming', 'Books', 'Entertainment', 'Miscellaneous'],
    budgetRange: [1000, 5000],
    budgetPlaceholder: '3000',
    quickActions: ['Snacks', 'Stationery', 'Gaming'],
  },
  unmarried_employee: {
    label: 'Single Professional',
    icon: '💻',
    color: '#8b5cf6',
    categories: ['Food & Dining', 'Rent & Maintenance', 'Subscriptions', 'Transport', 'Shopping', 'Outings', 'SIP / Investments', 'Bills & Utilities', 'Healthcare', 'Entertainment', 'Miscellaneous'],
    budgetRange: [25000, 90000],
    budgetPlaceholder: '50000',
    quickActions: ['Subscriptions', 'Save Money', 'Split Bill'],
  },
  married_employee: {
    label: 'Family',
    icon: '🏠',
    color: '#10b981',
    categories: ['Groceries & Provisions', 'Home Loan / Rent', 'Electricity & Bills', 'Insurance & Health', 'Child Education', 'Transport', 'Shopping', 'Entertainment', 'Family Emergency', 'SIP / Investments', 'Miscellaneous'],
    budgetRange: [50000, 200000],
    budgetPlaceholder: '100000',
    quickActions: ['Groceries', 'Bills', 'EMI'],
  },
};
