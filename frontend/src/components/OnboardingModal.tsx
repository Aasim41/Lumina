'use client';

import { useState, useEffect } from 'react';
import { updateUserProfile } from '@/lib/api';
import { Button } from './ui/Button';
import toast from 'react-hot-toast';
import { PERSONA_CONFIGS, appNavigate } from '@/lib/utils';


export function OnboardingModal({ user, onComplete }: { user: any, onComplete: () => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [persona, setPersona] = useState<string>('');
  const [budget, setBudget] = useState('');
  const [budgetDays, setBudgetDays] = useState('30');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;

    if (!user.user_persona || !user.monthly_budget || !user.budget_days) {
      setIsOpen(true);
      setStep(1);
      setPersona(user.user_persona || '');
      setBudget(user.monthly_budget ? user.monthly_budget.toString() : '');
      setBudgetDays(user.budget_days ? user.budget_days.toString() : '30');
    }
  }, [user]);

  if (!isOpen) return null;

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
      setIsOpen(false);
      onComplete();
      // Redirect to avatar creation page
      appNavigate('/create-avatar');
    } catch (error: any) {
      const msg = error?.message || 'Unknown error';
      toast.error(`Failed to save settings: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  const selectedConfig = persona ? PERSONA_CONFIGS[persona] : null;

  return (
    <>
      <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[200]" />
      
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-[#12081C] p-8 rounded-3xl border border-primary/20 shadow-2xl overflow-hidden relative pointer-events-auto">
          
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-display font-bold text-white">
              {step === 1 ? 'Choose Your Lifestyle' : 'Set Your Budget'}
            </h2>
            <div className="text-xs font-medium text-primary bg-primary/20 px-2 py-1 rounded-full">
              Step {step} of 2
            </div>
          </div>

          {step === 1 && (
            <div className="space-y-4">
              <p className="text-sm text-text-secondary mb-4">
                Select a persona to customize your default categories and recommendations.
              </p>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(PERSONA_CONFIGS).map(([key, config]) => (
                  <button
                    type="button"
                    key={key}
                    onClick={(e) => { e.preventDefault(); setPersona(key); }}
                    className={`cursor-pointer p-4 rounded-2xl border transition-all duration-300 flex flex-col items-center text-center gap-2 ${
                      persona === key 
                        ? 'bg-primary/20 border-primary shadow-[0_0_15px_rgba(52,211,153,0.3)]' 
                        : 'bg-white/5 border-white/10 hover:bg-white/10'
                    }`}
                  >
                    <span className="text-3xl pointer-events-none">{config.icon}</span>
                    <span className="text-sm font-medium text-white pointer-events-none">{config.label}</span>
                  </button>
                ))}
              </div>
              <div className="pt-4">
                <Button onClick={handleNext} size="lg" className="w-full" disabled={!persona}>
                  Next
                </Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <form onSubmit={handleSubmit} className="space-y-5">
              <p className="text-sm text-text-secondary mb-4">
                Set your budget for this month. 
              </p>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Monthly Budget (₹)</label>
                <input
                  type="number"
                  step="1"
                  required
                  min="0"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder={selectedConfig?.budgetPlaceholder || '50000'}
                />
                {selectedConfig && (
                  <p className="text-xs text-text-secondary mt-2">
                    Suggested range for {selectedConfig.label}: ₹{selectedConfig.budgetRange[0]} - ₹{selectedConfig.budgetRange[1]}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Number of Days
                </label>
                <input 
                  type="number" 
                  required
                  min="1"
                  max="365"
                  value={budgetDays}
                  onChange={(e) => setBudgetDays(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="30"
                />
                <p className="text-xs text-text-secondary mt-2">
                  How many days does this budget last? (Default: 30)
                </p>
              </div>

              <div className="pt-4 flex gap-3">
                <Button type="button" variant="secondary" onClick={() => setStep(1)} className="w-1/3">
                  Back
                </Button>
                <Button type="submit" size="lg" className="flex-1" isLoading={loading}>
                  Confirm
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </>
  );
}
