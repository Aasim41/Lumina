import { db } from './db';
import { appNavigate } from './utils';

export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
}

/**
 * Check if a user profile exists in IndexedDB.
 */
export const isAuthenticated = (): boolean => {
  if (typeof window === 'undefined') return false;
  return !!localStorage.getItem('lumina_logged_in');
};

/**
 * Mark the user as logged in (called after profile is saved to Dexie).
 */
export const setLoggedIn = () => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('lumina_logged_in', 'true');
  }
};

/**
 * Legacy compat — components that call getToken() for auth checks.
 * Returns a truthy string if logged in, null if not.
 */
export const getToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('lumina_logged_in') ? 'local' : null;
};

/** No-op for backward compat */
export const setToken = (_token: string) => {
  setLoggedIn();
};

/** No-op for backward compat */
export const removeToken = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('lumina_logged_in');
  }
};

export const getUser = (): User | null => {
  if (typeof window === 'undefined') return null;
  const userStr = localStorage.getItem('lumina_user');
  if (!userStr) return null;
  try {
    return JSON.parse(userStr);
  } catch {
    return null;
  }
};

export const setUser = (user: User) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('lumina_user', JSON.stringify(user));
  }
};

export const logout = async () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('lumina_logged_in');
    localStorage.removeItem('lumina_user');
    localStorage.removeItem('lumina_summary');
    localStorage.removeItem('lumina_categories');
    localStorage.removeItem('lumina_trends');
    localStorage.removeItem('lumina_subs');
    localStorage.removeItem('lumina_transactions');
    localStorage.removeItem('token');

    // Clear all IndexedDB tables
    try {
      await db.users.clear();
      await db.transactions.clear();
      await db.subscriptions.clear();
      await db.categoryBudgets.clear();
      await db.wishlistItems.clear();
      await db.splitBills.clear();
      await db.splitMembers.clear();
      await db.debts.clear();
      await db.investments.clear();
      await db.goals.clear();
    } catch (e) {
      console.error('Failed to clear IndexedDB:', e);
    }

    appNavigate('/login');
  }
};
