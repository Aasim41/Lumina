'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, File, CheckCircle, XCircle } from 'lucide-react';
import { uploadCSV, uploadReceipt, confirmReceipt } from '@/lib/api';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { Spinner } from './ui/Spinner';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

export function FileUploadZone({ onUploadSuccess, onReceiptScanned }: { onUploadSuccess?: () => void, onReceiptScanned?: (data: any) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'success' | 'error' | 'review'>('idle');
  const [result, setResult] = useState<any>(null);
  const [receiptData, setReceiptData] = useState<any>(null);
  const router = useRouter();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
      setStatus('idle');
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024, // 10MB
  });

  const handleUpload = async () => {
    if (!file) return;
    
    setStatus('uploading');
    try {
      if (file.name.toLowerCase().endsWith('.csv')) {
        const response = await uploadCSV(file);
        setResult(response);
        setStatus('success');
        toast.success(`Imported ${response.rows_processed} transactions!`);
        if (onUploadSuccess) onUploadSuccess();
      } else {
        const response = await uploadReceipt(file);
        setReceiptData(response);
        setStatus('review');
        toast.success('Receipt scanned successfully! Please review items.');
      }
    } catch (error: any) {
      setStatus('error');
      toast.error(error.message || 'Upload failed');
    }
  };

  if (status === 'success' && result) {
    return (
      <Card className="p-8 text-center animate-fadeIn border-success/30 bg-success/5">
        <div className="w-16 h-16 bg-success/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-8 h-8 text-success" />
        </div>
        <h3 className="text-xl font-display font-bold text-text-primary mb-2">Upload Complete!</h3>
        <p className="text-text-secondary mb-6">
          Successfully processed transactions.
        </p>
        <div className="flex gap-4 justify-center">
          <Button variant="secondary" onClick={() => { setFile(null); setStatus('idle'); setResult(null); }}>Upload Another</Button>
          <Button onClick={() => router.push('/transactions')}>View Transactions</Button>
        </div>
      </Card>
    );
  }

  const handleConfirmReceipt = async () => {
    try {
      setStatus('uploading');
      await confirmReceipt(receiptData);
      setStatus('success');
      setResult({ rows_processed: receiptData.items.length, categories_found: 1 });
      toast.success('Transactions saved!');
      if (onUploadSuccess) onUploadSuccess();
    } catch (e: any) {
      toast.error(e.message || 'Failed to save');
      setStatus('review');
    }
  };

  if (status === 'review' && receiptData) {
    const updateItem = (idx: number, field: string, val: any) => {
      const newItems = [...receiptData.items];
      newItems[idx] = { ...newItems[idx], [field]: val };
      setReceiptData({ ...receiptData, items: newItems });
    };

    const removeItem = (idx: number) => {
      const newItems = [...receiptData.items];
      newItems.splice(idx, 1);
      setReceiptData({ ...receiptData, items: newItems });
    };

    return (
      <Card className="p-6 animate-fadeIn max-h-[70vh] overflow-y-auto">
        <h3 className="text-xl font-display font-bold text-text-primary mb-4">Review Receipt</h3>
        
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-xs text-text-secondary mb-1">Merchant</label>
            <input 
              className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-primary" 
              value={receiptData.merchant} 
              onChange={e => setReceiptData({...receiptData, merchant: e.target.value})} 
            />
          </div>
          <div>
            <label className="block text-xs text-text-secondary mb-1">Date</label>
            <input 
              type="date"
              className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-primary" 
              value={receiptData.date} 
              onChange={e => setReceiptData({...receiptData, date: e.target.value})} 
            />
          </div>
        </div>

        <div className="space-y-3 mb-6">
          <div className="text-sm font-medium text-text-primary mb-2">Line Items ({receiptData.items.length})</div>
          {receiptData.items.map((item: any, idx: number) => (
            <div key={idx} className="flex items-center gap-2 bg-white/5 p-3 rounded-xl border border-white/5">
              <input 
                className="flex-1 bg-transparent text-sm text-white focus:outline-none" 
                value={item.name} 
                onChange={e => updateItem(idx, 'name', e.target.value)}
                placeholder="Item name"
              />
              <div className="w-16">
                <input 
                  type="number"
                  className="w-full bg-black/20 rounded p-1 text-sm text-white focus:outline-none text-center" 
                  value={item.qty} 
                  onChange={e => updateItem(idx, 'qty', parseInt(e.target.value) || 1)}
                  placeholder="Qty"
                />
              </div>
              <div className="w-24">
                <input 
                  type="number"
                  className="w-full bg-black/20 rounded p-1 text-sm text-white focus:outline-none text-right" 
                  value={item.price} 
                  onChange={e => updateItem(idx, 'price', parseFloat(e.target.value) || 0)}
                  placeholder="Price"
                />
              </div>
              <button onClick={() => removeItem(idx)} className="p-1 text-red-400 hover:bg-red-400/10 rounded">
                <XCircle className="w-4 h-4" />
              </button>
            </div>
          ))}
          {receiptData.items.length === 0 && (
            <div className="text-center p-4 text-text-secondary text-sm">No items found.</div>
          )}
        </div>

        <div className="flex justify-between items-center pt-4 border-t border-white/10 mb-6">
          <div className="text-text-secondary">Tax: ₹{receiptData.tax_amount?.toFixed(2) || '0.00'}</div>
          <div className="text-lg font-bold text-primary">Total: ₹{receiptData.total_amount?.toFixed(2) || '0.00'}</div>
        </div>

        <div className="flex gap-4">
          <Button variant="secondary" className="flex-1" onClick={() => { setStatus('idle'); setFile(null); }}>Cancel</Button>
          <Button className="flex-1" onClick={handleConfirmReceipt} disabled={receiptData.items.length === 0}>
            Confirm & Save
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4 animate-fadeIn">
      <div 
        {...getRootProps()} 
        className={cn(
          "border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-200",
          isDragActive ? "border-primary bg-primary/5 scale-[1.02]" : "border-white/20 glass hover:border-primary/50",
          status === 'uploading' && "pointer-events-none opacity-50"
        )}
      >
        <input {...getInputProps()} />
        
        {file ? (
          <div className="flex flex-col items-center">
            <div className="p-4 bg-primary/20 rounded-full text-primary mb-4">
              <File className="w-8 h-8" />
            </div>
            <p className="font-medium text-text-primary">{file.name}</p>
            <p className="text-sm text-text-secondary mt-1">{(file.size / 1024).toFixed(1)} KB</p>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <div className="p-4 bg-white/5 rounded-full text-text-secondary mb-4">
              <UploadCloud className="w-8 h-8" />
            </div>
            <p className="font-medium text-text-primary mb-1">Drag & drop your file here</p>
            <p className="text-sm text-text-secondary">CSV, Docs, Images, PDFs</p>
          </div>
        )}
      </div>

      {file && status !== 'uploading' && (
        <Button className="w-full" size="lg" onClick={handleUpload}>
          Import Transactions
        </Button>
      )}

      {status === 'uploading' && (
        <Button className="w-full" size="lg" disabled>
          <Spinner className="mr-2 h-5 w-5" />
          Processing with AI...
        </Button>
      )}
    </div>
  );
}
