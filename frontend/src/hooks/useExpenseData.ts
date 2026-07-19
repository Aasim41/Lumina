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
      
      // Fetch summary first as it's the most critical for the dashboard to render
      getSummary().then(sumData => {
        setSummary(sumData);
        setLoading(false); // Stop loading once the main dashboard data is ready
      }).catch(err => {
        setError(err.message || 'Failed to fetch summary');
        setLoading(false);
      });
      
      // Fetch the rest independently so they don't block the UI
      getCategories().then(setCategories).catch(console.error);
      getTrends().then(setTrends).catch(console.error);
      getForecast().then(setForecast).catch(console.error);
      getSubscriptions().then(setSubscriptions).catch(console.error);
      
    } catch (err: any) {
      setError(err.message || 'Failed to fetch dashboard data');
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
