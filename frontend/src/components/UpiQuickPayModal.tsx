'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Zap, Check, ArrowRight, ShieldCheck, QrCode, Coffee, ChevronDown, CheckCircle2, Store, Edit2, Image as ImageIcon, Copy } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
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
  getInstalledUpiAppsList,
  parseUpiUri,
  openUpiAppDirect,
  type UpiPayee 
} from '@/lib/upi';
import { decodeQrFromImageSrc } from '@/lib/qrDecoder';
import { db, generateId, todayISO, toPaise, nowISO } from '@/lib/db';
import { invalidateTransactionCache } from '@/lib/api';
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
  prefillExtraParams?: Record<string, string>;
  prefillRawQrUri?: string;
}

export function UpiQuickPayModal({
  isOpen,
  onClose,
  onSuccess,
  prefillVpa = '',
  prefillName = '',
  prefillAmount,
  prefillNote = '',
  prefillExtraParams,
  prefillRawQrUri = '',
}: UpiQuickPayModalProps) {
  const [vpa, setVpa] = useState(prefillVpa);
  const [name, setName] = useState(prefillName);
  const [amount, setAmount] = useState(prefillAmount ? String(prefillAmount) : '');
  const [note, setNote] = useState(prefillNote);
  const [category, setCategory] = useState('Chai & Snacks');
  const [selectedApp, setSelectedApp] = useState('phonepe');
  const [installedPkgs, setInstalledPkgs] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isManualEdit, setIsManualEdit] = useState(false);
  const [showAllApps, setShowAllApps] = useState(false);
  const [savedPayees, setSavedPayees] = useState<UpiPayee[]>([]);
  const [extraParams, setExtraParams] = useState<Record<string, string>>(prefillExtraParams || {});
  const [rawQrUri, setRawQrUri] = useState<string>(prefillRawQrUri || '');
  const [showQr, setShowQr] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const applyParsedUpiData = (parsed: ReturnType<typeof parseUpiUri>) => {
    if (!parsed) return;
    soundFX.playSuccess();
    setVpa(parsed.pa);
    if (parsed.pn) setName(parsed.pn);
    if (parsed.am) setAmount(String(parsed.am));
    if (parsed.tn) setNote(parsed.tn);
    if (parsed.extraParams) setExtraParams(parsed.extraParams);
    if (parsed.raw) setRawQrUri(parsed.raw);
    setIsManualEdit(false);
    toast.success(`QR detected: ${parsed.pn || parsed.pa}`, { icon: '⚡', duration: 2500 });
  };

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const src = event.target?.result as string;
      if (!src) return;

      const toastId = toast.loading('Scanning QR from image...');
      try {
        const qrData = await decodeQrFromImageSrc(src);
        if (qrData) {
          const parsed = parseUpiUri(qrData);
          if (parsed) {
            toast.dismiss(toastId);
            applyParsedUpiData(parsed);
            return;
          }
        }
        toast.error('No UPI QR code found in selected image', { id: toastId });
      } catch (err) {
        toast.error('Could not process image', { id: toastId });
      }
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const openGalleryPicker = async () => {
    try {
      const { Capacitor } = await import('@capacitor/core');
      if (Capacitor.isNativePlatform()) {
        const { Camera: CapCamera, CameraResultType, CameraSource } = await import('@capacitor/camera');
        const photo = await CapCamera.getPhoto({
          quality: 95,
          resultType: CameraResultType.DataUrl,
          source: CameraSource.Photos,
          width: 2048,
          height: 2048,
        });

        if (photo?.dataUrl) {
          const toastId = toast.loading('Scanning QR from screenshot...');
          const qrData = await decodeQrFromImageSrc(photo.dataUrl);
          if (qrData) {
            const parsed = parseUpiUri(qrData);
            if (parsed) {
              toast.dismiss(toastId);
              applyParsedUpiData(parsed);
              return;
            }
          }
          toast.error('No UPI QR detected in screenshot', { id: toastId });
        }
        return;
      }
    } catch (err: any) {
      if (err?.message?.includes('cancelled') || err?.message?.includes('User cancelled')) {
        return;
      }
    }
    fileInputRef.current?.click();
  };

  // Synchronous prop-sync during render: guarantees zero frame lag or blank state on modal open
  const [prevProps, setPrevProps] = useState({ vpa: prefillVpa, amount: prefillAmount, name: prefillName });
  if (prevProps.vpa !== prefillVpa || prevProps.amount !== prefillAmount || prevProps.name !== prefillName) {
    setPrevProps({ vpa: prefillVpa, amount: prefillAmount, name: prefillName });
    if (prefillVpa) {
      setVpa(prefillVpa);
      setIsManualEdit(false);
    }
    if (prefillName) setName(prefillName);
    if (prefillAmount) setAmount(String(prefillAmount));
    if (prefillNote) setNote(prefillNote);
    if (prefillExtraParams) setExtraParams(prefillExtraParams);
    if (prefillRawQrUri) setRawQrUri(prefillRawQrUri);
  }

  useEffect(() => {
    if (isOpen) {
      setSavedPayees(getSavedPayees());

      // Detect installed UPI apps dynamically from Android package manager
      getInstalledUpiAppsList().then((installed) => {
        if (installed && installed.length > 0) {
          setInstalledPkgs(installed);
          const savedDefault = getDefaultUpiApp();
          const savedConfig = POPULAR_UPI_APPS.find(a => a.id === savedDefault);

          if (savedConfig?.packageName && installed.includes(savedConfig.packageName)) {
            setSelectedApp(savedDefault);
          } else {
            // Find first installed popular app on device
            const firstInstalled = POPULAR_UPI_APPS.find(a => a.packageName && installed.includes(a.packageName));
            if (firstInstalled) {
              setSelectedApp(firstInstalled.id);
            } else {
              setSelectedApp('any');
            }
          }
        } else {
          setSelectedApp(getDefaultUpiApp());
        }
      });

      if (prefillVpa) {
        setVpa(prefillVpa);
        setIsManualEdit(false);
      } else {
        setIsManualEdit(true);
      }
      if (prefillName) setName(prefillName);
      if (prefillAmount) setAmount(String(prefillAmount));
      if (prefillNote) setNote(prefillNote);
      if (prefillExtraParams) setExtraParams(prefillExtraParams);
      if (prefillRawQrUri) setRawQrUri(prefillRawQrUri);
    }
  }, [isOpen, prefillVpa, prefillName, prefillAmount, prefillNote, prefillExtraParams, prefillRawQrUri]);

  // Handle Android hardware back button
  useEffect(() => {
    if (!isOpen) return;
    const handleBack = (e: Event) => {
      e.preventDefault();
      onClose();
    };
    window.addEventListener('lumina_modal_back_pressed', handleBack);
    return () => window.removeEventListener('lumina_modal_back_pressed', handleBack);
  }, [isOpen, onClose]);

  const handleSelectApp = (appId: string) => {
    setSelectedApp(appId);
    setDefaultUpiApp(appId);
    const app = POPULAR_UPI_APPS.find(a => a.id === appId);
    if (app) {
      toast.success(`Selected ${app.name}`, { icon: '⚡', duration: 1500 });
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

  // Determine if this is a verified merchant flow (scanned QR standee with mc/tr)
  // vs a personal P2P flow (manually typed UPI ID without merchant credentials).
  // NPCI policy (Oct 2025) blocks third-party app upi://pay intents to personal VPAs.
  // Merchant QR standees with mc+tr work fine via intent.
  // Personal VPAs must use the copy-and-open flow (same as Splitwise, CRED, etc).
  const isMerchantFlow = Boolean(
    rawQrUri && (extraParams?.mc || extraParams?.tr)
  );

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

      const txId = generateId();

      if (isMerchantFlow) {
        // ── MERCHANT QR STANDEE FLOW ──
        // Scanned QR has verified mc + tr → upi://pay intent works reliably
        const launchResult = await launchUpiPayment({
          pa: cleanVpa,
          pn: cleanName,
          am: parsedAmt,
          tn: note || `Payment to ${cleanName}`,
          category,
          appId: selectedApp,
          extraParams,
          rawQrUri: (rawQrUri && rawQrUri.toLowerCase().includes(cleanVpa.toLowerCase())) ? rawQrUri : undefined,
        });

        if (!launchResult || !launchResult.success) {
          toast.error('Could not open UPI app. Choose another app or System Chooser.', { duration: 3000 });
          setIsSubmitting(false);
          return;
        }

        soundFX.playSuccess();
        toast.success(`Opening ${currentAppConfig.name} for ₹${parsedAmt}...`, { icon: '⚡' });
      } else {
        // ── PERSONAL VPA FLOW (Copy & Open) ──
        // NPCI blocks upi://pay intents to personal VPAs from third-party apps.
        // Instead: copy UPI ID + amount info to clipboard → open Google Pay home screen
        // → user pastes in GPay's own "New payment" UI. This is the standard pattern
        // used by Splitwise, CRED, and every major expense tracker.
        const clipboardText = `${cleanVpa}`;
        if (typeof navigator !== 'undefined' && navigator.clipboard) {
          try {
            await navigator.clipboard.writeText(clipboardText);
          } catch {}
        }

        const appConfig = POPULAR_UPI_APPS.find(a => a.id === selectedApp) || POPULAR_UPI_APPS[0];
        const targetPkg = (appConfig && appConfig.id !== 'any' && appConfig.packageName)
          ? appConfig.packageName
          : 'com.google.android.apps.nbu.paisa.user';

        // Open the UPI app directly to its home screen
        await openUpiAppDirect(targetPkg);

        soundFX.playSuccess();
        toast.success(
          `Copied "${cleanVpa}" — paste in ${appConfig.name} to pay ₹${parsedAmt}`,
          { icon: '📋', duration: 4000 }
        );
      }

      // Record transaction in Dexie in background without blocking
      db.transactions.add({
        id: txId,
        date: todayISO(),
        amount: parsedAmt,
        amount_paise: toPaise(parsedAmt),
        currency: 'INR',
        category,
        merchant_raw: cleanName,
        merchant_clean: cleanName,
        source: 'UPI Quick Pay',
        type: 'debit',
        status: 'confirmed',
        created_at: nowISO(),
      }).then(() => {
        invalidateTransactionCache();
        if (typeof window !== 'undefined') {
          localStorage.removeItem('lumina_transactions');
          localStorage.removeItem('lumina_summary');
          localStorage.removeItem('lumina_categories');
          localStorage.removeItem('lumina_trends');
          window.dispatchEvent(new Event('lumina_refresh_data'));
        }
      }).catch(err => console.warn('Dexie background write warning:', err));

      onSuccess?.();
      onClose();

    } catch (err: any) {
      toast.error(err?.message || 'Failed to launch UPI payment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyAndOpen = async () => {
    const cleanVpa = vpa.trim();
    if (!cleanVpa) {
      toast.error('Please enter recipient UPI ID');
      return;
    }
    const cleanName = (name.trim() || cleanVpa.split('@')[0] || 'Merchant');
    const parsedAmt = parseFloat(amount) || 0;

    // 1. Copy VPA to system clipboard
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(cleanVpa);
      } catch {}
    }

    soundFX.playSuccess();
    const appConfig = POPULAR_UPI_APPS.find(a => a.id === selectedApp) || POPULAR_UPI_APPS[0];
    const targetPkg = (appConfig && appConfig.id !== 'any' && appConfig.packageName) 
      ? appConfig.packageName 
      : 'com.google.android.apps.nbu.paisa.user';

    toast.success(`Copied "${cleanVpa}"! Opening ${appConfig.name}...`, { icon: '📋', duration: 3000 });

    // 2. Open UPI app directly to home screen
    await openUpiAppDirect(targetPkg);

    // 3. Save payee
    savePayee({
      name: cleanName,
      vpa: cleanVpa,
      last_amount: parsedAmt > 0 ? parsedAmt : undefined,
      category
    });

    // 4. Record transaction in Dexie if amount > 0
    if (parsedAmt > 0) {
      db.transactions.add({
        id: generateId(),
        date: todayISO(),
        amount: parsedAmt,
        amount_paise: toPaise(parsedAmt),
        currency: 'INR',
        category,
        merchant_raw: cleanName,
        merchant_clean: cleanName,
        source: 'UPI Quick Pay',
        type: 'debit',
        status: 'confirmed',
        created_at: nowISO(),
      }).then(() => {
        invalidateTransactionCache();
        if (typeof window !== 'undefined') {
          localStorage.removeItem('lumina_transactions');
          localStorage.removeItem('lumina_summary');
          localStorage.removeItem('lumina_categories');
          localStorage.removeItem('lumina_trends');
          window.dispatchEvent(new Event('lumina_refresh_data'));
        }
      }).catch(err => console.warn('Dexie background write warning:', err));
    }

    onSuccess?.();
    onClose();
  };

  const currentAppConfig = POPULAR_UPI_APPS.find(a => a.id === selectedApp) || POPULAR_UPI_APPS[0];

  // Prioritize apps actually installed on user's device
  const displayApps = (showAllApps ? POPULAR_UPI_APPS : POPULAR_UPI_APPS.slice(0, 4)).sort((a, b) => {
    const aInstalled = a.packageName && installedPkgs.includes(a.packageName);
    const bInstalled = b.packageName && installedPkgs.includes(b.packageName);
    if (aInstalled && !bInstalled) return -1;
    if (!aInstalled && bInstalled) return 1;
    return 0;
  });

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

          {/* Clean, High-Contrast Payment Sheet (Snappy 200ms ease-out) */}
          <motion.div
            initial={{ opacity: 0, y: 120 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 120 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
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

            {/* Hidden file input for gallery QR selection fallback */}
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              className="hidden"
              onChange={handleGalleryUpload}
            />

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
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={openGalleryPicker}
                        className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-white/80 hover:text-white transition-colors flex items-center gap-1 shrink-0 active:scale-95 cursor-pointer"
                        title="Upload QR from Gallery"
                      >
                        <ImageIcon className="w-3 h-3 text-emerald-400" />
                        <span>Gallery</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsManualEdit(true)}
                        className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-white/80 hover:text-white transition-colors flex items-center gap-1 shrink-0 active:scale-95 cursor-pointer"
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>Edit</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="text-[11px] font-bold text-white/60 uppercase tracking-wider">
                        Recipient UPI ID or Number
                      </label>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={openGalleryPicker}
                          className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 active:scale-95 transition-all cursor-pointer"
                        >
                          <ImageIcon className="w-3.5 h-3.5" />
                          <span>Gallery</span>
                        </button>
                        <span className="text-white/20">|</span>
                        <button
                          type="button"
                          onClick={() => setIsScannerOpen(true)}
                          className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 active:scale-95 transition-all cursor-pointer"
                        >
                          <QrCode className="w-3.5 h-3.5" />
                          <span>Scan Standee</span>
                        </button>
                      </div>
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
                  {displayApps.map((app) => {
                    const isSelected = selectedApp === app.id;
                    const isInstalled = !app.packageName || installedPkgs.includes(app.packageName);
                    return (
                      <button
                        key={app.id}
                        type="button"
                        onClick={() => handleSelectApp(app.id)}
                        className={`py-2 px-1.5 rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-1 transition-all border relative ${
                          isSelected
                            ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.25)] scale-[1.02]'
                            : 'bg-black/30 border-white/5 text-white/60 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        <span className="text-sm">{app.iconText}</span>
                        <span className="text-[10px] truncate max-w-full">{app.name.split(' ')[0]}</span>
                        {isInstalled && app.id !== 'any' && (
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 absolute top-1.5 right-1.5" title="Installed on phone" />
                        )}
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
                {isMerchantFlow ? (
                  <>
                    <Zap className="w-4 h-4 fill-black" />
                    <span>Pay {amount ? `₹${amount}` : ''} via {currentAppConfig.name}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Pay {amount ? `₹${amount}` : ''} in {currentAppConfig.name}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              {/* Quick Actions (Copy VPA & Show QR) */}
              {vpa && (
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleCopyAndOpen}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-white/80 hover:text-white transition-all flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer"
                    title={`Copy ${vpa} and open ${currentAppConfig.name} directly`}
                  >
                    <Copy className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Copy &amp; Open {currentAppConfig.name.split(' ')[0]}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowQr(!showQr)}
                    className="py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-white/80 hover:text-white transition-all flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer"
                    title="Show payment QR code"
                  >
                    <QrCode className="w-3.5 h-3.5 text-teal-400" />
                    <span>{showQr ? 'Hide QR' : 'Show QR'}</span>
                  </button>
                </div>
              )}

              {/* Expandable Inline QR Code Display */}
              <AnimatePresence>
                {showQr && vpa && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="bg-white rounded-2xl p-4 flex flex-col items-center text-center shadow-xl my-2">
                      <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">
                        Scan to Pay with Any UPI App
                      </p>
                      <div className="p-2 bg-white rounded-xl shadow-inner border border-gray-100">
                        <QRCodeSVG
                          value={`upi://pay?pa=${encodeURIComponent(vpa.trim()).replace(/%40/g, '@')}${name ? `&pn=${encodeURIComponent(name.trim())}` : ''}${amount && !isNaN(Number(amount)) ? `&am=${Number(amount).toFixed(2)}&cu=INR` : ''}${note ? `&tn=${encodeURIComponent(note.trim())}` : ''}`}
                          size={180}
                          level="M"
                        />
                      </div>
                      <p className="text-xs font-bold text-gray-800 mt-2.5 font-mono">{vpa}</p>
                      {amount && (
                        <p className="text-sm font-extrabold text-emerald-600 mt-0.5">₹{amount}</p>
                      )}
                      <p className="text-[10px] text-gray-400 mt-1">
                        Screenshot this to scan in Google Pay / PhonePe
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </form>
          </motion.div>

          {/* Standee QR Scanner */}
          <UpiQrScannerModal
            isOpen={isScannerOpen}
            onClose={() => setIsScannerOpen(false)}
            onScanSuccess={(data) => {
              applyParsedUpiData(data);
              setIsScannerOpen(false);
            }}
          />
        </div>
      )}
    </AnimatePresence>
  );
}
