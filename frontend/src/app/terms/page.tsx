'use client';

import { ArrowLeft, FileText, CheckCircle2, AlertTriangle, Shield, CreditCard, Scale, Mail } from 'lucide-react';
import { appNavigate } from '@/lib/utils';

export default function TermsPage() {
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
            <h1 className="text-xl font-bold font-display text-white">Terms of Use</h1>
            <p className="text-[11px] text-white/50">Lumina Smart Expense • Effective November 2026</p>
          </div>
        </div>
        <span className="text-[11px] font-semibold text-cyan-400 bg-cyan-500/15 border border-cyan-500/30 px-3 py-1 rounded-full">
          Version 2.0
        </span>
      </div>

      <div className="space-y-5 max-w-2xl mx-auto">
        {/* Intro Banner */}
        <div className="p-5 rounded-3xl bg-gradient-to-br from-cyan-500/15 via-blue-500/10 to-transparent border border-cyan-500/30 text-cyan-200 space-y-2 shadow-[0_0_30px_rgba(6,182,212,0.1)]">
          <div className="flex items-center gap-2.5 font-bold text-base text-cyan-300">
            <FileText className="w-5 h-5 text-cyan-400 shrink-0" />
            <span>Terms of Service Agreement</span>
          </div>
          <p className="text-xs text-cyan-200/90 leading-relaxed">
            Please read these Terms of Use carefully before using Lumina Smart Expense. By installing, opening, or accessing Lumina, you agree to be bound by these terms. If you do not agree with any part of these terms, please do not use the application.
          </p>
        </div>

        {/* Section 1: Service Description */}
        <div className="p-5 rounded-3xl bg-white/5 border border-white/10 space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Shield className="w-4 h-4" />
            </div>
            <h2 className="font-semibold text-sm text-white">1. Service Description & Offline Utility</h2>
          </div>
          <p className="text-xs text-white/70 leading-relaxed">
            Lumina is a personal finance management, expense tracking, and budget visualization application designed to operate 100% on-device. Lumina provides tools to log expenses, calculate budget targets, analyze spending habits, and construct deep links to installed NPCI UPI applications for payment initiation.
          </p>
        </div>

        {/* Section 2: Non-Custodial & Third-Party Payments */}
        <div className="p-5 rounded-3xl bg-white/5 border border-white/10 space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <CreditCard className="w-4 h-4" />
            </div>
            <h2 className="font-semibold text-sm text-white">2. Payments & Third-Party UPI Apps</h2>
          </div>
          <p className="text-xs text-white/70 leading-relaxed">
            Lumina is <strong>not</strong> a bank, payment service provider (PSP), payment aggregator, or financial intermediary.
          </p>
          <ul className="text-xs text-white/70 space-y-2 pl-2">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span><strong>No Fund Custody:</strong> Lumina never holds, touches, transmits, or receives user monetary funds. All transactions are settled directly between your bank and the recipient's bank via NPCI UPI protocol.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span><strong>Third-Party Terms:</strong> Payment execution is governed by the respective terms of your installed UPI apps (Google Pay, PhonePe, Paytm, CRED) and your issuing bank.</span>
            </li>
          </ul>
        </div>

        {/* Section 3: Financial Advice Disclaimer */}
        <div className="p-5 rounded-3xl bg-white/5 border border-white/10 space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <h2 className="font-semibold text-sm text-white">3. Financial Advice Disclaimer</h2>
          </div>
          <p className="text-xs text-white/70 leading-relaxed">
            The insights, spending forecasts, budget recommendations, and archetypes generated by Lumina are provided for informational, organizational, and educational purposes only.
          </p>
          <p className="text-xs text-white/60 leading-relaxed">
            Lumina is not a SEBI-registered investment advisor or financial consultant. You should consult a certified financial planner for individual investment, tax, or legal advice.
          </p>
        </div>

        {/* Section 4: Automated SMS Tracking */}
        <div className="p-5 rounded-3xl bg-white/5 border border-white/10 space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <FileText className="w-4 h-4" />
            </div>
            <h2 className="font-semibold text-sm text-white">4. SMS Reading & Parsing Accuracy</h2>
          </div>
          <p className="text-xs text-white/70 leading-relaxed">
            Lumina utilizes local pattern matching to extract transaction figures from SMS messages sent by banking institutions. While our algorithm is designed and tested against dozens of bank formats, SMS formatting may vary by telecom operator or bank updates. You are encouraged to review logged transactions for accuracy.
          </p>
        </div>

        {/* Section 5: User Data & Backup Responsibility */}
        <div className="p-5 rounded-3xl bg-white/5 border border-white/10 space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <Scale className="w-4 h-4" />
            </div>
            <h2 className="font-semibold text-sm text-white">5. Data Ownership & Backup</h2>
          </div>
          <p className="text-xs text-white/70 leading-relaxed">
            Because Lumina operates without remote servers, you maintain sole ownership and custody of your records. If you uninstall the app or clear app data without exporting a backup, your local transaction history may be removed. We provide export features in Settings to allow you to store your own encrypted backups safely.
          </p>
        </div>

        {/* Section 6: Limitation of Liability */}
        <div className="p-5 rounded-3xl bg-white/5 border border-white/10 space-y-3">
          <h2 className="font-semibold text-sm text-white">6. Limitation of Liability</h2>
          <p className="text-xs text-white/70 leading-relaxed">
            To the maximum extent permitted by applicable law, Lumina, its developers, and affiliates shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of profits, data, or financial loss resulting from your use of or inability to use the service.
          </p>
        </div>

        {/* Section 7: Governing Law & Contact */}
        <div className="p-5 rounded-3xl bg-white/5 border border-white/10 space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center text-violet-400">
              <Mail className="w-4 h-4" />
            </div>
            <h2 className="font-semibold text-sm text-white">7. Governing Law & Inquiries</h2>
          </div>
          <p className="text-xs text-white/70 leading-relaxed">
            These Terms shall be governed by and construed in accordance with the laws of India. For questions or notices concerning these Terms of Use, please reach out to us:
          </p>
          <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/5 text-xs text-white/80 space-y-1">
            <p><strong>Support:</strong> <span className="text-cyan-400">support@luminaexpense.app</span></p>
            <p><strong>App:</strong> Lumina Smart Expense (Android)</p>
          </div>
        </div>

        <p className="text-center text-[11px] text-white/40 pt-4">
          © {new Date().getFullYear()} Lumina Smart Expense. All rights reserved.
        </p>
      </div>
    </div>
  );
}
