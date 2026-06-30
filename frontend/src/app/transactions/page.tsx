'use client';

import { useState, useEffect } from 'react';
import { AuthGuard } from '@/components/AuthGuard';
import { BottomNav } from '@/components/BottomNav';
import { TransactionList } from '@/components/TransactionList';
import { ManualEntryForm } from '@/components/ManualEntryForm';
import { Button } from '@/components/ui/Button';
import { getTransactions, updateTransaction, deleteTransaction, createTransaction, exportCSV, exportPDF } from '@/lib/api';
import { Plus, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import { useExpenseData } from '@/hooks/useExpenseData';
import { motion } from 'framer-motion';

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const { refresh } = useExpenseData();

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const data = await getTransactions();
      setTransactions(data);
    } catch (error) {
      toast.error('Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  const handleUpdate = async (id: string, category: string) => {
    await updateTransaction(id, { category });
    toast.success('Category updated');
    refresh();
    fetchTransactions();
  };

  const handleDelete = async (id: string) => {
    await deleteTransaction(id);
    toast.success('Transaction deleted');
    refresh();
    fetchTransactions();
  };

  const handleCreate = async (data: any) => {
    await createTransaction(data);
    toast.success('Expense added');
    refresh();
    fetchTransactions();
  };
  
  const handleExport = async () => {
    setExporting(true);
    try {
      await exportPDF();
      toast.success('PDF exported successfully');
    } catch (error) {
      console.error(error);
      toast.error('Failed to export PDF');
    } finally {
      setExporting(false);
    }
  };


  return (
    <AuthGuard>
      <div className="min-h-screen bg-[#061813] pb-24">
        <header className="px-6 py-6 safe-pt sticky top-0 z-20 bg-emerald-500/10 backdrop-blur-xl border-b border-emerald-500/30 flex justify-between items-end shadow-[0_4px_30px_rgba(16,185,129,0.15)]">
          <div>
            <h1 className="text-3xl font-display font-bold">Transactions</h1>
          </div>
          <div className="flex space-x-3 items-center">
            <button 
              onClick={handleExport}
              disabled={exporting}
              className="px-3 h-10 rounded-full bg-white/5 flex items-center justify-center text-text-secondary hover:bg-white/10 hover:text-white transition-colors disabled:opacity-50"
            >
              <Download className="w-4 h-4 mr-1.5" />
              <span className="text-sm font-medium">PDF</span>
            </button>
            <button 
              onClick={() => setIsFormOpen(true)}
              className="w-10 h-10 rounded-full bg-[#10b981] flex items-center justify-center text-background shadow-lg shadow-[#10b981]/20 hover:bg-[#10b981]/90 transition-colors"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </header>

        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="px-4 py-6"
        >
          <TransactionList 
            transactions={transactions} 
            onUpdate={handleUpdate} 
            onDelete={handleDelete}
            loading={loading}
          />
        </motion.div>
      </div>

      <ManualEntryForm 
        isOpen={isFormOpen} 
        onClose={() => setIsFormOpen(false)} 
        onSubmit={handleCreate}
      />
      <BottomNav />
    </AuthGuard>
  );
}
