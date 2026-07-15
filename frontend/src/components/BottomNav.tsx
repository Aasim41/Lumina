'use client';

import { usePathname } from 'next/navigation';
import { LayoutDashboard, Receipt, TrendingUp, Users, Heart, Target } from 'lucide-react';
import Link from 'next/link';

export function BottomNav() {
  const pathname = usePathname();

  const navItems = [
    { name: 'Home', href: '/', icon: LayoutDashboard },
    { name: 'Expenses', href: '/transactions', icon: Receipt },
    { name: 'Budget', href: '/budget', icon: Target },
    { name: 'Splits', href: '/splits', icon: Users },
    { name: 'Wishlist', href: '/wishlist', icon: Heart },
    { name: 'Analytics', href: '/analytics', icon: TrendingUp },
  ];

  const activeIndex = Math.max(0, navItems.findIndex(i => i.href === pathname));

  const gliderStyles = [
    // Dashboard - Indigo
    { bg: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(79, 70, 229, 0.5))', shadow: '0 0 18px rgba(99, 102, 241, 0.4), 0 0 10px rgba(165, 180, 252, 0.2) inset' },
    // Expenses - Green
    { bg: 'linear-gradient(135deg, rgba(34, 197, 94, 0.2), rgba(22, 163, 74, 0.5))', shadow: '0 0 18px rgba(34, 197, 94, 0.4), 0 0 10px rgba(134, 239, 172, 0.2) inset' },
    // Budget - Rose
    { bg: 'linear-gradient(135deg, rgba(244, 63, 94, 0.2), rgba(225, 29, 72, 0.5))', shadow: '0 0 18px rgba(244, 63, 94, 0.4), 0 0 10px rgba(251, 113, 133, 0.2) inset' },
    // Splits - Purple
    { bg: 'linear-gradient(135deg, rgba(168, 85, 247, 0.2), rgba(147, 51, 234, 0.5))', shadow: '0 0 18px rgba(168, 85, 247, 0.4), 0 0 10px rgba(216, 180, 254, 0.2) inset' },
    // Wishlist - Cyan
    { bg: 'linear-gradient(135deg, rgba(6, 182, 212, 0.2), rgba(8, 145, 178, 0.5))', shadow: '0 0 18px rgba(6, 182, 212, 0.4), 0 0 10px rgba(103, 232, 249, 0.2) inset' },
    // Analytics - Orange
    { bg: 'linear-gradient(135deg, rgba(249, 115, 22, 0.2), rgba(234, 88, 12, 0.5))', shadow: '0 0 18px rgba(249, 115, 22, 0.4), 0 0 10px rgba(253, 186, 116, 0.2) inset' },
  ];

  const activeStyle = gliderStyles[activeIndex];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 px-4 pt-2" style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}>
      <div className="glass-radio-group mx-auto max-w-md relative">
        {navItems.map((item, i) => {
          const isActive = pathname === item.href;
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
  );
}
