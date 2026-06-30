'use client';

import { useState, useEffect } from 'react';
import { Mail, Gift, MailOpen } from 'lucide-react';
import { getMysteryEnvelope, openMysteryEnvelope } from '@/lib/api';
import toast from 'react-hot-toast';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'framer-motion';

export function MysteryEnvelope({ onOpen }: { onOpen: () => void }) {
  const [status, setStatus] = useState('locked');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const data = await getMysteryEnvelope();
        setStatus(data.status);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchStatus();
  }, []);

  const handleOpen = async () => {
    setLoading(true);
    try {
      const result = await openMysteryEnvelope();
      
      confetti({
        particleCount: 200,
        spread: 90,
        origin: { y: 0.6 },
        colors: ['#a855f7', '#ec4899', '#3b82f6']
      });
      
      toast.success(`Surprise! You saved ₹${result.amount}!`);
      setStatus('opened');
      onOpen(); // refresh data
    } catch (e) {
      toast.error('Failed to open envelope');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return null;

  return (
    <AnimatePresence>
      <motion.div 
        layout
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className={`glass p-5 rounded-3xl border border-white/5 shadow-xl relative overflow-hidden mb-6 flex items-center justify-between group ${status === 'opened' ? 'opacity-70' : ''}`}
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl -z-10 group-hover:bg-purple-500/20 transition-colors" />

        <div className="flex items-center space-x-4">
          <motion.div 
            layout
            className={`w-12 h-12 rounded-full flex items-center justify-center ${status === 'ready' ? 'bg-purple-500/20 text-purple-400 animate-pulse' : status === 'opened' ? 'bg-[#10b981]/20 text-[#10b981]' : 'bg-surface text-text-secondary'}`}
          >
            {status === 'ready' ? <Gift className="w-6 h-6" /> : status === 'opened' ? <MailOpen className="w-6 h-6" /> : <Mail className="w-6 h-6" />}
          </motion.div>
          <div>
            <h3 className="font-medium text-text-primary">Mystery Envelope</h3>
            <p className="text-xs text-text-secondary">
              {status === 'ready' ? 'Your surprise is ready!' : status === 'opened' ? 'Opened for this month' : 'Secretly saving daily...'}
            </p>
          </div>
        </div>

        <div>
          {status === 'ready' && (
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleOpen}
              className="px-4 py-2 bg-purple-500 text-white text-sm font-medium rounded-full shadow-lg shadow-purple-500/30 hover:bg-purple-600 transition-all"
            >
              Open Now
            </motion.button>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
