'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Camera, Image as ImageIcon, Zap, Sparkles, Loader2, CheckCircle2 } from 'lucide-react';
import jsQR from 'jsqr';
import { parseUpiUri, type ParsedUpiData } from '@/lib/upi';
import { soundFX } from '@/lib/soundFx';
import toast from 'react-hot-toast';

interface UpiQrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (data: ParsedUpiData) => void;
  onOpenManualPay?: () => void;
}

/**
 * Multi-strategy QR decoder — handles Indian shop standee QR codes
 * photographed at angles, with glare, branding, or reflective surfaces.
 */
function decodeQrFromImageSrc(src: string): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) { resolve(null); return; }

      let w = img.naturalWidth || img.width;
      let h = img.naturalHeight || img.height;

      // Strategy 1: Full resolution (up to 2048px) — handles high-res photos
      const maxDim = 2048;
      let sw = w, sh = h;
      if (sw > maxDim || sh > maxDim) {
        if (sw > sh) { sh = Math.round((sh * maxDim) / sw); sw = maxDim; }
        else { sw = Math.round((sw * maxDim) / sh); sh = maxDim; }
      }
      canvas.width = sw;
      canvas.height = sh;
      ctx.drawImage(img, 0, 0, sw, sh);
      let imageData = ctx.getImageData(0, 0, sw, sh);
      let code = jsQR(imageData.data, sw, sh, { inversionAttempts: 'attemptBoth' });
      if (code?.data) { resolve(code.data); return; }

      // Strategy 2: Center crop 60% — QR is usually in the center of standee photos
      const cropRatio = 0.6;
      const cx = Math.round(sw * (1 - cropRatio) / 2);
      const cy = Math.round(sh * (1 - cropRatio) / 2);
      const cw = Math.round(sw * cropRatio);
      const ch = Math.round(sh * cropRatio);
      imageData = ctx.getImageData(cx, cy, cw, ch);
      code = jsQR(imageData.data, cw, ch, { inversionAttempts: 'attemptBoth' });
      if (code?.data) { resolve(code.data); return; }

      // Strategy 3: Grayscale + contrast enhancement — handles glare/reflections
      canvas.width = sw;
      canvas.height = sh;
      ctx.drawImage(img, 0, 0, sw, sh);
      imageData = ctx.getImageData(0, 0, sw, sh);
      const data = imageData.data;
      for (let i = 0; i < data.length; i += 4) {
        // Convert to grayscale
        const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        // Increase contrast: stretch histogram
        const enhanced = Math.min(255, Math.max(0, (gray - 128) * 1.8 + 128));
        data[i] = data[i + 1] = data[i + 2] = enhanced;
      }
      code = jsQR(data, sw, sh, { inversionAttempts: 'attemptBoth' });
      if (code?.data) { resolve(code.data); return; }

      // Strategy 4: Aggressive binarization — pure black/white threshold
      for (let i = 0; i < data.length; i += 4) {
        const v = data[i] > 140 ? 255 : 0;
        data[i] = data[i + 1] = data[i + 2] = v;
      }
      code = jsQR(data, sw, sh, { inversionAttempts: 'attemptBoth' });
      if (code?.data) { resolve(code.data); return; }

      // Strategy 5: Lower resolution (640px) — some QR decoders work better at lower res
      const lowDim = 640;
      let lw = w, lh = h;
      if (lw > lh) { lh = Math.round((lh * lowDim) / lw); lw = lowDim; }
      else { lw = Math.round((lw * lowDim) / lh); lh = lowDim; }
      canvas.width = lw;
      canvas.height = lh;
      ctx.drawImage(img, 0, 0, lw, lh);
      imageData = ctx.getImageData(0, 0, lw, lh);
      code = jsQR(imageData.data, lw, lh, { inversionAttempts: 'attemptBoth' });
      if (code?.data) { resolve(code.data); return; }

      resolve(null);
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

export function UpiQrScannerModal({ isOpen, onClose, onScanSuccess, onOpenManualPay }: UpiQrScannerModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [recognizedPayee, setRecognizedPayee] = useState<ParsedUpiData | null>(null);

  const handleScannedResult = useCallback((rawValue: string) => {
    const parsed = parseUpiUri(rawValue);
    if (parsed) {
      soundFX.playSuccess();
      setRecognizedPayee(parsed);

      // Smooth micro-transition delay (300ms) for visual satisfaction before sliding into payment card
      setTimeout(() => {
        onScanSuccess(parsed);
        onClose();
        setRecognizedPayee(null);
        setIsScanning(false);
      }, 350);
    } else {
      toast.error('Not a valid UPI QR code. Please try again.', { duration: 2500 });
      setIsScanning(false);
    }
  }, [onScanSuccess, onClose]);

  // Snap photo with native device camera
  const snapWithNativeCamera = useCallback(async () => {
    setIsScanning(true);
    setRecognizedPayee(null);

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

  // Ready state: camera is opened by user clicking "📸 Open Camera & Scan" button below,
  // allowing user to stay on the QR screen comfortably instead of immediately forcing the camera.

  // Pick from gallery
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
          className="fixed inset-0 z-[1100] flex flex-col bg-[#070b14] text-white"
        >
          {/* Header */}
          <div className="relative z-20 flex justify-between items-center px-5 py-4 safe-pt">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                <Zap className="w-4 h-4 fill-emerald-400 text-emerald-400" />
              </div>
              <h2 className="text-sm font-bold text-white tracking-wide">Scan UPI Standee</h2>
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
                  /* Decoding / Processing State */
                  <div className="flex flex-col items-center gap-3 z-10">
                    <Loader2 className="w-10 h-10 text-emerald-400 animate-spin" />
                    <p className="text-xs font-semibold text-emerald-300">Reading Standee QR...</p>
                  </div>
                ) : (
                  /* Idle Ready State */
                  <div className="flex flex-col items-center gap-2.5 text-center px-4 z-10">
                    <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-inner">
                      <Camera className="w-7 h-7" />
                    </div>
                    <p className="text-xs font-bold text-white/80 leading-snug">
                      Align any Paytm, PhonePe or GPay Standee QR
                    </p>
                    <p className="text-[10px] text-white/50">1-tap auto-capture</p>
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
                onClick={snapWithNativeCamera}
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
