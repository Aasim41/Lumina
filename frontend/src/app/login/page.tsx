'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { appNavigate } from '@/lib/utils';
import { Spinner } from '@/components/ui/Spinner';
import { motion } from 'framer-motion';

export default function LoginPage() {
  const { signInWithGoogle, isAuthenticated, loading } = useAuth();
  const [signingIn, setSigningIn] = useState(false);

  useEffect(() => {
    if (isAuthenticated && !loading) {
      appNavigate('/');
    }
  }, [isAuthenticated, loading]);

  const handleGoogleLogin = async () => {
    setSigningIn(true);
    try {
      await signInWithGoogle();
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
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={handleGoogleLogin}
              disabled={signingIn}
              className="w-full h-14 bg-white hover:bg-gray-100 text-black font-semibold text-lg rounded-full transition-all shadow-[0_0_20px_rgba(255,255,255,0.15)] active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"
            >
              {signingIn ? (
                <Spinner className="w-5 h-5 text-black" />
              ) : (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Continue with Google
                </>
              )}
            </motion.button>
          )}
        </div>

      </div>
    </div>
  );
}
