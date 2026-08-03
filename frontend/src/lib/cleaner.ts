export function cleanMerchantName(name: string): string {
  if (typeof name !== 'string') {
    return "Unknown";
  }
  let cleaned = name.replace(/[-_]\d{3,}$/, '');
  cleaned = cleaned.replace(/_/g, ' ').replace(/-/g, ' ');
  cleaned = cleaned.replace(/\s+/g, ' ');
  cleaned = cleaned.trim();
  // Convert to Title Case
  return cleaned.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

export function normalizeAmount(value: string | number): number {
  if (value === null || value === undefined) {
    return 0.0;
  }
  if (typeof value === 'number') {
    return Math.abs(value);
  }
  let amountStr = String(value).trim();
  amountStr = amountStr.replace(/[^\d.-]/g, '');
  const parsed = parseFloat(amountStr);
  if (isNaN(parsed)) {
    return 0.0;
  }
  return Math.abs(parsed);
}
