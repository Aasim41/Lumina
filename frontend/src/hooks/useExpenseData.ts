import { useState, useEffect, useCallback, useRef } from 'react';
import { getSummary, getCategories, getTrends, getForecast, getSubscriptions } from '../lib/api';
import { isAuthenticated } from '../lib/auth';
import { scheduleDailyEveningRecap } from '../lib/notifications';
import { usePathname } from 'next/navigation';

export function useExpenseData() {
  const [summary, setSummary] = useState<any>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [trends, setTrends] = useState<any[]>([]);
  const [forecast, setForecast] = useState<any>(null);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pathname = usePathname();
  const hasLoadedRef = useRef(false);

  const fetchData = useCallback(async (silent = false) => {
    try {
      if (!isAuthenticated()) {
        setLoading(false);
        return;
      }

      if (!silent && !hasLoadedRef.current) {
        setLoading(true);
      }
      setError(null);
      
      const [sumData, catData, trendData, forecastData, subData] = await Promise.all([
        getSummary().catch(() => null),
        getCategories().catch(() => []),
        getTrends().catch(() => []),
        getForecast().catch(() => null),
        getSubscriptions().catch(() => []),
      ]);
      
      setSummary(sumData);
      setCategories(catData || []);
      setTrends(trendData || []);
      setForecast(forecastData);
      setSubscriptions(subData || []);
      hasLoadedRef.current = true;

      if (sumData) {
        scheduleDailyEveningRecap(sumData.spent_today, sumData.daily_allowance, sumData.today_tx_count);
      }
    } catch (err: any) {
      console.error('Dashboard data fetch error:', err);
      setError(err.message || 'Failed to fetch dashboard data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData, pathname]);

  useEffect(() => {
    const handleGlobalRefresh = () => {
      fetchData(true);
    };

    const handleVisibilityChange = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        fetchData(true);
      }
    };

    window.addEventListener('lumina_refresh_data', handleGlobalRefresh);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('lumina_refresh_data', handleGlobalRefresh);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchData]);

  return {
    summary,
    categories,
    trends,
    forecast,
    subscriptions,
    loading,
    error,
    refresh: () => fetchData(false)
  };
}
