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

  const login = useCallback(async (data: { name: string, age: number, dob: string, monthly_budget: number }) => {
    try {
      setLoading(true);
      const res = await guestLogin(data);
      setToken(res.access_token);
      await fetchUser();
      window.location.href = '/create-avatar/';
    } catch (e: any) {
      console.error('Login failed', e);
      alert('Login error: ' + (e.message || String(e)));
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
