'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Flame, Target, Trophy, ChevronRight, ArrowRight } from 'lucide-react';
import { appNavigate, formatTitleCase } from '@/lib/utils';

interface HeroSpotlightProps {
  summary: any;
  isLastWeekOfMonth: boolean;
  monthName: string;
  onBadgeClick: (title: string, desc: string, icon: any) => void;
  getBadgeConfig: (badge: string) => any;
}

type SlideType = 'wrap' | 'streak' | 'badges';

export function HeroSpotlightBanner({
  summary,
  isLastWeekOfMonth,
  monthName,
  onBadgeClick,
  getBadgeConfig
}: HeroSpotlightProps) {
  // Determine available slides dynamically
  const availableSlides = useMemo<SlideType[]>(() => {
    const list: SlideType[] = [];

    // 1. Month Wrap: ONLY in the last week of the month if user has activity
    const hasActivity = summary && ((summary.total_this_month || 0) > 0 || (summary.total_income_this_month || 0) > 0);
    if (isLastWeekOfMonth && hasActivity) {
      list.push('wrap');
    }

    // 2. Streak Bar: if streak is active
    if (summary && summary.current_streak > 0) {
      list.push('streak');
    }

    // 3. Badges & Next Milestone: if user has badges or next target
    const hasBadges = summary?.badges && summary.badges.length > 0;
    const hasTarget = Boolean(summary?.next_badge_target);
    if (hasBadges || hasTarget) {
      list.push('badges');
    }

    return list;
  }, [summary, isLastWeekOfMonth]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Keep index within bounds if available slides change
  useEffect(() => {
    if (currentIndex >= availableSlides.length) {
      setCurrentIndex(0);
    }
  }, [availableSlides.length, currentIndex]);

  // Automatic rotation between available features (6 seconds each)
  useEffect(() => {
    if (availableSlides.length <= 1 || isPaused) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % availableSlides.length);
    }, 6000);

    return () => clearInterval(timer);
  }, [availableSlides.length, isPaused]);

  if (availableSlides.length === 0) return null;

  const activeSlide = availableSlides[currentIndex] || availableSlides[0];

  return (
    <div
      className="mb-5 relative"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={() => setIsPaused(true)}
      onTouchEnd={() => setIsPaused(false)}
    >
      <AnimatePresence mode="wait">
        {/* SLIDE 1: MONTHLY WRAPPED (Last week only) */}
        {activeSlide === 'wrap' && (
          <motion.div
            key="wrap"
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.35, ease: 'easeInOut' }}
            onClick={() => appNavigate('/wrap-up')}
            className="bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-pink-500/20 border border-purple-500/35 p-3.5 rounded-2xl flex items-center justify-between cursor-pointer shadow-[0_0_20px_rgba(168,85,247,0.15)] hover:shadow-[0_0_25px_rgba(168,85,247,0.25)] transition-all select-none group"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5 text-purple-300" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 to-pink-300 truncate">
                    {monthName} Wrapped 🎬
                  </span>
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/30">
                    Last Week Special
                  </span>
                </div>
                <p className="text-[11px] text-text-secondary truncate">
                  Tap to see your Financial Story & Money Archetype
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0 pl-2">
              <span className="text-xs text-purple-300 font-bold hidden sm:inline">View</span>
              <ArrowRight className="w-4 h-4 text-purple-300 group-hover:translate-x-1 transition-transform" />
            </div>
          </motion.div>
        )}

        {/* SLIDE 2: STREAK STATUS */}
        {activeSlide === 'streak' && (
          <motion.div
            key="streak"
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.35, ease: 'easeInOut' }}
            className="bg-orange-500/10 border border-orange-500/25 p-3.5 rounded-2xl flex items-center justify-between transition-all select-none"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center shrink-0 text-lg">
                🔥
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-orange-400">
                    {summary.current_streak} Day Expense Streak!
                  </span>
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-orange-500/20 text-orange-300 border border-orange-500/30">
                    Active
                  </span>
                </div>
                <p className="text-[11px] text-text-secondary truncate">
                  Personal best: <strong className="text-orange-300">{summary.best_streak || summary.current_streak} days</strong> in a row
                </p>
              </div>
            </div>
            <div className="shrink-0 pl-2">
              <Flame className="w-4 h-4 text-orange-400 animate-pulse" />
            </div>
          </motion.div>
        )}

        {/* SLIDE 3: BADGES & NEXT TARGET */}
        {activeSlide === 'badges' && (
          <motion.div
            key="badges"
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.35, ease: 'easeInOut' }}
            className="bg-white/5 border border-white/10 p-3 rounded-2xl select-none"
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold text-text-secondary uppercase tracking-wider flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5 text-amber-400" />
                Achievements
              </span>
              {summary?.next_badge_target && (
                <span className="text-[10px] text-purple-300 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded-full truncate max-w-[170px] flex items-center gap-1">
                  <Target className="w-3 h-3 text-purple-400 shrink-0" />
                  <span>Next: {summary.next_badge_target}</span>
                </span>
              )}
            </div>

            {summary?.badges && summary.badges.length > 0 ? (
              <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5">
                {summary.badges.map((badge: string, i: number) => {
                  const config = getBadgeConfig(badge);
                  const formattedTitle = formatTitleCase(badge);
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => onBadgeClick(formattedTitle, config.description, config.icon)}
                      className={`shrink-0 px-2.5 py-1 text-[11px] rounded-lg font-semibold flex items-center gap-1 transition-all active:scale-95 ${config.classes}`}
                    >
                      <span>{config.icon}</span>
                      <span>{formattedTitle}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-[11px] text-text-secondary">
                Log regular expenses to unlock saver achievements!
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pagination Micro-Dots (Only shown if multiple slides exist) */}
      {availableSlides.length > 1 && (
        <div className="flex justify-center items-center gap-1.5 mt-2">
          {availableSlides.map((slide, idx) => (
            <button
              key={slide}
              type="button"
              onClick={() => setCurrentIndex(idx)}
              className={`h-1.5 rounded-full transition-all ${
                currentIndex === idx
                  ? 'w-5 bg-primary shadow-sm'
                  : 'w-1.5 bg-white/20 hover:bg-white/40'
              }`}
              title={`Switch to ${slide}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
