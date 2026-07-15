'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Settings, DollarSign, Euro, IndianRupee, PoundSterling } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { Spinner } from '@/components/ui/Spinner';
import toast from 'react-hot-toast';
import { useAuth } from '@/hooks/useAuth';

export function SettingsModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { user, refreshUser } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleCurrencyChange = async (newCurrency: string) => {
    if (newCurrency === (user?.preferred_currency || 'INR')) return;
    setLoading(true);
    const toastId = toast.loading('Converting everything...', { icon: '🔄' });
    try {
      await apiFetch('/api/settings/currency', {
        method: 'PUT',
        body: JSON.stringify({ new_currency: newCurrency })
      });
      localStorage.setItem('preferred_currency', newCurrency);
      await refreshUser();
      toast.success(`Currency changed to ${newCurrency}!`, { id: toastId });
      // Reload page to fully refresh all data charts and contexts
      window.location.reload();
    } catch (e) {
      toast.error('Failed to change currency', { id: toastId });
    } finally {
      setLoading(false);
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
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: "100%" }}
            className="fixed inset-x-0 bottom-0 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:max-w-md w-full bg-surface border border-white/10 rounded-t-3xl sm:rounded-3xl p-6 z-50 flex flex-col shadow-2xl safe-pb"
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
                <p className="text-xs text-text-secondary mt-4">
                  Note: Changing currency will automatically convert your past transactions and budget using live mocked rates.
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
