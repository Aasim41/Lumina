'use client';

import { motion } from 'framer-motion';
import { LuminaLogo } from '@/components/LuminaLogo';
import { Home, Compass, ArrowLeft } from 'lucide-react';
import { appNavigate } from '@/lib/utils';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0B1021] text-white flex flex-col justify-between items-center p-6 text-center select-none overflow-hidden relative">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-80 h-80 bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 w-72 h-72 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Top Header */}
      <div className="pt-6 z-10">
        <LuminaLogo size={28} showText={true} />
      </div>

      {/* Center 404 Visual */}
      <div className="flex flex-col items-center justify-center my-auto z-10 max-w-sm px-4">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="relative mb-6"
        >
          <div className="w-28 h-28 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center shadow-[0_0_50px_rgba(16,185,129,0.2)]">
            <Compass className="w-14 h-14 text-emerald-400 animate-[spin_10s_linear_infinite]" />
          </div>
          <div className="absolute -bottom-2 -right-2 px-2.5 py-1 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300 font-mono text-xs font-black">
            404
          </div>
        </motion.div>

        <h1 className="text-2xl font-bold font-display tracking-tight text-white mb-2">
          Lost in the Ledger?
        </h1>
        <p className="text-sm text-white/50 leading-relaxed mb-8">
          This financial path doesn't exist or has been reconciled into another account. Let&apos;s get you back on track.
        </p>

        <div className="flex flex-col w-full gap-3">
          <button
            onClick={() => appNavigate('/')}
            className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 text-black font-black text-sm flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(16,185,129,0.3)] active:scale-95 transition-all cursor-pointer"
          >
            <Home className="w-4 h-4" />
            <span>Return to Dashboard</span>
          </button>

          <button
            onClick={() => window.history.back()}
            className="w-full py-3 px-6 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white font-medium text-xs flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Go Back</span>
          </button>
        </div>
      </div>

      {/* Footer Branding */}
      <p className="text-[11px] text-white/30 z-10 pb-4">
        Lumina Smart Expense • Zero-Knowledge Architecture
      </p>
    </div>
  );
}

