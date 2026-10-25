'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Zap, User, Clock, ArrowRight, Check, Trash2, ShieldCheck, Sparkles, QrCode } from 'lucide-react';
import { UpiQrScannerModal } from '@/components/UpiQrScannerModal';
import { 
  POPULAR_UPI_APPS, 
  COMMON_UPI_HANDLES, 
  getSavedPayees, 
  savePayee, 
  deletePayee, 
  getDefaultUpiApp, 
  setDefaultUpiApp, 
  launchUpiPayment, 
  validateVpa,
  type UpiPayee 
} from '@/lib/upi';
import { db, generateId, todayISO } from '@/lib/db';
import { formatCurrency } from '@/lib/utils';
import toast from 'react-hot-toast';

const CATEGORIES = [
  'Food & Dining',
  'Groceries',
  'Transportation',
  'Shopping',
  'Entertainment',
  'Bills & Utilities',
  'Personal Care',
  'Others'
];

const QUICK_AMOUNTS = [20, 50, 100, 200, 500, 1000];

interface UpiQuickPayModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  prefillVpa?: string;
  prefillName?: string;
  prefillAmount?: number;
  prefillNote?: string;
}

export function UpiQuickPayModal({
  isOpen,
  onClose,
  onSuccess,
  prefillVpa = '',
  prefillName = '',
  prefillAmount,
  prefillNote = ''
}: UpiQuickPayModalProps) {
  const [vpa, setVpa] = useState(prefillVpa);
  const [name, setName] = useState(prefillName);
  const [amount, setAmount] = useState(prefillAmount ? String(prefillAmount) : '');
  const [note, setNote] = useState(prefillNote);
  const [category, setCategory] = useState('Food & Dining');
  const [savedPayees, setSavedPayees] = useState<UpiPayee[]>([]);
  const [selectedApp, setSelectedApp] = useState('any');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSavedPayees(getSavedPayees());
      setSelectedApp(getDefaultUpiApp());
      if (prefillVpa) setVpa(prefillVpa);
      if (prefillName) setName(prefillName);
      if (prefillAmount) setAmount(String(prefillAmount));
      if (prefillNote) setNote(prefillNote);
    }
  }, [isOpen, prefillVpa, prefillName, prefillAmount, prefillNote]);

  const handleSelectApp = (appId: string) => {
    setSelectedApp(appId);
    setDefaultUpiApp(appId);
    const appName = POPULAR_UPI_APPS.find(a => a.id === appId)?.name;
    toast.success(`Default UPI app set to ${appName}`, { duration: 1800, icon: '⚡' });
  };

  const handleSelectPayee = (payee: UpiPayee) => {
    setVpa(payee.vpa);
    setName(payee.name);
    if (payee.category) setCategory(payee.category);
    if (payee.last_amount && !amount) setAmount(String(payee.last_amount));
  };

  const handleDeletePayee = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    deletePayee(id);
    setSavedPayees(getSavedPayees());
    toast.success('Payee removed');
  };

  const handleAppendHandle = (handle: string) => {
    const atIndex = vpa.indexOf('@');
    if (atIndex !== -1) {
      setVpa(vpa.substring(0, atIndex) + handle);
    } else {
      setVpa(vpa + handle);
    }
  };

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanVpa = vpa.trim().toLowerCase();
    const cleanName = (name.trim() || cleanVpa.split('@')[0] || 'Merchant');
    const parsedAmt = parseFloat(amount);

    if (!cleanVpa) {
      toast.error('Please enter a UPI ID (VPA)');
      return;
    }
    if (!validateVpa(cleanVpa)) {
      toast.error('Invalid UPI format (e.g. mobile@paytm or name@okaxis)');
      return;
    }
    if (isNaN(parsedAmt) || parsedAmt <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Save Payee for future quick access
      savePayee({
        name: cleanName,
        vpa: cleanVpa,
        last_amount: parsedAmt,
        category
      });

      // 2. Auto-record transaction in local IndexedDB
      const txId = generateId();
      await db.transactions.add({
        id: txId,
        date: todayISO(),
        amount: parsedAmt,
        category,
        merchant: cleanName,
        merchant_clean: cleanName,
        source: 'UPI Quick Pay',
        type: 'debit',
        notes: note || `UPI to ${cleanVpa}`
      });

      // 3. Launch native UPI app
      await launchUpiPayment({
        pa: cleanVpa,
        pn: cleanName,
        am: parsedAmt,
        tn: note || `Payment to ${cleanName}`,
        category,
        appId: selectedApp
      });

      toast.success(
        (t) => (
          <div className="flex items-center justify-between space-x-2">
            <span>Logged ₹{parsedAmt} to {category}!</span>
            <button
              onClick={async () => {
                await db.transactions.delete(txId);
                toast.dismiss(t.id);
                toast.success('Transaction removed');
                onSuccess?.();
              }}
              className="text-xs bg-red-500/20 text-red-400 px-2 py-1 rounded hover:bg-red-500/30 font-bold"
            >
              Undo
            </button>
          </div>
        ),
        { duration: 5000, icon: '⚡' }
      );

      onSuccess?.();
      onClose();
    } catch (err: any) {
      toast.error('Failed to initiate UPI payment');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />

          {/* Modal Card */}
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="w-full sm:max-w-md bg-[#161f2e] border border-white/10 p-6 rounded-t-3xl sm:rounded-3xl shadow-2xl relative z-10 max-h-[90vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="flex justify-between items-center pb-4 border-b border-white/5 mb-5">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
                  <Zap className="w-5 h-5 fill-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-1.5">
                    UPI Quick Pay <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/20">1-Tap Intent</span>
                  </h2>
                  <p className="text-xs text-text-secondary">Instant app launch + zero-effort auto-log</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-text-secondary hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Default App Picker Selector */}
            <div className="mb-5 bg-white/5 border border-white/10 p-3 rounded-2xl">
              <div className="flex justify-between items-center mb-2.5">
                <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                  Default UPI App
                </span>
                <span className="text-[11px] text-emerald-400 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> Skips app chooser
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 max-h-36 overflow-y-auto pr-0.5 scrollbar-thin">
                {POPULAR_UPI_APPS.map((app) => {
                  const isSelected = selectedApp === app.id;
                  return (
                    <button
                      key={app.id}
                      type="button"
                      onClick={() => handleSelectApp(app.id)}
                      className={`py-2 px-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all border ${
                        isSelected
                          ? 'bg-emerald-500/20 border-emerald-500/60 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.25)]'
                          : 'bg-black/30 border-white/5 text-text-secondary hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <span>{app.iconText}</span>
                      <span className="truncate">{app.name.split(' ')[0]}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Saved Recent Payees Chips */}
            {savedPayees.length > 0 && (
              <div className="mb-5">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" /> Recent Payees
                  </span>
                  <span className="text-[10px] text-text-secondary">Tap to autofill</span>
                </div>
                <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-none">
                  {savedPayees.map((p) => {
                    const isSelected = vpa.toLowerCase() === p.vpa.toLowerCase();
                    return (
                      <div
                        key={p.id}
                        onClick={() => handleSelectPayee(p)}
                        className={`group shrink-0 p-2.5 rounded-xl border flex items-center space-x-2.5 cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-emerald-500/20 border-emerald-500/50 text-white'
                            : 'bg-black/20 border-white/5 text-text-secondary hover:bg-white/5 hover:text-white'
                        }`}
                      >
                        <div
                          className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs text-white shadow-sm"
                          style={{ backgroundColor: p.avatar_color || '#10b981' }}
                        >
                          {p.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="text-left">
                          <p className="text-xs font-bold text-white max-w-[90px] truncate">{p.name}</p>
                          <p className="text-[10px] text-text-secondary max-w-[90px] truncate">{p.vpa}</p>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => handleDeletePayee(e, p.id)}
                          className="opacity-0 group-hover:opacity-100 hover:text-red-400 p-1 transition-opacity"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Payment Form */}
            <form onSubmit={handlePay} className="space-y-4">
              {/* UPI ID Input & Standee QR Scanner */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                    UPI ID (VPA)
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsScannerOpen(true)}
                    className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[11px] font-bold flex items-center gap-1.5 hover:bg-emerald-500/30 transition-all shadow-sm active:scale-95 cursor-pointer"
                  >
                    <QrCode className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Scan Standee QR</span>
                  </button>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="e.g. 9876543210@paytm or rahul@okaxis"
                    value={vpa}
                    onChange={(e) => setVpa(e.target.value)}
                    className="w-full bg-black/30 border border-white/10 rounded-xl px-3.5 py-3 text-sm text-white placeholder-text-secondary focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                  {validateVpa(vpa) && (
                    <span className="absolute right-3 top-3 text-emerald-400 text-xs flex items-center gap-1 font-semibold">
                      <Check className="w-4 h-4" /> Valid
                    </span>
                  )}
                </div>

                {/* Quick Handle Chips */}
                <div className="flex flex-wrap gap-1.5 mt-2 max-h-16 overflow-y-auto scrollbar-none">
                  {COMMON_UPI_HANDLES.map((handle) => (
                    <button
                      key={handle}
                      type="button"
                      onClick={() => handleAppendHandle(handle)}
                      className="px-2 py-0.5 rounded-lg bg-white/5 hover:bg-emerald-500/20 hover:text-emerald-300 text-[11px] text-text-secondary border border-white/5 transition-colors"
                    >
                      {handle}
                    </button>
                  ))}
                </div>
              </div>

              {/* Payee Name & Category */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
                    Payee / Shop Name
                  </label>
                  <input
                    type="text"
                    placeholder="Chai Point / Friend"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-black/30 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-text-secondary focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-black/30 border border-white/10 rounded-xl px-2.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 appearance-none cursor-pointer"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c} className="bg-[#1f2937] text-white">
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Amount Input & Quick Chips */}
              <div>
                <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
                  Amount (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-3 text-lg font-bold text-white/50">₹</span>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full bg-black/30 border border-white/10 rounded-xl pl-8 pr-3 py-3 text-xl font-bold text-white placeholder-text-secondary focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="flex flex-wrap gap-1.5 mt-2">
                  {QUICK_AMOUNTS.map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setAmount(String(amt))}
                      className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-emerald-500/20 hover:text-emerald-300 text-xs font-medium text-text-secondary border border-white/5 transition-colors"
                    >
                      +₹{amt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Note / Description */}
              <div>
                <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
                  Note (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Samosa & tea with Rahul"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full bg-black/30 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-text-secondary focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Action Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-2 py-3.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold rounded-2xl shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
              >
                <Zap className="w-4 h-4 fill-white" />
                <span>Pay via UPI & Log {amount ? `₹${amount}` : ''}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <p className="text-[11px] text-center text-text-secondary">
                Opens your bank UPI app with recipient & amount pre-filled.
              </p>
            </form>
          </motion.div>

          {/* Standee QR Scanner */}
          <UpiQrScannerModal
            isOpen={isScannerOpen}
            onClose={() => setIsScannerOpen(false)}
            onScanSuccess={(data) => {
              setVpa(data.pa);
              if (data.pn) setName(data.pn);
              if (data.am) setAmount(String(data.am));
              if (data.tn) setNote(data.tn);
            }}
          />
        </div>
      )}
    </AnimatePresence>
  );
}
