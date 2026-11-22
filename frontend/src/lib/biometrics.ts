// App Lock and PIN security settings in LocalStorage
const LOCK_KEY = 'lumina_app_lock_enabled';
const PIN_KEY = 'lumina_app_lock_pin';
const TIMEOUT_KEY = 'lumina_lock_timeout_ms';

// Fingerprint removed per user request: stubbed for backwards compatibility
export async function isBiometricAvailable(): Promise<{ isAvailable: boolean; hasEnrolled: boolean }> {
  return { isAvailable: false, hasEnrolled: false };
}

export async function authenticateBiometric(_title = 'Unlock Lumina', _subtitle = 'Verify to access your finances'): Promise<boolean> {
  return false;
}

export function getLockTimeoutMs(): number {
  if (typeof window === 'undefined') return 60000;
  const stored = localStorage.getItem(TIMEOUT_KEY);
  if (stored !== null) {
    const parsed = parseInt(stored, 10);
    if (!isNaN(parsed)) return parsed;
  }
  return 60000; // default 1 minute (60,000ms)
}

export function setLockTimeoutMs(ms: number): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TIMEOUT_KEY, String(ms));
}

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
