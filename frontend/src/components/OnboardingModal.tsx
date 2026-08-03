'use client';

import { useState, useEffect } from 'react';
import { updateUserProfile } from '@/lib/api';
import { Button } from './ui/Button';
import toast from 'react-hot-toast';
import { PERSONA_CONFIGS } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { Sparkles, MessageSquare, BellRing, Target, ArrowRight, CheckCircle2 } from 'lucide-react';

export function OnboardingModal({ user, onComplete }: { user: any, onComplete: () => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [persona, setPersona] = useState<string>('');
  const [budget, setBudget] = useState('');
  const [loading, setLoading] = useState(false);
  
  const [smsGranted, setSmsGranted] = useState(false);
  const [notifGranted, setNotifGranted] = useState(false);

  useEffect(() => {
    if (!user) return;
    if (!user.user_persona || !user.monthly_budget) {
      setIsOpen(true);
      setStep(1);
      setPersona(user.user_persona || '');
      setBudget(user.monthly_budget ? user.monthly_budget.toString() : '');
    }
  }, [user]);

  if (!isOpen) return null;

  const requestSmsPermission = async () => {
    if (!Capacitor.isNativePlatform()) {
      setSmsGranted(true);
      toast.success('SMS Sync enabled (Web Simulation)');
      return;
    }
    try {
      const NativeSms = registerPlugin<any>('NativeSms');
      await NativeSms.getSms();
      setSmsGranted(true);
      toast.success('SMS permission granted!');
    } catch (e: any) {
      console.error(e);
      if (e.message && e.message.includes('Permission')) {
        toast.error('Permission denied. You can enable it later in Settings.');
      } else {
        setSmsGranted(true);
      }
    }
  };

  const requestNotifPermission = async () => {
    if (!Capacitor.isNativePlatform()) {
      setNotifGranted(true);
      toast.success('Notifications enabled (Web Simulation)');
      return;
    }
    try {
      const perm = await LocalNotifications.requestPermissions();
      if (perm.display === 'granted') {
        setNotifGranted(true);
        toast.success('Notifications enabled!');
      } else {
        toast.error('Notifications denied. You can enable them later.');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleNext = () => setStep(s => s + 1);
  const handleBack = () => setStep(s => s - 1);

  const handleSubmit = async () => {
    if (!budget || !persona) return;
    
    setLoading(true);
    try {
      await updateUserProfile({
        monthly_budget: parseFloat(budget.toString()),
        budget_days: 30,
        user_persona: persona
      });
      setStep(5);
    } catch (error: any) {
      console.error("Setup error:", error);
      toast.error(`Failed to save settings: ${error.message || JSON.stringify(error)}`);
    } finally {
      setLoading(false);
    }
  };

  const selectedConfig = persona ? PERSONA_CONFIGS[persona] : null;

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 1000 : -1000,
      opacity: 0
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 1000 : -1000,
      opacity: 0
    })
  };

  return (
    <div className="fixed inset-0 bg-black z-[200] flex flex-col justify-center items-center overflow-hidden">
      
      {/* Dynamic Background */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <motion.div 
          animate={{ rotate: 360, scale: [1, 1.2, 1] }}
          transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
          className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%] bg-[radial-gradient(ellipse_at_center,rgba(124,197,68,0.15)_0%,rgba(0,0,0,0)_50%)]"
        />
      </div>

      <div className="relative z-10 w-full max-w-md p-6 h-full flex flex-col">
        
        {/* Progress Bar */}
        <div className="w-full h-1 bg-white/10 rounded-full mb-8 overflow-hidden mt-8 shrink-0">
          <motion.div 
            className="h-full bg-primary"
            initial={{ width: 0 }}
            animate={{ width: `${(step / 5) * 100}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>

        <div className="flex-1 flex flex-col justify-center relative overflow-hidden">
          <AnimatePresence mode="wait" custom={1}>
            
            {/* Step 1: Welcome */}
            {step === 1 && (
              <motion.div 
                key="step1"
                custom={1}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="flex flex-col items-center text-center space-y-6"
              >
                <div className="w-24 h-24 bg-primary/20 rounded-full flex items-center justify-center mb-4 mt-8">
                  <Sparkles className="w-12 h-12 text-primary" />
                </div>
                <h1 className="text-4xl font-display font-bold text-white tracking-tight">
                  Welcome to Lumina
                </h1>
                <p className="text-lg text-text-secondary">
                  Your intelligent financial co-pilot. Let's set up your profile to completely automate your expense tracking.
                </p>
                <div className="w-full pt-8 mt-auto">
                  <Button onClick={handleNext} size="lg" className="w-full text-lg h-14 rounded-2xl group">
                    Get Started
                    <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Step 2: Persona */}
            {step === 2 && (
              <motion.div 
                key="step2"
                custom={1}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="flex flex-col h-full absolute inset-0"
              >
                <h2 className="text-3xl font-display font-bold text-white mb-2">Choose Your Lifestyle</h2>
                <p className="text-text-secondary mb-8 shrink-0">This helps us personalize your AI recommendations and default budgets.</p>
                
                <div className="grid grid-cols-2 gap-4 overflow-y-auto pb-4 hide-scrollbar">
                  {Object.entries(PERSONA_CONFIGS).map(([key, config]) => (
                    <motion.div
                      key={key}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setPersona(key)}
                      className={`cursor-pointer p-5 rounded-3xl border transition-all duration-300 flex flex-col items-center text-center gap-3 ${
                        persona === key 
                          ? 'bg-primary/20 border-primary shadow-[0_0_20px_rgba(124,197,68,0.2)]' 
                          : 'bg-white/5 border-white/10 hover:bg-white/10'
                      }`}
                    >
                      <span className="text-4xl mb-2">{config.icon}</span>
                      <span className="text-base font-semibold text-white">{config.label}</span>
                    </motion.div>
                  ))}
                </div>

                <div className="pt-6 flex gap-3 mt-auto shrink-0 bg-black/50 pb-4 backdrop-blur-md">
                  <Button variant="secondary" onClick={handleBack} className="w-1/3 h-14 rounded-2xl">Back</Button>
                  <Button onClick={handleNext} className="flex-1 h-14 rounded-2xl" disabled={!persona}>Continue</Button>
                </div>
              </motion.div>
            )}

            {/* Step 3: Budget */}
            {step === 3 && (
              <motion.div 
                key="step3"
                custom={1}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="flex flex-col h-full absolute inset-0"
              >
                <h2 className="text-3xl font-display font-bold text-white mb-2">Set Your Target</h2>
                <p className="text-text-secondary mb-8">What is your total budget for the month? You can change this later.</p>
                
                <div className="flex-1">
                  <div className="relative mt-8">
                    <span className="absolute left-6 top-1/2 -translate-y-1/2 text-3xl font-bold text-white/50">₹</span>
                    <input
                      type="number"
                      value={budget}
                      onChange={(e) => setBudget(e.target.value)}
                      className="w-full h-24 bg-white/5 border-2 border-white/10 rounded-3xl pl-16 pr-6 text-4xl font-bold text-white placeholder-white/20 focus:outline-none focus:border-primary focus:bg-primary/5 transition-all"
                      placeholder={selectedConfig?.budgetPlaceholder || '50000'}
                    />
                  </div>
                  {selectedConfig && (
                    <div className="mt-6 p-4 rounded-2xl bg-white/5 border border-white/10 flex items-start gap-3">
                      <Target className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                      <p className="text-sm text-text-secondary leading-relaxed">
                        Based on your profile, similar users typically spend between <strong className="text-white">₹{selectedConfig.budgetRange[0]}</strong> and <strong className="text-white">₹{selectedConfig.budgetRange[1]}</strong> per month.
                      </p>
                    </div>
                  )}
                </div>

                <div className="pt-6 flex gap-3 mt-auto pb-4">
                  <Button variant="secondary" onClick={handleBack} className="w-1/3 h-14 rounded-2xl">Back</Button>
                  <Button onClick={handleNext} className="flex-1 h-14 rounded-2xl" disabled={!budget}>Continue</Button>
                </div>
              </motion.div>
            )}

            {/* Step 4: Permissions */}
            {step === 4 && (
              <motion.div 
                key="step4"
                custom={1}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="flex flex-col h-full absolute inset-0"
              >
                <h2 className="text-3xl font-display font-bold text-white mb-2">Almost Done!</h2>
                <p className="text-text-secondary mb-8">Enable these permissions to make Lumina truly autonomous.</p>
                
                <div className="space-y-4 flex-1">
                  
                  {/* SMS Permission */}
                  <div className={`p-5 rounded-3xl border transition-all ${smsGranted ? 'bg-primary/10 border-primary' : 'bg-white/5 border-white/10'}`}>
                    <div className="flex items-start gap-4">
                      <div className={`p-3 rounded-full ${smsGranted ? 'bg-primary/20 text-primary' : 'bg-white/10 text-white/50'}`}>
                        <MessageSquare className="w-6 h-6" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-white mb-1">Auto-Sync Expenses</h3>
                        <p className="text-sm text-text-secondary mb-4">Allow Lumina to securely read bank SMS messages and auto-categorize your spending.</p>
                        {smsGranted ? (
                          <div className="flex items-center text-primary text-sm font-medium">
                            <CheckCircle2 className="w-4 h-4 mr-1.5" /> Granted
                          </div>
                        ) : (
                          <Button size="sm" onClick={requestSmsPermission} className="w-full">Allow SMS Access</Button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Notification Permission */}
                  <div className={`p-5 rounded-3xl border transition-all ${notifGranted ? 'bg-primary/10 border-primary' : 'bg-white/5 border-white/10'}`}>
                    <div className="flex items-start gap-4">
                      <div className={`p-3 rounded-full ${notifGranted ? 'bg-primary/20 text-primary' : 'bg-white/10 text-white/50'}`}>
                        <BellRing className="w-6 h-6" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-white mb-1">Smart Alerts</h3>
                        <p className="text-sm text-text-secondary mb-4">Get daily budget reminders, subscription alerts, and AI insights.</p>
                        {notifGranted ? (
                          <div className="flex items-center text-primary text-sm font-medium">
                            <CheckCircle2 className="w-4 h-4 mr-1.5" /> Granted
                          </div>
                        ) : (
                          <Button size="sm" onClick={requestNotifPermission} className="w-full">Allow Notifications</Button>
                        )}
                      </div>
                    </div>
                  </div>

                </div>

                <div className="pt-6 flex gap-3 mt-auto pb-4">
                  <Button variant="secondary" onClick={handleBack} className="w-1/3 h-14 rounded-2xl">Back</Button>
                  <Button onClick={handleSubmit} className="flex-1 h-14 rounded-2xl" isLoading={loading}>
                    Finish Setup
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Step 5: Success */}
            {step === 5 && (
              <motion.div 
                key="step5"
                custom={1}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="flex flex-col items-center justify-center h-full text-center absolute inset-0"
              >
                <motion.div 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", bounce: 0.5, delay: 0.2 }}
                  className="w-32 h-32 bg-primary/20 rounded-full flex items-center justify-center mb-8 relative"
                >
                  <div className="absolute inset-0 bg-primary/40 rounded-full blur-xl animate-pulse" />
                  <CheckCircle2 className="w-16 h-16 text-primary z-10" />
                </motion.div>
                
                <h2 className="text-4xl font-display font-bold text-white mb-4">You're All Set!</h2>
                <p className="text-lg text-text-secondary mb-12">
                  Lumina is now configured and ready to help you save.
                </p>
                
                <div className="w-full mt-auto pb-4">
                  <Button 
                    onClick={() => {
                      setIsOpen(false);
                      onComplete();
                    }} 
                    size="lg" 
                    className="w-full h-14 rounded-2xl text-lg group"
                  >
                    Enter Dashboard
                    <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
