'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, TrendingUp, Trophy, ArrowDown, ArrowUp, Sparkles } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { useRouter } from 'next/navigation';

export default function WrapUpPage() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch('/api/analytics/wrap-up')
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B1021] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-[#0B1021] flex items-center justify-center p-6 text-center">
        <div>
          <h2 className="text-xl font-bold text-white mb-2">Wrap-Up Unavailable</h2>
          <p className="text-text-secondary mb-6">We don't have enough data to generate your story yet.</p>
          <button onClick={() => router.back()} className="px-6 py-2 bg-white/10 text-white rounded-full">Go Back</button>
        </div>
      </div>
    );
  }

  const slides = [
    {
      id: 'intro',
      bg: 'bg-gradient-to-br from-indigo-900 via-[#0B1021] to-[#0B1021]',
      content: (
        <div className="flex flex-col items-center justify-center h-full text-center px-6">
          <Sparkles className="w-16 h-16 text-indigo-400 mb-6 animate-pulse" />
          <h1 className="text-4xl font-display font-bold text-white mb-4 leading-tight">
            Your {data.month} <br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">Wrap-Up</span> is here.
          </h1>
          <p className="text-lg text-text-secondary">Let's see how you managed your money this month.</p>
        </div>
      )
    },
    {
      id: 'total',
      bg: 'bg-gradient-to-br from-rose-900/50 via-[#0B1021] to-[#0B1021]',
      content: (
        <div className="flex flex-col items-center justify-center h-full text-center px-6">
          <p className="text-xl text-rose-300 font-medium mb-4">You spent a total of</p>
          <h2 className="text-6xl font-display font-bold text-white mb-8 shadow-sm">
            {formatCurrency(data.total_spent)}
          </h2>
          <p className="text-lg text-text-secondary">Every rupee tells a story. Where did yours go?</p>
        </div>
      )
    },
    {
      id: 'top-category',
      bg: 'bg-gradient-to-br from-amber-900/50 via-[#0B1021] to-[#0B1021]',
      content: (
        <div className="flex flex-col items-center justify-center h-full text-center px-6">
          <p className="text-xl text-amber-300 font-medium mb-4">Your top category was</p>
          <div className="w-32 h-32 bg-amber-500/20 rounded-full flex items-center justify-center mb-6 border border-amber-500/30">
            <Trophy className="w-12 h-12 text-amber-400" />
          </div>
          <h2 className="text-4xl font-display font-bold text-white mb-2">
            {data.top_category}
          </h2>
          <p className="text-xl text-text-secondary">
            making up <span className="text-amber-400 font-bold">{data.top_category_percentage.toFixed(1)}%</span> of your spending.
          </p>
        </div>
      )
    },
    {
      id: 'splurge',
      bg: 'bg-gradient-to-br from-emerald-900/50 via-[#0B1021] to-[#0B1021]',
      content: (
        <div className="flex flex-col items-center justify-center h-full text-center px-6">
          <p className="text-xl text-emerald-300 font-medium mb-8">Your biggest single splurge was</p>
          <div className="bg-white/5 border border-white/10 p-6 rounded-3xl w-full backdrop-blur-xl">
            <h3 className="text-3xl font-bold text-white mb-2">{data.biggest_splurge_merchant}</h3>
            <p className="text-4xl font-display font-bold text-emerald-400">{formatCurrency(data.biggest_splurge_amount)}</p>
          </div>
          <p className="text-lg text-text-secondary mt-8">Worth it? We hope so! 😉</p>
        </div>
      )
    },
    {
      id: 'savings',
      bg: 'bg-gradient-to-br from-cyan-900/50 via-[#0B1021] to-[#0B1021]',
      content: (
        <div className="flex flex-col items-center justify-center h-full text-center px-6">
          {data.is_positive_savings ? (
            <>
              <div className="w-24 h-24 bg-cyan-500/20 rounded-full flex items-center justify-center mb-6">
                <ArrowDown className="w-10 h-10 text-cyan-400" />
              </div>
              <h2 className="text-3xl font-display font-bold text-white mb-4">Great Job!</h2>
              <p className="text-xl text-text-secondary">
                You spent <span className="text-cyan-400 font-bold">{formatCurrency(data.savings_vs_last_month)}</span> less than last month.
              </p>
            </>
          ) : (
            <>
              <div className="w-24 h-24 bg-rose-500/20 rounded-full flex items-center justify-center mb-6">
                <ArrowUp className="w-10 h-10 text-rose-400" />
              </div>
              <h2 className="text-3xl font-display font-bold text-white mb-4">You lived it up!</h2>
              <p className="text-xl text-text-secondary">
                You spent <span className="text-rose-400 font-bold">{formatCurrency(data.savings_vs_last_month)}</span> more than last month.
              </p>
            </>
          )}
        </div>
      )
    }
  ];

  const nextSlide = () => {
    if (currentSlide < slides.length - 1) setCurrentSlide(c => c + 1);
    else router.back();
  };

  const prevSlide = () => {
    if (currentSlide > 0) setCurrentSlide(c => c - 1);
  };

  return (
    <div className={`fixed inset-0 z-[200] overflow-hidden transition-colors duration-700 ${slides[currentSlide].bg}`}>
      {/* Progress Bars */}
      <div className="absolute top-12 left-4 right-4 flex gap-2 z-10">
        {slides.map((_, idx) => (
          <div key={idx} className="h-1 flex-1 bg-white/20 rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-white"
              initial={{ width: idx < currentSlide ? '100%' : '0%' }}
              animate={{ width: idx === currentSlide ? '100%' : idx < currentSlide ? '100%' : '0%' }}
              transition={{ duration: idx === currentSlide ? 5 : 0.3, ease: 'linear' }}
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
        className="absolute top-16 right-4 p-2 bg-black/20 backdrop-blur-md rounded-full text-white/80 z-20"
      >
        <X className="w-5 h-5" />
      </button>

      {/* Tap Zones */}
      <div className="absolute inset-0 z-0 flex">
        <div className="w-1/3 h-full" onClick={prevSlide} />
        <div className="w-2/3 h-full" onClick={nextSlide} />
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentSlide}
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 1.05, y: -20 }}
          transition={{ duration: 0.4 }}
          className="w-full h-full pointer-events-none"
        >
          {slides[currentSlide].content}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
