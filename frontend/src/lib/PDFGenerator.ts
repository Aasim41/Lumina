import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

export interface Transaction {
  id?: string;
  date: string;
  merchant_clean: string;
  merchant_raw?: string;
  category: string;
  amount: number;
  type?: 'debit' | 'credit';
}

export interface StatementOptions {
  periodTitle?: string;
  startDate?: string;
  endDate?: string;
  purpose?: string; // 'Tax Filing' | 'Monthly Review' | 'Expense Audit'
}

export async function generateMonthlyStatement(
  user: any,
  transactions: Transaction[],
  periodLabel: string,
  options?: StatementOptions
) {
  // Create a new PDF document in portrait A4
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Primary brand emerald colors
  const primaryEmerald: [number, number, number] = [16, 185, 129]; // #10b981
  const darkSlate: [number, number, number] = [15, 23, 42];        // #0f172a
  const softGray: [number, number, number] = [241, 245, 249];

  // Helper function to detect credit
  const isCredit = (t: Transaction) => t.type === 'credit' || ['Income', 'Salary', 'Refund'].includes(t.category);

  // 1. Calculate Core Totals & Metrics
  let totalDebits = 0;
  let totalCredits = 0;
  const categoryMap: Record<string, { amount: number; count: number }> = {};

  transactions.forEach((txn) => {
    if (isCredit(txn)) {
      totalCredits += txn.amount;
    } else {
      totalDebits += txn.amount;
      const cat = txn.category || 'Miscellaneous';
      if (!categoryMap[cat]) categoryMap[cat] = { amount: 0, count: 0 };
      categoryMap[cat].amount += txn.amount;
      categoryMap[cat].count += 1;
    }
  });

  const netCashFlow = totalCredits - totalDebits;

  // 2. Document Header Banner
  doc.setFillColor(darkSlate[0], darkSlate[1], darkSlate[2]);
  doc.rect(0, 0, 210, 38, 'F');

  // Accent stripe
  doc.setFillColor(primaryEmerald[0], primaryEmerald[1], primaryEmerald[2]);
  doc.rect(0, 38, 210, 2, 'F');

  // Brand Name & Tagline
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(primaryEmerald[0], primaryEmerald[1], primaryEmerald[2]);
  doc.text('LUMINA', 14, 18);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(200, 200, 200);
  doc.text('FINANCIAL STATEMENT & TAX REPORT', 14, 25);
  doc.text(`Generated: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`, 14, 31);

  // Statement Metadata (Right-Aligned)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text(periodLabel.toUpperCase(), 196, 18, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(180, 180, 180);
  doc.text(`Account: ${user?.name || 'Verified User'}`, 196, 25, { align: 'right' });
  if (options?.purpose) {
    doc.text(`Purpose: ${options.purpose}`, 196, 31, { align: 'right' });
  }

  // 3. Executive Summary KPI Grid (4 Metrics)
  const kpiY = 47;
  const kpiW = 44;
  const kpiH = 20;

  const kpis = [
    { title: 'TOTAL EXPENSES', value: `INR ${totalDebits.toLocaleString('en-IN')}`, color: [225, 29, 72] }, // Rose
    { title: 'TOTAL INCOME', value: `INR ${totalCredits.toLocaleString('en-IN')}`, color: [16, 185, 129] }, // Emerald
    { title: 'NET CASH FLOW', value: `${netCashFlow >= 0 ? '+' : ''}INR ${netCashFlow.toLocaleString('en-IN')}`, color: netCashFlow >= 0 ? [16, 185, 129] : [225, 29, 72] },
    { title: 'TOTAL TRANSACTIONS', value: `${transactions.length}`, color: [59, 130, 246] }, // Blue
  ];

  kpis.forEach((kpi, idx) => {
    const x = 14 + idx * 47;
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(x, kpiY, kpiW, kpiH, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(kpi.title, x + 4, kpiY + 6);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(kpi.color[0], kpi.color[1], kpi.color[2]);
    doc.text(kpi.value, x + 4, kpiY + 14);
  });

  // 4. Category Spending Breakdown Table
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(30, 41, 59);
  doc.text('Category Expense Breakdown', 14, 76);

  const catRows = Object.entries(categoryMap)
    .sort((a, b) => b[1].amount - a[1].amount)
    .map(([category, data]) => {
      const pct = totalDebits > 0 ? ((data.amount / totalDebits) * 100).toFixed(1) : '0.0';
      return [
        category,
        `INR ${data.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        `${pct}%`,
        `${data.count}`
      ];
    });

  autoTable(doc, {
    head: [['Category', 'Total Spent', 'Share (%)', 'Txn Count']],
    body: catRows.length > 0 ? catRows : [['No expense categories recorded', 'INR 0.00', '0%', '0']],
    startY: 80,
    theme: 'striped',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
      cellPadding: 2.5,
    },
    styles: {
      fontSize: 8,
      cellPadding: 2,
      textColor: [30, 41, 59],
    },
    alternateRowStyles: {
      fillColor: softGray,
    },
    margin: { left: 14, right: 14 },
  });

  // 5. Detailed Transaction Ledger
  const currentY = (doc as any).lastAutoTable.finalY + 10;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(30, 41, 59);
  doc.text('Itemized Transaction Ledger', 14, currentY);

  const sortedTxns = [...transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const ledgerRows = sortedTxns.map((txn) => {
    const isCreditTx = isCredit(txn);
    const sign = isCreditTx ? '+' : '-';
    return [
      txn.date,
      isCreditTx ? 'CREDIT' : 'DEBIT',
      txn.merchant_clean || txn.merchant_raw || 'Unknown Payee',
      txn.category || 'Miscellaneous',
      `${sign}INR ${txn.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    ];
  });

  autoTable(doc, {
    head: [['Date', 'Type', 'Merchant / Payee', 'Category', 'Amount']],
    body: ledgerRows.length > 0 ? ledgerRows : [['-', '-', 'No transactions found', '-', 'INR 0.00']],
    startY: currentY + 4,
    theme: 'grid',
    headStyles: {
      fillColor: primaryEmerald,
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
      cellPadding: 2.5,
    },
    styles: {
      fontSize: 7.5,
      cellPadding: 2,
      textColor: [30, 41, 59],
    },
    columnStyles: {
      0: { cellWidth: 24 },
      1: { cellWidth: 20 },
      2: { cellWidth: 'auto' },
      3: { cellWidth: 35 },
      4: { cellWidth: 32, halign: 'right' },
    },
    alternateRowStyles: {
      fillColor: [250, 250, 250],
    },
    margin: { left: 14, right: 14 },
  });

  // 6. Professional Footer on All Pages
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);

    doc.text(
      'Confidential • Prepared with Lumina Smart Expense (100% On-Device Financial Analytics)',
      14,
      doc.internal.pageSize.getHeight() - 8
    );

    doc.text(
      `Page ${i} of ${pageCount}`,
      doc.internal.pageSize.getWidth() - 14,
      doc.internal.pageSize.getHeight() - 8,
      { align: 'right' }
    );
  }

  // 7. Native Export / Share or Web Browser Download
  const cleanTitle = periodLabel.replace(/[^a-zA-Z0-9_-]/g, '_');
  const fileName = `Lumina_Statement_${cleanTitle}.pdf`;

  if (Capacitor.isNativePlatform()) {
    try {
      const pdfBase64 = doc.output('datauristring').split(',')[1];
      const savedFile = await Filesystem.writeFile({
        path: fileName,
        data: pdfBase64,
        directory: Directory.Cache,
      });

      await Share.share({
        title: `Lumina Financial Statement - ${periodLabel}`,
        text: `Here is your Lumina financial statement for ${periodLabel}`,
        url: savedFile.uri,
        dialogTitle: 'Share PDF Statement',
      });
    } catch (e) {
      console.error('Error saving/sharing PDF natively:', e);
      throw e;
    }
  } else {
    doc.save(fileName);
  }
}
