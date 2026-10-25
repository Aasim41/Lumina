'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { updateUserProfile } from '@/lib/api';
import { appNavigate, PERSONA_CONFIGS } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { POPULAR_UPI_APPS, getDefaultUpiApp, setDefaultUpiApp } from '@/lib/upi';
import { LuminaLogo } from '@/components/LuminaLogo';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, ShieldCheck, QrCode, CheckCircle2 } from 'lucide-react';

export default function OnboardingPage() {
  const { user, loading: authLoading } = useAuth();
  const [step, setStep] = useState(1);
  const [persona, setPersona] = useState<string>('');
  const [budget, setBudget] = useState('');
  const [budgetDays, setBudgetDays] = useState('30');
  const [selectedUpiApp, setSelectedUpiApp] = useState('gpay');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // If not authenticated and not loading, redirect to login
    if (!authLoading && !user) {
      appNavigate('/login');
    }
  }, [user, authLoading]);

  // Pre-fill if they already have some data
  useEffect(() => {
    if (user && persona === '') {
      setPersona(user.user_persona || '');
      setBudget(user.monthly_budget ? user.monthly_budget.toString() : '');
      setBudgetDays(user.budget_days ? user.budget_days.toString() : '30');
    }
    const savedApp = getDefaultUpiApp();
    if (savedApp) setSelectedUpiApp(savedApp);
  }, [user]);

  const handleNextFromStep1 = () => {
    if (persona) setStep(2);
  };

  const handleNextFromStep2 = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedBudget = parseFloat(budget);
    if (isNaN(parsedBudget) || parsedBudget <= 0) {
      toast.error('Please enter a valid monthly budget');
      return;
    }
    setStep(3);
  };

  const handleFinalSubmit = async () => {
    if (!budget || !persona) return;

    setLoading(true);
    try {
      // 1. Save preferred UPI App
      setDefaultUpiApp(selectedUpiApp);

      // 2. Save user profile & budget settings
      await updateUserProfile({
        monthly_budget: parseFloat(budget.toString()),
        budget_days: parseInt(budgetDays.toString()) || 30,
        user_persona: persona
      });

      toast.success('Setup complete! Create your 3D avatar!');
      appNavigate('/create-avatar');
    } catch (error: any) {
      const msg = error?.message || 'Unknown error';
      toast.error(`Failed to save settings: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <div className="w-[300px] h-[300px] absolute bg-[#7cc544]/20 rounded-full blur-[100px] pointer-events-none" />
        <div className="animate-spin w-8 h-8 border-4 border-[#7cc544] border-t-transparent rounded-full z-10" />
      </div>
    );
  }

  const selectedConfig = persona ? PERSONA_CONFIGS[persona] : null;

  return (
    <div className="min-h-screen flex flex-col items-center justify-between p-6 bg-black text-white overflow-hidden relative">
      {/* Background Glow */}
      <div className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none">
        <div className="w-[300px] h-[300px] bg-[#7cc544]/20 rounded-full blur-[100px]" />
      </div>

      {/* Top Header */}
      <div className="w-full max-w-sm flex justify-between items-center z-10 pt-4">
        <LuminaLogo size={28} showText={true} />
        <div className="text-xs font-medium text-[#7cc544] bg-[#7cc544]/10 border border-[#7cc544]/20 px-3 py-1 rounded-full">
          Step {step} of 3
        </div>
      </div>

      <div className="relative w-full max-w-sm z-10 mt-6 mb-auto flex-1 flex flex-col justify-center">
        <AnimatePresence mode="wait">
          {/* STEP 1: CHOOSE LIFESTYLE PERSONA */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-6"
            >
              <div>
                <h2 className="text-3xl font-display font-bold text-white mb-2">Choose Lifestyle</h2>
                <p className="text-sm text-white/60">
                  Select a persona to customize your default categories and recommendations.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {Object.entries(PERSONA_CONFIGS).map(([key, config]) => (
                  <button
                    type="button"
                    key={key}
                    onClick={(e) => { e.preventDefault(); setPersona(key); }}
                    className={`cursor-pointer p-4 rounded-2xl border transition-all duration-300 flex flex-col items-center text-center gap-3 ${
                      persona === key 
                        ? 'bg-[#7cc544]/10 border-[#7cc544] shadow-[0_0_15px_rgba(124,197,68,0.2)]' 
                        : 'bg-white/5 border-white/10 hover:bg-white/10'
                    }`}
                  >
                    <span className="text-3xl pointer-events-none">{config.icon}</span>
                    <span className="text-sm font-medium text-white pointer-events-none">{config.label}</span>
                  </button>
                ))}
              </div>

              <div className="pt-4">
                <Button 
                  onClick={handleNextFromStep1} 
                  size="lg" 
                  className="w-full bg-[#7cc544] hover:bg-[#68a839] text-black border-none" 
                  disabled={!persona}
                >
                  Continue
                </Button>
              </div>
            </motion.div>
          )}

          {/* STEP 2: SET BUDGET */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-6"
            >
              <div>
                <h2 className="text-3xl font-display font-bold text-white mb-2">Set Budget</h2>
                <p className="text-sm text-white/60">
                  Set your spending limit for this budget cycle.
                </p>
              </div>

              <form onSubmit={handleNextFromStep2} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">Monthly Budget (₹)</label>
                  <input
                    type="number"
                    step="1"
                    required
                    min="0"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-lg text-white focus:outline-none focus:ring-2 focus:ring-[#7cc544] focus:border-transparent transition-all"
                    placeholder={selectedConfig?.budgetPlaceholder || '50000'}
                  />
                  {selectedConfig && (
                    <p className="text-xs text-[#7cc544] mt-2 flex justify-between">
                      <span>Suggested for {selectedConfig.label}:</span>
                      <span className="font-medium font-mono">₹{selectedConfig.budgetRange[0]} - ₹{selectedConfig.budgetRange[1]}</span>
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    Cycle Duration (Days)
                  </label>
                  <input 
                    type="number" 
                    required
                    min="1"
                    max="365"
                    value={budgetDays}
                    onChange={(e) => setBudgetDays(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-lg text-white focus:outline-none focus:ring-2 focus:ring-[#7cc544] focus:border-transparent transition-all"
                    placeholder="30"
                  />
                  <p className="text-xs text-white/40 mt-2">
                    How many days does this budget last? (Default: 30)
                  </p>
                </div>

                <div className="pt-6 flex gap-3">
                  <Button 
                    type="button" 
                    onClick={() => setStep(1)} 
                    className="w-1/3 bg-white/10 hover:bg-white/20 text-white border-white/10"
                  >
                    Back
                  </Button>
                  <Button 
                    type="submit" 
                    size="lg" 
                    className="flex-1 bg-[#7cc544] hover:bg-[#68a839] text-black border-none" 
                  >
                    Next: Connect UPI
                  </Button>
                </div>
              </form>
            </motion.div>
          )}

          {/* STEP 3: PREFERRED UPI APP & STANDEE SCANNER SETUP */}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-5"
            >
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <Zap className="w-6 h-6 text-emerald-400 fill-emerald-400" />
                  <h2 className="text-2xl font-display font-bold text-white">Preferred UPI App</h2>
                </div>
                <p className="text-xs text-white/60">
                  Select your primary UPI app. Lumina will launch it in 0.2s without asking you which app to open each time!
                </p>
              </div>

              {/* UPI App Selection Grid */}
              <div className="grid grid-cols-2 gap-2.5 max-h-56 overflow-y-auto pr-1 scrollbar-thin">
                {POPULAR_UPI_APPS.map((app) => {
                  const isSelected = selectedUpiApp === app.id;
                  return (
                    <button
                      key={app.id}
                      type="button"
                      onClick={() => setSelectedUpiApp(app.id)}
                      className={`p-3.5 rounded-2xl border transition-all text-left flex items-center justify-between ${
                        isSelected
                          ? 'bg-emerald-500/20 border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)] text-white'
                          : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="w-8 h-8 rounded-xl bg-black/40 flex items-center justify-center font-bold text-sm">
                          {app.iconText}
                        </span>
                        <div>
                          <p className="text-xs font-bold text-white">{app.name}</p>
                          <p className="text-[10px] text-white/50">{app.id === 'any' ? 'Always ask' : 'Direct 1-tap'}</p>
                        </div>
                      </div>
                      {isSelected && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Feature Highlights */}
              <div className="bg-white/5 border border-white/10 p-3.5 rounded-2xl space-y-2 text-xs">
                <div className="flex items-center gap-2 text-emerald-300">
                  <ShieldCheck className="w-4 h-4 shrink-0" />
                  <span>Bypasses Android app chooser dialog</span>
                </div>
                <div className="flex items-center gap-2 text-emerald-300">
                  <QrCode className="w-4 h-4 shrink-0" />
                  <span>Built-in Standee QR Scanner for offline counter QRs</span>
                </div>
                <div className="flex items-center gap-2 text-emerald-300">
                  <Zap className="w-4 h-4 shrink-0" />
                  <span>Auto-records expenses straight to your budget on completion</span>
                </div>
              </div>

              <div className="pt-2 flex gap-3">
                <Button 
                  type="button" 
                  onClick={() => setStep(2)} 
                  className="w-1/3 bg-white/10 hover:bg-white/20 text-white border-white/10"
                >
                  Back
                </Button>
                <Button 
                  type="button"
                  onClick={handleFinalSubmit}
                  size="lg" 
                  className="flex-1 bg-[#7cc544] hover:bg-[#68a839] text-black font-bold border-none" 
                  isLoading={loading}
                >
                  Confirm & Finish
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
