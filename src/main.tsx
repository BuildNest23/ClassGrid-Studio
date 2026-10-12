import { createRoot } from 'react-dom/client';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import App from './App.tsx';
import './index.css';

// Tag native Capacitor runtime and configure native Android status bar
if (typeof window !== 'undefined' && Capacitor.isNativePlatform()) {
  document.documentElement.classList.add('is-native-app');
  if (Capacitor.getPlatform() === 'android') {
    document.documentElement.classList.add('is-android-native');
    try {
      // Solid crimson red status bar across camera notch and top
      StatusBar.setOverlaysWebView({ overlay: true }).catch(() => {});
      StatusBar.setBackgroundColor({ color: '#991B1B' }).catch(() => {});
      StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
    } catch {
      /* safe fallback if plugin is unavailable */
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
