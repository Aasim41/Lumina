'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { AuthGuard } from '@/components/AuthGuard';
import { BottomNav } from '@/components/BottomNav';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { useExpenseData } from '@/hooks/useExpenseData';
import { appNavigate } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { MetricCard } from '@/components/MetricCard';
import { CategoryDonutChart } from '@/components/CategoryDonutChart';
import { SpendingLineChart } from '@/components/SpendingLineChart';
import { AnimatedCounter } from '@/components/AnimatedCounter';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

import { MiniCalendar } from '@/components/MiniCalendar';
import { SaveMoneyModal } from '@/components/SaveMoneyModal';
import { SubscriptionModal } from '@/components/SubscriptionModal';
import { RolloverModal } from '@/components/RolloverModal';
import { AchievementModal } from '@/components/AchievementModal';
import { SecuritySettingsModal } from '@/components/SecuritySettingsModal';
import { SettingsModal } from '@/components/SettingsModal';
import { UpcomingBillsCard } from '@/components/UpcomingBillsCard';
import { TodaySpendingCard } from '@/components/TodaySpendingCard';
import { HeroSpotlightBanner } from '@/components/HeroSpotlightBanner';
import { PendingPaymentBanner } from '@/components/PendingPaymentBanner';
import { LuminaLogo } from '@/components/LuminaLogo';
import { Calendar, Trash2, Award, Plus, Rocket, Trophy, TrendingUp, Activity, Target, PiggyBank, Flame, Lightbulb, RefreshCw, Download, Sparkles, X, Bot, Settings, AlertTriangle, Bell, ArrowRight, ChevronRight, ArrowDownLeft, ArrowUpRight, Wallet, Shield, Zap, QrCode, MoreVertical, LogOut, Users } from 'lucide-react';
import { App as CapApp } from '@capacitor/app';
import { deleteSubscription, apiFetch, getInsights, getTransactions, getAlerts, getGoals, updateUserProfile } from '@/lib/api';

import { formatCurrency, PERSONA_CONFIGS, formatTitleCase } from '@/lib/utils';
import { generateMonthlyStatement } from '@/lib/PDFGenerator';
import { Spinner } from '@/components/ui/Spinner';
import { CategoryIcon } from '@/components/CategoryIcon';
import { getCategoryColor } from '@/lib/utils';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useSMSSync } from '@/hooks/useSMSSync';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { Preferences } from '@capacitor/preferences';
import { scheduleSubscriptionReminders } from '@/lib/notifications';
export default function Dashboard() {
  const { user, logout, refreshUser } = useAuth();
  usePushNotifications();
  const { summary, categories, trends, subscriptions, loading, refresh } = useExpenseData();
  const [mounted, setMounted] = useState(false);
  const dashboardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);

    // Handle Android Long-Press App Shortcuts (Scan, Pay, Add Expense)
    const handleShortcutAction = (urlStr: string) => {
      try {
        const url = new URL(urlStr);
        const action = url.searchParams.get('action');
        if (action === 'scan') {
          setIsUpiScannerOpen(true);
        } else if (action === 'pay') {
          setIsUpiModalOpen(true);
        } else if (action === 'add') {
          setIsSaveModalOpen(true);
        }
      } catch {}
    };

    if (typeof window !== 'undefined') {
      handleShortcutAction(window.location.href);
    }

    const sub = CapApp.addListener('appUrlOpen', (data) => {
      if (data?.url) {
        handleShortcutAction(data.url);
      }
    });

    return () => {
      sub.then(s => s.remove()).catch(() => {});
    };
  }, []);

  useGSAP(() => {
    if (!mounted) return;

    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

    tl.fromTo('.gsap-budget-card',
      { opacity: 0, y: 24, scale: 0.96 },
      { opacity: 1, y: 0, scale: 1, duration: 0.7 }
    );

    tl.fromTo('.gsap-cash-item',
      { opacity: 0, y: 18, scale: 0.92 },
      { opacity: 1, y: 0, scale: 1, stagger: 0.08, duration: 0.55, ease: 'back.out(1.5)' },
      '-=0.35'
    );

    tl.fromTo('.gsap-today-stat',
      { opacity: 0, y: 14, scale: 0.94 },
      { opacity: 1, y: 0, scale: 1, stagger: 0.08, duration: 0.5, ease: 'back.out(1.4)' },
      '-=0.2'
    );


    tl.fromTo('.gsap-metric-card',
      { opacity: 0, y: 16, scale: 0.95 },
      { opacity: 1, y: 0, scale: 1, stagger: 0.06, duration: 0.45 },
      '-=0.2'
    );
  }, { scope: dashboardRef, dependencies: [mounted, loading] });

  // SMS auto-sync: syncs on open, every 15 min, and on foreground resume
  const handleSMSSyncComplete = useCallback((_count: number) => {
    refresh(); // refresh dashboard data (useSMSSync already displays the customized money/expense toast)
  }, [refresh]);
  const { syncNow } = useSMSSync(handleSMSSyncComplete);

  const totalSpent = summary?.total_this_month || 0;
  const totalSaved = summary?.total_saved_this_month || 0;
  const totalSubscriptions = summary?.total_subscriptions_this_month || 0;
  const budget = user?.monthly_budget || 0;
  const remaining = budget - totalSpent - totalSubscriptions;
  const progressPercent = budget > 0 ? Math.min(((totalSpent + totalSubscriptions) / budget) * 100, 100) : 0;
  
  useEffect(() => {
    if (remaining !== undefined) {
      Preferences.set({
        key: 'remaining_budget',
        value: remaining.toString()
      }).catch(console.error);
    }
  }, [remaining]);

  useEffect(() => {
    if (subscriptions && subscriptions.length > 0) {
      scheduleSubscriptionReminders(subscriptions, formatCurrency);
    }
  }, [subscriptions]);
  
  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysLeft = daysInMonth - now.getDate() + 1;
  const dailyAllowed = remaining > 0 ? remaining / daysLeft : 0;
  
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);
  const [showReviewBanner, setShowReviewBanner] = useState(true);
  const [insights, setInsights] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [goals, setGoals] = useState<any[]>([]);
  const [unlockedBadge, setUnlockedBadge] = useState<string | null>(null);
  const [isPersonaPickerOpen, setIsPersonaPickerOpen] = useState(false);
  const [personaLoading, setPersonaLoading] = useState(false);
  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState(false);
  const [isHeaderMenuOpen, setIsHeaderMenuOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Month Wrap is only unlocked during the last week of the month
  const isLastWeekOfMonth = useMemo(() => {
    const today = new Date();
    const totalDaysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    return today.getDate() >= (totalDaysInMonth - 6); // Last 7 days of current month
  }, []);

  const handlePersonaChange = async (persona: string) => {
    setPersonaLoading(true);
    try {
      await updateUserProfile({ user_persona: persona });
      toast.success(`Profile set to ${PERSONA_CONFIGS[persona]?.label || persona}!`);
      setIsPersonaPickerOpen(false);
      refreshUser();
    } catch (e) {
      toast.error('Failed to update profile');
    } finally {
      setPersonaLoading(false);
    }
  };

  useEffect(() => {
    if (user && (!user.user_persona || !user.monthly_budget)) {
      import('@/lib/utils').then(m => m.appNavigate('/onboarding'));
    }
  }, [user]);

  useEffect(() => {
    if (user?.unlocked_badges) {
      try {
        const parsedBadges = JSON.parse(user.unlocked_badges);
        
        // Simple check: if local storage doesn't have it, it's new for this session
        const stored = localStorage.getItem('seen_badges');
        const seenBadges = stored ? JSON.parse(stored) : [];
        
        const newBadge = parsedBadges.find((b: string) => !seenBadges.includes(b));
        if (newBadge) {
          setUnlockedBadge(newBadge);
          seenBadges.push(newBadge);
          localStorage.setItem('seen_badges', JSON.stringify(seenBadges));
        }
      } catch (e) {}
    }
  }, [user?.unlocked_badges]);

  // Defer non-critical API calls so dashboard renders first
  useEffect(() => {
    if (user) {
      const timer = setTimeout(() => {
        getInsights().then(setInsights).catch(console.error);
        getAlerts().then(setAlerts).catch(console.error);
        getGoals().then(setGoals).catch(console.error);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [user]);
  const handleDeleteSubscription = async (id: string) => {
    try {
      await deleteSubscription(id);
      toast.success('Subscription removed');
      refresh();
    } catch (error) {
      toast.error('Failed to remove subscription');
    }
  };

  // Stealth Savings feature removed per user request


  const getBadgeConfig = (badge: string) => {
    switch (badge) {
      case 'First Steps':
        return { 
          icon: <Rocket className="w-3.5 h-3.5 mr-1.5" />, 
          classes: 'bg-sky-500/20 text-sky-400 border border-sky-500/30 shadow-[0_0_12px_rgba(14,165,233,0.4)]',
          description: "Awarded for recording your very first transaction!"
        };
      case 'Super Saver':
        return { 
          icon: <Trophy className="w-3.5 h-3.5 mr-1.5 text-yellow-400" />, 
          classes: 'bg-[#10b981]/20 text-[#10b981] border border-[#10b981]/30 shadow-[0_0_12px_rgba(16,185,129,0.4)]',
          description: "Awarded for saving more than 20% of your monthly budget in your Savings."
        };
      case 'On Track':
        return { 
          icon: <TrendingUp className="w-3.5 h-3.5 mr-1.5" />, 
          classes: 'bg-purple-500/20 text-purple-400 border border-purple-500/30 shadow-[0_0_12px_rgba(168,85,247,0.4)]',
          description: "Awarded when your projected spending for the month is below your total budget."
        };
      default:
        return { 
          icon: <Award className="w-3.5 h-3.5 mr-1.5" />, 
          classes: 'bg-orange-500/20 text-orange-400 border border-orange-500/30 shadow-[0_0_12px_rgba(249,115,22,0.4)]',
          description: "A special milestone achieved!"
        };
    }
  };

  const showInfoToast = (title: string, message: string, icon: React.ReactNode) => {
    toast.custom((t) => (
      <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-md w-full bg-[#12081C] border border-white/10 shadow-2xl rounded-2xl p-4 pointer-events-auto flex items-start space-x-4`}>
        <div className="flex-shrink-0 mt-0.5">
          {icon}
        </div>
        <div className="flex-1">
          <p className="text-sm font-bold text-white mb-1">{title}</p>
          <p className="text-xs text-text-secondary leading-relaxed">{message}</p>
        </div>
      </div>
    ), { duration: 4000, id: 'info-toast' });
  };

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Spinner className="w-8 h-8 text-primary" />
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <AuthGuard>
        <SaveMoneyModal 
          isOpen={isSaveModalOpen} 
          onClose={() => setIsSaveModalOpen(false)} 
          onSuccess={refresh} 
        />
        <SubscriptionModal 
          isOpen={isSubModalOpen}
          onClose={() => setIsSubModalOpen(false)}
          onSuccess={refresh}
        />
        <RolloverModal onSuccess={refresh} />
        <ChatModal isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
        <AchievementModal isOpen={!!unlockedBadge} onClose={() => setUnlockedBadge(null)} badgeId={unlockedBadge || ''} />
        
        {/* Persona Picker Modal */}
        <AnimatePresence>
          {isPersonaPickerOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/70 z-[100]"
                onClick={() => setIsPersonaPickerOpen(false)}
              />
              <motion.div
                initial={{ y: '100%', opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: '100%', opacity: 0 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="fixed bottom-0 left-0 right-0 z-[100] px-4 pb-8"
                style={{ paddingBottom: 'calc(2rem + env(safe-area-inset-bottom))' }}
              >
                <div className="mx-auto max-w-md bg-[#111827]/95  rounded-3xl border border-white/10 p-6 shadow-2xl">
                  <div className="flex justify-between items-center mb-5">
                    <div>
                      <h3 className="text-lg font-display font-bold text-white">Choose Your Lifestyle</h3>
                      <p className="text-xs text-white/40 mt-0.5">This personalizes your categories & tips</p>
                    </div>
                    <button onClick={() => setIsPersonaPickerOpen(false)} className="p-2 bg-white/5 rounded-full">
                      <X className="w-4 h-4 text-white/60" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {Object.entries(PERSONA_CONFIGS).map(([key, config]) => (
                      <button
                        key={key}
                        disabled={personaLoading}
                        onClick={() => handlePersonaChange(key)}
                        className={`p-4 rounded-2xl border text-left transition-all duration-200 hover:scale-[1.02] active:scale-95 ${
                          user?.user_persona === key
                            ? 'bg-white/10 border-white/30 shadow-lg ring-2 ring-primary/40'
                            : 'bg-white/5 border-white/5 hover:bg-white/10'
                        }`}
                      >
                        <span className="text-2xl block mb-2">{config.icon}</span>
                        <p className="text-sm font-bold text-white">{config.label}</p>
                        <p className="text-[10px] text-white/40 mt-0.5">₹{config.budgetRange[0].toLocaleString()} - ₹{config.budgetRange[1].toLocaleString()}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
        
        <div ref={dashboardRef} className="min-h-screen bg-[#0B1021] pb-24 overflow-x-hidden">
          {/* Header with Budget Tracker */}
          <header className="px-5 sm:px-6 pb-8 pt-14 safe-pt bg-gradient-to-b from-primary/10 to-transparent relative">
            <div className="absolute top-5 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 z-10">
              <LuminaLogo size={24} showText={true} />
              {user?.user_persona && (
                <button
                  onClick={() => setIsPersonaPickerOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-[11px] font-medium text-white/70 hover:text-white shadow-sm"
                >
                  <span>{PERSONA_CONFIGS[user.user_persona]?.icon || '👤'}</span>
                  <span>{PERSONA_CONFIGS[user.user_persona]?.label || 'Set Profile'}</span>
                </button>
              )}
              {!user?.user_persona && (
                <button
                  onClick={() => setIsPersonaPickerOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 hover:bg-primary/20 transition-all text-[11px] font-medium text-primary animate-pulse shadow-sm"
                >
                  <span>👤</span>
                  <span>Set Your Profile</span>
                </button>
              )}
            </div>
            
            {/* Main Header Action Row - Perfectly fits all screen sizes without overflow */}
            <div className="flex justify-between items-center mb-6 mt-12 relative z-20 gap-2">
              {/* Left: User Profile + Name + Streak Badge */}
              <div className="flex items-center space-x-2.5 min-w-0">
                <button 
                  onClick={() => { appNavigate('/create-avatar'); }}
                  className="w-10 h-10 rounded-full bg-gradient-to-tr from-emerald-400 to-cyan-400 p-0.5 shrink-0 overflow-hidden shadow-[0_0_15px_rgba(52,211,153,0.3)] border border-white/20 relative group cursor-pointer"
                >
                  {user?.avatar_url ? (
                    <img src={user.avatar_url} alt="Profile" className="w-full h-full rounded-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-surface rounded-full flex items-center justify-center">
                      <span className="text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
                        {user?.name?.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center rounded-full transition-opacity">
                    <span className="text-[10px] text-white font-medium">Edit</span>
                  </div>
                </button>
                <div className="min-w-0">
                  <p className="text-[11px] text-text-secondary leading-tight truncate">Welcome back,</p>
                  <div className="flex items-center gap-1.5">
                    <p className="font-semibold text-text-primary text-sm leading-tight truncate">{user?.name?.split(' ')[0]}</p>
                    {summary && summary.current_streak > 0 && (
                      <span 
                        onClick={() => showInfoToast("Current Streak 🔥", `You have logged an expense ${summary.current_streak} day(s) in a row! Keep it up!`, <Flame className="w-3.5 h-3.5 text-orange-500" />)}
                        className="inline-flex items-center gap-0.5 bg-orange-500/15 px-1.5 py-0.5 rounded-full border border-orange-500/25 text-[10px] font-bold text-orange-400 cursor-pointer shrink-0"
                      >
                        <Flame className="w-2.5 h-2.5 text-orange-500" />
                        {summary.current_streak}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Right: Modern Compact Action Pill Hub */}
              <div className="flex items-center space-x-1.5 shrink-0">
                {/* Sleek Quick Utility Menu (Security, Save, Logout) */}
                <div className="relative">
                  <button 
                    onClick={() => setIsHeaderMenuOpen(!isHeaderMenuOpen)}
                    className="p-2 bg-white/5 border border-white/10 text-white/70 rounded-2xl hover:bg-white/10 hover:text-white transition-all active:scale-95 cursor-pointer flex items-center justify-center"
                    title="Quick Tools & Actions"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>

                  <AnimatePresence>
                    {isHeaderMenuOpen && (
                      <>
                        <div 
                          className="fixed inset-0 z-30" 
                          onClick={() => setIsHeaderMenuOpen(false)} 
                        />
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95, y: -10 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95, y: -10 }}
                          transition={{ duration: 0.15 }}
                          className="absolute right-0 top-11 z-40 w-48 rounded-2xl bg-[#111827]/95 backdrop-blur-xl border border-white/15 shadow-2xl p-1.5 space-y-1 text-xs text-white"
                        >
                          <button
                            onClick={() => {
                              setIsHeaderMenuOpen(false);
                              setIsSecurityModalOpen(true);
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-white/10 transition-colors text-left"
                          >
                            <Shield className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Security & Biometrics</span>
                          </button>

                          <button
                            onClick={() => {
                              setIsHeaderMenuOpen(false);
                              setIsSaveModalOpen(true);
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-white/10 transition-colors text-left"
                          >
                            <PiggyBank className="w-3.5 h-3.5 text-amber-400" />
                            <span>Quick Savings Goal</span>
                          </button>

                          <button
                            onClick={() => {
                              setIsHeaderMenuOpen(false);
                              appNavigate('/splits');
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-white/10 transition-colors text-left"
                          >
                            <Users className="w-3.5 h-3.5 text-indigo-400" />
                            <span>Split Bill with Friends</span>
                          </button>

                          <button
                            onClick={() => {
                              setIsHeaderMenuOpen(false);
                              setIsSettingsOpen(true);
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-white/10 transition-colors text-left"
                          >
                            <Settings className="w-3.5 h-3.5 text-blue-400" />
                            <span>Settings & Backup</span>
                          </button>

                          <div className="h-px bg-white/10 my-1" />

                          <button
                            onClick={() => {
                              setIsHeaderMenuOpen(false);
                              logout();
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-rose-500/20 text-rose-400 transition-colors text-left"
                          >
                            <LogOut className="w-3.5 h-3.5" />
                            <span>Sign Out</span>
                          </button>
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>

            {/* Dynamic Spotlight Banner: Cycles Wrapped (last week only), Streak & Badges at different times */}
            <HeroSpotlightBanner
              summary={summary}
              isLastWeekOfMonth={isLastWeekOfMonth}
              monthName={now.toLocaleString('default', { month: 'long' })}
              onBadgeClick={showInfoToast}
              getBadgeConfig={getBadgeConfig}
            />

            <PendingPaymentBanner onReconciled={() => refresh()} />

            <div className="gsap-budget-card glass p-5 rounded-3xl border border-indigo-500/30 shadow-[0_0_40px_rgba(99,102,241,0.15)] relative overflow-hidden bg-indigo-500/10">
              <div className="flex justify-between items-end mb-2">
                <div>
                  <p className="text-xs text-text-secondary mb-1">Spent this month</p>
                  <div className="flex items-baseline space-x-1">
                    <span className="text-2xl font-display font-bold text-text-primary">
                      <AnimatedCounter value={totalSpent + totalSubscriptions} />
                    </span>
                    <span className="text-sm text-text-secondary">/ {formatCurrency(budget)}</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-text-secondary mb-1">Left to spend</p>
                  <p className={`font-semibold ${remaining < 0 ? 'text-error' : 'text-success'}`}>
                    <AnimatedCounter value={remaining} />
                  </p>
                </div>
              </div>
              
              <div className="h-2 bg-black/40 rounded-full overflow-hidden flex mt-4 border border-white/5">
                <motion.div 
                  className="h-full bg-indigo-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${budget > 0 ? (totalSpent / Math.max(budget, totalSpent + totalSubscriptions)) * 100 : 0}%` }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                />
                <motion.div 
                  className="h-full bg-purple-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${budget > 0 ? (totalSubscriptions / Math.max(budget, totalSpent + totalSubscriptions)) * 100 : 0}%` }}
                  transition={{ duration: 1, delay: 0.2, ease: 'easeOut' }}
                />
              </div>
              
              {/* Legend for other categories */}
              {totalSubscriptions > 0 && (
                <div className="flex justify-between mt-4 text-[10px] bg-black/20 p-2 rounded-xl">
                  <span className="text-indigo-400"><AnimatedCounter value={totalSpent} /> spent</span>
                  <span className="text-purple-400 font-medium">{formatCurrency(totalSubscriptions)} subs</span>
                </div>
              )}
            </div>

                        {/* Today's Spending & Daily Balance Widget */}
            <TodaySpendingCard 
              spentToday={summary?.spent_today || 0}
              balanceLeftToday={summary?.balance_left_today ?? (dailyAllowed || 0)}
              dailyAllowance={summary?.daily_allowance ?? (dailyAllowed || 0)}
              todayTxCount={summary?.today_tx_count || 0}
              onInfoClick={showInfoToast}
            />
          </header>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, staggerChildren: 0.1 }}
            className="px-4 space-y-6 pb-24 -mt-2"
          >
            <MiniCalendar />
            <UpcomingBillsCard />

            <AnimatePresence>
              {alerts.map((alert, i) => {
                let colorClass = 'bg-blue-500/10 border-blue-500/30 text-blue-400';
                if (alert.severity === 'danger') colorClass = 'bg-red-500/10 border-red-500/30 text-red-400';
                else if (alert.severity === 'warning') colorClass = 'bg-amber-500/10 border-amber-500/30 text-amber-400';
                else if (alert.severity === 'reminder') colorClass = 'bg-purple-500/10 border-purple-500/30 text-purple-400';
                
                return (
                  <motion.div 
                    key={alert.id || i}
                    initial={{ opacity: 0, height: 0, scale: 0.95 }}
                    animate={{ opacity: 1, height: 'auto', scale: 1 }}
                    exit={{ opacity: 0, height: 0, scale: 0.95 }}
                    className={`p-4 rounded-2xl border ${colorClass} shadow-lg relative overflow-hidden mb-4`}
                  >
                    <button 
                      onClick={() => setAlerts(alerts.filter(a => a.id !== alert.id))}
                      className="absolute top-2 right-2 p-1 bg-white/5 rounded-full hover:bg-white/10 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <div className="flex gap-3 items-start pr-6">
                      <div className="mt-0.5">
                        {alert.severity === 'danger' || alert.severity === 'warning' ? <AlertTriangle className="w-5 h-5" /> : <Bell className="w-5 h-5" />}
                      </div>
                      <div>
                        <h4 className="font-bold text-sm mb-1">{alert.title}</h4>
                        <p className="text-xs opacity-90">{alert.message}</p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {insights.length > 0 && (
              <div className="mb-4">
                <h3 className="text-sm font-display font-semibold text-white/80 mb-3 flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-yellow-400" /> Smart Insights
                </h3>
                <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
                  {insights.map((insight: any, i: number) => (
                    <div 
                      key={i} 
                      onClick={() => showInfoToast(insight.title || "Smart Insight", insight.explanation || insight.message, <span className="text-2xl">{insight.icon || "💡"}</span>)}
                      className={`flex-shrink-0 w-64 p-4 rounded-2xl border cursor-pointer transition-all duration-200 active:scale-[0.98] hover:scale-[1.01] ${
                        insight.type === 'warning' ? 'bg-red-500/10 border-red-500/25 hover:border-red-500/40' :
                        insight.type === 'positive' ? 'bg-emerald-500/10 border-emerald-500/25 hover:border-emerald-500/40' :
                        'bg-blue-500/10 border-blue-500/25 hover:border-blue-500/40'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{insight.icon || '💡'}</span>
                          <span className="text-xs font-bold text-white tracking-wide">
                            {formatTitleCase(insight.title || 'Insight')}
                          </span>
                        </div>
                        <span className={`text-[9px] font-semibold uppercase px-2 py-0.5 rounded-full ${
                          insight.type === 'warning' ? 'bg-red-500/20 text-red-300' :
                          insight.type === 'positive' ? 'bg-emerald-500/20 text-emerald-300' :
                          'bg-blue-500/20 text-blue-300'
                        }`}>
                          {insight.type === 'warning' ? 'Alert' : insight.type === 'positive' ? 'Great' : 'Info'}
                        </span>
                      </div>
                      <p className="text-xs text-white/80 leading-relaxed line-clamp-2">{insight.message}</p>
                      <div className="mt-2.5 pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-white/50">
                        <span>Tap to learn more</span>
                        <ChevronRight className="w-3 h-3 text-white/40" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {loading ? (
              <div className="flex justify-center p-12">
                <Spinner className="w-8 h-8 text-primary" />
              </div>
            ) : (
              <>
                {summary && (
                  <div className="grid grid-cols-2 gap-4">
                    <MetricCard
                      className="gsap-metric-card"
                      title="Spent / Day"
                      value={<AnimatedCounter value={summary.daily_average} />}
                      icon={<Activity className="w-5 h-5 text-error" />}
                      theme="red"
                      onClick={() => showInfoToast("Spent / Day", "How much you're spending on average each day this month.", <Activity className="w-6 h-6 text-error" />)}
                    />
                    <MetricCard
                      className="gsap-metric-card"
                      title="Safe to Spend / Day"
                      value={<AnimatedCounter value={dailyAllowed} />}
                      icon={<PiggyBank className="w-5 h-5 text-success" />}
                      theme="green"
                      onClick={() => showInfoToast("Safe to Spend / Day", "The amount you can safely spend each day for the rest of the month without going over budget.", <PiggyBank className="w-6 h-6 text-success" />)}
                    />
                    <MetricCard
                      className="gsap-metric-card"
                      title="Top Category"
                      value={summary.top_category || 'None'}
                      icon={<Target className="w-5 h-5 text-primary" />}
                      theme="purple"
                      onClick={() => showInfoToast("Top Category", "The category where you spend the most money this month.", <Target className="w-6 h-6 text-primary" />)}
                    />
                    <MetricCard
                      className="gsap-metric-card"
                      title="Transactions"
                      value={<AnimatedCounter value={summary.transaction_count || 0} />}
                      icon={<Activity className="w-5 h-5 text-purple-500" />}
                      theme="blue"
                      onClick={() => showInfoToast("Transactions", "Total number of expenses you've recorded this month.", <Activity className="w-6 h-6 text-purple-500" />)}
                    />
                    <MetricCard
                      className="gsap-metric-card"
                      title="Secret Vault"
                      value="***"
                      icon={<Trophy className="w-5 h-5 text-yellow-500" />}
                      theme="green"
                      onClick={() => showInfoToast(
                        "Secret Vault", 
                        "Your hidden piggy bank! Small amounts are automatically saved here without you noticing, so you build up savings effortlessly.", 
                        <Trophy className="w-6 h-6 text-yellow-400" />
                      )}
                    />
                  </div>
                )}


                {/* Subscriptions Section */}
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4 }}
                  className="glass p-5 rounded-3xl border border-purple-500/30 bg-purple-500/10 shadow-[0_0_30px_rgba(168,85,247,0.15)]"
                >
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-display font-semibold text-purple-100">Active Subscriptions</h3>
                    <button onClick={() => setIsSubModalOpen(true)} className="p-1.5 bg-purple-500/20 text-purple-400 rounded-full hover:bg-purple-500/30 transition-transform active:scale-95">
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  
                  {(!subscriptions || subscriptions.length === 0) ? (
                    <p className="text-text-secondary text-sm text-center py-4">No subscriptions added yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {subscriptions.map((sub: any) => (
                        <div key={sub.id} className="flex justify-between items-center p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-colors">
                          <div className="flex items-center space-x-3">
                            <div 
                              className="w-10 h-10 rounded-full flex items-center justify-center"
                              style={{ backgroundColor: `${getCategoryColor(sub.category || 'Miscellaneous')}20`, color: getCategoryColor(sub.category || 'Miscellaneous') }}
                            >
                              <CategoryIcon category={sub.category || 'Miscellaneous'} className="w-5 h-5" />
                            </div>
                            <div>
                              <p className="font-medium">{sub.merchant}</p>
                              <p className="text-xs text-text-secondary flex items-center">
                                <Calendar className="w-3 h-3 mr-1" />
                                Billing on day {sub.billing_day}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-3">
                            <span className="font-semibold">{formatCurrency(sub.amount)}</span>
                            <button onClick={() => handleDeleteSubscription(sub.id)} className="text-text-secondary hover:text-error transition-colors">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>

                {/* Goals Widget */}
                {goals.length > 0 && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="glass p-5 rounded-3xl border border-emerald-500/30 bg-emerald-500/5 shadow-[0_0_30px_rgba(16,185,129,0.1)]"
                  >
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-display font-semibold text-emerald-100 flex items-center">
                        <Target className="w-5 h-5 mr-2 text-emerald-400" />
                        Financial Goals
                      </h3>
                      <button 
                        onClick={() => appNavigate('/goals')} 
                        className="text-xs font-medium text-emerald-400 hover:text-emerald-300 flex items-center bg-transparent border-none cursor-pointer p-0"
                      >
                        View All <ArrowRight className="w-3 h-3 ml-1" />
                      </button>
                    </div>
                    
                    <div className="space-y-4">
                      {goals.slice(0, 2).map((goal: any) => {
                        const progress = Math.min((goal.current_amount / goal.target_amount) * 100, 100);
                        return (
                          <div key={goal.id}>
                            <div className="flex justify-between items-end mb-1 text-sm">
                              <span className="font-medium flex items-center gap-2">
                                <span>{goal.icon}</span> {goal.name}
                              </span>
                              <span className="text-emerald-400 font-bold">{progress.toFixed(0)}%</span>
                            </div>
                            <div className="h-2 bg-black/40 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400"
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}

                {categories && categories.length > 0 && (
                  <CategoryDonutChart data={categories} />
                )}


                {trends && trends.length > 0 && (
                  <SpendingLineChart data={trends} />
                )}
              </>
            )}
          </motion.div>
        </div>

        {/* Floating AI Advisor Button */}
        <SecuritySettingsModal isOpen={isSecurityModalOpen} onClose={() => setIsSecurityModalOpen(false)} />
        <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />

        <BottomNav />
      </AuthGuard>
    </ErrorBoundary>
  );
}

