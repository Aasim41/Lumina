'use client';

import { AuthGuard } from '@/components/AuthGuard';
import { BottomNav } from '@/components/BottomNav';
import { ForecastChart } from '@/components/ForecastChart';
import { useExpenseData } from '@/hooks/useExpenseData';
import { formatCurrency, getCategoryColor } from '@/lib/utils';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';

export default function ForecastPage() {
  const { forecast, loading } = useExpenseData();

  return (
    <AuthGuard>
      <div className="min-h-screen bg-[#12081C] pb-24">
        <header className="px-6 py-6 safe-pt sticky top-0 z-20 bg-purple-500/10 backdrop-blur-xl border-b border-purple-500/30 mb-6 shadow-[0_4px_30px_rgba(168,85,247,0.15)]">
          <h1 className="text-3xl font-display font-bold mb-1">AI Forecast</h1>
          <p className="text-purple-300/60 text-sm">Predicting your next month's spending</p>
        </header>

        <div className="px-4 space-y-6 pb-6">
          {loading ? (
            <div className="flex justify-center p-12">
              <Spinner className="w-8 h-8 text-primary" />
            </div>
          ) : forecast ? (
            <>
              <Card className="p-6 bg-gradient-to-br from-purple-500/30 to-purple-500/5 border-purple-500/30 shadow-[0_0_30px_rgba(168,85,247,0.15)]">
                <h3 className="text-sm font-medium text-text-secondary mb-1">Predicted Next Month</h3>
                <div className="text-4xl font-display font-bold text-text-primary mb-2">
                  {formatCurrency(forecast.predicted_next_month)}
                </div>
                <div className="text-xs text-text-secondary">
                  Confidence Interval: {formatCurrency(forecast.confidence_low)} - {formatCurrency(forecast.confidence_high)}
                </div>
              </Card>

              {forecast.historical && forecast.historical.length > 0 && (
                <ForecastChart 
                  historical={forecast.historical}
                  projected={forecast.projected}
                  confidenceLow={forecast.confidence_low}
                  confidenceHigh={forecast.confidence_high}
                />
              )}

              {forecast.per_category && forecast.per_category.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-medium pl-1 text-text-secondary">Category Predictions</h3>
                  {forecast.per_category
                    .sort((a: any, b: any) => b.predicted_amount - a.predicted_amount)
                    .map((cat: any) => (
                    <Card key={cat.category} className="p-4 flex justify-between items-center">
                      <div className="flex items-center">
                        <div 
                          className="w-3 h-3 rounded-full mr-3" 
                          style={{ backgroundColor: getCategoryColor(cat.category) }} 
                        />
                        <span className="font-medium text-text-primary">{cat.category}</span>
                      </div>
                      <span className="font-display font-bold">
                        {formatCurrency(cat.predicted_amount)}
                      </span>
                    </Card>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="text-center p-10 glass rounded-2xl">
              <p className="text-text-secondary">Not enough data to generate forecast.</p>
            </div>
          )}
        </div>
      </div>
      <BottomNav />
    </AuthGuard>
  );
}
