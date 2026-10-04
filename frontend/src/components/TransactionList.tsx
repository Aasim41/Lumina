'use client';

import { useState } from 'react';
import { formatCurrency, formatDate, getCategoryColor, CATEGORY_COLORS } from '@/lib/utils';
import { Edit2, Trash2, X, Utensils, Film, ShoppingBag, Car, Zap, Home, HeartPulse, PiggyBank, CircleEllipsis, ArrowDownLeft, ArrowUpRight, Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Spinner } from './ui/Spinner';
import { motion } from 'framer-motion';

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const item: any = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

interface Transaction {
  id: string;
  date: string;
  merchant_clean: string;
  amount: number;
  category: string;
  type?: 'debit' | 'credit';
}

const CategoryIcon = ({ category, className, isCredit }: { category: string, className?: string, isCredit?: boolean }) => {
  if (isCredit) {
    return <ArrowDownLeft className={cn("text-emerald-400", className)} />;
  }
  switch (category) {
    case "Food & Dining": return <Utensils className={className} />;
    case "Entertainment": return <Film className={className} />;
    case "Shopping": return <ShoppingBag className={className} />;
    case "Transport": return <Car className={className} />;
    case "Utilities": return <Zap className={className} />;
    case "Housing": return <Home className={className} />;
    case "Health & Fitness": return <HeartPulse className={className} />;
    case "Savings": return <PiggyBank className={className} />;
    default: return <CircleEllipsis className={className} />;
  }
};

interface TransactionListProps {
  transactions: Transaction[];
  onUpdate: (id: string, category: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  loading?: boolean;
}

export function TransactionList({ transactions, onUpdate, onDelete, loading }: TransactionListProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'debit' | 'credit'>('all');

  if (loading) {
    return <div className="flex justify-center p-8"><Spinner className="w-8 h-8 text-primary" /></div>;
  }

  const isTxnCredit = (t: Transaction) => t.type === 'credit' || ['Income', 'Salary', 'Refund'].includes(t.category);

  // Apply credit/debit filter
  const filtered = transactions.filter(t => {
    if (filterType === 'all') return true;
    if (filterType === 'credit') return isTxnCredit(t);
    return !isTxnCredit(t);
  });

  if (transactions.length === 0) {
    return (
      <div className="text-center p-10 glass rounded-2xl">
        <p className="text-text-secondary">No transactions found.</p>
      </div>
    );
  }

  // Group by date
  const grouped = filtered.reduce((acc: any, txn) => {
    const dateStr = formatDate(txn.date);
    if (!acc[dateStr]) acc[dateStr] = [];
    acc[dateStr].push(txn);
    return acc;
  }, {});

  const handleCategoryChange = async (id: string, newCategory: string) => {
    setUpdatingId(id);
    try {
      await onUpdate(id, newCategory);
    } finally {
      setUpdatingId(null);
      setEditingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this transaction?')) {
      setUpdatingId(id);
      try {
        await onDelete(id);
      } finally {
        setUpdatingId(null);
      }
    }
  };

  return (
    <div className="space-y-4 pb-20">
      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 p-1 bg-white/5 rounded-2xl border border-white/5 mb-4 max-w-sm mx-auto">
        <button
          onClick={() => setFilterType('all')}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-xl transition-all ${
            filterType === 'all' 
              ? 'bg-white/15 text-white shadow-sm' 
              : 'text-white/60 hover:text-white'
          }`}
        >
          All
        </button>
        <button
          onClick={() => setFilterType('debit')}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-1 ${
            filterType === 'debit' 
              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 shadow-sm' 
              : 'text-white/60 hover:text-white'
          }`}
        >
          <ArrowUpRight className="w-3.5 h-3.5 text-rose-400" />
          Expenses
        </button>
        <button
          onClick={() => setFilterType('credit')}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-1 ${
            filterType === 'credit' 
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm' 
              : 'text-white/60 hover:text-white'
          }`}
        >
          <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-400" />
          Income
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center p-8 glass rounded-2xl">
          <p className="text-text-secondary text-sm">No {filterType === 'credit' ? 'income' : 'expense'} transactions recorded.</p>
        </div>
      ) : (
        Object.entries(grouped).map(([date, txns]: [string, any]) => (
          <div key={date} className="animate-fadeIn">
            <h4 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2 px-2 sticky top-0 bg-background/80 py-1.5 z-10">
              {date}
            </h4>
            <motion.ul 
              variants={container}
              initial="hidden"
              animate="show"
              className="glass rounded-2xl overflow-hidden divide-y divide-white/5"
            >
              {txns.map((txn: Transaction) => {
                const isCredit = isTxnCredit(txn);

                return (
                  <motion.li variants={item} key={txn.id} className="p-4 hover:bg-white/5 transition-colors relative group">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        {/* Transaction Icon */}
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border ${
                          isCredit 
                            ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400' 
                            : 'bg-white/5 border-white/10 text-white/70'
                        }`}>
                          {isCredit ? (
                            <ArrowDownLeft className="w-5 h-5 text-emerald-400" />
                          ) : (
                            <CategoryIcon category={txn.category} className="w-5 h-5" />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-sm text-text-primary truncate">{txn.merchant_clean}</p>
                          
                          {editingId === txn.id ? (
                            <div className="mt-1.5 flex items-center space-x-2">
                              <select 
                                className="bg-surface border border-white/10 rounded-md text-xs p-1 text-text-primary focus:outline-none focus:ring-1 focus:ring-primary"
                                value={txn.category}
                                onChange={(e) => handleCategoryChange(txn.id, e.target.value)}
                                disabled={updatingId === txn.id}
                              >
                                {isCredit ? (
                                  <>
                                    <option value="Income">Income</option>
                                    <option value="Salary">Salary</option>
                                    <option value="Refund">Refund / Cashback</option>
                                    <option value="Miscellaneous">Miscellaneous</option>
                                  </>
                                ) : (
                                  Object.keys(CATEGORY_COLORS).map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                  ))
                                )}
                              </select>
                              <button onClick={() => setEditingId(null)} className="p-1 text-text-secondary hover:text-white rounded">
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <div 
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium mt-1 cursor-pointer hover:opacity-80 transition-opacity gap-1 ${
                                isCredit 
                                  ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/20' 
                                  : ''
                              }`}
                              style={isCredit ? {} : { backgroundColor: `${getCategoryColor(txn.category)}20`, color: getCategoryColor(txn.category) }}
                              onClick={() => setEditingId(txn.id)}
                            >
                              <span>{txn.category}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex flex-col items-end pl-3">
                        <span className={`font-display font-bold text-sm ${
                          isCredit ? 'text-emerald-400' : 'text-white'
                        }`}>
                          {isCredit ? `+${formatCurrency(txn.amount)}` : `-${formatCurrency(txn.amount)}`}
                        </span>
                        
                        {/* Action buttons */}
                        <div className="flex space-x-2 mt-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => handleDelete(txn.id)}
                            className="p-1 text-text-secondary hover:text-danger rounded"
                            disabled={updatingId === txn.id}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                    
                    {updatingId === txn.id && (
                      <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-10 rounded-xl">
                        <Spinner className="w-5 h-5 text-primary" />
                      </div>
                    )}
                  </motion.li>
                );
              })}
            </motion.ul>
          </div>
        ))
      )}
    </div>
  );
}
