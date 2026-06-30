'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, File, CheckCircle, XCircle } from 'lucide-react';
import { uploadCSV, uploadReceipt } from '@/lib/api';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { Spinner } from './ui/Spinner';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

export function FileUploadZone({ onUploadSuccess, onReceiptScanned }: { onUploadSuccess?: () => void, onReceiptScanned?: (data: any) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [result, setResult] = useState<any>(null);
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
        setStatus('idle');
        toast.success('Receipt scanned successfully!');
        if (onReceiptScanned) onReceiptScanned(response);
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
          Successfully processed {result.rows_processed} transactions across {result.categories_found} categories.
        </p>
        <div className="flex gap-4 justify-center">
          <Button variant="secondary" onClick={() => { setFile(null); setStatus('idle'); }}>Upload Another</Button>
          <Button onClick={() => router.push('/transactions')}>View Transactions</Button>
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
