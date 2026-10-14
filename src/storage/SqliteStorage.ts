import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite';
import { AppData } from '../types';
import { StorageAdapter, StorageEngineType } from './types';

const DB_NAME = 'classgrid';
const PRIMARY_KEY = 'classroomData';
const MIGRATION_FLAG_KEY = 'migratedFromLocalStorage';

export class SqliteStorage implements StorageAdapter {
  private sqlite: SQLiteConnection;
  private db: SQLiteDBConnection | null = null;
  private initialized = false;

  constructor() {
    this.sqlite = new SQLiteConnection(CapacitorSQLite);
  }

  async init(): Promise<void> {
    if (this.initialized && this.db) {
      return;
    }

    try {
      const isConn = await this.sqlite.isConnection(DB_NAME, false);
      if (isConn.result) {
        this.db = await this.sqlite.retrieveConnection(DB_NAME, false);
      } else {
        this.db = await this.sqlite.createConnection(DB_NAME, false, 'no-encryption', 1, false);
      }

      await this.db.open();

      // Create table if it doesn't exist
      const schemaSql = `
        CREATE TABLE IF NOT EXISTS app_state (
          key TEXT PRIMARY KEY,
          value TEXT,
          updated_at INTEGER
        );
      `;
      await this.db.execute(schemaSql);

      // Perform safe one-time migration and subsequent-launch cleanup
      await this.handleMigration();

      this.initialized = true;
    } catch (err) {
      console.error('[SqliteStorage] Failed to initialize SQLite database:', err);
      this.initialized = false;
      this.db = null;
      throw err;
    }
  }

  /**
   * One-time migration of existing users from localStorage to SQLite:
   * - If app_state has no "classroomData" but localStorage has it: copy, verify, set flag.
   * - Do NOT delete localStorage copy on first launch.
   * - On a subsequent launch, if migration flag is confirmed present and SQLite has valid data,
   *   remove the stale localStorage fallback copy.
   */
  private async handleMigration(): Promise<void> {
    if (!this.db) return;

    try {
      const flagRes = await this.db.query(
        'SELECT value FROM app_state WHERE key = ? LIMIT 1;',
        [MIGRATION_FLAG_KEY]
      );
      const isAlreadyMigrated = flagRes.values && flagRes.values.length > 0 && flagRes.values[0]?.value === '1';

      if (isAlreadyMigrated) {
        // Migration was completed earlier. The localStorage copy may only be removed when SQLite
        // holds data that is at least as new. If a fallback session saved NEWER data into localStorage
        // (SQLite was unavailable at that time), copy it into SQLite first instead of throwing it away.
        try {
          const rawLocal = window.localStorage.getItem(PRIMARY_KEY);
          if (rawLocal) {
            const localTs = parseInt(window.localStorage.getItem('classroomLastSaved') || '0', 10) || 0;
            const tsRes = await this.db.query(
              'SELECT updated_at FROM app_state WHERE key = ? LIMIT 1;',
              [PRIMARY_KEY]
            );
            const sqliteTs = Number(tsRes.values?.[0]?.updated_at) || 0;

            if (localTs > sqliteTs) {
              const parsedLocal = JSON.parse(rawLocal);
              if (parsedLocal && typeof parsedLocal === 'object') {
                await this.db.run(
                  'INSERT OR REPLACE INTO app_state (key, value, updated_at) VALUES (?, ?, ?);',
                  [PRIMARY_KEY, rawLocal, Date.now()]
                );
                console.log('[SqliteStorage] Newer fallback data found in localStorage and copied into SQLite.');
              }
              // Keep the localStorage copy for now; it is removed on a later launch once SQLite is newer.
            } else {
              window.localStorage.removeItem(PRIMARY_KEY);
              window.localStorage.removeItem('classroomLastSaved');
              console.log('[SqliteStorage] Cleaned up obsolete localStorage copy on subsequent launch.');
            }
          }
        } catch (e) {
          console.warn('[SqliteStorage] Note: error checking/clearing localStorage:', e);
        }
        return;
      }

      // Check if SQLite already has classroomData
      const existingDataRes = await this.db.query(
        'SELECT value FROM app_state WHERE key = ? LIMIT 1;',
        [PRIMARY_KEY]
      );
      const hasSqliteData = existingDataRes.values && existingDataRes.values.length > 0 && !!existingDataRes.values[0]?.value;

      if (!hasSqliteData) {
        // Check if localStorage has existing classroom data to migrate
        let rawLocal: string | null = null;
        try {
          rawLocal = window.localStorage.getItem(PRIMARY_KEY);
        } catch {
          rawLocal = null;
        }

        if (rawLocal && rawLocal.trim().length > 0) {
          console.log('[SqliteStorage] Found existing localStorage data. Migrating to SQLite...');

          // Validate that the string parses as JSON before migrating
          const parsed = JSON.parse(rawLocal);
          if (parsed && typeof parsed === 'object') {
            const now = Date.now();
            await this.db.run(
              'INSERT OR REPLACE INTO app_state (key, value, updated_at) VALUES (?, ?, ?);',
              [PRIMARY_KEY, rawLocal, now]
            );

            // Verify read-back
            const verifyRes = await this.db.query(
              'SELECT value FROM app_state WHERE key = ? LIMIT 1;',
              [PRIMARY_KEY]
            );
            const verifiedVal = verifyRes.values?.[0]?.value;

            if (verifiedVal && verifiedVal.length === rawLocal.length) {
              // Parse back to confirm integrity
              JSON.parse(verifiedVal);

              // Mark migration flag as done
              await this.db.run(
                'INSERT OR REPLACE INTO app_state (key, value, updated_at) VALUES (?, ?, ?);',
                [MIGRATION_FLAG_KEY, '1', now]
              );
              console.log('[SqliteStorage] Migration succeeded and verified! Keeping localStorage fallback for this first session.');
            } else {
              throw new Error('SQLite read-back verification failed during migration');
            }
          }
        }
      }
    } catch (migErr) {
      console.error('[SqliteStorage] Migration error:', migErr);
      // Migration error is logged; do not destroy data
    }
  }

  private ensureConnected(): SQLiteDBConnection {
    if (!this.db) {
      throw new Error('SQLite database is not initialized. Call init() first.');
    }
    return this.db;
  }

  async loadAppData(): Promise<AppData | null> {
    const db = this.ensureConnected();
    try {
      const res = await db.query(
        'SELECT value FROM app_state WHERE key = ? LIMIT 1;',
        [PRIMARY_KEY]
      );
      if (!res.values || res.values.length === 0 || !res.values[0]?.value) {
        return null;
      }
      const raw = res.values[0].value;
      return JSON.parse(raw) as AppData;
    } catch (err) {
      console.error('[SqliteStorage] loadAppData error:', err);
      throw err;
    }
  }

  async saveAppData(data: AppData): Promise<void> {
    const db = this.ensureConnected();
    try {
      const serialized = JSON.stringify(data);
      const now = Date.now();
      await db.run(
        'INSERT OR REPLACE INTO app_state (key, value, updated_at) VALUES (?, ?, ?);',
        [PRIMARY_KEY, serialized, now]
      );
    } catch (err) {
      console.error('[SqliteStorage] saveAppData error:', err);
      throw err;
    }
  }

  async getLastSaved(): Promise<number | null> {
    const db = this.ensureConnected();
    try {
      const res = await db.query(
        'SELECT updated_at FROM app_state WHERE key = ? LIMIT 1;',
        [PRIMARY_KEY]
      );
      if (!res.values || res.values.length === 0 || res.values[0]?.updated_at == null) {
        return null;
      }
      return Number(res.values[0].updated_at);
    } catch {
      return null;
    }
  }

  async clearAll(): Promise<void> {
    const db = this.ensureConnected();
    try {
      await db.run('DELETE FROM app_state WHERE key = ?;', [PRIMARY_KEY]);
    } catch (err) {
      console.error('[SqliteStorage] clearAll error:', err);
      throw err;
    }
  }

  async getItem(key: string): Promise<string | null> {
    const db = this.ensureConnected();
    try {
      const res = await db.query(
        'SELECT value FROM app_state WHERE key = ? LIMIT 1;',
        [key]
      );
      if (!res.values || res.values.length === 0) return null;
      return res.values[0]?.value ?? null;
    } catch (err) {
      console.error(`[SqliteStorage] getItem(${key}) error:`, err);
      return null;
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    const db = this.ensureConnected();
    try {
      const now = Date.now();
      await db.run(
        'INSERT OR REPLACE INTO app_state (key, value, updated_at) VALUES (?, ?, ?);',
        [key, value, now]
      );
    } catch (err) {
      console.error(`[SqliteStorage] setItem(${key}) error:`, err);
      throw err;
    }
  }

  async removeItem(key: string): Promise<void> {
    const db = this.ensureConnected();
    try {
      await db.run('DELETE FROM app_state WHERE key = ?;', [key]);
    } catch (err) {
      console.error(`[SqliteStorage] removeItem(${key}) error:`, err);
      throw err;
    }
  }

  getStorageType(): StorageEngineType {
    return 'sqlite';
  }

  getStatus() {
    return {
      engine: 'sqlite' as StorageEngineType,
      isNative: true,
      details: 'Native SQLite Database (classgrid.db)',
      fallbackActive: false,
    };
  }
}
