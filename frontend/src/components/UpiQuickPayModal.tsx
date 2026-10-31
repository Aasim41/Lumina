'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Zap, Check, ArrowRight, ShieldCheck, QrCode, Coffee, ChevronDown, CheckCircle2, Store, Edit2 } from 'lucide-react';
import { UpiQrScannerModal } from '@/components/UpiQrScannerModal';
import { 
  POPULAR_UPI_APPS, 
  COMMON_UPI_HANDLES, 
  getSavedPayees, 
  savePayee, 
  getDefaultUpiApp, 
  setDefaultUpiApp, 
  launchUpiPayment, 
  validateVpa,
  type UpiPayee 
} from '@/lib/upi';
import { db, generateId, todayISO, toPaise, nowISO } from '@/lib/db';
import { soundFX } from '@/lib/soundFx';
import toast from 'react-hot-toast';

const CATEGORIES = [
  'Chai & Snacks',
  'Food & Dining',
  'Shopping',
  'Transport',
  'Utilities',
  'Entertainment',
  'Housing',
  'Health & Fitness',
  'Savings',
  'Others'
];

const QUICK_AMOUNTS = [20, 50, 100, 200, 500];

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
  const [category, setCategory] = useState('Chai & Snacks');
  const [selectedApp, setSelectedApp] = useState('phonepe');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isManualEdit, setIsManualEdit] = useState(false);
  const [showAllApps, setShowAllApps] = useState(false);
  const [savedPayees, setSavedPayees] = useState<UpiPayee[]>([]);
  const [extraParams, setExtraParams] = useState<Record<string, string>>({});
  const [rawQrUri, setRawQrUri] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      setSavedPayees(getSavedPayees());
      setSelectedApp(getDefaultUpiApp());
      if (prefillVpa) {
        setVpa(prefillVpa);
        setIsManualEdit(false);
      } else {
        setIsManualEdit(true);
      }
      if (prefillName) setName(prefillName);
      if (prefillAmount) setAmount(String(prefillAmount));
      if (prefillNote) setNote(prefillNote);
    }
  }, [isOpen, prefillVpa, prefillName, prefillAmount, prefillNote]);

  const handleSelectApp = (appId: string) => {
    setSelectedApp(appId);
    setDefaultUpiApp(appId);
    const app = POPULAR_UPI_APPS.find(a => a.id === appId);
    if (app) {
      toast.success(`Will open ${app.name} directly`, { icon: '⚡', duration: 1500 });
    }
  };

  const handleSelectRecentPayee = (payee: UpiPayee) => {
    setVpa(payee.vpa);
    setName(payee.name);
    setExtraParams({});
    setRawQrUri('');
    if (payee.category) setCategory(payee.category);
    if (payee.last_amount && !amount) setAmount(String(payee.last_amount));
    setIsManualEdit(false);
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
    const cleanVpa = vpa.trim();
    const cleanName = (name.trim() || cleanVpa.split('@')[0] || 'Merchant');
    const parsedAmt = parseFloat(amount);

    if (!cleanVpa) {
      toast.error('Please enter recipient UPI ID');
      return;
    }
    if (!validateVpa(cleanVpa)) {
      toast.error('Invalid UPI ID format (e.g. name@okaxis or 9876543210@paytm)');
      return;
    }
    if (isNaN(parsedAmt) || parsedAmt <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Save Payee for 1-tap autofill in future
      savePayee({
        name: cleanName,
        vpa: cleanVpa,
        last_amount: parsedAmt,
        category
      });

      // 2. Record transaction with 'pending' status until verified on return or via Bank SMS
      const txId = generateId();
      await db.transactions.add({
        id: txId,
        date: todayISO(),
        amount: parsedAmt,
        amount_paise: toPaise(parsedAmt),
        category,
        merchant_raw: cleanName,
        merchant_clean: cleanName,
        source: 'UPI Quick Pay',
        type: 'debit',
        status: 'pending',
        created_at: nowISO(),
      });

      // Save pending verification flag for when user returns from UPI app
      localStorage.setItem('lumina_pending_payment', JSON.stringify({
        id: txId,
        merchant: cleanName,
        amount: parsedAmt,
        time: Date.now()
      }));

      // 3. Launch selected UPI app directly (bypasses system chooser)
      await launchUpiPayment({
        pa: cleanVpa,
        pn: cleanName,
        am: parsedAmt,
        tn: note || `Payment to ${cleanName}`,
        category,
        appId: selectedApp,
        extraParams,
        rawQrUri: (rawQrUri && rawQrUri.includes(`pa=${cleanVpa}`) && rawQrUri.includes(`am=${parsedAmt}`)) ? rawQrUri : undefined,
      });

      soundFX.playSuccess();
      toast.success(`Opening ${selectedApp} for ₹${parsedAmt}...`, { icon: '⚡' });
      onSuccess?.();
      onClose();
    } catch {
      toast.error('Failed to launch UPI payment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentAppConfig = POPULAR_UPI_APPS.find(a => a.id === selectedApp) || POPULAR_UPI_APPS[0];
  const primaryApps = POPULAR_UPI_APPS.slice(0, 4); // PhonePe, GPay, Paytm, CRED

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center p-0 sm:p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
          />

          {/* Clean, High-Contrast Payment Sheet */}
          <motion.div
            initial={{ opacity: 0, y: 150 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 150 }}
            transition={{ type: 'spring', damping: 28, stiffness: 350 }}
            className="w-full sm:max-w-md bg-[#0F172A] border-t sm:border border-white/10 p-5 sm:p-6 rounded-t-[2rem] sm:rounded-3xl shadow-2xl relative z-10 max-h-[92vh] overflow-y-auto"
          >
            {/* Top Bar */}
            <div className="flex justify-between items-center pb-3 border-b border-white/10 mb-4">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#10b981]" />
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">UPI Quick Pay</h2>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handlePay} className="space-y-4">
              {/* 1. PAYEE CARD (Clean, Bold & Readable) */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5">
                {!isManualEdit && vpa ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-500/30 to-teal-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-base shrink-0">
                        {name ? name.charAt(0).toUpperCase() : <Store className="w-5 h-5" />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] text-white/50 uppercase tracking-wider font-semibold">Paying To</p>
                        <h3 className="font-bold text-white text-base leading-tight truncate">
                          {name || vpa.split('@')[0]}
                        </h3>
                        <p className="text-xs text-emerald-400/90 font-mono truncate flex items-center gap-1 mt-0.5">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                          <span>{vpa}</span>
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsManualEdit(true)}
                      className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-white/80 hover:text-white transition-colors flex items-center gap-1 shrink-0"
                    >
                      <Edit2 className="w-3 h-3" />
                      <span>Edit</span>
                    </button>
                  </div>
                ) : (
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="text-[11px] font-bold text-white/60 uppercase tracking-wider">
                        Recipient UPI ID or Number
                      </label>
                      <button
                        type="button"
                        onClick={() => setIsScannerOpen(true)}
                        className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 active:scale-95 transition-all"
                      >
                        <QrCode className="w-3.5 h-3.5" />
                        <span>Scan Standee</span>
                      </button>
                    </div>

                    <div className="relative">
                      <input
                        type="text"
                        required
                        placeholder="e.g. shop@paytm or 9876543210@okaxis"
                        value={vpa}
                        onChange={(e) => {
                          setVpa(e.target.value);
                          setExtraParams({});
                          setRawQrUri('');
                        }}
                        className="w-full bg-black/40 border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-emerald-500 transition-colors"
                      />
                      {validateVpa(vpa) && (
                        <span className="absolute right-3 top-2.5 text-emerald-400 text-xs font-bold flex items-center gap-1">
                          <Check className="w-4 h-4" />
                        </span>
                      )}
                    </div>

                    {/* Quick Handle Chips (Only if user hasn't typed an '@' yet) */}
                    {!vpa.includes('@') && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {COMMON_UPI_HANDLES.slice(0, 5).map((handle) => (
                          <button
                            key={handle}
                            type="button"
                            onClick={() => handleAppendHandle(handle)}
                            className="px-2 py-0.5 rounded-lg bg-white/5 hover:bg-emerald-500/20 hover:text-emerald-300 text-[11px] font-medium text-white/60 border border-white/10 transition-colors"
                          >
                            {handle}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Recent Payees Shortcut (Compact) */}
                {savedPayees.length > 0 && isManualEdit && (
                  <div className="mt-3 pt-2.5 border-t border-white/10">
                    <p className="text-[10px] uppercase font-bold text-white/40 mb-1.5">Recent Payees</p>
                    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                      {savedPayees.slice(0, 4).map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => handleSelectRecentPayee(p)}
                          className="px-2.5 py-1 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-white/80 shrink-0 flex items-center gap-1.5"
                        >
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.avatar_color || '#10b981' }} />
                          <span className="truncate max-w-[80px]">{p.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* 2. THE HERO: HUGE, EASY-TO-READ AMOUNT */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
                <p className="text-[11px] font-bold text-white/60 uppercase tracking-wider mb-2">
                  Enter Payment Amount
                </p>

                <div className="flex items-center justify-center gap-1 mb-3">
                  <span className="text-3xl font-extrabold text-emerald-400">₹</span>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-48 bg-transparent text-center text-4xl sm:text-5xl font-black text-white placeholder-white/20 focus:outline-none tracking-tight"
                    autoFocus={!prefillAmount}
                  />
                </div>

                {/* Quick Add Pills */}
                <div className="flex justify-center flex-wrap gap-2">
                  {QUICK_AMOUNTS.map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => {
                        soundFX.playCoin();
                        setAmount(String(amt));
                      }}
                      className="px-3 py-1 rounded-xl bg-white/5 hover:bg-emerald-500/20 hover:text-emerald-300 text-xs font-bold text-white/80 border border-white/10 transition-all active:scale-95 cursor-pointer"
                    >
                      +₹{amt}
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. CATEGORY & NOTE (Clean 2-Column Row) */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-white/60 uppercase tracking-wider mb-1">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-emerald-500 appearance-none cursor-pointer"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c} className="bg-[#0F172A] text-white">
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-white/60 uppercase tracking-wider mb-1">
                    Note (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Cutting chai"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-white/30 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* 4. PREFERRED UPI APP (Clean 1-Tap Row - Bypasses System Chooser) */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-3">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[11px] font-bold text-white/60 uppercase tracking-wider">
                    Paying With
                  </span>
                  <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" /> Direct Launch (No Popup)
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-1.5">
                  {(showAllApps ? POPULAR_UPI_APPS : primaryApps).map((app) => {
                    const isSelected = selectedApp === app.id;
                    return (
                      <button
                        key={app.id}
                        type="button"
                        onClick={() => handleSelectApp(app.id)}
                        className={`py-2 px-1.5 rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-1 transition-all border ${
                          isSelected
                            ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.25)] scale-[1.02]'
                            : 'bg-black/30 border-white/5 text-white/60 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        <span className="text-sm">{app.iconText}</span>
                        <span className="text-[10px] truncate max-w-full">{app.name.split(' ')[0]}</span>
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={() => setShowAllApps(!showAllApps)}
                  className="w-full mt-2 text-[10px] font-bold text-white/50 hover:text-white flex items-center justify-center gap-1 pt-1"
                >
                  <span>{showAllApps ? 'Show Less' : 'More Apps (Navi, BHIM, CRED, MobiKwik)'}</span>
                  <ChevronDown className={`w-3 h-3 transition-transform ${showAllApps ? 'rotate-180' : ''}`} />
                </button>
              </div>

              {/* 5. PRIMARY ACTION BUTTON */}
              <button
                type="submit"
                disabled={isSubmitting || !vpa}
                className="w-full py-4 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-400 text-black font-black text-sm rounded-2xl shadow-[0_0_30px_rgba(16,185,129,0.35)] flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
              >
                <Zap className="w-4 h-4 fill-black" />
                <span>Pay {amount ? `₹${amount}` : ''} via {currentAppConfig.name}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
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
              if (data.extraParams) setExtraParams(data.extraParams);
              if (data.raw) setRawQrUri(data.raw);
              setIsManualEdit(false);
            }}
          />
        </div>
      )}
    </AnimatePresence>
  );
}
