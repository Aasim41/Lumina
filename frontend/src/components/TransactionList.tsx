'use client';

import { useState } from 'react';
import { formatCurrency, formatDate, getCategoryColor, CATEGORY_COLORS } from '@/lib/utils';
import { Edit2, Trash2, X, Utensils, Film, ShoppingBag, Car, Zap, Home, HeartPulse, PiggyBank, CircleEllipsis } from 'lucide-react';
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
}

const CategoryIcon = ({ category, className }: { category: string, className?: string }) => {
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

  if (loading) {
    return <div className="flex justify-center p-8"><Spinner className="w-8 h-8 text-primary" /></div>;
  }

  if (transactions.length === 0) {
    return (
      <div className="text-center p-10 glass rounded-2xl">
        <p className="text-text-secondary">No transactions found.</p>
      </div>
    );
  }

  // Group by date
  const grouped = transactions.reduce((acc: any, txn) => {
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
    <div className="space-y-6 pb-20">
      {Object.entries(grouped).map(([date, txns]: [string, any]) => (
        <div key={date} className="animate-fadeIn">
          <h4 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-3 px-2 sticky top-0 bg-background/80 backdrop-blur py-2 z-10">
            {date}
          </h4>
          <motion.ul 
            variants={container}
            initial="hidden"
            animate="show"
            className="glass rounded-2xl overflow-hidden divide-y divide-white/5"
          >
            {txns.map((txn: Transaction) => (
              <motion.li variants={item} key={txn.id} className="p-4 hover:bg-white/5 transition-colors relative group">
                <div className="flex justify-between items-center">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-text-primary truncate">{txn.merchant_clean}</p>
                    
                    {editingId === txn.id ? (
                      <div className="mt-2 flex items-center space-x-2">
                        <select 
                          className="bg-surface border border-white/10 rounded-md text-sm p-1 text-text-primary focus:outline-none focus:ring-1 focus:ring-primary"
                          value={txn.category}
                          onChange={(e) => handleCategoryChange(txn.id, e.target.value)}
                          disabled={updatingId === txn.id}
                        >
                          {Object.keys(CATEGORY_COLORS).map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                        <button onClick={() => setEditingId(null)} className="p-1 text-text-secondary hover:text-white rounded">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div 
                        className="inline-flex items-center px-2 py-0.5 rounded text-xs mt-1 cursor-pointer hover:opacity-80 transition-opacity space-x-1.5"
                        style={{ backgroundColor: `${getCategoryColor(txn.category)}20`, color: getCategoryColor(txn.category) }}
                        onClick={() => setEditingId(txn.id)}
                      >
                        <CategoryIcon category={txn.category} className="w-3 h-3" />
                        <span>{txn.category}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex flex-col items-end pl-4">
                    <span className="font-display font-medium text-text-primary">
                      {formatCurrency(txn.amount)}
                    </span>
                    
                    {/* Action buttons - appear on hover (desktop) or always visible small (mobile) */}
                    <div className="flex space-x-2 mt-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => handleDelete(txn.id)}
                        className="p-1 text-text-secondary hover:text-danger rounded"
                        disabled={updatingId === txn.id}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
                
                {updatingId === txn.id && (
                  <div className="absolute inset-0 bg-background/50 flex items-center justify-center backdrop-blur-sm z-10 rounded-xl">
                    <Spinner className="w-5 h-5 text-primary" />
                  </div>
                )}
                </motion.li>
            ))}
          </motion.ul>
        </div>
      ))}
    </div>
  );
}
