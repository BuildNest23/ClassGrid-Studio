# Android Launcher Icon & Branded Splash Screen Implementation Plan

Configure the Android application to build with the authentic ClassGrid branding icon (`public/icons/icon-512.png`) instead of the default Capacitor template icon, and add a matching branded splash screen for GitHub Actions APK builds.

## User Review & Critical Decisions

> [!IMPORTANT]
> The clarifying questions have been confirmed by the user. The plan will use the official ClassGrid app icon and generate both launcher icons and a branded splash screen.

- **Confirmed Decision 1**: Use the current ClassGrid app icon (`public/icons/icon-512.png`) as the official Android launcher icon across all screen densities.
- **Confirmed Decision 2**: Include both standard/adaptive launcher icons and a matching branded splash screen matching the theme (`#991B1B` crimson with centered emblem).
- **Technical Mechanism**: Because GitHub Actions creates the `android/` directory dynamically via `npx cap add android`, default Capacitor placeholder icons are generated unless replaced. We will supply pre-rendered Android resource directories (`android-res/res/`) and an automated sync hook in `package.json` and `.github/workflows/android.yml` to inject the icons into `android/app/src/main/res/` prior to `assembleDebug`.

---

## 1. Overview & Core Concept

- **What It Does**: Replaces the generic blue Capacitor shield launcher icon on installed Android APKs with the real ClassGrid identity (crimson shield emblem), providing full adaptive icon support (square, circular, and squircle) on Android 8 through 15+, and displays a clean splash screen during initial webview load.
- **Target Audience**: Teachers and school administrators installing the ClassGrid APK built from GitHub Actions releases.
- **Key Value**: The installed Android app displays the real brand identity on the home screen, app drawer, and system settings, ensuring professional presentation and brand recognition.

---

## 2. User Experience & Visual Design

- **Launcher Icon Visuals**:
  - **Standard Icon (`ic_launcher.png`)**: Full-color ClassGrid crimson emblem with subtle inner shadow on transparent background for legacy Android launchers.
  - **Round Icon (`ic_launcher_round.png`)**: Circular formatted version for Google Pixel, Samsung One UI, and launchers enforcing circular masks.
  - **Adaptive Foreground (`ic_launcher_foreground.png`)**: 108dp-canvas foreground emblem paired with adaptive background (`ic_launcher_background.xml`), allowing Android's adaptive icon engine to apply user-customized squircle/teardrop/circle masks seamlessly.
- **Splash Screen Visuals**:
  - Centered high-resolution ClassGrid logo against the official brand background color `#991B1B` (or system theme surface), eliminating the white flash on native Android app startup.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Pre-Generated Android Res Tree vs. Runtime NPM Asset Generator**:
  - *Chosen Approach*: Generate and commit the exact Android `res/` tree (`mipmap-mdpi`, `mipmap-hdpi`, `mipmap-xhdpi`, `mipmap-xxhdpi`, `mipmap-xxxhdpi`, `drawable/`) directly into `android-res/res/`, accompanied by a lightweight sync script and CI step.
  - *Why*: In GitHub Actions, relying on heavy external asset generators during CI can fail due to missing system binaries (like canvas/cairo) or network timeouts. Pre-rendered pixel-perfect assets ensure deterministic, 100% reliable builds on GitHub Actions without extra build minutes.
- **Decision 2: Adaptive Icon Compatibility**:
  - *Chosen Approach*: Support both legacy `ic_launcher.png` and modern Android adaptive icon definitions (`mipmap-anydpi-v26/ic_launcher.xml` referencing foreground and background color).
  - *Why*: Modern Android (versions 8.0 through 15+) ignores standard PNGs if adaptive definitions are present or applies an ugly white background box. Complete adaptive assets guarantee crisp icons on all modern phones.

---

## 4. Technical Architecture & Data Strategy

```
┌─────────────────────────────────────────────────────────────┐
│                 Source Asset (icon-512.png)                 │
└──────────────────────────────┬──────────────────────────────┘
                               │
                [Asset Generation & Packaging]
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│             Repository Assets: android-res/res/             │
│  ├─ mipmap-mdpi/      (48px icon, 108px foreground)         │
│  ├─ mipmap-hdpi/      (72px icon, 162px foreground)         │
│  ├─ mipmap-xhdpi/     (96px icon, 216px foreground)         │
│  ├─ mipmap-xxhdpi/    (144px icon, 324px foreground)        │
│  ├─ mipmap-xxxhdpi/   (192px icon, 432px foreground)        │
│  ├─ mipmap-anydpi-v26/ (Adaptive XML definitions)           │
│  ├─ drawable/         (splash.png & background colors)      │
│  └─ values/colors.xml (launcher background color token)     │
└──────────────────────────────┬──────────────────────────────┘
                               │
                   [GitHub Actions Workflow]
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│               android/app/src/main/res/                     │
│  (Copied after "npx cap add android" & "cap sync android")  │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│              Gradle: ./gradlew assembleDebug                │
│             ==> Output: app-debug.apk with real icon!       │
└─────────────────────────────────────────────────────────────┘
```

### Steps to Implement:
1. **Generate All Android Mipmap Densities**: Render pixel-perfect PNGs for mdpi (48px), hdpi (72px), xhdpi (96px), xxhdpi (144px), and xxxhdpi (192px) from `public/icons/icon-512.png` along with circular variants and adaptive foregrounds.
2. **Setup Adaptive XML & Color Tokens**: Create `values/ic_launcher_background.xml` (or `colors.xml` with `#991B1B` / `#881337`) and `mipmap-anydpi-v26/ic_launcher.xml` / `ic_launcher_round.xml`.
3. **Setup Splash Screen Assets**: Create `drawable/splash.png` and splash theme configs.
4. **Update `.github/workflows/android.yml`**: Add a copy step `cp -r android-res/res/* android/app/src/main/res/` right after `npx cap sync android` and before `./gradlew assembleDebug`.
5. **Add Local Sync Script in `package.json`**: Provide `npm run sync:android` so if someone syncs Android locally or in CI, the icons are guaranteed to be in place.
6. **Verify Compilation & Asset Integrity**: Test build and verify that all references are valid.
