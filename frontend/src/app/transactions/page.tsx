'use client';

import { useState, useEffect } from 'react';
import { AuthGuard } from '@/components/AuthGuard';
import { BottomNav } from '@/components/BottomNav';
import { TransactionList } from '@/components/TransactionList';
import { ManualEntryForm } from '@/components/ManualEntryForm';
import { Button } from '@/components/ui/Button';
import { getTransactions, updateTransaction, deleteTransaction, createTransaction, exportCSV, exportPDF } from '@/lib/api';
import { Plus, Download, Upload, X } from 'lucide-react';
import { FileUploadZone } from '@/components/FileUploadZone';
import { AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { useExpenseData } from '@/hooks/useExpenseData';
import { motion } from 'framer-motion';
import { generateMonthlyStatement } from '@/lib/PDFGenerator';
import { useAuth } from '@/hooks/useAuth';
import { Spinner } from '@/components/ui/Spinner';

export default function TransactionsPage() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [scannedReceipt, setScannedReceipt] = useState<any>(null);
  const [exporting, setExporting] = useState(false);
  const { refresh, summary } = useExpenseData();

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
    if (!user) return;
    setExporting(true);
    const toastId = toast.loading('Generating PDF Statement...', { icon: '📄' });
    try {
      const monthName = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
      const totalSpent = summary?.total_this_month || 0;
      await generateMonthlyStatement(user, transactions, monthName, totalSpent);
      toast.success('Statement Downloaded!', { id: toastId });
    } catch (error) {
      console.error(error);
      toast.error('Failed to export PDF', { id: toastId });
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
          <div className="flex space-x-2 items-center">
            <button 
              onClick={() => setIsUploadOpen(true)}
              className="w-10 h-10 shrink-0 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center hover:bg-amber-500/30 transition-colors"
              title="Upload Bill"
            >
              <Upload className="w-5 h-5" />
            </button>
            <button 
              onClick={handleExport}
              disabled={exporting}
              className="w-10 h-10 shrink-0 rounded-full bg-white/5 flex items-center justify-center text-text-secondary hover:bg-white/10 hover:text-white transition-colors disabled:opacity-50"
              title="Download Statement"
            >
              {exporting ? <Spinner className="w-5 h-5 text-white" /> : <Download className="w-5 h-5" />}
            </button>
            <button 
              onClick={() => setIsFormOpen(true)}
              className="w-10 h-10 shrink-0 rounded-full bg-[#10b981] flex items-center justify-center text-background shadow-lg shadow-[#10b981]/20 hover:bg-[#10b981]/90 transition-colors"
              title="Add Transaction"
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
      <ManualEntryForm 
        isOpen={!!scannedReceipt} 
        onClose={() => setScannedReceipt(null)}
        initialData={scannedReceipt}
        onSubmit={async (data) => {
          await handleCreate(data);
          setScannedReceipt(null);
        }}
      />
      
      <AnimatePresence>
        {isUploadOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsUploadOpen(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-md z-[99]"
            />
            <motion.div
              initial={{ opacity: 0, y: '100%' }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: '100%' }}
              className="fixed bottom-0 left-0 right-0 bg-[#12081C] rounded-t-3xl border-t border-white/10 p-6 z-[100] max-h-[85vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-display font-bold text-white">Upload Bill/CSV</h2>
                <button onClick={() => setIsUploadOpen(false)} className="p-2 rounded-full bg-white/5 text-white/50 hover:bg-white/10 hover:text-white transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <FileUploadZone onUploadSuccess={() => { refresh(); fetchTransactions(); setIsUploadOpen(false); }} onReceiptScanned={(data) => { setScannedReceipt(data); setIsUploadOpen(false); }} />
            </motion.div>
          </>
        )}
      </AnimatePresence>
      <BottomNav />
    </AuthGuard>
  );
}
