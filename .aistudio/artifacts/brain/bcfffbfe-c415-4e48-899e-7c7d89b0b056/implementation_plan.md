# Implementation Plan: SQLite Primary Persistence for Android with Web Fallback & Auto-Backup

Replace `localStorage` as the primary persistence layer for application state with SQLite on Android using `@capacitor-community/sqlite` (Capacitor 8 compatible), preserving full Web/PWA support, ensuring zero data loss with safe migration, write queuing with flush-on-pause/background, async startup loading screen, and 24-hour safety auto-backups.

## User Review Required

> [!IMPORTANT]
> **Zero Data Loss Guarantee**: Existing Android users will have their `classroomData` safely copied to SQLite on first launch. The `localStorage` copy is verified before marking migration complete and retained as a safety fallback. If SQLite encounters any failure, the app gracefully falls back to `WebStorage` with a non-blocking toast, ensuring the app remains 100% functional.

- **Storage Architecture**:
  - `app_state` table (`key TEXT PRIMARY KEY, value TEXT, updated_at INTEGER`) in database `classgrid`.
  - App state JSON is stored under key `classroomData`.
  - Lightweight UI preferences (`classroomDark`, `classroomTab`, etc.) remain in `localStorage`.
- **Auto-Backup**:
  - Written to app's `Documents/classgrid-backups/` folder using `@capacitor/filesystem`.
  - Triggers at most once every 24 hours after a successful save.
  - Keeps the latest 5 timestamped backups, pruning older ones.
  - Atomic write: writes to a temporary file, then renames.

---

## Proposed Changes

### 1. Storage Abstraction Layer (`src/storage/`)

Create modular, strongly typed storage adapters with runtime detection:
- `src/storage/types.ts`:
  - `StorageAdapter` interface:
    - `init(): Promise<void>`
    - `loadAppData(): Promise<AppData | null>`
    - `saveAppData(data: AppData): Promise<void>`
    - `getLastSaved(): Promise<number | null>`
    - `clearAll(): Promise<void>`
    - `getItem(key: string): Promise<string | null>`
    - `setItem(key: string, value: string): Promise<void>`
    - `removeItem(key: string): Promise<void>`
    - `getStorageType(): 'sqlite' | 'localStorage'`
- `src/storage/WebStorage.ts`:
  - Implements `StorageAdapter` backed by browser `localStorage`.
- `src/storage/SqliteStorage.ts`:
  - Implements `StorageAdapter` backed by `@capacitor-community/sqlite`.
  - Database: `classgrid`. Table: `app_state (key TEXT PRIMARY KEY, value TEXT, updated_at INTEGER)`.
  - Migration on first run:
    - If `classroomData` is missing in `app_state` but present in `localStorage`, copies it over, verifies string length & parse match, then writes flag `migratedFromLocalStorage = 1`.
    - Retains `localStorage` copy safely.
  - Graceful fallback: If connection or table creation fails, delegates to fallback `WebStorage` and emits a warning event for non-blocking toast notification.
- `src/storage/index.ts`:
  - Factory exporting singleton adapter `getStorageAdapter()`:
    - Returns `SqliteStorage` if `Capacitor.getPlatform() === 'android'`.
    - Returns `WebStorage` on web/PWA or when fallback is active.

### 2. Auto-Backup Service (`src/storage/autoBackup.ts`)

- Checks timestamp stored in `classgrid_last_auto_backup`.
- If > 24 hours elapsed (or never run), writes formatted JSON backup to `Documents/classgrid-backups/classgrid-backup-<timestamp>.json` via `@capacitor/filesystem`.
- Atomic pattern: write to `.tmp` file, then rename.
- Pruning: reads directory, keeps newest 5 files, deletes older files.
- Non-blocking: wrapped in `try/catch`, never blocks user save actions.
- Tracks `classgrid_last_auto_backup` timestamp for display in Settings.

### 3. Asynchronous Startup & Hydration in `ClassroomContext.tsx`

- Add `isLoadingStorage` state initialized to `true`.
- On mount `useEffect`:
  - Run `storage.init()`.
  - Call `storage.loadAppData()`.
  - Pass result through `normalizeData(result ?? makeBaseData())`.
  - Set `dataRef.current` and state `data`.
  - Set `isLoadingStorage(false)`.
- Render a clean, branded loading splash if `isLoadingStorage` is true (styled with crimson accent and school branding matching app theme), preventing any premature empty-state write that could overwrite user data.

### 4. Non-Blocking Debounced Write Queue with Flush on Pause/Background

- `writeQueueRef`: serializes async saves in sequence.
- Debounce save operations (~350ms) during active typing/interactions, but ensure full state is queued.
- `flushSaveQueue()`:
  - Listens to `@capacitor/app` `pause` / `appStateChange` (on Android native).
  - Listens to `visibilitychange` (on web).
  - Listens to `beforeunload` (on desktop/web).
  - Immediately flushes pending save to SQLite/localStorage synchronously/awaitable so backgrounded app loses zero edits.
- Keep in-memory undo/redo history and synchronous UI responsiveness identical to current behavior.

### 5. SettingsView & Reset / Import Updates

- Update `SettingsView.tsx`:
  - Show "Last auto-backup" next to "Last manual backup".
  - Show active storage engine badge (e.g., "Storage Engine: SQLite (Android)" or "Storage Engine: Web LocalStorage").
  - `replaceAllData` and `resetEverything` routed through `storage.saveAppData()` and `storage.clearAll()`.
- Update `capacitor.config.ts`:
  - Add `plugins.CapacitorSQLite` configuration block if required.

### 6. GitHub Actions Workflow Verification (`.github/workflows/android.yml`)

- Verify `npx cap sync android` runs cleanly with `@capacitor-community/sqlite` and `@capacitor/app`.
- Ensure no committed `android/` directory is required and `npm install` handles peer dependencies cleanly.

---

## Verification Plan

### Automated Verification
1. `npm run lint` (`tsc --noEmit`): Verify strict TypeScript compilation with zero errors.
2. `npm run build` (`vite build`): Verify production bundle builds cleanly.
3. Node test script running storage initialization and serialization checks.

### Manual Test Checklist
1. **Fresh Install**: SQLite initializes, creates `app_state` table, initializes default data.
2. **Upgrade from localStorage**: Existing `classroomData` in localStorage is imported into SQLite on first launch, verified, and flagged.
3. **App Pause / Kill right after edit**: Edit a student's name, switch apps immediately; verify change was flushed and persists on reopen.
4. **Restore a Backup**: Import JSON backup; state replaces in both memory and SQLite.
5. **Reset Everything**: Wipes data from SQLite and resets in-memory state cleanly.
6. **Web/PWA Verification**: Web platform continues using localStorage with zero errors and no degradation.
