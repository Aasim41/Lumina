import { useState, useCallback, useEffect } from 'react';
import { getUserProfile, loginWithGoogle } from '@/lib/api';
import { getToken, setToken, removeToken, isAuthenticated as isAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';

export function useAuth() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchUser = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const data = await getUserProfile();
      setUser(data);
    } catch (e) {
      console.error("Failed to load user profile", e);
      // If unauthorized, token is cleared by api Fetch
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const login = useCallback(async (token?: string) => {
    try {
      setLoading(true);
      const res = await loginWithGoogle(token || 'dev-mode');
      setToken(res.access_token);
      await fetchUser();
      // Only redirect if they have a name set (not the default dev-mode one which needs onboarding)
      // Actually we will let OnboardingModal handle them if they don't have budget/age set.
      router.push('/');
    } catch (e) {
      console.error('Login failed', e);
    } finally {
      setLoading(false);
    }
  }, [fetchUser, router]);

  const handleLogout = useCallback(() => {
    removeToken();
    setUser(null);
    router.push('/login');
  }, [router]);

  return {
    user,
    isAuthenticated: isAuth(),
    login,
    logout: handleLogout,
    loading,
    refreshUser: fetchUser
  };
}
