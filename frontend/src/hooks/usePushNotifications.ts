'use client';

import { useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';

export function usePushNotifications() {
  const registered = useRef(false);

  useEffect(() => {
    // Push Notifications only work on physical devices
    if (!Capacitor.isNativePlatform()) return;
    if (registered.current) return;

    const registerPush = async () => {
      try {
        const { PushNotifications } = await import('@capacitor/push-notifications');
        
        let permStatus = await PushNotifications.checkPermissions();

        if (permStatus.receive === 'prompt') {
          permStatus = await PushNotifications.requestPermissions();
        }

        if (permStatus.receive !== 'granted') {
          console.warn('User denied push notification permissions');
          return;
        }

        await PushNotifications.register();
        registered.current = true;

        PushNotifications.addListener('registration', async (token) => {
          console.log('Push registration success, token: ' + token.value);
        });

        PushNotifications.addListener('registrationError', (error: any) => {
          console.error('Error on registration: ' + JSON.stringify(error));
        });
      } catch (e) {
        console.warn('Push notification setup failed (non-fatal):', e);
      }
    };

    // Delay push notification setup so it doesn't block dashboard rendering
    const timer = setTimeout(registerPush, 3000);
    return () => clearTimeout(timer);
  }, []);
}
