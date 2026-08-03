import { supabase } from './supabase';
import { appNavigate } from './utils';

export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
}

export const isAuthenticated = async (): Promise<boolean> => {
  const { data: { session } } = await supabase.auth.getSession();
  return !!session;
};

// Synchronous check for guards that can't await
export const isAuthenticatedSync = (): boolean => {
  if (typeof window === 'undefined') return false;
  return !!localStorage.getItem('sb-auth-token');
};

export const getToken = async (): Promise<string | null> => {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || null;
};

export const signInWithGoogle = async () => {
  const { Capacitor } = await import('@capacitor/core');
  const isNative = Capacitor.isNativePlatform();
  const redirectUrl = isNative 
    ? 'com.lumina.smartexpense://login-callback' 
    : (typeof window !== 'undefined' ? window.location.origin + '/' : undefined);

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectUrl,
      skipBrowserRedirect: isNative, // Important: tell Supabase to just return the URL natively
    }
  });
  if (error) throw error;

  if (isNative && data?.url) {
    const { Browser } = await import('@capacitor/browser');
    await Browser.open({ url: data.url });
  }

  return data;
};

export const getUser = async (): Promise<User | null> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  return {
    id: user.id,
    email: user.email || '',
    name: user.user_metadata?.full_name || user.user_metadata?.name || '',
    avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || undefined
  };
};

export const logout = async () => {
  await supabase.auth.signOut();
  if (typeof window !== 'undefined') {
    // Clear any cached data
    localStorage.removeItem('lumina_user');
    localStorage.removeItem('lumina_summary');
    localStorage.removeItem('lumina_categories');
    localStorage.removeItem('lumina_trends');
    localStorage.removeItem('lumina_subs');
    localStorage.removeItem('lumina_transactions');
    appNavigate('/login');
  }
};

// Keep these for backward compat but make them no-ops
export const setLoggedIn = () => {};
export const setToken = (_token: string) => {};
export const removeToken = () => {};
export const setUser = (_user: User) => {};
