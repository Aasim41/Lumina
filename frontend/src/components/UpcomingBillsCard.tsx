'use client';

import { useState, useEffect } from 'react';
import { getTrackedBills, markBillAsPaid, deleteTrackedBill, TrackedBill } from '@/lib/billTracker';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Calendar, CreditCard, Zap, CheckCircle2, Trash2, Clock, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

export function UpcomingBillsCard() {
  const [bills, setBills] = useState<TrackedBill[]>([]);

  const loadBills = () => {
    setBills(getTrackedBills());
  };

  useEffect(() => {
    loadBills();
    const handleUpdate = () => loadBills();
    window.addEventListener('lumina_bills_updated', handleUpdate);
    return () => window.removeEventListener('lumina_bills_updated', handleUpdate);
  }, []);

  const activeBills = bills.filter(b => !b.isPaid).sort((a, b) => a.daysLeft - b.daysLeft);
  if (activeBills.length === 0) return null;

  const handleMarkPaid = (id: string, title: string) => {
    markBillAsPaid(id);
    toast.success(`Marked ${title} as paid! 🎉`);
  };

  const handleDelete = (id: string) => {
    deleteTrackedBill(id);
    toast.success('Bill dismissed');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-5 rounded-3xl bg-amber-500/10 border border-amber-500/25 shadow-[0_0_25px_rgba(245,158,11,0.12)] mb-6 select-none"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-400">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-display font-bold text-sm text-white">Upcoming Bills</h3>
            <p className="text-[11px] text-amber-300/70">
              {activeBills.length} bill{activeBills.length > 1 ? 's' : ''} due soon
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-2.5">
        <AnimatePresence>
          {activeBills.slice(0, 3).map(bill => {
            const isOverdue = bill.daysLeft < 0;
            const isDueToday = bill.daysLeft === 0;
            const isDueTomorrow = bill.daysLeft === 1;

            let badgeText = `Due in ${bill.daysLeft} days`;
            let badgeClass = 'bg-white/10 text-white/80 border-white/10';

            if (isOverdue) {
              badgeText = `Overdue by ${Math.abs(bill.daysLeft)}d`;
              badgeClass = 'bg-rose-500/20 text-rose-300 border-rose-500/30 font-bold';
            } else if (isDueToday) {
              badgeText = 'Due Today 🚨';
              badgeClass = 'bg-rose-500/20 text-rose-300 border-rose-500/30 font-bold animate-pulse';
            } else if (isDueTomorrow) {
              badgeText = 'Due Tomorrow ⏰';
              badgeClass = 'bg-amber-500/20 text-amber-300 border-amber-500/30 font-bold';
            }

            return (
              <motion.div
                key={bill.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, height: 0 }}
                className="p-3.5 rounded-2xl bg-white/5 border border-white/5 hover:border-amber-500/30 transition-all flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center shrink-0 text-white/70">
                    {bill.type === 'credit_card' ? (
                      <CreditCard className="w-4 h-4 text-purple-400" />
                    ) : (
                      <Zap className="w-4 h-4 text-yellow-400" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-xs text-white truncate">{bill.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-text-secondary">{formatDate(bill.dueDate)}</span>
                      <span className={`text-[9px] px-2 py-0.5 rounded-full border ${badgeClass}`}>
                        {badgeText}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-bold text-sm text-white">{formatCurrency(bill.amount)}</span>
                  <button
                    onClick={() => handleMarkPaid(bill.id, bill.title)}
                    className="p-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 transition-colors"
                    title="Mark as Paid"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(bill.id)}
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-rose-500/20 text-white/40 hover:text-rose-400 transition-colors"
                    title="Dismiss"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
