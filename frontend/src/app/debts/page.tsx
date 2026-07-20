'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Landmark, Plus, Trash2, ArrowRight, Percent, Calendar, CheckCircle2 } from 'lucide-react';
import { AuthGuard } from '@/components/AuthGuard';
import { BottomNav } from '@/components/BottomNav';
import { getDebts, createDebt, updateDebt, deleteDebt } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import toast from 'react-hot-toast';

export default function DebtsPage() {
  const [debts, setDebts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');

  // Form state
  const [name, setName] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [interestRate, setInterestRate] = useState('');
  const [nextEmiDate, setNextEmiDate] = useState('');

  const fetchDebts = async () => {
    try {
      const data = await getDebts();
      setDebts(data);
    } catch (e) {
      toast.error('Failed to load debts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDebts();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !totalAmount) return;
    
    setIsSubmitting(true);
    try {
      await createDebt({
        name,
        total_amount: parseFloat(totalAmount),
        paid_amount: 0,
        interest_rate: interestRate ? parseFloat(interestRate) : null,
        next_emi_date: nextEmiDate || null,
      });
      toast.success('Debt tracker created!');
      setIsModalOpen(false);
      
      // Reset form
      setName('');
      setTotalAmount('');
      setInterestRate('');
      setNextEmiDate('');
      
      fetchDebts();
    } catch (e) {
      toast.error('Failed to create debt tracker');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePaymentSubmit = async (e: React.FormEvent, debtId: string, currentPaid: number, total: number) => {
    e.preventDefault();
    const amt = parseFloat(paymentAmount);
    if (isNaN(amt) || amt <= 0) return;
    
    const newPaid = currentPaid + amt;
    
    try {
      await updateDebt(debtId, { paid_amount: Math.min(newPaid, total) });
      toast.success('Payment recorded!');
      setPaymentModalOpen(null);
      setPaymentAmount('');
      fetchDebts();
    } catch (e) {
      toast.error('Failed to record payment');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDebt(id);
      toast.success('Tracker removed');
      fetchDebts();
    } catch (e) {
      toast.error('Failed to delete tracker');
    }
  };

  // Helper for circular progress
  const CircleProgress = ({ progress }: { progress: number }) => {
    const circumference = 2 * Math.PI * 24; // r=24
    const strokeDashoffset = circumference - (progress / 100) * circumference;
    
    return (
      <div className="relative w-16 h-16 flex items-center justify-center">
        <svg className="w-16 h-16 transform -rotate-90">
          <circle
            cx="32"
            cy="32"
            r="24"
            stroke="currentColor"
            strokeWidth="4"
            fill="transparent"
            className="text-white/10"
          />
          <motion.circle
            cx="32"
            cy="32"
            r="24"
            stroke="currentColor"
            strokeWidth="4"
            fill="transparent"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1, ease: "easeOut" }}
            className={progress >= 100 ? "text-emerald-400" : "text-indigo-400"}
          />
        </svg>
        <div className="absolute flex flex-col items-center justify-center">
          <span className="text-sm font-bold">{Math.round(progress)}%</span>
        </div>
      </div>
    );
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-[#0B1021] pb-24 text-white">
        <header className="px-6 pb-8 pt-14 safe-pt bg-gradient-to-b from-indigo-500/20 to-transparent">
          <div className="flex justify-between items-center mb-2">
            <h1 className="text-2xl font-display font-bold">Debts & EMIs 🏦</h1>
            <button
              onClick={() => setIsModalOpen(true)}
              className="p-2 bg-indigo-500/20 text-indigo-400 rounded-full hover:bg-indigo-500/30 transition-colors"
            >
              <Plus className="w-6 h-6" />
            </button>
          </div>
          <p className="text-sm text-text-secondary">Track loans, EMIs, and borrowed money</p>
        </header>

        <div className="px-4 space-y-4 -mt-4">
          {loading ? (
            <div className="text-center py-10 text-white/50">Loading...</div>
          ) : debts.length === 0 ? (
            <div className="text-center py-12 px-4 glass rounded-3xl border border-white/5">
              <Landmark className="w-12 h-12 text-indigo-500/40 mx-auto mb-4" />
              <p className="text-white/80 font-medium">No active debts</p>
              <p className="text-sm text-text-secondary mt-1">Add a loan or EMI to track your progress.</p>
            </div>
          ) : (
            debts.map((debt) => {
              const progress = debt.total_amount > 0 ? (debt.paid_amount / debt.total_amount) * 100 : 0;
              const isPaidOff = progress >= 100;
              
              let daysUntilDue = null;
              if (debt.next_emi_date) {
                const due = new Date(debt.next_emi_date);
                const today = new Date();
                const diffTime = due.getTime() - today.getTime();
                daysUntilDue = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              }
              
              return (
                <motion.div
                  key={debt.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`glass p-5 rounded-3xl border ${isPaidOff ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-indigo-500/30 bg-indigo-500/10'} shadow-[0_0_30px_rgba(99,102,241,0.1)] relative overflow-hidden`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-display font-semibold text-white/90">{debt.name}</h3>
                      <div className="flex items-center gap-3 mt-1">
                        {debt.interest_rate && (
                          <span className="text-xs text-text-secondary flex items-center bg-black/20 px-2 py-1 rounded-lg">
                            <Percent className="w-3 h-3 mr-1 text-indigo-400" />
                            {debt.interest_rate}% APR
                          </span>
                        )}
                        {daysUntilDue !== null && !isPaidOff && (
                          <span className={`text-xs flex items-center bg-black/20 px-2 py-1 rounded-lg ${daysUntilDue <= 3 ? 'text-orange-400' : 'text-text-secondary'}`}>
                            <Calendar className="w-3 h-3 mr-1" />
                            {daysUntilDue < 0 ? 'Overdue' : `${daysUntilDue} days left`}
                          </span>
                        )}
                      </div>
                    </div>
                    <CircleProgress progress={progress} />
                  </div>
                  
                  <div className="flex justify-between items-end mt-6 bg-black/20 p-3 rounded-2xl">
                    <div>
                      <p className="text-xs text-text-secondary mb-1">Paid off</p>
                      <p className="font-semibold text-indigo-400">{formatCurrency(debt.paid_amount)}</p>
                    </div>
                    <div className="text-center">
                      <ArrowRight className="w-4 h-4 text-white/20 mx-2" />
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-text-secondary mb-1">Total Loan</p>
                      <p className="font-semibold">{formatCurrency(debt.total_amount)}</p>
                    </div>
                  </div>

                  <div className="mt-4 flex justify-between items-center">
                    <button 
                      onClick={() => handleDelete(debt.id)}
                      className="p-2 text-text-secondary hover:text-error transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    {!isPaidOff ? (
                      <button 
                        onClick={() => setPaymentModalOpen(debt.id)}
                        className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium rounded-xl transition-colors"
                      >
                        Log Payment
                      </button>
                    ) : (
                      <span className="px-4 py-2 bg-emerald-500/20 text-emerald-400 text-sm font-medium rounded-xl flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" /> Fully Paid
                      </span>
                    )}
                  </div>
                  
                  {/* Payment Modal */}
                  <AnimatePresence>
                    {paymentModalOpen === debt.id && (
                      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className="w-full max-w-sm glass border border-white/10 rounded-3xl p-6"
                        >
                          <h3 className="text-xl font-display font-semibold mb-4 text-white">Log Payment</h3>
                          <form onSubmit={(e) => handlePaymentSubmit(e, debt.id, debt.paid_amount, debt.total_amount)}>
                            <div className="mb-4">
                              <label className="block text-sm text-text-secondary mb-2">Amount Paid</label>
                              <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50 font-medium">₹</span>
                                <input
                                  type="number"
                                  required
                                  value={paymentAmount}
                                  onChange={e => setPaymentAmount(e.target.value)}
                                  className="w-full bg-black/40 border border-white/10 rounded-2xl py-3 pl-8 pr-4 text-white focus:outline-none focus:border-primary/50"
                                  placeholder="0.00"
                                  step="0.01"
                                />
                              </div>
                            </div>
                            <div className="flex gap-3 mt-6">
                              <button
                                type="button"
                                onClick={() => { setPaymentModalOpen(null); setPaymentAmount(''); }}
                                className="flex-1 py-3 bg-white/5 text-white rounded-2xl font-medium"
                              >
                                Cancel
                              </button>
                              <button
                                type="submit"
                                className="flex-1 py-3 bg-indigo-500 text-white rounded-2xl font-medium shadow-[0_0_20px_rgba(99,102,241,0.4)]"
                              >
                                Save
                              </button>
                            </div>
                          </form>
                        </motion.div>
                      </div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })
          )}
        </div>

        {/* Create Debt Modal */}
        <AnimatePresence>
          {isModalOpen && (
            <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, y: "100%" }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="w-full sm:max-w-md bg-[#131B2F] border border-white/10 rounded-t-3xl sm:rounded-3xl p-6 sm:m-4 max-h-[90vh] overflow-y-auto"
              >
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-display font-semibold text-white">Add Debt / Loan</h2>
                  <button onClick={() => setIsModalOpen(false)} className="p-2 text-text-secondary hover:text-white rounded-full">
                    ✕
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm text-text-secondary mb-1">Loan Name (e.g. Car Loan)</label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={e => setName(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-2xl p-3 text-white focus:outline-none focus:border-indigo-500/50"
                      placeholder="Enter name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-text-secondary mb-1">Total Amount Owed</label>
                    <input
                      type="number"
                      required
                      value={totalAmount}
                      onChange={e => setTotalAmount(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-2xl p-3 text-white focus:outline-none focus:border-indigo-500/50"
                      placeholder="0.00"
                      step="0.01"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-text-secondary mb-1">Interest Rate (%)</label>
                      <input
                        type="number"
                        value={interestRate}
                        onChange={e => setInterestRate(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-2xl p-3 text-white focus:outline-none focus:border-indigo-500/50"
                        placeholder="Optional"
                        step="0.01"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-text-secondary mb-1">Next EMI Date</label>
                      <input
                        type="date"
                        value={nextEmiDate}
                        onChange={e => setNextEmiDate(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-2xl p-3 text-white focus:outline-none focus:border-indigo-500/50"
                      />
                    </div>
                  </div>

                  <div className="pt-4 pb-24 sm:pb-6">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl font-semibold shadow-[0_0_20px_rgba(99,102,241,0.4)] disabled:opacity-50"
                    >
                      {isSubmitting ? 'Creating...' : 'Track Debt'}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <BottomNav />
      </div>
    </AuthGuard>
  );
}
