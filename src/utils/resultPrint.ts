import { AppData, Assessment, Student } from '../types';
import { esc, ordinal, PRINT_SIZES } from './helpers';
import { WatermarkSettings, loadWatermark, watermarkActive, watermarkHTML } from './logoWatermark';

export type ResultPrintStyle = 'a' | 'b';
const PRINT_STYLE_KEY = 'classroomResultPrintStyle';

export function loadPrintStyle(): ResultPrintStyle {
  try {
    return localStorage.getItem(PRINT_STYLE_KEY) === 'b' ? 'b' : 'a';
  } catch {
    return 'a';
  }
}

const PRINT_FOOTER_KEY = 'classroomResultPrintFooter';

export function loadPrintFooter(): string {
  try {
    return localStorage.getItem(PRINT_FOOTER_KEY) || '';
  } catch {
    return '';
  }
}

export function savePrintFooter(text: string) {
  try {
    localStorage.setItem(PRINT_FOOTER_KEY, text);
  } catch {
    /* ignore */
  }
}

export function savePrintStyle(style: ResultPrintStyle) {
  try {
    localStorage.setItem(PRINT_STYLE_KEY, style);
  } catch {
    /* ignore */
  }
}

interface ResultCalc {
  total: number;
  maxTotal: number;
  pct: number;
  computedPass: boolean;
  passed: boolean;
  manual: boolean;
}

export interface RankedItem {
  s: Student;
  r: ResultCalc;
  rank: number;
}

export interface ResultPrintCtx {
  style: ResultPrintStyle;
  data: AppData;
  asmt: Assessment;
  ranked: RankedItem[];
  totalMax: number;
  footerText: string;
  /** Logo watermark settings for report cards. Left out = use the saved universal setting. */
  watermark?: WatermarkSettings;
}

// ---------- small helpers ----------

const hasMarks = (r: ResultCalc) => r.maxTotal > 0;
const star = (note: boolean) => (note ? ' ✱' : '');

function rawMark(c: ResultPrintCtx, sid: string, subId: string) {
  return ((c.data.assessmentResults[c.asmt.id] || {})[sid] || {})[subId];
}

// A subject mark counts as failed when it is below the assessment pass percentage.
function subjectFailed(raw: number | 'A' | undefined, max: number, passPct: number): boolean {
  if (raw === undefined || max <= 0) return false;
  const n = raw === 'A' ? 0 : Number(raw) || 0;
  return (n / max) * 100 < passPct;
}

function fmtMark(raw: number | 'A' | undefined): string {
  return raw === undefined ? '' : raw === 'A' ? 'A' : String(raw);
}

const fmtPct = (n: number) => n.toFixed(1) + '%';

function pctOf(n: number, max: number): number {
  return max > 0 ? Math.round((n / max) * 1000) / 10 : 0;
}

function headerLine(d: AppData): string {
  const parts: string[] = [];
  if (d.className) parts.push(`Class: ${d.className}`);
  if (d.inchargeName) parts.push(`Incharge: ${d.inchargeName}`);
  if (d.academicYear) parts.push(`Session ${d.academicYear}`);
  return parts.join(' • ');
}

const hasManualPass = (c: ResultPrintCtx) => c.ranked.some(i => i.r.manual && !i.r.computedPass);

function pageClass(orientation: 'portrait' | 'landscape') {
  return orientation === 'landscape' ? 'ps2-land' : 'ps2-port';
}

// ---------- shared pieces ----------

function headerHTML(c: ResultPrintCtx, title: string, noLogo = false): string {
  const d = c.data;
  const line = esc(headerLine(d));
  const note = d.printNote ? esc(d.printNote) : '';
  if (c.style === 'a') {
    // With the watermark on, the corner logo and its balancing spacer are left out so the title is centred
    const logo = noLogo
      ? ''
      : d.schoolLogo
      ? `<div class="ps2-logo"><img src="${esc(d.schoolLogo)}" alt=""></div>`
      : `<div class="ps2-logo ps2-logo-empty">SCHOOL<br>LOGO</div>`;
    return `<div class="ps2-head">
      ${logo}
      <div class="ps2-head-text">
        <h1>${esc(d.schoolName)}</h1>
        ${line ? `<div class="ps2-head-sub">${line}</div>` : ''}
      </div>
      ${noLogo ? '' : '<div class="ps2-logo ps2-logo-spacer"></div>'}
    </div>
    <div class="ps2-title-bar">${esc(title)}</div>
    <div class="ps2-title-strip">${esc(c.asmt.name)}</div>`;
  }
  const logo = d.schoolLogo && !noLogo ? `<div class="ps2-logo"><img src="${esc(d.schoolLogo)}" alt=""></div>` : '';
  const spacer = d.schoolLogo && !noLogo ? `<div class="ps2-logo ps2-logo-spacer"></div>` : '';
  return `<div class="ps2-head">
      ${logo}
      <div class="ps2-head-text">
        <h1>${esc(d.schoolName)}</h1>
        ${line ? `<div class="ps2-head-sub">${line}</div>` : ''}
        ${note ? `<div class="ps2-head-sub ps2-head-note">${note}</div>` : ''}
      </div>
      ${spacer}
    </div>
    <div class="ps2-rule"></div>
    <div class="ps2-title">${esc(title)}</div>
    <div class="ps2-title-sub">${esc(c.asmt.name)}</div>`;
}

function infoBarHTML(c: ResultPrintCtx, items: string[]): string {
  return `<div class="ps2-info">${items.map(t => `<span>${t}</span>`).join('')}</div>`;
}

function sigHTML(middle: string): string {
  if (!middle) {
    return `<div class="ps2-sigs" style="grid-template-columns:1fr 1fr;gap:40mm;">
    <div><span>Class Incharge</span></div>
    <div><span>Principal</span></div>
  </div>`;
  }
  return `<div class="ps2-sigs">
    <div><span>Class Incharge</span></div>
    <div><span>${middle}</span></div>
    <div><span>Principal</span></div>
  </div>`;
}

function footerHTML(c: ResultPrintCtx): string {
  const text = (c.footerText || '').trim();
  const note = c.data.printNote ? esc(c.data.printNote) : '';
  if (c.style === 'a') {
    if (!text && !note) return '';
    return `<div class="ps2-foot">${text ? `<span>${esc(text)}</span>` : ''}${note ? `<span class="ps2-foot-chip">${note}</span>` : ''}</div>`;
  }
  if (!text) return '';
  return `<div class="ps2-foot"><span>${esc(text)}</span></div>`;
}

function rankBadge(c: ResultPrintCtx, rank: number, hasData: boolean): string {
  if (!hasData) return '—';
  if (c.style === 'a' && rank >= 1 && rank <= 3) {
    return `<span class="ps2-medal ps2-medal-${rank}">${rank}</span>`;
  }
  return esc(ordinal(rank));
}

function resultTag(c: ResultPrintCtx, r: ResultCalc): string {
  const word = r.passed ? 'PASS' : 'FAIL';
  const cls = r.passed ? 'ps2-tag ps2-pass' : 'ps2-tag ps2-fail';
  return `<span class="${cls}">${word}${star(r.manual && !r.computedPass)}</span>`;
}

function pctCell(c: ResultPrintCtx, r: ResultCalc): string {
  if (!hasMarks(r)) return '—';
  if (c.style === 'a') {
    return `<div class="ps2-pct-num">${fmtPct(r.pct)}</div><div class="ps2-bar"><i style="width:${Math.min(100, Math.max(0, r.pct))}%"></i></div>`;
  }
  return fmtPct(r.pct);
}

// ---------- 1. Class Result Sheet ----------

export function buildClassResultHTML(
  c: ResultPrintCtx,
  layout: { orientation: 'portrait' | 'landscape'; namePct: number; headFontPt: number }
): string {
  const { asmt, data, ranked } = c;
  const passPct = Number(asmt.passPercent) || 40;

  const headCells = asmt.subjects
    .map(
      sub =>
        `<th style="font-size:calc(${layout.headFontPt}pt * var(--mult, 1));overflow-wrap:anywhere">${esc(sub.name)}<br><span class="ps2-th-max">(${sub.max})</span></th>`
    )
    .join('');

  const rows = ranked
    .map(item => {
      const { s, r } = item;
      const markCells = asmt.subjects
        .map(sub => {
          const raw = rawMark(c, s.id, sub.id);
          const failed = subjectFailed(raw, Number(sub.max) || 0, passPct);
          return `<td class="num${failed ? ' ps2-failmark' : ''}">${esc(fmtMark(raw))}</td>`;
        })
        .join('');
      return `<tr>
        <td class="num">${esc(s.rollNo || '—')}</td>
        <td class="name">${esc(s.name || '—')}</td>
        ${markCells}
        <td class="num ps2-strong">${r.total}</td>
        <td class="num">${hasMarks(r) ? fmtPct(r.pct) : '—'}</td>
        <td class="num">${resultTag(c, r)}</td>
        <td class="num">${rankBadge(c, item.rank, hasMarks(r))}</td>
      </tr>`;
    })
    .join('');

  const failNote = c.style === 'a' ? 'Failed marks shown in red' : 'Failed marks underlined';
  return `<div class="print-sheet ps2 ps2-${c.style} ${pageClass(layout.orientation)}">
    ${headerHTML(c, 'Class Result Sheet')}
    ${infoBarHTML(c, [`Pass mark: ${passPct}%`, `Total max: ${c.totalMax}`, `Students: ${data.students.length}`, failNote, ...(hasManualPass(c) ? ['✱ Passed manually'] : [])])}
    <table class="ps2-table ps2-res">
      <thead><tr>
        <th style="width:6%">Roll</th>
        <th class="name" style="width:${layout.namePct}%">Name</th>
        ${headCells}
        <th style="width:7%">Total</th>
        <th style="width:7%">%</th>
        <th style="width:9%">Result</th>
        <th style="width:6%">Rank</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="ps2-spacer"></div>
    ${sigHTML('Examination Incharge')}
    ${footerHTML(c)}
  </div>`;
}

// ---------- 2. Report Cards ----------

// Report-card rows shrink automatically as subjects are added so a card always fits on one page.
// The size is planned for the shortest common paper (US Letter, ~255 mm of printable height).
// Numbers below were measured from real renders of the card.
const CARD_TARGET_MM = 244; // leaves ~11 mm spare on Letter for font differences between devices
function cardDensity(c: ResultPrintCtx, mult: number): { pad: number; fs: number; remH: number; ok: boolean } {
  const n = Math.max(1, c.asmt.subjects.length);
  const isA = c.style === 'a';
  // Fixed height of everything except the subject rows and the remarks box (at Medium print size)
  const fixed = (isA ? 158.5 : 140) + (isA ? 108 : 125) * (mult - 1) * (mult > 1 ? 0.7 : 0.45);
  // Height of a row's content (without padding), measured: A has a progress bar under the text
  const rowContent = (fs: number) => (isA ? 2.6 + 0.37 * fs * mult : 0.3 + 0.42 * fs * mult);

  for (const fs of [10, 9.5, 9, 8.5, 8]) {
    for (const remH of [28, 22, 16]) {
      const rowH = (CARD_TARGET_MM - fixed - remH) / n;
      const pad = (rowH - rowContent(fs)) / 2 / mult;
      if (pad >= 1) return { pad: Math.round(Math.min(3, pad) * 100) / 100, fs, remH, ok: true };
    }
  }
  const rowH = (CARD_TARGET_MM - fixed - 15.2) / n;
  const pad = Math.max(0.1, (rowH - rowContent(8)) / 2 / mult);
  return { pad: Math.round(pad * 100) / 100, fs: 8, remH: 12, ok: false };
}

// Picks the largest text scale (up to the chosen Print Size) at which the card fits on one page.
function cardFit(c: ResultPrintCtx): { pad: number; fs: number; remH: number; scale: number } {
  const wanted = (PRINT_SIZES[c.data.printSize] || PRINT_SIZES.m).mult;
  let last = cardDensity(c, 0.7);
  for (let sc = wanted; sc >= 0.7; sc = Math.round((sc - 0.05) * 100) / 100) {
    const d = cardDensity(c, sc);
    if (d.ok) return { ...d, scale: sc };
    last = d;
  }
  return { ...last, scale: 0.7 };
}

export function buildReportCardsHTML(c: ResultPrintCtx, onlyStudentId?: string): string {
  const { asmt, data, ranked } = c;
  const passPct = Number(asmt.passPercent) || 40;
  const total = ranked.length;
  const dens = { ...cardFit(c), maxRowsMm: asmt.subjects.length * 14 + 14 };
  const cardVars = `--mult:${dens.scale};--rc-pad:${dens.pad}mm;--rc-fs:${dens.fs}pt;--rc-remh:${dens.remH}mm`;
  const wm = c.watermark ?? loadWatermark();
  const wmOn = watermarkActive(wm, data.schoolLogo);

  return ranked
    .filter(item => !onlyStudentId || item.s.id === onlyStudentId)
    .map(item => {
      const { s, r } = item;
      const remark = (data.assessmentRemarks[asmt.id] || {})[s.id] || '';

      const subRows = asmt.subjects
        .map(sub => {
          const raw = rawMark(c, s.id, sub.id);
          const mx = Number(sub.max) || 0;
          const num = raw === undefined || raw === 'A' ? 0 : Number(raw) || 0;
          const pct = pctOf(num, mx);
          const failed = subjectFailed(raw, mx, passPct);
          const shown = raw === undefined ? '—' : raw === 'A' ? 'A' : String(raw);
          const pctHTML =
            c.style === 'a'
              ? `<div class="ps2-pct-num">${fmtPct(pct)}</div><div class="ps2-bar"><i style="width:${Math.min(100, pct)}%"></i></div>`
              : fmtPct(pct);
          return `<tr>
            <td class="left">${esc(sub.name)}</td>
            <td>${mx}</td>
            <td class="ps2-strong${failed ? ' ps2-failmark' : ''}">${esc(shown)}</td>
            <td class="pctcell">${pctHTML}</td>
          </tr>`;
        })
        .join('');

      const rankText = hasMarks(r) ? esc(ordinal(item.rank)) : '—';
      const resWord = r.passed ? 'PASS' : 'FAIL';
      const resCls = r.passed ? 'ps2-res-pass' : 'ps2-res-fail';

      let idBlock: string;
      if (c.style === 'a') {
        const initial = esc((s.name || '?').trim().charAt(0).toUpperCase() || '?');
        idBlock = `<div class="ps2-idbox">
          <div class="ps2-avatar">${initial}</div>
          <div class="ps2-idgrid">
            <div><label>Name</label><b>${esc(s.name || '—')}</b></div>
            <div><label>Father Name</label><b>${esc(s.fatherName || '—')}</b></div>
            <div><label>Roll No</label><b>${esc(s.rollNo || '—')}</b></div>
            <div><label>Adm. No</label><b>${esc(s.admissionNo || '—')}</b></div>
          </div>
        </div>`;
      } else {
        const field = (label: string, val: string) =>
          `<div class="ps2-field"><label>${label}</label><i></i><b>${esc(val || '—')}</b></div>`;
        idBlock = `<div class="ps2-idrows">
          <div class="ps2-idrow">${field('Name', s.name)}${field('Father Name', s.fatherName || '')}</div>
          <div class="ps2-idrow">${field('Roll No', s.rollNo || '')}${field('Adm. No', s.admissionNo || '')}</div>
        </div>`;
      }

      const rankSuffix = c.style === 'a' && hasMarks(r) ? ` <small>of ${total}</small>` : '';
      return `<div class="print-sheet report-card ps2 ps2-${c.style} ps2-port ps2-card${wmOn ? ' cg-wm-host' : ''}" style="${cardVars}">
        ${wmOn ? watermarkHTML(data.schoolLogo, wm.result) : ''}
        <div class="ps2-cardframe">
          ${headerHTML(c, 'Student Report Card', wmOn)}
          ${idBlock}
          <div class="ps2-rows" style="max-height:${dens.maxRowsMm}mm"><table class="ps2-table ps2-subtable">
            <thead><tr>
              <th class="left" style="width:40%">Subject</th>
              <th style="width:15%">Max</th>
              <th style="width:20%">Obtained</th>
              <th style="width:25%">Percentage</th>
            </tr></thead>
            <tbody>${subRows}</tbody>
          </table></div>
          <div class="ps2-summary">
            <div><label>Total</label><b>${r.total}<small> / ${c.totalMax}</small></b></div>
            <div><label>Percentage</label><b>${hasMarks(r) ? fmtPct(r.pct) : '—'}</b></div>
            <div><label>Rank</label><b class="ps2-rank">${rankText}${rankSuffix}</b></div>
            <div><label>Result</label><b class="${resCls}">${resWord}${star(r.manual && !r.computedPass)}</b></div>
          </div>
          <div class="ps2-remarks">
            <label>${c.style === 'a' ? 'Teacher Remarks' : 'Remarks'}</label>
            <div class="ps2-remarks-text">${esc(remark)}</div>
          </div>
          <div class="ps2-spacer"></div>
          ${sigHTML('')}
          ${footerHTML(c)}
        </div>
      </div>`;
    })
    .join('');
}

// ---------- 2b. Blank Result Card (for writing by hand) ----------
// One empty card: subjects and max marks are filled in from the open assessment,
// everything else (name, father name, roll no, class, marks, result, remarks) is a blank line or box.

export function buildBlankReportCardHTML(c: ResultPrintCtx): string {
  const { asmt, data } = c;
  const n = Math.max(1, asmt.subjects.length);
  const dens = { ...cardFit(c), maxRowsMm: n * 14 + 14 };
  const cardVars = `--mult:${dens.scale};--rc-pad:${dens.pad}mm;--rc-fs:${dens.fs}pt;--rc-remh:${Math.max(dens.remH, 22)}mm`;
  const wm = c.watermark ?? loadWatermark();
  const wmOn = watermarkActive(wm, data.schoolLogo);
  const rowMm = Math.round(Math.min(11, Math.max(5.5, 60 / n)) * 10) / 10;

  const line = (label: string) =>
    `<div style="flex:1;display:flex;align-items:flex-end;gap:1.5mm;min-width:0;">
      <span style="font-size:calc(8pt * var(--mult,1));font-weight:700;letter-spacing:0.06em;text-transform:uppercase;white-space:nowrap;">${label}</span>
      <i style="flex:1;border-bottom:0.3mm solid #444;min-width:6mm;height:6mm;"></i>
    </div>`;
  const idBlock = `<div style="margin:3mm 0 4mm;">
      <div style="display:flex;gap:8mm;margin-bottom:3mm;">${line('Name')}${line('Father Name')}</div>
      <div style="display:flex;gap:8mm;">${line('Roll No')}${line('Class')}</div>
    </div>`;

  const cell = 'border:0.3mm solid #666;';
  const subRows = asmt.subjects
    .map(
      sub => `<tr style="height:${rowMm}mm;">
        <td class="left">${esc(sub.name)}</td>
        <td>${Number(sub.max) || 0}</td>
        <td style="${cell}">&nbsp;</td>
      </tr>`
    )
    .join('');

  const box = (label: string, extra = '') =>
    `<div><label>${label}</label><b style="min-height:9mm;">&nbsp;${extra}</b></div>`;

  return `<div class="print-sheet report-card ps2 ps2-${c.style} ps2-port ps2-card${wmOn ? ' cg-wm-host' : ''}" style="${cardVars}">
    ${wmOn ? watermarkHTML(data.schoolLogo, wm.result) : ''}
    <div class="ps2-cardframe">
      ${headerHTML(c, 'Student Report Card', wmOn)}
      ${idBlock}
      <div class="ps2-rows" style="max-height:${dens.maxRowsMm + n * 4}mm"><table class="ps2-table ps2-subtable">
        <thead><tr>
          <th class="left" style="width:50%">Subject</th>
          <th style="width:20%">Max</th>
          <th style="width:30%">Obtained</th>
        </tr></thead>
        <tbody>${subRows}</tbody>
      </table></div>
      <div class="ps2-summary">
        ${box('Total', `<small> / ${c.totalMax}</small>`)}
        ${box('Percentage')}
        ${box('Rank')}
        ${box('Result')}
      </div>
      <div class="ps2-remarks">
        <label>${c.style === 'a' ? 'Teacher Remarks' : 'Remarks'}</label>
        <div class="ps2-remarks-text">&nbsp;</div>
      </div>
      <div class="ps2-spacer"></div>
      ${sigHTML('')}
      ${footerHTML(c)}
    </div>
  </div>`;
}

// ---------- 3. Merit List ----------

export function buildMeritListHTML(c: ResultPrintCtx): string {
  const { asmt, data, ranked } = c;
  const passPct = Number(asmt.passPercent) || 40;

  // Merit order: by rank (total marks), ties keep roll-number order.
  const list = ranked
    .slice()
    .sort((a, b) => {
      const ra = a.rank || 1e9;
      const rb = b.rank || 1e9;
      return ra - rb;
    });

  const rows = list
    .map(item => {
      const { s, r } = item;
      const top = hasMarks(r) && item.rank >= 1 && item.rank <= 3;
      const rankCell = !hasMarks(r)
        ? '—'
        : c.style === 'a'
        ? top
          ? `<span class="ps2-medal ps2-medal-${item.rank}">${item.rank}</span>`
          : esc(ordinal(item.rank))
        : esc(ordinal(item.rank)) + (top ? ' ★' : '');
      return `<tr class="${top && c.style === 'b' ? 'ps2-toprow' : ''}">
        <td class="num">${rankCell}</td>
        <td class="num">${esc(s.rollNo || '—')}</td>
        <td class="name ps2-namebold">${esc(s.name || '—')}</td>
        <td class="name">${esc(s.fatherName || '—')}</td>
        <td class="num ps2-strong">${r.total}</td>
        <td class="num">${pctCell(c, r)}</td>
        <td class="num">${resultTag(c, r)}</td>
      </tr>`;
    })
    .join('');

  return `<div class="print-sheet ps2 ps2-${c.style} ps2-port">
    ${headerHTML(c, 'Merit List')}
    ${infoBarHTML(c, ['Ranked by total marks', `Pass mark: ${passPct}%`, `Total max: ${c.totalMax}`, `Students: ${data.students.length}`, ...(hasManualPass(c) ? ['✱ Passed manually'] : [])])}
    <table class="ps2-table ps2-merit">
      <thead><tr>
        <th style="width:9%">Rank</th>
        <th style="width:8%">Roll</th>
        <th class="name">Name</th>
        <th class="name">Father Name</th>
        <th style="width:9%">Total</th>
        <th style="width:${c.style === 'a' ? 15 : 9}%">%</th>
        <th style="width:11%">Result</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="ps2-spacer"></div>
    ${sigHTML('Examination Incharge')}
    ${footerHTML(c)}
  </div>`;
}


type FundCode = 'PAID' | 'PARTIAL' | 'PENDING' | 'EXEMPT';

export interface FundLine {
  name: string;
  due: number | null;
  paid: number;
  balance: number | null;
  code: FundCode;
  dueDate: string;
  note: string;
}

export function fundLinesForStudent(data: AppData, sid: string): FundLine[] {
  return data.funds.map(f => {
    const p = (data.fundPayments[f.id] || {})[sid] || {};
    const target = Number(f.amount) || 0;
    const amount = Number(p.amount) || 0;
    const note = (p.note || '').trim();
    if (p.exempt) return { name: f.name, due: null, paid: 0, balance: null, code: 'EXEMPT' as FundCode, dueDate: f.dueDate, note };
    if (target <= 0) {
      return { name: f.name, due: null, paid: amount, balance: null, code: (amount > 0 ? 'PAID' : 'PENDING') as FundCode, dueDate: f.dueDate, note };
    }
    const code: FundCode = amount >= target ? 'PAID' : amount > 0 ? 'PARTIAL' : 'PENDING';
    return { name: f.name, due: target, paid: amount, balance: Math.max(0, target - amount), code, dueDate: f.dueDate, note };
  });
}

