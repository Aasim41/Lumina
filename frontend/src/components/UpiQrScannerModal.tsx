'use client';

import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Camera, Image as ImageIcon, Zap, Sparkles, Loader2 } from 'lucide-react';
import jsQR from 'jsqr';
import { parseUpiUri, type ParsedUpiData } from '@/lib/upi';
import toast from 'react-hot-toast';

interface UpiQrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (data: ParsedUpiData) => void;
}

/**
 * Decodes a QR code from a base64 data URI or an image URL.
 * Returns the raw QR string or null.
 */
function decodeQrFromImageSrc(src: string): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const maxDim = 1280;
      let w = img.naturalWidth || img.width;
      let h = img.naturalHeight || img.height;
      if (w > maxDim || h > maxDim) {
        if (w > h) { h = Math.round((h * maxDim) / w); w = maxDim; }
        else { w = Math.round((w * maxDim) / h); h = maxDim; }
      }
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) { resolve(null); return; }
      ctx.drawImage(img, 0, 0, w, h);
      const imageData = ctx.getImageData(0, 0, w, h);
      const code = jsQR(imageData.data, w, h, { inversionAttempts: 'attemptBoth' });
      resolve(code?.data || null);
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

export function UpiQrScannerModal({ isOpen, onClose, onScanSuccess }: UpiQrScannerModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isScanning, setIsScanning] = useState(false);

  const handleScannedResult = useCallback((rawValue: string) => {
    const parsed = parseUpiUri(rawValue);
    if (parsed) {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([60, 40, 60]);
      }
      toast.success(`Found: ${parsed.pn || parsed.pa}`, { icon: '⚡' });
      onScanSuccess(parsed);
      onClose();
    } else {
      toast.error('Not a valid UPI QR code. Try again.', { duration: 2500 });
    }
  }, [onScanSuccess, onClose]);

  // ── Use Capacitor Camera plugin (native Android camera) ──
  const snapWithNativeCamera = useCallback(async () => {
    setIsScanning(true);
    try {
      // Dynamic import so it doesn't break SSR / static export
      const { Camera: CapCamera, CameraResultType, CameraSource } = await import('@capacitor/camera');

      const photo = await CapCamera.getPhoto({
        quality: 85,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera,
        correctOrientation: true,
        width: 1280,
        height: 1280,
      });

      if (!photo.dataUrl) {
        toast.error('No photo captured');
        setIsScanning(false);
        return;
      }

      const qrData = await decodeQrFromImageSrc(photo.dataUrl);
      if (qrData) {
        handleScannedResult(qrData);
      } else {
        toast.error('No UPI QR detected. Make sure the QR is clear and well-lit.', { duration: 3000 });
      }
    } catch (err: any) {
      if (err?.message?.includes('cancelled') || err?.message?.includes('User cancelled')) {
        // User closed the camera — do nothing
      } else {
        console.error('Camera error:', err);
        toast.error('Camera error. Try uploading a QR screenshot instead.');
      }
    } finally {
      setIsScanning(false);
    }
  }, [handleScannedResult]);

  // ── Upload from gallery ──
  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
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
        toast.error('No UPI QR detected in this image.', { duration: 3000 });
      }
      setIsScanning(false);
    };
    reader.onerror = () => {
      toast.error('Failed to read the selected image.');
      setIsScanning(false);
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [handleScannedResult]);

  // ── Pick from gallery via Capacitor Camera ──
  const pickFromGallery = useCallback(async () => {
    setIsScanning(true);
    try {
      const { Camera: CapCamera, CameraResultType, CameraSource } = await import('@capacitor/camera');

      const photo = await CapCamera.getPhoto({
        quality: 90,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Photos,
        width: 1280,
        height: 1280,
      });

      if (!photo.dataUrl) {
        setIsScanning(false);
        return;
      }

      const qrData = await decodeQrFromImageSrc(photo.dataUrl);
      if (qrData) {
        handleScannedResult(qrData);
      } else {
        toast.error('No UPI QR detected. Ensure the screenshot shows the full QR.', { duration: 3000 });
      }
    } catch (err: any) {
      if (!err?.message?.includes('cancelled') && !err?.message?.includes('User cancelled')) {
        // Fallback to file input if Capacitor gallery fails
        fileInputRef.current?.click();
      }
    } finally {
      setIsScanning(false);
    }
  }, [handleScannedResult]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[1100] flex flex-col bg-[#0a0e18] text-white"
        >
          {/* Header */}
          <div className="relative z-20 flex justify-between items-center px-5 py-4 safe-pt">
            <div className="flex items-center space-x-2.5">
              <div className="w-9 h-9 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
                <Zap className="w-4 h-4 fill-emerald-400 text-emerald-400" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white leading-tight">Scan UPI QR</h2>
                <p className="text-[10px] text-white/50">Point • Snap • Pay instantly</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Main Content */}
          <div className="flex-1 flex flex-col items-center justify-center px-6 pb-6">
            {/* Illustration Area */}
            <div className="relative mb-8">
              <div className="w-48 h-48 rounded-[2.5rem] bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border-2 border-dashed border-emerald-500/30 flex items-center justify-center relative overflow-hidden">
                {isScanning ? (
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-10 h-10 text-emerald-400 animate-spin" />
                    <p className="text-xs text-emerald-300 font-medium">Reading QR...</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                      <Camera className="w-8 h-8 text-emerald-400" />
                    </div>
                    <p className="text-xs text-white/60 font-medium text-center px-4">
                      Tap below to scan any UPI standee or QR code
                    </p>
                  </div>
                )}

                {/* Corner Accents */}
                <div className="absolute top-0 left-0 w-5 h-5 border-t-[3px] border-l-[3px] border-emerald-400 rounded-tl-xl" />
                <div className="absolute top-0 right-0 w-5 h-5 border-t-[3px] border-r-[3px] border-emerald-400 rounded-tr-xl" />
                <div className="absolute bottom-0 left-0 w-5 h-5 border-b-[3px] border-l-[3px] border-emerald-400 rounded-bl-xl" />
                <div className="absolute bottom-0 right-0 w-5 h-5 border-b-[3px] border-r-[3px] border-emerald-400 rounded-br-xl" />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="w-full max-w-xs space-y-3">
              {/* Primary: Open native camera and snap */}
              <button
                onClick={snapWithNativeCamera}
                disabled={isScanning}
                className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-black font-black text-sm rounded-2xl transition-all shadow-[0_0_30px_rgba(16,185,129,0.35)] active:scale-[0.97] disabled:opacity-60 flex items-center justify-center gap-2.5"
              >
                <Camera className="w-5 h-5" />
                <span>📸 Open Camera & Scan</span>
              </button>

              {/* Secondary: Pick from gallery */}
              <button
                onClick={pickFromGallery}
                disabled={isScanning}
                className="w-full py-3.5 bg-white/8 hover:bg-white/12 border border-white/15 text-white font-semibold text-xs rounded-2xl transition-all active:scale-[0.97] disabled:opacity-60 flex items-center justify-center gap-2"
              >
                <ImageIcon className="w-4 h-4 text-emerald-400" />
                <span>Choose QR from Gallery</span>
              </button>
            </div>

            {/* Supported Apps Hint */}
            <div className="mt-6 flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-emerald-400/60" />
              <p className="text-[10px] text-white/40 font-medium">
                Works with PhonePe • GPay • Paytm • BharatPe • CRED standees
              </p>
            </div>
          </div>

          {/* Hidden file input as final fallback */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
