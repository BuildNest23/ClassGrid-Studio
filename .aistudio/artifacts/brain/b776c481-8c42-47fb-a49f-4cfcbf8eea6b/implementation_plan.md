# Classroom Manager (ClassGrid) — Crimson & Ruby Edition

Classroom Manager is a complete offline-first classroom administration suite for teachers and class incharges. This implementation translates the standalone `littlevase/classgrid` web application into a clean, modern, modular React TypeScript application styled in an academic Crimson and Ruby red visual theme with 100% feature parity.

### User Review & Critical Decisions

> [!IMPORTANT]
> The clarifying questions from Phase 1 established the following core decisions:
> - **Theme Palette**: Crimson & Ruby (Academic Red) with deep burgundy structural accents and rich crimson primary buttons/indicators.
> - **Codebase Architecture**: Clean, modular React + TypeScript architecture with centralized custom state hooks and dedicated view components.
> - **Initial Data**: Clean slate with dismissible quick-start onboarding guide and prompt alerts for class configuration.

- **Confirmed Decision 1 (Color System)**: Primary brand color converted from green (`#2F6F4E`) to academic Crimson (`#991B1B` / `#B91C1C`) for primary buttons, active tabs, selected states, and brand banners. Semantic indicators (Present = emerald `#166534`, Absent = ruby `#991B1B`, Leave = amber `#B45309`, Holiday = slate blue `#1D4ED8`) remain distinct to prevent hue ambiguity.
- **Confirmed Decision 2 (Storage & Safety)**: State is synchronized to `localStorage` with a 30-step Undo/Redo history stack, exportable/importable JSON backup formats, and non-destructive cascade deletions.
- **Confirmed Decision 3 (Print & Canvas Exports)**: Preserves dual-mode printing (browser print with custom multi-scale CSS `@page` rules) and HTML5 Canvas high-resolution PNG image generation for absentee slips and student directories.

---

## 1. Overview & Core Concept

- **What It Does**: Classroom Manager empowers a class teacher to manage students, record daily attendance, administer multifaceted exam assessments with automated ranking and manual pass overrides, collect funds and fees, and generate print-ready report cards, absentee slips, and monthly registers without needing an internet connection.
- **Target Audience**: School teachers, class incharges, and academic coordinators who need a fast, distraction-free tool that works seamlessly on desktop computers, tablets, and mobile phones.
- **Key Value**: Everything is saved instantly to local storage with multi-level undo, zero cloud dependencies, instant search, and instant PDF/PNG export.

---

## 2. User Experience & Visual Design

### Key User Flows
1. **Class Setup & Student Enrollment**: On first launch, the teacher sees a quick-start guide, sets Class Name and School Name in Settings, and enrolls students using an auto-incrementing roll number form with optional expandable fields (phone, address, notes).
2. **Daily Attendance Flow**: Teacher opens Attendance (flagged with a red alert badge if unrecorded today), reviews the 30-day heatmap, taps `A` on absent students, `L` on excused leaves, locks the day, and optionally prints or downloads a high-res Absentee Slip PNG for school admin.
3. **Multi-Term Assessment**: Teacher creates an assessment (e.g., "First Term", "Final Exam"), adds subjects with individual maximum marks, enters scores using keyboard-friendly vertical tab navigation, observes automated rank and percentage calculations, overrides marginal fails if needed, and prints individual student report cards with teacher/parent signature lines.
4. **Fund & Fee Tracking**: Teacher creates fee collections (fixed or variable), tracks payments with real-time green/red visual debt indicators, marks exemptions, and prints pending debtor sheets.
5. **Data Backup & Customization**: Teacher can switch to dark mode, adjust table font sizes across 5 zoom levels, customize print scaling (`xs` through `xl`), and export full JSON backups.

### Visual Identity & Theme
- **Aesthetic Direction**: Academic editorial and utilitarian elegance. Dignified Georgia/serif headings paired with crisp modern sans-serif body typography and tabular figures for numbers.
- **Color Palette (Crimson & Ruby)**:
  - *Canvas Background*: Light parchment `#F6F4EF` (light mode) / Deep charcoal `#1A1815` (dark mode).
  - *Cards & Surfaces*: Pure white `#FFFFFF` / Deep warm gray `#232019` with hairline borders `#E5DFD0` / `#3A3527`.
  - *Primary Accent (Crimson)*: `#991B1B` (light mode button & active state) / `#DC2626` (dark mode primary).
  - *Secondary / Accent*: Ruby `#7F1D1D`, Amber `#B45309`, Navy `#1E3A8A`.
  - *Status Contrasts*: Present (`#166534` on `#DCFCE7`), Absent (`#991B1B` on `#FEE2E2`), Leave (`#92400E` on `#FEF3C7`), Holiday (`#1E40AF` on `#DBEAFE`).
- **Typography**: Georgia / serif for brand titles and sheet headings; clean system sans (`-apple-system`, BlinkMacSystemFont, 'Segoe UI', Roboto) for inputs and UI controls; `font-mono tabular-nums` for all scores, counts, and monetary figures.
- **Feedback & Motion**: Swift 150ms transitions, non-blocking toast notifications (success, error, info), bottom modal sheets on mobile, and tactile active states.

---

## 3. Key Product Decisions & Trade-Offs

- **Modular React Component Tree vs. Monolithic File**:
  - *Chosen Approach*: Componentized modular files (`src/types.ts`, `src/context/ClassroomContext.tsx`, `src/components/views/*`, `src/utils/*`) while maintaining standard React state hooks.
  - *Why*: Allows easy maintenance, clean separation of concerns, and TypeScript type safety, while preserving all utility behaviors and performance.
- **Offline LocalStorage with Undo/Redo Engine**:
  - *Chosen Approach*: Reactive local state mirrored to `localStorage` with a 30-step deep-clone history stack for global Undo (`Ctrl+Z`) and Redo (`Ctrl+Y`).
  - *Why*: Teachers work in classrooms with intermittent or nonexistent internet access; instant zero-latency save with undo protection eliminates data loss fears.
- **Canvas-Based Image Generation**:
  - *Chosen Approach*: Custom HTML5 Canvas rendering for high-DPI (2x scale) absentee slip and student list downloads.
  - *Why*: Guarantees sharp, shareable WhatsApp/email images with embedded school branding without requiring external PDF server rendering.

---

## 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Classroom Manager Architecture                  │
└────────────────────────────────────────────────────────────────────────┘
                                   │
              ┌────────────────────┴────────────────────┐
              ▼                                         ▼
   ┌───────────────────────┐                 ┌──────────────────────┐
   │ ClassroomContext      │                 │ UI Control State     │
   │  - AppData Store      │                 │  - Active View       │
   │  - Undo/Redo Stacks   │                 │  - Dark Mode         │
   │  - Toast System       │                 │  - Table Zoom (5 lvl)│
   │  - Confirm/Prompt API │                 │  - Modal Overlays    │
   └──────────┬────────────┘                 └──────────┬───────────┘
              │                                         │
              └────────────────────┬────────────────────┘
                                   ▼
   ┌────────────────────────────────────────────────────────────────────┐
   │                         View Routing Layer                         │
   ├──────────┬──────────┬───────────┬─────────┬───────┬───────┬────────┤
   │Dashboard │ Students │Attendance │ Results │ Funds │ Menu  │Settings│
   └──────────┴──────────┴───────────┴─────────┴───────┴───────┴────────┘
              │                                         │
              ▼                                         ▼
   ┌───────────────────────┐                 ┌──────────────────────┐
   │ Print & Canvas Engine │                 │ Export / Import Hub  │
   │  - @media print CSS   │                 │  - JSON Backup (v6)  │
   │  - 2x Canvas Renderer │                 │  - Logo Image Reader │
   └───────────────────────┘                 └──────────────────────┘
```

### Data Models (`src/types.ts`)
```typescript
interface Student {
  id: string;
  rollNo: string;
  admissionNo: string;
  name: string;
  fatherName: string;
  phone: string;
  address: string;
  notes: string;
  createdAt: number;
}

interface DayAttendance {
  holiday: boolean;
  locked: boolean;
  status: Record<string, 'P' | 'A' | 'L'>; // StudentId -> Status
}

interface AssessmentSubject {
  id: string;
  name: string;
  max: number;
}

interface Assessment {
  id: string;
  name: string;
  passPercent: number;
  subjects: AssessmentSubject[];
  createdAt: number;
}

interface Fund {
  id: string;
  name: string;
  amount: number; // 0 for variable
  dueDate: string;
  createdAt: number;
}

interface FundPayment {
  amount?: number;
  date?: string;
  note?: string;
  exempt?: boolean;
}
```

### Component Breakdown
- `src/types.ts`: TypeScript contracts for students, attendance, assessments, funds, print settings, and UI actions.
- `src/context/ClassroomContext.tsx`: Core engine providing state, `save()`, `undo()`, `redo()`, toasts, dialogs, and table sizing.
- `src/components/Header.tsx` & `src/components/Navigation.tsx`: Responsive desktop header and sticky mobile bottom bar with unread attendance badge.
- `src/components/views/DashboardView.tsx`: Snapshot metrics, 30-day attendance heatmap, test averages, and previews.
- `src/components/views/StudentsView.tsx`: Student registration form, real-time search, reordering, and edit controls.
- `src/components/views/AttendanceView.tsx`: Day picker, P/A/L markers, holiday range planner, yearly student attendance modal, and monthly register.
- `src/components/views/ResultsView.tsx`: Assessment manager, matrix marks entry with vertical keyboard progression, ranking algorithm, and manual pass toggle.
- `src/components/views/FundsView.tsx`: Fee cards, payment entry, exempt status, overdue badges, and debtor calculations.
- `src/components/views/SettingsView.tsx`: School branding, logo file reader, print scales, and JSON import/export.
- `src/components/views/StudentDirectoryView.tsx`: Clean printable read-only master student directory.
- `src/utils/printEngine.ts` & `src/utils/canvasExport.ts`: Print styling and Canvas image generator for Absentee Slips and student lists.

---

## 5. Verification Plan
- **Compilation**: Run `compile_applet` to ensure zero syntax or build errors with TypeScript and Vite.
- **Workflow Verification**:
  1. Add/edit/search students with auto-incrementing roll numbers.
  2. Mark attendance for today, test holiday toggles, and view student summary modal.
  3. Create an assessment, add subjects, enter marks with Enter key navigation, and verify rank calculations.
  4. Create a fund, enter payments, toggle exempt, verify collected/pending totals.
  5. Test dark mode, font zoom (A- / A+), undo/redo keyboard shortcuts (`Ctrl+Z`), and JSON backup export.
