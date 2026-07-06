'use client';

import { useEffect } from 'react';
import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { useAuth } from './useAuth';

export function usePushNotifications() {
  const { user } = useAuth();

  useEffect(() => {
    // Push Notifications only work on physical devices (Android/iOS)
    if (!Capacitor.isNativePlatform()) return;
    if (!user) return;

    const registerPush = async () => {
      let permStatus = await PushNotifications.checkPermissions();

      if (permStatus.receive === 'prompt') {
        permStatus = await PushNotifications.requestPermissions();
      }

      if (permStatus.receive !== 'granted') {
        console.warn('User denied push notification permissions');
        return;
      }

      await PushNotifications.register();
    };

    registerPush();

    // Listeners
    PushNotifications.addListener('registration', async (token) => {
      console.log('Push registration success, token: ' + token.value);
      // Send token to our backend
      try {
        await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/fcm-token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({ fcm_token: token.value })
        });
      } catch (e) {
        console.error('Failed to save FCM token to backend', e);
      }
    });

    PushNotifications.addListener('registrationError', (error: any) => {
      console.error('Error on registration: ' + JSON.stringify(error));
    });

    return () => {
      PushNotifications.removeAllListeners();
    };
  }, [user]);
}
