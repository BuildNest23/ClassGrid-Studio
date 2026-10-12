import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.classgrid.app',
  appName: 'Classgrid',
  webDir: 'dist',
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true,
      backgroundColor: '#991B1B',
      androidSplashResourceName: 'splash',
      showSpinner: false
    }
  }
};

export default config;
