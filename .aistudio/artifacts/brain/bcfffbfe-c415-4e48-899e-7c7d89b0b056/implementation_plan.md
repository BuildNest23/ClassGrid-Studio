# Exact Form Header & Dynamic 20-Slot Form Duplication

Ensure every printed Student-Wise Record sheet strictly preserves the original form's layout and verbatim badge text (`Page 1 of 2 (Student-wise Record)`), allocating exactly 20 student slots per form and dynamically generating identical sheets as enrollment scales from 14 to 50, 100, or more students.

---

### User Review & Critical Decisions

> [!NOTE]
> Based on your confirmed choices:
> - **Verbatim Original Badge**: Every Student-Wise Record page will display the exact badge text from the original PDF:
>   `Page 1 of 2` / `(Student-wise Record)` without any custom sheet numbering (no "Sheet 1/3" or suffixes).
> - **Fixed 20-Slot Form Structure**: Each form has exactly 20 student rows:
>   - For 14 students: 1 form generated (14 filled + 6 empty slots to complete the 20-row form).
>   - For 50 students: 3 identical 20-slot forms generated (Sheet 1: 1–20, Sheet 2: 21–40, Sheet 3: 41–50 + 10 empty slots).
>   - For 100 students: 5 identical 20-slot forms generated.
> - **Trailing Daily Class Summary**: Followed by the official Page 2 form (`Page 2 of 2 (Daily Class Summary)`).

---

## 1. Overview & Core Concept

Teachers receive identical, official 20-student forms matching the Punjab SED template regardless of class size:
- Small classes (e.g. 14 students) fill the first 14 rows, leaving the remaining 6 rows open for handwriting.
- Larger classes automatically duplicate the standard 20-student Page 1 form into multiple identical sheets, ensuring row height and margin geometry remain 100% consistent across every printout.
- The top-right badge always displays the authentic `Page 1 of 2 (Student-wise Record)`.

---

## 2. Technical Implementation Steps

### In `src/utils/dailyTestPrint.ts`:
1. Set the badge label on all student sheets to:
   ```ts
   const badgeLabel = 'Page 1 of 2<br><small>(Student-wise Record)</small>';
   ```
2. Dynamic Chunking & 20-Row Padding:
   - Chunk students into blocks of 20 (`CHUNK_SIZE = 20`).
   - If class size is not a multiple of 20 (e.g. 14 or 50), the last chunk is padded with blank numbered rows up to 20 so every printed sheet has exactly 20 rows.
3. Keep all top header fields (`School Name`, `EMIS Code`, `Class`, `Section`, `Month`) as blank underlined handwriting lines on every sheet.
4. Conclude with Page 2 (`DAILY CLASS SUMMARY (Page 2 of 2)`).

---

## 3. Verification Plan

1. **Compilation**: Run `compile_applet` and `npx tsc --noEmit`.
2. **Badge & Layout Check**:
   - Verify every student sheet displays `Page 1 of 2 (Student-wise Record)` with no sheet fractions or alterations.
   - Verify each sheet has exactly 20 rows.
   - For 50 students, verify 3 identical Page 1 forms followed by 1 Page 2 form.
