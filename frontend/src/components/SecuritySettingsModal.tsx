'use client';

import { useState, useEffect } from 'react';
import {
  isAppLockEnabled,
  setAppLockEnabled,
  hasBackupPin,
  isBiometricAvailable,
  authenticateBiometric,
} from '@/lib/biometrics';
import { Shield, Fingerprint, Lock, X, Check, KeyRound } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

export function SecuritySettingsModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [enabled, setEnabled] = useState(false);
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [step, setStep] = useState<'toggle' | 'set_pin' | 'confirm_pin'>('toggle');
  const [hasBiometrics, setHasBiometrics] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setEnabled(isAppLockEnabled());
      setStep('toggle');
      setPin('');
      setConfirmPin('');
      isBiometricAvailable().then(res => setHasBiometrics(res.isAvailable));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleToggle = () => {
    if (enabled) {
      // Disable
      setAppLockEnabled(false);
      setEnabled(false);
      toast.success('App Lock disabled');
    } else {
      // Prompt to set 4-digit PIN
      setStep('set_pin');
    }
  };

  const handlePinSubmit = () => {
    if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      toast.error('PIN must be 4 digits');
      return;
    }
    setStep('confirm_pin');
  };

  const handleConfirmPinSubmit = () => {
    if (confirmPin !== pin) {
      toast.error('PINs do not match. Try again.');
      setConfirmPin('');
      return;
    }

    setAppLockEnabled(true, pin);
    setEnabled(true);
    setStep('toggle');
    toast.success('App Lock enabled with PIN & Biometrics! 🔒');
  };

  const testBiometric = async () => {
    const success = await authenticateBiometric(
      'Test Biometrics',
      'Verify fingerprint or face recognition'
    );
    if (success) {
      toast.success('Biometric verification verified! ✨');
    } else {
      toast.error('Verification failed or cancelled');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="w-full max-w-sm bg-[#0b1b16] border border-emerald-500/30 rounded-3xl p-6 shadow-[0_0_40px_rgba(16,185,129,0.2)] text-white relative"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-white/50 hover:text-white rounded-full bg-white/5 hover:bg-white/10 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-display font-bold text-lg">App Security</h3>
            <p className="text-xs text-emerald-300/60">Biometric & PIN Lock</p>
          </div>
        </div>

        {step === 'toggle' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5">
              <div className="flex items-center gap-3">
                <Lock className="w-5 h-5 text-emerald-400" />
                <div>
                  <p className="font-semibold text-sm">Lock on App Resume</p>
                  <p className="text-[11px] text-text-secondary">
                    Require Fingerprint / PIN after 30s
                  </p>
                </div>
              </div>
              <button
                onClick={handleToggle}
                className={`w-12 h-7 rounded-full p-1 transition-colors ${
                  enabled ? 'bg-emerald-500' : 'bg-white/20'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white shadow-md transition-transform ${
                    enabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {enabled && (
              <>
                <button
                  onClick={() => {
                    setPin('');
                    setConfirmPin('');
                    setStep('set_pin');
                  }}
                  className="w-full p-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 text-sm font-medium flex items-center justify-between transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-emerald-400" /> Change 4-Digit PIN
                  </span>
                  <span className="text-xs text-emerald-400 font-semibold">Update</span>
                </button>

                {hasBiometrics && (
                  <button
                    onClick={testBiometric}
                    className="w-full p-3.5 rounded-2xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-sm font-medium text-emerald-300 flex items-center justify-center gap-2 transition-colors"
                  >
                    <Fingerprint className="w-4 h-4 text-emerald-400" /> Test Biometric Sensor
                  </button>
                )}
              </>
            )}

            <p className="text-[11px] text-text-secondary leading-relaxed pt-2 text-center">
              Protects your private bank SMS data, balances, and income from anyone who uses your phone.
            </p>
          </div>
        )}

        {step === 'set_pin' && (
          <div className="space-y-4">
            <p className="text-sm text-text-secondary">Enter a new 4-digit PIN for backup unlock:</p>
            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={pin}
              onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
              placeholder="••••"
              className="w-full text-center text-3xl tracking-[1em] py-3 bg-white/5 border border-emerald-500/30 rounded-2xl text-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 font-mono"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={() => setStep('toggle')}
                className="flex-1 py-3 bg-white/10 hover:bg-white/15 rounded-xl text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                disabled={pin.length !== 4}
                onClick={handlePinSubmit}
                className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 rounded-xl text-sm font-bold text-black transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {step === 'confirm_pin' && (
          <div className="space-y-4">
            <p className="text-sm text-text-secondary">Confirm your 4-digit PIN:</p>
            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={confirmPin}
              onChange={e => setConfirmPin(e.target.value.replace(/\D/g, ''))}
              placeholder="••••"
              className="w-full text-center text-3xl tracking-[1em] py-3 bg-white/5 border border-emerald-500/30 rounded-2xl text-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 font-mono"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={() => setStep('set_pin')}
                className="flex-1 py-3 bg-white/10 hover:bg-white/15 rounded-xl text-sm font-medium transition-colors"
              >
                Back
              </button>
              <button
                disabled={confirmPin.length !== 4}
                onClick={handleConfirmPinSubmit}
                className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 rounded-xl text-sm font-bold text-black transition-colors"
              >
                Save Lock
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
