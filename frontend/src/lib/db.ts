import Dexie, { type Table } from 'dexie';

// ── Type definitions ──────────────────────────────────────────────

export interface DBUser {
  id?: string;
  name: string;
  email: string;
  age?: number;
  dob?: string;            // ISO date string
  monthly_budget?: number;
  budget_days?: number;
  last_budget_update?: string;
  vault_balance: number;
  preferred_currency: string;
  user_persona?: string;
  current_streak: number;
  last_logged_date?: string;
  unlocked_badges: string;  // JSON string array
  avatar_url?: string;
  groq_api_key?: string;
  created_at: string;       // ISO datetime
}

export interface DBTransaction {
  id?: string;
  date: string;             // ISO date string  YYYY-MM-DD
  merchant_raw: string;
  merchant_clean: string;
  amount: number;
  currency: string;
  original_amount?: number;
  category: string;
  source: string;           // 'csv_upload' | 'manual_entry' | 'receipt_scan' | 'auto_stealth'
  created_at: string;
}

export interface DBSubscription {
  id?: string;
  merchant: string;
  amount: number;
  billing_day: number;
  created_at: string;
}

export interface DBCategoryBudget {
  id?: string;
  category: string;
  amount: number;
  rollover_balance: number;
  month_updated?: string;   // ISO date – first of month
  created_at: string;
}

export interface DBWishlistItem {
  id?: string;
  name: string;
  price: number;
  priority: string;         // 'high' | 'medium' | 'low'
  is_purchased: string;     // 'true' | 'false'
  image_url?: string;
  link_url?: string;
  created_at: string;
}

export interface DBSplitBill {
  id?: string;
  title: string;
  total_amount: number;
  date: string;
  category: string;
  payer_name: string;
  created_at: string;
}

export interface DBSplitMember {
  id?: string;
  bill_id: string;
  name: string;
  share_amount: number;
  is_paid: string;          // 'true' | 'false'
  created_at: string;
}

export interface DBDebt {
  id?: string;
  name: string;
  total_amount: number;
  paid_amount: number;
  interest_rate?: number;
  next_emi_date?: string;
  created_at: string;
}

export interface DBInvestment {
  id?: string;
  name: string;
  ticker?: string;
  asset_class: string;
  quantity: number;
  average_buy_price: number;
  invested_amount: number;
  created_at: string;
}

export interface DBGoal {
  id?: string;
  name: string;
  target_amount: number;
  saved_amount: number;
  target_date?: string;
  icon: string;
  created_at: string;
}

// ── Database class ────────────────────────────────────────────────

class SmartExpenseDB extends Dexie {
  users!: Table<DBUser, string>;
  transactions!: Table<DBTransaction, string>;
  subscriptions!: Table<DBSubscription, string>;
  categoryBudgets!: Table<DBCategoryBudget, string>;
  wishlistItems!: Table<DBWishlistItem, string>;
  splitBills!: Table<DBSplitBill, string>;
  splitMembers!: Table<DBSplitMember, string>;
  debts!: Table<DBDebt, string>;
  investments!: Table<DBInvestment, string>;
  goals!: Table<DBGoal, string>;

  constructor() {
    super('SmartExpenseDB');

    this.version(1).stores({
      users:           'id',
      transactions:    'id, date, category, merchant_clean, source',
      subscriptions:   'id',
      categoryBudgets: 'id, category',
      wishlistItems:   'id',
      splitBills:      'id',
      splitMembers:    'id, bill_id',
      debts:           'id',
      investments:     'id',
      goals:           'id',
    });
  }
}

// Singleton instance
export const db = new SmartExpenseDB();

// ── Helpers ───────────────────────────────────────────────────────

export function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback UUID v4
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function nowISO(): string {
  return new Date().toISOString();
}

export function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}
