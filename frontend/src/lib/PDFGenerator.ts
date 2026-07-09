import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

export interface Transaction {
  id: string;
  date: string;
  merchant_clean: string;
  merchant_raw: string;
  category: string;
  amount: number;
}

export async function generateMonthlyStatement(
  user: any,
  transactions: Transaction[],
  monthName: string,
  totalSpent: number
) {
  // Create a new PDF document
  const doc = new jsPDF();

  // Primary brand color: #7cc544 -> RGB: 124, 197, 68
  const brandColor: [number, number, number] = [124, 197, 68];

  // Title / Header
  doc.setFontSize(24);
  doc.setTextColor(brandColor[0], brandColor[1], brandColor[2]);
  doc.text('LUMINA', 14, 22);

  doc.setFontSize(14);
  doc.setTextColor(100);
  doc.text('Financial Co-Pilot', 14, 30);

  // Statement Info
  doc.setFontSize(16);
  doc.setTextColor(40);
  doc.text(`Monthly Statement: ${monthName}`, 14, 45);

  doc.setFontSize(12);
  doc.text(`Account Holder: ${user?.name || 'Guest'}`, 14, 55);
  doc.text(`Total Monthly Budget: ₹${user?.monthly_budget || 0}`, 14, 62);
  doc.text(`Total Spent: ₹${totalSpent.toFixed(2)}`, 14, 69);
  
  const remaining = (user?.monthly_budget || 0) - totalSpent;
  doc.text(`Remaining Budget: ₹${remaining.toFixed(2)}`, 14, 76);

  // Table Data
  const tableColumn = ["Date", "Merchant", "Category", "Amount"];
  const tableRows: any[] = [];

  // Sort transactions by date (oldest to newest)
  const sortedTxns = [...transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  sortedTxns.forEach((txn: any) => {
    const txnData = [
      txn.date,
      txn.merchant_clean || txn.merchant_raw || 'Unknown Merchant',
      txn.category,
      `₹${txn.amount.toFixed(2)}`
    ];
    tableRows.push(txnData);
  });

  autoTable(doc, {
    head: [tableColumn],
    body: tableRows,
    startY: 85,
    theme: 'grid',
    headStyles: { fillColor: brandColor },
    styles: { fontSize: 10, cellPadding: 3 },
    alternateRowStyles: { fillColor: [245, 245, 245] },
  });

  // Footer
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(10);
    doc.setTextColor(150);
    doc.text(
      `Generated securely by Lumina • Page ${i} of ${pageCount}`,
      doc.internal.pageSize.getWidth() / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
  }

  const fileName = `Lumina_Statement_${monthName.replace(/\s+/g, '_')}.pdf`;

  if (Capacitor.isNativePlatform()) {
    try {
      // Get PDF as base64 string
      const pdfBase64 = doc.output('datauristring').split(',')[1];
      
      const savedFile = await Filesystem.writeFile({
        path: fileName,
        data: pdfBase64,
        directory: Directory.Cache
      });
      
      await Share.share({
        title: 'Monthly Statement',
        text: `Here is your Lumina monthly statement for ${monthName}`,
        url: savedFile.uri,
        dialogTitle: 'Share PDF'
      });
    } catch (e) {
      console.error('Error saving/sharing PDF natively:', e);
      throw e;
    }
  } else {
    // Download PDF normally on web
    doc.save(fileName);
  }
}
