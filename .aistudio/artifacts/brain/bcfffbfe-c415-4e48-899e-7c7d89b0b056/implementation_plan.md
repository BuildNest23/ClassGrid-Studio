# Fix Results Table Sticky Column Transparency and Footer Stacking

Resolve scrolling visibility issues in the Results table by giving the sticky Roll and Name columns solid opaque backgrounds during horizontal scrolling, and fixing the z-index stacking so student rows slide cleanly behind the sticky Average/Highest/Lowest footer when scrolling down.

### User Review & Critical Decisions

> [!IMPORTANT]
> - **Summary Footer Position**: The Average, Highest, and Lowest summary rows will remain at the bottom of the table in the sticky footer (`tfoot`), exactly where they are currently placed.
> - **Vertical Scroll Stacking**: The sticky `tfoot` will have higher stacking priority (`z-index`) and solid opaque backgrounds, ensuring student names and rows slide **behind** the Average footer when scrolling down.
> - **Horizontal Scroll Opacity**: The sticky Roll and Name columns (`.sc1`, `.sc2`) in the student rows will have solid opaque backgrounds (`#FFFFFF` in light mode, `#1C1917` in dark mode) instead of transparent/inherited backgrounds, preventing score cells from bleeding through during horizontal scrolling.

---

### 1. Overview & Core Concept

- **The Problem**:
  1. During horizontal scrolling across subject columns, the sticky student Roll and Name columns have transparent backgrounds, making numbers from scrolled columns visible through the text.
  2. During vertical scrolling, the student Roll and Name sticky columns have `z-index: 3`, while the sticky `tfoot` has equal or lower stacking, causing student names to overlap on top of the sticky Average row instead of passing cleanly underneath it.
- **The Solution**:
  1. Make the sticky Roll and Name columns completely opaque with solid white/dark backgrounds.
  2. Establish a clear z-index hierarchy:
     - Top Header (`thead`): Highest priority (`z-index: 20`), pinned top, opaque.
     - Bottom Footer (`tfoot`): High priority (`z-index: 10`), pinned bottom, opaque (`bg-[#FAFAF9] dark:bg-[#292524]`), with sticky footer cells (`.sc1`, `.sc2`) at `z-index: 11`.
     - Body Sticky Columns (`tbody .sc1`, `tbody .sc2`): Intermediate priority (`z-index: 2`), opaque (`bg-white dark:bg-[#1C1917]` with zebra tint).
     - Body Regular Cells: Base priority (`z-index: 1`).

---

### 2. User Experience & Visual Design

#### A. Stacking & Scrolling Behavior
```
┌─────────────────────────────────────────────────────────────┐
│ thead: Sticky Top (z-index: 20) — Opaque Header            │
├─────────────────────────────────────────────────────────────┤
│ tbody: Student Rows                                         │
│   • Roll (.sc1) & Name (.sc2) have z-index: 2 & solid white │
│   • Horizontal scroll: subject scores slide behind Name     │
│   • Vertical scroll: rows slide behind the Average footer   │
├─────────────────────────────────────────────────────────────┤
│ tfoot: Sticky Bottom (z-index: 10) — Opaque Summary        │
│   • Average →                                               │
│   • Highest →                                               │
│   • Lowest  →                                               │
│   (All student rows scroll underneath this footer)          │
└─────────────────────────────────────────────────────────────┘
```

#### B. Visual Polish
- Sticky Roll and Name cells maintain full contrast in both light (`#FFFFFF`) and dark (`#1C1917`) modes.
- Alternating zebra row backgrounds are preserved on the sticky cells without losing opacity.
- Failing student row tint (`bg-[#FDF6F5]` / `dark:bg-[#2B1414]`) remains intact on sticky cells with solid fill.
- The sticky footer maintains a solid opaque surface (`bg-[#FAFAF9] dark:bg-[#292524]`) with a distinct top border (`border-t-2 border-stone-300 dark:border-stone-700`).

---

### 3. Implementation Plan

1. **Update `src/index.css`**:
   - Refactor `.sc1` and `.sc2` rules to set solid default backgrounds (`background-color: #FFFFFF` in light mode, `#1C1917` in dark mode).
   - Configure stacking contexts:
     - `thead th.sc1, thead th.sc2`: `z-index: 25`
     - `thead th`: `z-index: 20`
     - `tfoot td.sc1, tfoot td.sc2`: `z-index: 15`
     - `tfoot td`: `z-index: 10`
     - `tbody td.sc1, tbody td.sc2`: `z-index: 2`
     - `tbody td`: `z-index: 1`
   - Ensure `tfoot` has solid opaque background and explicit shadow/border so elements beneath it do not bleed through.
2. **Update `src/components/views/ResultsView.tsx`**:
   - In student row rendering, ensure regular rows have explicit `bg-white dark:bg-[#1C1917]`, alternating rows have `bg-[#FAFAF9] dark:bg-[#0C0A09]`, and fail rows have `bg-[#FDF6F5] dark:bg-[#2B1414]`.
   - Ensure `td.sc1` and `td.sc2` in student rows use explicit opaque background classes matching their row state.
   - Keep the Average, Highest, and Lowest rows in `tfoot` exactly at the bottom of the table.
   - Ensure `tfoot` rows and cells have explicit solid backgrounds (`bg-[#FAFAF9] dark:bg-[#292524]`) and clean border separators.
3. **Verification**:
   - Compile and verify with `compile_applet`.
   - Test horizontal scroll (names remain opaque white, no text shows through).
   - Test vertical scroll (names and scores scroll cleanly underneath the sticky Average footer).
