'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Eye, EyeOff, Plus, ArrowDownLeft, X, Sparkles, Lock, Coins, CheckCircle2, History } from 'lucide-react';
import { Button } from './ui/Button';
import { 
  getVaultDetails, 
  depositToVault, 
  withdrawFromVault, 
  setVaultAutoSaveEnabled, 
  setVaultRoundUpEnabled 
} from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { soundFX } from '@/lib/soundFx';
import toast from 'react-hot-toast';

interface SecretVaultModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function SecretVaultModal({ isOpen, onClose, onSuccess }: SecretVaultModalProps) {
  const [vaultData, setVaultData] = useState<{
    vault_balance: number;
    permanent_balance: number;
    active_stash: number;
    recent_deposits: any[];
    auto_save_enabled: boolean;
    round_up_enabled: boolean;
  }>({
    vault_balance: 0,
    permanent_balance: 0,
    active_stash: 0,
    recent_deposits: [],
    auto_save_enabled: true,
    round_up_enabled: true,
  });

  const [isRevealed, setIsRevealed] = useState(false);
  const [mode, setMode] = useState<'view' | 'deposit' | 'withdraw' | 'history'>('view');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [autoSaveActive, setAutoSaveActive] = useState(true);
  const [roundUpActive, setRoundUpActive] = useState(true);

  const loadData = async () => {
    try {
      const data = await getVaultDetails();
      setVaultData(data);
      setAutoSaveActive(data.auto_save_enabled);
      setRoundUpActive(data.round_up_enabled);
    } catch (e) {
      console.warn('Failed to load vault details:', e);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
      setMode('view');
      setAmount('');
      soundFX.playCoin();
    }
  }, [isOpen]);

  const handleToggleAutoSave = () => {
    const nextVal = !autoSaveActive;
    setAutoSaveActive(nextVal);
    setVaultAutoSaveEnabled(nextVal);
    soundFX.playCoin();
    toast.success(nextVal ? 'Daily secret micro-saving enabled' : 'Daily secret saving paused', { icon: '🤫' });
  };

  const handleToggleRoundUp = () => {
    const nextVal = !roundUpActive;
    setRoundUpActive(nextVal);
    setVaultRoundUpEnabled(nextVal);
    soundFX.playCoin();
    toast.success(nextVal ? 'Spare change round-ups enabled' : 'Round-ups paused', { icon: '🪙' });
  };

  const handleDeposit = async (amtVal?: number) => {
    const depositAmt = amtVal || parseFloat(amount);
    if (!depositAmt || isNaN(depositAmt) || depositAmt <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    setLoading(true);
    try {
      await depositToVault(depositAmt);
      soundFX.playCoin();
      toast.success(`Saved ₹${depositAmt} to Secret Vault! 🔒`, { icon: '🐷' });
      setAmount('');
      setMode('view');
      await loadData();
      onSuccess?.();
    } catch (e: any) {
      toast.error(e.message || 'Deposit failed');
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async () => {
    const withdrawAmt = parseFloat(amount);
    if (!withdrawAmt || isNaN(withdrawAmt) || withdrawAmt <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (withdrawAmt > vaultData.vault_balance) {
      toast.error('Amount exceeds available vault balance');
      return;
    }

    setLoading(true);
    try {
      await withdrawFromVault(withdrawAmt);
      soundFX.playSuccess();
      toast.success(`Moved ₹${withdrawAmt} back to your active budget! 💸`, { icon: '✅' });
      setAmount('');
      setMode('view');
      await loadData();
      onSuccess?.();
    } catch (e: any) {
      toast.error(e.message || 'Withdrawal failed');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/80 backdrop-blur-md"
          onClick={onClose}
        />

        <motion.div
          initial={{ scale: 0.92, opacity: 0, y: 24 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.92, opacity: 0, y: 24 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="w-full max-w-sm glass p-6 rounded-3xl border border-yellow-500/30 shadow-[0_0_40px_rgba(234,179,8,0.15)] relative z-10 text-center overflow-hidden max-h-[90vh] overflow-y-auto"
        >
          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-white/50 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Header Icon */}
          <div className="w-14 h-14 bg-gradient-to-tr from-yellow-500/20 to-amber-500/30 border border-yellow-500/40 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-yellow-500/10">
            <Lock className="w-7 h-7 text-yellow-400" />
          </div>

          <h2 className="text-xl font-display font-bold text-white mb-1 flex items-center justify-center gap-1.5">
            Secret Piggy Bank <Sparkles className="w-4 h-4 text-yellow-400" />
          </h2>
          <p className="text-xs text-text-secondary mb-4">
            Automatically saves spare change without you noticing.
          </p>

          {/* Balance Card */}
          <div className="bg-black/40 border border-yellow-500/20 rounded-2xl p-4 mb-4 relative overflow-hidden">
            <div className="flex items-center justify-between text-xs text-yellow-400/80 mb-1 font-medium">
              <span>Total Secret Savings</span>
              <button
                type="button"
                onClick={() => {
                  setIsRevealed(!isRevealed);
                  soundFX.playCoin();
                }}
                className="flex items-center gap-1 text-[11px] hover:text-yellow-300 transition-colors cursor-pointer"
              >
                {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                <span>{isRevealed ? 'Hide' : 'Reveal'}</span>
              </button>
            </div>

            <div className="text-3xl font-display font-extrabold text-yellow-400 py-1 tracking-wide">
              {isRevealed ? formatCurrency(vaultData.vault_balance) : '₹ • • • •'}
            </div>

            <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-white/5 text-[11px]">
              <div className="text-left">
                <span className="text-text-secondary block">This Month</span>
                <span className="font-semibold text-white/90">
                  {isRevealed ? formatCurrency(vaultData.active_stash) : '***'}
                </span>
              </div>
              <div className="text-right">
                <span className="text-text-secondary block">Protected Total</span>
                <span className="font-semibold text-white/90">
                  {isRevealed ? formatCurrency(vaultData.permanent_balance) : '***'}
                </span>
              </div>
            </div>
          </div>

          {/* Navigation / Mode Switcher */}
          {mode === 'view' ? (
            <div className="space-y-3">
              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setMode('deposit')}
                  className="py-3 px-3 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/40 rounded-xl font-semibold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-md"
                >
                  <Plus className="w-4 h-4" />
                  <span>Save Extra</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMode('withdraw')}
                  disabled={vaultData.vault_balance <= 0}
                  className="py-3 px-3 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border border-blue-500/40 rounded-xl font-semibold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer disabled:opacity-40 disabled:pointer-events-none shadow-md"
                >
                  <ArrowDownLeft className="w-4 h-4" />
                  <span>Move to Budget</span>
                </button>
              </div>

              {/* Quick Deposit Pill Shortcuts */}
              <div className="flex items-center justify-center gap-2 pt-0.5">
                <span className="text-[10px] text-text-secondary font-medium">Quick Save:</span>
                {[50, 100, 200].map((quickAmt) => (
                  <button
                    key={quickAmt}
                    type="button"
                    onClick={() => handleDeposit(quickAmt)}
                    className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-white/80 hover:text-white border border-white/10 text-[10px] font-bold transition-all active:scale-95 cursor-pointer"
                  >
                    +₹{quickAmt}
                  </button>
                ))}
              </div>

              {/* Automatic Secret Features Toggle Card */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-3 text-left space-y-2 mt-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-base">🤫</span>
                    <div>
                      <p className="text-xs font-semibold text-white">Daily Secret Stash</p>
                      <p className="text-[10px] text-text-secondary">Saves ₹10–₹35 once a day secretly</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleToggleAutoSave}
                    className={`w-9 h-5 rounded-full transition-colors relative cursor-pointer ${
                      autoSaveActive ? 'bg-yellow-500' : 'bg-white/20'
                    }`}
                  >
                    <div
                      className={`w-3.5 h-3.5 bg-white rounded-full absolute top-0.75 transition-transform ${
                        autoSaveActive ? 'right-0.75' : 'left-0.75'
                      }`}
                    />
                  </button>
                </div>

                <div className="border-t border-white/5 pt-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-base">🪙</span>
                    <div>
                      <p className="text-xs font-semibold text-white">Spare Change Round-Up</p>
                      <p className="text-[10px] text-text-secondary">Rounds purchases to nearest ₹10</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleToggleRoundUp}
                    className={`w-9 h-5 rounded-full transition-colors relative cursor-pointer ${
                      roundUpActive ? 'bg-yellow-500' : 'bg-white/20'
                    }`}
                  >
                    <div
                      className={`w-3.5 h-3.5 bg-white rounded-full absolute top-0.75 transition-transform ${
                        roundUpActive ? 'right-0.75' : 'left-0.75'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* View History Button */}
              {vaultData.recent_deposits.length > 0 && (
                <button
                  type="button"
                  onClick={() => setMode('history')}
                  className="w-full py-2 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <History className="w-3.5 h-3.5 text-yellow-400" />
                  <span>View Secret Savings History ({vaultData.recent_deposits.length})</span>
                </button>
              )}

              {/* Simple explanation note */}
              <p className="text-[11px] text-text-secondary/70 leading-relaxed pt-1">
                🔒 100% private: Secret savings are excluded from your main expense list so friends checking your phone won&apos;t see them.
              </p>
            </div>
          ) : mode === 'history' ? (
            <div className="space-y-3 text-left">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-yellow-400 flex items-center gap-1">
                  <History className="w-3.5 h-3.5" /> Secret Stash History
                </span>
                <button
                  type="button"
                  onClick={() => setMode('view')}
                  className="text-[11px] text-white/60 hover:text-white cursor-pointer"
                >
                  Back
                </button>
              </div>

              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {vaultData.recent_deposits.map((item, idx) => {
                  const isWithdrawal = item.merchant_clean?.includes('Withdrawal') || item.category === 'Income';
                  const isRoundUp = item.source === 'auto_roundup' || item.merchant_clean?.includes('Spare Change');
                  const isStealth = item.source === 'auto_stealth' || item.merchant_clean?.includes('Secret Stash');

                  return (
                    <div
                      key={item.id || idx}
                      className="flex items-center justify-between p-2 rounded-xl bg-white/5 border border-white/5 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span>{isWithdrawal ? '💸' : isRoundUp ? '🪙' : isStealth ? '🤫' : '🐷'}</span>
                        <div>
                          <p className="font-medium text-white/90 text-[11px]">
                            {item.merchant_clean || item.merchant_raw || 'Secret Savings'}
                          </p>
                          <p className="text-[10px] text-text-secondary">{item.date}</p>
                        </div>
                      </div>
                      <span className={`font-semibold text-xs ${isWithdrawal ? 'text-blue-400' : 'text-emerald-400'}`}>
                        {isWithdrawal ? '-' : '+'}{formatCurrency(item.amount)}
                      </span>
                    </div>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => setMode('view')}
                className="w-full py-2 bg-white/5 hover:bg-white/10 text-white/70 rounded-xl text-xs font-semibold transition-colors cursor-pointer text-center"
              >
                Back to Secret Vault
              </button>
            </div>
          ) : mode === 'deposit' ? (
            <div className="space-y-3">
              <p className="text-xs font-semibold text-emerald-400 text-left">
                Add Extra Money to Secret Vault
              </p>
              <input
                type="number"
                min="1"
                step="1"
                autoFocus
                placeholder="₹ Amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-black/40 border border-emerald-500/40 rounded-xl px-4 py-3 text-center text-2xl font-bold font-display text-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
              <div className="flex gap-2">
                <Button
                  onClick={() => handleDeposit()}
                  isLoading={loading}
                  className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-2.5 text-xs rounded-xl"
                >
                  Confirm Deposit
                </Button>
                <button
                  type="button"
                  onClick={() => { setMode('view'); setAmount(''); }}
                  className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white/70 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                >
                  Back
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs font-semibold text-blue-400 text-left">
                Move Money to Active Budget
              </p>
              <input
                type="number"
                min="1"
                max={vaultData.vault_balance}
                step="1"
                autoFocus
                placeholder={`Max: ₹${vaultData.vault_balance}`}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-black/40 border border-blue-500/40 rounded-xl px-4 py-3 text-center text-2xl font-bold font-display text-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              />
              <div className="flex gap-2">
                <Button
                  onClick={handleWithdraw}
                  isLoading={loading}
                  className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2.5 text-xs rounded-xl"
                >
                  Move to Budget
                </Button>
                <button
                  type="button"
                  onClick={() => { setMode('view'); setAmount(''); }}
                  className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white/70 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                >
                  Back
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
