'use client';

import { useState } from 'react';
import { CATEGORY_COLORS } from '@/lib/utils';
import { Button } from './ui/Button';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ManualEntryFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  initialData?: any;
  isRoastMode?: boolean;
}

import { useAuth } from '@/hooks/useAuth';
import { useExpenseData } from '@/hooks/useExpenseData';
import { useEffect } from 'react';
import { getRoast } from '@/lib/api';
import { RoastModal } from './RoastModal';
import { motion, AnimatePresence } from 'framer-motion';

export function ManualEntryForm({ isOpen, onClose, onSubmit, initialData, isRoastMode }: ManualEntryFormProps) {
  const getLocalDateString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [date, setDate] = useState(getLocalDateString());
  const [merchant, setMerchant] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(false);
  const [overdraftWarning, setOverdraftWarning] = useState<number | null>(null);

  useEffect(() => {
    if (initialData && isOpen) {
      setMerchant(initialData.merchant || '');
      setAmount(initialData.amount ? initialData.amount.toString() : '');
      setDate(initialData.date || getLocalDateString());
      setCategory(initialData.category || '');
    } else if (isOpen && !initialData) {
      // Reset default to local date when opening a fresh form
      setDate(getLocalDateString());
    }
  }, [initialData, isOpen]);

  const { user } = useAuth();
  const { summary } = useExpenseData();
  const [roastMessage, setRoastMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !date) return;
    
    const expenseAmount = parseFloat(amount);
    const finalCategory = category || 'Miscellaneous';
    const finalMerchant = merchant.trim() || finalCategory;
    
    // Check for overdraft if warning hasn't been shown yet
    if (overdraftWarning === null) {
      const budget = user?.monthly_budget || 0;
      const totalSpent = summary?.total_this_month || 0;
      const totalSaved = summary?.total_saved_this_month || 0;
      const remaining = budget - totalSpent - totalSaved;
      
      if (budget > 0 && expenseAmount > remaining) {
        const diff = expenseAmount - remaining;
        // If we have enough savings to cover it
        if (totalSaved >= diff) {
          setOverdraftWarning(diff);
          return; // Stop and wait for confirmation
        }
      }
    }
    
    setLoading(true);
    try {
      await onSubmit({
        date,
        merchant: finalMerchant,
        amount: expenseAmount,
        category: finalCategory
      });
      
      // If there was an overdraft that we are covering from savings
      if (overdraftWarning && overdraftWarning > 0) {
        await onSubmit({
           date,
           merchant: "Overdraft Cover",
           amount: -overdraftWarning,
           category: "Savings"
        });
      }
      
      let gotRoast = false;
      try {
        const roastResp = await getRoast({
          amount: expenseAmount,
          merchant: finalMerchant,
          category: finalCategory
        });
        
        if (roastResp.message) {
          setRoastMessage(roastResp.message);
          gotRoast = true;
        }
      } catch (e) {
        console.error(e);
      }

      // Reset form
      setMerchant('');
      setAmount('');
      setCategory('');
      setOverdraftWarning(null);
      
      // If no roast was triggered by the smart backend, close immediately
      if (!gotRoast) {
        onClose();
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-md z-[999]"
              onClick={onClose}
            />
            
            <div className="fixed inset-0 z-[999] flex items-start justify-center p-4 pt-12 pb-32 overflow-y-auto pointer-events-none">
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="w-full max-w-md glass p-6 rounded-3xl border border-white/10 shadow-2xl shadow-primary/20 pointer-events-auto"
              >
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-display font-bold">Add Expense</h2>
                  <button onClick={onClose} className="p-2 bg-white/5 rounded-full hover:bg-white/10 text-text-secondary transition-colors active:scale-90">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="custom-form">
                  <p className="title">Add Expense <span>Keep track of your spending</span></p>
                  <div>
                    <label>Amount (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <label>Merchant / Description (Optional)</label>
                    <input
                      type="text"
                      value={merchant}
                      onChange={(e) => setMerchant(e.target.value)}
                      placeholder="e.g. Zomato, Rent, Uber"
                    />
                  </div>

                  <div className="w-full flex gap-4">
                    <div className="flex-1">
                      <label>Date</label>
                      <input
                        type="date"
                        required
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                      />
                    </div>

                    <div className="flex-1">
                      <label>Category (Optional)</label>
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                      >
                        <option value="">Auto-predict</option>
                        {Object.keys(CATEGORY_COLORS).map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="separator">
                    <div></div>
                    <span>OR</span>
                    <div></div>
                  </div>

                  <div className="w-full">
                    {overdraftWarning !== null && (
                      <div className="mb-4 p-4 bg-warning/10 border border-warning/30 rounded-xl">
                        <p className="text-amber-700 text-sm font-bold mb-1">Budget Exceeded!</p>
                        <p className="text-[var(--font-color-sub)] text-xs font-semibold">
                          You are exceeding your remaining budget by ₹{overdraftWarning.toFixed(2)}. 
                          This will be automatically deducted from your Savings.
                        </p>
                      </div>
                    )}
                    <button type="submit" disabled={loading} className="oauthButton">
                      {loading ? "Saving..." : (overdraftWarning !== null ? "Confirm & Deduct from Savings" : "Save Expense")}
                    </button>
                  </div>
                  
                  {overdraftWarning !== null && (
                    <button 
                      type="button" 
                      onClick={() => setOverdraftWarning(null)} 
                      className="w-full text-[var(--font-color-sub)] font-semibold text-sm hover:text-error transition-colors text-center mt-2"
                    >
                      Cancel
                    </button>
                  )}
                </form>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
      <RoastModal 
        isOpen={!!roastMessage} 
        message={roastMessage || ""} 
        onClose={() => {
          setRoastMessage(null);
          onClose();
        }} 
      />
    </>
  );
}
