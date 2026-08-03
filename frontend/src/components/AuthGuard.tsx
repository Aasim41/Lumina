'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import { Spinner } from './ui/Spinner';
import { appNavigate } from '@/lib/utils';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // Check token synchronously — no network call needed
  const [authorized, setAuthorized] = useState(() => isAuthenticated());

  useEffect(() => {
    if (!isAuthenticated()) {
      if (!pathname.startsWith('/login')) {
        appNavigate('/login');
      }
      setAuthorized(false);
    } else {
      setAuthorized(true);
      // Defer notifications setup so it doesn't block rendering
      requestIdleCallback(() => {
        import('@/lib/notifications').then(({ requestNotificationPermissions, scheduleRecurringNotifications }) => {
          requestNotificationPermissions().then(() => scheduleRecurringNotifications());
        });
      });
    }
  }, [pathname]);

  if (!authorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Spinner className="w-8 h-8 text-primary" />
      </div>
    );
  }

  return <>{children}</>;
}

