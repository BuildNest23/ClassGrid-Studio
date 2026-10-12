// Turns a report-card HTML (same markup the printer uses) into a preview page, a PNG, a PDF
// and a share-able file. No extra libraries: the card is drawn through an SVG <foreignObject>.

export const CARD_W_PX = 794;   // A4 width at 96 dpi
export const CARD_H_PX = 1123;  // A4 height at 96 dpi

/** Collects the print-only card styles from the app's own stylesheet and un-wraps them for screen use. */
export function collectCardCss(): string {
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

/** Draws the page shown in an iframe into a canvas (2x for sharp text). */
export async function renderCardCanvas(doc: Document, scale = 2): Promise<HTMLCanvasElement> {
  const ser = new XMLSerializer();
  const styles = Array.from(doc.querySelectorAll('style')).map(s => ser.serializeToString(s)).join('');
  const page = doc.querySelector('.cg-page');
  if (!page) throw new Error('card page not ready');
  const body = ser.serializeToString(page);
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${CARD_W_PX}" height="${CARD_H_PX}" viewBox="0 0 ${CARD_W_PX} ${CARD_H_PX}">` +
    `<foreignObject x="0" y="0" width="100%" height="100%"><div xmlns="http://www.w3.org/1999/xhtml" style="width:${CARD_W_PX}px;height:${CARD_H_PX}px;background:#fff">${styles}${body}</div></foreignObject></svg>`;

  const img = new window.Image();
  img.decoding = 'sync';
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('could not draw card'));
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  });

  const canvas = document.createElement('canvas');
  canvas.width = CARD_W_PX * scale;
  canvas.height = CARD_H_PX * scale;
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

/** Minimal one-page A4 PDF that holds the card as a JPEG image. */
export async function canvasToPdfBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  const jpg = new Uint8Array(await (await canvasToBlob(canvas, 'image/jpeg', 0.92)).arrayBuffer());
  const W = 595.28, H = 841.89;
  const enc = new TextEncoder();
  const parts: Uint8Array[] = [];
  const offsets: number[] = [];
  let len = 0;
  const push = (d: Uint8Array | string) => {
    const b = typeof d === 'string' ? enc.encode(d) : d;
    parts.push(b);
    len += b.length;
  };
  const obj = (n: number, body: string) => {
    offsets[n] = len;
    push(`${n} 0 obj\n${body}\nendobj\n`);
  };

  push('%PDF-1.4\n');
  obj(1, '<< /Type /Catalog /Pages 2 0 R >>');
  obj(2, '<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
  obj(3, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`);
  offsets[4] = len;
  push(`4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${canvas.width} /Height ${canvas.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpg.length} >>\nstream\n`);
  push(jpg);
  push('\nendstream\nendobj\n');
  const content = `q ${W} 0 0 ${H} 0 0 cm /Im0 Do Q`;
  obj(5, `<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
  const xref = len;
  let x = 'xref\n0 6\n0000000000 65535 f \n';
  for (let i = 1; i <= 5; i++) x += String(offsets[i]).padStart(10, '0') + ' 00000 n \n';
  push(x + `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`);
  return new Blob(parts as BlobPart[], { type: 'application/pdf' });
}

export function safeFileName(s: string): string {
  return s.replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80) || 'Result';
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/** Opens the phone's share sheet with the file; returns false when the device cannot share files. */
export async function shareFile(blob: Blob, filename: string, title: string): Promise<boolean> {
  const file = new File([blob], filename, { type: blob.type });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (nav.share && nav.canShare && nav.canShare({ files: [file] })) {
    try {
      await nav.share({ files: [file], title });
      return true;
    } catch (e) {
      if ((e as Error)?.name === 'AbortError') return true; // user closed the share sheet
      return false;
    }
  }
  return false;
}
