'use client';

import { usePathname } from 'next/navigation';
import { LayoutDashboard, Receipt, TrendingUp, Users, Heart } from 'lucide-react';
import { Fragment } from 'react';
import Link from 'next/link';

export function BottomNav() {
  const pathname = usePathname();

  const navItems = [
    { name: 'Home', href: '/', icon: LayoutDashboard },
    { name: 'Expenses', href: '/transactions', icon: Receipt },
    { name: 'Splits', href: '/splits', icon: Users },
    { name: 'Wishlist', href: '/wishlist', icon: Heart },
    { name: 'Forecast', href: '/forecast', icon: TrendingUp },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 px-4 safe-pb pb-4">
      <div className="glass-radio-group mx-auto max-w-md">
        {navItems.map((item, i) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          
          return (
            <Fragment key={item.name}>
              <input
                type="radio"
                id={`nav-${i}`}
                name="bottom-nav"
                checked={isActive}
                readOnly
              />
              <Link 
                href={item.href}
                replace
              >
                <Icon className="w-5 h-5 mb-1" strokeWidth={isActive ? 2.5 : 2} />
                <span>{item.name}</span>
              </Link>
            </Fragment>
          );
        })}
        <div className="glass-glider"></div>
      </div>
    </nav>
  );
}
