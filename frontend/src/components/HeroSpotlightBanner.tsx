'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { Sparkles, Flame, Target, Trophy, ArrowRight, Lightbulb, ChevronLeft, ChevronRight } from 'lucide-react';
import { appNavigate, formatTitleCase } from '@/lib/utils';

interface HeroSpotlightProps {
  summary: any;
  isLastWeekOfMonth: boolean; // true during 27th of month to 3rd of next month (7-8 day window)
  monthName: string;
  onBadgeClick: (title: string, desc: string, icon: any) => void;
  getBadgeConfig: (badge: string) => any;
}

type SlideType = 'wrap' | 'streak' | 'badges' | 'tip';

const SLIDE_VARIANTS: any = {
  enter: (direction: number) => ({
    x: direction > 0 ? 120 : -120,
    opacity: 0,
    scale: 0.96
  }),
  center: {
    x: 0,
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.28,
      ease: 'easeOut'
    }
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 120 : -120,
    opacity: 0,
    scale: 0.96,
    transition: {
      duration: 0.2,
      ease: 'easeIn'
    }
  })
};

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

    // 1. Month Wrap: Only unlocked between 27th and 3rd of the month (7-8 day window)
    if (isLastWeekOfMonth) {
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

    // 4. Financial Tip & Insights card (always available to ensure swipeability)
    list.push('tip');

    return list;
  }, [summary, isLastWeekOfMonth]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [isPaused, setIsPaused] = useState(false);

  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  // Keep index within bounds if available slides change
  useEffect(() => {
    if (currentIndex >= availableSlides.length) {
      setCurrentIndex(0);
    }
  }, [availableSlides.length, currentIndex]);

  const paginate = (newDirection: number) => {
    setDirection(newDirection);
    setCurrentIndex((prev) => {
      const next = prev + newDirection;
      if (next < 0) return availableSlides.length - 1;
      if (next >= availableSlides.length) return 0;
      return next;
    });
  };

  // Automatic rotation between available features (6.5 seconds each)
  useEffect(() => {
    if (availableSlides.length <= 1 || isPaused) return;

    const timer = setInterval(() => {
      paginate(1);
    }, 6500);

    return () => clearInterval(timer);
  }, [availableSlides.length, isPaused]);

  // Touch Swipe Handlers for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    setIsPaused(true);
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    setIsPaused(false);
    if (touchStartX.current === null || touchStartY.current === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    const deltaY = e.changedTouches[0].clientY - touchStartY.current;

    // Detect horizontal swipe
    if (Math.abs(deltaX) > 40 && Math.abs(deltaX) > Math.abs(deltaY)) {
      if (deltaX < 0) {
        paginate(1); // Swipe left -> next
      } else {
        paginate(-1); // Swipe right -> prev
      }
    }
    touchStartX.current = null;
    touchStartY.current = null;
  };

  // Framer Motion Pan gesture
  const handleDragEnd = (_: any, info: PanInfo) => {
    const swipeThreshold = 35;
    const velocityThreshold = 200;

    if (info.offset.x < -swipeThreshold || info.velocity.x < -velocityThreshold) {
      paginate(1);
    } else if (info.offset.x > swipeThreshold || info.velocity.x > velocityThreshold) {
      paginate(-1);
    }
  };

  if (availableSlides.length === 0) return null;

  const activeSlide = availableSlides[currentIndex] || availableSlides[0];

  return (
    <div
      className="mb-5 relative touch-pan-y select-none"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="overflow-hidden rounded-2xl relative min-h-[72px]">
        <AnimatePresence initial={false} custom={direction} mode="wait">
          {/* SLIDE 1: MONTHLY WRAPPED (Active 27th - 3rd of month) */}
          {activeSlide === 'wrap' && (
            <motion.div
              key="wrap"
              custom={direction}
              variants={SLIDE_VARIANTS}
              initial="enter"
              animate="center"
              exit="exit"
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.25}
              onDragEnd={handleDragEnd}
              onClick={() => appNavigate('/wrap-up')}
              className="bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-pink-500/20 border border-purple-500/35 p-3.5 rounded-2xl flex items-center justify-between cursor-pointer shadow-[0_0_20px_rgba(168,85,247,0.15)] hover:shadow-[0_0_25px_rgba(168,85,247,0.25)] transition-all group active:scale-[0.99]"
            >
              <div className="flex items-center gap-3 min-w-0 pointer-events-none">
                <div className="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center shrink-0">
                  <Sparkles className="w-5 h-5 text-purple-300" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 to-pink-300 truncate">
                      {monthName} Wrapped 🎬
                    </span>
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/30">
                      Window Open
                    </span>
                  </div>
                  <p className="text-[11px] text-text-secondary truncate">
                    Tap to see your Financial Story & Money Archetype
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 pl-2 pointer-events-none">
                <span className="text-xs text-purple-300 font-bold hidden sm:inline">View</span>
                <ArrowRight className="w-4 h-4 text-purple-300 group-hover:translate-x-1 transition-transform" />
              </div>
            </motion.div>
          )}

          {/* SLIDE 2: STREAK STATUS */}
          {activeSlide === 'streak' && (
            <motion.div
              key="streak"
              custom={direction}
              variants={SLIDE_VARIANTS}
              initial="enter"
              animate="center"
              exit="exit"
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.25}
              onDragEnd={handleDragEnd}
              className="bg-orange-500/10 border border-orange-500/25 p-3.5 rounded-2xl flex items-center justify-between transition-all cursor-grab active:cursor-grabbing active:scale-[0.99]"
            >
              <div className="flex items-center gap-3 min-w-0 pointer-events-none">
                <div className="w-9 h-9 rounded-xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center shrink-0 text-lg">
                  🔥
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-orange-400">
                      {summary?.current_streak || 1} Day Expense Streak!
                    </span>
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-orange-500/20 text-orange-300 border border-orange-500/30">
                      Active
                    </span>
                  </div>
                  <p className="text-[11px] text-text-secondary truncate">
                    Personal best: <strong className="text-orange-300">{summary?.best_streak || summary?.current_streak || 1} days</strong> in a row
                  </p>
                </div>
              </div>
              <div className="shrink-0 pl-2 pointer-events-none">
                <Flame className="w-4 h-4 text-orange-400 animate-pulse" />
              </div>
            </motion.div>
          )}

          {/* SLIDE 3: BADGES & ACHIEVEMENTS */}
          {activeSlide === 'badges' && (
            <motion.div
              key="badges"
              custom={direction}
              variants={SLIDE_VARIANTS}
              initial="enter"
              animate="center"
              exit="exit"
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.25}
              onDragEnd={handleDragEnd}
              className="bg-white/5 border border-white/10 p-3 rounded-2xl cursor-grab active:cursor-grabbing active:scale-[0.99]"
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

          {/* SLIDE 4: SMART TIP & HABIT */}
          {activeSlide === 'tip' && (
            <motion.div
              key="tip"
              custom={direction}
              variants={SLIDE_VARIANTS}
              initial="enter"
              animate="center"
              exit="exit"
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.25}
              onDragEnd={handleDragEnd}
              className="bg-emerald-500/10 border border-emerald-500/20 p-3.5 rounded-2xl flex items-center justify-between transition-all cursor-grab active:cursor-grabbing active:scale-[0.99]"
            >
              <div className="flex items-center gap-3 min-w-0 pointer-events-none">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0">
                  <Lightbulb className="w-5 h-5 text-emerald-400" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-emerald-300">
                      100% On-Device Financial Intelligence
                    </span>
                  </div>
                  <p className="text-[11px] text-text-secondary truncate">
                    Your SMS and ledger never leave your phone. Swipe left or right for more insights.
                  </p>
                </div>
              </div>
              <div className="shrink-0 pl-2 text-emerald-400/60 pointer-events-none">
                <ChevronRight className="w-4 h-4" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Pagination Micro-Dots & Swipe indicators */}
      {availableSlides.length > 1 && (
        <div className="flex justify-center items-center gap-1.5 mt-2.5">
          {availableSlides.map((slide, idx) => (
            <button
              key={slide}
              type="button"
              onClick={() => {
                setDirection(idx > currentIndex ? 1 : -1);
                setCurrentIndex(idx);
              }}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                currentIndex === idx
                  ? 'w-6 bg-gradient-to-r from-emerald-400 to-teal-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]'
                  : 'w-1.5 bg-white/20 hover:bg-white/40'
              }`}
              title={`Switch to slide ${idx + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
