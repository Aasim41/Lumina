'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Coffee, ChevronDown, ChevronUp, Sparkles, TrendingUp, ArrowRight, Zap } from 'lucide-react';
import gsap from 'gsap';
import { formatCurrency } from '@/lib/utils';

interface MicroSpendProps {
  microSpend?: {
    total: number;
    count: number;
    percentage: number;
    avg: number;
    chai_cups: number;
    recent: any[];
  };
  onOpenQuickPay?: () => void;
}

export function MicroSpendCard({ microSpend, onOpenQuickPay }: MicroSpendProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const totalRef = useRef<HTMLSpanElement>(null);
  const cupsRef = useRef<HTMLSpanElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  const total = microSpend?.total || 0;
  const count = microSpend?.count || 0;
  const percentage = microSpend?.percentage || 0;
  const avg = microSpend?.avg || 0;
  const chaiCups = microSpend?.chai_cups || 0;
  const recent = microSpend?.recent || [];

  // GSAP animated count up
  useEffect(() => {
    if (totalRef.current) {
      gsap.fromTo(
        totalRef.current,
        { innerText: 0 },
        {
          innerText: total,
          duration: 1.2,
          ease: 'power2.out',
          snap: { innerText: 1 },
          onUpdate: function () {
            if (totalRef.current) {
              totalRef.current.innerText = Math.round(Number(totalRef.current.innerText)).toLocaleString('en-IN');
            }
          }
        }
      );
    }

    if (cupsRef.current) {
      gsap.fromTo(
        cupsRef.current,
        { innerText: 0 },
        {
          innerText: chaiCups,
          duration: 1.4,
          ease: 'power2.out',
          snap: { innerText: 1 }
        }
      );
    }

    if (progressRef.current) {
      gsap.fromTo(
        progressRef.current,
        { width: '0%' },
        {
          width: `${Math.min(100, percentage * 2)}%`,
          duration: 1.2,
          ease: 'power3.out'
        }
      );
    }
  }, [total, chaiCups, percentage]);

  // Dynamic persona / status
  const getPersona = () => {
    if (total === 0) return { title: 'Zen Spender 🧘', desc: 'No micro-spends recorded yet', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' };
    if (total <= 500) return { title: 'Mindful Sipper ☕', desc: 'Micro-spends well under control', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' };
    if (total <= 1500) return { title: 'Chai Enthusiast 🍵', desc: 'Healthy daily street & snack balance', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' };
    if (total <= 3000) return { title: 'Snack Aficionado 🥪', desc: 'Small bites are beginning to stack up', color: 'text-orange-400 bg-orange-500/10 border-orange-500/20' };
    return { title: 'Cutting Chai Kingpin 👑', desc: 'Micro-spends are eating significant budget!', color: 'text-rose-400 bg-rose-500/10 border-rose-500/20' };
  };

  const persona = getPersona();

  return (
    <div className="bg-gradient-to-br from-[#181d29] to-[#121622] rounded-3xl p-5 border border-amber-500/20 shadow-xl relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute -top-16 -right-16 w-36 h-36 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Card Header */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-400 flex items-center justify-center text-white shadow-lg shadow-amber-500/25">
            <Coffee className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-white text-base">Chai & Snack Index</h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                &le; ₹150 UPI
              </span>
            </div>
            <p className="text-xs text-text-secondary">Tracks small daily cash & UPI spends</p>
          </div>
        </div>

        {onOpenQuickPay && (
          <button
            onClick={onOpenQuickPay}
            className="p-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 flex items-center gap-1 text-xs font-semibold transition-all active:scale-95"
            title="Quick UPI Pay"
          >
            <Zap className="w-3.5 h-3.5 fill-amber-400" />
            <span>Pay</span>
          </button>
        )}
      </div>

      {/* Hero Stats */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-black/25 border border-white/5 p-3.5 rounded-2xl">
          <p className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider mb-1">
            Total Micro-Spend
          </p>
          <div className="flex items-baseline space-x-1">
            <span className="text-xs font-bold text-amber-400">₹</span>
            <span ref={totalRef} className="text-2xl font-black text-white tracking-tight">
              {total.toLocaleString('en-IN')}
            </span>
          </div>
          <p className="text-[10px] text-text-secondary mt-1">
            Across <span className="text-white font-semibold">{count}</span> transactions
          </p>
        </div>

        <div className="bg-black/25 border border-white/5 p-3.5 rounded-2xl">
          <p className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider mb-1">
            Chai Equivalency
          </p>
          <div className="flex items-baseline space-x-1">
            <span ref={cupsRef} className="text-2xl font-black text-amber-300 tracking-tight">
              {chaiCups}
            </span>
            <span className="text-xs font-bold text-text-secondary">cups</span>
          </div>
          <p className="text-[10px] text-text-secondary mt-1">
            ~₹15/cutting chai standard
          </p>
        </div>
      </div>

      {/* Persona Badge & Micro % Progress Bar */}
      <div className="bg-black/20 border border-white/5 p-3 rounded-2xl mb-3 space-y-2">
        <div className="flex justify-between items-center">
          <span className={`text-xs font-bold px-2.5 py-1 rounded-xl border ${persona.color}`}>
            {persona.title}
          </span>
          <span className="text-xs font-semibold text-text-secondary">
            <strong className="text-amber-400 font-bold">{percentage}%</strong> of monthly spend
          </span>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
          <div
            ref={progressRef}
            className="h-full bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400 rounded-full"
            style={{ width: `${Math.min(100, percentage * 2)}%` }}
          />
        </div>
      </div>

      {/* Expand / Collapse Recent Purchases */}
      {recent.length > 0 && (
        <div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full py-2 flex items-center justify-between text-xs text-text-secondary hover:text-white transition-colors"
          >
            <span>{isExpanded ? 'Hide recent small spends' : `View ${recent.length} recent micro-purchases (avg ₹${avg})`}</span>
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden space-y-2 pt-2 border-t border-white/5"
              >
                {recent.map((tx: any) => (
                  <div
                    key={tx.id}
                    className="flex justify-between items-center py-2 px-3 rounded-xl bg-white/5 border border-white/5 text-xs"
                  >
                    <div>
                      <p className="font-semibold text-white">{tx.merchant_clean || tx.merchant || 'Store'}</p>
                      <p className="text-[10px] text-text-secondary">{tx.date} • {tx.category}</p>
                    </div>
                    <span className="font-bold text-amber-300">
                      {formatCurrency(tx.amount)}
                    </span>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
