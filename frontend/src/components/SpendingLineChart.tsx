'use client';

import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
} from 'chart.js';
import { formatCurrency, formatMonth } from '@/lib/utils';
import { Card } from './ui/Card';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler
);

export function SpendingLineChart({ data }: { data: { month: string, amount: number }[] }) {
  if (!data || data.length === 0) {
    return null;
  }

  // Sort chronologically just in case
  const sortedData = [...data].sort((a, b) => a.month.localeCompare(b.month));

  const chartData = {
    labels: sortedData.map(d => formatMonth(d.month)),
    datasets: [
      {
        fill: true,
        label: 'Spending',
        data: sortedData.map(d => d.amount),
        borderColor: '#6366f1',
        backgroundColor: (context: any) => {
          const ctx = context.chart.ctx;
          const gradient = ctx.createLinearGradient(0, 0, 0, 300);
          gradient.addColorStop(0, 'rgba(99, 102, 241, 0.4)');
          gradient.addColorStop(1, 'rgba(99, 102, 241, 0.0)');
          return gradient;
        },
        tension: 0.4,
        pointBackgroundColor: '#0f172a',
        pointBorderColor: '#6366f1',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
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
            return formatCurrency(context.parsed.y);
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(255, 255, 255, 0.05)',
        },
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
        ticks: {
          color: '#94a3b8',
          maxRotation: 0,
        },
        border: { display: false }
      }
    }
  };

  return (
    <Card className="p-6 animate-fadeIn">
      <div className="mb-4">
        <h3 className="text-lg font-display font-semibold text-text-primary">Spending over time</h3>
        <p className="text-sm text-text-secondary">Track your monthly expenses and identify trends.</p>
      </div>
      <div className="h-[250px]">
        <Line data={chartData} options={options} />
      </div>
    </Card>
  );
}
