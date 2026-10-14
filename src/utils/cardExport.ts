// Turns a report-card HTML (same markup the printer uses) into a preview page, a PNG, a PDF
// and a share-able file. No extra libraries: the card is drawn through an SVG <foreignObject>.

import { exportImageBlob, exportFileBlob } from './nativeFileExport';

export const CARD_W_PX = 794;   // A4 width at 96 dpi
export const CARD_H_PX = 1123;  // A4 height at 96 dpi

/** Collects the print-only card styles from the app's own stylesheet and un-wraps them for screen use. */
function collectCardCss(): string {
  const out: string[] = [];
  const wanted = (sel: string) => sel.includes('.ps2') || sel.includes('.print-sheet') || sel.includes('.report-card');

  const walk = (rules: CSSRuleList, inPrint: boolean) => {
    for (const rule of Array.from(rules)) {
      const r = rule as CSSRule & { cssRules?: CSSRuleList; conditionText?: string; selectorText?: string; media?: MediaList };
      if (r.type === 4 /* MEDIA */) {
        const isPrint = /print/i.test(r.media ? r.media.mediaText : r.conditionText || '');
        if (r.cssRules) walk(r.cssRules, isPrint);
      } else if (r.type === 1 /* STYLE */) {
        if (inPrint && r.selectorText && wanted(r.selectorText) && !/#printArea|\bbody\b|\bhtml\b/.test(r.selectorText)) {
          out.push(r.cssText);
        }
      } else if (r.cssRules) {
        walk(r.cssRules, inPrint); // @layer, @supports ...
      }
    }
  };

  for (const sheet of Array.from(document.styleSheets)) {
    try {
      if (sheet.cssRules) walk(sheet.cssRules, false);
    } catch {
      /* cross-origin stylesheet, ignore */
    }
  }
  return out.join('\n');
}

/** Full HTML document of one A4 page containing the card. Used for the preview and for the image. */
export function buildCardPageHTML(cardHTML: string, mult: number): string {
  const css = collectCardCss();
  return `<!doctype html><html><head><meta charset="utf-8"><style>
${css}
html,body{margin:0;padding:0;background:#fff;}
.cg-page{width:${CARD_W_PX}px;height:${CARD_H_PX}px;box-sizing:border-box;padding:12mm;overflow:hidden;background:#fff;--mult:${mult};
  -webkit-print-color-adjust:exact;print-color-adjust:exact;}
.cg-page .print-sheet.ps2-port{min-height:${CARD_H_PX - 92}px !important;}
.cg-page .print-sheet.ps2-card{height:${CARD_H_PX - 92}px !important;min-height:0 !important;}
</style></head><body><div class="cg-page">${cardHTML}</div></body></html>`;
}

export const RECEIPT_PAGE_W_PX = 380; // narrow page used for fee receipts (receipt is 90 mm = about 340 px)

/** Narrow page that fits its content (fee receipts). Height is measured after it loads. */
export function buildReceiptPageHTML(cardHTML: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
html,body{margin:0;padding:0;background:#fff;}
.cg-page{width:${RECEIPT_PAGE_W_PX}px;box-sizing:border-box;padding:16px 0;background:#fff;
  -webkit-print-color-adjust:exact;print-color-adjust:exact;}
</style></head><body><div class="cg-page">${cardHTML}</div></body></html>`;
}

/** Draws the page shown in an iframe into a canvas (2x for sharp text). */
export async function renderCardCanvas(
  doc: Document,
  scale = 2,
  width = CARD_W_PX,
  height = CARD_H_PX
): Promise<HTMLCanvasElement> {
  const ser = new XMLSerializer();
  const styles = Array.from(doc.querySelectorAll('style')).map(s => ser.serializeToString(s)).join('');
  const page = doc.querySelector('.cg-page');
  if (!page) throw new Error('card page not ready');
  const body = ser.serializeToString(page);
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">` +
    `<foreignObject x="0" y="0" width="100%" height="100%"><div xmlns="http://www.w3.org/1999/xhtml" style="width:${width}px;height:${height}px;background:#fff">${styles}${body}</div></foreignObject></svg>`;

  const img = new window.Image();
  img.decoding = 'sync';
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('could not draw card'));
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  });

  const canvas = document.createElement('canvas');
  canvas.width = width * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('no canvas');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas;
}

export function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    try {
      canvas.toBlob(b => (b ? resolve(b) : reject(new Error('export failed'))), type, quality);
    } catch (e) {
      reject(e);
    }
  });
}

export function safeFileName(s: string): string {
  return s.replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80) || 'Result';
}

export async function downloadBlob(blob: Blob, filename: string, title?: string): Promise<boolean> {
  // If run in native Capacitor, exportImageBlob automatically writes to cache and opens the share sheet.
  // On desktop / web browser, it performs standard URL.createObjectURL anchor download.
  return await exportImageBlob(blob, filename, title);
}

/** Opens the native share sheet with the file on Android/iOS; attempts Web Share on mobile web; downloads on desktop */
export async function shareFile(blob: Blob, filename: string, title: string): Promise<boolean> {
  return await exportFileBlob(blob, filename, {
    title,
    dialogTitle: `Share ${title}`,
    preferShareOnWeb: true,
  });
}


