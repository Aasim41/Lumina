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
  const date = new Date(parseInt(year), parseInt(month) - 1, 1);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    year: 'numeric'
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
