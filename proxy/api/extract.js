// Classgrid AI proxy (Vercel serverless function).
// Receives a PDF or image from the app, asks Gemini to read the student list,
// and returns clean JSON. The Gemini key lives only in the GEMINI_API_KEY env variable.

const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const MAX_BASE64_CHARS = 4_000_000; // Vercel request bodies are limited to ~4.5 MB
const MAX_STUDENTS = 500;
const ALLOWED_MIME = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp']);

// Best-effort per-IP limit (memory is not shared between serverless instances)
const HITS = new Map();
const LIMIT_PER_HOUR = Number(process.env.LIMIT_PER_HOUR || 20);

const PROMPT =
  'This file contains a list of students from a school class. ' +
  'Extract every student. For each one return: name, fatherName, admissionNo, rollNo, phone. ' +
  'Copy values exactly as written. Use an empty string when a value is not in the file. ' +
  'Do not guess, invent or correct anything. Skip header rows, totals and page numbers. ' +
  'Keep phone numbers exactly as written, including any leading zero.';

const REMARKS_PROMPT =
  'This file lists students with a remark (teacher comment) for each. ' +
  'For every student return: rollNo, name, remarks. ' +
  'Copy the remark exactly as written. Use an empty string when a value is not in the file. ' +
  'Do not guess, invent, shorten or correct anything. Skip header rows and page numbers.';

const REMARKS_SCHEMA = {
  type: 'OBJECT',
  properties: {
    students: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          rollNo: { type: 'STRING' },
          name: { type: 'STRING' },
          remarks: { type: 'STRING' },
        },
        required: ['remarks'],
      },
    },
  },
  required: ['students'],
};

const MARKS_SCHEMA = {
  type: 'OBJECT',
  properties: {
    students: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          rollNo: { type: 'STRING' },
          name: { type: 'STRING' },
          marks: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: { subject: { type: 'STRING' }, value: { type: 'STRING' } },
              required: ['subject', 'value'],
            },
          },
        },
        required: ['marks'],
      },
    },
  },
  required: ['students'],
};

function marksPrompt(subjects) {
  const list = (Array.isArray(subjects) ? subjects : []).slice(0, 30).map(x => clip(x, 40)).filter(Boolean);
  return (
    'This file is a marks sheet: one row per student with marks in different subjects. ' +
    'For every student return: rollNo, name, and marks as a list of {subject, value}. ' +
    `Use these subject names exactly when the column matches one of them: ${JSON.stringify(list)}. ` +
    'Ignore any other columns such as total, percentage, grade, rank or result. ' +
    'Copy each mark exactly as written (a number, or A / AB / Absent for absent). ' +
    'Leave out a subject when its cell is empty. Do not calculate, guess or correct anything. ' +
    'Skip header rows, totals and page numbers.'
  );
}

const GEN_SCHEMA = {
  type: 'OBJECT',
  properties: {
    remarks: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: { n: { type: 'INTEGER' }, remark: { type: 'STRING' } },
        required: ['n', 'remark'],
      },
    },
  },
  required: ['remarks'],
};

const LANGUAGES = new Set(['English', 'Urdu', 'Hindi']);

// Writes a short report-card remark for each student from marks only (no names are sent).
async function generateRemarks(req, res) {
  const { students, assessment, language } = req.body || {};
  if (!Array.isArray(students) || !students.length || students.length > 200) {
    return res.status(400).json({ error: 'Send between 1 and 200 students.' });
  }
  const lang = LANGUAGES.has(language) ? language : 'English';
  const items = students.map(s => ({
    n: Number(s?.n),
    marks: s?.marks && typeof s.marks === 'object' ? s.marks : {},
    percentage: typeof s?.percentage === 'number' ? s.percentage : null,
    rank: typeof s?.rank === 'number' ? s.rank : null,
    result: s?.result === 'PASS' || s?.result === 'FAIL' ? s.result : null,
  })).filter(s => Number.isInteger(s.n));
  if (!items.length) return res.status(400).json({ error: 'No valid students.' });

  const prompt =
    `You are a kind, professional school teacher writing report-card remarks in ${lang}. ` +
    `Assessment: ${clip(assessment, 60) || 'exam'}. ` +
    'For each student below write ONE remark of at most 15 words, based only on their marks, percentage and result. ' +
    'Be encouraging and specific (mention a strong or weak subject when the marks show it). ' +
    'For a failed student be gentle and give a next step. Do not mention rank numbers, names or other students. ' +
    'Marks of "A" mean absent. Return every n exactly once.\n\n' + JSON.stringify(items);

  try {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.6, responseMimeType: 'application/json', responseSchema: GEN_SCHEMA },
        }),
      }
    );
    if (r.status === 429) return res.status(429).json({ error: 'AI is busy. Try again in a minute.' });
    if (!r.ok) return res.status(502).json({ error: 'The AI service could not write remarks.' });
    const out = await r.json();
    let parsed;
    try {
      parsed = JSON.parse(out?.candidates?.[0]?.content?.parts?.[0]?.text);
    } catch {
      return res.status(502).json({ error: 'The AI returned an unreadable answer. Try again.' });
    }
    const valid = new Set(items.map(i => i.n));
    const remarks = (Array.isArray(parsed?.remarks) ? parsed.remarks : [])
      .map(x => ({ n: Number(x?.n), remark: clip(x?.remark, 300) }))
      .filter(x => valid.has(x.n) && x.remark);
    return res.status(200).json({ remarks });
  } catch {
    return res.status(502).json({ error: 'Could not reach the AI service.' });
  }
}

const SCHEMA = {
  type: 'OBJECT',
  properties: {
    students: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          name: { type: 'STRING' },
          fatherName: { type: 'STRING' },
          admissionNo: { type: 'STRING' },
          rollNo: { type: 'STRING' },
          phone: { type: 'STRING' },
        },
        required: ['name'],
      },
    },
  },
  required: ['students'],
};

function cors(req, res) {
  const allowed = process.env.ALLOWED_ORIGIN; // optional, e.g. https://yourname.github.io
  const origin = req.headers.origin || '';
  res.setHeader('Access-Control-Allow-Origin', allowed ? (origin === allowed ? origin : allowed) : '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

const clip = (v, n) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, n) : '');

export default async function handler(req, res) {
  cors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST.' });

  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ error: 'Server is not set up (missing key).' });
  }

  // rate limit
  const ip = String(req.headers['x-forwarded-for'] || 'x').split(',')[0].trim();
  const now = Date.now();
  const recent = (HITS.get(ip) || []).filter(t => now - t < 3600_000);
  if (recent.length >= LIMIT_PER_HOUR) {
    return res.status(429).json({ error: 'Too many imports. Please try again later.' });
  }
  recent.push(now);
  HITS.set(ip, recent);

  if (req.body && req.body.mode === 'generate-remarks') return generateRemarks(req, res);

  const { mimeType, data, mode, subjects } = req.body || {};
  const remarksMode = mode === 'remarks';
  const marksMode = mode === 'marks';
  if (!ALLOWED_MIME.has(mimeType) || typeof data !== 'string' || !data) {
    return res.status(400).json({ error: 'Send a PDF, JPG, PNG or WEBP file.' });
  }
  if (data.length > MAX_BASE64_CHARS) {
    return res.status(413).json({ error: 'File is too large.' });
  }

  try {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY },
        body: JSON.stringify({
          contents: [{ parts: [{ text: marksMode ? marksPrompt(subjects) : remarksMode ? REMARKS_PROMPT : PROMPT }, { inline_data: { mime_type: mimeType, data } }] }],
          generationConfig: {
            temperature: 0,
            responseMimeType: 'application/json',
            responseSchema: marksMode ? MARKS_SCHEMA : remarksMode ? REMARKS_SCHEMA : SCHEMA,
          },
        }),
      }
    );

    if (r.status === 429) return res.status(429).json({ error: 'AI is busy. Try again in a minute.' });
    if (!r.ok) return res.status(502).json({ error: 'The AI service could not read this file.' });

    const out = await r.json();
    const text = out?.candidates?.[0]?.content?.parts?.[0]?.text;
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      return res.status(502).json({ error: 'The AI returned an unreadable answer. Try again.' });
    }

    const list = Array.isArray(parsed?.students) ? parsed.students.slice(0, MAX_STUDENTS) : [];

    if (marksMode) {
      const students = list
        .map(s => ({
          rollNo: clip(s?.rollNo, 10),
          name: clip(s?.name, 80),
          marks: (Array.isArray(s?.marks) ? s.marks : [])
            .slice(0, 30)
            .map(m => ({ subject: clip(m?.subject, 40), value: clip(m?.value, 10) }))
            .filter(m => m.subject && m.value),
        }))
        .filter(s => (s.name || s.rollNo) && s.marks.length);
      return res.status(200).json({ students });
    }

    if (remarksMode) {
      const students = list
        .map(s => ({ rollNo: clip(s?.rollNo, 10), name: clip(s?.name, 80), remarks: clip(s?.remarks, 300) }))
        .filter(s => s.remarks && (s.name || s.rollNo));
      return res.status(200).json({ students });
    }

    const students = list
      .map(s => ({
        name: clip(s?.name, 80),
        fatherName: clip(s?.fatherName, 80),
        admissionNo: clip(s?.admissionNo, 20),
        rollNo: clip(s?.rollNo, 10),
        phone: clip(s?.phone, 20),
      }))
      .filter(s => s.name);

    return res.status(200).json({ students });
  } catch {
    return res.status(502).json({ error: 'Could not reach the AI service.' });
  }
}
