import jsQR from 'jsqr';

/**
 * Multi-strategy QR decoder — used for gallery image uploads and screenshots.
 * Handles Indian shop standee QR codes photographed at angles, with glare or branding.
 */
export function decodeQrFromImageSrc(src: string): Promise<string | null> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve(null);
      return;
    }
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) { resolve(null); return; }

      let w = img.naturalWidth || img.width;
      let h = img.naturalHeight || img.height;

      // Strategy 1: Full resolution (up to 2048px)
      const maxDim = 2048;
      let sw = w, sh = h;
      if (sw > maxDim || sh > maxDim) {
        if (sw > sh) { sh = Math.round((sh * maxDim) / sw); sw = maxDim; }
        else { sw = Math.round((sw * maxDim) / sh); sh = maxDim; }
      }
      canvas.width = sw;
      canvas.height = sh;
      ctx.drawImage(img, 0, 0, sw, sh);
      let imageData = ctx.getImageData(0, 0, sw, sh);
      let code = jsQR(imageData.data, sw, sh, { inversionAttempts: 'attemptBoth' });
      if (code?.data) { resolve(code.data); return; }

      // Strategy 2: Center crop 60% (common for standees photographed with padding)
      const cropRatio = 0.6;
      const cx = Math.round(sw * (1 - cropRatio) / 2);
      const cy = Math.round(sh * (1 - cropRatio) / 2);
      const cw = Math.round(sw * cropRatio);
      const ch = Math.round(sh * cropRatio);
      imageData = ctx.getImageData(cx, cy, cw, ch);
      code = jsQR(imageData.data, cw, ch, { inversionAttempts: 'attemptBoth' });
      if (code?.data) { resolve(code.data); return; }

      // Strategy 3: Grayscale + contrast enhancement
      canvas.width = sw;
      canvas.height = sh;
      ctx.drawImage(img, 0, 0, sw, sh);
      imageData = ctx.getImageData(0, 0, sw, sh);
      const data = imageData.data;
      for (let i = 0; i < data.length; i += 4) {
        const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        const enhanced = Math.min(255, Math.max(0, (gray - 128) * 1.8 + 128));
        data[i] = data[i + 1] = data[i + 2] = enhanced;
      }
      code = jsQR(data, sw, sh, { inversionAttempts: 'attemptBoth' });
      if (code?.data) { resolve(code.data); return; }

      // Strategy 4: Aggressive binarization
      for (let i = 0; i < data.length; i += 4) {
        const v = data[i] > 140 ? 255 : 0;
        data[i] = data[i + 1] = data[i + 2] = v;
      }
      code = jsQR(data, sw, sh, { inversionAttempts: 'attemptBoth' });
      if (code?.data) { resolve(code.data); return; }

      // Strategy 5: Lower resolution (640px)
      const lowDim = 640;
      let lw = w, lh = h;
      if (lw > lh) { lh = Math.round((lh * lowDim) / lw); lw = lowDim; }
      else { lw = Math.round((lw * lowDim) / lh); lh = lowDim; }
      canvas.width = lw;
      canvas.height = lh;
      ctx.drawImage(img, 0, 0, lw, lh);
      imageData = ctx.getImageData(0, 0, lw, lh);
      code = jsQR(imageData.data, lw, lh, { inversionAttempts: 'attemptBoth' });
      if (code?.data) { resolve(code.data); return; }

      resolve(null);
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
}
