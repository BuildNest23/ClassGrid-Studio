import { AppData, Assessment, Student } from '../types';
import { esc, ordinal, PRINT_SIZES, fmtMoney, prettyShortDate } from './helpers';

export type ResultPrintStyle = 'a' | 'b';
export const PRINT_STYLE_KEY = 'classroomResultPrintStyle';

export function loadPrintStyle(): ResultPrintStyle {
  try {
    return localStorage.getItem(PRINT_STYLE_KEY) === 'b' ? 'b' : 'a';
  } catch {
    return 'a';
  }
}

export const PRINT_FOOTER_KEY = 'classroomResultPrintFooter';

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

export interface ResultCalc {
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

function headerHTML(c: ResultPrintCtx, title: string): string {
  const d = c.data;
  const line = esc(headerLine(d));
  const note = d.printNote ? esc(d.printNote) : '';
  if (c.style === 'a') {
    const logo = d.schoolLogo
      ? `<div class="ps2-logo"><img src="${esc(d.schoolLogo)}" alt=""></div>`
      : `<div class="ps2-logo ps2-logo-empty">SCHOOL<br>LOGO</div>`;
    return `<div class="ps2-head">
      ${logo}
      <div class="ps2-head-text">
        <h1>${esc(d.schoolName)}</h1>
        ${line ? `<div class="ps2-head-sub">${line}</div>` : ''}
      </div>
      <div class="ps2-logo ps2-logo-spacer"></div>
    </div>
    <div class="ps2-title-bar">${esc(title)}</div>
    <div class="ps2-title-strip">${esc(c.asmt.name)}</div>`;
  }
  const logo = d.schoolLogo ? `<div class="ps2-logo"><img src="${esc(d.schoolLogo)}" alt=""></div>` : '';
  const spacer = d.schoolLogo ? `<div class="ps2-logo ps2-logo-spacer"></div>` : '';
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
      return `<div class="print-sheet report-card ps2 ps2-${c.style} ps2-port ps2-card" style="${cardVars}">
        <div class="ps2-cardframe">
          ${headerHTML(c, 'Student Report Card')}
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
          ${sigHTML('Parent / Guardian')}
          ${footerHTML(c)}
        </div>
      </div>`;
    })
    .join('');
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


// ---------- 4. Fee / Fund Statement (one student, all funds) ----------

export interface FundStatementCtx {
  style: ResultPrintStyle;
  data: AppData;
  footerText: string;
}

type FundCode = 'PAID' | 'PARTIAL' | 'PENDING' | 'EXEMPT';

export interface FundLine {
  name: string;
  due: number | null;      // null = no fixed amount / exempt
  paid: number;
  balance: number | null;  // null = not applicable
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

export function buildFundStatementHTML(c: FundStatementCtx, studentId: string): string {
  const { data } = c;
  const s = data.students.find(x => x.id === studentId);
  if (!s) return '';
  const lines = fundLinesForStudent(data, studentId);
  const n = Math.max(1, lines.length);
  const pad = n <= 6 ? 2.6 : n <= 10 ? 1.8 : n <= 16 ? 1.1 : 0.6;
  const fs = n <= 8 ? 10 : n <= 14 ? 9 : 8;
  const cardVars = `--mult:${(PRINT_SIZES[data.printSize] || PRINT_SIZES.m).mult};--rc-pad:${pad}mm;--rc-fs:${fs}pt;--rc-remh:22mm`;

  const totalDue = lines.reduce((a, l) => a + (l.due || 0), 0);
  const totalPaid = lines.reduce((a, l) => a + l.paid, 0);
  const totalBalance = lines.reduce((a, l) => a + (l.balance || 0), 0);
  const cleared = lines.every(l => l.code === 'PAID' || l.code === 'EXEMPT');

  const tag = (code: FundCode) => {
    if (code === 'EXEMPT') return '<span>EXEMPT</span>';
    const cls = code === 'PAID' ? 'ps2-tag ps2-pass' : 'ps2-tag ps2-fail';
    return `<span class="${cls}">${code}</span>`;
  };

  const rows = lines.length
    ? lines
        .map(
          l => `<tr>
            <td class="left">${esc(l.name)}${l.dueDate ? `<br><small style="font-weight:400;opacity:.7">Due ${esc(prettyShortDate(l.dueDate))}</small>` : ''}</td>
            <td>${l.due === null ? '—' : esc(fmtMoney(l.due))}</td>
            <td class="ps2-strong">${l.code === 'EXEMPT' ? '—' : esc(fmtMoney(l.paid))}</td>
            <td>${l.balance === null ? '—' : esc(fmtMoney(l.balance))}</td>
            <td>${tag(l.code)}</td>
          </tr>`
        )
        .join('')
    : `<tr><td class="left" colspan="5">No funds created yet.</td></tr>`;

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

  const notes = lines.filter(l => l.note).map(l => `${esc(l.name)}: ${esc(l.note)}`).join(' &nbsp;•&nbsp; ');
  const fake = { style: c.style, data, asmt: { name: `As of ${prettyShortDate(todayStr())}` }, ranked: [], totalMax: 0, footerText: c.footerText } as unknown as ResultPrintCtx;

  return `<div class="print-sheet report-card ps2 ps2-${c.style} ps2-port ps2-card" style="${cardVars}">
    <div class="ps2-cardframe">
      ${headerHTML(fake, 'Student Fee Statement')}
      ${idBlock}
      <div class="ps2-rows" style="max-height:${lines.length * 15 + 14}mm"><table class="ps2-table ps2-subtable">
        <thead><tr>
          <th class="left" style="width:34%">Fund</th>
          <th style="width:18%">Amount</th>
          <th style="width:18%">Paid</th>
          <th style="width:16%">Balance</th>
          <th style="width:14%">Status</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table></div>
      <div class="ps2-summary">
        <div><label>Total Due</label><b>${esc(fmtMoney(totalDue))}</b></div>
        <div><label>Total Paid</label><b>${esc(fmtMoney(totalPaid))}</b></div>
        <div><label>Balance</label><b>${esc(fmtMoney(totalBalance))}</b></div>
        <div><label>Status</label><b class="${cleared ? 'ps2-res-pass' : 'ps2-res-fail'}">${cleared ? 'CLEARED' : 'DUE'}</b></div>
      </div>
      <div class="ps2-remarks">
        <label>Notes</label>
        <div class="ps2-remarks-text">${notes}</div>
      </div>
      <div class="ps2-spacer"></div>
      ${sigHTML('Parent / Guardian')}
      ${footerHTML(fake)}
    </div>
  </div>`;
}

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
