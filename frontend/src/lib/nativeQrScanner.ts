import { Capacitor, registerPlugin } from '@capacitor/core';

export interface NativeQrScannerResult {
  value: string;
  success: boolean;
  cancelled?: boolean;
}

export interface NativeQrScannerPluginInterface {
  scan(): Promise<NativeQrScannerResult>;
}

export const NativeQrScanner = registerPlugin<NativeQrScannerPluginInterface>('NativeQrScanner');

/**
 * Launch native ML Kit QR scanner (Google Pay speed).
 * Returns null if not on a native platform or if the plugin fails to initialize.
 */
export async function scanQrNative(): Promise<NativeQrScannerResult | null> {
  if (!Capacitor.isNativePlatform()) {
    return null;
  }
  try {
    return await NativeQrScanner.scan();
  } catch (error) {
    console.warn('[NativeQrScanner] Launch failed, falling back to web camera:', error);
    return null;
  }
}
