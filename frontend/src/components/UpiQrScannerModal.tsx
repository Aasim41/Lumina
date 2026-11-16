'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Camera, Image as ImageIcon, Zap, Sparkles, Loader2, CheckCircle2 } from 'lucide-react';
import { parseUpiUri, type ParsedUpiData } from '@/lib/upi';
import { scanQrNative } from '@/lib/nativeQrScanner';
import { decodeQrFromImageSrc } from '@/lib/qrDecoder';
import { soundFX } from '@/lib/soundFx';
import toast from 'react-hot-toast';

interface UpiQrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (data: ParsedUpiData) => void;
  onOpenManualPay?: () => void;
}

export function UpiQrScannerModal({ isOpen, onClose, onScanSuccess, onOpenManualPay }: UpiQrScannerModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [recognizedPayee, setRecognizedPayee] = useState<ParsedUpiData | null>(null);

  // Stable refs to avoid re-render loops in useEffect
  const onCloseRef = useRef(onClose);
  const onScanSuccessRef = useRef(onScanSuccess);
  onCloseRef.current = onClose;
  onScanSuccessRef.current = onScanSuccess;

  const handleScannedResult = useCallback((rawValue: string, autoCloseOnFail: boolean = false) => {
    const parsed = parseUpiUri(rawValue);
    if (parsed) {
      soundFX.playSuccess();
      onScanSuccessRef.current(parsed);
      onCloseRef.current();
      setRecognizedPayee(null);
      setIsScanning(false);
    } else {
      toast.error('Not a valid UPI QR code. Please try again.', { duration: 2500 });
      setIsScanning(false);
    }
  }, []);

  // Primary Scan Trigger — uses ultra-fast Native ML Kit scanner with fallback
  const startScan = useCallback(async (autoLaunched: boolean = false) => {
    setIsScanning(true);
    setRecognizedPayee(null);

    // 1. Try Native ML Kit Camera Scanner (30fps hardware-accelerated decode)
    const nativeResult = await scanQrNative();
    if (nativeResult) {
      if (nativeResult.success && nativeResult.value) {
        handleScannedResult(nativeResult.value);
        return;
      }
      // User cancelled / pressed back from native scanner
      setIsScanning(false);
      if (autoLaunched) {
        // Auto-close the entire modal — don't show the old 3-button fallback screen
        onCloseRef.current();
      }
      return;
    }

    // 2. Fallback to @capacitor/camera (web preview / emulator fallback)
    try {
      const { Camera: CapCamera, CameraResultType, CameraSource } = await import('@capacitor/camera');

      const photo = await CapCamera.getPhoto({
        quality: 92,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera,
        correctOrientation: true,
        width: 2048,
        height: 2048,
      });

      if (!photo.dataUrl) {
        setIsScanning(false);
        return;
      }

      const qrData = await decodeQrFromImageSrc(photo.dataUrl);
      if (qrData) {
        handleScannedResult(qrData);
      } else {
        setIsScanning(false);
        toast.error('No UPI QR detected. Please center the standee code and retry.', { duration: 3000 });
      }
    } catch (err: any) {
      setIsScanning(false);
      if (!err?.message?.includes('cancelled') && !err?.message?.includes('User cancelled')) {
        fileInputRef.current?.click();
      }
    }
  }, [handleScannedResult]);

  // Auto-launch native camera scanner immediately when opened (Google Pay / PhonePe speed)
  // IMPORTANT: No function dependencies — uses refs to avoid infinite re-render loops
  useEffect(() => {
    if (isOpen) {
      // Launch native scanner immediately on modal open
      startScan(true);
    } else {
      setIsScanning(false);
      setRecognizedPayee(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Catch hardware back button gesture
  useEffect(() => {
    if (!isOpen) return;
    const handleBack = (e: Event) => {
      e.preventDefault();
      setIsScanning(false);
      setRecognizedPayee(null);
      onClose();
    };
    window.addEventListener('lumina_modal_back_pressed', handleBack);
    return () => window.removeEventListener('lumina_modal_back_pressed', handleBack);
  }, [isOpen, onClose]);

  // Pick from gallery / screenshot
  const pickFromGallery = useCallback(async () => {
    setIsScanning(true);
    setRecognizedPayee(null);

    try {
      const { Camera: CapCamera, CameraResultType, CameraSource } = await import('@capacitor/camera');

      const photo = await CapCamera.getPhoto({
        quality: 95,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Photos,
        width: 2048,
        height: 2048,
      });

      if (!photo.dataUrl) {
        setIsScanning(false);
        return;
      }

      const qrData = await decodeQrFromImageSrc(photo.dataUrl);
      if (qrData) {
        handleScannedResult(qrData);
      } else {
        setIsScanning(false);
        toast.error('No UPI QR detected in screenshot.', { duration: 3000 });
      }
    } catch (err: any) {
      setIsScanning(false);
      if (!err?.message?.includes('cancelled') && !err?.message?.includes('User cancelled')) {
        fileInputRef.current?.click();
      }
    }
  }, [handleScannedResult]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsScanning(true);

    const reader = new FileReader();
    reader.onload = async (event) => {
      const src = event.target?.result as string;
      if (!src) { setIsScanning(false); return; }

      const qrData = await decodeQrFromImageSrc(src);
      if (qrData) {
        handleScannedResult(qrData);
      } else {
        setIsScanning(false);
        toast.error('No UPI QR detected in image.', { duration: 3000 });
      }
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [handleScannedResult]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[1100] flex flex-col bg-[#070b14] text-white safe-pt safe-pb"
        >
          {/* Header */}
          <div className="relative z-20 flex justify-between items-center px-5 py-4 safe-pt">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                <Zap className="w-4 h-4 fill-emerald-400 text-emerald-400" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white tracking-wide">Scan UPI Standee</h2>
                <p className="text-[10px] text-emerald-400 font-medium">Real-time ML Scanner</p>
              </div>
            </div>
            <button
              onClick={() => {
                setIsScanning(false);
                setRecognizedPayee(null);
                onClose();
              }}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Viewport Area */}
          <div className="flex-1 flex flex-col items-center justify-center px-6 pb-6">
            <div className="relative mb-6">
              <div className="w-60 h-60 rounded-3xl bg-gradient-to-br from-emerald-500/10 via-transparent to-teal-500/10 border-2 border-dashed border-emerald-500/40 flex items-center justify-center relative overflow-hidden shadow-[0_0_50px_rgba(16,185,129,0.15)]">
                {recognizedPayee ? (
                  /* Ultra-smooth Recognized Success State */
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="flex flex-col items-center text-center px-4 space-y-2 z-10"
                  >
                    <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center text-emerald-400 shadow-[0_0_25px_#10b981]">
                      <CheckCircle2 className="w-10 h-10" />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">QR Recognized</p>
                      <h3 className="font-bold text-white text-sm max-w-[180px] truncate">
                        {recognizedPayee.pn || recognizedPayee.pa}
                      </h3>
                      {recognizedPayee.am && (
                        <p className="text-xs font-black text-emerald-300">₹{recognizedPayee.am}</p>
                      )}
                    </div>
                  </motion.div>
                ) : isScanning ? (
                  /* Scanning / Viewfinder Active State */
                  <div className="flex flex-col items-center gap-3 z-10">
                    <Loader2 className="w-10 h-10 text-emerald-400 animate-spin" />
                    <p className="text-xs font-semibold text-emerald-300">Scanning in real-time...</p>
                  </div>
                ) : (
                  /* Ready to Scan State */
                  <div className="flex flex-col items-center gap-2.5 text-center px-4 z-10">
                    <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-inner">
                      <Camera className="w-7 h-7" />
                    </div>
                    <p className="text-xs font-bold text-white/80 leading-snug">
                      Tap below to scan any Paytm, PhonePe or GPay Standee
                    </p>
                    <p className="text-[10px] text-white/50">Instant ML Kit detection</p>
                  </div>
                )}

                {/* Laser scanline animation */}
                {!recognizedPayee && (
                  <motion.div
                    animate={{ y: [-90, 90] }}
                    transition={{
                      repeat: Infinity,
                      repeatType: 'reverse',
                      duration: 1.6,
                      ease: 'easeInOut'
                    }}
                    className="absolute w-full h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_12px_#10b981]"
                  />
                )}

                {/* Corner Accents */}
                <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-emerald-400 rounded-tl-2xl" />
                <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-emerald-400 rounded-tr-2xl" />
                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-emerald-400 rounded-bl-2xl" />
                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-emerald-400 rounded-br-2xl" />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="w-full max-w-xs space-y-2.5">
              <button
                onClick={() => startScan(false)}
                disabled={isScanning || !!recognizedPayee}
                className="w-full py-4 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500 text-black font-black text-sm rounded-2xl transition-all shadow-[0_0_25px_rgba(16,185,129,0.35)] active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2.5 cursor-pointer"
              >
                <Camera className="w-5 h-5 fill-black" />
                <span>📸 Open Camera & Scan</span>
              </button>

              <button
                onClick={pickFromGallery}
                disabled={isScanning || !!recognizedPayee}
                className="w-full py-3 bg-white/10 hover:bg-white/15 border border-white/10 text-white font-semibold text-xs rounded-2xl transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                <ImageIcon className="w-4 h-4 text-emerald-400" />
                <span>Upload QR Screenshot</span>
              </button>

              {onOpenManualPay && (
                <button
                  type="button"
                  onClick={onOpenManualPay}
                  disabled={isScanning || !!recognizedPayee}
                  className="w-full py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white font-medium text-xs rounded-2xl transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span>Enter UPI ID / Number Manually</span>
                </button>
              )}
            </div>

            <div className="mt-5 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400/70" />
              <p className="text-[10px] text-white/50 font-medium">
                Instant UPI auto-log • Supports BharatPe, PhonePe, Paytm, GPay
              </p>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileInput}
            className="hidden"
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
