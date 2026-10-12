import { createRoot } from 'react-dom/client';
import { Capacitor } from '@capacitor/core';
import App from './App.tsx';
import './index.css';

// Tag native Capacitor runtime for Android / iOS notch and status-bar safe-area insets
if (typeof window !== 'undefined') {
  if (Capacitor.isNativePlatform()) {
    document.documentElement.classList.add('is-native-app');
    if (Capacitor.getPlatform() === 'android') {
      document.documentElement.classList.add('is-android-native');
    }
  }
}

createRoot(document.getElementById('root')!).render(<App />);

// Offline support (installable PWA). Only in production builds.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {
      /* offline caching is optional; ignore registration errors */
    });
  });
}
