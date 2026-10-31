'use client';

import { ArrowLeft, Shield, Lock, EyeOff, Database, CheckCircle2, QrCode, FileText, Mail, AlertCircle, HelpCircle } from 'lucide-react';
import { appNavigate } from '@/lib/utils';

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-[#0B1021] text-white p-4 sm:p-6 pb-28 safe-pt">
      {/* Header */}
      <div className="max-w-2xl mx-auto flex items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => appNavigate('/')}
            className="p-2.5 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 text-white transition-all active:scale-95 cursor-pointer"
            title="Back to Home"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold font-display text-white">Privacy Policy</h1>
            <p className="text-[11px] text-white/50">Lumina Smart Expense • Effective November 2026</p>
          </div>
        </div>
        <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-3 py-1 rounded-full">
          100% On-Device
        </span>
      </div>

      <div className="space-y-5 max-w-2xl mx-auto">
        {/* Core Guarantee Card */}
        <div className="p-5 rounded-3xl bg-gradient-to-br from-emerald-500/15 via-teal-500/10 to-transparent border border-emerald-500/30 text-emerald-200 space-y-2.5 shadow-[0_0_30px_rgba(16,185,129,0.1)]">
          <div className="flex items-center gap-2.5 font-bold text-base text-emerald-300">
            <Shield className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>Zero-Knowledge & Privacy-First Architecture</span>
          </div>
          <p className="text-xs text-emerald-200/90 leading-relaxed">
            Lumina is engineered from the ground up to guarantee absolute privacy for your personal finances. We operate with a <strong>Zero-Knowledge Architecture</strong>: all your financial transactions, bank SMS alerts, account balances, and budgeting records are stored strictly on your physical device. We do not maintain any central cloud database storing your financial records.
          </p>
        </div>

        {/* Section 1: Information Collection & Usage */}
        <div className="p-5 rounded-3xl bg-white/5 border border-white/10 space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Database className="w-4 h-4" />
            </div>
            <h2 className="font-semibold text-sm text-white">1. Information We Process & Where It Lives</h2>
          </div>
          <p className="text-xs text-white/70 leading-relaxed">
            When you use Lumina, the application processes information locally to give you automated expense tracking, smart budget forecasting, and debt tracking.
          </p>
          <div className="space-y-2 text-xs text-white/70 pl-2">
            <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/5 space-y-1">
              <strong className="text-white">Profile & Preferences:</strong> Your name, avatar, monthly budget targets, and financial persona are stored locally in your browser/device database.
            </div>
            <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/5 space-y-1">
              <strong className="text-white">Transaction Ledger:</strong> Records of your expenses, income credits, UPI payee names, and categories are stored in an encrypted on-device IndexedDB database.
            </div>
          </div>
        </div>

        {/* Section 2: SMS Permissions (Google Play Financial Policy Disclosure) */}
        <div className="p-5 rounded-3xl bg-white/5 border border-white/10 space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <EyeOff className="w-4 h-4" />
            </div>
            <h2 className="font-semibold text-sm text-white">2. SMS Permissions & Financial SMS Parsing</h2>
          </div>
          <p className="text-xs text-white/70 leading-relaxed">
            To provide automated real-time expense tracking without requiring manual typing, Lumina requests optional Android SMS permissions (<code className="text-cyan-300">READ_SMS</code> and <code className="text-cyan-300">RECEIVE_SMS</code>).
          </p>
          <div className="p-3.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-200 text-xs space-y-1.5">
            <strong className="text-cyan-300">Strict Functional Scope:</strong>
            <p className="leading-relaxed">
              Our on-device regex engine filters specifically for transactional notifications sent by recognized banking institutions and payment networks (SBI, HDFC, ICICI, Axis, Kotak, PNB, BOB, Canara, CRED, Paytm, PhonePe, Google Pay).
            </p>
          </div>
          <ul className="text-xs text-white/70 space-y-2 pl-2">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span><strong>Zero Telemetry Uploads:</strong> The text of your SMS messages never leaves your device and is never uploaded to any remote server or third party.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span><strong>OTPs & Personal Chats Discarded:</strong> Lumina's parsing algorithm explicitly rejects and discards all one-time passwords (OTPs), verification codes, Aadhaar notifications, and personal conversational messages.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span><strong>Revocable Anytime:</strong> You can revoke SMS permission at any time through your Android System Settings without losing access to manual logging or UPI quick pay.</span>
            </li>
          </ul>
        </div>

        {/* Section 3: Biometric & Security Hardware */}
        <div className="p-5 rounded-3xl bg-white/5 border border-white/10 space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <Lock className="w-4 h-4" />
            </div>
            <h2 className="font-semibold text-sm text-white">3. Biometric Security & Android Keystore</h2>
          </div>
          <p className="text-xs text-white/70 leading-relaxed">
            When you activate App Lock with Fingerprint or Face Recognition, authentication is delegated directly to Android's secure hardware enclave using the official Android <code className="text-purple-300">BiometricPrompt</code> API.
          </p>
          <p className="text-xs text-white/60 leading-relaxed">
            Lumina never accesses, stores, or handles your biometric templates or raw biometric data. Authentication takes place entirely inside the operating system's Trusted Execution Environment (TEE).
          </p>
        </div>

        {/* Section 4: Camera & QR Code Scanning */}
        <div className="p-5 rounded-3xl bg-white/5 border border-white/10 space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <QrCode className="w-4 h-4" />
            </div>
            <h2 className="font-semibold text-sm text-white">4. Camera Permission for QR Code Scanning</h2>
          </div>
          <p className="text-xs text-white/70 leading-relaxed">
            Lumina requests camera permission strictly for real-time scanning of NPCI UPI QR codes and BharatQR standees. The video feed is analyzed frame-by-frame entirely on-device to decode the payment string. No photographs, videos, or image buffers are ever saved to device storage or transmitted over the network.
          </p>
        </div>

        {/* Section 5: Third-Party UPI Apps & Financial Custody */}
        <div className="p-5 rounded-3xl bg-white/5 border border-white/10 space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <FileText className="w-4 h-4" />
            </div>
            <h2 className="font-semibold text-sm text-white">5. Third-Party UPI Applications</h2>
          </div>
          <p className="text-xs text-white/70 leading-relaxed">
            Lumina is not a bank, non-banking financial company (NBFC), or payment gateway. Lumina uses official Android Intents to delegate fund transfers directly to NPCI-approved UPI applications installed on your phone (Google Pay, PhonePe, Paytm, BHIM, CRED).
          </p>
          <p className="text-xs text-white/60 leading-relaxed">
            Lumina never accesses your bank account credentials, debit card details, or UPI PIN.
          </p>
        </div>

        {/* Section 6: Data Ownership, Export & Deletion */}
        <div className="p-5 rounded-3xl bg-white/5 border border-white/10 space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <AlertCircle className="w-4 h-4" />
            </div>
            <h2 className="font-semibold text-sm text-white">6. Your Data Rights & Deletion Guarantee</h2>
          </div>
          <p className="text-xs text-white/70 leading-relaxed">
            Because your financial records belong exclusively to you, Lumina provides complete data sovereignty:
          </p>
          <ul className="text-xs text-white/70 space-y-2 pl-2">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span><strong>Instant Full Data Wipe:</strong> Tapping "Delete Account & Wipe All Data" in Settings instantly purges all transactions, budgets, and keys from your local storage permanently.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span><strong>Offline Backup & Export:</strong> You can export your full transaction ledger anytime as an encrypted JSON backup or printable statement.</span>
            </li>
          </ul>
        </div>

        {/* Section 7: Developer Contact & Grievance */}
        <div className="p-5 rounded-3xl bg-white/5 border border-white/10 space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center text-violet-400">
              <Mail className="w-4 h-4" />
            </div>
            <h2 className="font-semibold text-sm text-white">7. Contact & Privacy Officer</h2>
          </div>
          <p className="text-xs text-white/70 leading-relaxed">
            If you have questions regarding this Privacy Policy, your rights under applicable privacy laws, or data handling practices in Lumina, please contact our team:
          </p>
          <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/5 text-xs text-white/80 space-y-1">
            <p><strong>App:</strong> Lumina Smart Expense (Android)</p>
            <p><strong>Support Email:</strong> <span className="text-emerald-400">support@luminaexpense.app</span></p>
            <p><strong>Developer:</strong> Lumina Financial Technologies</p>
          </div>
        </div>

        <p className="text-center text-[11px] text-white/40 pt-4">
          © {new Date().getFullYear()} Lumina Smart Expense. All rights reserved.
        </p>
      </div>
    </div>
  );
}
