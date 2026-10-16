import { AppData, Assessment } from '../types';

/**
 * "Edit with AI" file exchange.
 * The app exports a small JSON file for one tab, the person edits it with any AI tool,
 * and the app imports it back. Only the fields listed for that tab are ever applied.
 */

export const AI_FILE_APP = 'ClassgridAI';
export const AI_FILE_VERSION = 1;
const MAX_FILE_BYTES = 2 * 1024 * 1024;
const MAX_REMARK_LEN = 300;

interface RankedLike {
  s: { id: string; rollNo: string; name: string };
  r: { total: number; maxTotal: number; pct: number; passed: boolean };
  rank: number;
}

// ---------- Results tab ----------

export function buildResultsAiFile(data: AppData, asmt: Assessment, ranked: RankedLike[]) {
  const marksOf = data.assessmentResults[asmt.id] || {};
  const remarksOf = data.assessmentRemarks[asmt.id] || {};
  const totalMax = asmt.subjects.reduce((sum, s) => sum + (Number(s.max) || 0), 0);

  return {
    app: AI_FILE_APP,
    version: AI_FILE_VERSION,
    tab: 'results',
    instructions:
      'Write a short teacher remark for each student in the "remarks" field, based on their marks ' +
      '(strengths and weaknesses). Edit ONLY the "remarks" field. Do not add, remove or reorder students, ' +
      'and do not change "id" or any other field. Keep each remark under 150 characters. ' +
      'Return the complete JSON file.',
    school: data.schoolName,
    assessment: {
      id: asmt.id,
      name: asmt.name,
      passPercent: asmt.passPercent,
      totalMax,
    },
    subjects: asmt.subjects.map(s => ({ name: s.name, max: Number(s.max) || 0 })),
    students: ranked.map(item => {
      const row = marksOf[item.s.id] || {};
      const marks: Record<string, number | 'A' | null> = {};
      asmt.subjects.forEach(sub => {
        const v = row[sub.id];
        marks[sub.name] = v === undefined ? null : v;
      });
      const hasMarks = item.r.maxTotal > 0;
      return {
        id: item.s.id,
        rollNo: item.s.rollNo,
        name: item.s.name,
        marks,
        total: item.r.total,
        percentage: hasMarks ? Math.round(item.r.pct * 10) / 10 : null,
        rank: hasMarks ? item.rank : null,
        result: hasMarks ? (item.r.passed ? 'PASS' : 'FAIL') : null,
        remarks: remarksOf[item.s.id] || '',
      };
    }),
  };
}

export interface ResultsImportPlan {
  updates: Record<string, string>; // studentId -> new remark
  changed: number;
  unchanged: number;
  skippedUnknown: number;
  skippedBlank: number;
  truncated: number;
}

/** Reads and checks an AI file for the Results tab. Throws an Error with a plain message when it can't be used. */
export async function planResultsImport(file: File, data: AppData, asmt: Assessment): Promise<ResultsImportPlan> {
  if (file.size > MAX_FILE_BYTES) throw new Error('File is too large (over 2 MB).');

  let parsed: any;
  try {
    parsed = JSON.parse(await file.text());
  } catch {
    throw new Error('This is not a valid JSON file.');
  }

  if (!parsed || parsed.app !== AI_FILE_APP) {
    throw new Error('This file was not exported with "Export for AI".');
  }
  if (parsed.tab !== 'results') {
    throw new Error('This file is for a different tab, not Results.');
  }
  if (!parsed.assessment || parsed.assessment.id !== asmt.id) {
    const other = parsed.assessment?.name ? ` ("${String(parsed.assessment.name)}")` : '';
    throw new Error(`This file is for a different assessment${other}. Open that assessment and import there.`);
  }
  if (!Array.isArray(parsed.students)) {
    throw new Error('The file has no students list.');
  }

  const known = new Set(data.students.map(s => s.id));
  const current = data.assessmentRemarks[asmt.id] || {};
  const plan: ResultsImportPlan = { updates: {}, changed: 0, unchanged: 0, skippedUnknown: 0, skippedBlank: 0, truncated: 0 };

  for (const entry of parsed.students) {
    const id = entry && typeof entry.id === 'string' ? entry.id : '';
    if (!id || !known.has(id)) {
      plan.skippedUnknown++;
      continue;
    }
    if (typeof entry.remarks !== 'string') {
      plan.skippedBlank++;
      continue;
    }
    let text = entry.remarks.trim();
    if (!text) {
      // Never wipe an existing remark with an empty one by accident
      if (current[id]) plan.skippedBlank++;
      else plan.unchanged++;
      continue;
    }
    if (text.length > MAX_REMARK_LEN) {
      text = text.slice(0, MAX_REMARK_LEN);
      plan.truncated++;
    }
    if (text === (current[id] || '')) {
      plan.unchanged++;
    } else {
      plan.updates[id] = text;
      plan.changed++;
    }
  }
  return plan;
}
