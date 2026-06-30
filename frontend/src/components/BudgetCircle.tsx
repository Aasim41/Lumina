import { motion } from 'framer-motion';
import { formatCurrency } from '@/lib/utils';
import { useEffect, useState } from 'react';

interface BudgetCircleProps {
  spent: number;
  budget: number;
}

export function BudgetCircle({ spent, budget }: BudgetCircleProps) {
  const [isClient, setIsClient] = useState(false);
  
  useEffect(() => {
    setIsClient(true);
  }, []);

  const safeToSpend = Math.max(0, budget - spent);
  const percentSpent = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;
  
  const radius = 90;
  const circumference = 2 * Math.PI * radius;
  // Offset calculated from percent spent. 100% spent = 0 offset (full circle). 0% spent = circumference (empty).
  const strokeDashoffset = circumference - (percentSpent / 100) * circumference;

  return (
    <div className="relative w-full max-w-[280px] aspect-square mx-auto flex items-center justify-center">
      {/* Background SVG Circle */}
      <svg className="absolute inset-0 w-full h-full transform -rotate-90">
        {/* Track */}
        <circle
          cx="50%"
          cy="50%"
          r={radius}
          fill="transparent"
          stroke="rgba(255, 255, 255, 0.1)"
          strokeWidth="6"
        />
        {/* Animated Progress */}
        {isClient && (
          <motion.circle
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1.5, ease: "easeOut", delay: 0.2 }}
            cx="50%"
            cy="50%"
            r={radius}
            fill="transparent"
            stroke="#10b981"
            strokeWidth="6"
            strokeDasharray={circumference}
            strokeLinecap="round"
            className="drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]"
          />
        )}
      </svg>

      {/* Inner Content */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.5 }}
        className="text-center z-10 flex flex-col items-center justify-center"
      >
        <p className="text-xs text-text-secondary uppercase tracking-wider mb-1">Safe to Spend</p>
        <h2 className="text-4xl sm:text-5xl font-display font-bold text-white mb-2 tracking-tight">
          {formatCurrency(safeToSpend)}
        </h2>
        <p className="text-[#10b981] font-medium text-sm">this month</p>
        
        {/* Small decorative refresh text matching design */}
        <div className="mt-4 flex items-center text-[10px] text-text-secondary/60">
          <span>Updated just now</span>
          <svg className="w-3 h-3 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </div>
      </motion.div>
    </div>
  );
}
