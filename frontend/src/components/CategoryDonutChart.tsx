'use client';

import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { getCategoryColor, formatCurrency } from '@/lib/utils';
import { Card } from './ui/Card';

ChartJS.register(ArcElement, Tooltip, Legend);

interface CategoryData {
  category: string;
  amount: number;
  percentage: number;
  count: number;
}

export function CategoryDonutChart({ data }: { data: CategoryData[] }) {
  if (!data || data.length === 0) {
    return (
      <Card className="p-6 flex flex-col items-center justify-center min-h-[300px]">
        <div className="w-16 h-16 rounded-full border-4 border-dashed border-white/10 flex items-center justify-center mb-3">
          <span className="text-2xl">📊</span>
        </div>
        <p className="text-text-secondary text-sm">No spending data available</p>
      </Card>
    );
  }

  const chartData = {
    labels: data.map(d => d.category),
    datasets: [
      {
        data: data.map(d => d.amount),
        backgroundColor: data.map(d => getCategoryColor(d.category)),
        borderWidth: 0,
        hoverOffset: 4,
      },
    ],
  };

  const total = data.reduce((sum, d) => sum + d.amount, 0);

  const options = {
    cutout: '75%',
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false, // We'll build a custom legend
      },
      tooltip: {
        backgroundColor: '#1e293b',
        titleColor: '#f8fafc',
        bodyColor: '#e2e8f0',
        borderColor: 'rgba(255,255,255,0.1)',
        borderWidth: 1,
        padding: 12,
        callbacks: {
          label: function(context: any) {
            let label = context.label || '';
            if (label) label += ': ';
            if (context.parsed !== null) {
              label += formatCurrency(context.parsed);
            }
            return label;
          }
        }
      }
    }
  };

  return (
    <Card className="p-6 animate-fadeIn">
      <div className="mb-4">
        <h3 className="text-lg font-display font-semibold text-text-primary">Where your money goes</h3>
        {data.length > 0 && (
          <p className="text-sm text-text-secondary">
            Most of your spending ({data[0].percentage.toFixed(0)}%) was on <span className="font-medium text-text-primary">{data[0].category}</span>.
          </p>
        )}
      </div>
      
      <div className="relative h-[220px] mb-6">
        <Doughnut data={chartData} options={options} />
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-xs text-text-secondary">Total</span>
          <span className="text-xl font-display font-bold text-text-primary">{formatCurrency(total)}</span>
        </div>
      </div>
      
      <div className="space-y-3 max-h-[200px] overflow-y-auto pr-2">
        {data.map((item) => (
          <div key={item.category} className="flex items-center justify-between">
            <div className="flex items-center">
              <div 
                className="w-3 h-3 rounded-full mr-3" 
                style={{ backgroundColor: getCategoryColor(item.category) }} 
              />
              <span className="text-sm text-text-primary">{item.category}</span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-sm font-medium">{formatCurrency(item.amount)}</span>
              <span className="text-xs text-text-secondary">{item.percentage.toFixed(1)}%</span>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
