'use client';

import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Filler,
} from 'chart.js';
import { formatCurrency, formatMonth } from '@/lib/utils';
import { Card } from './ui/Card';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler);

interface ForecastProps {
  historical: { month: string, amount: number }[];
  projected: { month: string, amount: number }[];
  confidenceLow: number;
  confidenceHigh: number;
}

export function ForecastChart({ historical, projected, confidenceLow, confidenceHigh }: ForecastProps) {
  if (!historical || historical.length === 0) return null;

  const allMonths = [...historical.map(h => h.month), ...projected.map(p => p.month)];
  
  // To make a continuous line, we need to add the last historical point to the projected array
  const lastHistorical = historical[historical.length - 1];
  
  const historicalData = allMonths.map(m => {
    const pt = historical.find(h => h.month === m);
    return pt ? pt.amount : null;
  });

  const projectedData = allMonths.map(m => {
    if (m === lastHistorical.month) return lastHistorical.amount;
    const pt = projected.find(p => p.month === m);
    return pt ? pt.amount : null;
  });

  const confidenceHighData = allMonths.map(m => {
    if (m === lastHistorical.month) return lastHistorical.amount;
    const pt = projected.find(p => p.month === m);
    return pt ? confidenceHigh : null;
  });

  const confidenceLowData = allMonths.map(m => {
    if (m === lastHistorical.month) return lastHistorical.amount;
    const pt = projected.find(p => p.month === m);
    return pt ? confidenceLow : null;
  });

  const chartData = {
    labels: allMonths.map(formatMonth),
    datasets: [
      {
        label: 'Historical',
        data: historicalData,
        borderColor: '#6366f1', // Primary
        borderWidth: 2,
        pointBackgroundColor: '#0f172a',
        pointBorderColor: '#6366f1',
        tension: 0,
      },
      {
        label: 'Forecast',
        data: projectedData,
        borderColor: '#22c55e', // Success green for forecast
        borderWidth: 2,
        borderDash: [5, 5],
        pointBackgroundColor: '#0f172a',
        pointBorderColor: '#22c55e',
        tension: 0,
      },
      {
        label: 'Confidence High',
        data: confidenceHighData,
        borderColor: 'transparent',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        fill: '+1', // Fill to the next dataset (Confidence Low)
        pointRadius: 0,
        tension: 0,
      },
      {
        label: 'Confidence Low',
        data: confidenceLowData,
        borderColor: 'transparent',
        backgroundColor: 'transparent',
        fill: false,
        pointRadius: 0,
        tension: 0,
      }
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#1e293b',
        titleColor: '#f8fafc',
        bodyColor: '#e2e8f0',
        borderColor: 'rgba(255,255,255,0.1)',
        borderWidth: 1,
        padding: 12,
        callbacks: {
          label: function(context: any) {
            if (context.dataset.label.includes('Confidence')) return '';
            return `${context.dataset.label}: ${formatCurrency(context.parsed.y)}`;
          }
        },
        filter: function(tooltipItem: any) {
          return !tooltipItem.dataset.label.includes('Confidence');
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(255, 255, 255, 0.05)' },
        ticks: {
          color: '#94a3b8',
          callback: function(value: any) { 
            if (value >= 1000) {
              return '₹' + (value / 1000) + 'k';
            }
            return '₹' + value;
          }
        },
        border: { display: false }
      },
      x: {
        grid: { display: false },
        ticks: { color: '#94a3b8' },
        border: { display: false }
      }
    }
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-text-secondary">Spending Forecast</h3>
        <div className="flex items-center space-x-3 text-xs">
          <div className="flex items-center"><div className="w-2 h-2 bg-primary rounded-full mr-1"></div> Historical</div>
          <div className="flex items-center"><div className="w-2 h-2 bg-success border-2 border-dashed rounded-full mr-1"></div> Projected</div>
        </div>
      </div>
      <div className="relative w-full h-[300px]">
        <Line data={chartData as any} options={options} />
      </div>
    </Card>
  );
}
