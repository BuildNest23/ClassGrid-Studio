# Android Capacitor Native Print Integration (Phase 1)

Enable native Android printing and "Save as PDF" functionality across all report modules (Attendance, Results, Funds, Daily Tests) in the Capacitor Android build using the native Android PrintManager bridge, while maintaining seamless desktop and browser printing.

## User Review & Critical Decisions

> [!IMPORTANT]
> In accordance with your request to solve the three Android issues (print, backup, image) one-by-one, this plan covers **Issue 1: Native Print & PDF Save**. The remaining issues (backup export via Android share sheet, and image storage/selection) will follow in subsequent iterations once printing is verified.

- **Confirmed Decision (Focus Area)**: Starting with the **Print fix** as the first priority.
- **Confirmed Decision (Android Print Behavior)**: Trigger the native Android system print manager when tapping Print on mobile, allowing direct printing to physical/network printers or choosing Android's built-in **"Save as PDF"** option.
- **Confirmed Decision (Native Bridge)**: Use `@capgo/capacitor-printer` to interface with Android's `PrintManager` and `PrintDocumentAdapter`, preserving full compatibility with Capacitor 8.
- **Confirmed Decision (Web Continuity)**: Automatically detect platform via `Capacitor.isNativePlatform()`; standard web browsers will continue using the high-performance inline DOM `#printArea` + `window.print()` workflow.

---

## 1. Overview & Core Concept

- **What It Does**: Teachers and school administrators using the Android app can tap the "Print" button in any section (Student Merit Lists, Daily Test Sheets, Attendance Registers, Fee Vouchers, Summary Reports) to open the native Android system Print dialog. From there, they can select a physical printer or tap "Save as PDF" to save the formatted document directly to device storage.
- **Target Audience / Persona**: School administrators and teachers using the application on Android tablets and smartphones, as well as desktop web browsers.
- **Key Value**: Resolves the Android WebView limitation where standard `window.print()` calls fail or are silently ignored, providing native print and PDF export capabilities with zero external dependencies.

---

## 2. User Experience & Visual Design

### Key User Flows

1. **Initiate Print on Android**:
   - The user navigates to Attendance, Results, Funds, or Daily Test.
   - The user clicks or taps "Print" (e.g., "Print Sheet", "Print Card", "Print Register").
   - A brief non-blocking notification ("Opening Android Print...") appears if rendering takes more than a few milliseconds.
   - The native Android system print overlay opens immediately over the app, showing:
     - Real-time page preview with accurate school header, logo, borders, and student tabular data.
     - Destination selector (defaulting to "Save as PDF" or connected Wi-Fi/Bluetooth printer).
     - Paper size (A4), orientation (Portrait or Landscape based on module settings), and page count.
   - The user selects "Save as PDF" or sends to printer. Upon completion or dismissal, the app cleanly resumes where the user left off.

2. **Initiate Print on Web**:
   - On desktop browsers or Chrome mobile, the app continues using the established browser print preview dialog (`window.print()`).

### Visual Identity & Print Fidelity

- **Page Dimensions & Orientations**:
  - Landscape modules (e.g., Attendance Register, Results Master Sheet) automatically specify `size: A4 landscape; margin: 10mm;`.
  - Portrait modules (e.g., Fee Vouchers, Single Student Cards, Daily Test Summaries) specify `size: A4 portrait; margin: 12mm;`.
- **Styling Preservation**:
  - The offscreen HTML document generated for Android will bundle the application's print stylesheet (`index.css` print rules), including font declarations, solid high-contrast borders, exact column alignments, and school branding.
  - School logos (stored as Base64 data URLs) will render inline without requiring network requests or external storage permissions.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Native Print Plugin Selection (`@capgo/capacitor-printer`)**
  - *Chosen Approach*: Install `@capgo/capacitor-printer` (v8), an open-source Capacitor plugin that directly calls Android's native `PrintManager.print(...)` with a custom `PrintDocumentAdapter`.
  - *Why*: It is free, MIT-licensed, fully compatible with Capacitor 8 (`@capacitor/android` v8), and gives users access to both physical printers and Android's native "Save as PDF" engine.
  - *Alternatives Considered*:
    - Relying on pure web `window.print()`: Fails on Android WebViews because `android.webkit.WebView` has no default print handler.
    - Generating PDFs in pure JavaScript via `jspdf` / `html2canvas`: Produces bloated, non-searchable raster images and breaks multi-page pagination rules. Native `PrintManager` creates crisp, vector-grade, selectable PDFs.

- **Decision 2: Comprehensive Self-Contained HTML Payload for Android**
  - *Chosen Approach*: When invoking `Printer.printHtml(...)` on native Android, construct a standalone HTML string containing `<!DOCTYPE html>`, meta viewport, the exact compiled print CSS rules from `index.css`, `@page` orientation directives, and the report body.
  - *Why*: Android's `PrintDocumentAdapter` creates an isolated offscreen WebView to generate the print document; injecting the full CSS ensure identical rendering to the web version.

- **Decision 3: Zero Impact on Web Browser Mode**
  - *Chosen Approach*: Wrap the print invocation with platform detection:
    ```ts
    if (Capacitor.isNativePlatform()) {
      await Printer.printHtml({ name: documentTitle, html: compiledDocument });
    } else {
      window.print();
    }
    ```
  - *Why*: Ensures desktop and browser users experience instant, zero-overhead printing without changing their existing workflow.

---

## 4. Technical Architecture & Data Strategy

### System Architecture Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                    User Actions (UI Views)                   │
│   AttendanceView  │  ResultsView  │  FundsView  │  DailyTest │
└──────────────────────────────┬───────────────────────────────┘
                               │ calls
                               ▼
┌──────────────────────────────────────────────────────────────┐
│                     src/utils/printEngine.ts                 │
│                                                              │
│  1. Injects content into #printArea                          │
│  2. Assembles full print stylesheet & orientation rules      │
│  3. Platform Detection: Capacitor.isNativePlatform()         │
└──────────────┬───────────────────────────────┬───────────────┘
               │                               │
     [Native Android / iOS]                 [Web Browser]
               │                               │
               ▼                               ▼
┌──────────────────────────────┐ ┌──────────────────────────────┐
│  @capgo/capacitor-printer    │ │  Standard Browser Print      │
│  Printer.printHtml({         │ │  window.print()              │
│    name: 'Report',           │ │                              │
│    html: fullHtmlDoc         │ └──────────────┬───────────────┘
│  })                          │                │
└──────────────┬───────────────┘                │
               │                                │
               ▼                                ▼
┌──────────────────────────────┐ ┌──────────────────────────────┐
│  Android Native PrintManager │ │  Browser Print Preview       │
│  • Save as PDF               │ │                              │
│  • System Printer Selection  │ │                              │
└──────────────────────────────┘ └──────────────────────────────┘
```

### Execution Steps & Milestones

1. **Package Installation**:
   - Install `@capgo/capacitor-printer` via `install_applet_package`.
2. **Print Engine Enhancement (`src/utils/printEngine.ts`)**:
   - Import `Printer` from `@capgo/capacitor-printer` and `Capacitor` from `@capacitor/core`.
   - Update `triggerPrint` to support asynchronous execution.
   - Build a helper `buildFullPrintHtml(contentHTML, mult, orientation, pageNumbers)` that combines:
     - Reset styles and print sheet layout styles.
     - `@page` orientation rules (`A4 portrait` vs `A4 landscape`).
     - CSS variables (e.g. `--mult`).
     - The report HTML payload.
   - For `Capacitor.isNativePlatform()`:
     - Invoke `Printer.printHtml({ name: title, html: fullDoc })`.
     - Automatically clean up `#printArea` upon resolution.
   - For web:
     - Fall back to the existing two-frame `requestAnimationFrame` + `window.print()` sequence.
3. **Compilation & Verification**:
   - Run `compile_applet` to verify TypeScript builds cleanly.
   - Verify that all print modules compile with no type mismatches.
4. **Handoff for Issue 2 (Backup Export & Share Sheet)**:
   - Once Print is deployed and confirmed working on your Android build, we proceed to Issue 2 (Backup JSON export via Android Share Sheet).
