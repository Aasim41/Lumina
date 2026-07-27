'use client';

import { useState, useEffect } from 'react';
import { AuthGuard } from '@/components/AuthGuard';
import { BottomNav } from '@/components/BottomNav';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, Plus, Trash2, IndianRupee, Calendar, TrendingUp, Lightbulb, Sparkles } from 'lucide-react';
import { getGoals, createGoal, contributeToGoal, deleteGoal } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';
import { Spinner } from '@/components/ui/Spinner';
import { Button } from '@/components/ui/Button';

export default function GoalsPage() {
  const [goals, setGoals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isContributeModalOpen, setIsContributeModalOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<any>(null);

  const fetchGoals = async () => {
    try {
      const data = await getGoals();
      setGoals(data || []);
    } catch (error) {
      toast.error('Failed to load goals');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGoals();
  }, []);

  const handleDelete = async (id: string) => {
    try {
      await deleteGoal(id);
      toast.success('Goal deleted');
      fetchGoals();
    } catch (error) {
      toast.error('Failed to delete goal');
    }
  };

  const openContribute = (goal: any) => {
    setSelectedGoal(goal);
    setIsContributeModalOpen(true);
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-[#0B1021] pb-24">
        {/* Header matching transactions page */}
        <header className="px-6 pb-6 pt-14 safe-pt sticky top-0 z-20 bg-emerald-500/10 backdrop-blur-xl border-b border-emerald-500/30 shadow-[0_4px_30px_rgba(16,185,129,0.1)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
              <Target className="w-5 h-5 text-emerald-400" />
            </div>
            <h1 className="text-2xl font-display font-bold text-white">Financial Goals</h1>
          </div>
        </header>

        <div className="p-4 space-y-4">
          {loading ? (
            <div className="flex justify-center p-12">
              <Spinner className="w-8 h-8 text-emerald-500" />
            </div>
          ) : goals.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass p-8 rounded-3xl text-center border border-emerald-500/20 bg-emerald-500/5 shadow-[0_0_30px_rgba(16,185,129,0.05)] mt-8"
            >
              <div className="w-20 h-20 mx-auto bg-emerald-500/10 rounded-full flex items-center justify-center mb-4 border border-emerald-500/20">
                <Target className="w-10 h-10 text-emerald-400" />
              </div>
              <h3 className="text-xl font-display font-semibold text-white mb-2">No goals yet!</h3>
              <p className="text-sm text-text-secondary mb-6">
                Setting a financial goal is the first step to achieving it. What are you saving for?
              </p>
              <Button onClick={() => setIsAddModalOpen(true)} className="bg-emerald-500 hover:bg-emerald-600 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)]">
                Create First Goal
              </Button>
            </motion.div>
          ) : (
            goals.map((goal: any, i: number) => {
              const progress = goal.progress_percent || 0;
              
              const monthlyNeeded = goal.monthly_needed || 0;
              const weeklyNeeded = goal.weekly_needed || 0;
              const dailyNeeded = goal.daily_needed || 0;

              return (
                <motion.div 
                  key={goal.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="glass p-5 rounded-3xl border border-emerald-500/30 bg-emerald-500/10 shadow-[0_0_30px_rgba(16,185,129,0.1)] relative overflow-hidden group"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-2xl border border-white/10 shadow-inner">
                        {goal.icon || '🎯'}
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-white">{goal.name}</h3>
                        {goal.target_date && (
                          <div className="text-xs text-emerald-200/70 flex items-center mt-1">
                            <Calendar className="w-3 h-3 mr-1" /> Target: {formatDate(goal.target_date)}
                          </div>
                        )}
                      </div>
                    </div>
                    <button 
                      onClick={() => handleDelete(goal.id)}
                      className="p-2 bg-red-500/10 text-red-400 rounded-full hover:bg-red-500/20 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="mb-2 flex justify-between items-end">
                    <div>
                      <span className="text-2xl font-bold text-emerald-400">{formatCurrency(goal.saved_amount)}</span>
                      <span className="text-sm text-text-secondary ml-1">/ {formatCurrency(goal.target_amount)}</span>
                    </div>
                    <span className="text-sm font-bold text-emerald-400 bg-emerald-500/20 px-2 py-1 rounded-lg">
                      {progress.toFixed(0)}%
                    </span>
                  </div>

                  <div className="h-3 bg-black/40 rounded-full overflow-hidden flex mb-4 border border-white/5">
                    <motion.div 
                      className="h-full bg-gradient-to-r from-emerald-500 to-teal-400"
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 1, ease: 'easeOut' }}
                    />
                  </div>
                  
                  <div className="flex justify-between items-center mt-4 pt-4 border-t border-white/10">
                    {monthlyNeeded > 0 ? (
                      <div className="flex flex-col gap-3 w-full mr-4">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-medium text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-full">{formatCurrency(dailyNeeded)}/day</span>
                          <span className="text-[11px] font-medium text-teal-400 bg-teal-500/10 px-2 py-1 rounded-full">{formatCurrency(weeklyNeeded)}/wk</span>
                          <span className="text-[11px] font-medium text-cyan-400 bg-cyan-500/10 px-2 py-1 rounded-full">{formatCurrency(monthlyNeeded)}/mo</span>
                        </div>
                        {goal.strategy && (
                          <div className="flex items-start gap-2 bg-white/5 p-2 rounded-xl border border-white/5 text-xs text-white/70">
                            <Lightbulb className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                            <p className="leading-relaxed">{goal.strategy}</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-xs text-text-secondary mt-1">
                        {progress >= 100 ? 'Goal reached! 🎉' : 'Keep it up!'}
                      </div>
                    )}
                    <Button 
                      size="sm" 
                      onClick={() => openContribute(goal)}
                      className="bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/50"
                    >
                      <Plus className="w-4 h-4 mr-1" /> Add Funds
                    </Button>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>

        {/* FAB */}
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="fixed bottom-24 right-6 w-14 h-14 bg-gradient-to-tr from-emerald-500 to-teal-400 text-white rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.5)] hover:scale-105 active:scale-95 transition-all z-40"
        >
          <Plus className="w-6 h-6" />
        </button>

        <AddGoalModal 
          isOpen={isAddModalOpen} 
          onClose={() => setIsAddModalOpen(false)} 
          onSuccess={fetchGoals} 
        />
        
        {selectedGoal && (
          <ContributeModal
            isOpen={isContributeModalOpen}
            onClose={() => {
              setIsContributeModalOpen(false);
              setSelectedGoal(null);
            }}
            goal={selectedGoal}
            onSuccess={fetchGoals}
          />
        )}

        <BottomNav />
      </div>
    </AuthGuard>
  );
}

function AddGoalModal({ isOpen, onClose, onSuccess }: { isOpen: boolean; onClose: () => void; onSuccess: () => void }) {
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [icon, setIcon] = useState('🎯');
  const [loading, setLoading] = useState(false);

  const icons = ['🎯', '🚗', '🏠', '📱', '✈️', '💻', '🎓', '💍', '🏋️', '📷', '🎮', '🏍️', '🎸', '🎨', '🏖️'];

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await createGoal({
        name,
        target_amount: parseFloat(targetAmount),
        target_date: targetDate || undefined,
        icon
      });
      toast.success('Goal created!');
      onSuccess();
      onClose();
      // reset
      setName('');
      setTargetAmount('');
      setTargetDate('');
      setIcon('🎯');
    } catch (error) {
      toast.error('Failed to create goal');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md glass p-6 rounded-3xl border border-emerald-500/30 shadow-[0_0_40px_rgba(16,185,129,0.2)]"
      >
        <h2 className="text-xl font-display font-bold text-white mb-6">Create New Goal</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Icon</label>
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {icons.map(i => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setIcon(i)}
                  className={`w-10 h-10 flex-shrink-0 rounded-xl text-xl flex items-center justify-center transition-colors ${
                    icon === i ? 'bg-emerald-500/30 border-emerald-500 border' : 'bg-white/5 border border-transparent'
                  }`}
                >
                  {i}
                </button>
              ))}
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Goal Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. New Laptop"
              className="w-full bg-surface border border-white/10 rounded-xl px-4 py-3 text-text-primary focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Target Amount (₹)</label>
            <input
              type="number"
              required
              min="1"
              value={targetAmount}
              onChange={e => setTargetAmount(e.target.value)}
              placeholder="50000"
              className="w-full bg-surface border border-white/10 rounded-xl px-4 py-3 text-text-primary focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Target Date (Optional)</label>
            <input
              type="date"
              value={targetDate}
              onChange={e => setTargetDate(e.target.value)}
              className="w-full bg-surface border border-white/10 rounded-xl px-4 py-3 text-text-primary focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="pt-4 flex gap-3">
            <Button type="button" variant="outline" onClick={onClose} className="w-1/3">
              Cancel
            </Button>
            <Button type="submit" className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white" isLoading={loading}>
              Create
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

function ContributeModal({ isOpen, onClose, onSuccess, goal }: { isOpen: boolean; onClose: () => void; onSuccess: () => void; goal: any }) {
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await contributeToGoal(goal.id, parseFloat(amount));
      toast.success('Funds added successfully!');
      onSuccess();
      onClose();
      setAmount('');
    } catch (error) {
      toast.error('Failed to add funds');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-sm glass p-6 rounded-3xl border border-emerald-500/30 shadow-[0_0_40px_rgba(16,185,129,0.2)]"
      >
        <h2 className="text-xl font-display font-bold text-white mb-2 text-center">Add to {goal.name}</h2>
        <p className="text-sm text-center text-text-secondary mb-6">
          You need {formatCurrency(goal.target_amount - goal.current_amount)} more to reach your target.
        </p>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Amount to Add (₹)</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary">₹</span>
              <input
                type="number"
                required
                min="1"
                max={goal.target_amount - goal.current_amount}
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="1000"
                className="w-full bg-surface border border-white/10 rounded-xl pl-8 pr-4 py-3 text-text-primary focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold text-lg"
              />
            </div>
          </div>

          <div className="flex gap-2">
            {[500, 1000, 5000].map(val => (
              <button
                key={val}
                type="button"
                onClick={() => setAmount(val.toString())}
                className="flex-1 py-2 rounded-xl bg-white/5 border border-white/10 text-sm font-medium hover:bg-white/10 transition-colors"
              >
                +{val}
              </button>
            ))}
          </div>

          <div className="pt-4 flex gap-3">
            <Button type="button" variant="outline" onClick={onClose} className="w-1/3">
              Cancel
            </Button>
            <Button type="submit" className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white" isLoading={loading}>
              Confirm
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
