import { ReactNode } from 'react';
import { Card } from './ui/Card';
import { cn } from '@/lib/utils';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  theme?: 'blue' | 'green' | 'purple' | 'yellow' | 'red';
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
  onClick?: () => void;
}

export function MetricCard({ title, value, icon, theme = 'blue', trend, className, onClick }: MetricCardProps) {
  return (
    <div 
      className={cn("metric-parent", className, onClick && "cursor-pointer active:scale-95 transition-transform")}
      onClick={onClick}
    >
      <div className={cn("metric-card", `metric-theme-${theme}`)}>
        <div className="metric-content-box">
          <span className="metric-value">{value}</span>
          <p className="metric-title">{title}</p>
          
          {trend && (
            <div className="mt-2 text-[10px] font-bold text-[#141414] transition-all duration-500 transform hover:translate-z-60 flex items-center">
              {trend.isPositive ? (
                <ArrowUpRight className="w-3 h-3 mr-1" />
              ) : (
                <ArrowDownRight className="w-3 h-3 mr-1" />
              )}
              <span>{Math.abs(trend.value).toFixed(1)}% vs last month</span>
            </div>
          )}
        </div>
        
        <div className="metric-icon-box">
          {icon}
        </div>
      </div>
    </div>
  );
}
