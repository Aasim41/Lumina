import { useState, useCallback, useEffect } from 'react';
import { db, generateId, nowISO, todayISO } from '@/lib/db';
import { isAuthenticated as isAuth, setLoggedIn, setUser as setLocalUser } from '@/lib/auth';
import { useRouter } from 'next/navigation';

export function useAuth() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchUser = useCallback(async () => {
    if (!isAuth()) {
      setLoading(false);
      return;
    }
    
    // Load cached user instantly from localStorage
    const cachedUser = localStorage.getItem('lumina_user');
    if (cachedUser) {
      try {
        setUser(JSON.parse(cachedUser));
        setLoading(false);
      } catch (e) {}
    }
    
    // Then read fresh from IndexedDB
    try {
      const dbUser = await db.users.toCollection().first();
      if (dbUser) {
        const userData = {
          id: dbUser.id,
          email: dbUser.email,
          name: dbUser.name,
          avatar_url: dbUser.avatar_url,
          age: dbUser.age,
          dob: dbUser.dob,
          monthly_budget: dbUser.monthly_budget,
          last_budget_update: dbUser.last_budget_update,
          preferred_currency: dbUser.preferred_currency || 'INR',
          current_streak: dbUser.current_streak || 0,
          last_logged_date: dbUser.last_logged_date,
          unlocked_badges: dbUser.unlocked_badges || '[]',
          user_persona: dbUser.user_persona,
          vault_balance: dbUser.vault_balance || 0,
        };
        setUser(userData);
        localStorage.setItem('lumina_user', JSON.stringify(userData));
      }
    } catch (e) {
      console.error("Failed to load user profile from IndexedDB", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const login = useCallback(async (data: { name: string, age: number, dob: string, monthly_budget: number, user_persona?: string }): Promise<boolean> => {
    try {
      setLoading(true);
      const userId = generateId();
      const email = `local-${userId}@smartexpense.app`;

      const newUser = {
        id: userId,
        name: data.name,
        email: email,
        age: data.age,
        dob: data.dob,
        monthly_budget: data.monthly_budget,
        last_budget_update: todayISO(),
        vault_balance: 0,
        preferred_currency: 'INR',
        user_persona: data.user_persona || 'unmarried_employee',
        current_streak: 0,
        unlocked_badges: '[]',
        created_at: nowISO(),
      };

      await db.users.add(newUser);
      setLoggedIn();
      
      const userData = { ...newUser };
      setUser(userData);
      localStorage.setItem('lumina_user', JSON.stringify(userData));
      
      return true;
    } catch (e: any) {
      console.error('Login failed', e);
      alert('Login error: ' + (e.message || String(e)));
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

  return {
    user,
    isAuthenticated: isAuth(),
    login,
    logout: handleLogout,
    loading,
    refreshUser: fetchUser
  };
}
