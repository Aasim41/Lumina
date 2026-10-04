'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import { Spinner } from './ui/Spinner';
import { appNavigate } from '@/lib/utils';

// Global flag to track if the client has already mounted.
// After the first page loads, all tab switching is instant with zero spinner flash.
let globalHasHydrated = false;

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(() => globalHasHydrated);
  const [authorized, setAuthorized] = useState(() => globalHasHydrated ? isAuthenticated() : false);

  useEffect(() => {
    globalHasHydrated = true;
    setMounted(true);
    const authed = isAuthenticated();
    setAuthorized(authed);

    if (!authed) {
      if (!pathname.startsWith('/login')) {
        appNavigate('/login');
      }
    }
  }, [pathname]);

  if (!mounted || !authorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Spinner className="w-8 h-8 text-primary" />
      </div>
    );
  }

  return <>{children}</>;
}
