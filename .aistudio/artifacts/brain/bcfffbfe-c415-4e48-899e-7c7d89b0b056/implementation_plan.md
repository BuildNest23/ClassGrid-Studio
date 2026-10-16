# Capitalize Text on Prints & Long Name Auto-Shrink

A dedicated print typography and presentation feature for Classgrid Studio that renders document headings, student names, father names, and subjects in clean uppercase on printed and exported materials without modifying underlying stored data, while automatically shrinking long names down to 75% so columns and cards never overflow.

---

### User Review & Critical Decisions

> [!IMPORTANT]
> The implementation strictly isolates text capitalization and font shrinking to the presentation layer (CSS & pre-print DOM measuring). Under no circumstances will stored student records, assessments, or on-screen form inputs be mutated or transformed.

- **Confirmed Scope**:
  - Setting stored in localStorage under `classgridCapsPrint`, defaulting to `OFF`.
  - Accessible via a toggle in `SettingsView.tsx` under "Print Settings" card, reset to `OFF` via "Reset Print Settings".
  - HTML printing & card preview/export handled via CSS classes `.caps-on .print-sheet { text-transform: uppercase; }` and `.cg-nocap { text-transform: none; }`.
  - Non-capitalized exclusions: Teacher remarks, print notes/footers, ordinal ranks ("1st", "49th", "of 49"), currency values ("Rs."), and numerical data.
  - Long names shrink to fit (75% floor in 0.25pt decrements) via off-screen measurement iframe in `utils/fitText.ts` before passing baked HTML to print engine.
  - Canvas exports (`canvasExport.ts`) apply `cap(text)` and `ctx.measureText` font-size stepping down to 75% before wrapping.
  - Zero disruption to non-Latin Urdu text, stored data, or on-screen screens.

---

### 1. Overview & Core Concept

Teachers frequently prefer official examination sheets, report cards, and student rosters to display formal capitalized typography for institutional presentation, while preserving lower-case or natural casing in informal notes and teacher remarks.

Furthermore, capital letters occupy roughly 10–15% more horizontal width than lower-case glyphs. To prevent long South Asian names (e.g. "Muhammad Abdul Rehman Siddiqui") from breaking table borders or causing report cards to spill onto a second sheet, an automated font-size scaling engine dynamically reduces text size down to 75% for names that would otherwise clip or overflow.

---

### 2. User Experience & Visual Design

#### Key User Flows
1. **Enabling the Feature**:
   - The user opens **Settings / School Setup** and scrolls to the **Print Settings** card.
   - Beside **Print Size Scaling** and **Orientation Override**, a toggle switch is presented:
     - **Label**: "Capitalize text on prints"
     - **Help text**: "Prints names, subjects and headings in CAPITAL letters. Remarks and notes stay as typed."
   - Clicking **Reset Print Settings** restores size to Medium, orientation to Auto, and Capitalize on prints to `OFF`.

2. **Viewing Previews & Printing**:
   - In **Report Cards**, **Fee Receipts**, **Class Result Sheets**, **Merit Lists**, **Monthly Attendance Registers**, and **Student Directory**, pressing **Print View** or opening the card modal applies `.caps-on` to the print root.
   - Headings, school name, subject names, student names, and father names render cleanly in uppercase.
   - Remarks, free-form notes, and ordinal ranks (e.g., "1st", "2nd", "49th", "of 42") retain their natural lowercase/original casing.
   - Long names automatically measure in an off-screen container and reduce font size seamlessly without manual teacher intervention.

3. **PNG Image Export**:
   - Absentee slips and student list PNG exports generated from the HTML5 canvas render capitalized names and headings when the setting is enabled, with names scaled down dynamically via canvas text measurement.

---

### 3. Key Product Decisions & Trade-Offs

- **CSS Inheritance vs. Inline Uppercasing**:
  - *Decision*: Apply `text-transform: uppercase` to `.caps-on .print-sheet` and `.cg-nocap` to opt-out elements.
  - *Why*: Ensures stored string data is 100% untouched. Non-Latin scripts (Urdu, Arabic) have no uppercase form and remain completely unaffected by CSS `text-transform`.
- **Pre-Print Baked Inline Styles for Font Shrinking**:
  - *Decision*: Run `fitLongNames(html)` in a hidden DOM iframe inside the app, measure `scrollWidth > clientWidth`, calculate exact inline font-size in 0.25pt decrements down to 75%, and inject as inline styles before passing HTML to `@capgo/capacitor-printer` or `window.print()`.
  - *Why*: Android native print WebViews and exported SVG `<foreignObject>` renderers do not reliably execute JavaScript scripts during print spooling; baking the computed styles directly into the HTML string guarantees 100% cross-platform consistency.

---

### 4. Technical Architecture & Data Strategy

```
┌─────────────────────────────────────────────────────────────┐
│                    classgridCapsPrint                       │
│      (localStorage module with useSyncExternalStore)        │
└───────────────┬─────────────────────────────┬───────────────┘
                │                             │
                ▼                             ▼
┌───────────────────────────────┐   ┌─────────────────────────┐
│     SettingsView.tsx          │   │   canvasExport.ts       │
│  - Toggle in Print Settings   │   │  - cap(text) helper     │
│  - Reset Print Settings reset │   │  - ctx.measureText 75%  │
└───────────────────────────────┘   └─────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────────────────────┐
│          Print & Card Export Pipelines                      │
│   - printEngine.ts (triggerPrint & standalone HTML)         │
│   - cardExport.ts (buildCardPageHTML & receipt preview)     │
└───────────────────────────────┬─────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────┐
│              utils/fitText.ts (fitLongNames)                │
│   - Mounts off-screen iframe at exact container page width  │
│   - Checks each .cg-fit span against clientWidth of cell    │
│   - Steps font-size in 0.25pt down to 75% floor             │
│   - Returns final HTML with computed inline font-size       │
└─────────────────────────────────────────────────────────────┘
```

#### Detailed Execution Steps

1. **Setting Module (`src/utils/capsPrint.ts`)**:
   - Create lightweight storage module with `loadCapsPrint()`, `saveCapsPrint(enabled: boolean)`, and `useCapsPrint()` using `useSyncExternalStore`.
   - Store under key `classgridCapsPrint`.

2. **Settings UI Integration (`src/components/views/SettingsView.tsx`)**:
   - Add switch toggle in the **Print Settings** card.
   - Update `handleResetPrintSettings` to set `saveCapsPrint(false)`.

3. **Print Stylesheet Integration (`src/index.css` & `src/utils/printEngine.ts`)**:
   - Add `@media print` rules in `index.css`:
     ```css
     .caps-on .print-sheet { text-transform: uppercase; }
     .caps-on .print-sheet .cg-nocap { text-transform: none; }
     ```
   - Mirror rules in `BASE_PRINT_CSS` within `src/utils/printEngine.ts`.
   - Add `.caps-on` wrapper conditionally to `buildStandalonePrintHTML` (`#printArea`) and `triggerPrint` web container.
   - Add `.caps-on` to `.cg-page` in `cardExport.ts` (`buildCardPageHTML` and `buildReceiptPageHTML`).

4. **Marking Non-Capitalized & Fitted Elements**:
   - **Opt-out (`.cg-nocap`)**:
     - Remarks text (`.ps2-remarks-text`), print footer text (`.ps2-foot`), print note (`.ps2-head-note`, `.ps2-foot-chip`, `buildPrintHeaderHTML` noteLine).
     - Ordinal ranks ("1st", "2nd", "3rd", "49th") and total suffix ("of 49") in `resultPrint.ts`.
     - Notes and free-form teacher comments in `AttendanceView.tsx`, `FundsView.tsx`, `StudentDirectoryView.tsx`, and `feeReceipt.ts`.
   - **Fit Targets (`.cg-fit`)**:
     - Student name & father name cells across `resultPrint.ts`, `dailyTestPrint.ts`, `feeReceipt.ts`, `AttendanceView.tsx`, `FundsView.tsx`, `StudentDirectoryView.tsx`.
     - Subject names in tables.

5. **Off-Screen Measurement Engine (`src/utils/fitText.ts`)**:
   - Create `fitLongNames(html: string): Promise<string>`.
   - Mount HTML in a hidden `iframe` styled with the appropriate print width (A4 width 794px or 1123px depending on orientation / receipt width).
   - Wait for `document.fonts.ready`.
   - For each element matching `.cg-fit`, test `scrollWidth > clientWidth`. If true, decrement font-size by 0.25pt steps down to 75% of original font-size until it fits. If it still exceeds at 75%, remove `white-space: nowrap` to allow natural wrap.
   - Apply inline styles and return the serialized HTML.
   - Hook `fitLongNames` into `triggerPrint` and `cardExport.ts`.

6. **Canvas Exports (`src/utils/canvasExport.ts`)**:
   - Add `cap(text)` helper based on `loadCapsPrint()`.
   - Capitalize headings, table headers, student names, father names, and class information for Absentee Slip and Student List PNGs.
   - Add font shrinking logic using `ctx.measureText` down to 75% before falling back to multi-line wrapping.
