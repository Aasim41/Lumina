'use client';

import { useState, useEffect } from 'react';
import { getCategoryBudgets, createCategoryBudget, deleteCategoryBudget, getCategories, getSubscriptions, deleteSubscription } from '@/lib/api';
import { Target, Plus, Trash2, AlertCircle, RefreshCw } from 'lucide-react';
import { BottomNav } from '@/components/BottomNav';
import toast from 'react-hot-toast';

export default function BudgetDashboard() {
  const [budgets, setBudgets] = useState<any[]>([]);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  
  const [isAddingBudget, setIsAddingBudget] = useState(false);
  const [newBudgetCategory, setNewBudgetCategory] = useState('');
  const [newBudgetAmount, setNewBudgetAmount] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [budgetsData, subsData, catsData] = await Promise.all([
        getCategoryBudgets(),
        getSubscriptions(),
        getCategories()
      ]);
      setBudgets(budgetsData);
      setSubscriptions(subsData);
      setAvailableCategories(catsData.map((c: any) => c.category));
    } catch (err) {
      console.error(err);
      toast.error('Failed to load budget data');
    }
    setLoading(false);
  };

  const handleAddBudget = async () => {
    if (!newBudgetCategory || !newBudgetAmount) return;
    try {
      await createCategoryBudget({ category: newBudgetCategory, amount: parseFloat(newBudgetAmount) });
      toast.success('Budget added!');
      setIsAddingBudget(false);
      setNewBudgetCategory('');
      setNewBudgetAmount('');
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to add budget');
    }
  };

  const handleDeleteBudget = async (id: string) => {
    try {
      await deleteCategoryBudget(id);
      toast.success('Budget removed');
      fetchData();
    } catch (err) {
      toast.error('Failed to remove budget');
    }
  };

  const handleDeleteSub = async (id: string) => {
    try {
      await deleteSubscription(id);
      toast.success('Subscription removed');
      fetchData();
    } catch (err) {
      toast.error('Failed to remove subscription');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
  };

  return (
    <div className="min-h-screen bg-background text-foreground pb-24">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-white/5 p-4 pt-14 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold font-space-grotesk tracking-tight">Budgets & Subs</h1>
          <p className="text-xs text-white/50">Advanced tracking & limits</p>
        </div>
        <button onClick={fetchData} className="p-2 glass-panel rounded-full hover:bg-white/10 transition-colors">
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      <div className="p-4 space-y-8">
        
        {/* Envelope Budgets Section */}
        <section>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-space-grotesk font-semibold flex items-center gap-2">
              <Target className="w-5 h-5 text-purple-400" />
              Category Envelopes
            </h2>
            <button 
              onClick={() => setIsAddingBudget(!isAddingBudget)}
              className="text-xs bg-purple-500/20 text-purple-300 px-3 py-1.5 rounded-full flex items-center gap-1 font-medium hover:bg-purple-500/30 transition-colors"
            >
              <Plus className="w-3 h-3" /> New
            </button>
          </div>

          {isAddingBudget && (
            <div className="glass-panel p-4 mb-4 space-y-3 relative overflow-hidden rounded-2xl">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-blue-500/10 pointer-events-none" />
              <div className="relative">
                <select 
                  className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-purple-500/50"
                  value={newBudgetCategory}
                  onChange={e => setNewBudgetCategory(e.target.value)}
                >
                  <option value="">Select Category...</option>
                  {availableCategories.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <input 
                  type="number" 
                  placeholder="Monthly Limit (₹)"
                  className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-2 text-sm mt-3 focus:outline-none focus:border-purple-500/50"
                  value={newBudgetAmount}
                  onChange={e => setNewBudgetAmount(e.target.value)}
                />
                <div className="flex gap-2 mt-3">
                  <button 
                    onClick={handleAddBudget}
                    className="flex-1 bg-purple-600 hover:bg-purple-500 text-white text-sm py-2 rounded-xl transition-colors font-medium"
                  >
                    Save
                  </button>
                  <button 
                    onClick={() => setIsAddingBudget(false)}
                    className="px-4 bg-slate-800 hover:bg-slate-700 text-white text-sm py-2 rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {!loading && budgets.length === 0 && !isAddingBudget && (
            <div className="text-center py-8 text-white/40 text-sm">
              No category budgets set yet.<br/>Click "New" to start the envelope system.
            </div>
          )}

          <div className="space-y-4">
            {budgets.map(b => {
              const totalLimit = b.amount + b.rollover_balance;
              const percent = Math.min((b.spent_this_month / totalLimit) * 100, 100);
              const isWarning = percent >= 80 && percent < 100;
              const isDanger = percent >= 100;
              
              let barColor = "bg-emerald-500";
              if (isWarning) barColor = "bg-orange-500";
              if (isDanger) barColor = "bg-rose-500";

              return (
                <div key={b.id} className="glass-panel p-4 rounded-2xl relative overflow-hidden group">
                  {/* Delete Button (visible on hover or focus) */}
                  <button 
                    onClick={() => handleDeleteBudget(b.id)}
                    className="absolute top-4 right-4 text-white/30 hover:text-rose-400 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <div className="flex justify-between mb-2 pr-8">
                    <span className="font-medium text-sm">{b.category}</span>
                    <span className="text-sm font-semibold">
                      {formatCurrency(b.spent_this_month)} <span className="text-white/40 font-normal">/ {formatCurrency(totalLimit)}</span>
                    </span>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden mb-2">
                    <div className={`h-full ${barColor} transition-all duration-1000 ease-out`} style={{ width: `${percent}%` }} />
                  </div>
                  
                  <div className="flex justify-between items-center text-xs">
                    {b.rollover_balance > 0 ? (
                      <span className="text-emerald-400/80">+{formatCurrency(b.rollover_balance)} rollover</span>
                    ) : b.rollover_balance < 0 ? (
                      <span className="text-rose-400/80">-{formatCurrency(Math.abs(b.rollover_balance))} debt</span>
                    ) : (
                      <span className="text-white/40">No rollover</span>
                    )}

                    {(isWarning || isDanger) && (
                      <span className={`flex items-center gap-1 ${isDanger ? 'text-rose-400' : 'text-orange-400'}`}>
                        <AlertCircle className="w-3 h-3" />
                        {isDanger ? 'Limit Exceeded' : 'Nearing Limit'}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* Subscriptions Section */}
        <section>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-space-grotesk font-semibold flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-sky-400" />
              Active Subscriptions
            </h2>
          </div>

          {!loading && subscriptions.length === 0 && (
            <div className="text-center py-8 text-white/40 text-sm">
              No active subscriptions found.
            </div>
          )}

          <div className="space-y-3">
            {subscriptions.map(s => (
              <div key={s.id} className="glass-panel p-4 flex items-center justify-between rounded-2xl group">
                <div>
                  <h3 className="font-medium">{s.merchant}</h3>
                  <p className="text-xs text-white/50">Bills on day {s.billing_day}</p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-semibold text-sky-300">{formatCurrency(s.amount)}</span>
                  <button 
                    onClick={() => handleDeleteSub(s.id)}
                    className="p-2 text-white/30 hover:text-rose-400 hover:bg-rose-500/10 rounded-full transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

      </div>
      <BottomNav />
    </div>
  );
}
