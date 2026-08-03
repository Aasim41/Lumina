import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export function useAuth() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchUser = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setUser(null);
        setLoading(false);
        return;
      }

      // Fetch profile from profiles table
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Failed to fetch profile:', error);
      }

      if (profile) {
        setUser({
          ...profile,
          email: session.user.email || profile.email,
          avatar_url: profile.avatar_url || session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture,
          name: profile.name || session.user.user_metadata?.full_name || session.user.user_metadata?.name || '',
        });
      } else {
        // Profile doesn't exist yet (trigger may not have fired), create it
        const newProfile = {
          id: session.user.id,
          name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || '',
          email: session.user.email || '',
          avatar_url: session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture || null,
          vault_balance: 0,
          preferred_currency: 'INR',
          current_streak: 0,
          unlocked_badges: '[]',
          created_at: new Date().toISOString(),
        };
        const { data: created } = await supabase.from('profiles').upsert(newProfile).select().single();
        setUser(created || newProfile);
      }
    } catch (e) {
      console.error('Auth fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();

    // Listen for auth state changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        await fetchUser();
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchUser]);

  const signInWithGoogle = useCallback(async (): Promise<boolean> => {
    try {
      setLoading(true);
      const { signInWithGoogle: doGoogleSignIn } = await import('@/lib/auth');
      await doGoogleSignIn();
      return true; // OAuth redirects, so this may not execute
    } catch (e: any) {
      console.error('Google sign-in failed', e);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const handleLogout = useCallback(async () => {
    const { logout: doLogout } = await import('@/lib/auth');
    setUser(null);
    await doLogout();
  }, []);

  const isAuthenticated = !!user;

  return {
    user,
    isAuthenticated,
    login: signInWithGoogle,  // Keep 'login' name for backward compat
    signInWithGoogle,
    logout: handleLogout,
    loading,
    refreshUser: fetchUser
  };
}
