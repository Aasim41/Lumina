'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  isAppLockEnabled,
  authenticateBiometric,
  isBiometricAvailable,
  verifyBackupPin,
  hasBackupPin,
} from '@/lib/biometrics';
import { Shield, Fingerprint, Delete, Lock, KeyRound } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function BiometricGuard({ children }: { children: React.ReactNode }) {
  const [isLocked, setIsLocked] = useState(false);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState(false);
  const [biometricSupport, setBiometricSupport] = useState(false);
  const lastActiveRef = useRef<number>(Date.now());

  const checkAndPromptBiometrics = useCallback(async () => {
    if (!isAppLockEnabled()) {
      setIsLocked(false);
      return;
    }

    setIsLocked(true);
    setPin('');
    setPinError(false);

    const support = await isBiometricAvailable();
    setBiometricSupport(support.isAvailable);

    if (support.isAvailable) {
      const success = await authenticateBiometric();
      if (success) {
        setIsLocked(false);
      }
    }
  }, []);

  useEffect(() => {
    if (isAppLockEnabled()) {
      checkAndPromptBiometrics();
    }
  }, [checkAndPromptBiometrics]);

  // Lock when returning from background if absent for > 30 seconds
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        lastActiveRef.current = Date.now();
      } else if (document.visibilityState === 'visible') {
        const elapsed = Date.now() - lastActiveRef.current;
        if (elapsed > 30000 && isAppLockEnabled()) {
          checkAndPromptBiometrics();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [checkAndPromptBiometrics]);

  const handleKeyPress = (num: string) => {
    if (pin.length >= 4) return;
    const nextPin = pin + num;
    setPin(nextPin);
    setPinError(false);

    if (nextPin.length === 4) {
      // Validate
      if (hasBackupPin()) {
        if (verifyBackupPin(nextPin)) {
          setIsLocked(false);
          setPin('');
        } else {
          setPinError(true);
          setTimeout(() => {
            setPin('');
            setPinError(false);
          }, 800);
        }
      } else {
        // No PIN configured yet, allow unlock
        setIsLocked(false);
      }
    }
  };

  const handleBackspace = () => {
    setPin(prev => prev.slice(0, -1));
    setPinError(false);
  };

  if (!isLocked) {
    return <>{children}</>;
  }

  return (
    <div className="fixed inset-0 z-50 bg-[#061813] flex flex-col justify-between p-6 select-none">
      {/* Header */}
      <div className="flex flex-col items-center pt-12">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-16 h-16 rounded-3xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mb-4 shadow-[0_0_30px_rgba(16,185,129,0.25)]"
        >
          <Lock className="w-8 h-8 text-emerald-400" />
        </motion.div>
        <h2 className="text-2xl font-display font-bold text-white mb-1">Lumina is Locked</h2>
        <p className="text-xs text-emerald-300/60 text-center max-w-xs">
          Enter your 4-digit PIN or use fingerprint to view your finances
        </p>

        {/* PIN Dots */}
        <div className="flex items-center gap-4 mt-8">
          {[0, 1, 2, 3].map(idx => {
            const filled = pin.length > idx;
            return (
              <motion.div
                key={idx}
                animate={pinError ? { x: [-8, 8, -6, 6, 0] } : {}}
                transition={{ duration: 0.3 }}
                className={`w-4 h-4 rounded-full border transition-all duration-200 ${
                  filled
                    ? 'bg-emerald-400 border-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.8)] scale-110'
                    : pinError
                    ? 'border-rose-500 bg-rose-500/20'
                    : 'border-white/20 bg-white/5'
                }`}
              />
            );
          })}
        </div>
        {pinError && (
          <p className="text-xs text-rose-400 mt-2 font-medium animate-fadeIn">
            Incorrect PIN. Try again.
          </p>
        )}
      </div>

      {/* Numeric Keypad */}
      <div className="w-full max-w-xs mx-auto pb-6">
        <div className="grid grid-cols-3 gap-4 mb-4">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
            <button
              key={num}
              onClick={() => handleKeyPress(num)}
              className="h-16 rounded-2xl bg-white/5 hover:bg-white/10 active:bg-emerald-500/20 active:scale-95 border border-white/5 text-xl font-bold text-white transition-all flex items-center justify-center"
            >
              {num}
            </button>
          ))}

          {/* Biometric Trigger */}
          <button
            onClick={checkAndPromptBiometrics}
            className="h-16 rounded-2xl bg-emerald-500/10 hover:bg-emerald-500/20 active:scale-95 border border-emerald-500/20 text-emerald-400 transition-all flex items-center justify-center"
            title="Scan Biometrics"
          >
            <Fingerprint className="w-7 h-7" />
          </button>

          {/* Zero */}
          <button
            onClick={() => handleKeyPress('0')}
            className="h-16 rounded-2xl bg-white/5 hover:bg-white/10 active:bg-emerald-500/20 active:scale-95 border border-white/5 text-xl font-bold text-white transition-all flex items-center justify-center"
          >
            0
          </button>

          {/* Backspace */}
          <button
            onClick={handleBackspace}
            className="h-16 rounded-2xl bg-white/5 hover:bg-white/10 active:scale-95 border border-white/5 text-white/70 transition-all flex items-center justify-center"
            title="Delete"
          >
            <Delete className="w-6 h-6" />
          </button>
        </div>

        {biometricSupport && (
          <div className="text-center mt-2">
            <button
              onClick={checkAndPromptBiometrics}
              className="text-xs text-emerald-400/80 hover:text-emerald-300 font-medium inline-flex items-center gap-1.5 py-1 px-3 rounded-full hover:bg-emerald-500/10 transition-colors"
            >
              <Fingerprint className="w-4 h-4" /> Tap to verify with Biometrics
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
