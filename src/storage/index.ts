import { Capacitor } from '@capacitor/core';
import { StorageAdapter } from './types';
import { WebStorage } from './WebStorage';
import { SqliteStorage } from './SqliteStorage';

export * from './types';
export * from './WebStorage';
export * from './SqliteStorage';

let currentAdapter: StorageAdapter | null = null;
let initPromise: Promise<StorageAdapter> | null = null;
let fallbackTriggered = false;

export async function getStorage(): Promise<StorageAdapter> {
  if (currentAdapter) {
    return currentAdapter;
  }
  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    const isAndroid = Capacitor.getPlatform() === 'android';

    if (isAndroid) {
      try {
        console.log('[Storage] Initializing Native SQLite storage for Android...');
        const sqliteAdapter = new SqliteStorage();
        await sqliteAdapter.init();
        currentAdapter = sqliteAdapter;
        fallbackTriggered = false;
        console.log('[Storage] Native SQLite storage successfully initialized.');
        return sqliteAdapter;
      } catch (err: any) {
        console.error('[Storage] Native SQLite initialization failed. Falling back to WebStorage:', err);
        fallbackTriggered = true;
        const fallbackAdapter = new WebStorage(true);
        await fallbackAdapter.init();
        currentAdapter = fallbackAdapter;
        return fallbackAdapter;
      }
    } else {
      console.log('[Storage] Initializing WebStorage (localStorage) for web/PWA platform...');
      const webAdapter = new WebStorage(false);
      await webAdapter.init();
      currentAdapter = webAdapter;
      fallbackTriggered = false;
      return webAdapter;
    }
  })();

  return initPromise;
}

export function isStorageFallbackActive(): boolean {
  return fallbackTriggered;
}

