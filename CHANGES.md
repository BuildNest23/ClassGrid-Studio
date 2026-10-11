# Changes in this version

## New features
- **Start on Dashboard each session** – a new browser session always opens on the Dashboard; a refresh restores the last tab (same as the original app).
- **Header hides on scroll (mobile ≤ 800px)** – scrolls away going down, returns going up.
- **Auto-scroll focused cell** – in Results and Funds tables the focused input is centered so the keyboard never covers it.
- **PWA / offline** – `public/manifest.json`, `public/sw.js` (service worker), app icons, favicon, iOS/Android meta tags. The Install button now works (production build: `npm run build && npm run preview`).
- **Data migration** (`src/utils/migrate.ts`) – runs on app load AND on backup import: fills missing ids/names, converts old `H` attendance status to `L`, removes legacy keys, fixes bad types, de-duplicates student ids.

## Bugs fixed
1. Marks / fund amount / date / note / remark / subject / pass-% inputs went stale after the **A** button, **Exempt**, **Mark All Paid**, **Undo/Redo**, import. New `SyncInput` component always re-syncs to real data.
2. Undo history: text fields (remarks, notes, dates) now make exactly one undo step on blur instead of none; unchanged blurs create no step.
3. **Reset Everything** now clears undo/redo history (it could be undone before).
4. State is never mutated in place: `saveData` hands handlers a private deep copy.
5. Side effects (localStorage, history, "saved" flash, toasts) moved out of React state updaters (no double toasts/flashes in StrictMode). Dark-mode and table-size toasts fixed the same way.
6. After import / reset the open assessment / fund is cleared (no stale screen); Settings form re-syncs after Undo/Import.
7. Removed unused packages (`express`, `dotenv`, `@google/genai`, `motion`, `tsx`, `@types/express`) and the dead `UndoRedoControls.tsx`; removed stale `bun.lock` (it is regenerated on install).
8. Extra: empty mark rows are cleaned up; blank subject names are rejected; fund rows are not created for empty amounts.

## Not included (as requested)
Browser Back-button support and the "Close App" action.
