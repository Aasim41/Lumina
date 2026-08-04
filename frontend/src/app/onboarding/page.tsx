'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { updateUserProfile } from '@/lib/api';
import { appNavigate, PERSONA_CONFIGS } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

export default function OnboardingPage() {
  const { user, loading: authLoading } = useAuth();
  const [step, setStep] = useState(1);
  const [persona, setPersona] = useState<string>('');
  const [budget, setBudget] = useState('');
  const [budgetDays, setBudgetDays] = useState('30');
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
  }, [user]);

  const handleNext = () => {
    if (step === 1 && persona) {
      setStep(2);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!budget || !persona) return;
    
    setLoading(true);
    try {
      await updateUserProfile({
        monthly_budget: parseFloat(budget.toString()),
        budget_days: parseInt(budgetDays.toString()) || 30,
        user_persona: persona
      });
      toast.success('Profile and budget set! Now create your avatar!');
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
        <h1 className="font-display font-medium tracking-widest text-sm text-white/90 uppercase">Lumina</h1>
        <div className="text-xs font-medium text-[#7cc544] bg-[#7cc544]/10 border border-[#7cc544]/20 px-3 py-1 rounded-full">
          Step {step} of 2
        </div>
      </div>

      <div className="relative w-full max-w-sm z-10 mt-8 mb-auto flex-1 flex flex-col justify-center">
        <AnimatePresence mode="wait">
          {step === 1 ? (
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
                  onClick={handleNext} 
                  size="lg" 
                  className="w-full bg-[#7cc544] hover:bg-[#68a839] text-black border-none" 
                  disabled={!persona}
                >
                  Continue
                </Button>
              </div>
            </motion.div>
          ) : (
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
                  Set your budget constraint for this month.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
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
                    Number of Days
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
                    isLoading={loading}
                  >
                    Confirm & Finish
                  </Button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
