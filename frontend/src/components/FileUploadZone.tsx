'use client';

import { useState, useCallback, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, File, CheckCircle, XCircle, Camera, Users, Sparkles } from 'lucide-react';
import { uploadCSV, uploadReceipt, confirmReceipt } from '@/lib/api';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { Spinner } from './ui/Spinner';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { cn, appNavigate } from '@/lib/utils';

export function FileUploadZone({
  onUploadSuccess,
  onReceiptScanned,
}: {
  onUploadSuccess?: () => void;
  onReceiptScanned?: (data: any) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'success' | 'error' | 'review'>('idle');
  const [result, setResult] = useState<any>(null);
  const [receiptData, setReceiptData] = useState<any>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const processFile = async (selectedFile: File) => {
    setFile(selectedFile);
    setStatus('uploading');

    try {
      if (selectedFile.name.toLowerCase().endsWith('.csv')) {
        const response = await uploadCSV(selectedFile);
        setResult(response);
        setStatus('success');
        toast.success(`Imported ${response.rows_processed} transactions!`);
        if (onUploadSuccess) onUploadSuccess();
      } else {
        const response = await uploadReceipt(selectedFile);
        setReceiptData(response);
        setStatus('review');
        toast.success('Receipt scanned with AI! Please review items.');
        if (onReceiptScanned) onReceiptScanned(response);
      }
    } catch (error: any) {
      setStatus('error');
      toast.error(error.message || 'Upload failed');
    }
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      processFile(acceptedFiles[0]);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles: 1,
    maxSize: 15 * 1024 * 1024,
  });

  const handleCameraCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  if (status === 'success' && result) {
    return (
      <Card className="p-8 text-center animate-fadeIn border-success/30 bg-success/5">
        <div className="w-16 h-16 bg-success/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-8 h-8 text-success" />
        </div>
        <h3 className="text-xl font-display font-bold text-text-primary mb-2">Upload Complete!</h3>
        <p className="text-text-secondary mb-6">Successfully processed transactions.</p>
        <div className="flex gap-4 justify-center">
          <Button
            variant="secondary"
            onClick={() => {
              setFile(null);
              setStatus('idle');
              setResult(null);
            }}
          >
            Upload Another
          </Button>
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
      toast.success('Receipt saved to transactions!');
      if (onUploadSuccess) onUploadSuccess();
    } catch (e: any) {
      toast.error(e.message || 'Failed to save');
      setStatus('review');
    }
  };

  const handleSplitBill = () => {
    if (!receiptData) return;
    const merchant = encodeURIComponent(receiptData.merchant || 'Dinner');
    const amount = encodeURIComponent(receiptData.total_amount || 0);
    appNavigate(`/splits?merchant=${merchant}&amount=${amount}`);
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
      <Card className="p-6 animate-fadeIn max-h-[75vh] overflow-y-auto border-emerald-500/30 bg-[#061813]/90">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-emerald-400" />
            <h3 className="text-lg font-display font-bold text-white">AI Scanned Receipt</h3>
          </div>
          <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            {receiptData.category}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-5">
          <div>
            <label className="block text-[11px] text-text-secondary mb-1">Merchant</label>
            <input
              className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-400"
              value={receiptData.merchant}
              onChange={e => setReceiptData({ ...receiptData, merchant: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-[11px] text-text-secondary mb-1">Date</label>
            <input
              type="date"
              className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-400"
              value={receiptData.date}
              onChange={e => setReceiptData({ ...receiptData, date: e.target.value })}
            />
          </div>
        </div>

        <div className="space-y-2 mb-5">
          <div className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">
            Items ({receiptData.items.length})
          </div>
          {receiptData.items.map((item: any, idx: number) => (
            <div
              key={idx}
              className="flex items-center gap-2 bg-white/5 p-2.5 rounded-xl border border-white/5"
            >
              <input
                className="flex-1 bg-transparent text-xs text-white focus:outline-none"
                value={item.name}
                onChange={e => updateItem(idx, 'name', e.target.value)}
                placeholder="Item name"
              />
              <div className="w-12">
                <input
                  type="number"
                  className="w-full bg-black/20 rounded p-1 text-xs text-white focus:outline-none text-center"
                  value={item.qty}
                  onChange={e => updateItem(idx, 'qty', parseInt(e.target.value) || 1)}
                  placeholder="Qty"
                />
              </div>
              <div className="w-20">
                <input
                  type="number"
                  className="w-full bg-black/20 rounded p-1 text-xs text-white focus:outline-none text-right font-mono"
                  value={item.price}
                  onChange={e => updateItem(idx, 'price', parseFloat(e.target.value) || 0)}
                  placeholder="Price"
                />
              </div>
              <button
                onClick={() => removeItem(idx)}
                className="p-1 text-rose-400 hover:bg-rose-400/10 rounded"
              >
                <XCircle className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>

        <div className="flex justify-between items-center py-3 border-t border-white/10 mb-5">
          <span className="text-xs text-text-secondary">Total Amount</span>
          <span className="text-xl font-bold font-display text-emerald-400">
            ₹{(receiptData.total_amount || 0).toLocaleString('en-IN')}
          </span>
        </div>

        <div className="flex flex-col gap-2.5">
          <div className="flex gap-3">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => {
                setStatus('idle');
                setFile(null);
              }}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-black font-bold"
              onClick={handleConfirmReceipt}
            >
              Save Expense
            </Button>
          </div>

          <button
            onClick={handleSplitBill}
            className="w-full py-2.5 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 text-purple-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
          >
            <Users className="w-3.5 h-3.5" /> Split this Receipt with Friends
          </button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Hidden Camera Input */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleCameraCapture}
      />

      {/* Snap Receipt Camera Action Card */}
      <div
        onClick={() => cameraInputRef.current?.click()}
        className="p-6 rounded-3xl bg-gradient-to-r from-emerald-500/20 via-teal-500/15 to-emerald-500/10 border border-emerald-500/30 cursor-pointer hover:border-emerald-400/50 hover:scale-[1.01] active:scale-[0.98] transition-all text-center shadow-[0_0_25px_rgba(16,185,129,0.15)] group"
      >
        <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
          <Camera className="w-7 h-7" />
        </div>
        <h3 className="font-display font-bold text-base text-white mb-1">
          Snap Receipt with Camera 📸
        </h3>
        <p className="text-xs text-emerald-300/70">
          Auto-extracts store name, total, and line items with AI Vision
        </p>
      </div>

      {/* Drag & Drop File Upload */}
      <div
        {...getRootProps()}
        className={cn(
          'border-2 border-dashed rounded-3xl p-8 text-center cursor-pointer transition-all duration-200 bg-white/5',
          isDragActive
            ? 'border-emerald-400 bg-emerald-500/10 scale-[1.02]'
            : 'border-white/10 hover:border-emerald-500/40',
          status === 'uploading' && 'pointer-events-none opacity-50'
        )}
      >
        <input {...getInputProps()} />

        {file && status === 'uploading' ? (
          <div className="flex flex-col items-center">
            <Spinner className="w-8 h-8 text-emerald-400 mb-3" />
            <p className="font-medium text-white text-sm">Analyzing with AI Vision...</p>
            <p className="text-xs text-text-secondary mt-1">{file.name}</p>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <div className="p-3 bg-white/5 rounded-2xl text-text-secondary mb-3">
              <UploadCloud className="w-7 h-7" />
            </div>
            <p className="font-medium text-white text-sm mb-1">Choose from Gallery or Upload CSV</p>
            <p className="text-xs text-text-secondary">Bank CSV statement, PDF, or Bill Photo</p>
          </div>
        )}
      </div>
    </div>
  );
}
