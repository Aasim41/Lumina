'use client';

import { ArrowLeft, FileText, CheckCircle2 } from 'lucide-react';
import { appNavigate } from '@/lib/utils';

export default function TermsPage() {
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
          <h1 className="text-lg font-bold font-display text-white">Terms of Service</h1>
          <p className="text-[11px] text-white/50">Lumina Smart Expense • Version 1.0</p>
        </div>
      </div>

      <div className="space-y-4 max-w-lg mx-auto">
        <div className="p-5 rounded-3xl bg-white/5 border border-white/10 space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <FileText className="w-4 h-4" />
            </div>
            <h2 className="font-semibold text-sm text-white">1. Service Overview</h2>
          </div>
          <p className="text-xs text-white/70 leading-relaxed">
            Lumina is a personal expense tracking, budgeting, and financial intelligence utility. It facilitates deep linking to standard NPCI UPI payment applications (PhonePe, Google Pay, Paytm, CRED) but does not act as a payment gateway or banking intermediary.
          </p>
        </div>

        <div className="p-5 rounded-3xl bg-white/5 border border-white/10 space-y-3">
          <h2 className="font-semibold text-sm text-white">2. Financial Disclaimer</h2>
          <p className="text-xs text-white/70 leading-relaxed">
            AI-generated insights, budget forecasts, and categorizations provided by Lumina are for informational and budgeting convenience only and should not be construed as registered financial advisory.
          </p>
        </div>

        <div className="p-5 rounded-3xl bg-white/5 border border-white/10 space-y-3">
          <h2 className="font-semibold text-sm text-white">3. Third-Party UPI Apps</h2>
          <p className="text-xs text-white/70 leading-relaxed">
            All fund transfers and merchant settlements occur strictly within your respective authorized banking apps via NPCI UPI protocol. Lumina does not hold, move, or store user funds.
          </p>
        </div>
      </div>
    </div>
  );
}

