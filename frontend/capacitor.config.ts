import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.lumina.smartexpense',
  appName: 'Smart Expense',
  webDir: 'out',
  server: {
    androidScheme: 'https',
  },
};

export default config;
