import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, Printer, Image as ImageIcon, Share2, AlertTriangle, Loader2 } from 'lucide-react';
import { useClassroom } from '../context/ClassroomContext';
import { ResultPrintCtx, buildReportCardsHTML } from '../utils/resultPrint';
import { PRINT_SIZES } from '../utils/helpers';
import { triggerPrint } from '../utils/printEngine';
import {
  CARD_W_PX,
  CARD_H_PX,
  buildCardPageHTML,
  renderCardCanvas,
  canvasToBlob,
  downloadBlob,
  shareFile,
  safeFileName
} from '../utils/cardExport';

interface Props {
  ctx: ResultPrintCtx;
  studentId: string;
  onChange: (studentId: string) => void;
  onClose: () => void;
}

export const ResultCardModal: React.FC<Props> = ({ ctx, studentId, onChange, onClose }) => {
  const { toast } = useClassroom();
  const list = ctx.ranked;
  const index = Math.max(0, list.findIndex(i => i.s.id === studentId));
  const item = list[index];
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5);
  const [busy, setBusy] = useState<'' | 'img' | 'share'>('');

  const mult = (PRINT_SIZES[ctx.data.printSize] || PRINT_SIZES.m).mult;
  const pageHTML = useMemo(
    () => buildCardPageHTML(buildReportCardsHTML(ctx, studentId), mult),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ctx.style, ctx.data, ctx.asmt, ctx.footerText, studentId, mult]
  );

  // Marks that are still empty for this student
  const missing = useMemo(() => {
    if (!item) return [] as string[];
    const res = (ctx.data.assessmentResults[ctx.asmt.id] || {})[item.s.id] || {};
    return ctx.asmt.subjects.filter(sub => res[sub.id] === undefined).map(sub => sub.name);
  }, [ctx, item]);

  // Fit the A4 preview to the width of the popup
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const fit = () => setScale(Math.min(1, el.clientWidth / CARD_W_PX));
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const go = useCallback(
    (delta: number) => {
      const next = list[index + delta];
      if (next) onChange(next.s.id);
    },
    [list, index, onChange]
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft') go(-1);
      else if (e.key === 'ArrowRight') go(1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go, onClose]);

  if (!item) return null;

  const baseName = safeFileName(`Result - ${item.s.name || 'Student'}${item.s.rollNo ? ' - Roll ' + item.s.rollNo : ''}`);

  const getCanvas = async () => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc) throw new Error('not ready');
    if (doc.fonts && doc.fonts.ready) await doc.fonts.ready;
    return renderCardCanvas(doc, 2);
  };

  const fallbackPrint = () => {
    toast('Could not create the file on this device, opening the print dialog instead.', 'info');
    triggerPrint(buildReportCardsHTML(ctx, studentId), 'portrait', ctx.data.printSize, ctx.data.forceOrientation, false);
  };

  const handlePrint = () => {
    triggerPrint(buildReportCardsHTML(ctx, studentId), 'portrait', ctx.data.printSize, ctx.data.forceOrientation, false);
  };

  const run = async (kind: 'img' | 'share') => {
    if (busy) return;
    setBusy(kind);
    try {
      const canvas = await getCanvas();
      if (kind === 'img') {
        downloadBlob(await canvasToBlob(canvas, 'image/png'), `${baseName}.png`);
        toast('Image saved.', 'success');
      } else {
        const blob = await canvasToBlob(canvas, 'image/png');
        const ok = await shareFile(blob, `${baseName}.png`, `${item.s.name} - Result Card`);
        if (!ok) {
          downloadBlob(blob, `${baseName}.png`);
          toast('Sharing is not available here, so the image was saved instead.', 'info');
        }
      }
    } catch {
      fallbackPrint();
    } finally {
      setBusy('');
    }
  };

  const iconBtn =
    'w-12 h-12 rounded-full flex items-center justify-center border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-700 active:scale-95 transition disabled:opacity-40 cursor-pointer';
  const navBtn =
    'absolute top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full flex items-center justify-center bg-white/90 dark:bg-stone-900/90 border border-stone-200 dark:border-stone-700 shadow-sm text-stone-700 dark:text-stone-200 disabled:opacity-30 cursor-pointer';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-5 bg-black/60 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl max-h-[96vh] flex flex-col bg-white dark:bg-stone-900 rounded-3xl shadow-2xl border border-stone-200 dark:border-stone-800 overflow-hidden"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-label="Result card"
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-stone-200 dark:border-stone-800">
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-stone-900 dark:text-stone-100 truncate">{item.s.name || 'Student'}</h2>
            <p className="text-[11px] text-stone-500 dark:text-stone-400">
              Roll {item.s.rollNo || '—'} · {index + 1} of {list.length}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-2 -mr-1 text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 rounded-full active:bg-stone-200 dark:active:bg-stone-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {missing.length > 0 && (
          <div className="flex items-start gap-2 px-4 py-2 bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 text-xs font-semibold border-b border-amber-200/60 dark:border-amber-900/50">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-px" />
            <span>Marks not entered yet: {missing.join(', ')}</span>
          </div>
        )}

        {/* Card preview */}
        <div className="relative flex-1 min-h-0 bg-stone-100 dark:bg-stone-950">
          <button type="button" aria-label="Previous student" className={`${navBtn} left-2`} disabled={index === 0} onClick={() => go(-1)}>
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button type="button" aria-label="Next student" className={`${navBtn} right-2`} disabled={index === list.length - 1} onClick={() => go(1)}>
            <ChevronRight className="w-5 h-5" />
          </button>
          <div className="h-full max-h-[68vh] overflow-y-auto overflow-x-hidden p-2 sm:p-3">
            <div ref={boxRef} className="mx-auto w-full" style={{ maxWidth: CARD_W_PX }}>
              <div
                className="bg-white shadow-md rounded-sm overflow-hidden"
                style={{ width: CARD_W_PX * scale, height: CARD_H_PX * scale }}
              >
                <iframe
                  ref={iframeRef}
                  title="Result card preview"
                  srcDoc={pageHTML}
                  sandbox="allow-same-origin"
                  style={{
                    width: CARD_W_PX,
                    height: CARD_H_PX,
                    border: 0,
                    transform: `scale(${scale})`,
                    transformOrigin: 'top left',
                    pointerEvents: 'none',
                    background: '#fff'
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Actions: icons only */}
        <div className="flex items-center justify-center gap-5 px-4 py-3 border-t border-stone-200 dark:border-stone-800">
          <button type="button" className={iconBtn} onClick={handlePrint} disabled={!!busy} title="Print" aria-label="Print">
            <Printer className="w-5 h-5" />
          </button>
          <button type="button" className={iconBtn} onClick={() => run('img')} disabled={!!busy} title="Save as image" aria-label="Save as image">
            {busy === 'img' ? <Loader2 className="w-5 h-5 animate-spin" /> : <ImageIcon className="w-5 h-5" />}
          </button>
          <button type="button" className={iconBtn} onClick={() => run('share')} disabled={!!busy} title="Share" aria-label="Share">
            {busy === 'share' ? <Loader2 className="w-5 h-5 animate-spin" /> : <Share2 className="w-5 h-5" />}
          </button>
        </div>
      </div>
    </div>
  );
};
