// Fee receipt (narrow till-style receipt) for one student, opened from the Funds tab.
// Design A = colour, Design B = black and white. Both have an "all paid" look,
// and both can show every fund or just one fund.

import { AppData } from '../types';
import { esc, fmtMoney, todayISO } from './helpers';
import { fundLinesForStudent, loadPrintStyle, ResultPrintStyle } from './resultPrint';
import { WatermarkSettings, loadWatermark, watermarkActive, watermarkHTML } from './logoWatermark';

// ---------- saved options ----------

const RECEIPT_STYLE_KEY = 'classgridReceiptStyle';
const RECEIPT_THANKS_KEY = 'classgridReceiptThanks';
const DEFAULT_THANKS = 'Thank you. Please keep this receipt.';

/** Receipt design; falls back to the design chosen for result prints the first time. */
export function loadReceiptStyle(): ResultPrintStyle {
  try {
    const v = localStorage.getItem(RECEIPT_STYLE_KEY);
    if (v === 'a' || v === 'b') return v;
  } catch {
    /* ignore */
  }
  return loadPrintStyle();
}

export function saveReceiptStyle(style: ResultPrintStyle) {
  try {
    localStorage.setItem(RECEIPT_STYLE_KEY, style);
  } catch {
    /* ignore */
  }
}

/** An empty saved text is respected (it hides the line). Nothing saved yet gives the default. */
export function loadReceiptThanks(): string {
  try {
    const v = localStorage.getItem(RECEIPT_THANKS_KEY);
    return v === null ? DEFAULT_THANKS : v;
  } catch {
    return DEFAULT_THANKS;
  }
}

export function saveReceiptThanks(text: string) {
  try {
    localStorage.setItem(RECEIPT_THANKS_KEY, text);
  } catch {
    /* ignore */
  }
}

// ---------- receipt number ----------

/** Short code per fund for single-fund receipts: "Science Lab Maintenance" -> SLM, "Library" -> LIB. */
function fundSuffixes(data: AppData): Record<string, string> {
  const base = data.funds.map(f => {
    const words = (f.name || '').split(/[^A-Za-z0-9]+/).filter(Boolean);
    let code: string;
    if (words.length >= 2) code = words.slice(0, 4).map(w => w.charAt(0)).join('');
    else if (words.length === 1) code = words[0].slice(0, 3);
    else code = 'F';
    return code.toUpperCase();
  });
  const seen: Record<string, number> = {};
  const out: Record<string, string> = {};
  data.funds.forEach((f, i) => {
    const code = base[i];
    seen[code] = (seen[code] || 0) + 1;
    out[f.id] = seen[code] > 1 ? `${code}${seen[code]}` : code;
  });
  return out;
}

/** FEE-0002 from roll number 2. A single-fund receipt adds the fund code: FEE-0002-SLM. */
export function receiptNumber(data: AppData, studentId: string, fundId: string | null): string {
  const s = data.students.find(x => x.id === studentId);
  let n = 0;
  const m = s ? String(s.rollNo || '').match(/\d+/) : null;
  if (m) n = parseInt(m[0], 10);
  else {
    const idx = data.students.findIndex(x => x.id === studentId);
    n = idx >= 0 ? idx + 1 : 0;
  }
  let no = `FEE-${String(n).padStart(4, '0')}`;
  if (fundId) {
    const suffix = fundSuffixes(data)[fundId];
    if (suffix) no += `-${suffix}`;
  }
  return no;
}

// ---------- data ----------

interface ReceiptCtx {
  style: ResultPrintStyle;
  data: AppData;
  thanks: string;
  /** null = all funds, otherwise the id of the one fund to show */
  fundId: string | null;
  /** Logo watermark settings. Left out = use the saved universal setting. */
  watermark?: WatermarkSettings;
}

interface ReceiptLine {
  id: string;
  name: string;
  due: number | null;
  paid: number;
  balance: number | null;
  code: 'PAID' | 'PARTIAL' | 'PENDING' | 'EXEMPT';
  date: string;
}

function receiptLines(data: AppData, studentId: string, fundId: string | null): ReceiptLine[] {
  const lines = fundLinesForStudent(data, studentId).map((l, i) => {
    const f = data.funds[i];
    const p = (data.fundPayments[f.id] || {})[studentId] || {};
    return { ...l, id: f.id, date: l.paid > 0 && p.date ? p.date : '' } as ReceiptLine;
  });
  return fundId ? lines.filter(l => l.id === fundId) : lines;
}

/** Amount owing for the receipt that would be shown (used for the notice above the preview). */
export function receiptBalance(data: AppData, studentId: string, fundId: string | null): number {
  return receiptLines(data, studentId, fundId).reduce((a, l) => a + (l.balance || 0), 0);
}

const num = (n: number) => n.toLocaleString('en-PK');

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
/** 2026-10-12 -> 12 Oct 2026 (same on every device, as in the mockup) */
function prettyShortDate(key: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(key || '');
  if (!m) return key || '';
  return `${parseInt(m[3], 10)} ${MONTHS[parseInt(m[2], 10) - 1] || ''} ${m[1]}`;
}

// ---------- styles ----------

const RECEIPT_CSS = `
.fr{width:90mm;margin:0 auto;background:#fff;color:#1c1917;font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;font-size:9pt;line-height:1.3;-webkit-print-color-adjust:exact;print-color-adjust:exact;break-inside:avoid;page-break-inside:avoid}
.fr *{box-sizing:border-box}
.fr b{font-weight:700}
.fr-row,.fr-tl,.fr-meta,.fr-sigs{display:flex;justify-content:space-between;align-items:flex-start;gap:3mm}
.fr-row-top,.fr-row-bot{display:flex;justify-content:space-between;align-items:center;gap:3mm}
.fr-sub{font-size:7.5pt}
.fr-sigs{margin-top:9mm;gap:6mm}
.fr-sig{flex:1;text-align:center;font-size:7.5pt;padding-top:1mm}
.fr-thanks{text-align:center;font-size:7.5pt;margin-top:3mm}
.fr-stampwrap{text-align:center}

/* ---------- Design A: colour ---------- */
.fr-a{border:0}
.fr-a .fr-head{background:#0b5d46;color:#fff;text-align:center;padding:5mm 4mm 4.5mm}
.fr-a .fr-logo{width:16mm;height:16mm;border-radius:50%;border:0.7mm solid #fbbf24;margin:0 auto 2.5mm;display:flex;align-items:center;justify-content:center;overflow:hidden;background:rgba(255,255,255,.06);font-size:5.5pt;font-weight:700;line-height:1.15;color:#fbbf24;text-align:center}
.fr-a .fr-logo img{max-width:100%;max-height:100%;display:block}
.fr-a .fr-school{font-size:11.5pt;font-weight:800;line-height:1.2}
.fr-a .fr-pill{display:inline-block;margin-top:2.5mm;background:#fbbf24;color:#0b5d46;font-weight:800;font-size:8pt;letter-spacing:.14em;padding:1mm 4mm;border-radius:99px}
.fr-a .fr-body{padding:4mm 4mm 4mm;border:0.3mm solid #e7e5e4;border-top:0}
.fr-a .fr-meta{font-size:8.5pt;color:#44403c;margin-bottom:3mm}
.fr-a .fr-stu{background:#e8f3ec;border:0.3mm solid #b9d9c6;border-radius:2.5mm;padding:2.5mm 3mm;margin-bottom:3mm;color:#44403c}
.fr-a .fr-stu-name{font-size:11.5pt;font-weight:800;color:#0b5d46;margin-bottom:0.8mm}
.fr-a .fr-row{padding:2mm 0;border-bottom:0.3mm dashed #d6d3d1}
.fr-a .fr-row:last-of-type{border-bottom:0}
.fr-a .fr-fname{font-weight:700;font-size:9.5pt}
.fr-a .fr-sub{color:#78716c}
.fr-a .fr-amt{font-size:9.5pt;white-space:nowrap}
.fr-a .fr-chip{font-size:6.5pt;font-weight:800;padding:0.4mm 2mm;border-radius:99px;white-space:nowrap}
.fr-a .fr-ok{background:#d1fae5;color:#047857}
.fr-a .fr-bal{background:#fee2e2;color:#b91c1c}
.fr-a .fr-ex{background:#f5f5f4;color:#57534e}
.fr-a .fr-rows{margin-bottom:3mm}
.fr-a .fr-tot{border:0.4mm solid #0b5d46;border-radius:2.5mm;overflow:hidden}
.fr-a .fr-tl{padding:1.8mm 3mm;font-size:9.5pt}
.fr-a .fr-tl b{font-size:9.5pt}
.fr-a .fr-big{background:#0b5d46;color:#fff;padding:2.4mm 3mm;font-size:12pt;font-weight:800;align-items:center}
.fr-a .fr-big b{font-size:12pt}
.fr-a .fr-stampwrap{margin:4mm 0 0}
.fr-a .fr-stamp{display:inline-block;border:0.8mm solid #1f9d5c;color:#1f9d5c;border-radius:2mm;font-weight:800;font-size:12pt;letter-spacing:.14em;padding:1.5mm 5mm;transform:rotate(-4deg)}
.fr-a .fr-sig{border-top:0.3mm solid #1c1917;color:#44403c}
.fr-a .fr-thanks{color:#78716c}

/* ---------- Design B: black and white ---------- */
.fr-b{font-family:"Courier New",Courier,monospace;color:#000;padding:3mm 4mm 4mm;border:0.3mm solid #000}
.fr-b .fr-head{text-align:center;padding-bottom:2.5mm}
.fr-b .fr-logo{width:13mm;height:13mm;margin:0 auto 1.5mm;display:flex;align-items:center;justify-content:center}
.fr-b .fr-logo img{max-width:100%;max-height:100%;display:block}
.fr-b .fr-school{font-family:Georgia,"Times New Roman",serif;font-size:11.5pt;font-weight:700;line-height:1.2}
.fr-b .fr-pill{display:block;margin-top:1.5mm;font-weight:700;font-size:8pt;letter-spacing:.3em}
.fr-b .fr-body{border-top:0.9mm solid #000;padding-top:2mm}
.fr-b .fr-meta{font-size:8pt;padding-bottom:2mm;border-bottom:0.3mm solid #000;margin-bottom:2mm}
.fr-b .fr-stu{padding-bottom:2mm;border-bottom:0.3mm solid #000;margin-bottom:2mm;font-size:8pt}
.fr-b .fr-stu-name{font-size:10pt;font-weight:700}
.fr-b .fr-row{display:block;padding:1.5mm 0;border-bottom:0.3mm dotted #000}
.fr-b .fr-row:last-of-type{border-bottom:0}
.fr-b .fr-fname{font-weight:700;font-size:8.5pt}
.fr-b .fr-amt{font-size:8.5pt;white-space:nowrap}
.fr-b .fr-sub{font-size:7pt}
.fr-b .fr-chip{font-size:6.5pt;font-weight:700;padding:0.2mm 1.6mm;border:0.3mm solid #000;white-space:nowrap}
.fr-b .fr-bal{background:#000;color:#fff}
.fr-b .fr-ex{border-style:dashed}
.fr-b .fr-rows{padding-bottom:1.5mm}
.fr-b .fr-tot{border-top:0.9mm solid #000;padding-top:1mm}
.fr-b .fr-tl{padding:1mm 0;font-size:9pt}
.fr-b .fr-big{border-top:0.3mm solid #000;border-bottom:0.9mm solid #000;margin-top:1mm;padding:1.6mm 0;font-size:10.5pt;font-weight:700;text-transform:uppercase;align-items:center}
.fr-b .fr-big b{font-size:10.5pt}
.fr-b .fr-stampwrap{margin:3mm 0 0}
.fr-b .fr-stamp{display:inline-block;border:1.1mm double #000;font-weight:700;font-size:11pt;letter-spacing:.2em;padding:1.2mm 5mm}
.fr-b .fr-sig{border-top:0.3mm solid #000}
`;

// ---------- the receipt ----------

export function buildFeeReceiptHTML(c: ReceiptCtx, studentId: string): string {
  const { data } = c;
  const s = data.students.find(x => x.id === studentId);
  if (!s) return '';
  const fundId = c.fundId && data.funds.some(f => f.id === c.fundId) ? c.fundId : null;
  const lines = receiptLines(data, studentId, fundId);

  const totalDue = lines.reduce((a, l) => a + (l.due || 0), 0);
  const totalPaid = lines.reduce((a, l) => a + l.paid, 0);
  const totalBalance = lines.reduce((a, l) => a + (l.balance || 0), 0);
  const counted = lines.filter(l => l.code !== 'EXEMPT');
  const paidInFull = counted.length > 0 && counted.every(l => l.code === 'PAID');

  const chip = (l: ReceiptLine) => {
    if (l.code === 'EXEMPT') return '<span class="fr-chip fr-ex">EXEMPT</span>';
    if (l.code === 'PAID') return '<span class="fr-chip fr-ok">PAID</span>';
    if (l.balance !== null) return `<span class="fr-chip fr-bal">BAL ${esc(fmtMoney(l.balance))}</span>`;
    return '<span class="fr-chip fr-bal">PENDING</span>';
  };

  const sub = (l: ReceiptLine) => {
    if (l.code === 'EXEMPT') return 'Exempt';
    if (l.paid > 0) return l.date ? `Paid ${esc(prettyShortDate(l.date))}` : '';
    return 'Not paid yet';
  };

  const rows = lines.length
    ? lines
        .map(l => {
          const amt =
            l.code === 'EXEMPT'
              ? ''
              : `<b>${esc(fmtMoney(l.paid))}</b>${l.due !== null ? ` / ${esc(num(l.due))}` : ''}`;
          return `<div class="fr-row"><div style="flex:1">
            <div class="fr-row-top"><span class="fr-fname">${esc(l.name)}</span><span class="fr-amt">${amt}</span></div>
            <div class="fr-row-bot"><span class="fr-sub">${sub(l)}</span>${chip(l)}</div>
          </div></div>`;
        })
        .join('')
    : '<div class="fr-row"><span class="fr-sub">No funds created yet.</span></div>';

  const wm = c.watermark ?? loadWatermark();
  const wmOn = watermarkActive(wm, data.schoolLogo);
  const logo = wmOn
    ? ''
    : data.schoolLogo
    ? `<div class="fr-logo"><img src="${esc(data.schoolLogo)}" alt=""></div>`
    : c.style === 'a'
    ? '<div class="fr-logo">SCHOOL<br>LOGO</div>'
    : '';

  const klass = [s.rollNo ? `Roll ${s.rollNo}` : '', data.className ? `Class ${data.className}` : ''].filter(Boolean).join(' · ');

  const totals = paidInFull
    ? `<div class="fr-tl"><span>Total due</span><b>${esc(fmtMoney(totalDue))}</b></div>
       <div class="fr-tl fr-big"><span>Total paid</span><b>${esc(fmtMoney(totalPaid))}</b></div>`
    : `<div class="fr-tl"><span>Total due</span><b>${esc(fmtMoney(totalDue))}</b></div>
       <div class="fr-tl"><span>Total paid</span><b>${esc(fmtMoney(totalPaid))}</b></div>
       <div class="fr-tl fr-big"><span>Balance due</span><b>${esc(fmtMoney(totalBalance))}</b></div>`;

  const stamp = paidInFull ? '<div class="fr-stampwrap"><span class="fr-stamp">PAID IN FULL</span></div>' : '';
  const thanks = (c.thanks || '').trim();

  return `<div class="fr fr-${c.style}${wmOn ? ' cg-wm-host' : ''}"><style>${RECEIPT_CSS}</style>
    ${wmOn ? watermarkHTML(data.schoolLogo, wm.receipt) : ''}
    <div class="fr-head">
      ${logo}
      <div class="fr-school">${esc(data.schoolName || 'School')}</div>
      <div class="fr-pill">${c.style === 'a' ? 'FEE RECEIPT' : 'FEE&nbsp; RECEIPT'}</div>
    </div>
    <div class="fr-body">
      <div class="fr-meta"><span>${c.style === 'a' ? 'Receipt No' : 'No'}: <b>${esc(receiptNumber(data, studentId, fundId))}</b></span><span>Date: <b>${esc(prettyShortDate(todayISO()))}</b></span></div>
      <div class="fr-stu">
        <div class="fr-stu-name">${esc(s.name || '—')}</div>
        ${s.fatherName ? `<div>S/D of ${esc(s.fatherName)}</div>` : ''}
        ${klass ? `<div>${esc(klass)}</div>` : ''}
      </div>
      <div class="fr-rows">${rows}</div>
      <div class="fr-tot">${totals}</div>
      ${stamp}
      <div class="fr-sigs"><div class="fr-sig">Received by</div><div class="fr-sig">Parent / Guardian</div></div>
      ${thanks ? `<div class="fr-thanks">${esc(thanks)}</div>` : ''}
    </div>
  </div>`;
}
