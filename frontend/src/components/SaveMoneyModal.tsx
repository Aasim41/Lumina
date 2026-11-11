'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from './ui/Button';
import { createTransaction } from '@/lib/api';
import { todayISO } from '@/lib/db';
import toast from 'react-hot-toast';

export function SaveMoneyModal({ isOpen, onClose, onSuccess }: { isOpen: boolean, onClose: () => void, onSuccess: () => void }) {
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount) return;
    
    setLoading(true);
    try {
      await createTransaction({
        date: todayISO(),
        merchant: "Quick Save",
        amount: parseFloat(amount),
        category: "Savings"
      });
      toast.success('Savings added successfully!');
      setAmount('');
      onSuccess();
      onClose();
    } catch (error) {
      toast.error('Failed to add savings');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            onClick={onClose}
          />
          
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="w-full max-w-sm glass p-8 rounded-3xl border border-[#10b981]/20 shadow-2xl shadow-[#10b981]/20 relative z-10 text-center"
          >
            <div className="w-16 h-16 bg-[#10b981]/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">🐷</span>
            </div>
            
            <h2 className="text-2xl font-display font-bold text-white mb-2">Save Money</h2>
            <p className="text-text-secondary text-sm mb-6">Set aside money from your budget.</p>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <input
                  type="number"
                  required
                  min="1"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-surface border border-white/10 rounded-xl px-4 py-4 text-center text-3xl font-bold font-display text-[#10b981] focus:outline-none focus:ring-2 focus:ring-[#10b981]"
                  placeholder="₹0.00"
                />
              </div>

              <div className="pt-2">
                <Button type="submit" size="lg" className="w-full bg-[#10b981] text-white hover:bg-[#10b981]/90" isLoading={loading}>
                  Save to Piggy Bank
                </Button>
              </div>
              
              <button type="button" onClick={onClose} className="text-text-secondary text-sm hover:text-white transition-colors cursor-pointer">
                Cancel
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
