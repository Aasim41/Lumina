import * as Papa from 'papaparse';
import { cleanMerchantName, normalizeAmount } from './cleaner';
import { categorize } from './categorizer';

const MONTH_MAP: Record<string, string> = {
  jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
  jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
};

export function parseCsvDate(raw: string): string | null {
  if (!raw) return null;
  const clean = raw.trim().split(/\s+/)[0];
  if (!clean) return null;

  // 1. ISO format: YYYY-MM-DD or YYYY/MM/DD
  const isoMatch = clean.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (isoMatch) {
    const y = isoMatch[1];
    const m = isoMatch[2].padStart(2, '0');
    const d = isoMatch[3].padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // 2. Named month: DD-MMM-YYYY, DD-MMM-YY, DD MMM YYYY (e.g. 15-Aug-2024, 05-Sep-23)
  const namedMatch = clean.match(/^(\d{1,2})[-/. ]([A-Za-z]{3})[-/. ](\d{2,4})$/);
  if (namedMatch) {
    const d = namedMatch[1].padStart(2, '0');
    const monName = namedMatch[2].toLowerCase();
    const m = MONTH_MAP[monName];
    let y = namedMatch[3];
    if (y.length === 2) {
      y = parseInt(y, 10) > 50 ? `19${y}` : `20${y}`;
    }
    if (m) {
      return `${y}-${m}-${d}`;
    }
  }

  // 3. Indian bank format: DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY, DD/MM/YY, DD-MM-YY
  const dmyMatch = clean.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/);
  if (dmyMatch) {
    const d = dmyMatch[1].padStart(2, '0');
    const m = dmyMatch[2].padStart(2, '0');
    let y = dmyMatch[3];
    if (y.length === 2) {
      y = parseInt(y, 10) > 50 ? `19${y}` : `20${y}`;
    }
    const numD = parseInt(d, 10);
    const numM = parseInt(m, 10);
    if (numM >= 1 && numM <= 12 && numD >= 1 && numD <= 31) {
      return `${y}-${m}-${d}`;
    }
  }

  // 4. Fallback to native Date parser
  const parsed = new Date(raw);
  if (!isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    const d = String(parsed.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  return null;
}

export function parseCSV(file: File): Promise<Array<{date: string, merchant_raw: string, merchant_clean: string, amount: number, category: string}>> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      complete: (results) => {
        const data = results.data as string[][];
        if (!data || data.length === 0) {
          return resolve([]);
        }

        let headerRowIndex = -1;
        let dateColIdx = -1;
        let amountColIdx = -1;
        let merchantColIdx = -1;

        for (let i = 0; i < Math.min(data.length, 50); i++) {
          const row = data[i];
          if (!Array.isArray(row)) continue;
          
          const lowerRow = row.map(r => r ? String(r).toLowerCase().trim() : '');
          
          const hasDate = lowerRow.some(r => r.includes('date'));
          const hasAmount = lowerRow.some(r => r.includes('amount') || r.includes('debit') || r.includes('withdrawal'));
          
          if (hasDate && hasAmount) {
            headerRowIndex = i;
            
            lowerRow.forEach((col, idx) => {
              if (col.includes('date') && dateColIdx === -1) {
                dateColIdx = idx;
              } else if ((col.includes('amount') || col.includes('debit') || col.includes('withdrawal')) && amountColIdx === -1) {
                amountColIdx = idx;
              } else if ((col.includes('merchant') || col.includes('description') || col.includes('particulars') || col.includes('narration') || col.includes('details')) && merchantColIdx === -1) {
                merchantColIdx = idx;
              }
            });
            break;
          }
        }

        if (headerRowIndex === -1 || dateColIdx === -1 || amountColIdx === -1) {
          if (data[0] && data[0].length >= 3) {
            headerRowIndex = 0;
            dateColIdx = 0;
            merchantColIdx = 1;
            amountColIdx = 2;
          } else {
            return reject(new Error("Could not detect valid CSV format (missing date or amount columns)."));
          }
        }

        const transactions: Array<{date: string, merchant_raw: string, merchant_clean: string, amount: number, category: string}> = [];

        for (let i = headerRowIndex + 1; i < data.length; i++) {
          const row = data[i];
          if (!Array.isArray(row) || row.length <= Math.max(dateColIdx, amountColIdx)) {
            continue;
          }

          const rawDate = String(row[dateColIdx] || '').trim();
          const rawAmount = row[amountColIdx];
          const rawMerchant = merchantColIdx !== -1 ? String(row[merchantColIdx] || '') : 'Unknown';

          const amount = normalizeAmount(rawAmount);
          if (amount === 0) {
            continue;
          }

          const formattedDate = parseCsvDate(rawDate);
          if (!formattedDate) {
            continue;
          }

          const merchant_clean = cleanMerchantName(rawMerchant);
          const category = categorize(merchant_clean);

          transactions.push({
            date: formattedDate,
            merchant_raw: rawMerchant,
            merchant_clean,
            amount,
            category
          });
        }

        resolve(transactions);
      },
      error: (error: Error) => {
        reject(error);
      }
    });
  });
}
