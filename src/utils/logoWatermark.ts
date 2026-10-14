// "Logo as watermark" option for report cards and fee receipts.
// One universal on/off switch (remembered on this device) shared by every screen that shows it.
// Size and transparency are remembered separately for result cards and fee receipts,
// because a receipt is much smaller than an A4 card and needs a smaller, lighter logo.

import { useSyncExternalStore } from 'react';

export type WatermarkKind = 'result' | 'receipt';

export interface WatermarkLook {
  /** Logo width as a percentage of the card / receipt width */
  size: number;
  /** How visible the logo is, in percent (low = more transparent) */
  opacity: number;
}

export interface WatermarkSettings {
  enabled: boolean;
  result: WatermarkLook;
  receipt: WatermarkLook;
}

const WATERMARK_KEY = 'classgridLogoWatermark';

export const WATERMARK_LIMITS = {
  size: { min: 30, max: 100, step: 5 },
  opacity: { min: 5, max: 40, step: 1 }
};

const DEFAULT_WATERMARK: WatermarkSettings = {
  enabled: false,
  result: { size: 65, opacity: 12 },
  receipt: { size: 60, opacity: 10 }
};

const clamp = (v: unknown, min: number, max: number, fallback: number) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : fallback;
};

function cleanLook(v: unknown, def: WatermarkLook): WatermarkLook {
  const o = (v && typeof v === 'object' ? v : {}) as Partial<WatermarkLook>;
  return {
    size: clamp(o.size, WATERMARK_LIMITS.size.min, WATERMARK_LIMITS.size.max, def.size),
    opacity: clamp(o.opacity, WATERMARK_LIMITS.opacity.min, WATERMARK_LIMITS.opacity.max, def.opacity)
  };
}

function read(): WatermarkSettings {
  try {
    const raw = localStorage.getItem(WATERMARK_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      return {
        enabled: p.enabled === true,
        result: cleanLook(p.result, DEFAULT_WATERMARK.result),
        receipt: cleanLook(p.receipt, DEFAULT_WATERMARK.receipt)
      };
    }
  } catch {
    /* ignore */
  }
  return DEFAULT_WATERMARK;
}

let current: WatermarkSettings = read();
const listeners = new Set<() => void>();

export const loadWatermark = (): WatermarkSettings => current;

/** Change one or more values; every screen showing the option updates at once. */
export function updateWatermark(patch: {
  enabled?: boolean;
  result?: Partial<WatermarkLook>;
  receipt?: Partial<WatermarkLook>;
}) {
  current = {
    enabled: patch.enabled ?? current.enabled,
    result: cleanLook({ ...current.result, ...patch.result }, DEFAULT_WATERMARK.result),
    receipt: cleanLook({ ...current.receipt, ...patch.receipt }, DEFAULT_WATERMARK.receipt)
  };
  try {
    localStorage.setItem(WATERMARK_KEY, JSON.stringify(current));
  } catch {
    /* ignore */
  }
  listeners.forEach(l => l());
}

const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
};

export function useWatermark(): WatermarkSettings {
  return useSyncExternalStore(subscribe, loadWatermark, loadWatermark);
}

/** The watermark only applies when it is switched on AND a school logo exists. */
export const watermarkActive = (wm: WatermarkSettings | undefined, logo: string): boolean =>
  !!wm && wm.enabled && !!logo;

const escAttr = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

/** CSS that makes the page content sit above the watermark. Added once inside the watermark markup,
 *  so it works the same in the preview, the print dialog, the Android printer and the image export. */
const WM_CSS = `.cg-wm-host{position:relative !important;z-index:0}
.cg-wm{position:absolute;left:0;top:0;right:0;bottom:0;z-index:-1;display:flex;align-items:center;justify-content:center;overflow:hidden;pointer-events:none}
.cg-wm img{display:block;max-width:100%;max-height:100%;object-fit:contain;-webkit-filter:grayscale(1);filter:grayscale(1);-webkit-print-color-adjust:exact;print-color-adjust:exact}
.cg-wm-host .ps2-table td:not(.ps2-failmark){background:transparent !important}
.cg-wm-host .ps2-table tbody tr:nth-child(even) td:not(.ps2-failmark){background:rgba(242,248,244,.55) !important}
.ps2-b.cg-wm-host .ps2-table tbody tr:nth-child(even) td:not(.ps2-failmark){background:transparent !important}`;

/**
 * The watermark layer. Put it as the FIRST child of the card (the card gets the `cg-wm-host` class).
 * It is a real <img> element, not a CSS background, so it still prints when the browser's
 * "background graphics" option is off. Grayscale is applied so it never competes with the content.
 */
export function watermarkHTML(logo: string, look: WatermarkLook): string {
  return `<style>${WM_CSS}</style><div class="cg-wm" aria-hidden="true"><img src="${escAttr(
    logo
  )}" alt="" style="width:${look.size}%;opacity:${(look.opacity / 100).toFixed(2)}"></div>`;
}
