'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Camera, Image as ImageIcon, Zap, AlertCircle, RefreshCw, Sparkles } from 'lucide-react';
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
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [torchOn, setTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLivePreviewReady, setIsLivePreviewReady] = useState(false);
  const [isTrackMuted, setIsTrackMuted] = useState(false);
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
    setIsLivePreviewReady(false);
    setIsTrackMuted(false);
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
      setIsProcessing(false);
    }
  }, [onScanSuccess, onClose, stopCamera]);

  // Frame scanning loop using jsQR
  const scanFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || isProcessing) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    if (video.readyState >= 2 && video.videoWidth > 0 && ctx) {
      setIsLivePreviewReady(true);
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
    setIsLivePreviewReady(false);
    setIsTrackMuted(false);

    let activeStream: MediaStream | null = null;
    let isMounted = true;

    // Timeout helper to avoid infinite hanging in Android WebView
    const fetchStreamWithTimeout = async (constraints: MediaStreamConstraints, timeoutMs = 3500): Promise<MediaStream> => {
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          reject(new Error('CAMERA_TIMEOUT'));
        }, timeoutMs);

        navigator.mediaDevices.getUserMedia(constraints)
          .then((s) => {
            clearTimeout(timer);
            resolve(s);
          })
          .catch((e) => {
            clearTimeout(timer);
            reject(e);
          });
      });
    };

    async function initCamera() {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('Camera API not available');
        }

        let mediaStream: MediaStream | null = null;

        // Try rear camera with 720p
        try {
          mediaStream = await fetchStreamWithTimeout({
            video: {
              facingMode: { ideal: 'environment' },
              width: { ideal: 1280 },
              height: { ideal: 720 }
            },
            audio: false
          }, 3000);
        } catch {
          // Fallback to basic back camera or any video input
          try {
            mediaStream = await fetchStreamWithTimeout({
              video: { facingMode: 'environment' },
              audio: false
            }, 3000);
          } catch {
            mediaStream = await fetchStreamWithTimeout({
              video: true,
              audio: false
            }, 3000);
          }
        }

        if (!isMounted) {
          mediaStream.getTracks().forEach((t) => t.stop());
          return;
        }

        activeStream = mediaStream;
        setStream(mediaStream);

        // Check if track is muted by Android OS permissions
        const track = mediaStream.getVideoTracks()[0];
        if (track) {
          if (track.muted) {
            setIsTrackMuted(true);
          }
          track.onmute = () => setIsTrackMuted(true);
          track.onunmute = () => setIsTrackMuted(false);

          const capabilities: any = track.getCapabilities?.() || {};
          if (capabilities.torch) {
            setHasTorch(true);
          }
        }

        if (videoRef.current) {
          const video = videoRef.current;
          video.setAttribute('playsinline', 'true');
          video.setAttribute('webkit-playsinline', 'true');
          video.setAttribute('autoplay', 'true');
          video.setAttribute('muted', 'true');
          video.muted = true;
          video.defaultMuted = true;
          video.srcObject = mediaStream;

          const startScan = async () => {
            try {
              await video.play();
            } catch (err) {
              console.warn('Video play deferred:', err);
            }
            if (!requestAnimationRef.current) {
              requestAnimationRef.current = requestAnimationFrame(scanFrame);
            }
          };

          video.onloadedmetadata = startScan;
          video.oncanplay = startScan;
          video.play().catch(() => {});
          requestAnimationRef.current = requestAnimationFrame(scanFrame);
        }
      } catch (err: any) {
        console.warn('Live camera stream not started:', err);
        setCameraError(
          err.message === 'CAMERA_TIMEOUT'
            ? 'Live camera preview timed out. Tap "Snap & Scan" below to capture instantly with your camera!'
            : 'Live camera preview unavailable. Tap "Snap & Scan" to capture and scan instantly!'
        );
      }
    }

    initCamera();

    return () => {
      isMounted = false;
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

  // Decode from file / native camera photo
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const toastId = toast.loading('Reading QR code...');

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        // Scale down large multi-megapixel photos to max 1280px for instant decoding
        const maxDim = 1280;
        let w = img.width;
        let h = img.height;
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }

        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) {
          toast.dismiss(toastId);
          toast.error('Image decoder error');
          return;
        }

        ctx.drawImage(img, 0, 0, w, h);
        const imageData = ctx.getImageData(0, 0, w, h);
        
        // Attempt detection with inversion fallback
        let code = jsQR(imageData.data, w, h, { inversionAttempts: 'attemptBoth' });

        toast.dismiss(toastId);

        if (code && code.data) {
          handleScannedResult(code.data);
        } else {
          toast.error('No UPI QR detected. Please ensure the QR is well lit and aligned.', { duration: 3500 });
        }
      };
      img.onerror = () => {
        toast.dismiss(toastId);
        toast.error('Failed to load selected photo');
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
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
              <div>
                <h2 className="text-base font-bold text-white leading-tight">Scan UPI Standee QR</h2>
                <p className="text-[10px] text-white/60">PhonePe • GPay • Paytm • BharatPe</p>
              </div>
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
              <div className="p-6 text-center max-w-xs space-y-4 relative z-10">
                <div className="w-16 h-16 mx-auto rounded-3xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                  <Camera className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base mb-1">Instant QR Scanner</h3>
                  <p className="text-xs text-white/70 leading-relaxed">{cameraError}</p>
                </div>

                <div className="space-y-2 pt-2">
                  <button
                    onClick={() => cameraInputRef.current?.click()}
                    className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-black font-extrabold rounded-2xl transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] flex items-center justify-center gap-2 active:scale-95"
                  >
                    <Camera className="w-5 h-5" />
                    <span>📸 Snap Standee QR</span>
                  </button>

                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-3 bg-white/10 hover:bg-white/15 border border-white/10 text-white font-medium rounded-2xl transition-colors flex items-center justify-center gap-2 text-xs"
                  >
                    <ImageIcon className="w-4 h-4 text-emerald-400" />
                    <span>Upload QR Screenshot</span>
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Live Video */}
                <video
                  ref={videoRef}
                  className="absolute inset-0 w-full h-full object-cover"
                  playsInline
                  autoPlay
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

                  {/* Muted Track / Waiting Indicator */}
                  {isTrackMuted && (
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm p-4 flex flex-col items-center justify-center text-center space-y-2">
                      <p className="text-xs text-white/90 font-medium">Camera output is muted by system.</p>
                      <button
                        onClick={() => cameraInputRef.current?.click()}
                        className="px-3 py-1.5 bg-emerald-500 text-black text-xs font-bold rounded-xl"
                      >
                        Snap Photo Instead
                      </button>
                    </div>
                  )}
                </div>

                <p className="absolute bottom-24 z-10 text-xs font-medium text-white/80 bg-black/70 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/10 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Align merchant standee inside box</span>
                </p>
              </>
            )}
          </div>

          {/* Footer Controls */}
          <div className="relative z-20 p-5 safe-pb bg-gradient-to-t from-black via-black/90 to-transparent flex justify-center items-center gap-3">
            {/* 1. Snap & Scan via Native Camera (Guaranteed 100% hardware compatibility) */}
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              className="py-3 px-5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-black transition-all flex items-center gap-2 text-xs font-black shadow-[0_0_20px_rgba(16,185,129,0.35)] active:scale-95 cursor-pointer"
            >
              <Camera className="w-4 h-4 fill-black text-black" />
              <span>Snap & Scan</span>
            </button>

            {/* 2. Upload from Gallery / QR Screenshot */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="py-3 px-4 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/10 text-white transition-all flex items-center gap-2 text-xs font-semibold active:scale-95 cursor-pointer"
            >
              <ImageIcon className="w-4 h-4 text-emerald-400" />
              <span>Gallery</span>
            </button>

            {/* 3. Flashlight / Torch toggle if supported */}
            {hasTorch && (
              <button
                type="button"
                onClick={toggleTorch}
                className={`p-3 rounded-2xl border transition-all flex items-center justify-center ${
                  torchOn
                    ? 'bg-amber-400 text-black border-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.4)]'
                    : 'bg-white/10 border-white/10 text-white hover:bg-white/20'
                }`}
                title="Toggle Flashlight"
              >
                <Zap className="w-4 h-4" />
              </button>
            )}

            {/* Native Camera Capture Input */}
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleImageUpload}
              className="hidden"
            />

            {/* Gallery Image Picker Input */}
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
