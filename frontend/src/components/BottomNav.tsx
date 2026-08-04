'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Receipt, Target, TrendingUp, MoreHorizontal, Users, Heart, Landmark, PieChart, X } from 'lucide-react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';

const PRIMARY_TABS = [
  { name: 'Home', href: '/', icon: LayoutDashboard },
  { name: 'Expenses', href: '/transactions', icon: Receipt },
  { name: 'Budget', href: '/budget', icon: PieChart },
  { name: 'Goals', href: '/goals', icon: Target },
];

const MORE_TABS = [
  { name: 'Splits', href: '/splits', icon: Users, color: '#a855f7', desc: 'Split bills with friends' },
  { name: 'Debts', href: '/debts', icon: Landmark, color: '#3b82f6', desc: 'Manage loans & EMIs' },
  { name: 'Analytics', href: '/analytics', icon: TrendingUp, color: '#f97316', desc: 'Detailed spending insights' },
];

const GLIDER_STYLES = [
  // Home - Indigo
  { bg: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(79, 70, 229, 0.5))', shadow: '0 0 18px rgba(99, 102, 241, 0.4), 0 0 10px rgba(165, 180, 252, 0.2) inset' },
  // Expenses - Green
  { bg: 'linear-gradient(135deg, rgba(34, 197, 94, 0.2), rgba(22, 163, 74, 0.5))', shadow: '0 0 18px rgba(34, 197, 94, 0.4), 0 0 10px rgba(134, 239, 172, 0.2) inset' },
  // Budget - Rose
  { bg: 'linear-gradient(135deg, rgba(244, 63, 94, 0.2), rgba(225, 29, 72, 0.5))', shadow: '0 0 18px rgba(244, 63, 94, 0.4), 0 0 10px rgba(251, 113, 133, 0.2) inset' },
  // Goals - Amber
  { bg: 'linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(217, 119, 6, 0.5))', shadow: '0 0 18px rgba(245, 158, 11, 0.4), 0 0 10px rgba(252, 211, 77, 0.2) inset' },
  // More - Slate
  { bg: 'linear-gradient(135deg, rgba(148, 163, 184, 0.2), rgba(100, 116, 139, 0.5))', shadow: '0 0 18px rgba(148, 163, 184, 0.4), 0 0 10px rgba(203, 213, 225, 0.2) inset' },
];

export function BottomNav() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  const normalizedPath = pathname.replace(/\/index\.html$/, '').replace(/\/$/, '') || '/';
  
  // Check if a "more" page is active
  const isMorePageActive = MORE_TABS.some(t => t.href === normalizedPath);
  
  // Compute active index for primary tabs (or 4 for "More" button if a secondary page is active)
  let activeIndex = PRIMARY_TABS.findIndex(i => i.href === normalizedPath);
  if (activeIndex === -1) activeIndex = isMorePageActive ? 4 : 0;

  const activeStyle = GLIDER_STYLES[activeIndex] || GLIDER_STYLES[0];

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
              className="fixed inset-0 bg-black/60  z-[90]"
              onClick={() => setMoreOpen(false)}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-[95] px-4 pb-8"
              style={{ paddingBottom: 'calc(2rem + env(safe-area-inset-bottom))' }}
            >
              <div className="mx-auto max-w-md bg-[#111827]/95  rounded-3xl border border-white/10 p-5 shadow-2xl">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-display font-bold text-white">More</h3>
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
                    const isActive = normalizedPath === item.href;
                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        replace
                        onClick={() => setMoreOpen(false)}
                        className={`flex items-center gap-3 p-4 rounded-2xl border transition-all duration-200 hover:scale-[1.02] active:scale-95 ${
                          isActive 
                            ? 'bg-white/10 border-white/20 shadow-lg' 
                            : 'bg-white/5 border-white/5 hover:bg-white/10'
                        }`}
                      >
                        <div 
                          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                          style={{ backgroundColor: `${item.color}20` }}
                        >
                          <Icon className="w-5 h-5" style={{ color: item.color }} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-white truncate">{item.name}</p>
                          <p className="text-[10px] text-white/40 truncate">{item.desc}</p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 px-4 pt-2" style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}>
        <div className="glass-radio-group mx-auto max-w-md relative">
          {PRIMARY_TABS.map((item, i) => {
            const isActive = normalizedPath === item.href;
            const Icon = item.icon;
            
            return (
              <Link 
                key={item.name}
                href={item.href}
                replace
                className="flex-1 flex flex-col items-center justify-center text-[10px] p-2 cursor-pointer font-semibold tracking-wide relative z-10 h-16 transition-all duration-300"
                style={{ color: isActive ? '#fff' : 'var(--text)', transform: isActive ? 'translateY(-2px)' : 'none' }}
              >
                <Icon className="w-5 h-5 mb-1" strokeWidth={isActive ? 2.5 : 2} />
                <span>{item.name}</span>
              </Link>
            );
          })}

          {/* More Button */}
          <button
            onClick={() => setMoreOpen(true)}
            className="flex-1 flex flex-col items-center justify-center text-[10px] p-2 cursor-pointer font-semibold tracking-wide relative z-10 h-16 transition-all duration-300"
            style={{ color: isMorePageActive ? '#fff' : 'var(--text)', transform: isMorePageActive ? 'translateY(-2px)' : 'none' }}
          >
            <MoreHorizontal className="w-5 h-5 mb-1" strokeWidth={isMorePageActive ? 2.5 : 2} />
            <span>More</span>
          </button>

          <div 
            className="glass-glider"
            style={{
              transform: `translateX(${activeIndex * 100}%)`,
              background: activeStyle.bg,
              boxShadow: activeStyle.shadow,
            }}
          />
        </div>
      </nav>
    </>
  );
}
