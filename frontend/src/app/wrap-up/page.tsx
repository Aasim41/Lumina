'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, ChevronLeft, ChevronRight, Trophy, ArrowDownLeft, ArrowUpRight,
  Sparkles, Share2, Flame, Heart, Store, ShieldCheck
} from 'lucide-react';
import { getWrapUp } from '@/lib/api';
import { formatCurrency, appNavigate } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

export default function WrapUpPage() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getWrapUp()
      .then(res => {
        setData(res);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load wrap up:', err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#061813] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-emerald-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-[#061813] flex items-center justify-center p-6 text-center">
        <div>
          <h2 className="text-xl font-bold text-white mb-2">Wrap-Up Unavailable</h2>
          <p className="text-text-secondary mb-6">We don't have enough data to generate your story yet.</p>
          <button onClick={() => router.back()} className="px-6 py-2.5 bg-white/10 text-white rounded-full">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const handleShare = async () => {
    const text = `🎉 My ${data.month} Financial Wrapped on Lumina!\n\n💸 Total Spent: ₹${data.total_spent.toLocaleString('en-IN')}\n🛍️ Top Category: ${data.top_category}\n🔥 No-Spend Days: ${data.no_spend_days} days\n🎖️ My Money Archetype: ${data.archetype?.title || 'The Balanced Strategist'}\n\nTrack your money smarter with Lumina!`;

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `My ${data.month} Lumina Wrapped`,
          text,
        });
        toast.success('Shared successfully!');
      } catch (e) {
        // User cancelled or share failed
      }
    } else {
      await navigator.clipboard.writeText(text);
      toast.success('Story summary copied to clipboard! Share on WhatsApp / Instagram.');
    }
  };

  const slides = [
    // Slide 0: Intro
    {
      id: 'intro',
      bg: 'bg-gradient-to-br from-emerald-950 via-[#061813] to-teal-950',
      content: (
        <div className="flex flex-col items-center justify-center h-full text-center px-6">
          <motion.div
            initial={{ scale: 0.8, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ duration: 0.6 }}
            className="w-20 h-20 rounded-3xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mb-6 shadow-[0_0_40px_rgba(16,185,129,0.3)]"
          >
            <Sparkles className="w-10 h-10 text-emerald-400 animate-pulse" />
          </motion.div>
          <h1 className="text-4xl font-display font-bold text-white mb-3 leading-tight">
            Your {data.month} <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
              Wrapped
            </span>{' '}
            is here!
          </h1>
          <p className="text-sm text-emerald-300/70 max-w-xs">
            Every rupee tells a story. Let's see how you mastered your money this month.
          </p>
        </div>
      ),
    },

    // Slide 1: Cash Flow & Big Picture
    {
      id: 'cashflow',
      bg: 'bg-gradient-to-br from-indigo-950 via-[#061813] to-slate-950',
      content: (
        <div className="flex flex-col items-center justify-center h-full text-center px-6">
          <p className="text-sm text-indigo-300 font-semibold mb-3 uppercase tracking-wider">The Big Picture</p>
          <div className="space-y-4 w-full max-w-xs">
            <div className="p-5 rounded-3xl bg-white/5 border border-white/10 text-left">
              <span className="text-xs text-rose-300 font-medium flex items-center gap-1">
                <ArrowUpRight className="w-3.5 h-3.5" /> Total Outflow
              </span>
              <h2 className="text-3xl font-display font-bold text-white mt-1">
                {formatCurrency(data.total_spent)}
              </h2>
            </div>

            {data.total_income > 0 && (
              <div className="p-5 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 text-left">
                <span className="text-xs text-emerald-300 font-medium flex items-center gap-1">
                  <ArrowDownLeft className="w-3.5 h-3.5" /> Total Inflow
                </span>
                <h2 className="text-3xl font-display font-bold text-emerald-400 mt-1">
                  +{formatCurrency(data.total_income)}
                </h2>
              </div>
            )}
          </div>
          <p className="text-xs text-text-secondary mt-6 max-w-xs">
            {data.net_savings >= 0
              ? `You kept a surplus of ${formatCurrency(data.net_savings)} in net savings!`
              : 'Keep an eye on non-essential splurges to end next month in the green.'}
          </p>
        </div>
      ),
    },

    // Slide 2: Top Category
    {
      id: 'category',
      bg: 'bg-gradient-to-br from-amber-950 via-[#061813] to-orange-950',
      content: (
        <div className="flex flex-col items-center justify-center h-full text-center px-6">
          <p className="text-sm text-amber-300 font-semibold mb-6 uppercase tracking-wider">Top Spending Category</p>
          <div className="w-28 h-28 bg-amber-500/20 rounded-full flex items-center justify-center mb-6 border border-amber-500/30 shadow-[0_0_30px_rgba(245,158,11,0.25)]">
            <Trophy className="w-12 h-12 text-amber-400" />
          </div>
          <h2 className="text-3xl font-display font-bold text-white mb-2">{data.top_category || 'Smart Budgeting'}</h2>
          <p className="text-lg text-text-secondary">
            took up <span className="text-amber-400 font-bold">{(data.top_category_percentage || 0).toFixed(1)}%</span> of your expenses (
            {formatCurrency(data.top_category_amount || 0)}).
          </p>
        </div>
      ),
    },

    // Slide 3: #1 Store & Biggest Splurge
    {
      id: 'splurge',
      bg: 'bg-gradient-to-br from-rose-950 via-[#061813] to-red-950',
      content: (
        <div className="flex flex-col items-center justify-center h-full text-center px-6">
          <p className="text-sm text-rose-300 font-semibold mb-6 uppercase tracking-wider">Your #1 Splurge</p>
          <div className="p-6 rounded-3xl bg-white/5 border border-white/10 w-full max-w-xs mb-4">
            <span className="text-xs text-text-secondary">Biggest Single Transaction</span>
            <h3 className="text-2xl font-bold text-white mt-1 mb-2">{data.biggest_splurge_merchant || 'Mindful Spender'}</h3>
            <p className="text-3xl font-display font-bold text-rose-400">
              {formatCurrency(data.biggest_splurge_amount || 0)}
            </p>
          </div>
          {data.top_merchant?.count > 0 && (
            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5 w-full max-w-xs text-xs text-text-secondary">
              🏪 Most visited vendor: <strong className="text-white">{data.top_merchant.name}</strong> ({data.top_merchant.count} times)
            </div>
          )}
        </div>
      ),
    },

    // Slide 4: No-Spend Days & Savings
    {
      id: 'gamification',
      bg: 'bg-gradient-to-br from-purple-950 via-[#061813] to-indigo-950',
      content: (
        <div className="flex flex-col items-center justify-center h-full text-center px-6">
          <p className="text-sm text-purple-300 font-semibold mb-6 uppercase tracking-wider">Discipline & Habits</p>
          <div className="w-24 h-24 rounded-3xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(249,115,22,0.3)]">
            <Flame className="w-12 h-12 text-orange-400" />
          </div>
          <h2 className="text-4xl font-display font-bold text-white mb-2">
            {data.no_spend_days} Days
          </h2>
          <p className="text-base text-purple-200 font-medium mb-4">Zero Discretionary Spending!</p>
          <p className="text-xs text-text-secondary max-w-xs">
            You practiced strong financial discipline on {data.no_spend_days} separate days this month.
          </p>
        </div>
      ),
    },

    // Slide 5: Financial Archetype
    {
      id: 'archetype',
      bg: 'bg-gradient-to-br from-teal-950 via-[#061813] to-emerald-950',
      content: (
        <div className="flex flex-col items-center justify-center h-full text-center px-6">
          <p className="text-sm text-teal-300 font-semibold mb-4 uppercase tracking-wider">Your Money Personality</p>
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: [0.95, 1.05, 1] }}
            className="p-8 rounded-3xl bg-gradient-to-b from-white/10 to-white/5 border border-emerald-400/40 w-full max-w-xs mb-6 shadow-[0_0_40px_rgba(52,211,153,0.25)] relative overflow-hidden"
          >
            <div className="text-5xl mb-4">{data.archetype?.icon || '🏆'}</div>
            <h3 className="text-xl font-display font-bold text-white mb-2">
              {data.archetype?.title || 'The Balanced Strategist'}
            </h3>
            <p className="text-xs text-emerald-200/80 leading-relaxed">
              {data.archetype?.desc}
            </p>
          </motion.div>

          <button
            onClick={handleShare}
            className="w-full max-w-xs py-3.5 bg-gradient-to-r from-emerald-400 to-cyan-400 text-black font-bold text-sm rounded-2xl flex items-center justify-center gap-2 shadow-lg hover:opacity-90 active:scale-95 transition-all"
          >
            <Share2 className="w-4 h-4" /> Share My Story
          </button>
        </div>
      ),
    },
  ];

  const nextSlide = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(c => c + 1);
    } else {
      router.back();
    }
  };

  const prevSlide = () => {
    if (currentSlide > 0) setCurrentSlide(c => c - 1);
  };

  return (
    <div className={`fixed inset-0 z-[200] overflow-hidden transition-colors duration-700 ${slides[currentSlide].bg} select-none`}>
      {/* Top Progress Bars */}
      <div className="absolute top-10 left-4 right-4 flex gap-1.5 z-20">
        {slides.map((_, idx) => (
          <div key={idx} className="h-1 flex-1 bg-white/20 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-white"
              initial={{ width: idx < currentSlide ? '100%' : '0%' }}
              animate={{
                width: idx === currentSlide ? '100%' : idx < currentSlide ? '100%' : '0%',
              }}
              transition={{
                duration: idx === currentSlide ? 6 : 0.3,
                ease: 'linear',
              }}
              onAnimationComplete={() => {
                if (idx === currentSlide) nextSlide();
              }}
            />
          </div>
        ))}
      </div>

      {/* Close Button */}
      <button
        onClick={() => router.back()}
        className="absolute top-14 right-4 z-20 p-2 bg-black/40 hover:bg-black/60 rounded-full text-white/70 hover:text-white transition-colors"
      >
        <X className="w-5 h-5" />
      </button>

      {/* Tap Left / Right Touch Zones */}
      <div className="absolute inset-0 z-10 flex">
        <div className="w-1/3 h-full cursor-pointer" onClick={prevSlide} />
        <div className="w-2/3 h-full cursor-pointer" onClick={nextSlide} />
      </div>

      {/* Slide Content */}
      <div className="relative z-0 h-full flex flex-col justify-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.04 }}
            transition={{ duration: 0.3 }}
            className="h-full"
          >
            {slides[currentSlide].content}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom Hint */}
      <div className="absolute bottom-6 left-0 right-0 text-center z-20 pointer-events-none">
        <p className="text-[10px] text-white/40">Tap left to rewind • Tap right to advance</p>
      </div>
    </div>
  );
}
