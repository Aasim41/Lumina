'use client';

import { useState, useEffect } from 'react';
import { Button } from './ui/Button';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { createSubscription } from '@/lib/api';
import toast from 'react-hot-toast';

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const PREDEFINED_PLANS = [
  { id: 'custom', name: 'Custom Subscription (Enter details manually)', merchant: '', amount: '' },
  // Netflix
  { id: 'nflx-mob', name: 'Netflix - Mobile', merchant: 'Netflix', amount: '149' },
  { id: 'nflx-bsc', name: 'Netflix - Basic', merchant: 'Netflix', amount: '199' },
  { id: 'nflx-std', name: 'Netflix - Standard', merchant: 'Netflix', amount: '499' },
  { id: 'nflx-prm', name: 'Netflix - Premium', merchant: 'Netflix', amount: '649' },
  // Spotify
  { id: 'spot-stu', name: 'Spotify - Student', merchant: 'Spotify', amount: '59' },
  { id: 'spot-ind', name: 'Spotify - Individual', merchant: 'Spotify', amount: '119' },
  { id: 'spot-duo', name: 'Spotify - Duo', merchant: 'Spotify', amount: '149' },
  { id: 'spot-fam', name: 'Spotify - Family', merchant: 'Spotify', amount: '179' },
  // YouTube Premium
  { id: 'yt-stu', name: 'YouTube Premium - Student', merchant: 'YouTube', amount: '79' },
  { id: 'yt-ind', name: 'YouTube Premium - Individual', merchant: 'YouTube', amount: '129' },
  { id: 'yt-fam', name: 'YouTube Premium - Family', merchant: 'YouTube', amount: '189' },
  // Apple Music
  { id: 'am-stu', name: 'Apple Music - Student', merchant: 'Apple Music', amount: '59' },
  { id: 'am-ind', name: 'Apple Music - Individual', merchant: 'Apple Music', amount: '99' },
  { id: 'am-fam', name: 'Apple Music - Family', merchant: 'Apple Music', amount: '149' },
  // Amazon Prime
  { id: 'amz-mon', name: 'Amazon Prime - Monthly', merchant: 'Amazon Prime', amount: '299' },
  { id: 'amz-ann', name: 'Amazon Prime - Annual', merchant: 'Amazon Prime', amount: '1499' },
];

export function SubscriptionModal({ isOpen, onClose, onSuccess }: SubscriptionModalProps) {
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [merchant, setMerchant] = useState('');
  const [amount, setAmount] = useState('');
  const [billingDay, setBillingDay] = useState('1');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selectedPlanId) {
      const plan = PREDEFINED_PLANS.find(p => p.id === selectedPlanId);
      if (plan && plan.id !== 'custom') {
        setMerchant(plan.merchant);
        setAmount(plan.amount);
      } else if (plan && plan.id === 'custom') {
        setMerchant('');
        setAmount('');
      }
    }
  }, [selectedPlanId]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!merchant || !amount || !billingDay) return;
    
    setLoading(true);
    try {
      await createSubscription({
        merchant,
        amount: parseFloat(amount),
        billing_day: parseInt(billingDay)
      });
      toast.success('Subscription tracked successfully!');
      setSelectedPlanId('');
      setMerchant('');
      setAmount('');
      setBillingDay('1');
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error.message || 'Failed to add subscription');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div 
        className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] animate-fadeIn"
        onClick={onClose}
      />
      
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <div className="w-full max-w-md glass p-6 rounded-3xl animate-slideUp border border-primary/20 shadow-2xl shadow-primary/20">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-display font-bold">Add Subscription</h2>
            <button onClick={onClose} className="p-2 bg-white/5 rounded-full hover:bg-white/10 text-text-secondary">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Select a popular plan</label>
              <select
                value={selectedPlanId}
                onChange={(e) => setSelectedPlanId(e.target.value)}
                className="w-full bg-surface border border-white/10 rounded-xl px-4 py-3 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary appearance-none"
              >
                <option value="" disabled>Choose a template (Optional)</option>
                {PREDEFINED_PLANS.map(plan => (
                  <option key={plan.id} value={plan.id}>{plan.name}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-white/5 mt-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-text-secondary mb-1">Service Name</label>
                <input
                  type="text"
                  required
                  value={merchant}
                  onChange={(e) => setMerchant(e.target.value)}
                  className="w-full bg-surface border border-white/10 rounded-xl px-4 py-3 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="e.g. Netflix"
                  disabled={Boolean(selectedPlanId && selectedPlanId !== 'custom')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Monthly Amount (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-surface border border-white/10 rounded-xl px-4 py-3 text-lg font-display text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="0.00"
                  disabled={Boolean(selectedPlanId && selectedPlanId !== 'custom')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Billing Day</label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  required
                  value={billingDay}
                  onChange={(e) => setBillingDay(e.target.value)}
                  className="w-full bg-surface border border-white/10 rounded-xl px-4 py-3 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="15"
                />
              </div>
            </div>

            <div className="pt-4">
              <Button type="submit" size="lg" className="w-full" isLoading={loading}>
                Track Subscription
              </Button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
