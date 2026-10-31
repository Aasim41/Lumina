import { registerPlugin } from '@capacitor/core';
import { db, DBTransaction, generateId, todayISO } from './db';

// Native Android UPI bridge plugin (bypasses system chooser by directly setting intent package)
interface NativeUpiPluginInterface {
  launchUpi(options: { uri: string; packageName?: string }): Promise<{ success: boolean; targetedPackage?: string }>;
  getInstalledUpiApps(): Promise<{ apps: Array<{ packageName: string; name: string }> }>;
}

const NativeUpi = registerPlugin<NativeUpiPluginInterface>('NativeUpi');

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
  { id: 'phonepe', name: 'PhonePe', packageName: 'com.phonepe.app', color: 'from-purple-600 to-indigo-600', accent: '#5f259f', iconText: 'Pe' },
  { id: 'gpay', name: 'Google Pay', packageName: 'com.google.android.apps.nbu.paisa.user', color: 'from-blue-500 to-emerald-500', accent: '#4285F4', iconText: 'G' },
  { id: 'paytm', name: 'Paytm', packageName: 'net.one97.paytm', color: 'from-sky-500 to-blue-600', accent: '#00b9f5', iconText: 'P' },
  { id: 'cred', name: 'CRED', packageName: 'com.dreamplug.androidapp', color: 'from-neutral-800 to-neutral-900', accent: '#111111', iconText: 'C' },
  { id: 'bhim', name: 'BHIM UPI', packageName: 'in.org.npci.upiapp', color: 'from-amber-500 to-orange-600', accent: '#00796B', iconText: 'B' },
  { id: 'navi', name: 'Navi UPI', packageName: 'com.naviapp', color: 'from-blue-600 to-indigo-700', accent: '#0052FF', iconText: 'N' },
  { id: 'mobikwik', name: 'MobiKwik', packageName: 'com.mobikwik_new', color: 'from-sky-500 to-blue-600', accent: '#00A3EF', iconText: 'M' },
  { id: 'fampay', name: 'FamPay', packageName: 'com.fampay.in', color: 'from-amber-400 to-yellow-500', accent: '#FFBE00', iconText: 'Fam' },
  { id: 'any', name: 'System Chooser', color: 'from-emerald-500 to-teal-600', accent: '#10b981', iconText: '⚡' },
];

export const COMMON_UPI_HANDLES = [
  '@okhdfcbank',
  '@okaxis',
  '@paytm',
  '@ybl',
  '@oksbi',
  '@okicici',
  '@ibl',
  '@navi',
  '@cred'
];

const STORAGE_KEY_DEFAULT_APP = 'lumina_default_upi_app';
const STORAGE_KEY_SAVED_PAYEES = 'lumina_saved_upi_payees';

// ── Default UPI App Preference ─────────────────────────────────────

export function getDefaultUpiApp(): string {
  if (typeof window === 'undefined') return 'phonepe';
  return localStorage.getItem(STORAGE_KEY_DEFAULT_APP) || 'phonepe';
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
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function savePayee(payee: Omit<UpiPayee, 'id'> & { id?: string }): UpiPayee {
  const existing = getSavedPayees();
  const id = payee.id || `payee_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const cleanVpa = payee.vpa.trim();
  
  const idx = existing.findIndex(p => p.vpa.toLowerCase() === cleanVpa.toLowerCase());
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
    newList = [updated, ...existing].slice(0, 10);
  }

  localStorage.setItem(STORAGE_KEY_SAVED_PAYEES, JSON.stringify(newList));
  return updated;
}

export function deletePayee(id: string): void {
  const existing = getSavedPayees();
  const filtered = existing.filter(p => p.id !== id);
  localStorage.setItem(STORAGE_KEY_SAVED_PAYEES, JSON.stringify(filtered));
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
  extraParams?: Record<string, string>;  // Extra QR params (tr, tid, orgid, etc.)
  rawQrUri?: string;  // Original QR URI — used verbatim when available
}

export function buildUpiUri(params: UpiPaymentParams): string {
  const cleanVpa = params.pa.trim(); // preserve original case from QR
  const cleanName = (params.pn || 'Merchant').trim();
  // Strip trailing zeros after decimal (e.g. "100.00" → "100", "99.50" → "99.5")
  const amountStr = Number(params.am).toFixed(2).replace(/\.?0+$/, '');
  const note = (params.tn || 'Payment').trim();

  // Use encodeURIComponent instead of URLSearchParams — URLSearchParams encodes
  // spaces as '+' which UPI apps (PhonePe, Paytm) REJECT. encodeURIComponent
  // produces '%20' which all apps accept.
  const parts: string[] = [
    `pa=${encodeURIComponent(cleanVpa)}`,
    `pn=${encodeURIComponent(cleanName)}`,
    `am=${encodeURIComponent(amountStr)}`,
    `cu=INR`,
    `tn=${encodeURIComponent(note)}`,
  ];

  // Add mode=00 if not already present in extraParams
  const extras = params.extraParams || {};
  if (!extras['mode']) {
    parts.push('mode=00');
  }

  // Forward ALL extra QR params (tr, tid, orgid, mid, msid, mtid, sign, etc.)
  for (const [key, value] of Object.entries(extras)) {
    parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
  }

  return `upi://pay?${parts.join('&')}`;
}

export async function launchUpiPayment(params: UpiPaymentParams): Promise<{ success: boolean; uri: string }> {
  // Always use buildUpiUri when amount is specified or parameters are adjusted.
  // buildUpiUri preserves all extra merchant params (mc, tr, tid, etc.) while
  // ensuring compliant encoding (%20 for spaces, clean decimal amounts, mode=00).
  const uri = (params.rawQrUri && !params.am) ? params.rawQrUri : buildUpiUri(params);
  const preferredAppId = params.appId || getDefaultUpiApp();
  const appConfig = POPULAR_UPI_APPS.find(a => a.id === preferredAppId);
  const targetPackage = (appConfig && appConfig.id !== 'any') ? appConfig.packageName : undefined;

  try {
    if (typeof window !== 'undefined') {
      // 1. Primary: Native Capacitor Plugin with target package (BYPASSES system chooser dialog completely!)
      try {
        const res = await NativeUpi.launchUpi({
          uri,
          packageName: targetPackage
        });
        if (res && res.success) {
          return { success: true, uri };
        }
      } catch (nativeErr) {
        console.warn('NativeUpi plugin call skipped or failed, using intent fallback:', nativeErr);
      }

      // 2. Android Intent URL format with package specifier
      if (targetPackage) {
        try {
          const queryString = uri.replace(/^upi:\/\/pay\??/i, '');
          const intentUrl = `intent://pay?${queryString}#Intent;scheme=upi;package=${targetPackage};end`;
          window.location.href = intentUrl;
          return { success: true, uri };
        } catch {}
      }

      // 3. Fallback to window.location.href
      try {
        window.location.href = uri;
        return { success: true, uri };
      } catch {}
    }
    return { success: true, uri };
  } catch (e) {
    console.error('Failed to open UPI intent:', e);
    return { success: false, uri };
  }
}

export async function getInstalledUpiAppsList(): Promise<string[]> {
  try {
    const res = await NativeUpi.getInstalledUpiApps();
    if (res?.apps?.length) {
      return res.apps.map(a => a.packageName);
    }
  } catch {}
  return [];
}

export function validateVpa(vpa: string): boolean {
  if (!vpa) return false;
  const trimmed = vpa.trim();
  const vpaRegex = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/;
  return vpaRegex.test(trimmed);
}

export interface ParsedUpiData {
  pa: string;        // VPA (case-preserved)
  pn?: string;       // Payee Name
  am?: number;       // Amount if pre-set
  tn?: string;       // Note
  mc?: string;       // Merchant Category Code
  extraParams?: Record<string, string>; // Extra merchant parameters (tr, tid, orgid, mid, etc.)
  raw: string;
}

export function parseUpiUri(rawUri: string): ParsedUpiData | null {
  if (!rawUri || typeof rawUri !== 'string') return null;
  let trimmed = rawUri.trim();

  // If it's just a raw UPI ID (e.g. user scanned a text QR of someone's VPA)
  if (validateVpa(trimmed)) {
    return {
      pa: trimmed,
      pn: trimmed.split('@')[0],
      extraParams: {},
      raw: trimmed
    };
  }

  // Handle URL-encoded deep links (e.g. https://...?url=upi%3A%2F%2Fpay...)
  if (trimmed.includes('upi%3A%2F%2Fpay') || trimmed.includes('upi%3a%2f%2fpay')) {
    try {
      const decoded = decodeURIComponent(trimmed);
      const match = decoded.match(/upi:\/\/pay[^"'\s<>]*/i);
      if (match) {
        trimmed = match[0];
      }
    } catch {}
  }

  // Normalize app-specific custom schemes (tez://, bhim://, phonepe://, paytmmp://)
  let normalized = trimmed;
  if (/^(tez|bhim|phonepe|paytmmp|paytm):\/\//i.test(normalized)) {
    normalized = normalized.replace(/^[a-z0-9_-]+:\/\/(upi\/)?pay\/?\??/i, 'upi://pay?');
  }

  // Normalize upi://pay/ to upi://pay?
  if (/^upi:\/\/pay\//i.test(normalized)) {
    normalized = normalized.replace(/^upi:\/\/pay\//i, 'upi://pay?');
  }

  // Match UPI pay format or any URI with pa=
  if (/^upi:\/\/pay/i.test(normalized) || /[?&]pa=/i.test(normalized)) {
    try {
      let queryPart = '';
      const qIndex = normalized.indexOf('?');
      if (qIndex !== -1) {
        queryPart = normalized.substring(qIndex + 1);
      } else {
        queryPart = normalized.replace(/^upi:\/\/pay\/?/i, '');
      }

      // Parse query string safely
      const searchParams = new URLSearchParams(queryPart);
      let pa = searchParams.get('pa') || searchParams.get('PA');

      if (!pa) {
        // Fallback regex search for pa
        const paMatch = normalized.match(/[?&]pa=([^&]+)/i);
        if (paMatch) {
          pa = decodeURIComponent(paMatch[1]);
        }
      }

      if (!pa) return null;
      const cleanPa = pa.trim(); // Preserve original case for merchant validation

      const rawPn = searchParams.get('pn') || searchParams.get('PN');
      const pn = rawPn ? decodeURIComponent(rawPn.replace(/\+/g, ' ')).trim() : undefined;

      const rawAm = searchParams.get('am') || searchParams.get('AM');
      const am = rawAm ? parseFloat(rawAm) : undefined;

      const rawTn = searchParams.get('tn') || searchParams.get('TN');
      const tn = rawTn ? decodeURIComponent(rawTn.replace(/\+/g, ' ')).trim() : undefined;

      const mc = searchParams.get('mc') || searchParams.get('MC') || undefined;

      // Extract all extra parameters (tr, tid, orgid, mid, msid, mtid, sign, mode, etc.)
      const standardKeys = new Set(['pa', 'pn', 'am', 'tn', 'mc', 'cu', 'PA', 'PN', 'AM', 'TN', 'MC', 'CU']);
      const extraParams: Record<string, string> = {};

      searchParams.forEach((val, key) => {
        if (!standardKeys.has(key) && val) {
          extraParams[key] = decodeURIComponent(val.replace(/\+/g, ' '));
        }
      });

      // If mc is present, also keep it in extraParams for buildUpiUri
      if (mc) {
        extraParams['mc'] = mc;
      }

      return {
        pa: cleanPa,
        pn,
        am: am && !isNaN(am) ? am : undefined,
        tn,
        mc,
        extraParams,
        raw: rawUri.trim()
      };
    } catch {
      // Direct regex fallback
      const paMatch = normalized.match(/[?&]pa=([^&]+)/i);
      if (!paMatch) return null;
      const cleanPa = decodeURIComponent(paMatch[1]).trim();
      const pnMatch = normalized.match(/[?&]pn=([^&]+)/i);
      const amMatch = normalized.match(/[?&]am=([^&]+)/i);
      const tnMatch = normalized.match(/[?&]tn=([^&]+)/i);
      const mcMatch = normalized.match(/[?&]mc=([^&]+)/i);

      const extraParams: Record<string, string> = {};
      if (mcMatch) extraParams['mc'] = decodeURIComponent(mcMatch[1]);

      return {
        pa: cleanPa,
        pn: pnMatch ? decodeURIComponent(pnMatch[1].replace(/\+/g, ' ')).trim() : undefined,
        am: amMatch ? parseFloat(decodeURIComponent(amMatch[1])) : undefined,
        tn: tnMatch ? decodeURIComponent(tnMatch[1].replace(/\+/g, ' ')).trim() : undefined,
        mc: mcMatch ? decodeURIComponent(mcMatch[1]).trim() : undefined,
        extraParams,
        raw: rawUri.trim()
      };
    }
  }

  return null;
}
