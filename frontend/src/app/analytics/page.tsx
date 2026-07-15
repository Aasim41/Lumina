'use client';

import { useState, useEffect } from 'react';
import { getForecast, getHeatmap, getTopMerchants } from '@/lib/api';
import { BottomNav } from '@/components/BottomNav';
import { ForecastChart } from '@/components/ForecastChart';
import { HeatmapChart } from '@/components/HeatmapChart';
import { TrendingUp, Activity, Store, TrendingDown, Target, Loader2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import toast from 'react-hot-toast';

export default function AnalyticsDashboard() {
  const [forecast, setForecast] = useState<any>(null);
  const [heatmap, setHeatmap] = useState<any[]>([]);
  const [topMerchants, setTopMerchants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [fData, hData, mData] = await Promise.all([
        getForecast(),
        getHeatmap(),
        getTopMerchants()
      ]);
      setForecast(fData);
      setHeatmap(hData);
      setTopMerchants(mData);
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to load analytics data');
    }
    setLoading(false);
  };



  return (
    <div className="min-h-screen bg-background text-foreground pb-24">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-white/5 p-4 pt-14">
        <h1 className="text-xl font-bold font-space-grotesk tracking-tight">Analytics</h1>
        <p className="text-xs text-white/50">Insights & AI Predictions</p>
      </div>

      <div className="p-4 space-y-6">
        
        {/* Heatmap Section */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-5 h-5 text-sky-400" />
            <h2 className="text-lg font-space-grotesk font-semibold">Weekly Heatmap</h2>
          </div>
          
          <div className="glass-panel p-4 rounded-2xl">
            {loading ? (
              <div className="h-[200px] flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-sky-400" />
              </div>
            ) : heatmap.length > 0 ? (
              <HeatmapChart data={heatmap} />
            ) : (
              <div className="h-[200px] flex items-center justify-center text-white/30 text-sm">
                Not enough data for heatmap
              </div>
            )}
          </div>
        </section>

        {/* AI Forecast Section */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-purple-400" />
            <h2 className="text-lg font-space-grotesk font-semibold">AI Forecast</h2>
          </div>
          
          <div className="glass-panel p-4 rounded-2xl relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent pointer-events-none" />
            
            {loading ? (
              <div className="h-[200px] flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
              </div>
            ) : forecast ? (
              <>
                <div className="flex items-end justify-between mb-6">
                  <div>
                    <p className="text-sm text-white/50 mb-1">Predicted Next Month</p>
                    <p className="text-3xl font-display font-bold text-white tracking-tight">
                      {formatCurrency(forecast.predicted_next_month)}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="inline-flex items-center gap-1 bg-purple-500/20 text-purple-300 px-2 py-1 rounded-full text-xs font-medium border border-purple-500/20">
                      <Target className="w-3 h-3" />
                      ±{formatCurrency((forecast.confidence_high - forecast.confidence_low) / 2)} margin
                    </div>
                  </div>
                </div>

                {forecast.accuracy_percent && (
                  <div className="flex items-center gap-2 mb-6 p-3 bg-white/5 rounded-xl border border-white/5">
                    <Activity className="w-4 h-4 text-emerald-400" />
                    <div className="text-sm">
                      <span className="text-white/70">Model Accuracy: </span>
                      <span className="font-semibold text-emerald-400">{forecast.accuracy_percent.toFixed(1)}%</span>
                      <span className="text-xs text-white/40 block mt-0.5">Based on last month's prediction vs actual</span>
                    </div>
                  </div>
                )}

                <div className="mb-2">
                  <ForecastChart 
                    historical={forecast.historical} 
                    projected={forecast.projected} 
                  />
                </div>
              </>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-white/30 text-sm">
                Need more data for AI prediction
              </div>
            )}
          </div>
        </section>

        {/* Top Merchants Section */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Store className="w-5 h-5 text-orange-400" />
            <h2 className="text-lg font-space-grotesk font-semibold">Top Merchants</h2>
          </div>

          <div className="space-y-3">
            {loading ? (
              <div className="py-8 flex justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-orange-400" />
              </div>
            ) : topMerchants.length > 0 ? (
              topMerchants.map((m, i) => (
                <div key={i} className="glass-panel p-4 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-orange-500/10 text-orange-400 flex items-center justify-center font-bold text-sm">
                      {i + 1}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{m.merchant}</p>
                      <p className="text-xs text-white/40">{m.count} transactions</p>
                    </div>
                  </div>
                  <p className="font-semibold">{formatCurrency(m.amount)}</p>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-white/30 text-sm">
                No merchant data available
              </div>
            )}
          </div>
        </section>

      </div>
      
      <BottomNav />
    </div>
  );
}
