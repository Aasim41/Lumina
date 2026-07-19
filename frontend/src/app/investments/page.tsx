'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, Plus, Trash2, ArrowUpRight, ArrowDownRight, RefreshCw, BarChart2 } from 'lucide-react';
import { AuthGuard } from '@/components/AuthGuard';
import { BottomNav } from '@/components/BottomNav';
import { Button } from '@/components/ui/Button';
import { getInvestments, createInvestment, updateInvestment, deleteInvestment } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import toast from 'react-hot-toast';

export default function InvestmentsPage() {
  const [investments, setInvestments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [ticker, setTicker] = useState('');
  const [assetClass, setAssetClass] = useState('Stock');
  const [quantity, setQuantity] = useState('');
  const [averageBuyPrice, setAverageBuyPrice] = useState('');
  const [investedAmount, setInvestedAmount] = useState('');

  const fetchInvestments = async () => {
    try {
      const data = await getInvestments();
      setInvestments(data);
    } catch (e) {
      toast.error('Failed to load investments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvestments();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    
    setIsSubmitting(true);
    try {
      await createInvestment({
        name,
        ticker: ticker || null,
        asset_class: assetClass,
        quantity: parseFloat(quantity) || 0,
        average_buy_price: parseFloat(averageBuyPrice) || 0,
        invested_amount: parseFloat(investedAmount) || 0,
      });
      toast.success('Investment added!');
      setIsModalOpen(false);
      
      // Reset form
      setName('');
      setTicker('');
      setQuantity('');
      setAverageBuyPrice('');
      setInvestedAmount('');
      
      fetchInvestments();
    } catch (e) {
      toast.error('Failed to add investment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteInvestment(id);
      toast.success('Investment removed');
      fetchInvestments();
    } catch (e) {
      toast.error('Failed to delete investment');
    }
  };

  const totalInvested = investments.reduce((sum, inv) => sum + (inv.invested_amount || (inv.quantity * inv.average_buy_price)), 0);
  const currentPortfolioValue = investments.reduce((sum, inv) => sum + inv.current_value, 0);
  const totalReturn = currentPortfolioValue - totalInvested;
  const returnPercentage = totalInvested > 0 ? (totalReturn / totalInvested) * 100 : 0;
  const isPositive = totalReturn >= 0;

  return (
    <AuthGuard>
      <div className="min-h-screen bg-background pb-24 text-text-primary">
        <header className="px-6 pb-8 pt-14 safe-pt bg-gradient-to-b from-indigo-500/20 to-transparent">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-display font-bold">Portfolio 📈</h1>
            <button
              onClick={() => { fetchInvestments(); toast('Refreshing prices...', { icon: '🔄' }); }}
              className="p-2 bg-white/5 text-text-secondary hover:text-white rounded-full transition-colors"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>
          
          <div className="glass p-6 rounded-3xl border border-white/10 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <BarChart2 className="w-24 h-24 text-indigo-400" />
            </div>
            <p className="text-sm text-text-secondary mb-1">Current Value</p>
            <h2 className="text-4xl font-display font-bold text-text-primary mb-4">
              {formatCurrency(currentPortfolioValue)}
            </h2>
            
            <div className="flex justify-between items-end border-t border-white/10 pt-4">
              <div>
                <p className="text-xs text-text-secondary mb-1">Total Invested</p>
                <p className="font-semibold">{formatCurrency(totalInvested)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-text-secondary mb-1">Total Returns</p>
                <p className={`font-semibold flex items-center justify-end gap-1 ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                  {isPositive ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                  {formatCurrency(Math.abs(totalReturn))} ({Math.abs(returnPercentage).toFixed(2)}%)
                </p>
              </div>
            </div>
          </div>
        </header>

        <div className="px-4 space-y-4 -mt-2">
          <div className="flex justify-between items-center mb-2 px-2">
            <h3 className="text-lg font-semibold text-white/90">Your Assets</h3>
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-1 text-sm font-medium text-indigo-400 bg-indigo-500/10 px-3 py-1.5 rounded-full hover:bg-indigo-500/20 transition-colors"
            >
              <Plus className="w-4 h-4" /> Add Asset
            </button>
          </div>

          {loading ? (
            <div className="text-center py-10 text-white/50">Loading portfolio...</div>
          ) : investments.length === 0 ? (
            <div className="text-center py-12 px-4 glass rounded-3xl border border-white/5">
              <TrendingUp className="w-12 h-12 text-indigo-500/40 mx-auto mb-4" />
              <p className="text-text-primary/80 font-medium">No investments found</p>
              <p className="text-sm text-text-secondary mt-1">Add your first stock, mutual fund, or FD to track returns.</p>
            </div>
          ) : (
            investments.map((inv) => {
              const invested = inv.invested_amount || (inv.quantity * inv.average_buy_price);
              const invReturn = inv.current_value - invested;
              const invReturnPct = invested > 0 ? (invReturn / invested) * 100 : 0;
              const isInvPositive = invReturn >= 0;

              return (
                <motion.div
                  key={inv.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass p-5 rounded-2xl border border-white/5 flex items-center justify-between"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center border border-white/10 flex-shrink-0">
                      <span className="font-bold text-lg text-text-primary/80">{inv.name.charAt(0).toUpperCase()}</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-text-primary/90">{inv.name}</h4>
                      <p className="text-xs text-text-secondary flex gap-2">
                        <span>{inv.asset_class}</span>
                        {inv.ticker && <span>• {inv.ticker}</span>}
                      </p>
                    </div>
                  </div>
                  
                  <div className="text-right flex items-center gap-4">
                    <div>
                      <p className="font-semibold text-text-primary/90">{formatCurrency(inv.current_value)}</p>
                      <p className={`text-xs flex items-center justify-end font-medium ${isInvPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                        {isInvPositive ? '+' : ''}{formatCurrency(invReturn)}
                        <span className="ml-1 opacity-80">({isInvPositive ? '+' : ''}{invReturnPct.toFixed(2)}%)</span>
                      </p>
                    </div>
                    <button 
                      onClick={() => handleDelete(inv.id)}
                      className="p-2 -mr-2 text-white/20 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>

        {/* Create Investment Modal */}
        <AnimatePresence>
          {isModalOpen && (
            <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, y: "100%" }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="w-full sm:max-w-md bg-surface border border-white/10 rounded-t-3xl sm:rounded-3xl p-6 sm:m-4 max-h-[90vh] overflow-y-auto"
              >
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-display font-semibold text-text-primary">Add Investment</h2>
                  <button onClick={() => setIsModalOpen(false)} className="p-2 text-text-secondary hover:text-text-primary rounded-full">
                    ✕
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm text-text-secondary mb-1">Asset Name</label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={e => setName(e.target.value)}
                      className="w-full bg-surface-light border border-white/10 rounded-2xl p-3 text-text-primary focus:outline-none focus:border-indigo-500/50"
                      placeholder="e.g. Apple Inc, Axis Bluechip Fund"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-text-secondary mb-1">Asset Class</label>
                      <select
                        value={assetClass}
                        onChange={e => setAssetClass(e.target.value)}
                        className="w-full bg-surface-light border border-white/10 rounded-2xl p-3 text-text-primary focus:outline-none focus:border-indigo-500/50"
                      >
                        <option value="Stock">Stock</option>
                        <option value="Mutual Fund">Mutual Fund</option>
                        <option value="Fixed Deposit">Fixed Deposit</option>
                        <option value="Crypto">Crypto</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-text-secondary mb-1">Ticker (Yahoo Finance)</label>
                      <input
                        type="text"
                        value={ticker}
                        onChange={e => setTicker(e.target.value.toUpperCase())}
                        className="w-full bg-surface-light border border-white/10 rounded-2xl p-3 text-text-primary focus:outline-none focus:border-indigo-500/50 uppercase"
                        placeholder="e.g. AAPL, RELIANCE.NS"
                      />
                    </div>
                  </div>

                  {ticker ? (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-text-secondary mb-1">Quantity</label>
                        <input
                          type="number"
                          required
                          value={quantity}
                          onChange={e => setQuantity(e.target.value)}
                          className="w-full bg-surface-light border border-white/10 rounded-2xl p-3 text-text-primary focus:outline-none focus:border-indigo-500/50"
                          placeholder="0"
                          step="0.0001"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-text-secondary mb-1">Avg Buy Price</label>
                        <input
                          type="number"
                          required
                          value={averageBuyPrice}
                          onChange={e => setAverageBuyPrice(e.target.value)}
                          className="w-full bg-surface-light border border-white/10 rounded-2xl p-3 text-text-primary focus:outline-none focus:border-indigo-500/50"
                          placeholder="0.00"
                          step="0.01"
                        />
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-sm text-text-secondary mb-1">Total Amount Invested</label>
                      <input
                        type="number"
                        required
                        value={investedAmount}
                        onChange={e => setInvestedAmount(e.target.value)}
                        className="w-full bg-surface-light border border-white/10 rounded-2xl p-3 text-text-primary focus:outline-none focus:border-indigo-500/50"
                        placeholder="0.00"
                        step="0.01"
                      />
                      <p className="text-xs text-text-secondary mt-2">
                        Because no ticker is provided, the current value will be assumed to be equal to the invested amount unless manually updated later.
                      </p>
                    </div>
                  )}

                  <div className="pt-4 pb-8 sm:pb-0">
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      isLoading={isSubmitting}
                      className="w-full py-4"
                      size="lg"
                    >
                      {isSubmitting ? 'Adding...' : 'Add Investment'}
                    </Button>
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
