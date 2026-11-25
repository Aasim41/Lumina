'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Settings, DollarSign, Euro, IndianRupee, PoundSterling, Download, Upload, FileText, Zap, ShieldCheck, Trash2, Volume2, VolumeX, Vibrate, Play } from 'lucide-react';
import { updateUserProfile } from '@/lib/api';
import { Spinner } from '@/components/ui/Spinner';
import toast from 'react-hot-toast';
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/lib/db';
import { exportAllData, importData, exportTransactionsCSV, getLastBackupTime } from '@/lib/dataBackup';
import { appNavigate } from '@/lib/utils';
import { soundFX } from '@/lib/soundFx';

export function SettingsModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { user, refreshUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [budgetAmount, setBudgetAmount] = useState('');
  const [budgetDays, setBudgetDays] = useState('30');
  const [savingBudget, setSavingBudget] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [hapticsEnabled, setHapticsEnabled] = useState(true);
  const [lastBackupTime, setLastBackupTime] = useState<string | null>(null);

  // Load on first render when open
  useEffect(() => {
    if (isOpen) {
      setLastBackupTime(getLastBackupTime());
      setSoundEnabled(soundFX.isEnabled());
      setHapticsEnabled(soundFX.isHapticsEnabled());
      if (user) {
        setBudgetAmount(user.monthly_budget?.toString() || '');
        setBudgetDays(user.budget_days?.toString() || '30');
      }
    }
  }, [isOpen, user]);

  const handleToggleSound = () => {
    const next = soundFX.toggleSound();
    setSoundEnabled(next);
    if (next) soundFX.playChaChing();
    toast.success(next ? 'Sound effects enabled 🔔' : 'Sound effects muted 🔕');
  };

  const handleToggleHaptics = () => {
    const next = soundFX.toggleHaptics();
    setHapticsEnabled(next);
    if (next) soundFX.triggerHaptic([30, 40, 30]);
    toast.success(next ? 'Tactile haptics enabled' : 'Tactile haptics disabled');
  };

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

  const handleExportData = async (encrypted: boolean = false) => {
    let password = '';
    if (encrypted) {
      const entered = window.prompt('🔒 Set a password to encrypt your backup file:');
      if (!entered || !entered.trim()) {
        toast.error('Export cancelled (password required)');
        return;
      }
      password = entered.trim();
    }
    const toastId = toast.loading(encrypted ? 'Protecting & saving backup...' : 'Creating backup...', { icon: '📦' });
    try {
      await exportAllData(password);
      setLastBackupTime(new Date().toISOString());
      toast.success(encrypted ? 'Password-protected backup saved! 🔒' : 'Backup saved successfully!', { id: toastId });
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
        setLastBackupTime(new Date().toISOString());
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

  const handleDeleteAccount = async () => {
    if (!window.confirm("⚠️ Are you sure you want to delete your Lumina account and wipe all local transaction data? This cannot be undone.")) {
      return;
    }
    try {
      await db.delete();
      localStorage.clear();
      toast.success("All data wiped successfully.");
      window.location.href = '/login';
    } catch (e) {
      toast.error("Failed to wipe data");
    }
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

              {/* Audio & Haptic Feedback */}
              <div className="bg-white/5 border border-white/10 p-4 rounded-2xl space-y-3">
                <h3 className="text-sm font-semibold text-white">Audio & Haptic Feedback</h3>
                
                {/* Sound Effects Toggle */}
                <div className="flex items-center justify-between py-1">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                      {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-white/40" />}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-white">Sound Effects</p>
                      <p className="text-[10px] text-text-secondary">Cash register & chime sound effects</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {soundEnabled && (
                      <button
                        type="button"
                        onClick={() => soundFX.playChaChing()}
                        className="px-2 py-1 text-[10px] font-semibold bg-white/10 hover:bg-white/20 text-white/80 rounded-lg transition-colors cursor-pointer"
                        title="Test Sound"
                      >
                        Test
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleToggleSound}
                      className={`w-11 h-6 rounded-full p-0.5 transition-colors cursor-pointer ${
                        soundEnabled ? 'bg-emerald-500' : 'bg-white/20'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-full bg-white shadow-md transition-transform ${
                          soundEnabled ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Tactile Haptics Toggle */}
                <div className="flex items-center justify-between py-1 border-t border-white/5 pt-2.5">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400">
                      <Vibrate className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-white">Tactile Vibrations</p>
                      <p className="text-[10px] text-text-secondary">Subtle haptics on button taps</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleToggleHaptics}
                    className={`w-11 h-6 rounded-full p-0.5 transition-colors cursor-pointer ${
                      hapticsEnabled ? 'bg-emerald-500' : 'bg-white/20'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-white shadow-md transition-transform ${
                        hapticsEnabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>



              {/* Data Backup & Restore */}
              <div className="bg-white/5 border border-white/10 p-4 rounded-2xl">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-sm font-semibold text-white">Data Backup & Restore</h3>
                  {lastBackupTime ? (
                    <span className="text-[11px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                      Backed up {new Date(lastBackupTime).toLocaleDateString()}
                    </span>
                  ) : (
                    <span className="text-[11px] text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                      No backup yet
                    </span>
                  )}
                </div>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleExportData(false)}
                      className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400 flex items-center justify-center space-x-2 hover:bg-blue-500/20 transition-colors text-xs font-semibold"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Save Backup</span>
                    </button>

                    <button
                      onClick={() => handleExportData(true)}
                      className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center space-x-2 hover:bg-emerald-500/20 transition-colors text-xs font-semibold"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Password Lock 🔒</span>
                    </button>
                  </div>

                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full p-3 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400 flex items-center space-x-3 hover:bg-purple-500/20 transition-colors"
                  >
                    <Upload className="w-4 h-4" />
                    <span className="text-sm font-medium">Restore from Backup File</span>
                  </button>

                  <button
                    onClick={handleExportCSV}
                    className="w-full p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center space-x-3 hover:bg-emerald-500/20 transition-colors"
                  >
                    <FileText className="w-4 h-4" />
                    <span className="text-sm font-medium">Export Transactions (Excel / CSV)</span>
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

              {/* Legal, Privacy & Delete Account */}
              <div className="bg-white/5 border border-white/10 p-4 rounded-2xl space-y-3">
                <h3 className="text-sm font-semibold text-white">Legal & Account</h3>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      appNavigate('/privacy');
                    }}
                    className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-white/70 hover:text-white text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer active:scale-95"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Privacy Policy</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      appNavigate('/terms');
                    }}
                    className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-white/70 hover:text-white text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer active:scale-95"
                  >
                    <FileText className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Terms of Use</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleDeleteAccount}
                  className="w-full p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500/20 text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4 text-rose-400" />
                  <span>Delete Account & Wipe All Data</span>
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
