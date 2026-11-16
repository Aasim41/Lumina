'use client';

import { useState } from 'react';
import { AuthGuard } from '@/components/AuthGuard';
import { BottomNav } from '@/components/BottomNav';
import { FileUploadZone } from '@/components/FileUploadZone';
import { useExpenseData } from '@/hooks/useExpenseData';
import { ManualEntryForm } from '@/components/ManualEntryForm';
import { createTransaction } from '@/lib/api';
import { ArrowLeft } from 'lucide-react';
import { appBack } from '@/lib/utils';
import toast from 'react-hot-toast';

export default function UploadPage() {
  const { refresh } = useExpenseData();
  const [scannedReceipt, setScannedReceipt] = useState<any>(null);

  return (
    <AuthGuard>
      <div className="min-h-screen bg-[#171005] pb-24">
        <header className="px-6 py-6 safe-pt sticky top-0 z-20 bg-amber-500/10  border-b border-amber-500/30 mb-6 shadow-[0_4px_30px_rgba(245,158,11,0.15)] flex items-center gap-3">
          <button
            onClick={() => appBack('/')}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white transition-all active:scale-95 cursor-pointer"
            title="Go Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-display font-bold mb-1">Upload Data</h1>
            <p className="text-amber-300/60 text-sm">Import bank statements to categorize with AI</p>
          </div>
        </header>

        <div className="px-4">
          <FileUploadZone onUploadSuccess={refresh} onReceiptScanned={(data) => setScannedReceipt(data)} />
          
          <div className="mt-8 p-6 glass rounded-2xl">
            <h3 className="font-medium mb-2">CSV Format Requirements</h3>
            <ul className="text-sm text-text-secondary space-y-2 list-disc list-inside">
              <li>Must contain a Date column</li>
              <li>Must contain a Description/Merchant column</li>
              <li>Must contain an Amount/Debit column</li>
              <li>Supports standard bank formats (HDFC, SBI, ICICI, etc.)</li>
            </ul>
          </div>
        </div>
      </div>
      <BottomNav />
      <ManualEntryForm 
        isOpen={!!scannedReceipt} 
        onClose={() => setScannedReceipt(null)}
        initialData={scannedReceipt}
        onSubmit={async (data) => {
          await createTransaction(data);
          toast.success('Saved scanned receipt!');
          refresh();
        }}
      />
    </AuthGuard>
  );
}
