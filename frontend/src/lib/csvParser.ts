import PapaModule from 'papaparse';
const Papa = (PapaModule as any)?.parse ? (PapaModule as any) : ((PapaModule as any)?.default || PapaModule);
import { cleanMerchantName, normalizeAmount } from './cleaner';
import { categorize } from './categorizer';

const MONTH_MAP: Record<string, string> = {
  jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
  jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
};

/**
 * Normalizes diverse bank statement date strings into canonical YYYY-MM-DD.
 * Supports ISO, Indian standard DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY,
 * Indian 2-digit year DD/MM/YY, and named months (e.g. 15-Aug-2024).
 * Returns null if string cannot be parsed as a valid calendar date.
 */
export function normalizeBankDate(dateStr: string): string | null {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const clean = dateStr.trim().split(/\s+|T/)[0];
  if (!clean) return null;

  // 1. ISO format: YYYY-MM-DD, YYYY/MM/DD, YYYY.MM.DD
  const isoMatch = clean.match(/^(\d{4})[/\-.]([01]?\d)[/\-.]([0-3]?\d)$/);
  if (isoMatch) {
    const y = isoMatch[1];
    const m = isoMatch[2].padStart(2, '0');
    const d = isoMatch[3].padStart(2, '0');
    if (Number(m) >= 1 && Number(m) <= 12 && Number(d) >= 1 && Number(d) <= 31) {
      return `${y}-${m}-${d}`;
    }
  }

  // 2. Named month: 15-Aug-2024, 15/Aug/2024, 15 Aug 2024, 15-AUG-24, 05-Sep-23
  const namedMatch = clean.match(/^([0-3]?\d)[/\s\-.]([a-zA-Z]{3,9})[/\s\-.](\d{2,4})$/);
  if (namedMatch) {
    const d = namedMatch[1].padStart(2, '0');
    const monStr = namedMatch[2].toLowerCase().substring(0, 3);
    const m = MONTH_MAP[monStr];
    let y = namedMatch[3];
    if (y.length === 2) {
      const yy = parseInt(y, 10);
      y = String(yy >= 70 ? 1900 + yy : 2000 + yy);
    }
    if (m && Number(d) >= 1 && Number(d) <= 31) {
      return `${y}-${m}-${d}`;
    }
  }

  // 3. Indian standard 4-digit year: DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY
  const ddmmyyyyMatch = clean.match(/^([0-3]?\d)[/\-.]([01]?\d)[/\-.](\d{4})$/);
  if (ddmmyyyyMatch) {
    const d = ddmmyyyyMatch[1].padStart(2, '0');
    const m = ddmmyyyyMatch[2].padStart(2, '0');
    const y = ddmmyyyyMatch[3];
    if (Number(m) >= 1 && Number(m) <= 12 && Number(d) >= 1 && Number(d) <= 31) {
      return `${y}-${m}-${d}`;
    }
  }

  // 4. Indian short year: DD/MM/YY, DD-MM-YY, DD.MM.YY
  const ddmmyyMatch = clean.match(/^([0-3]?\d)[/\-.]([01]?\d)[/\-.](\d{2})$/);
  if (ddmmyyMatch) {
    const d = ddmmyyMatch[1].padStart(2, '0');
    const m = ddmmyyMatch[2].padStart(2, '0');
    const yy = parseInt(ddmmyyMatch[3], 10);
    const y = String(yy >= 70 ? 1900 + yy : 2000 + yy);
    if (Number(m) >= 1 && Number(m) <= 12 && Number(d) >= 1 && Number(d) <= 31) {
      return `${y}-${m}-${d}`;
    }
  }

  // 5. Fallback Date parse (local calendar)
  const fallback = new Date(dateStr);
  if (!isNaN(fallback.getTime())) {
    const y = fallback.getFullYear();
    const m = String(fallback.getMonth() + 1).padStart(2, '0');
    const d = String(fallback.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  return null;
}

export const parseCsvDate = normalizeBankDate;

export interface ParsedCsvTransaction {
  date: string;
  merchant_raw: string;
  merchant_clean: string;
  amount: number;
  category: string;
  type?: 'debit' | 'credit';
}

/**
 * Parses bank statement CSV data from either a browser File object or a raw string.
 * Supports Indian bank formats (SBI, HDFC, ICICI, Axis, Kotak, PNB),
 * dual debit/credit column layouts, and multi-format date normalization.
 */
export function parseCSV(fileOrText: File | string): Promise<ParsedCsvTransaction[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(fileOrText as any, {
      skipEmptyLines: true,
      complete: (results) => {
        const data = results.data as string[][];
        if (!data || data.length === 0) {
          return resolve([]);
        }

        let headerRowIndex = -1;
        let dateColIdx = -1;
        let amountColIdx = -1;
        let debitColIdx = -1;
        let creditColIdx = -1;
        let merchantColIdx = -1;
        let typeColIdx = -1;

        for (let i = 0; i < Math.min(data.length, 50); i++) {
          const row = data[i];
          if (!Array.isArray(row)) continue;
          
          const lowerRow = row.map(r => r ? String(r).toLowerCase().trim() : '');
          
          const hasDate = lowerRow.some(r => r.includes('date'));
          const hasAmount = lowerRow.some(r => 
            r.includes('amount') || r.includes('debit') || r.includes('withdrawal') || r.includes('deposit') || r.includes('credit')
          );
          
          if (hasDate && hasAmount) {
            headerRowIndex = i;
            
            lowerRow.forEach((col, idx) => {
              if (col.includes('date') && dateColIdx === -1) {
                dateColIdx = idx;
              } else if ((col.includes('withdrawal') || col.includes('debit') || col === 'dr') && debitColIdx === -1) {
                debitColIdx = idx;
              } else if ((col.includes('deposit') || col.includes('credit') || col === 'cr') && creditColIdx === -1) {
                creditColIdx = idx;
              } else if (col.includes('amount') && amountColIdx === -1) {
                amountColIdx = idx;
              } else if ((col.includes('type') || col === 'txn_type' || col === 'transaction_type') && typeColIdx === -1) {
                typeColIdx = idx;
              } else if ((col.includes('merchant') || col.includes('description') || col.includes('particulars') || col.includes('narration') || col.includes('details')) && merchantColIdx === -1) {
                merchantColIdx = idx;
              }
            });
            break;
          }
        }

        if (headerRowIndex === -1 || dateColIdx === -1 || (amountColIdx === -1 && debitColIdx === -1 && creditColIdx === -1)) {
          if (data[0] && data[0].length >= 3) {
            headerRowIndex = 0;
            dateColIdx = 0;
            merchantColIdx = 1;
            amountColIdx = 2;
          } else {
            return reject(new Error("Could not detect valid CSV format (missing date or amount columns)."));
          }
        }

        const transactions: ParsedCsvTransaction[] = [];

        for (let i = headerRowIndex + 1; i < data.length; i++) {
          const row = data[i];
          if (!Array.isArray(row)) continue;

          const rawDate = dateColIdx !== -1 ? String(row[dateColIdx] || '').trim() : '';
          const formattedDate = normalizeBankDate(rawDate);
          if (!formattedDate) {
            continue;
          }

          const rawMerchant = merchantColIdx !== -1 ? String(row[merchantColIdx] || '') : 'Unknown';
          let amount = 0;
          let txnType: 'debit' | 'credit' = 'debit';

          if (debitColIdx !== -1 && creditColIdx !== -1) {
            const rawDebit = row[debitColIdx];
            const rawCredit = row[creditColIdx];
            const debitAmt = normalizeAmount(rawDebit);
            const creditAmt = normalizeAmount(rawCredit);

            if (debitAmt > 0) {
              amount = debitAmt;
              txnType = 'debit';
            } else if (creditAmt > 0) {
              amount = creditAmt;
              txnType = 'credit';
            } else {
              continue;
            }
          } else if (debitColIdx !== -1) {
            amount = normalizeAmount(row[debitColIdx]);
            if (amount === 0) continue;
            txnType = 'debit';
          } else if (creditColIdx !== -1) {
            amount = normalizeAmount(row[creditColIdx]);
            if (amount === 0) continue;
            txnType = 'credit';
          } else if (amountColIdx !== -1) {
            const rawAmount = row[amountColIdx];
            amount = normalizeAmount(rawAmount);
            if (amount === 0) continue;

            if (typeColIdx !== -1) {
              const typeStr = String(row[typeColIdx] || '').toLowerCase().trim();
              if (typeStr.includes('cr') || typeStr.includes('credit') || typeStr.includes('deposit')) {
                txnType = 'credit';
              }
            }
          } else {
            continue;
          }

          const merchant_clean = cleanMerchantName(rawMerchant);
          let category = categorize(merchant_clean);
          if (txnType === 'credit' && category === 'Miscellaneous') {
            category = 'Income';
          }

          transactions.push({
            date: formattedDate,
            merchant_raw: rawMerchant,
            merchant_clean,
            amount,
            category,
            type: txnType,
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
