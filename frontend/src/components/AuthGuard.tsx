'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import { Spinner } from './ui/Spinner';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) {
      if (pathname !== '/login' && pathname !== '/login/') {
        window.location.replace('/login/index.html');
      }
    } else {
      setAuthorized(true);
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
