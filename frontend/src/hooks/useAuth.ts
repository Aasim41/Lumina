import { useState, useCallback, useEffect } from 'react';
import { getUserProfile, guestLogin } from '@/lib/api';
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
      if (typeof window !== 'undefined' && data?.preferred_currency) {
        localStorage.setItem('preferred_currency', data.preferred_currency);
      }
    } catch (e) {
      console.error("Failed to load user profile", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  // login now returns true/false so the caller controls the redirect
  const login = useCallback(async (data: { name: string, age: number, dob: string, monthly_budget: number }): Promise<boolean> => {
    try {
      setLoading(true);
      const res = await guestLogin(data);
      setToken(res.access_token);
      await fetchUser();
      return true;
    } catch (e: any) {
      console.error('Login failed', e);
      alert('Login error: ' + (e.message || String(e)));
      return false;
    } finally {
      setLoading(false);
    }
  }, [fetchUser]);

  const handleLogout = useCallback(() => {
    removeToken();
    setUser(null);
    window.location.replace('/login/index.html');
  }, []);

  return {
    user,
    isAuthenticated: isAuth(),
    login,
    logout: handleLogout,
    loading,
    refreshUser: fetchUser
  };
}
