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
    
    // Load cached user instantly (no network wait)
    const cachedUser = localStorage.getItem('lumina_user');
    if (cachedUser) {
      try {
        setUser(JSON.parse(cachedUser));
        setLoading(false); // Stop blocking UI immediately
      } catch (e) {}
    }
    
    // Then silently refresh from server in background
    try {
      const data = await getUserProfile();
      setUser(data);
      localStorage.setItem('lumina_user', JSON.stringify(data));
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
