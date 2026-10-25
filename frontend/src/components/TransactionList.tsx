'use client';

import { useState, useMemo } from 'react';
import { formatCurrency, formatDate, getCategoryColor, CATEGORY_COLORS, appNavigate } from '@/lib/utils';
import {
  Edit2, Trash2, X, Utensils, Film, ShoppingBag, Car, Zap, Home,
  HeartPulse, PiggyBank, CircleEllipsis, ArrowDownLeft, ArrowUpRight,
  Search, Users, Filter, SlidersHorizontal, ArrowUpDown, Coffee
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Spinner } from './ui/Spinner';
import { motion, AnimatePresence } from 'framer-motion';

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

const item: any = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } },
};

interface Transaction {
  id: string;
  date: string;
  merchant_clean: string;
  merchant_raw?: string;
  amount: number;
  category: string;
  type?: 'debit' | 'credit';
  source?: string;
}

const CategoryIcon = ({ category, className, isCredit }: { category: string; className?: string; isCredit?: boolean }) => {
  if (isCredit) {
    return <ArrowDownLeft className={cn('text-emerald-400', className)} />;
  }
  switch (category) {
    case 'Chai & Snacks': return <Coffee className={className} />;
    case 'Food & Dining': return <Utensils className={className} />;
    case 'Entertainment': return <Film className={className} />;
    case 'Shopping': return <ShoppingBag className={className} />;
    case 'Transport': return <Car className={className} />;
    case 'Utilities': return <Zap className={className} />;
    case 'Housing': return <Home className={className} />;
    case 'Health & Fitness': return <HeartPulse className={className} />;
    case 'Savings': return <PiggyBank className={className} />;
    default: return <CircleEllipsis className={className} />;
  }
};

interface TransactionListProps {
  transactions: Transaction[];
  onUpdate: (id: string, category: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  loading?: boolean;
}

const ALL_CATEGORIES = [
  'All',
  'Chai & Snacks',
  'Food & Dining',
  'Shopping',
  'Transport',
  'Entertainment',
  'Utilities',
  'Housing',
  'Health & Fitness',
  'Savings',
];

export function TransactionList({ transactions, onUpdate, onDelete, loading }: TransactionListProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'debit' | 'credit'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [sortBy, setSortBy] = useState<'latest' | 'highest' | 'lowest'>('latest');

  const isTxnCredit = (t: Transaction) => t.type === 'credit' || ['Income', 'Salary', 'Refund'].includes(t.category);

  // Filtered & Sorted transactions
  const filtered = useMemo(() => {
    let result = transactions.filter(t => {
      // 1. Type filter
      if (filterType === 'credit' && !isTxnCredit(t)) return false;
      if (filterType === 'debit' && isTxnCredit(t)) return false;

      // 2. Category filter
      if (selectedCategory !== 'All' && t.category !== selectedCategory) return false;

      // 3. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const mClean = (t.merchant_clean || '').toLowerCase();
        const mRaw = (t.merchant_raw || '').toLowerCase();
        const cat = (t.category || '').toLowerCase();
        const amt = String(t.amount);
        if (!mClean.includes(q) && !mRaw.includes(q) && !cat.includes(q) && !amt.includes(q)) {
          return false;
        }
      }

      return true;
    });

    // Sort
    if (sortBy === 'highest') {
      result = [...result].sort((a, b) => b.amount - a.amount);
    } else if (sortBy === 'lowest') {
      result = [...result].sort((a, b) => a.amount - b.amount);
    } else {
      result = [...result].sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
    }

    return result;
  }, [transactions, filterType, selectedCategory, searchQuery, sortBy]);

  // Aggregate stats of filtered results
  const stats = useMemo(() => {
    let totalOutflow = 0;
    let totalInflow = 0;
    for (const t of filtered) {
      if (isTxnCredit(t)) {
        totalInflow += t.amount;
      } else {
        totalOutflow += t.amount;
      }
    }
    return { totalOutflow, totalInflow, count: filtered.length };
  }, [filtered]);

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <Spinner className="w-8 h-8 text-primary" />
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

  const handleSplitClick = (txn: Transaction) => {
    const merchant = encodeURIComponent(txn.merchant_clean || 'Expense');
    const amount = encodeURIComponent(txn.amount);
    appNavigate(`/splits?merchant=${merchant}&amount=${amount}`);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('All');
    setFilterType('all');
    setSortBy('latest');
  };

  const isAnyFilterActive = searchQuery || selectedCategory !== 'All' || filterType !== 'all' || sortBy !== 'latest';

  return (
    <div className="space-y-3 pb-20 select-none">
      {/* Search Input Bar */}
      <div className="relative mb-3">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search by store, category, amount..."
          className="w-full bg-white/5 border border-white/10 rounded-2xl pl-10 pr-9 py-2.5 text-xs text-white placeholder-white/40 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400/40 transition-all"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Filter Tabs & Sort Control */}
      <div className="flex items-center gap-2 mb-2">
        {/* Type Tabs */}
        <div className="flex items-center gap-1 p-1 bg-white/5 rounded-2xl border border-white/5 flex-1">
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
            <ArrowUpRight className="w-3 h-3 text-rose-400" />
            Outflow
          </button>
          <button
            onClick={() => setFilterType('credit')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-1 ${
              filterType === 'credit'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm'
                : 'text-white/60 hover:text-white'
            }`}
          >
            <ArrowDownLeft className="w-3 h-3 text-emerald-400" />
            Inflow
          </button>
        </div>

        {/* Sort Dropdown */}
        <div className="relative shrink-0">
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as any)}
            className="bg-white/5 border border-white/10 rounded-2xl text-[11px] font-medium py-2 px-2.5 text-white/80 focus:outline-none focus:border-emerald-400 cursor-pointer appearance-none pr-6"
          >
            <option value="latest" className="bg-[#0b1b16]">Latest</option>
            <option value="highest" className="bg-[#0b1b16]">Highest</option>
            <option value="lowest" className="bg-[#0b1b16]">Lowest</option>
          </select>
          <ArrowUpDown className="w-3 h-3 text-white/40 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      {/* Category Filter Pills (Horizontal Scroll) */}
      <div className="flex gap-1.5 overflow-x-auto pb-1.5 scrollbar-hide -mx-1 px-1">
        {ALL_CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap transition-all border shrink-0 ${
              selectedCategory === cat
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm'
                : 'bg-white/5 text-white/60 border-white/5 hover:text-white hover:bg-white/10'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Filter Summary Stats Banner */}
      <div className="flex items-center justify-between text-[11px] text-text-secondary px-1 py-1">
        <span>
          Showing <strong className="text-white">{stats.count}</strong> transaction{stats.count !== 1 ? 's' : ''}
          {stats.totalOutflow > 0 && (
            <span className="text-rose-400 ml-1.5">-₹{stats.totalOutflow.toLocaleString('en-IN')}</span>
          )}
          {stats.totalInflow > 0 && (
            <span className="text-emerald-400 ml-1.5">+₹{stats.totalInflow.toLocaleString('en-IN')}</span>
          )}
        </span>

        {isAnyFilterActive && (
          <button
            onClick={clearFilters}
            className="text-emerald-400 hover:text-emerald-300 font-semibold text-[11px]"
          >
            Reset
          </button>
        )}
      </div>

      {/* Empty State */}
      {filtered.length === 0 ? (
        <div className="text-center p-10 glass rounded-3xl mt-4">
          <p className="text-text-secondary text-sm mb-3">No transactions found.</p>
          {isAnyFilterActive && (
            <button
              onClick={clearFilters}
              className="px-4 py-2 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-semibold"
            >
              Clear Filters
            </button>
          )}
        </div>
      ) : (
        Object.entries(grouped).map(([date, txns]: [string, any]) => (
          <div key={date} className="animate-fadeIn">
            <h4 className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider mb-2 px-2 sticky top-0 bg-[#061813]/90 py-1 z-10">
              {date}
            </h4>
            <motion.ul
              variants={container}
              initial="hidden"
              animate="show"
              className="glass rounded-3xl overflow-hidden divide-y divide-white/5"
            >
              {txns.map((txn: Transaction) => {
                const isCredit = isTxnCredit(txn);

                return (
                  <motion.li
                    variants={item}
                    key={txn.id}
                    className="p-3.5 hover:bg-white/5 transition-colors relative group"
                  >
                    <div className="flex justify-between items-center gap-3">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        {/* Transaction Icon */}
                        <div
                          className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border ${
                            isCredit
                              ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                              : 'bg-white/5 border-white/10 text-white/70'
                          }`}
                        >
                          {isCredit ? (
                            <ArrowDownLeft className="w-5 h-5 text-emerald-400" />
                          ) : (
                            <CategoryIcon category={txn.category} className="w-5 h-5" />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-xs text-white truncate">
                            {txn.merchant_clean}
                          </p>

                          {editingId === txn.id ? (
                            <div className="mt-1 flex items-center space-x-2">
                              <select
                                className="bg-[#0b1b16] border border-white/20 rounded-md text-[10px] p-1 text-white focus:outline-none focus:ring-1 focus:ring-emerald-400"
                                value={txn.category}
                                onChange={e => handleCategoryChange(txn.id, e.target.value)}
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
                                    <option key={cat} value={cat}>
                                      {cat}
                                    </option>
                                  ))
                                )}
                              </select>
                              <button
                                onClick={() => setEditingId(null)}
                                className="p-1 text-text-secondary hover:text-white rounded"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 mt-0.5">
                              <div
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-medium cursor-pointer hover:opacity-80 transition-opacity gap-1 ${
                                  isCredit
                                    ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/20'
                                    : ''
                                }`}
                                style={
                                  isCredit
                                    ? {}
                                    : {
                                        backgroundColor: `${getCategoryColor(txn.category)}20`,
                                        color: getCategoryColor(txn.category),
                                      }
                                }
                                onClick={() => setEditingId(txn.id)}
                              >
                                <span>{txn.category}</span>
                              </div>

                              {/* Split Bill Shortcut Button for Debits */}
                              {!isCredit && (
                                <button
                                  onClick={() => handleSplitClick(txn)}
                                  className="inline-flex items-center gap-1 text-[9px] text-purple-300/80 hover:text-purple-300 px-1.5 py-0.5 rounded-full bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 transition-colors"
                                  title="Split this bill with friends"
                                >
                                  <Users className="w-2.5 h-2.5" />
                                  <span>Split</span>
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col items-end shrink-0 pl-2">
                        <span
                          className={`font-display font-bold text-sm ${
                            isCredit ? 'text-emerald-400' : 'text-white'
                          }`}
                        >
                          {isCredit ? `+${formatCurrency(txn.amount)}` : `-${formatCurrency(txn.amount)}`}
                        </span>

                        <div className="flex space-x-1.5 mt-1 opacity-80 md:opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleDelete(txn.id)}
                            className="p-1 text-white/40 hover:text-rose-400 rounded transition-colors"
                            disabled={updatingId === txn.id}
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {updatingId === txn.id && (
                      <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-10 rounded-2xl">
                        <Spinner className="w-4 h-4 text-primary" />
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
