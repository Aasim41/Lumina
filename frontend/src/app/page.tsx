'use client';

import { useState, useEffect, useCallback } from 'react';

import { AuthGuard } from '@/components/AuthGuard';
import { BottomNav } from '@/components/BottomNav';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useExpenseData } from '@/hooks/useExpenseData';
import { useAuth } from '@/hooks/useAuth';
import { MetricCard } from '@/components/MetricCard';
import { CategoryDonutChart } from '@/components/CategoryDonutChart';
import { SpendingLineChart } from '@/components/SpendingLineChart';
import { OnboardingModal } from '@/components/OnboardingModal';
import { MiniCalendar } from '@/components/MiniCalendar';
import { SaveMoneyModal } from '@/components/SaveMoneyModal';
import { SubscriptionModal } from '@/components/SubscriptionModal';
import { RolloverModal } from '@/components/RolloverModal';
import { Calendar, Trash2, Award, Plus, Rocket, Trophy, TrendingUp, Activity, Target, PiggyBank, Flame, Lightbulb, RefreshCw, Download } from 'lucide-react';
import { deleteSubscription, apiFetch, getInsights, getTransactions } from '@/lib/api';
import toast from 'react-hot-toast';
import { formatCurrency } from '@/lib/utils';
import { generateMonthlyStatement } from '@/lib/PDFGenerator';
import { Spinner } from '@/components/ui/Spinner';
import { CategoryIcon } from '@/components/CategoryIcon';
import { getCategoryColor } from '@/lib/utils';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useSMSSync } from '@/hooks/useSMSSync';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { Preferences } from '@capacitor/preferences';

export default function Dashboard() {
  const { user, logout, refreshUser } = useAuth();
  usePushNotifications();
  const { summary, categories, trends, subscriptions, loading, refresh } = useExpenseData();

  // SMS auto-sync: syncs on open, every 15 min, and on foreground resume
  const handleSMSSyncComplete = useCallback((count: number) => {
    toast.success(`${count} new transaction${count > 1 ? 's' : ''} synced from SMS!`, { icon: '📱' });
    refresh(); // refresh dashboard data
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
  
  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysLeft = daysInMonth - now.getDate() + 1;
  const dailyAllowed = remaining > 0 ? remaining / daysLeft : 0;
  
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);
  const [insights, setInsights] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      getInsights().then(setInsights).catch(console.error);
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

  // Stealth Savings Auto-Deduct
  useEffect(() => {
    if (user) {
      apiFetch('/api/stealth/auto-deduct', { method: 'POST' })
        .then(res => {
          if (res.status === 'deducted') {
            refresh();
          }
        })
        .catch(console.error);
    }
  }, [user]);

  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const handleDownloadPDF = async () => {
    if (!user) return;
    try {
      setIsGeneratingPDF(true);
      const toastId = toast.loading('Generating PDF Statement...', { icon: '📄' });
      
      const transactions = await getTransactions();
      const monthName = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
      
      await generateMonthlyStatement(user, transactions, monthName, totalSpent);
      
      toast.success('Statement Downloaded!', { id: toastId });
    } catch (e) {
      console.error(e);
      toast.error('Failed to generate PDF');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

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
          description: "Awarded for saving more than 20% of your monthly budget in the Secret Vault."
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

  return (
    <ErrorBoundary>
      <AuthGuard>
        <OnboardingModal user={user} onComplete={refreshUser} />
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
        
        <div className="min-h-screen bg-[#0B1021] pb-24">
          {/* Header with Budget Tracker */}
          <header className="px-6 py-8 safe-pt bg-gradient-to-b from-primary/10 to-transparent relative">
            <div className="absolute top-4 left-1/2 -translate-x-1/2">
              <span className="font-display font-bold tracking-[0.3em] text-[10px] text-primary/50 uppercase">Lumina</span>
            </div>
            <div className="flex justify-between items-center mb-6 mt-2">
              <div className="flex items-center space-x-3">
                <button onClick={() => { window.location.href = '/create-avatar/index.html'; }} className="relative group cursor-pointer z-10 block">
                  {user?.avatar_url && user.avatar_url.length > 0 ? (
                    <img src={user.avatar_url} alt="Profile" className="w-10 h-10 rounded-full border-2 border-white/10" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-lg">
                      {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-[10px] font-bold text-white">Edit</span>
                  </div>
                </button>
                <div>
                  <p className="text-xs text-text-secondary">Welcome back,</p>
                  <p className="font-medium text-text-primary">{user?.name?.split(' ')[0]}</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <button 
                  onClick={syncNow}
                  className="p-2 bg-white/5 text-text-secondary rounded-full hover:bg-white/10 hover:text-primary transition-colors"
                  title="Sync SMS"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
                <button 
                  onClick={logout}
                  className="p-2 bg-white/5 text-text-secondary rounded-full hover:bg-white/10 hover:text-error transition-colors"
                  title="Log out"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                </button>
                <button 
                  onClick={handleDownloadPDF}
                  disabled={isGeneratingPDF}
                  className="p-2 bg-white/5 text-text-secondary rounded-full hover:bg-white/10 hover:text-white transition-colors"
                  title="Download Statement"
                >
                  {isGeneratingPDF ? <Spinner className="w-4 h-4 text-white" /> : <Download className="w-4 h-4" />}
                </button>
                <button 
                  onClick={() => setIsSaveModalOpen(true)}
                  className="px-4 py-2 bg-[#10b981]/20 text-[#10b981] rounded-full text-sm font-medium flex items-center space-x-1.5 hover:bg-[#10b981]/30 transition-colors"
                >
                  <PiggyBank className="w-4 h-4" />
                  <span>Save</span>
                </button>
              </div>
            </div>

            {summary && summary.badges && summary.badges.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-wrap gap-3 mb-6 px-1"
              >
                {summary.badges.map((badge: string, i: number) => {
                  const config = getBadgeConfig(badge);
                  return (
                    <button 
                      key={i} 
                      onClick={() => showInfoToast(badge, config.description, config.icon)}
                      className={`px-3 py-1.5 text-[11px] uppercase tracking-wider rounded-full font-bold flex items-center transition-all hover:scale-105 active:scale-95 cursor-pointer ${config.classes}`}
                    >
                      {config.icon} {badge}
                    </button>
                  );
                })}
              </motion.div>
            )}
            
            {summary?.next_badge_target && (
              <div className="mb-6 px-1 flex items-start space-x-2 text-xs text-text-secondary bg-white/5 p-3 rounded-2xl border border-white/5">
                <Target className="w-4 h-4 text-purple-400 flex-shrink-0" />
                <span>{summary.next_badge_target}</span>
              </div>
            )}
            
            {summary?.current_streak > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mb-4 flex items-center gap-3 px-4 py-3 bg-orange-500/10 border border-orange-500/20 rounded-2xl"
              >
                <div className="text-2xl">🔥</div>
                <div>
                  <p className="text-sm font-bold text-orange-400">{summary.current_streak} day streak!</p>
                  <p className="text-[11px] text-text-secondary">Best: {summary.best_streak} days</p>
                </div>
              </motion.div>
            )}

            <div className="glass p-5 rounded-3xl border border-indigo-500/30 shadow-[0_0_40px_rgba(99,102,241,0.15)] relative overflow-hidden bg-indigo-500/10">
              <div className="flex justify-between items-end mb-2">
                <div>
                  <p className="text-xs text-text-secondary mb-1">Spent this month</p>
                  <div className="flex items-baseline space-x-1">
                    <span className="text-2xl font-display font-bold text-text-primary">
                      {formatCurrency(totalSpent + totalSubscriptions)}
                    </span>
                    <span className="text-sm text-text-secondary">/ {formatCurrency(budget)}</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-text-secondary mb-1">Left to spend</p>
                  <p className={`font-semibold ${remaining < 0 ? 'text-error' : 'text-success'}`}>
                    {formatCurrency(remaining)}
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
                  <span className="text-indigo-400">{formatCurrency(totalSpent)} spent</span>
                  <span className="text-purple-400 font-medium">{formatCurrency(totalSubscriptions)} subs</span>
                </div>
              )}
            </div>
          </header>

          {/* Content */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, staggerChildren: 0.1 }}
            className="px-4 space-y-6 pb-24 -mt-2"
          >
            <MiniCalendar />

            {insights.length > 0 && (
              <div className="mb-2">
                <h3 className="text-sm font-display font-semibold text-white/80 mb-3 flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-yellow-400" /> Smart Insights
                </h3>
                <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
                  {insights.map((insight: any, i: number) => (
                    <div key={i} className={`flex-shrink-0 w-64 p-4 rounded-2xl border ${
                      insight.type === 'warning' ? 'bg-red-500/10 border-red-500/20' :
                      insight.type === 'positive' ? 'bg-emerald-500/10 border-emerald-500/20' :
                      'bg-blue-500/10 border-blue-500/20'
                    }`}>
                      <span className="text-lg mb-2 block">{insight.icon}</span>
                      <p className="text-xs text-white/80 leading-relaxed">{insight.message}</p>
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
                      title="Spent / Day"
                      value={formatCurrency(summary.daily_average)}
                      icon={<Activity className="w-5 h-5 text-error" />}
                      theme="red"
                      onClick={() => showInfoToast("Spent / Day", "How much you're spending on average each day this month.", <Activity className="w-6 h-6 text-error" />)}
                    />
                    <MetricCard
                      title="Safe to Spend / Day"
                      value={formatCurrency(dailyAllowed)}
                      icon={<PiggyBank className="w-5 h-5 text-success" />}
                      theme="green"
                      onClick={() => showInfoToast("Safe to Spend / Day", "The amount you can safely spend each day for the rest of the month without going over budget.", <PiggyBank className="w-6 h-6 text-success" />)}
                    />
                    <MetricCard
                      title="Top Category"
                      value={summary.top_category || 'None'}
                      icon={<Target className="w-5 h-5 text-primary" />}
                      theme="purple"
                      onClick={() => showInfoToast("Top Category", "The category where you spend the most money this month.", <Target className="w-6 h-6 text-primary" />)}
                    />
                    <MetricCard
                      title="Transactions"
                      value={summary.transaction_count?.toString() || '0'}
                      icon={<Activity className="w-5 h-5 text-purple-500" />}
                      theme="blue"
                      onClick={() => showInfoToast("Transactions", "Total number of expenses you've recorded this month.", <Activity className="w-6 h-6 text-purple-500" />)}
                    />
                    <MetricCard
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
        <BottomNav />
      </AuthGuard>
    </ErrorBoundary>
  );
}
