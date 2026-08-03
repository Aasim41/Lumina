'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { appNavigate } from '@/lib/utils';
import { Spinner } from '@/components/ui/Spinner';
import { motion } from 'framer-motion';

export default function LoginPage() {
  const { loginAsGuest, isAuthenticated, loading } = useAuth();
  const [signingIn, setSigningIn] = useState(false);
  const [name, setName] = useState('');

  useEffect(() => {
    if (isAuthenticated && !loading) {
      appNavigate('/');
    }
  }, [isAuthenticated, loading]);

  const handleGuestLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    setSigningIn(true);
    try {
      await loginAsGuest(name.trim());
    } catch (e) {
      console.error('Login failed:', e);
      setSigningIn(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-between p-6 bg-black text-white overflow-hidden relative">
      
      {/* Background Glow */}
      <div className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none">
        <div className="w-[300px] h-[300px] bg-[#7cc544]/20 rounded-full blur-[100px]" />
      </div>

      {/* Top Header */}
      <div className="w-full max-w-sm flex justify-between items-center z-10 pt-4">
        <h1 className="font-display font-medium tracking-widest text-sm text-white/90 uppercase">Lumina</h1>
      </div>

      {/* Center Graphic */}
      <div className="relative w-full max-w-sm aspect-square flex items-center justify-center z-10 mt-8">
        
        {/* Outer Dashed Circle */}
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0 rounded-full border border-dashed border-white/20"
        />
        
        {/* Inner Dashed Circle */}
        <motion.div 
          animate={{ rotate: -360 }}
          transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
          className="absolute inset-[15%] rounded-full border border-dashed border-white/30"
        />

        {/* The Glowing Star */}
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          className="relative w-1/3 h-1/3 flex items-center justify-center"
        >
          <svg viewBox="0 0 100 100" className="w-full h-full text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.8)] fill-current z-10">
            <path d="M50 0 C50 30 70 50 100 50 C70 50 50 70 50 100 C50 70 30 50 0 50 C30 50 50 30 50 0 Z" />
          </svg>
          <div className="absolute inset-0 bg-white/40 blur-xl rounded-full scale-150 -z-10" />
        </motion.div>

        {/* Floating Bubble */}
        <motion.div 
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[10%] right-[20%] w-6 h-6 rounded-full border border-white/30 backdrop-blur-md bg-white/5"
        />
      </div>

      {/* Bottom Content */}
      <div className="w-full max-w-sm flex flex-col z-10 pb-8 mt-12">
        <motion.h2 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-4xl sm:text-5xl font-display font-medium leading-[1.1] mb-6 tracking-tight"
        >
          YOUR <br />
          FINANCIAL <br />
          CO-PILOT
        </motion.h2>

        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="flex gap-2 flex-wrap mb-8"
        >
          <span className="px-3 py-1 bg-white/10 rounded-full text-xs text-white/80">✨ AI Chatbot</span>
          <span className="px-3 py-1 bg-purple-500/20 border border-purple-500/30 rounded-full text-xs text-purple-300">🎯 Envelope Budgets</span>
          <span className="px-3 py-1 bg-sky-500/20 border border-sky-500/30 rounded-full text-xs text-sky-300">🔄 Subscriptions</span>
          <span className="px-3 py-1 bg-orange-500/20 border border-orange-500/30 rounded-full text-xs text-orange-300">📊 Advanced Analytics</span>
          <span className="px-3 py-1 bg-emerald-500/20 border border-emerald-500/30 rounded-full text-xs text-emerald-300">🔔 Smart Notifications</span>
        </motion.div>

        <div className="min-h-[120px] flex flex-col justify-end">
          {loading ? (
            <div className="flex justify-center items-center h-14">
              <Spinner className="w-6 h-6 text-[#7cc544]" />
            </div>
          ) : (
            <form onSubmit={handleGuestLogin} className="flex flex-col gap-4">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="What should we call you?"
                className="h-14 bg-white/10 border border-white/20 rounded-xl px-4 text-white placeholder-white/50 focus:outline-none focus:border-[#7cc544] transition-colors"
                required
                maxLength={20}
              />
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={signingIn}
                className="w-full h-14 bg-white hover:bg-gray-100 text-black font-semibold text-lg rounded-xl transition-all shadow-[0_0_20px_rgba(255,255,255,0.15)] disabled:opacity-50 flex justify-center items-center"
              >
                {signingIn ? <Spinner className="w-6 h-6 text-black" /> : 'Start Journey'}
              </motion.button>
            </form>
          )}
        </div>

      </div>
    </div>
  );
}
