import { useState, useEffect, useCallback } from 'react';
import { getSummary, getCategories, getTrends, getForecast, getSubscriptions } from '../lib/api';
import { supabase } from '../lib/supabase';

export function useExpenseData() {
  const [summary, setSummary] = useState<any>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [trends, setTrends] = useState<any[]>([]);
  const [forecast, setForecast] = useState<any>(null);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      // Properly await the async auth check
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setLoading(false);
        return;
      }

      setLoading(true);
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
    } catch (err: any) {
      console.error('Dashboard data fetch error:', err);
      setError(err.message || 'Failed to fetch dashboard data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    summary,
    categories,
    trends,
    forecast,
    subscriptions,
    loading,
    error,
    refresh: fetchData
  };
}
