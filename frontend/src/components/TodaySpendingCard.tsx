'use client';

import { useRef, useEffect } from 'react';
import { AnimatedCounter } from './AnimatedCounter';
import { formatCurrency } from '@/lib/utils';
import { Flame, ShieldCheck, AlertTriangle, ArrowUpRight, Clock, Sparkles } from 'lucide-react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

interface TodaySpendingCardProps {
  spentToday: number;
  balanceLeftToday: number;
  dailyAllowance: number;
  todayTxCount: number;
  onInfoClick?: (title: string, message: string, icon: any) => void;
}

export function TodaySpendingCard({
  spentToday = 0,
  balanceLeftToday = 0,
  dailyAllowance = 0,
  todayTxCount = 0,
  onInfoClick,
}: TodaySpendingCardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);

  const isOverBudget = balanceLeftToday < 0;
  const isCloseToBudget = !isOverBudget && dailyAllowance > 0 && spentToday / dailyAllowance >= 0.75;

  const percentSpent = dailyAllowance > 0
    ? Math.min(Math.round((spentToday / dailyAllowance) * 100), 100)
    : (spentToday > 0 ? 100 : 0);

  // GSAP animation for entrance and progress bar
  useGSAP(() => {
    if (!containerRef.current) return;

    const ctx = gsap.context(() => {
      // Entrance stagger
      gsap.fromTo(
        '.gsap-today-stat',
        { opacity: 0, y: 14, scale: 0.94 },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          stagger: 0.1,
          duration: 0.55,
          ease: 'power3.out',
        }
      );

      // Progress bar fill animation
      if (progressBarRef.current) {
        gsap.fromTo(
          progressBarRef.current,
          { width: '0%' },
          {
            width: `${percentSpent}%`,
            duration: 1.1,
            ease: 'power2.out',
            delay: 0.2,
          }
        );
      }
    }, containerRef);

    return () => ctx.revert();
  }, [spentToday, balanceLeftToday, dailyAllowance, percentSpent]);

  return (
    <div
      ref={containerRef}
      className="p-4 rounded-3xl glass border border-white/10 bg-white/[0.03] shadow-lg mb-4 select-none relative overflow-hidden"
    >
      {/* Background glow accent */}
      <div
        className={`absolute -top-12 -right-12 w-36 h-36 rounded-full blur-3xl pointer-events-none opacity-20 ${
          isOverBudget
            ? 'bg-rose-500'
            : isCloseToBudget
            ? 'bg-amber-500'
            : 'bg-emerald-500'
        }`}
      />

      {/* Header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Clock className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-semibold text-white/90">Today's Pulse</span>
        </div>
        <span
          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
            isOverBudget
              ? 'bg-rose-500/20 text-rose-300 border-rose-500/30 animate-pulse'
              : isCloseToBudget
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
              : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
          }`}
        >
          {isOverBudget
            ? 'Over Daily Cap 🚨'
            : isCloseToBudget
            ? '75% Spent ⚠️'
            : 'Safe Today ✨'}
        </span>
      </div>

      {/* Dual Stats Grid */}
      <div className="grid grid-cols-2 gap-2.5 mb-3.5">
        {/* Spent Today */}
        <div
          onClick={() =>
            onInfoClick?.(
              "Spent Today 💸",
              `You have spent ${formatCurrency(spentToday)} across ${todayTxCount} transaction${todayTxCount === 1 ? '' : 's'} today.`,
              <Flame className="w-5 h-5 text-orange-400" />
            )
          }
          className="gsap-today-stat p-3 rounded-2xl bg-orange-500/10 border border-orange-500/20 hover:bg-orange-500/15 transition-all cursor-pointer flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] text-orange-300/80 font-medium">Spent Today</span>
            <Flame className="w-3.5 h-3.5 text-orange-400" />
          </div>
          <div>
            <div className="text-base sm:text-lg font-display font-bold text-orange-300 truncate">
              <AnimatedCounter value={spentToday} prefix="₹" />
            </div>
            <p className="text-[10px] text-text-secondary mt-0.5">
              {todayTxCount} expense{todayTxCount === 1 ? '' : 's'} logged
            </p>
          </div>
        </div>

        {/* Balance Left Today */}
        <div
          onClick={() =>
            onInfoClick?.(
              "Balance Left Today 🛡️",
              isOverBudget
                ? `You have exceeded today's safe allowance by ${formatCurrency(Math.abs(balanceLeftToday))}.`
                : `You can safely spend another ${formatCurrency(balanceLeftToday)} today without exceeding your monthly budget!`,
              isOverBudget ? <AlertTriangle className="w-5 h-5 text-rose-400" /> : <ShieldCheck className="w-5 h-5 text-emerald-400" />
            )
          }
          className={`gsap-today-stat p-3 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
            isOverBudget
              ? 'bg-rose-500/10 border-rose-500/25 hover:bg-rose-500/15'
              : 'bg-emerald-500/10 border-emerald-500/20 hover:bg-emerald-500/15'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span
              className={`text-[11px] font-medium ${
                isOverBudget ? 'text-rose-300/90' : 'text-emerald-300/90'
              }`}
            >
              {isOverBudget ? 'Exceeded Today' : 'Balance Left'}
            </span>
            {isOverBudget ? (
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
            ) : (
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            )}
          </div>
          <div>
            <div
              className={`text-base sm:text-lg font-display font-bold truncate ${
                isOverBudget ? 'text-rose-400' : 'text-emerald-400'
              }`}
            >
              <AnimatedCounter
                value={Math.abs(balanceLeftToday)}
                prefix={isOverBudget ? '-₹' : '+₹'}
              />
            </div>
            <p className="text-[10px] text-text-secondary mt-0.5">
              Cap: {formatCurrency(dailyAllowance)}
            </p>
          </div>
        </div>
      </div>

      {/* GSAP Progress Bar */}
      {dailyAllowance > 0 && (
        <div className="px-1">
          <div className="flex items-center justify-between text-[10px] text-text-secondary mb-1">
            <span>Daily Cap Used</span>
            <span className="font-semibold text-white/80">{percentSpent}%</span>
          </div>
          <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
            <div
              ref={progressBarRef}
              className={`h-full rounded-full transition-colors duration-300 ${
                isOverBudget
                  ? 'bg-rose-500'
                  : isCloseToBudget
                  ? 'bg-amber-400'
                  : 'bg-emerald-400'
              }`}
              style={{ width: `${percentSpent}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

