import { Capacitor, registerPlugin } from '@capacitor/core';

interface NativeBiometricPlugin {
  isAvailable(): Promise<{ isAvailable: boolean; hasEnrolled: boolean }>;
  authenticate(options?: { title?: string; subtitle?: string; cancelText?: string }): Promise<{ success: boolean }>;
}

let nativePlugin: NativeBiometricPlugin | null = null;

function getPlugin(): NativeBiometricPlugin | null {
  if (typeof window === 'undefined') return null;
  if (!nativePlugin && Capacitor.isNativePlatform()) {
    try {
      nativePlugin = registerPlugin<NativeBiometricPlugin>('NativeBiometric');
    } catch (e) {
      console.warn('NativeBiometric registration failed:', e);
    }
  }
  return nativePlugin;
}

export async function isBiometricAvailable(): Promise<{ isAvailable: boolean; hasEnrolled: boolean }> {
  try {
    const plugin = getPlugin();
    if (plugin) {
      const res = await plugin.isAvailable();
      return { isAvailable: !!res.isAvailable, hasEnrolled: !!res.hasEnrolled };
    }
    // Web platform fallback: check WebAuthn
    if (typeof window !== 'undefined' && window.PublicKeyCredential) {
      const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      return { isAvailable: available, hasEnrolled: available };
    }
  } catch (e) {
    console.warn('Biometric check failed:', e);
  }
  return { isAvailable: false, hasEnrolled: false };
}

export async function authenticateBiometric(title = 'Unlock Lumina', subtitle = 'Verify to access your finances'): Promise<boolean> {
  try {
    const plugin = getPlugin();
    if (plugin) {
      const res = await plugin.authenticate({ title, subtitle });
      return !!res.success;
    }
    return false;
  } catch (e) {
    console.warn('Biometric auth failed or cancelled:', e);
    return false;
  }
}

// App Lock settings in LocalStorage
const LOCK_KEY = 'lumina_app_lock_enabled';
const PIN_KEY = 'lumina_app_lock_pin';

export function isAppLockEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(LOCK_KEY) === 'true';
}

export function setAppLockEnabled(enabled: boolean, pin?: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LOCK_KEY, enabled ? 'true' : 'false');
  if (pin) {
    localStorage.setItem(PIN_KEY, pin);
  } else if (!enabled) {
    localStorage.removeItem(PIN_KEY);
  }
}

export function hasBackupPin(): boolean {
  if (typeof window === 'undefined') return false;
  return !!localStorage.getItem(PIN_KEY);
}

export function verifyBackupPin(pin: string): boolean {
  if (typeof window === 'undefined') return false;
  const stored = localStorage.getItem(PIN_KEY);
  if (!stored) return false;
  return stored === pin;
}
