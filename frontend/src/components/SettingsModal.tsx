'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Settings, DollarSign, Euro, IndianRupee, PoundSterling, Download, Upload, Key, FileText } from 'lucide-react';
import { updateUserProfile } from '@/lib/api';
import { Spinner } from '@/components/ui/Spinner';
import toast from 'react-hot-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { exportAllData, importData, exportTransactionsCSV } from '@/lib/dataBackup';

export function SettingsModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { user, refreshUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [apiKeySaved, setApiKeySaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [budgetAmount, setBudgetAmount] = useState('');
  const [budgetDays, setBudgetDays] = useState('30');
  const [savingBudget, setSavingBudget] = useState(false);

  // Load the saved API key when modal opens
  const loadApiKey = async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return;
    const { data: profile } = await supabase.from('profiles').select('groq_api_key').eq('id', authUser.id).single();
    if (profile?.groq_api_key) {
      setApiKey(profile.groq_api_key);
      setApiKeySaved(true);
    }
  };

  // Load on first render when open
  useEffect(() => {
    if (isOpen) {
      loadApiKey();
      if (user) {
        setBudgetAmount(user.monthly_budget?.toString() || '');
        setBudgetDays(user.budget_days?.toString() || '30');
      }
    }
  }, [isOpen, user]);

  const handleUpdateBudget = async () => {
    if (!budgetAmount || !budgetDays) return;
    setSavingBudget(true);
    const toastId = toast.loading('Updating budget...');
    try {
      await updateUserProfile({
        monthly_budget: parseFloat(budgetAmount),
        budget_days: parseInt(budgetDays) || 30
      });
      await refreshUser();
      toast.success('Budget updated! Recalculating...', { id: toastId });
      window.location.reload(); // Force full app recalculation
    } catch (e) {
      toast.error('Failed to update budget', { id: toastId });
    } finally {
      setSavingBudget(false);
    }
  };

  const handleCurrencyChange = async (newCurrency: string) => {
    if (newCurrency === (user?.preferred_currency || 'INR')) return;
    setLoading(true);
    const toastId = toast.loading('Changing currency...', { icon: '🔄' });
    try {
      await updateUserProfile({ preferred_currency: newCurrency });
      localStorage.setItem('preferred_currency', newCurrency);
      await refreshUser();
      toast.success(`Currency changed to ${newCurrency}!`, { id: toastId });
      window.location.reload();
    } catch (e) {
      toast.error('Failed to change currency', { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveApiKey = async () => {
    if (!apiKey.trim()) {
      toast.error('Please enter a valid API key');
      return;
    }
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser?.id) {
        await supabase.from('profiles').update({ groq_api_key: apiKey.trim() }).eq('id', authUser.id);
        setApiKeySaved(true);
        toast.success('API key saved! You can now chat with Lumina AI.', { icon: '🔑' });
      }
    } catch (e) {
      toast.error('Failed to save API key');
    }
  };

  const handleExportData = async () => {
    const toastId = toast.loading('Exporting data...', { icon: '📦' });
    try {
      await exportAllData();
      toast.success('Data exported! Check your downloads.', { id: toastId });
    } catch (e) {
      toast.error('Export failed', { id: toastId });
    }
  };

  const handleImportData = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const toastId = toast.loading('Importing data...', { icon: '📥' });
    try {
      const result = await importData(file);
      if (result.success) {
        toast.success(result.message, { id: toastId });
        await refreshUser();
        window.location.reload();
      } else {
        toast.error(result.message, { id: toastId });
      }
    } catch (e) {
      toast.error('Import failed', { id: toastId });
    }
    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleExportCSV = async () => {
    const toastId = toast.loading('Exporting CSV...', { icon: '📄' });
    try {
      await exportTransactionsCSV();
      toast.success('CSV exported! Check your downloads.', { id: toastId });
    } catch (e) {
      toast.error('Export failed', { id: toastId });
    }
  };

  const currencies = [
    { code: 'INR', icon: IndianRupee, name: 'Indian Rupee' },
    { code: 'USD', icon: DollarSign, name: 'US Dollar' },
    { code: 'EUR', icon: Euro, name: 'Euro' },
    { code: 'GBP', icon: PoundSterling, name: 'British Pound' },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
          />
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: "100%" }}
            className="fixed inset-x-0 bottom-0 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:max-w-md w-full bg-surface border border-white/10 rounded-t-3xl sm:rounded-3xl p-6 z-[100] flex flex-col shadow-2xl pb-safe max-h-[85dvh] overflow-y-auto"
          >
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center space-x-2">
                <Settings className="w-5 h-5 text-emerald-400" />
                <h2 className="text-xl font-bold text-white">App Settings</h2>
              </div>
              <button onClick={onClose} className="p-2 bg-white/5 rounded-full text-text-secondary hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Currency Selector */}
              <div className="bg-white/5 border border-white/10 p-4 rounded-2xl">
                <h3 className="text-sm font-semibold text-white mb-4">Preferred Currency</h3>
                <div className="grid grid-cols-2 gap-3">
                  {currencies.map(c => {
                    const Icon = c.icon;
                    const isActive = (user?.preferred_currency || 'INR') === c.code;
                    return (
                      <button
                        key={c.code}
                        onClick={() => handleCurrencyChange(c.code)}
                        disabled={loading}
                        className={`p-3 rounded-xl flex items-center space-x-2 border transition-all ${
                          isActive 
                            ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                            : 'bg-white/5 border-white/10 text-text-secondary hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        {loading && !isActive ? (
                          <Spinner className="w-4 h-4" />
                        ) : (
                          <Icon className="w-4 h-4" />
                        )}
                        <span className="font-medium text-sm">{c.code}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Budget Settings */}
              <div className="bg-white/5 border border-white/10 p-4 rounded-2xl space-y-4">
                <h3 className="text-sm font-semibold text-white">Active Budget</h3>
                
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">Budget Amount</label>
                  <input
                    type="number"
                    value={budgetAmount}
                    onChange={(e) => setBudgetAmount(e.target.value)}
                    className="w-full bg-black/20 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">Cycle Duration (Days)</label>
                  <input
                    type="number"
                    value={budgetDays}
                    onChange={(e) => setBudgetDays(e.target.value)}
                    className="w-full bg-black/20 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                  />
                </div>

                <button
                  onClick={handleUpdateBudget}
                  disabled={savingBudget}
                  className="w-full py-2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 rounded-xl font-medium flex items-center justify-center transition-all hover:bg-emerald-500/30"
                >
                  {savingBudget ? <Spinner className="w-4 h-4 mr-2" /> : null}
                  Update Active Budget
                </button>
              </div>

              {/* Advanced / Groq API Key */}
              <div className="bg-white/5 border border-white/10 p-4 rounded-2xl">
                <div className="flex items-center space-x-2 mb-3">
                  <Key className="w-4 h-4 text-amber-400" />
                  <h3 className="text-sm font-semibold text-white">AI Chat API Key</h3>
                </div>
                <p className="text-xs text-text-secondary mb-3">
                  Get a free Groq API key from <span className="text-emerald-400">console.groq.com</span> to enable AI chat.
                </p>
                <div className="flex space-x-2">
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    value={apiKey}
                    onChange={(e) => { setApiKey(e.target.value); setApiKeySaved(false); }}
                    placeholder="gsk_..."
                    className="flex-1 bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-text-secondary focus:outline-none focus:border-primary transition-colors"
                  />
                  <button
                    onClick={handleSaveApiKey}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                      apiKeySaved
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50'
                        : 'bg-emerald-500 text-white hover:bg-emerald-400'
                    }`}
                  >
                    {apiKeySaved ? '✓ Saved' : 'Save'}
                  </button>
                </div>
                <button
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="text-xs text-text-secondary mt-2 hover:text-white transition-colors"
                >
                  {showApiKey ? 'Hide key' : 'Show key'}
                </button>
              </div>

              {/* Data Backup & Restore */}
              <div className="bg-white/5 border border-white/10 p-4 rounded-2xl">
                <h3 className="text-sm font-semibold text-white mb-4">Data Backup & Restore</h3>
                <div className="space-y-3">
                  <button
                    onClick={handleExportData}
                    className="w-full p-3 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400 flex items-center space-x-3 hover:bg-blue-500/20 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    <span className="text-sm font-medium">Export All Data (JSON Backup)</span>
                  </button>

                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full p-3 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400 flex items-center space-x-3 hover:bg-purple-500/20 transition-colors"
                  >
                    <Upload className="w-4 h-4" />
                    <span className="text-sm font-medium">Import Data (Restore from Backup)</span>
                  </button>

                  <button
                    onClick={handleExportCSV}
                    className="w-full p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center space-x-3 hover:bg-emerald-500/20 transition-colors"
                  >
                    <FileText className="w-4 h-4" />
                    <span className="text-sm font-medium">Export Transactions as CSV</span>
                  </button>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json"
                    onChange={handleImportData}
                    className="hidden"
                  />
                </div>
                <p className="text-xs text-text-secondary mt-3">
                  💡 Tip: Export your data regularly to keep a backup on your phone storage.
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
