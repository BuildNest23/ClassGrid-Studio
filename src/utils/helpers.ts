import { Student, PrintSizeKey } from '../types';

export function newId(): string {
  return "s_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);
}

export function newAssessId(): string {
  return "asmt_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);
}

export function newAssessSubId(): string {
  return "asub_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);
}

export function newFundId(): string {
  return "fund_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);
}

export function ordinal(n: number | string): string {
  const num = Number(n);
  if (!num || num <= 0 || !isFinite(num)) return "—";
  if (num === 1) return "1st";
  if (num === 2) return "2nd";
  if (num === 3) return "3rd";
  return "";
}

export function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function todayKey(): string {
  return dateKey(new Date());
}

export function parseKey(key: string): Date {
  const parts = key.split("-").map(Number);
  return new Date(parts[0], parts[1] - 1, parts[2] || 1);
}

export function getMonthDays(year: number, month: number): string[] {
  const n = new Date(year, month + 1, 0).getDate();
  const out: string[] = [];
  for (let d = 1; d <= n; d++) {
    out.push(`${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
  }
  return out;
}

export function prettyDate(key: string): string {
  if (!key) return "—";
  try {
    return parseKey(key).toLocaleDateString(undefined, {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric"
    });
  } catch {
    return key;
  }
}

export function prettyMonth(monthKey: string): string {
  if (!monthKey) return "—";
  try {
    const parts = monthKey.split("-").map(Number);
    return new Date(parts[0], parts[1] - 1, 1).toLocaleDateString(undefined, {
      month: "long",
      year: "numeric"
    });
  } catch {
    return monthKey;
  }
}

export function prettyShortDate(key: string): string {
  if (!key) return "—";
  try {
    return parseKey(key).toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
      year: "numeric"
    });
  } catch {
    return key;
  }
}

export function fmtMoney(n: number | string | undefined | null): string {
  const val = Number(n) || 0;
  return "Rs " + val.toLocaleString("en-PK");
}

export function timeAgo(ms: number): string {
  const diff = Date.now() - ms;
  if (diff < 0) return "just now";
  const s = Math.floor(diff / 1000);
  if (s < 10) return "just now";
  if (s < 60) return s + " seconds ago";
  const m = Math.floor(s / 60);
  if (m < 60) return m + (m === 1 ? " minute ago" : " minutes ago");
  const h = Math.floor(m / 60);
  if (h < 24) return h + (h === 1 ? " hour ago" : " hours ago");
  const d = Math.floor(h / 24);
  if (d < 30) return d + (d === 1 ? " day ago" : " days ago");
  return new Date(ms).toLocaleDateString();
}

export function esc(s: string | number | undefined | null): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export function getSortedStudents(students: Student[]): Student[] {
  return students.slice().sort((a, b) =>
    String(a.rollNo || "").localeCompare(String(b.rollNo || ""), undefined, { numeric: true })
  );
}

export const PRINT_SIZES: Record<PrintSizeKey, { mult: number; label: string }> = {
  xs: { mult: 0.70, label: "Extra Small (most compact)" },
  s:  { mult: 0.85, label: "Small" },
  m:  { mult: 1.0,  label: "Medium (default)" },
  l:  { mult: 1.18, label: "Large" },
  xl: { mult: 1.35, label: "Extra Large (biggest)" }
};

export const TBL_SIZES = [
  { fs: 10, pad: 3, inp: 11, label: "Extra Small" },
  { fs: 11.5, pad: 5, inp: 12, label: "Small" },
  { fs: 12.5, pad: 7, inp: 13.5, label: "Medium" },
  { fs: 14, pad: 9, inp: 15, label: "Large" },
  { fs: 15.5, pad: 11, inp: 16.5, label: "Extra Large" }
];
