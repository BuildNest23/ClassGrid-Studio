import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { AppData } from '../types';

export const AUTO_BACKUP_TIME_KEY = 'classroomLastAutoBackup';
const AUTO_BACKUP_ATTEMPT_KEY = 'classroomLastAutoBackupAttempt';
const RETRY_AFTER_FAILURE_MS = 60 * 60 * 1000; // after a failed attempt, wait 1 hour before trying again
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const MAX_BACKUP_FILES = 5;

/**
 * Returns the timestamp (ms) of the last successful auto-backup, or null if none.
 */
export function getLastAutoBackupTimestamp(): number | null {
  try {
    const raw = window.localStorage.getItem(AUTO_BACKUP_TIME_KEY);
    if (!raw) return null;
    const ts = parseInt(raw, 10);
    return Number.isNaN(ts) ? null : ts;
  } catch {
    return null;
  }
}

/**
 * Attempts an automatic safety backup to the device Documents directory.
 * - Throttled to at most once per 24 hours.
 * - Writes to a temporary file first, then atomically renames to final name.
 * - Keeps the latest 5 backup files and prunes older ones.
 * - Wrapped safely in try/catch: failures NEVER block the calling save process.
 */
export async function maybeTriggerAutoBackup(data: AppData): Promise<void> {
  try {
    const now = Date.now();
    const lastBackup = getLastAutoBackupTimestamp();

    if (lastBackup && now - lastBackup < ONE_DAY_MS) {
      // Less than 24 hours since last backup, skip
      return;
    }

    if (!Capacitor.isNativePlatform()) {
      // Browsers have no folder access for silent backups
      return;
    }

    // Do not retry a failed backup on every save (each try serializes all records)
    try {
      const lastAttempt = parseInt(window.localStorage.getItem(AUTO_BACKUP_ATTEMPT_KEY) || '0', 10);
      if (lastAttempt && now - lastAttempt < RETRY_AFTER_FAILURE_MS) return;
      window.localStorage.setItem(AUTO_BACKUP_ATTEMPT_KEY, String(now));
    } catch { /* ignore */ }

    const timestampStr = new Date(now).toISOString().replace(/[:.]/g, '-');
    const finalFileName = `classgrid-autobackup-${timestampStr}.json`;
    const tempFileName = `classgrid-autobackup-temp-${now}.tmp`;
    const jsonString = JSON.stringify(data, null, 2);

    // 1. Write to temporary file
    await Filesystem.writeFile({
      path: tempFileName,
      data: jsonString,
      directory: Directory.Documents,
      encoding: Encoding.UTF8,
    });

    // 2. Rename to final backup file name
    await Filesystem.rename({
      from: tempFileName,
      to: finalFileName,
      directory: Directory.Documents,
    });

    // 3. Update last backup timestamp
    try {
      window.localStorage.setItem(AUTO_BACKUP_TIME_KEY, now.toString());
      window.localStorage.removeItem(AUTO_BACKUP_ATTEMPT_KEY);
    } catch {
      // ignore localStorage quota errors
    }

    // 4. Clean up older backups, keeping only the latest MAX_BACKUP_FILES
    try {
      const dirResult = await Filesystem.readdir({
        path: '',
        directory: Directory.Documents,
      });

      const backupFiles = (dirResult.files || [])
        .map((f) => (typeof f === 'string' ? f : f.name))
        .filter((name) => name.startsWith('classgrid-autobackup-') && name.endsWith('.json'))
        .sort(); // Lexicographical sort corresponds to timestamp order

      if (backupFiles.length > MAX_BACKUP_FILES) {
        const filesToRemove = backupFiles.slice(0, backupFiles.length - MAX_BACKUP_FILES);
        for (const oldFile of filesToRemove) {
          try {
            await Filesystem.deleteFile({
              path: oldFile,
              directory: Directory.Documents,
            });
          } catch (delErr) {
            console.warn(`[AutoBackup] Could not delete old backup ${oldFile}:`, delErr);
          }
        }
      }
    } catch (cleanupErr) {
      console.warn('[AutoBackup] Error during backup rotation cleanup:', cleanupErr);
    }

    console.log(`[AutoBackup] Successfully created safety backup: ${finalFileName}`);
  } catch (err) {
    // Failures must NEVER block saving or app flow
    console.warn('[AutoBackup] Auto-backup failed silently:', err);
  }
}
