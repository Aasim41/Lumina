'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Spinner } from '@/components/ui/Spinner';
import { motion, AnimatePresence } from 'framer-motion';

export default function LoginPage() {
  const { login, loading } = useAuth();
  const [showLogin, setShowLogin] = useState(false);
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [dob, setDob] = useState('');
  const [budget, setBudget] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !age || !dob || !budget) return;
    setSubmitting(true);
    await login({
      name,
      age: parseInt(age),
      dob,
      monthly_budget: parseFloat(budget)
    });
    setSubmitting(false);
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
          {/* Star SVG */}
          <svg viewBox="0 0 100 100" className="w-full h-full text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.8)] fill-current z-10">
            <path d="M50 0 C50 30 70 50 100 50 C70 50 50 70 50 100 C50 70 30 50 0 50 C30 50 50 30 50 0 Z" />
          </svg>
          {/* Core glow */}
          <div className="absolute inset-0 bg-white/40 blur-xl rounded-full scale-150 -z-10" />
        </motion.div>

        {/* Floating Bubble (decorative) */}
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
          className="text-4xl sm:text-5xl font-display font-medium leading-[1.1] mb-12 tracking-tight"
        >
          YOUR <br />
          FINANCIAL <br />
          CO-PILOT
        </motion.h2>

        <div className="min-h-[64px] flex flex-col justify-end">
          {loading ? (
            <div className="flex justify-center items-center h-14">
              <Spinner className="w-6 h-6 text-[#7cc544]" />
            </div>
          ) : (
            <AnimatePresence mode="wait">
              {!showLogin ? (
                <motion.button
                  key="get-started"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  onClick={() => setShowLogin(true)}
                  className="w-full h-14 bg-[#7cc544] hover:bg-[#8ade4b] text-black font-semibold text-lg rounded-full transition-colors shadow-[0_0_20px_rgba(124,197,68,0.3)] active:scale-95"
                >
                  Get Started!
                </motion.button>
              ) : (
                <motion.form
                  key="login-options"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  onSubmit={handleSubmit}
                  className="flex flex-col gap-4 w-full bg-surface/80 backdrop-blur-md border border-white/10 p-6 rounded-3xl"
                >
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">Your Name</label>
                    <input type="text" required value={name} onChange={e => setName(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-primary focus:outline-none" placeholder="John Doe" />
                  </div>
                  <div className="flex gap-4">
                    <div className="w-1/3">
                      <label className="block text-sm font-medium text-text-secondary mb-1">Age</label>
                      <input type="number" required min="13" max="120" value={age} onChange={e => setAge(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-primary focus:outline-none" placeholder="25" />
                    </div>
                    <div className="w-2/3">
                      <label className="block text-sm font-medium text-text-secondary mb-1">Date of Birth</label>
                      <input type="date" required value={dob} onChange={e => setDob(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-primary focus:outline-none" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">Monthly Budget (₹)</label>
                    <input type="number" required step="1" min="0" value={budget} onChange={e => setBudget(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-primary focus:outline-none" placeholder="50000" />
                  </div>
                  <button type="submit" disabled={submitting} className="w-full h-12 mt-2 bg-[#7cc544] hover:bg-[#8ade4b] text-black font-semibold text-lg rounded-full transition-colors active:scale-95 disabled:opacity-50 flex items-center justify-center">
                    {submitting ? <Spinner className="w-5 h-5 text-black" /> : 'Enter Lumina'}
                  </button>
                </motion.form>
              )}
            </AnimatePresence>
          )}
        </div>
      </div>
    </div>
  );
}
