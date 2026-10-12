# Native Android Crimson Status Bar Implementation Plan

Configure the Capacitor Android application to display the native crimson red (`#991B1B`) status bar strip with light system indicators across both light and dark modes, perfectly matching the WebAPK / PWA visual experience shown in your reference screenshot.

## User Review & Critical Decisions

> [!IMPORTANT]
> Clarifying questions were confirmed by the user.

- **Confirmed Decision 1**: Apply the top red strip as the native Android system status bar set to `#991B1B` (crimson red), matching the WebAPK reference in Screenshot 2.
- **Confirmed Decision 2**: Keep the crimson red status bar consistent across both light and dark modes for stable brand identity.
- **System Indicator Styling**: System icons (clock, Wi-Fi, battery) will be rendered in light/white (`Style.Dark` in Capacitor StatusBar / `windowLightStatusBar: false` in Android XML) to ensure crisp high-contrast readability against `#991B1B`.

---

## 1. Overview & Core Concept

- **What It Does**: In the Capacitor Android APK, configures the Android window status bar to be a dedicated, non-overlapping native bar tinted with `#991B1B`, displaying white system indicators. This eliminates the white status bar void seen in Screenshot 1 and replicates the WebAPK presentation seen in Screenshot 2.
- **Target Audience**: Teachers and administrators using the native Android app.
- **Key Value**: Visual consistency between the WebAPK and Capacitor native APK, with polished native OS integration and high-contrast status bar indicators.

---

## 2. User Experience & Visual Design

- **Status Bar Appearance**:
  - **Background**: Solid `#991B1B` (ClassGrid brand crimson).
  - **System Icons**: Pure white / light icons (`android:windowLightStatusBar = false`) for high-contrast visibility.
  - **Dark Mode**: Retains `#991B1B` crimson strip, providing a cohesive brand frame at the top while the rest of the app adapts to dark slate.
- **Header Positioning**:
  - The sticky app header (`CG ClassGrid`) starts cleanly directly below the crimson status bar without clipping or redundant padding gaps.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Dual-Layer Enforcement (Native XML + Runtime Plugin)**:
  - *Chosen Approach*: Configure both Android XML resources (`styles.xml`, `colors.xml` in `android-res/res/values`) and the `@capacitor/status-bar` runtime plugin in TypeScript.
  - *Why*: Native XML guarantees the status bar is crimson immediately upon app launch (before JavaScript boots), while `@capacitor/status-bar` ensures persistent styling across lifecycle resumes and theme changes without flicker.
- **Decision 2: Non-Overlaid Status Bar (`overlay: false`)**:
  - *Chosen Approach*: Explicitly disable webview overlay mode on Android (`StatusBar.setOverlaysWebView({ overlay: false })`), letting the native OS manage status bar height.
  - *Why*: This matches the exact behavior of Chrome WebAPK, preventing cutout collision bugs and ensuring the web header starts at standard viewport coordinates.

---

## 4. Technical Architecture & Data Strategy

```
┌─────────────────────────────────────────────────────────────┐
│             Android Native OS Window Manager                │
│    ┌───────────────────────────────────────────────────┐    │
│    │ Status Bar (#991B1B) · White Clock, Wifi, Battery │    │
│    └───────────────────────────────────────────────────┘    │
│    ┌───────────────────────────────────────────────────┐    │
│    │ Webview Container (overlay: false)                │    │
│    │   ├─ Sticky Header (White / Dark Stone)           │    │
│    │   ├─ Scrollable Views & Cards                     │    │
│    │   └─ Fixed Bottom Navigation Bar                  │    │
│    └───────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

### Steps to Implement:
1. **Install `@capacitor/status-bar`**: Add the official plugin to package dependencies.
2. **Configure Native Android Styles**:
   - Create `android-res/res/values/colors.xml` declaring `colorPrimary` (`#991B1B`) and `statusBarColor` (`#991B1B`).
   - Create `android-res/res/values/styles.xml` setting `android:statusBarColor` to `#991B1B` and `android:windowLightStatusBar` to `false`.
   - Create `android-res/res/values-night/styles.xml` retaining `#991B1B` and `windowLightStatusBar: false` in dark mode.
3. **Initialize StatusBar in TypeScript**:
   - In `src/main.tsx`, call `StatusBar.setOverlaysWebView({ overlay: false })`, `StatusBar.setBackgroundColor({ color: '#991B1B' })`, and `StatusBar.setStyle({ style: Style.Dark })`.
4. **Refine CSS Safe Areas**:
   - Adjust `src/index.css` so that when `overlay: false` is active, no redundant extra white padding is inserted above the header.
5. **Verify Compilation & Linting**:
   - Ensure clean compilation with `compile_applet` and `lint_applet`.
