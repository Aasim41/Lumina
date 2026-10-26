'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { appNavigate } from '@/lib/utils';
import { Spinner } from '@/components/ui/Spinner';
import { LuminaLogo } from '@/components/LuminaLogo';
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
    const result = await loginAsGuest(name.trim());
    if (!result.success) {
      setSigningIn(false);
      alert(`Login failed: ${result.error}`);
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
        <LuminaLogo size={28} showText={true} />
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

        {/* The Glowing Lumina Wallet Logo */}
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          className="relative z-10 flex items-center justify-center drop-shadow-[0_0_35px_rgba(16,185,129,0.35)]"
        >
          <LuminaLogo size={110} showText={false} />
        </motion.div>

        {/* Floating Bubble */}
        <motion.div 
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[10%] right-[20%] w-6 h-6 rounded-full border border-white/30  bg-white/5"
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
              <p className="text-[11px] text-white/40 text-center mt-1">
                By continuing, you agree to Lumina&apos;s{' '}
                <a href="/terms/" className="underline hover:text-white">Terms</a> &amp;{' '}
                <a href="/privacy/" className="underline hover:text-white">Privacy Policy</a>
              </p>
            </form>
          )}
        </div>

      </div>
    </div>
  );
}
