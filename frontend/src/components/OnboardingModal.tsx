'use client';

import { useState, useEffect } from 'react';
import { updateUserProfile } from '@/lib/api';
import { Button } from './ui/Button';
import toast from 'react-hot-toast';

export function OnboardingModal({ user, onComplete }: { user: any, onComplete: () => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [age, setAge] = useState(user?.age || '');
  const [budget, setBudget] = useState(user?.monthly_budget || '');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;

    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    
    let needsFullOnboarding = !user.age || !user.monthly_budget;
    let needsMonthlyUpdate = false;

    if (!needsFullOnboarding && user.last_budget_update) {
      const lastUpdate = new Date(user.last_budget_update);
      if (lastUpdate.getMonth() !== currentMonth || lastUpdate.getFullYear() !== currentYear) {
        needsMonthlyUpdate = true;
      }
    } else if (!needsFullOnboarding && !user.last_budget_update) {
       // Catch edge case for existing users missing the date field
       needsMonthlyUpdate = true;
    }

    if (needsFullOnboarding || needsMonthlyUpdate) {
      setIsOpen(true);
      setName(user.name === 'Local User' ? '' : user.name);
      
      // If just updating for new month, keep name and age pre-filled
      if (needsMonthlyUpdate && !needsFullOnboarding) {
         setName(user.name);
         setAge(user.age);
         // Leave budget empty or prefill? Let's leave empty so they actively enter it
         setBudget('');
      }
    }
  }, [user]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !age || !budget) return;
    
    setLoading(true);
    try {
      await updateUserProfile({
        name,
        age: parseInt(age.toString()),
        monthly_budget: parseFloat(budget.toString())
      });
      toast.success('Welcome to Smart Expense!');
      setIsOpen(false);
      onComplete();
    } catch (error) {
      toast.error('Failed to save profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] animate-fadeIn" />
      
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <div className="w-full max-w-md glass p-8 rounded-3xl animate-slideUp border border-primary/20 shadow-2xl shadow-primary/20">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-display font-bold text-white mb-2">
              {!user?.name || !user?.age || (!user?.last_budget_update && !user?.monthly_budget) ? 'Welcome!' : 'Welcome back!'}
            </h2>
            <p className="text-text-secondary">
              {!user?.name || !user?.age || (!user?.last_budget_update && !user?.monthly_budget) ? 'Let\'s set up your financial profile.' : 'Please set your budget for this new month.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {!user?.name || !user?.age || (!user?.last_budget_update && !user?.monthly_budget) ? (
              <>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">Your Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-surface border border-white/10 rounded-xl px-4 py-3 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="John Doe"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">Your Age</label>
                  <input
                    type="number"
                    required
                    min="13"
                    max="120"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    className="w-full bg-surface border border-white/10 rounded-xl px-4 py-3 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="25"
                  />
                </div>
              </>
            ) : null}

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Monthly Budget (₹)</label>
              <input
                type="number"
                step="1"
                required
                min="0"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                className="w-full bg-surface border border-white/10 rounded-xl px-4 py-3 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="50000"
              />
            </div>

            <div className="pt-4">
              <Button type="submit" size="lg" className="w-full" isLoading={loading}>
                Get Started
              </Button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
