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
    
    // Attempt to load from cache for instant UI
    try {
      const cachedSummary = localStorage.getItem('lumina_summary');
      if (cachedSummary) {
        setSummary(JSON.parse(cachedSummary));
        setLoading(false); // We have cached data, don't show full loading screen
      } else {
        setLoading(true);
      }
      
      const cachedCats = localStorage.getItem('lumina_categories');
      if (cachedCats) setCategories(JSON.parse(cachedCats));
      
      const cachedTrends = localStorage.getItem('lumina_trends');
      if (cachedTrends) setTrends(JSON.parse(cachedTrends));
      
      const cachedSubs = localStorage.getItem('lumina_subs');
      if (cachedSubs) setSubscriptions(JSON.parse(cachedSubs));
    } catch (e) {
      console.warn("Failed to load dashboard cache");
      setLoading(true);
    }
    
    try {
      setError(null);
      
      // Fetch fresh data in background
      getSummary().then(sumData => {
        setSummary(sumData);
        localStorage.setItem('lumina_summary', JSON.stringify(sumData));
        setLoading(false); 
      }).catch(err => {
        setError(err.message || 'Failed to fetch summary');
        setLoading(false);
      });
      
      getCategories().then(data => {
        setCategories(data);
        localStorage.setItem('lumina_categories', JSON.stringify(data));
      }).catch(console.error);
      
      getTrends().then(data => {
        setTrends(data);
        localStorage.setItem('lumina_trends', JSON.stringify(data));
      }).catch(console.error);
      
      getForecast().then(setForecast).catch(console.error);
      
      getSubscriptions().then(data => {
        setSubscriptions(data);
        localStorage.setItem('lumina_subs', JSON.stringify(data));
      }).catch(console.error);
      
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
