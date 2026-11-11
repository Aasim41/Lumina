import QRCode from 'qrcode';

/**
 * Generates an offline QR code Data URL (PNG) from text purely on the client side.
 * Zero external network requests, 100% offline and privacy-preserving.
 */
export async function generateQrDataUrl(text: string, size = 220): Promise<string> {
  if (!text) return '';
  try {
    return await QRCode.toDataURL(text, {
      width: size,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    });
  } catch (err) {
    console.error('Failed to generate offline QR code', err);
    return '';
  }
}
