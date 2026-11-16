'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { App as CapApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { appBack, normalizeRoute } from '@/lib/utils';
import toast from 'react-hot-toast';

export function GlobalBackHandler() {
  const pathname = usePathname() || '/';
  const lastBackPressTime = useRef<number>(0);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let backSub: any = null;

    const setupBack = async () => {
      try {
        backSub = await CapApp.addListener('backButton', () => {
          // 1. Dispatch custom event so any open modal, sheet, drawer, or scanner can dismiss itself
          const evt = new CustomEvent('lumina_modal_back_pressed', { cancelable: true });
          const wasHandled = !window.dispatchEvent(evt);
          if (wasHandled) {
            // A modal consumed the back event and closed
            return;
          }

          // 2. Check if we are on a subpage or secondary screen
          const currentPath = normalizeRoute(window.location.pathname || pathname);
          const isHomePage = currentPath === '/';

          if (!isHomePage) {
            // On ANY subpage, navigate back to the previous screen or Home screen!
            // NEVER complete exit to the phone's home screen!
            appBack('/');
            return;
          }

          // 3. We are on the root Home page with NO modals open.
          // Enforce double-tap back to exit (standard Android fintech UX: PhonePe, GPay, Paytm)
          const now = Date.now();
          if (now - lastBackPressTime.current < 2000) {
            CapApp.exitApp();
          } else {
            lastBackPressTime.current = now;
            toast('Press back again to exit Lumina', {
              icon: '👋',
              duration: 2000,
              id: 'lumina_exit_toast',
            });
          }
        });
      } catch (err) {
        console.warn('Capacitor backButton listener registration warning:', err);
      }
    };

    setupBack();

    return () => {
      if (backSub) {
        try {
          backSub.remove();
        } catch {}
      }
    };
  }, [pathname]);

  return null;
}
