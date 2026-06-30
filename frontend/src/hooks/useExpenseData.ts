import { useState, useEffect, useCallback } from 'react';
import { getSummary, getCategories, getTrends, getForecast, getSubscriptions } from '../lib/api';
import { isAuthenticated } from '../lib/auth';

export function useExpenseData() {
  const [summary, setSummary] = useState<any>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [trends, setTrends] = useState<any[]>([]);
  const [forecast, setForecast] = useState<any>(null);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!isAuthenticated()) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const [sumData, catData, trendData, forecastData, subData] = await Promise.all([
        getSummary(),
        getCategories(),
        getTrends(),
        getForecast(),
        getSubscriptions()
      ]);
      
      setSummary(sumData);
      setCategories(catData);
      setTrends(trendData);
      setForecast(forecastData);
      setSubscriptions(subData);
    } catch (err: any) {
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
