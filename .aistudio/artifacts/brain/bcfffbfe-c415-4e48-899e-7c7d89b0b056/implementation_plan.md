# Remove 90px Threshold & Snug Fit Name Column to Longest Student Name

Adjust the student Name column (`.sc2`) width calculation in both Results and Funds tables to remove the artificial 90px minimum threshold and replace the loose character-multiplier formula with precise canvas text measurement. The column will snuggly fit the longest student name in the active class (plus standard cell padding) without allocating unnecessary horizontal space.

## User Review & Critical Decisions

> [!IMPORTANT]
> **Summary of User Requirements & Core Directives:**
> - **Remove 90px Minimum**: The previous `Math.max(90, ...)` constraint and loose multiplier caused the column to expand too much (140px–180px+), taking away valuable space from subject and payment columns.
> - **Snug Fit to Student Name**: Sized strictly according to the longest student name in the active class (and the "Name" column header), with 16px cell padding (`p-2`) and 2px border allowance.
> - **Scope of Change**: Applies to both **ResultsView** and **FundsView** matrix tables.
> - **Preserve Solid White Backgrounds**: The solid pure white background and border alignment on summary rows (Average, Highest, Lowest) in ResultsView will remain intact.

---

### 1. Overview & Core Concept

- **What It Does**: Sizes the sticky Name column (`.sc2`) dynamically in Results and Funds views to match the exact visual width of the longest student name in the active class. When student names are short (e.g. 3–8 characters), the column will shrink appropriately rather than being held at an arbitrary 90px or expanded by an inflated multiplier.
- **Target Audience / Persona**: Teachers and school administrators recording assessment marks and fund collections on laptops or tablets who need maximum horizontal space for assessment subjects and fund metrics.
- **Key Value**: Reclaims screen real estate on mobile and standard desktop displays while guaranteeing that no student name is cut off or truncated.

---

### 2. User Experience & Visual Design

- **Results Table Layout**:
  - The sticky Roll column (`.sc1`) stays locked at 44px on the left edge.
  - The sticky Name column (`.sc2`) immediately adjacent (`left: 44px`) matches the longest name in the class (e.g. ~60px–110px depending on actual student names).
  - Subject columns (Math, Science, English, etc.), Total, %, Result, Rank, and Remarks expand to fill the reclaimed horizontal space with less horizontal scrolling needed.
  - Summary rows (Average, Highest, Lowest) in `tfoot` remain sticky at the bottom with solid pure white background (`#FFFFFF` in light mode, `#1C1917` in dark mode) and no gaps.
- **Funds Collection Matrix Layout**:
  - Roll column at 44px, Name column sized exactly to the active student list's longest name.
  - Amount, Status, Date, and Note columns remain clearly visible.

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1: Accurate Text Width Measurement via Canvas Context**
  - *Chosen Approach*: Implement a shared lightweight helper `getTextWidth(text, font)` in `src/utils/helpers.ts` using an offscreen HTML5 2D canvas context (`measureText`).
  - *Why*: Character-count heuristics (e.g. `len * 8.2 + 20`) overestimate proportional fonts (e.g. "i", "l", "t" are narrow) and resulted in a column that was 30–60px wider than necessary. Canvas `measureText` returns exact pixel dimensions down to sub-pixels matching the table's `600 12px` font.
  - *Alternatives Considered*: Retaining rough character length multiplication without 90px threshold. Discarded because character widths vary significantly in system-ui fonts.

- **Decision 2: Header Baseline Floor ("Name")**
  - *Chosen Approach*: The candidate strings for measurement will include the column header label `"Name"` in addition to all active student names.
  - *Why*: Prevents the column from becoming narrower than the word "Name" itself (~45px total with padding), ensuring clean typography.

---

### 4. Technical Architecture & Data Strategy *(Technical Reference)*

```
┌───────────────────────────────────────────────────────────────┐
│                 src/utils/helpers.ts                          │
│  export function getTextWidth(text: string, font?: string)    │
│  - Uses memoized 2D canvas context                            │
│  - Measures exact rendered pixels                             │
└───────────────────────────────┬───────────────────────────────┘
                                │
               ┌────────────────┴────────────────┐
               ▼                                 ▼
┌───────────────────────────────┐ ┌───────────────────────────────┐
│  src/components/views/        │ │  src/components/views/        │
│  ResultsView.tsx              │ │  FundsView.tsx                │
│                               │ │                               │
│  nameColWidth = useMemo(() => │ │  nameColWidth = useMemo(() => │
│    measure longest student    │ │    measure longest student    │
│    name + 18px padding/border │ │    name + 18px padding/border │
│  , [ranked])                  │ │  , [sortedStudents])          │
│                               │ │                               │
│  style={{                     │ │  style={{                     │
│    '--name-col-w': `${w}px`   │ │    '--name-col-w': `${w}px`   │
│  }}                           │ │  }}                           │
└───────────────────────────────┘ └───────────────────────────────┘
```

- **Interactive Verification**:
  - Test with short student names (e.g., 3-character names) to verify column scales down without 90px threshold.
  - Test with long student names to ensure no ellipsis or overflow.
  - Check in both ResultsView and FundsView.
  - Confirm summary rows in ResultsView keep their solid white background and zero-gap alignment.
