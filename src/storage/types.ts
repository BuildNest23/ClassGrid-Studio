import { AppData } from '../types';

export type StorageEngineType = 'sqlite' | 'localStorage';

export interface StorageAdapter {
  /**
   * Initializes the storage engine (opens connection, runs migrations).
   * Safe to call multiple times (idempotent).
   */
  init(): Promise<void>;

  /**
   * Loads the primary application state. Returns null if no record exists.
   */
  loadAppData(): Promise<AppData | null>;

  /**
   * Persists the primary application state.
   */
  saveAppData(data: AppData): Promise<void>;

  /**
   * Returns timestamp of last save (ms since epoch), or null if not available.
   */
  getLastSaved(): Promise<number | null>;

  /**
   * Wipes primary application data (used by Reset Everything).
   */
  clearAll(): Promise<void>;

  /**
   * Generic key-value helpers for metadata or preference storage.
   */
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;

  /**
   * Identifies which engine is actively being used.
   */
  getStorageType(): StorageEngineType;

  /**
   * Returns human-readable storage details for display in Settings.
   */
  getStatus(): {
    engine: StorageEngineType;
    isNative: boolean;
    details: string;
    fallbackActive?: boolean;
  };
}
