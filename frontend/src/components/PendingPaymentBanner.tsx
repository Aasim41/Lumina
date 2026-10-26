'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, CheckCircle2, XCircle, Zap, ShieldAlert } from 'lucide-react';
import { db } from '@/lib/db';
import { soundFX } from '@/lib/soundFx';
import { formatCurrency } from '@/lib/utils';
import toast from 'react-hot-toast';

interface PendingPaymentInfo {
  id: string;
  merchant: string;
  amount: number;
  time: number;
}

export function PendingPaymentBanner({ onReconciled }: { onReconciled?: () => void }) {
  const [pending, setPending] = useState<PendingPaymentInfo | null>(null);

  const checkPending = useCallback(() => {
    try {
      const raw = localStorage.getItem('lumina_pending_payment');
      if (!raw) {
        setPending(null);
        return;
      }
      const parsed: PendingPaymentInfo = JSON.parse(raw);
      // Expire pending check after 30 minutes
      if (Date.now() - parsed.time > 30 * 60 * 1000) {
        localStorage.removeItem('lumina_pending_payment');
        setPending(null);
        return;
      }
      setPending(parsed);
    } catch {
      setPending(null);
    }
  }, []);

  useEffect(() => {
    checkPending();
    const handleFocus = () => checkPending();
    window.addEventListener('focus', handleFocus);
    window.addEventListener('visibilitychange', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('visibilitychange', handleFocus);
    };
  }, [checkPending]);

  const handleConfirm = async () => {
    if (!pending) return;
    try {
      await db.transactions.update(pending.id, {
        status: 'confirmed'
      });
      soundFX.playChaChing();
      localStorage.removeItem('lumina_pending_payment');
      setPending(null);
      toast.success(`Payment to ${pending.merchant} confirmed! 🎉`, { icon: '✅' });
      onReconciled?.();
    } catch (e) {
      toast.error('Failed to confirm payment');
    }
  };

  const handleCancel = async () => {
    if (!pending) return;
    try {
      await db.transactions.delete(pending.id);
      localStorage.removeItem('lumina_pending_payment');
      setPending(null);
      toast('Payment marked as cancelled / failed.', { icon: 'ℹ️' });
      onReconciled?.();
    } catch (e) {
      toast.error('Failed to update payment');
    }
  };

  if (!pending) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.96 }}
        className="mx-5 mb-5 p-4 rounded-3xl bg-gradient-to-r from-amber-500/20 via-orange-500/15 to-amber-500/10 border border-amber-500/35 shadow-[0_0_30px_rgba(245,158,11,0.15)] relative overflow-hidden z-20"
      >
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Clock className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-500/30">
                  Verification Needed
                </span>
              </div>
              <h4 className="text-sm font-bold text-white mt-0.5">
                Did your payment of <span className="text-amber-300 font-extrabold">{formatCurrency(pending.amount)}</span> go through?
              </h4>
              <p className="text-[11px] text-white/60">
                To <span className="text-white font-semibold">{pending.merchant}</span> via UPI
              </p>
            </div>
          </div>
        </div>

        {/* 1-Tap Action Buttons */}
        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={handleConfirm}
            className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 text-black font-black text-xs flex items-center justify-center gap-1.5 shadow-[0_0_15px_rgba(16,185,129,0.3)] active:scale-95 transition-all cursor-pointer"
          >
            <CheckCircle2 className="w-3.5 h-3.5 fill-black text-emerald-400" />
            <span>Yes, Confirmed</span>
          </button>

          <button
            onClick={handleCancel}
            className="py-2.5 px-3 rounded-xl bg-white/10 hover:bg-rose-500/20 border border-white/10 hover:border-rose-500/30 text-white/80 hover:text-rose-300 font-semibold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer"
          >
            <XCircle className="w-3.5 h-3.5" />
            <span>Failed / Cancelled</span>
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

