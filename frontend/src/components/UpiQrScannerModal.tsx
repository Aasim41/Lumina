'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Camera, Image as ImageIcon, Zap, AlertCircle, RefreshCw } from 'lucide-react';
import jsQR from 'jsqr';
import { parseUpiUri, type ParsedUpiData } from '@/lib/upi';
import toast from 'react-hot-toast';

interface UpiQrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (data: ParsedUpiData) => void;
}

export function UpiQrScannerModal({ isOpen, onClose, onScanSuccess }: UpiQrScannerModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [torchOn, setTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const requestAnimationRef = useRef<number | null>(null);

  // Stop camera tracks helper
  const stopCamera = useCallback(() => {
    if (requestAnimationRef.current) {
      cancelAnimationFrame(requestAnimationRef.current);
      requestAnimationRef.current = null;
    }
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  }, [stream]);

  // Handle scanned text
  const handleScannedResult = useCallback((rawValue: string) => {
    const parsed = parseUpiUri(rawValue);
    if (parsed) {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([60, 40, 60]);
      }
      toast.success(`Found merchant: ${parsed.pn || parsed.pa}`, { icon: '⚡' });
      stopCamera();
      onScanSuccess(parsed);
      onClose();
    } else {
      toast.error('Scanned QR is not a valid UPI payment code', { duration: 2500 });
    }
  }, [onScanSuccess, onClose, stopCamera]);

  // Frame scanning loop using jsQR
  const scanFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || isProcessing) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    if (video.readyState === video.HAVE_ENOUGH_DATA && ctx) {
      // Optimization: Scale canvas down to max 640px width for 9x faster decoding & zero thermal throttle
      const maxDim = 640;
      let targetW = video.videoWidth;
      let targetH = video.videoHeight;
      if (targetW > maxDim) {
        targetH = Math.round((targetH * maxDim) / targetW);
        targetW = maxDim;
      }

      canvas.width = targetW;
      canvas.height = targetH;
      ctx.drawImage(video, 0, 0, targetW, targetH);

      try {
        const imageData = ctx.getImageData(0, 0, targetW, targetH);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'dontInvert'
        });

        if (code && code.data) {
          setIsProcessing(true);
          handleScannedResult(code.data);
          return;
        }
      } catch {
        // Continue scanning
      }
    }

    requestAnimationRef.current = requestAnimationFrame(scanFrame);
  }, [isProcessing, handleScannedResult]);

  // Start camera when modal opens
  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      return;
    }

    setCameraError(null);
    setIsProcessing(false);

    let activeStream: MediaStream | null = null;

    async function initCamera() {
      try {
        const constraints: MediaStreamConstraints = {
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: false
        };

        const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
        activeStream = mediaStream;
        setStream(mediaStream);

        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          videoRef.current.setAttribute('playsinline', 'true'); // Required for iOS/Android
          await videoRef.current.play();
          requestAnimationRef.current = requestAnimationFrame(scanFrame);
        }

        // Check if flashlight / torch is supported
        const track = mediaStream.getVideoTracks()[0];
        const capabilities: any = track.getCapabilities?.() || {};
        if (capabilities.torch) {
          setHasTorch(true);
        }
      } catch (err: any) {
        console.error('Camera access error:', err);
        setCameraError(
          err.name === 'NotAllowedError'
            ? 'Camera permission denied. Please enable camera access in your phone settings or upload a QR image.'
            : 'Could not start camera. You can upload a QR image/screenshot below.'
        );
      }
    }

    initCamera();

    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach((t) => t.stop());
      }
      if (requestAnimationRef.current) {
        cancelAnimationFrame(requestAnimationRef.current);
      }
    };
  }, [isOpen, scanFrame, stopCamera]);

  // Toggle Torch/Flashlight
  const toggleTorch = async () => {
    if (!stream) return;
    const track = stream.getVideoTracks()[0];
    try {
      const nextTorch = !torchOn;
      await (track as any).applyConstraints({
        advanced: [{ torch: nextTorch }]
      });
      setTorchOn(nextTorch);
    } catch {
      toast.error('Flashlight not supported on this camera');
    }
  };

  // Decode from file/image picker fallback
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);

        if (code && code.data) {
          handleScannedResult(code.data);
        } else {
          toast.error('No QR code detected in the selected image.');
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[1100] flex flex-col bg-black text-white">
          {/* Header Bar */}
          <div className="relative z-20 flex justify-between items-center p-5 safe-pt bg-gradient-to-b from-black/80 to-transparent">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Zap className="w-4 h-4 fill-emerald-400" />
              </div>
              <h2 className="text-base font-bold text-white">Scan UPI Standee QR</h2>
            </div>
            <button
              onClick={() => {
                stopCamera();
                onClose();
              }}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Viewport Area */}
          <div className="relative flex-1 flex items-center justify-center overflow-hidden bg-neutral-950">
            {cameraError ? (
              <div className="p-6 text-center max-w-xs space-y-4">
                <div className="w-14 h-14 mx-auto rounded-full bg-rose-500/20 flex items-center justify-center text-rose-400">
                  <AlertCircle className="w-8 h-8" />
                </div>
                <p className="text-sm text-white/80">{cameraError}</p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  <ImageIcon className="w-4 h-4" />
                  <span>Upload QR Screenshot</span>
                </button>
              </div>
            ) : (
              <>
                {/* Live Video */}
                <video
                  ref={videoRef}
                  className="absolute inset-0 w-full h-full object-cover"
                  playsInline
                  muted
                />
                <canvas ref={canvasRef} className="hidden" />

                {/* Dark Vignette Overlay */}
                <div className="absolute inset-0 bg-black/40 pointer-events-none" />

                {/* Scanner Target Frame */}
                <div className="relative z-10 w-64 h-64 border-2 border-emerald-400/40 rounded-3xl shadow-[0_0_50px_rgba(16,185,129,0.3)] flex items-center justify-center overflow-hidden">
                  {/* Glowing Laser Scanline */}
                  <motion.div
                    animate={{ y: [-110, 110] }}
                    transition={{
                      repeat: Infinity,
                      repeatType: 'reverse',
                      duration: 1.8,
                      ease: 'easeInOut'
                    }}
                    className="w-full h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_15px_#10b981]"
                  />

                  {/* Corner Accents */}
                  <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-emerald-400 rounded-tl-xl" />
                  <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-emerald-400 rounded-tr-xl" />
                  <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-emerald-400 rounded-bl-xl" />
                  <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-emerald-400 rounded-br-xl" />
                </div>

                <p className="absolute bottom-24 z-10 text-xs font-medium text-white/80 bg-black/60 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/10">
                  Align Paytm, BharatPe, or PhonePe standee inside box
                </p>
              </>
            )}
          </div>

          {/* Footer Controls */}
          <div className="relative z-20 p-5 safe-pb bg-gradient-to-t from-black via-black/80 to-transparent flex justify-center items-center gap-4">
            {hasTorch && (
              <button
                type="button"
                onClick={toggleTorch}
                className={`p-3 rounded-2xl border transition-all flex items-center gap-2 text-xs font-semibold ${
                  torchOn
                    ? 'bg-amber-400 text-black border-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.4)]'
                    : 'bg-white/10 border-white/10 text-white hover:bg-white/20'
                }`}
              >
                <Zap className="w-4 h-4" />
                <span>{torchOn ? 'Torch On' : 'Torch Off'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="py-3 px-5 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/10 text-white transition-all flex items-center gap-2 text-xs font-semibold"
            >
              <ImageIcon className="w-4 h-4 text-emerald-400" />
              <span>Choose from Gallery</span>
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}
