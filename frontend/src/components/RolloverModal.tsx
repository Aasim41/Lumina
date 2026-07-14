'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, PiggyBank, X, Rocket } from 'lucide-react';
import { Button } from './ui/Button';
import { apiFetch } from '@/lib/api';
import toast from 'react-hot-toast';
import { formatCurrency } from '@/lib/utils';

export function RolloverModal({ onSuccess }: { onSuccess: () => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [amount, setAmount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const checkRolloverStatus = async () => {
      try {
        const res = await apiFetch('/api/analytics/rollover-status');
        if (res.has_unprocessed_savings) {
          setAmount(res.amount);
          setIsOpen(true);
        }
      } catch (error) {
        console.error('Failed to check rollover status', error);
      } finally {
        setLoading(false);
      }
    };
    checkRolloverStatus();
  }, []);

  const handleAction = async (action: 'budget' | 'vault') => {
    setProcessing(true);
    try {
      await apiFetch('/api/analytics/rollover', {
        method: 'POST',
        body: JSON.stringify({ action })
      });
      toast.success(action === 'budget' ? 'Added to Budget!' : 'Locked in Vault!');
      setIsOpen(false);
      onSuccess();
    } catch (error) {
      toast.error('Failed to process rollover');
    } finally {
      setProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="bg-surface w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl border border-white/10"
        >
          <div className="p-8 text-center relative overflow-hidden bg-gradient-to-b from-primary/20 to-surface">
            <button 
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 p-2 text-text-secondary hover:text-text-primary bg-white/5 hover:bg-white/10 rounded-full transition-colors z-10"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-20 h-20 mx-auto bg-primary/20 rounded-full flex items-center justify-center mb-4">
              <Trophy className="w-10 h-10 text-primary" />
            </div>
            
            <h2 className="text-2xl font-display font-bold text-text-primary mb-2">Month Complete!</h2>
            <p className="text-text-secondary mb-6 text-sm">
              You unknowingly saved a hidden stash last month. Great job sticking to the plan!
            </p>
            
            <div className="text-4xl font-display font-bold text-success mb-8">
              {formatCurrency(amount)}
            </div>

            <div className="space-y-4 mt-6">
              <button 
                onClick={() => handleAction('budget')} 
                className="w-full flex items-center justify-center space-x-2 bg-indigo-500 hover:bg-indigo-600 text-white py-4 px-6 rounded-2xl font-semibold transition-all active:scale-95 shadow-[0_0_20px_rgba(99,102,241,0.3)] disabled:opacity-50"
                disabled={processing}
              >
                <Rocket className="w-5 h-5" />
                <span>Reinvest to Budget</span>
              </button>
              
              <button 
                onClick={() => handleAction('vault')} 
                className="w-full flex items-center justify-center space-x-2 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white py-4 px-6 rounded-2xl font-semibold transition-all active:scale-95 border border-white/10 disabled:opacity-50"
                disabled={processing}
              >
                <PiggyBank className="w-5 h-5" />
                <span>Add to Savings</span>
              </button>
            </div>
            
            <p className="text-[10px] text-text-secondary/40 mt-8 uppercase tracking-widest font-bold">
              Where should we put this money?
            </p>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
