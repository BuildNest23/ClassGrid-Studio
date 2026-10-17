# ClassGrid Simplification: Per-Class "My Tools", Empty-Install Welcome & Dashboard Next-Step Hints

A streamlined, teacher-first simplification for ClassGrid that reduces clutter while guaranteeing 100% backward compatibility for existing classrooms. Teachers get an optional Welcome Sheet on fresh installs, a compact collapsible "My Tools" card on Home and Settings, and contextual next-step guidance—with zero changes to `ResultsView.tsx` or the lock icon.

---

### User Review & Critical Decisions

> [!IMPORTANT]
> All requirements from your latest corrections are strictly incorporated:
>
> 1. **Per-class tools storage**: Stored in optional `AppData.tools`. If old data has no `tools` field, **ALL tools default to ON** (`attendance: true, results: true, dailyTest: true, funds: true`).
> 2. **Locked vs Optional tools**: **Students** is permanently locked ON (`students: true`). **Attendance**, **Results**, **Daily Test**, and **Funds** are optional and untickable.
> 3. **Welcome sheet rules**: Shown **once per device** and **ONLY on a truly empty install**. Offers "Start fresh" (asks School Name, Class Name, Incharge Name, then My tools) AND "Restore from backup". **Every step has a "Skip" button**.
> 4. **"My tools" card location**: Compact and collapsible card on **Home (Dashboard)**, plus the exact same card in **Settings**.
> 5. **"Show advanced tools" switch**: Controls advanced tool visibility. "Backup to file", "Restore from file", and "Start new class" are **always visible** regardless of tool switches.
> 6. **Plain labels & Next-step hint on Home**: Simple, jargon-free terminology and a prominent contextual guide banner pointing the teacher to their next action.
> 7. **Zero modification to ResultsView**: `src/components/views/ResultsView.tsx` and its lock icon remain **completely untouched**.
> 8. **Data migration integrity**: `normalizeData` preserves the `tools` field reliably across imports, undo/redo, and storage syncs.

---

### 1. Overview & Core Concept

- **What It Does**: Allows teachers to simplify ClassGrid down to just what they use every day. Teachers can toggle off tools they don't need (e.g. Funds or Daily Tests) to clean up the navigation and Home view. Existing users and imported backups keep all tools active without any loss of functionality.
- **Target Persona**: Everyday school teachers who want simplicity without losing powerful features when they need them.
- **Key Value**: Clutter-free UI, instant next-step orientation for newcomers, and total preservation of existing data and workflows.

---

### 2. User Experience & Flows

#### A. Empty-Install Welcome Sheet (Once per device, truly empty install only)
- **Condition**: Triggers only when `localStorage.getItem("classgridWelcomeDone") !== "1"` AND the database has 0 students, 0 assessments, and default school name.
- **Flow**:
  - **Screen 1**: Choice between **Start Fresh** or **Restore from Backup** (with file picker). Every screen has **Skip / Dismiss**.
  - **Screen 2 (if Start Fresh)**: Quick 3-field setup — School Name, Class Name, Incharge Name (all optional, with **Skip** button).
  - **Screen 3**: "My Tools" selection — Students locked ON, Attendance & Results checked, Daily Test & Funds unchecked (with **Skip** button).
  - Clicking "Done" or "Skip" sets `classgridWelcomeDone = "1"` and opens Home.

#### B. Compact Collapsible "My Tools" Card (Home & Settings)
- Rendered on both `DashboardView.tsx` and `SettingsView.tsx`.
- **Collapsed state**: Compact 1-line bar showing active tools (e.g., *"Active: Students, Attendance, Results — Tap to edit"*).
- **Expanded state**:
  - Clean list of tools with toggle switches:
    - **Students**: Always checked with a subtle lock indicator.
    - **Attendance**: Toggle on/off.
    - **Results**: Toggle on/off.
  - **"Show advanced tools" switch**: When turned ON, reveals toggles for:
    - **Daily Test Register**
    - **Funds & Fees**
  - **Permanent Actions (Always Visible)**:
    - `[ Backup to File ]`
    - `[ Restore from File ]`
    - `[ Start New Class ]`

#### C. Plain Labels & Contextual "Next-Step Hint" on Home
- High-visibility hint card at the top of the Home view that adapts to current progress:
  - If 0 students: *"Next step: Add your students to get started →"* (opens Students).
  - If students enrolled & attendance not taken today: *"Next step: Take attendance for today →"* (opens Attendance).
  - If attendance taken: *"Next step: Record marks in Results or review student records →"*.
- Dismissible or collapsible if the teacher wants a clean dashboard.

#### D. Adaptive Navigation
- `Navigation.tsx` renders tabs based on `data.tools`:
  - Home and Students are always visible.
  - Attendance, Results, Daily Test, and Funds only render if enabled in `data.tools`.

---

### 3. Files to Be Changed

1. **`src/types.ts`**:
   - Define `ClassTools` interface:
     ```typescript
     export interface ClassTools {
       students: true;
       attendance: boolean;
       results: boolean;
       dailyTest: boolean;
       funds: boolean;
     }
     ```
   - Add optional `tools?: ClassTools` to `AppData`.

2. **`src/utils/migrate.ts`**:
   - In `normalizeData(raw)`:
     - If `src.tools` exists, sanitize into `ClassTools` (forcing `students: true`).
     - If `src.tools` is undefined/absent (old class or old backup), default **ALL tools to ON**:
       `tools: { students: true, attendance: true, results: true, dailyTest: true, funds: true }`.
   - In `makeBaseData()`: default `tools` initialized.

3. **`src/components/WelcomeSheet.tsx`** *(New component)*:
   - Full 3-step modal with "Restore from backup", 3 info fields, tool picker, and "Skip" on every step.

4. **`src/components/MyToolsCard.tsx`** *(New reusable component)*:
   - Collapsible card containing the tool toggles, "Show advanced tools" toggle, and permanent Backup / Restore / Start New Class buttons. Used in both Home and Settings.

5. **`src/components/views/DashboardView.tsx`**:
   - Add Next-Step Hint banner.
   - Insert `<MyToolsCard />`.
   - Conditionally render Attendance heatmap, Results stats, and Funds summaries based on active `data.tools`.

6. **`src/components/views/SettingsView.tsx`**:
   - Insert `<MyToolsCard />` for easy management in setup.

7. **`src/components/Navigation.tsx`**:
   - Filter desktop and mobile navigation tabs based on `data.tools`.

8. **`src/App.tsx`**:
   - Mount `<WelcomeSheet />` for empty installs.

*(Note: `src/components/views/ResultsView.tsx` and the lock icon will NOT be touched).*

---

### 4. Technical Architecture Diagram

```
┌────────────────────────────────────────────────────────────────────────┐
│                        ClassGrid Architecture                          │
└────────────────────────────────────────────────────────────────────────┘
                                    │
               ┌────────────────────┴────────────────────┐
               ▼                                         ▼
    ┌───────────────────────┐                 ┌──────────────────────┐
    │  ClassroomContext     │                 │   Persistent Storage │
    │  - AppData            │◄───────────────►│   - localStorage     │
    │    • tools?:ClassTools│                 │   - normalizeData    │
    │      (old data = ALL) │                 │     (preserves tools)│
    └──────────┬────────────┘                 └──────────────────────┘
               │
      ┌────────┴────────┬─────────────────────────┬──────────────────┐
      ▼                 ▼                         ▼                  ▼
┌──────────────┐ ┌──────────────┐          ┌──────────────┐   ┌──────────────┐
│ WelcomeSheet │ │ MyToolsCard  │          │ Dashboard    │   │ Navigation   │
│ - Empty-only │ │ - Collapsed  │          │ - Next-step  │   │ - Filtered by│
│ - 3-step     │ │ - Advanced sw│          │   hint       │   │   data.tools │
│ - Skip everywhere│- Backup/Restore/New   │ - Active     │   │ - Students   │
│              │ │   always on  │          │   widgets    │   │   always on  │
└──────────────┘ └──────────────┘          └──────────────┘   └──────────────┘
```

---

### 5. Verification Plan

- **Compilation**: Run `compile_applet` to verify clean build with zero TypeScript or JSX errors.
- **Backward Compatibility Test**: Existing data or data without `tools` loads with all 5 tools enabled.
- **Empty Install Welcome Sheet**: Verify it only pops up when app is empty; verify every step has a working Skip button and Restore from backup button.
- **My Tools Toggles**:
  - Toggle tools on/off from Dashboard and Settings; verify navigation tabs and dashboard widgets show/hide immediately.
  - Verify "Backup to file", "Restore from file", and "Start new class" remain visible at all times.
- **Integrity**: Confirm `ResultsView.tsx` remains completely untouched.
