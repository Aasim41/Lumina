'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Receipt, 
  Plus, 
  PieChart, 
  MoreHorizontal, 
  Target, 
  Users, 
  Landmark, 
  TrendingUp, 
  Sparkles, 
  X
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { appNavigate } from '@/lib/utils';
import { ManualEntryForm } from './ManualEntryForm';
import { createTransaction } from '@/lib/api';
import { soundFX } from '@/lib/soundFx';
import toast from 'react-hot-toast';

const MORE_TABS = [
  { name: 'Forecast', href: '/forecast/', path: '/forecast', icon: Sparkles, color: '#ec4899', desc: 'Future spending estimate' },
  { name: 'Goals', href: '/goals/', path: '/goals', icon: Target, color: '#f59e0b', desc: 'Savings targets & dreams' },
  { name: 'Splits', href: '/splits/', path: '/splits', icon: Users, color: '#a855f7', desc: 'Split bills with friends' },
  { name: 'Debts', href: '/debts/', path: '/debts', icon: Landmark, color: '#3b82f6', desc: 'Track loans & money owed' },
  { name: 'Analytics', href: '/analytics/', path: '/analytics', icon: TrendingUp, color: '#06b6d4', desc: 'Detailed spending patterns' },
];

const GLIDER_STYLES = [
  // 0: Home - Indigo
  { bg: 'linear-gradient(135deg, rgba(99, 102, 241, 0.25), rgba(79, 70, 229, 0.55))', shadow: '0 0 18px rgba(99, 102, 241, 0.4), 0 0 10px rgba(165, 180, 252, 0.2) inset' },
  // 1: Expenses - Green
  { bg: 'linear-gradient(135deg, rgba(34, 197, 94, 0.25), rgba(22, 163, 74, 0.55))', shadow: '0 0 18px rgba(34, 197, 94, 0.4), 0 0 10px rgba(134, 239, 172, 0.2) inset' },
  // 2: Add Expense (Center) - Neon Emerald Glow
  { bg: 'linear-gradient(135deg, rgba(16, 185, 129, 0.35), rgba(13, 148, 136, 0.65))', shadow: '0 0 22px rgba(16, 185, 129, 0.5), 0 0 12px rgba(110, 231, 183, 0.3) inset' },
  // 3: Budget - Rose
  { bg: 'linear-gradient(135deg, rgba(244, 63, 94, 0.25), rgba(225, 29, 72, 0.55))', shadow: '0 0 18px rgba(244, 63, 94, 0.4), 0 0 10px rgba(251, 113, 133, 0.2) inset' },
  // 4: More - Slate
  { bg: 'linear-gradient(135deg, rgba(148, 163, 184, 0.25), rgba(100, 116, 139, 0.55))', shadow: '0 0 18px rgba(148, 163, 184, 0.4), 0 0 10px rgba(203, 213, 225, 0.2) inset' },
];

export function BottomNav() {
  const pathname = usePathname() || '/';
  const [moreOpen, setMoreOpen] = useState(false);
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);

  useEffect(() => {
    const handleOpenAdd = () => setIsAddExpenseOpen(true);
    window.addEventListener('lumina_open_add_expense', handleOpenAdd);
    return () => window.removeEventListener('lumina_open_add_expense', handleOpenAdd);
  }, []);

  const handleCreateTransaction = async (data: any) => {
    try {
      await createTransaction(data);
      soundFX.playChaChing();
      toast.success('Transaction logged successfully! 🎉');
      setIsAddExpenseOpen(false);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('lumina_transactions');
        localStorage.removeItem('lumina_summary');
        localStorage.removeItem('lumina_categories');
        localStorage.removeItem('lumina_trends');
        window.dispatchEvent(new Event('lumina_refresh_data'));
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to log transaction');
    }
  };

  // Dismiss More Sheet when Android back button / gesture is pressed
  useEffect(() => {
    if (!moreOpen) return;
    const handleBack = (e: Event) => {
      e.preventDefault();
      setMoreOpen(false);
    };
    window.addEventListener('lumina_modal_back_pressed', handleBack);
    return () => window.removeEventListener('lumina_modal_back_pressed', handleBack);
  }, [moreOpen]);

  // Normalize current path
  const cleanPath = pathname.replace(/^\/+/, '').replace(/\/+$/, '').replace(/(^|\/)index\.html$/, '');
  const normalizedPath = cleanPath ? `/${cleanPath}` : '/';
  
  // Check if a "more" page is active
  const isMorePageActive = MORE_TABS.some(t => normalizedPath.startsWith(t.path));
  
  // Compute active glider index (5 buttons):
  // 0: Home, 1: Expenses, 2: UPI (dynamic action), 3: Budget, 4: More
  let activeIndex = 0;
  if (normalizedPath === '/') {
    activeIndex = 0;
  } else if (normalizedPath.startsWith('/transactions')) {
    activeIndex = 1;
  } else if (normalizedPath.startsWith('/budget')) {
    activeIndex = 3;
  } else if (isMorePageActive) {
    activeIndex = 4;
  }

  const activeStyle = GLIDER_STYLES[activeIndex] || GLIDER_STYLES[0];

  const handleTabClick = (e: React.MouseEvent, href: string, path: string) => {
    e.preventDefault();
    if ((normalizedPath === '/' && path === '/') || (path !== '/' && normalizedPath === path)) {
      return;
    }
    appNavigate(href);
  };



  return (
    <>
      {/* More Sheet Overlay */}
      <AnimatePresence>
        {moreOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-[90]"
              onClick={() => setMoreOpen(false)}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-[95] px-4 pb-8"
              style={{ paddingBottom: 'calc(2rem + env(safe-area-inset-bottom, 1rem))' }}
            >
              <div className="mx-auto max-w-md bg-[#111827]/95 rounded-3xl border border-white/10 p-5 shadow-2xl">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-display font-bold text-white">More Features</h3>
                  <button 
                    onClick={() => setMoreOpen(false)}
                    className="p-2 bg-white/5 rounded-full hover:bg-white/10 transition-colors"
                  >
                    <X className="w-4 h-4 text-white/60" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {MORE_TABS.map((item) => {
                    const Icon = item.icon;
                    const isActive = normalizedPath.startsWith(item.path);
                    return (
                      <a
                        key={item.name}
                        href={item.href}
                        onClick={(e) => {
                          setMoreOpen(false);
                          handleTabClick(e, item.href, item.path);
                        }}
                        className={`flex items-center gap-3 p-3.5 rounded-2xl border transition-all duration-200 hover:scale-[1.02] active:scale-95 cursor-pointer ${
                          isActive 
                            ? 'bg-white/10 border-white/20 shadow-lg' 
                            : 'bg-white/5 border-white/5 hover:bg-white/10'
                        }`}
                      >
                        <div 
                          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                          style={{ backgroundColor: `${item.color}20` }}
                        >
                          <Icon className="w-4 h-4" style={{ color: item.color }} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-white truncate">{item.name}</p>
                          <p className="text-[10px] text-white/40 truncate">{item.desc}</p>
                        </div>
                      </a>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* 5-Button Bottom Navigation Bar (Centered Add Expense Quick-Log) */}
      <nav 
        className="fixed bottom-0 left-0 right-0 z-50 px-3 sm:px-4 pointer-events-none flex justify-center pb-1.5 safe-pb"
      >
        <div className="glass-radio-group w-full max-w-md relative pointer-events-auto">
          {/* Button 1: Home */}
          <a 
            href="/"
            onClick={(e) => handleTabClick(e, '/', '/')}
            className="flex-1 flex flex-col items-center justify-center text-[10px] p-2 cursor-pointer font-semibold tracking-wide relative z-10 h-16 transition-all duration-300 select-none touch-manipulation"
            style={{ 
              color: activeIndex === 0 ? '#fff' : 'var(--text)', 
              transform: activeIndex === 0 ? 'translateY(-2px)' : 'none' 
            }}
          >
            <LayoutDashboard className="w-5 h-5 mb-1" strokeWidth={activeIndex === 0 ? 2.5 : 2} />
            <span>Home</span>
          </a>

          {/* Button 2: Expenses */}
          <a 
            href="/transactions/"
            onClick={(e) => handleTabClick(e, '/transactions/', '/transactions')}
            className="flex-1 flex flex-col items-center justify-center text-[10px] p-2 cursor-pointer font-semibold tracking-wide relative z-10 h-16 transition-all duration-300 select-none touch-manipulation"
            style={{ 
              color: activeIndex === 1 ? '#fff' : 'var(--text)', 
              transform: activeIndex === 1 ? 'translateY(-2px)' : 'none' 
            }}
          >
            <Receipt className="w-5 h-5 mb-1" strokeWidth={activeIndex === 1 ? 2.5 : 2} />
            <span>Expenses</span>
          </a>

          {/* Button 3: Add Expense (Central Action Button) */}
          <button
            type="button"
            onClick={() => setIsAddExpenseOpen(true)}
            className="flex-1 flex flex-col items-center justify-center text-[10px] p-1.5 cursor-pointer font-bold tracking-wide relative z-10 h-16 transition-all duration-300 select-none touch-manipulation text-emerald-400 hover:text-emerald-300 active:scale-95"
            title="Log Expense"
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-500/30 to-teal-400/30 border border-emerald-400/50 flex items-center justify-center shadow-[0_0_12px_rgba(16,185,129,0.35)] mb-0.5">
              <Plus className="w-4 h-4 text-emerald-300" strokeWidth={2.5} />
            </div>
            <span className="text-[10px] font-bold text-emerald-300">Add</span>
          </button>

          {/* Button 4: Budget */}
          <a 
            href="/budget/"
            onClick={(e) => handleTabClick(e, '/budget/', '/budget')}
            className="flex-1 flex flex-col items-center justify-center text-[10px] p-2 cursor-pointer font-semibold tracking-wide relative z-10 h-16 transition-all duration-300 select-none touch-manipulation"
            style={{ 
              color: activeIndex === 3 ? '#fff' : 'var(--text)', 
              transform: activeIndex === 3 ? 'translateY(-2px)' : 'none' 
            }}
          >
            <PieChart className="w-5 h-5 mb-1" strokeWidth={activeIndex === 3 ? 2.5 : 2} />
            <span>Budget</span>
          </a>

          {/* Button 5: More */}
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className="flex-1 flex flex-col items-center justify-center text-[10px] p-2 cursor-pointer font-semibold tracking-wide relative z-10 h-16 transition-all duration-300 select-none touch-manipulation"
            style={{ 
              color: activeIndex === 4 ? '#fff' : 'var(--text)', 
              transform: activeIndex === 4 ? 'translateY(-2px)' : 'none' 
            }}
          >
            <MoreHorizontal className="w-5 h-5 mb-1" strokeWidth={activeIndex === 4 ? 2.5 : 2} />
            <span>More</span>
          </button>

          {/* Animated Glider Indicator */}
          <div 
            className="glass-glider pointer-events-none"
            style={{
              transform: `translateX(${activeIndex * 100}%)`,
              background: activeStyle.bg,
              boxShadow: activeStyle.shadow,
            }}
          />
        </div>
      </nav>

      {/* Global Add Expense Modal */}
      <ManualEntryForm
        isOpen={isAddExpenseOpen}
        onClose={() => setIsAddExpenseOpen(false)}
        onSubmit={handleCreateTransaction}
      />
    </>
  );
}
