import * as Papa from 'papaparse';
import { cleanMerchantName, normalizeAmount } from './cleaner';
import { categorize } from './categorizer';

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

          const dateObj = new Date(rawDate);
          if (isNaN(dateObj.getTime())) {
            continue;
          }
          const formattedDate = dateObj.toISOString().split('T')[0];

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
