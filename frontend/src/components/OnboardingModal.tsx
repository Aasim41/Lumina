'use client';

import { useState, useEffect } from 'react';
import { updateUserProfile } from '@/lib/api';
import { Button } from './ui/Button';
import toast from 'react-hot-toast';

export function OnboardingModal({ user, onComplete }: { user: any, onComplete: () => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [budget, setBudget] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;

    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    
    let needsMonthlyUpdate = false;

    if (user.last_budget_update) {
      const lastUpdate = new Date(user.last_budget_update);
      if (lastUpdate.getMonth() !== currentMonth || lastUpdate.getFullYear() !== currentYear) {
        needsMonthlyUpdate = true;
      }
    } else {
       needsMonthlyUpdate = true;
    }

    if (needsMonthlyUpdate) {
      setIsOpen(true);
      setBudget('');
    }
  }, [user]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!budget) return;
    
    setLoading(true);
    try {
      await updateUserProfile({
        monthly_budget: parseFloat(budget.toString())
      });
      toast.success('Budget set for this month!');
      setIsOpen(false);
      onComplete();
    } catch (error) {
      toast.error('Failed to save budget');
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
              Welcome back, {user?.name}!
            </h2>
            <p className="text-text-secondary">
              It's a new month! Please set your budget.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
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
                Confirm Budget
              </Button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
