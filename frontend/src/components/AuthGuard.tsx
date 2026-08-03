'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Spinner } from './ui/Spinner';
import { appNavigate } from '@/lib/utils';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [authorized, setAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
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
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        if (!pathname.startsWith('/login')) {
          appNavigate('/login');
        }
        setAuthorized(false);
      } else {
        setAuthorized(true);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [pathname]);

  if (authorized === null || !authorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Spinner className="w-8 h-8 text-primary" />
      </div>
    );
  }

  return <>{children}</>;
}
