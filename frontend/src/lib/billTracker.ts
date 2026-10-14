/**
 * Bill Due Date & Statement Tracker
 * Automatically detects credit card statements and utility bills from SMS,
 * and tracks due dates and amounts.
 */

export interface TrackedBill {
  id: string;
  title: string;
  amount: number;
  dueDate: string; // YYYY-MM-DD
  daysLeft: number;
  isPaid: boolean;
  type: 'credit_card' | 'utility' | 'loan' | 'other';
  smsHash?: string;
  createdAt: string;
}

const STORAGE_KEY = 'lumina_tracked_bills';

function parseDateStringToISO(dateStr: string): string | null {
  // Support formats: 25-Oct-26, 25/10/2026, 25-10-2026, 25 Oct 2026, 25Oct26
  const clean = dateStr.trim();

  // Try standard DD/MM/YYYY or DD-MM-YYYY
  const numMatch = clean.match(/^(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{2,4})$/);
  if (numMatch) {
    const [, d, m, y] = numMatch;
    const year = y.length === 2 ? '20' + y : y;
    return `${year}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // Try 25-Oct-2026 or 25-Oct-26 or 25Oct26
  const monthNames: Record<string, string> = {
    jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
    jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
  };
  const textMatch = clean.match(/(\d{1,2})\s*[-–\/\s]?\s*([A-Za-z]{3,9})\s*[-–\/\s]?\s*(\d{2,4})/);
  if (textMatch) {
    const [, d, mon, y] = textMatch;
    const m = monthNames[mon.slice(0, 3).toLowerCase()];
    if (m) {
      const year = y.length === 2 ? '20' + y : y;
      return `${year}-${m}-${d.padStart(2, '0')}`;
    }
  }

  return null;
}

export function parseBillFromSMS(body: string, smsHash?: string): TrackedBill | null {
  if (!body) return null;

  // Check if it's a bill due SMS
  const isBillSMS =
    /\b(?:bill|due|statement|min(?:\s*imum)?\s*due|total\s*due|payment\s*due)\b/i.test(body) &&
    /\b(?:due\s*(?:on|date|by)|before|payment\s*by)\b/i.test(body);

  if (!isBillSMS) return null;

  // Extract amount
  const amountMatch =
    body.match(/(?:total\s*(?:amount\s*)?due|amt\s*due|bill\s*(?:amount|amt)?|amount|due\s*amount)\s*(?:is|:|-)?\s*(?:rs\.?|inr\.?|₹)?\s*([0-9,]+(?:\.[0-9]{1,2})?)/i) ||
    body.match(/(?:rs\.?|inr\.?|₹)\s*([0-9,]+(?:\.[0-9]{1,2})?)\s*(?:is\s+due|due\s+on)/i);

  if (!amountMatch) return null;
  const amount = parseFloat(amountMatch[1].replace(/,/g, ''));
  if (isNaN(amount) || amount <= 0) return null;

  // Extract due date
  const dateMatch =
    body.match(/(?:due\s*(?:on|date|by)|before|by\s+date|payment\s*by)\s*[:=-]?\s*([0-9]{1,2}[-\/\s]+[A-Za-z0-9]{3,9}[-\/\s]+[0-9]{2,4})/i) ||
    body.match(/(?:due\s*(?:on|date|by)|before)\s*[:=-]?\s*([0-9]{1,2}[-\/\.][0-9]{1,2}[-\/\.][0-9]{2,4})/i);

  if (!dateMatch) return null;
  const dueDate = parseDateStringToISO(dateMatch[1]);
  if (!dueDate) return null;

  // Determine bill title & type
  let title = 'Upcoming Bill';
  let type: TrackedBill['type'] = 'utility';

  if (/\b(?:card|credit\s*card)\b/i.test(body)) {
    type = 'credit_card';
    const bank = body.match(/\b(sbi|hdfc|icici|axis|kotak|rbl|indusind|onecard|amex|citi)\b/i);
    const cardMask = body.match(/(?:ending\s*(?:in|with)?|card\s*no\.?)\s*([xX*0-9]{3,})/i);
    title = `${bank ? bank[1].toUpperCase() : 'Credit'} Card ${cardMask ? `(${cardMask[1]})` : ''}`.trim();
  } else if (/\b(?:electricity|power|bescom|mseb|bses|tata\s*power|adani)\b/i.test(body)) {
    title = 'Electricity Bill';
    type = 'utility';
  } else if (/\b(?:airtel|jio|vi\b|broadband|wifi|fiber)\b/i.test(body)) {
    title = 'Broadband / Mobile Bill';
    type = 'utility';
  } else if (/\b(?:gas|lpg|igl|mahanagar)\b/i.test(body)) {
    title = 'Gas Cylinder / Piped Gas';
    type = 'utility';
  } else if (/\b(?:loan|emi)\b/i.test(body)) {
    title = 'Loan EMI';
    type = 'loan';
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  const daysLeft = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  // Only track bills due within the next 45 days or overdue by at most 5 days
  if (daysLeft < -5 || daysLeft > 45) return null;

  return {
    id: 'bill_' + (smsHash || Math.random().toString(36).substring(2, 9)),
    title,
    amount,
    dueDate,
    daysLeft,
    isPaid: false,
    type,
    smsHash,
    createdAt: new Date().toISOString(),
  };
}

export function getTrackedBills(): TrackedBill[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const bills: TrackedBill[] = JSON.parse(raw);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Recalculate daysLeft dynamically
    return bills.map(b => {
      const due = new Date(b.dueDate);
      due.setHours(0, 0, 0, 0);
      const daysLeft = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return { ...b, daysLeft };
    });
  } catch (e) {
    return [];
  }
}

export function saveTrackedBill(bill: TrackedBill): void {
  if (typeof window === 'undefined') return;
  const existing = getTrackedBills();
  // Deduplicate by smsHash or title+dueDate
  const filtered = existing.filter(b => {
    if (bill.smsHash && b.smsHash === bill.smsHash) return false;
    if (b.title === bill.title && b.dueDate === bill.dueDate) return false;
    return true;
  });
  filtered.push(bill);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  window.dispatchEvent(new Event('lumina_bills_updated'));
}

export function markBillAsPaid(id: string): void {
  if (typeof window === 'undefined') return;
  const existing = getTrackedBills();
  const updated = existing.map(b => (b.id === id ? { ...b, isPaid: true } : b));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  window.dispatchEvent(new Event('lumina_bills_updated'));
}

export function deleteTrackedBill(id: string): void {
  if (typeof window === 'undefined') return;
  const existing = getTrackedBills();
  const updated = existing.filter(b => b.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  window.dispatchEvent(new Event('lumina_bills_updated'));
}
