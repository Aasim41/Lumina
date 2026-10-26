'use client';

import { ArrowLeft, Shield, Lock, EyeOff, Database, CheckCircle2 } from 'lucide-react';
import { appNavigate } from '@/lib/utils';

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-[#0B1021] text-white p-5 pb-24 safe-pt">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => appNavigate('/')}
          className="p-2.5 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 text-white transition-all active:scale-95 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-lg font-bold font-display text-white">Privacy Policy</h1>
          <p className="text-[11px] text-white/50">Lumina Smart Expense • Updated Oct 2026</p>
        </div>
      </div>

      <div className="space-y-4 max-w-lg mx-auto">
        {/* Core Guarantee Card */}
        <div className="p-5 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 space-y-2">
          <div className="flex items-center gap-2 font-bold text-sm text-emerald-400">
            <Shield className="w-5 h-5 text-emerald-400" />
            <span>Zero-Knowledge & On-Device Guarantee</span>
          </div>
          <p className="text-xs text-emerald-300/80 leading-relaxed">
            Lumina is built from the ground up to respect your financial confidentiality. Your financial transactions, bank messages, and personal balances are stored strictly on your local device.
          </p>
        </div>

        {/* Section 1: SMS Reading Policy */}
        <div className="p-5 rounded-3xl bg-white/5 border border-white/10 space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <EyeOff className="w-4 h-4" />
            </div>
            <h2 className="font-semibold text-sm text-white">1. SMS Parsing & Permissions</h2>
          </div>
          <p className="text-xs text-white/70 leading-relaxed">
            Lumina requests SMS read permission strictly to detect debit and credit alerts from Indian banks (e.g., HDFC, SBI, ICICI, Axis).
          </p>
          <ul className="text-xs text-white/60 space-y-2 pl-2">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
              <span>Only automated bank alerts are analyzed; personal chats and OTPs are ignored.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
              <span>Regex parsing runs entirely on your phone processor without uploading raw text.</span>
            </li>
          </ul>
        </div>

        {/* Section 2: Biometric Data */}
        <div className="p-5 rounded-3xl bg-white/5 border border-white/10 space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <Lock className="w-4 h-4" />
            </div>
            <h2 className="font-semibold text-sm text-white">2. Biometric & App Lock Data</h2>
          </div>
          <p className="text-xs text-white/70 leading-relaxed">
            Fingerprint and face authentication are delegated entirely to the Android OS hardware Keystore via Android <code className="text-purple-300">BiometricPrompt</code>. Lumina never accesses, records, or transmits raw biometric telemetry.
          </p>
        </div>

        {/* Section 3: Data Deletion & Control */}
        <div className="p-5 rounded-3xl bg-white/5 border border-white/10 space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Database className="w-4 h-4" />
            </div>
            <h2 className="font-semibold text-sm text-white">3. Your Right to Delete Data</h2>
          </div>
          <p className="text-xs text-white/70 leading-relaxed">
            You own 100% of your data. You can export statements to encrypted PDF at any time, or purge all records instantly using the "Wipe Data & Reset" option in App Security Settings.
          </p>
        </div>

        {/* Contact info */}
        <p className="text-center text-[11px] text-white/40 pt-4">
          Questions or data requests? Contact support@luminaexpense.app
        </p>
      </div>
    </div>
  );
}
