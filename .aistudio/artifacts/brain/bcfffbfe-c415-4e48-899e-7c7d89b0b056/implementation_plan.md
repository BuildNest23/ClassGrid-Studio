# Results View Layout Redesign: Subject Grid, Collapsible Cards & Marks Grid Lock

Transform the Results assessment workflow in Classgrid Studio by replacing wide subject pills with a clean 2-to-3 column card grid, adding collapsible sections with informative summary hints to reclaim vertical screen space, and introducing a persistent marks grid lock to safeguard recorded student marks against accidental edits.

---

### User Review & Critical Decisions

> [!IMPORTANT]
> The following decisions were confirmed by the user in Phase 1 and govern the implementation:

- **Confirmed Decision 1 (Subject Grid Density)**: Subjects will be rendered in a responsive grid of **2 columns on mobile devices** and **3 columns on larger screens (tablets/desktops)** with compact, auto-truncating subject names and max marks inputs.
- **Confirmed Decision 2 (Collapsible Cards State)**: Subjects, Print Options, Edit with AI, and Assessment Details cards will remember their open or closed collapsed state per card using local storage persistence (`classgridResultsCollapse`).
- **Confirmed Decision 3 (Grid Lock Persistence)**: The lock state (`locked: boolean`) will be stored directly on the active `Assessment` object so that once marks are locked, the protection remains active across all devices, sessions, and backup restores.
- **Confirmed Decision 4 (Collapsible Sections Scope)**: Four key sections will be collapsible with clear summary hints when closed:
  1. **Assessment Details (Header card)**: Shows pass percentage, student entry progress, and total max marks when collapsed.
  2. **Subjects Card**: Shows count of subjects and total max marks (e.g., *"5 subjects · Total max: 500 — Tap to edit"*) when collapsed.
  3. **Edit with AI Card**: Shows brief feature summary (e.g., *"Automated remarks via JSON export/import"*) when collapsed.
  4. **Print Options Card**: Shows current print configuration (e.g., *"Design A (Colour) · Watermark Off · Tap to print"*) when collapsed.

---

### 1. Overview & Core Concept

- **What It Does**: Enhances the teacher's mark-recording experience in `ResultsView.tsx`. When opening an assessment, teachers can fold away completed configuration cards (Subjects, Assessment info, Print options, and AI tools) into compact 1-line preview bars. The subjects list adopts an organized multi-column layout, and a prominent lock toggle prevents unintentional data loss or keystrokes during review and scrolling.
- **Target Audience / Persona**: Classroom teachers and school administrators entering, reviewing, and printing exam marks on phones, tablets, or laptops.
- **Key Value**:
  - **Eliminates Vertical Scroll Fatigue**: Collapsing configured sections brings the marks spreadsheet directly into view immediately upon loading the assessment.
  - **Accidental Edit Protection**: Prevents accidental clicks or keyboard presses in the marks table while inspecting student ranks or scrolling on touchscreens.
  - **Cleaner Subject Management**: Subjects form an aligned grid rather than jagged wrapping pill lines, remaining legible while gracefully truncating extra-long subject titles.

---

### 2. User Experience & Visual Design

#### A. Responsive Subject Grid (2 Cols Mobile / 3 Cols Desktop)
- Replaces `<div className="flex flex-wrap gap-2">` with `<div className="grid grid-cols-2 md:grid-cols-3 gap-2">`.
- Each subject tile features:
  - A clean, snug card background with a hairline border (`border border-[#E7E5E4] dark:border-[#44403C] rounded-xl p-2`).
  - An inline editable subject title input that truncates gracefully with ellipsis when long (`truncate font-bold text-xs`).
  - A right-aligned max marks mini-badge input (`w-11 text-center font-mono text-xs rounded bg-white dark:bg-[#1C1917] border border-stone-200 dark:border-stone-700`).
  - A subtle removal button (`X` icon) that triggers confirmation before deletion.

#### B. Collapsible Section Cards with Contextual Summary Hints
- Each section header incorporates an interactive expand/collapse toggle button styled with a smooth chevron icon (`ChevronDown` / `ChevronRight` from `lucide-react`) and hover highlight.
- **Summary Preview Hints (When Collapsed)**:
  - **Assessment Details Card**: Header collapses into a slim status bar displaying `[Assessment Name]` alongside `Pass: 40% · 24/24 entered (100%) · Total max: 500`.
  - **Subjects Card**: Displays `5 subjects · Total max: 500` with a quiet action hint `(Tap to view/edit)`.
  - **Print Options Card**: Displays active print design (`Design A (Colour)` or `Design B (B&W)`), watermark status, and quick print triggers.
  - **Edit with AI Card**: Displays a discreet summary `Export marks & generate automated student remarks`.

#### C. Marks Grid Lock / Unlock Feature
- Located at the top toolbar of the Marks Sheet table next to the table title / quick stats.
- **Unlocked State (Default for new exams)**:
  - Button shows `<Unlock className="w-3.5 h-3.5" /> Unlock` with neutral styling.
  - All mark inputs, absent buttons, manual pass overrides, and remarks fields are fully editable.
- **Locked State**:
  - Button turns into an amber/emerald protective badge: `<Lock className="w-3.5 h-3.5" /> Locked` with an active indicator.
  - A subtle notification strip or banner appears above the table: *"Marks are locked to prevent accidental changes. Tap Unlock to make edits."*
  - All table inputs are marked `disabled` or `readOnly` with dimmed backgrounds and cursor-not-allowed affordances.
  - Keyboard navigation and arrow key navigation still allow inspecting cells without altering content.

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1: Grid Layout vs Pill List for Subjects**:
  - *Chosen Approach*: Responsive CSS Grid (`grid-cols-2 md:grid-cols-3 gap-2`) with flex items inside each cell.
  - *Why*: Provides clean horizontal and vertical rhythm across varying screen sizes; prevents irregular ragged rows when subject names vary in length.
  - *Alternative Considered*: Flexbox with fixed widths (leads to unwanted wrapping gaps on different viewport widths).
- **Decision 2: Local Storage for Collapsed States**:
  - *Chosen Approach*: Store a compact JSON map `Record<string, boolean>` in `localStorage` under `classgridResultsCollapse`.
  - *Why*: Preserves user workflow preference without bloating cloud/database schemas or altering document exchange files.
- **Decision 3: Storing Lock on Assessment vs Session State**:
  - *Chosen Approach*: Store `locked?: boolean` inside the `Assessment` interface in `src/types.ts`.
  - *Why*: Teachers explicitly request protection after finishing exam entry so that colleagues or family members on shared devices do not modify finalized grades. Storing on the assessment ensures the lock persists across page reloads and device backups.

---

### 4. Technical Architecture & Component Structure

```
┌───────────────────────────────────────────────────────────────┐
│                     ResultsView.tsx                          │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ 1. Assessment Details Card [Collapsible]                │  │
│  │    Open: Full rename, pass %, progress bar, delete      │  │
│  │    Closed: Name · Pass % · Progress · Total Max         │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ 2. Subjects Card [Collapsible]                          │  │
│  │    Open: Grid 2-col/3-col subjects + Add Form           │  │
│  │    Closed: "X subjects · Max YYY — Tap to edit"         │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ 3. Marks Sheet Table Card                               │  │
│  │    Header: Title · Status · [Lock/Unlock Toggle Button] │  │
│  │    Table: Student rows, mark inputs (disabled if locked)│  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ 4. Edit with AI Card [Collapsible]                      │  │
│  │    Open: Export for AI / Import from AI controls        │  │
│  │    Closed: "AI remarks export/import — Tap to expand"   │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ 5. Print Options Card [Collapsible]                     │  │
│  │    Open: Style radio options, Watermark, Footer, Actions│  │
│  │    Closed: "Design A (Colour) · Print actions ready"    │  │
│  └─────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────┘
```

#### Step-by-Step Implementation Sequence:
1. **Types Update (`src/types.ts`)**: Add optional `locked?: boolean` to the `Assessment` interface.
2. **Collapse State Utility (`src/utils/collapseState.ts`)**: Small helper to load and save collapsed card preferences from `localStorage`.
3. **Subjects Grid Redesign (`src/components/views/ResultsView.tsx`)**:
   - Re-architect subjects list into `grid grid-cols-2 md:grid-cols-3 gap-2`.
   - Set up truncation and clean mini-inputs for subject names and maximum marks.
4. **Collapsible Wrapper / Cards (`src/components/views/ResultsView.tsx`)**:
   - Add collapse/expand controls with `ChevronDown` / `ChevronRight` icons.
   - Render informative closed-state summary teasers for:
     * Assessment Header Card
     * Subjects Card
     * Edit with AI Card
     * Print Options Card
5. **Marks Grid Lock Implementation (`src/components/views/ResultsView.tsx`)**:
   - Add Lock/Unlock button next to table header with `Lock` / `Unlock` icons.
   - Wire handler to toggle `activeAsmt.locked` via `saveData`.
   - Apply `disabled={activeAsmt.locked}` or read-only styles to marks inputs, absent buttons, manual pass toggles, and remark inputs when locked.
   - Display a clean banner when the table is locked with a 1-click Unlock shortcut.
6. **Build Verification**: Run `compile_applet` to ensure zero compilation or type errors.
