import { App } from '@capacitor/app';
import { db, DBTransaction, generateId, todayISO } from './db';

export interface UpiPayee {
  id: string;
  name: string;
  vpa: string;
  avatar_color?: string;
  last_amount?: number;
  last_paid_at?: string;
  category?: string;
}

export interface UpiAppConfig {
  id: string;
  name: string;
  packageName?: string;
  color: string;
  accent: string;
  iconText: string;
}

export const POPULAR_UPI_APPS: UpiAppConfig[] = [
  { id: 'any', name: 'System Chooser', color: 'from-emerald-500 to-teal-600', accent: '#10b981', iconText: '⚡' },
  { id: 'gpay', name: 'Google Pay', packageName: 'com.google.android.apps.nbu.paisa.user', color: 'from-blue-500 to-emerald-500', accent: '#4285F4', iconText: 'G' },
  { id: 'phonepe', name: 'PhonePe', packageName: 'com.phonepe.app', color: 'from-purple-600 to-indigo-600', accent: '#5f259f', iconText: 'Pe' },
  { id: 'paytm', name: 'Paytm', packageName: 'net.one97.paytm', color: 'from-sky-500 to-blue-600', accent: '#00b9f5', iconText: 'P' },
  { id: 'cred', name: 'CRED', packageName: 'com.dreamplug.androidapp', color: 'from-neutral-800 to-neutral-900', accent: '#111111', iconText: 'C' },
  { id: 'bhim', name: 'BHIM UPI', packageName: 'in.org.npci.upiapp', color: 'from-amber-500 to-orange-600', accent: '#00796B', iconText: 'B' },
];

export const COMMON_UPI_HANDLES = [
  '@okhdfcbank',
  '@okicici',
  '@okaxis',
  '@oksbi',
  '@paytm',
  '@ybl',
  '@ibl',
  '@axl',
  '@postbank'
];

const STORAGE_KEY_DEFAULT_APP = 'lumina_default_upi_app';
const STORAGE_KEY_SAVED_PAYEES = 'lumina_saved_upi_payees';

// ── Default UPI App Preference ─────────────────────────────────────

export function getDefaultUpiApp(): string {
  if (typeof window === 'undefined') return 'any';
  return localStorage.getItem(STORAGE_KEY_DEFAULT_APP) || 'any';
}

export function setDefaultUpiApp(appId: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY_DEFAULT_APP, appId);
}

// ── Saved Frequent Payees ──────────────────────────────────────────

export function getSavedPayees(): UpiPayee[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SAVED_PAYEES);
    if (!raw) return getDefaultPresetPayees();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : getDefaultPresetPayees();
  } catch {
    return getDefaultPresetPayees();
  }
}

export function savePayee(payee: Omit<UpiPayee, 'id'> & { id?: string }): UpiPayee {
  const existing = getSavedPayees();
  const id = payee.id || `payee_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const cleanVpa = payee.vpa.trim().toLowerCase();
  
  // Update if exists, or prepend
  const idx = existing.findIndex(p => p.vpa.toLowerCase() === cleanVpa);
  const updated: UpiPayee = {
    id,
    name: payee.name.trim(),
    vpa: cleanVpa,
    avatar_color: payee.avatar_color || getRandomColor(),
    last_amount: payee.last_amount,
    last_paid_at: new Date().toISOString(),
    category: payee.category || 'Food & Dining'
  };

  let newList: UpiPayee[];
  if (idx >= 0) {
    newList = [updated, ...existing.filter((_, i) => i !== idx)];
  } else {
    newList = [updated, ...existing].slice(0, 15); // keep top 15
  }

  localStorage.setItem(STORAGE_KEY_SAVED_PAYEES, JSON.stringify(newList));
  return updated;
}

export function deletePayee(id: string): void {
  const existing = getSavedPayees();
  const filtered = existing.filter(p => p.id !== id);
  localStorage.setItem(STORAGE_KEY_SAVED_PAYEES, JSON.stringify(filtered));
}

function getDefaultPresetPayees(): UpiPayee[] {
  return [];
}

const AVATAR_COLORS = [
  '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#06b6d4', '#6366f1'
];

function getRandomColor(): string {
  return AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
}

// ── UPI URI Builder & Launch ───────────────────────────────────────

export interface UpiPaymentParams {
  pa: string;         // Payee VPA
  pn?: string;        // Payee Name
  am: number;         // Amount in INR
  tn?: string;        // Note / description
  category?: string;  // Expense category for auto-logging
  appId?: string;     // Explicit app ID or fallback to default
}

export function buildUpiUri(params: UpiPaymentParams): string {
  const cleanVpa = params.pa.trim().toLowerCase();
  const cleanName = (params.pn || 'Merchant').trim();
  const amountStr = Number(params.am).toFixed(2);
  const note = (params.tn || 'Payment').trim();

  const query = new URLSearchParams({
    pa: cleanVpa,
    pn: cleanName,
    am: amountStr,
    cu: 'INR',
    tn: note
  });

  return `upi://pay?${query.toString()}`;
}

export async function launchUpiPayment(params: UpiPaymentParams): Promise<{ success: boolean; uri: string }> {
  const uri = buildUpiUri(params);
  const preferredAppId = params.appId || getDefaultUpiApp();
  const appConfig = POPULAR_UPI_APPS.find(a => a.id === preferredAppId);

  try {
    // Attempt opening via Capacitor App plugin
    if (typeof window !== 'undefined') {
      try {
        await App.openUrl({ url: uri });
        return { success: true, uri };
      } catch (err) {
        // Fallback to window navigation
        window.location.href = uri;
        return { success: true, uri };
      }
    }
    return { success: true, uri };
  } catch (e) {
    console.error('Failed to open UPI intent:', e);
    return { success: false, uri };
  }
}

export function validateVpa(vpa: string): boolean {
  if (!vpa) return false;
  const trimmed = vpa.trim();
  // Standard VPA: name@handle or phone@handle
  const vpaRegex = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/;
  return vpaRegex.test(trimmed);
}

export interface ParsedUpiData {
  pa: string;        // VPA
  pn?: string;       // Payee Name
  am?: number;       // Amount if pre-set
  tn?: string;       // Note
  mc?: string;       // Merchant Category Code
  raw: string;
}

export function parseUpiUri(rawUri: string): ParsedUpiData | null {
  if (!rawUri || typeof rawUri !== 'string') return null;
  const trimmed = rawUri.trim();

  // If it's just a raw UPI ID (e.g. user scanned a text QR of someone's VPA)
  if (validateVpa(trimmed)) {
    return {
      pa: trimmed,
      pn: trimmed.split('@')[0],
      raw: trimmed
    };
  }

  // Handle upi://pay?...
  if (trimmed.startsWith('upi://pay?') || trimmed.startsWith('upi://pay/')) {
    try {
      const urlStr = trimmed.replace('upi://pay/', 'upi://pay?');
      const url = new URL(urlStr);
      const pa = url.searchParams.get('pa');
      if (!pa) return null;

      const pn = url.searchParams.get('pn') ? decodeURIComponent(url.searchParams.get('pn')!) : undefined;
      const amStr = url.searchParams.get('am');
      const am = amStr ? parseFloat(amStr) : undefined;
      const tn = url.searchParams.get('tn') ? decodeURIComponent(url.searchParams.get('tn')!) : undefined;
      const mc = url.searchParams.get('mc') || undefined;

      return {
        pa: pa.trim().toLowerCase(),
        pn,
        am: am && !isNaN(am) ? am : undefined,
        tn,
        mc,
        raw: trimmed
      };
    } catch {
      // Fallback regex parsing if standard URL parsing fails on custom schemes
      const paMatch = trimmed.match(/[?&]pa=([^&]+)/i);
      if (!paMatch) return null;
      const pa = decodeURIComponent(paMatch[1]);
      const pnMatch = trimmed.match(/[?&]pn=([^&]+)/i);
      const amMatch = trimmed.match(/[?&]am=([^&]+)/i);
      const tnMatch = trimmed.match(/[?&]tn=([^&]+)/i);

      return {
        pa: pa.trim().toLowerCase(),
        pn: pnMatch ? decodeURIComponent(pnMatch[1]) : undefined,
        am: amMatch ? parseFloat(decodeURIComponent(amMatch[1])) : undefined,
        tn: tnMatch ? decodeURIComponent(tnMatch[1]) : undefined,
        raw: trimmed
      };
    }
  }

  return null;
}
