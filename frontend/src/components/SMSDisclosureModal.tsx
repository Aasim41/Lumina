'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Shield, MessageSquare, CheckCircle2, Lock, X, ArrowRight } from 'lucide-react';
import { Button } from './ui/Button';

interface SMSDisclosureModalProps {
  isOpen: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

export function SMSDisclosureModal({ isOpen, onAccept, onDecline }: SMSDisclosureModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 10 }}
        className="w-full max-w-sm bg-[#0B1424] border border-cyan-500/30 rounded-3xl p-6 shadow-[0_0_50px_rgba(6,182,212,0.15)] text-white relative"
      >
        {/* Header Icon */}
        <div className="flex items-center justify-center mb-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-3xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.25)]">
              <MessageSquare className="w-8 h-8" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Shield className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>

        {/* Title */}
        <div className="text-center mb-4">
          <h3 className="font-display font-bold text-lg text-white mb-1">
            Automatic Expense Tracking
          </h3>
          <p className="text-xs text-cyan-300/70">
            Powered by On-Device Bank SMS Parsing
          </p>
        </div>

        {/* Google Play Required Prominent Disclosure */}
        <div className="space-y-3 mb-6 bg-white/[0.03] border border-white/5 p-4 rounded-2xl text-xs text-white/80 leading-relaxed">
          <p>
            To automatically log and categorize your spending without manual entry, Lumina requests access to read incoming transactional bank SMS messages.
          </p>

          <div className="space-y-2 pt-1">
            <div className="flex items-start gap-2 text-emerald-300">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
              <span><strong>100% On-Device:</strong> Your SMS text is processed strictly on your phone using local regex algorithms.</span>
            </div>
            <div className="flex items-start gap-2 text-cyan-300">
              <Lock className="w-4 h-4 shrink-0 mt-0.5 text-cyan-400" />
              <span><strong>Zero Telemetry:</strong> SMS messages and OTPs are <strong>never uploaded</strong> to any remote server or third party.</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2.5">
          <button
            onClick={onAccept}
            className="w-full py-3.5 px-4 bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-black font-bold text-sm rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95 shadow-[0_0_20px_rgba(6,182,212,0.3)] cursor-pointer"
          >
            <span>Allow & Enable Auto-Tracking</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={onDecline}
            className="w-full py-3 px-4 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white font-medium text-xs rounded-2xl transition-all cursor-pointer"
          >
            Not Now, I'll Enter Manually
          </button>
        </div>

        <p className="text-[10px] text-white/40 text-center mt-3">
          You can revoke or change permissions anytime in Android App Settings.
        </p>
      </motion.div>
    </div>
  );
}
