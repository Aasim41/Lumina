'use client';

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface HeatmapChartProps {
  data: { day: string; amount: number }[];
}

export function HeatmapChart({ data }: HeatmapChartProps) {
  // Ensure we sort days Monday to Sunday just in case
  const dayOrder: Record<string, number> = { 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6, 'Sun': 7 };
  const sortedData = [...data].sort((a, b) => dayOrder[a.day] - dayOrder[b.day]);

  const maxAmount = Math.max(...sortedData.map(d => d.amount), 1); // prevent division by zero

  const chartData = {
    labels: sortedData.map(d => d.day),
    datasets: [
      {
        label: 'Spending (₹)',
        data: sortedData.map(d => d.amount),
        backgroundColor: sortedData.map(d => {
          // Heatmap effect: higher relative amount = hotter color
          const intensity = d.amount / maxAmount;
          if (intensity > 0.8) return 'rgba(239, 68, 68, 0.8)'; // Red-500
          if (intensity > 0.5) return 'rgba(249, 115, 22, 0.8)'; // Orange-500
          if (intensity > 0.2) return 'rgba(56, 189, 248, 0.8)'; // Sky-400
          return 'rgba(148, 163, 184, 0.4)'; // Slate-400
        }),
        borderRadius: 8,
        borderSkipped: false,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        titleColor: '#fff',
        bodyColor: '#e2e8f0',
        padding: 12,
        cornerRadius: 12,
        callbacks: {
          label: function(context: any) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.y !== null) {
              label += new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(context.parsed.y);
            }
            return label;
          }
        }
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          color: 'rgba(255, 255, 255, 0.5)',
          font: {
            family: "'Space Grotesk', sans-serif",
          }
        }
      },
      y: {
        display: false, // hide Y axis for cleaner look
        grid: {
          display: false,
        },
      }
    },
  };

  return (
    <div className="w-full h-[200px]">
      <Bar data={chartData} options={options} />
    </div>
  );
}
