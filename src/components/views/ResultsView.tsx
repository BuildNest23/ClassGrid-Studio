import { SyncInput } from '../SyncInput';
import { ActionGrid, ActionButton } from '../ActionGrid';
import React, { useState } from 'react';
import { useClassroom } from '../../context/ClassroomContext';
import { Assessment, Student } from '../../types';
import {
  newAssessId,
  newAssessSubId,
  ordinal,
  getSortedStudents,
  esc
} from '../../utils/helpers';
import { triggerPrint } from '../../utils/printEngine';
import {
  Printer,
  Edit3,
  Trash2,
  Copy,
  Plus,
  BarChart3,
  CheckCircle,
  XCircle,
  FileText,
  X
} from 'lucide-react';

export const ResultsView: React.FC = () => {
  const {
    data,
    saveData,
    quickSaveData,
    flushSave,
    toast,
    uiConfirm,
    uiPrompt,
    activeAssessmentId,
    setActiveAssessmentId,
    calcAssessmentResult,
    computeAssessmentRanking,
    assessmentEntryCount,
    buildPrintHeaderHTML
  } = useClassroom();

  const [newFormOpen, setNewFormOpen] = useState(false);
  const [newAsmtName, setNewAsmtName] = useState("");
  const [newAsmtPass, setNewAsmtPass] = useState(40);

  // Subject adding form
  const [newSubName, setNewSubName] = useState("");
  const [newSubMax, setNewSubMax] = useState("");
  const [copyPickerOpen, setCopyPickerOpen] = useState(false);

  const activeAsmt = data.assessments.find(a => a.id === activeAssessmentId);
  const sortedStudents = getSortedStudents(data.students);

  // 1. ASSESSMENT LIST VIEW
  if (!activeAsmt) {
    const handleCreateAsmt = (e: React.FormEvent) => {
      e.preventDefault();
      const trimmedName = newAsmtName.trim();
      if (!trimmedName) {
        toast("Please enter an assessment name.", "error");
        return;
      }
      const passPct = Number(newAsmtPass) || 40;
      const newAsmt: Assessment = {
        id: newAssessId(),
        name: trimmedName,
        passPercent: Math.max(1, Math.min(100, Math.round(passPct))),
        subjects: [],
        createdAt: Date.now()
      };

      saveData(prev => ({
        ...prev,
        assessments: [...prev.assessments, newAsmt]
      }));

      setNewFormOpen(false);
      setNewAsmtName("");
      setNewAsmtPass(40);
      setActiveAssessmentId(newAsmt.id);
      toast("Assessment created. Now add subjects.", "success");
    };

    return (
      <div className="space-y-3">
        <div className="bg-white dark:bg-[#1C1917] border border-[#E7E5E4] dark:border-[#44403C] rounded-2xl p-4 shadow-xs">
          <div className="flex justify-between items-center gap-2 flex-wrap">
            <h2 className="text-base font-bold text-[#1C1917] dark:text-[#F5F5F4]">
              Assessments ({data.assessments.length})
            </h2>
            <button
              type="button"
              onClick={() => setNewFormOpen(!newFormOpen)}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-[#B91C1C] text-white hover:bg-[#991B1B] cursor-pointer"
            >
              {newFormOpen ? "Cancel" : "+ New Assessment"}
            </button>
          </div>

          {newFormOpen && (
            <form onSubmit={handleCreateAsmt} className="mt-3.5 p-4 bg-[#FAFAF9] dark:bg-[#0C0A09] border border-[#E7E5E4] dark:border-[#44403C] rounded-2xl space-y-3">
              <h3 className="text-sm font-bold text-[#1C1917] dark:text-[#F5F5F4]">Create New Assessment</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[10.5px] font-bold text-[#78716C] dark:text-[#A8A29E] uppercase tracking-wide mb-1">
                    Assessment Name *
                  </label>
                  <input
                    type="text"
                    value={newAsmtName}
                    placeholder="e.g. First Term / Monthly Test 1 / Final Exam"
                    onChange={e => setNewAsmtName(e.target.value)}
                    className="w-full p-2 text-xs rounded-xl border border-[#D6D3D1] dark:border-[#44403C] bg-white dark:bg-[#1C1917] text-inherit"
                  />
                </div>
                <div>
                  <label className="block text-[10.5px] font-bold text-[#78716C] dark:text-[#A8A29E] uppercase tracking-wide mb-1">
                    Pass Percentage (%) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={newAsmtPass}
                    onChange={e => setNewAsmtPass(Number(e.target.value))}
                    className="w-full p-2 text-xs rounded-xl border border-[#D6D3D1] dark:border-[#44403C] bg-white dark:bg-[#1C1917] text-inherit"
                  />
                </div>
              </div>
              <ActionGrid cols={2}>
                <ActionButton
                  type="submit"
                  variant="primary"
                  icon={Plus}
                >
                  Create Assessment
                </ActionButton>
                <ActionButton
                  type="button"
                  variant="secondary"
                  onClick={() => setNewFormOpen(false)}
                >
                  Cancel
                </ActionButton>
              </ActionGrid>
            </form>
          )}
        </div>

        {/* Assessment Card List */}
        <div className="bg-white dark:bg-[#1C1917] border border-[#E7E5E4] dark:border-[#44403C] rounded-2xl p-4 shadow-xs">
          {data.assessments.length === 0 ? (
            <div className="text-center py-8 text-[#78716C] dark:text-[#A8A29E] bg-[#FAFAF9] dark:bg-[#0C0A09] border border-dashed border-[#D6D3D1] dark:border-[#44403C] rounded-2xl flex flex-col items-center justify-center">
              <BarChart3 className="w-10 h-10 mb-2 text-stone-400 dark:text-stone-600" />
              <span>No assessments created yet. Tap <b>+ New Assessment</b> to create your first exam or test.</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {data.assessments.slice().sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)).map(a => {
                const totalMax = a.subjects.reduce((sum, s) => sum + (Number(s.max) || 0), 0);
                const entered = assessmentEntryCount(a.id);
                const total = data.students.length;
                const pct = total ? Math.round((entered / total) * 100) : 0;
                const complete = entered >= total && total > 0;

                return (
                  <div
                    key={a.id}
                    onClick={() => setActiveAssessmentId(a.id)}
                    className="p-4 rounded-2xl border border-[#E7E5E4] dark:border-[#44403C] hover:border-[#D6D3D1] hover:-translate-y-0.5 transition-all cursor-pointer bg-white dark:bg-[#1C1917] shadow-xs"
                  >
                    <div className="flex justify-between items-start gap-2 mb-2">
                      <b className="text-sm font-bold text-[#1C1917] dark:text-[#F5F5F4] truncate">
                        {a.name}
                      </b>
                      <span className="text-[11px] font-bold text-[#78716C] dark:text-[#A8A29E] shrink-0">
                        {a.subjects.length} sub • Max {totalMax}
                      </span>
                    </div>

                    <div className="w-full h-2 bg-[#F5F5F4] dark:bg-[#292524] rounded-full overflow-hidden my-2">
                      <div
                        className={`h-full transition-all ${complete ? 'bg-[#065F46]' : 'bg-[#B4791F]'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>

                    <div className="flex justify-between text-xs text-[#78716C] dark:text-[#A8A29E] mt-2">
                      <span><b>{entered}</b> / {total} entered</span>
                      <span>Pass: <b>{a.passPercent}%</b></span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // 2. ACTIVE ASSESSMENT MARKS ENTRY VIEW
  const ranked = computeAssessmentRanking(activeAsmt.id);
  const totalMax = activeAsmt.subjects.reduce((sum, s) => sum + (Number(s.max) || 0), 0);
  const entered = assessmentEntryCount(activeAsmt.id);
  const progressPct = data.students.length ? Math.round((entered / data.students.length) * 100) : 0;

  // Rename
  const handleRename = async () => {
    const val = await uiPrompt("Assessment name:", activeAsmt.name, {
      title: "Rename Assessment",
      yesText: "Save",
      icon: "edit"
    });
    if (val === null) return;
    const trimmed = String(val).trim();
    if (!trimmed) return;

    saveData(prev => ({
      ...prev,
      assessments: prev.assessments.map(a => (a.id === activeAsmt.id ? { ...a, name: trimmed } : a))
    }));
    toast("Assessment renamed.", "success");
  };

  // Delete
  const handleDelete = async () => {
    const ok = await uiConfirm(`Delete assessment "${activeAsmt.name}"?\n\nAll its marks and remarks will be permanently deleted.`, {
      title: "Delete Assessment",
      yesText: "Delete",
      danger: true,
      icon: "warning"
    });
    if (!ok) return;

    saveData(prev => {
      const nextAsmts = prev.assessments.filter(a => a.id !== activeAsmt.id);
      const nextResults = { ...prev.assessmentResults };
      delete nextResults[activeAsmt.id];
      const nextManual = { ...prev.assessmentManualPass };
      delete nextManual[activeAsmt.id];
      const nextRemarks = { ...prev.assessmentRemarks };
      delete nextRemarks[activeAsmt.id];

      return {
        ...prev,
        assessments: nextAsmts,
        assessmentResults: nextResults,
        assessmentManualPass: nextManual,
        assessmentRemarks: nextRemarks
      };
    });

    setActiveAssessmentId(null);
    toast("Assessment deleted.", "success");
  };

  // Update Pass Percent
  const handleUpdatePassPercent = (v: string) => {
    const n = Math.max(1, Math.min(100, Math.round(Number(v) || 40)));
    saveData(prev => ({
      ...prev,
      assessments: prev.assessments.map(a => (a.id === activeAsmt.id ? { ...a, passPercent: n } : a))
    }));
  };

  // Add Subject Inline
  const handleAddSubject = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newSubName.trim();
    const max = Number(newSubMax) || 0;
    if (!name) {
      toast("Enter a subject name.", "error");
      return;
    }
    if (max <= 0) {
      toast("Enter a max mark greater than 0.", "error");
      return;
    }

    saveData(prev => ({
      ...prev,
      assessments: prev.assessments.map(a => {
        if (a.id === activeAsmt.id) {
          return {
            ...a,
            subjects: [...a.subjects, { id: newAssessSubId(), name, max: Math.round(max) }]
          };
        }
        return a;
      })
    }));

    setNewSubName("");
    setNewSubMax("");
    toast("Subject added.", "success");
  };

  // Rename Subject Inline
  const handleRenameSubject = (subId: string, rawName: string) => {
    const name = rawName.trim();
    if (!name) return; // keep old name (the input re-syncs automatically)
    saveData(prev => ({
      ...prev,
      assessments: prev.assessments.map(a => {
        if (a.id === activeAsmt.id) {
          return {
            ...a,
            subjects: a.subjects.map(s => (s.id === subId ? { ...s, name } : s))
          };
        }
        return a;
      })
    }));
  };

  // Change Subject Max Inline
  const handleChangeSubjectMax = (subId: string, maxVal: string) => {
    const n = Math.max(1, Math.round(Number(maxVal) || 1));
    saveData(prev => ({
      ...prev,
      assessments: prev.assessments.map(a => {
        if (a.id === activeAsmt.id) {
          return {
            ...a,
            subjects: a.subjects.map(s => (s.id === subId ? { ...s, max: n } : s))
          };
        }
        return a;
      })
    }));
  };

  // Remove Subject
  const handleRemoveSubject = async (subId: string, subName: string) => {
    const ok = await uiConfirm(`Remove subject "${subName}"?\n\nAll scores in this subject will be deleted.`, {
      title: "Remove Subject",
      yesText: "Remove",
      danger: true,
      icon: "warning"
    });
    if (!ok) return;

    saveData(prev => {
      const nextResults = { ...prev.assessmentResults };
      if (nextResults[activeAsmt.id]) {
        Object.keys(nextResults[activeAsmt.id]).forEach(sid => {
          delete nextResults[activeAsmt.id][sid][subId];
        });
      }

      return {
        ...prev,
        assessments: prev.assessments.map(a => {
          if (a.id === activeAsmt.id) {
            return {
              ...a,
              subjects: a.subjects.filter(s => s.id !== subId)
            };
          }
          return a;
        }),
        assessmentResults: nextResults
      };
    });
    toast("Subject removed.", "success");
  };

  // Copy subjects from other assessments
  const handleCopySubjects = (sourceAsmtId: string) => {
    const src = data.assessments.find(a => a.id === sourceAsmtId);
    if (!src) return;
    const existing = new Set(activeAsmt.subjects.map(s => s.name.toLowerCase()));
    let added = 0;

    saveData(prev => {
      const newSubs = [...activeAsmt.subjects];
      src.subjects.forEach(s => {
        if (!existing.has(s.name.toLowerCase())) {
          newSubs.push({ id: newAssessSubId(), name: s.name, max: s.max });
          added++;
        }
      });
      return {
        ...prev,
        assessments: prev.assessments.map(a => (a.id === activeAsmt.id ? { ...a, subjects: newSubs } : a))
      };
    });

    setCopyPickerOpen(false);
    toast(added ? `Copied ${added} subject(s).` : "All subjects already exist.", added ? "success" : "info");
  };

  // Marks Input Change
  const handleMarkChange = (sid: string, subId: string, val: string) => {
    const trimmed = val.trim();
    const asmtId = activeAsmt.id;
    saveData(prev => {
      const results = prev.assessmentResults;
      const row = { ...((results[asmtId] || {})[sid] || {}) };

      if (trimmed === "") {
        delete row[subId];
      } else if (/^a$/i.test(trimmed)) {
        row[subId] = 'A';
      } else {
        const num = Number(trimmed);
        if (isNaN(num) || num < 0) return prev; // rejected: input re-syncs to the saved value
        row[subId] = num;
      }

      const asmtRows = { ...(results[asmtId] || {}) };
      if (Object.keys(row).length === 0) delete asmtRows[sid];
      else asmtRows[sid] = row;

      return { ...prev, assessmentResults: { ...results, [asmtId]: asmtRows } };
    });
  };

  // Toggle Absent button
  const handleToggleAbsent = (sid: string, subId: string) => {
    const curVal = ((data.assessmentResults[activeAsmt.id] || {})[sid] || {})[subId];
    handleMarkChange(sid, subId, curVal === 'A' ? '' : 'A');
  };

  // Remarks Change
  const handleRemarkChange = (sid: string, remark: string) => {
    quickSaveData(prev => {
      const nextRemarks = { ...prev.assessmentRemarks };
      if (!nextRemarks[activeAsmt.id]) nextRemarks[activeAsmt.id] = {};
      if (remark.trim() === "") delete nextRemarks[activeAsmt.id][sid];
      else nextRemarks[activeAsmt.id][sid] = remark;
      return { ...prev, assessmentRemarks: nextRemarks };
    });
  };

  // Manual Pass Toggle
  const handleToggleManualPass = (sid: string) => {
    saveData(prev => {
      const nextManual = { ...prev.assessmentManualPass };
      if (!nextManual[activeAsmt.id]) nextManual[activeAsmt.id] = {};
      const cur = !!nextManual[activeAsmt.id][sid];
      if (cur) delete nextManual[activeAsmt.id][sid];
      else nextManual[activeAsmt.id][sid] = true;

      return { ...prev, assessmentManualPass: nextManual };
    });
    toast("Pass status updated.", "success");
  };

  // Vertical keyboard navigation on Enter key
  const handleKeyDownMarks = (e: React.KeyboardEvent, studentIndex: number, subIndex: number) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const nextIndex = e.shiftKey ? studentIndex - 1 : studentIndex + 1;
      const targetInput = document.querySelector<HTMLInputElement>(`input[data-coord="${nextIndex}_${subIndex}"]`);
      if (targetInput) {
        targetInput.focus();
        targetInput.select();
      }
    }
  };

  // Subject Stats (Average, High, Low)
  const subjectStats = activeAsmt.subjects.map(sub => {
    let sum = 0;
    let cnt = 0;
    let hi = -1;
    let lo = Infinity;

    data.students.forEach(s => {
      const raw = ((data.assessmentResults[activeAsmt.id] || {})[s.id] || {})[sub.id];
      if (raw === undefined) return;
      const num = raw === 'A' ? 0 : Number(raw);
      if (isNaN(num)) return;
      sum += num;
      cnt++;
      if (num > hi) hi = num;
      if (num < lo) lo = num;
    });

    return {
      subId: sub.id,
      avg: cnt ? Math.round((sum / cnt) * 10) / 10 : 0,
      hi: hi < 0 ? 0 : hi,
      lo: lo === Infinity ? 0 : lo,
      cnt
    };
  });

  const otherAsmts = data.assessments.filter(a => a.id !== activeAsmt.id);

  // Print Handlers
  const handlePrintClassResults = () => {
    if (!activeAsmt.subjects.length) {
      toast("Add subjects first.", "error");
      return;
    }
    const headCells = activeAsmt.subjects.map(sub => `<th>${esc(sub.name)}<br><span style="font-size:6pt;font-weight:600">(${sub.max})</span></th>`).join("");
    const rows = ranked.map(item => {
      const { s, r } = item;
      const cls = (!r.passed && r.maxTotal > 0) ? "row-fail" : "";
      const markCells = activeAsmt.subjects.map(sub => {
        const raw = ((data.assessmentResults[activeAsmt.id] || {})[s.id] || {})[sub.id];
        const val = raw === undefined ? "" : (raw === 'A' ? 'A' : String(raw));
        return `<td class="num">${esc(val)}</td>`;
      }).join("");

      return `<tr class="${cls}">
        <td class="center font-mono">${esc(s.rollNo || "—")}</td>
        <td class="name">${esc(s.name || "—")}</td>
        ${markCells}
        <td class="num"><b>${r.total}</b></td>
        <td class="num">${r.maxTotal > 0 ? r.pct + "%" : "—"}</td>
        <td class="num font-bold" style="color:${r.passed ? '#166534' : '#991B1B'}">${r.passed ? 'PASS' : 'FAIL'}${r.manual && !r.computedPass ? ' ✱' : ''}</td>
        <td class="num">${r.maxTotal > 0 ? ordinal(item.rank) : "—"}</td>
      </tr>`;
    }).join("");

    const fullPrintHTML = `<div class="print-sheet">
      ${buildPrintHeaderHTML(activeAsmt.name + " — Class Result Sheet", `Pass mark: ${activeAsmt.passPercent}% • Total max: ${totalMax}`)}
      <table class="res-print">
        <thead><tr>
          <th style="width:8%">Roll</th>
          <th style="width:22%">Name</th>
          ${headCells}
          <th style="width:9%">Total</th>
          <th style="width:8%">%</th>
          <th style="width:10%">Result</th>
          <th style="width:7%">Rank</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;

    triggerPrint(fullPrintHTML, "portrait", data.printSize, data.forceOrientation);
  };

  const handlePrintReportCards = () => {
    if (!activeAsmt.subjects.length) {
      toast("Add subjects first.", "error");
      return;
    }
    const sigBlock = `<div style="display:flex;justify-content:space-between;gap:8mm;margin-top:22mm;padding:0 8mm;">
      <div style="flex:1;border-top:1px solid #000;padding-top:1.5mm;text-align:center;font-size:9.5pt;font-weight:700;">Class Incharge</div>
      <div style="flex:1;border-top:1px solid #000;padding-top:1.5mm;text-align:center;font-size:9.5pt;font-weight:700;">Parent / Guardian</div>
      <div style="flex:1;border-top:1px solid #000;padding-top:1.5mm;text-align:center;font-size:9.5pt;font-weight:700;">Principal</div>
    </div>`;

    const cards = ranked.map(item => {
      const { s, r } = item;
      const remarkVal = (data.assessmentRemarks[activeAsmt.id] || {})[s.id] || "";
      const subRows = activeAsmt.subjects.map(sub => {
        const raw = ((data.assessmentResults[activeAsmt.id] || {})[s.id] || {})[sub.id];
        const mx = Number(sub.max) || 0;
        const v = raw === undefined ? "—" : (raw === 'A' ? 'A' : String(raw));
        const num = raw === 'A' || raw === undefined ? 0 : Number(raw);
        const pct = mx > 0 ? Math.round((num / mx) * 1000) / 10 : 0;
        const failed = mx > 0 && pct < 33;

        return `<tr>
          <td style="text-align:left">${esc(sub.name)}</td>
          <td>${mx}</td>
          <td style="font-weight:700;${failed ? 'color:#991B1B' : ''}">${esc(v)}</td>
          <td>${pct}%</td>
        </tr>`;
      }).join("");

      return `<div class="print-sheet report-card">
        ${buildPrintHeaderHTML(activeAsmt.name + " — Report Card")}
        <div class="rc-info">
          <div>Adm. No: <b>${esc(s.admissionNo || "—")}</b></div>
          <div>Roll No: <b>${esc(s.rollNo || "—")}</b></div>
        </div>
        <div class="rc-info" style="border-top:0;padding-top:0">
          <div>Name: <b>${esc(s.name || "—")}</b></div>
          <div>Father: <b>${esc(s.fatherName || "—")}</b></div>
        </div>
        <table class="rc-sub-table">
          <thead><tr><th style="text-align:left">Subject</th><th>Max</th><th>Obtained</th><th>%</th></tr></thead>
          <tbody>${subRows}</tbody>
        </table>
        <table class="rc-summary-table">
          <tr>
            <td><div class="rc-lbl">Total</div><div class="rc-val">${r.total} / ${totalMax}</div></td>
            <td><div class="rc-lbl">Percentage</div><div class="rc-val">${r.maxTotal > 0 ? r.pct + "%" : "—"}</div></td>
            <td><div class="rc-lbl">Rank</div><div class="rc-val">${r.maxTotal > 0 ? ordinal(item.rank) : "—"}</div></td>
            <td><div class="rc-lbl">Result</div><div class="rc-val" style="color:${r.passed ? '#166534' : '#991B1B'}">${r.passed ? 'PASS' : 'FAIL'}${r.manual && !r.computedPass ? ' ✱' : ''}</div></td>
          </tr>
        </table>
        <div class="rc-remarks">
          <b>Remarks</b>
          ${esc(remarkVal || "")}
        </div>
        ${sigBlock}
      </div>`;
    }).join("");

    triggerPrint(cards, "portrait", data.printSize, data.forceOrientation);
  };

  const handlePrintMeritList = () => {
    if (!activeAsmt.subjects.length) {
      toast("Add subjects first.", "error");
      return;
    }
    const rows = ranked.map(item => {
      const { s, r } = item;
      const cls = (!r.passed && r.maxTotal > 0) ? "row-fail" : "";

      return `<tr class="${cls}">
        <td class="center font-bold">${r.maxTotal > 0 ? ordinal(item.rank) : "—"}</td>
        <td class="center font-mono">${esc(s.rollNo || "—")}</td>
        <td class="name">${esc(s.name || "—")}</td>
        <td class="center">${esc(s.fatherName || "—")}</td>
        <td class="center font-bold">${r.total}</td>
        <td class="center">${r.maxTotal > 0 ? r.pct + "%" : "—"}</td>
        <td class="center font-bold" style="color:${r.passed ? '#166534' : '#991B1B'}">${r.passed ? 'PASS' : 'FAIL'}${r.manual && !r.computedPass ? ' ✱' : ''}</td>
      </tr>`;
    }).join("");

    const fullPrintHTML = `<div class="print-sheet">
      ${buildPrintHeaderHTML(activeAsmt.name + " — Merit List", "Ranked by total marks")}
      <table class="merit-table">
        <thead><tr>
          <th style="width:10%">Rank</th>
          <th style="width:10%">Roll</th>
          <th style="width:30%">Name</th>
          <th style="width:22%">Father Name</th>
          <th style="width:12%">Total</th>
          <th style="width:8%">%</th>
          <th style="width:8%">Result</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;

    triggerPrint(fullPrintHTML, "portrait", data.printSize, data.forceOrientation);
  };

  return (
    <div className="space-y-3">
      {/* Assessment Header Card */}
      <div className="bg-white dark:bg-[#1C1917] border border-[#E7E5E4] dark:border-[#44403C] rounded-2xl p-4 shadow-xs space-y-2">
        <div className="flex justify-between items-center gap-2 pb-1 border-b border-[#E7E5E4] dark:border-[#44403C]">
          <button
            type="button"
            onClick={() => setActiveAssessmentId(null)}
            className="text-xs font-bold text-red-800 dark:text-red-400 hover:underline cursor-pointer flex items-center gap-1"
          >
            ← All Assessments
          </button>
        </div>

        <ActionGrid cols={2}>
          <ActionButton
            variant="secondary"
            icon={Edit3}
            onClick={handleRename}
          >
            Rename
          </ActionButton>
          <ActionButton
            variant="danger"
            icon={Trash2}
            onClick={handleDelete}
          >
            Delete
          </ActionButton>
        </ActionGrid>

        <h2 className="text-xl font-bold text-[#1C1917] dark:text-[#F5F5F4] mt-1">
          {activeAsmt.name}
        </h2>

        <div className="flex items-center gap-3 text-xs flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="text-[#78716C] dark:text-[#A8A29E] font-semibold">Pass mark:</span>
            <SyncInput
              type="number"
              min="1"
              max="100"
              value={activeAsmt.passPercent}
              onCommit={handleUpdatePassPercent}
              className="w-16 p-1 text-center font-bold text-xs rounded-lg border border-[#D6D3D1] dark:border-[#44403C] bg-white dark:bg-[#0C0A09] text-inherit"
            />
            <span className="text-[#78716C] dark:text-[#A8A29E] font-semibold">%</span>
          </div>

          <span className="text-[#78716C] dark:text-[#A8A29E]">
            Entered: <b>{entered}</b> of <b>{data.students.length}</b> • Total max: <b>{totalMax}</b>
          </span>
        </div>

        <div className="w-full h-2 bg-[#F5F5F4] dark:bg-[#292524] rounded-full overflow-hidden mt-1">
          <div
            className="h-full bg-[#065F46] transition-all"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Subjects Card */}
      <div className="bg-white dark:bg-[#1C1917] border border-[#E7E5E4] dark:border-[#44403C] rounded-2xl p-4 shadow-xs space-y-3">
        <h3 className="text-sm font-bold text-[#1C1917] dark:text-[#F5F5F4]">
          Subjects ({activeAsmt.subjects.length})
        </h3>

        {activeAsmt.subjects.length === 0 ? (
          <p className="text-xs text-[#78716C] dark:text-[#A8A29E]">
            No subjects configured yet. Add subjects below to start recording marks.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {activeAsmt.subjects.map(sub => (
              <div
                key={sub.id}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-[#E7E5E4] dark:border-[#44403C] bg-[#FAFAF9] dark:bg-[#0C0A09] text-xs font-bold"
              >
                <SyncInput
                  type="text"
                  value={sub.name}
                  onCommit={v => handleRenameSubject(sub.id, v)}
                  className="bg-transparent border-0 font-bold focus:outline-none w-20 sm:w-24 text-inherit"
                />
                <span className="text-[#78716C] dark:text-[#A8A29E] text-[10px]">max</span>
                <SyncInput
                  type="number"
                  min="1"
                  value={sub.max}
                  onCommit={v => handleChangeSubjectMax(sub.id, v)}
                  className="w-12 text-center bg-white dark:bg-[#1C1917] border border-[#D6D3D1] dark:border-[#44403C] rounded-md px-1 text-inherit"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveSubject(sub.id, sub.name)}
                  className="w-4 h-4 rounded-full bg-[#F8E4E1] text-[#7F1D1D] flex items-center justify-center text-[10px] ml-1 hover:bg-[#FCA5A5] cursor-pointer"
                  title="Remove subject"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        <form onSubmit={handleAddSubject} className="space-y-2.5 pt-2 border-t border-[#E7E5E4] dark:border-[#44403C]">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input
              type="text"
              value={newSubName}
              placeholder="Subject name"
              onChange={e => setNewSubName(e.target.value)}
              className="w-full p-2.5 text-xs rounded-xl border border-[#D6D3D1] dark:border-[#44403C] bg-white dark:bg-[#0C0A09] text-inherit"
            />
            <input
              type="number"
              min="1"
              value={newSubMax}
              placeholder="Max marks"
              onChange={e => setNewSubMax(e.target.value)}
              className="w-full p-2.5 text-xs rounded-xl border border-[#D6D3D1] dark:border-[#44403C] bg-white dark:bg-[#0C0A09] text-inherit"
            />
          </div>
          <ActionGrid cols={2}>
            <ActionButton
              type="submit"
              variant="primary"
              icon={Plus}
              fullWidth={otherAsmts.length === 0}
            >
              Add Subject
            </ActionButton>
            {otherAsmts.length > 0 && (
              <ActionButton
                type="button"
                variant="secondary"
                icon={Copy}
                onClick={() => setCopyPickerOpen(!copyPickerOpen)}
              >
                Copy Subjects
              </ActionButton>
            )}
          </ActionGrid>
        </form>

        {copyPickerOpen && (
          <div className="p-3.5 rounded-xl bg-[#FAFAF9] dark:bg-[#0C0A09] border border-[#E7E5E4] dark:border-[#44403C] space-y-2">
            <span className="text-xs font-bold block text-[#78716C] dark:text-[#A8A29E]">
              Copy subjects from other assessment:
            </span>
            <div className="flex gap-2 flex-wrap">
              {otherAsmts.map(o => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => handleCopySubjects(o.id)}
                  className="px-3 py-1.5 text-xs font-bold rounded-xl bg-white dark:bg-[#1C1917] border border-[#D6D3D1] dark:border-[#44403C] hover:border-[#B91C1C] cursor-pointer"
                >
                  {o.name} ({o.subjects.length})
                </button>
              ))}
              <button
                type="button"
                onClick={() => setCopyPickerOpen(false)}
                className="px-3 py-1.5 text-xs font-bold rounded-xl bg-transparent text-[#78716C] hover:underline cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Marks Sheet Table */}
      <div className="bg-white dark:bg-[#1C1917] border border-[#E7E5E4] dark:border-[#44403C] rounded-2xl p-4 shadow-xs">
        {activeAsmt.subjects.length === 0 ? (
          <div className="text-center py-8 text-[#78716C] dark:text-[#A8A29E]">
            Add at least one subject above to record student marks.
          </div>
        ) : (
          <div className="res-wrap overflow-x-auto border border-[#E7E5E4] dark:border-[#44403C] rounded-xl max-h-[75vh]">
            <table className="res-table w-full text-xs text-center border-separate border-spacing-0">
              <thead className="sticky top-0 z-20 bg-[#FAFAF9] dark:bg-[#292524] text-[#1C1917] dark:text-[#F5F5F4]">
                <tr>
                  <th className="sc1 p-2 border border-[#E7E5E4] dark:border-[#44403C] bg-[#FAFAF9] dark:bg-[#292524]">
                    Roll
                  </th>
                  <th className="sc2 p-2 border border-[#E7E5E4] dark:border-[#44403C] bg-[#FAFAF9] dark:bg-[#292524] text-left">
                    Name
                  </th>
                  {activeAsmt.subjects.map(sub => (
                    <th key={sub.id} className="p-2 border border-[#E7E5E4] dark:border-[#44403C] min-w-[70px]">
                      {sub.name}
                      <span className="block text-[10px] text-[#A8A29E]">({sub.max})</span>
                    </th>
                  ))}
                  <th className="p-2 border border-[#E7E5E4] dark:border-[#44403C] bg-[#FAFAF9] dark:bg-[#292524] font-bold min-w-[70px]">
                    Total
                  </th>
                  <th className="p-2 border border-[#E7E5E4] dark:border-[#44403C] min-w-[50px] font-bold">
                    %
                  </th>
                  <th className="p-2 border border-[#E7E5E4] dark:border-[#44403C] min-w-[100px] font-bold">
                    Result
                  </th>
                  <th className="p-2 border border-[#E7E5E4] dark:border-[#44403C] min-w-[50px] font-bold">
                    Rank
                  </th>
                  <th className="p-2 border border-[#E7E5E4] dark:border-[#44403C] min-w-[140px] text-left">
                    Remarks
                  </th>
                </tr>
              </thead>
              <tbody>
                {ranked.map((item, sIdx) => {
                  const { s, r } = item;
                  const asmtRes = (data.assessmentResults[activeAsmt.id] || {})[s.id] || {};
                  const remarksVal = (data.assessmentRemarks[activeAsmt.id] || {})[s.id] || "";
                  const rowFail = !r.passed && r.maxTotal > 0;
                  const isEven = sIdx % 2 === 1;
                  const stickyBg = rowFail
                    ? 'bg-[#FDF6F5] dark:bg-[#2B1414]'
                    : isEven
                    ? 'bg-[#FAFAF9] dark:bg-[#0C0A09]'
                    : 'bg-white dark:bg-[#1C1917]';

                  return (
                    <tr
                      key={s.id}
                      className={
                        rowFail
                          ? 'bg-[#FDF6F5] dark:bg-[#2B1414]'
                          : isEven
                          ? 'bg-[#FAFAF9] dark:bg-[#0C0A09]'
                          : 'bg-white dark:bg-[#1C1917]'
                      }
                    >
                      <td className={`sc1 p-2 border border-[#E7E5E4] dark:border-[#44403C] font-mono font-bold ${stickyBg}`}>
                        {s.rollNo || "—"}
                      </td>
                      <td className={`sc2 p-2 border border-[#E7E5E4] dark:border-[#44403C] text-left font-semibold truncate ${stickyBg}`}>
                        {s.name || "(no name)"}
                      </td>

                      {activeAsmt.subjects.map((sub, subIdx) => {
                        const raw = asmtRes[sub.id];
                        const displayVal = raw === undefined ? "" : (raw === 'A' ? 'A' : String(raw));
                        const isAbsent = raw === 'A';
                        const below33 = (r.subMarks.find(x => x.subId === sub.id) || {}).below33;
                        const isOverMax = typeof raw === 'number' && Number(sub.max) > 0 && raw > Number(sub.max);

                        return (
                          <td
                            key={sub.id}
                            className={`p-1 border border-[#E7E5E4] dark:border-[#44403C] ${
                              below33 ? 'border-l-2 border-l-[#B4791F]' : ''
                            }`}
                          >
                            <div className="flex items-center justify-center gap-1">
                              <SyncInput
                                type="text"
                                data-coord={`${sIdx}_${subIdx}`}
                                value={displayVal}
                                onCommit={v => handleMarkChange(s.id, sub.id, v)}
                                onKeyDown={e => handleKeyDownMarks(e, sIdx, subIdx)}
                                className={`w-10 p-1 text-center font-bold font-mono text-xs rounded border border-transparent focus:border-[#2E5A8A] focus:bg-white dark:focus:bg-[#0C0A09] bg-transparent text-inherit ${
                                  isAbsent ? 'text-[#7F1D1D] font-extrabold' : ''
                                } ${isOverMax ? 'ring-2 ring-[#B4791F]' : ''}`}
                                placeholder="—"
                              />
                              <button
                                type="button"
                                tabIndex={-1}
                                onClick={() => handleToggleAbsent(s.id, sub.id)}
                                title="Toggle Absent"
                                className={`w-5 h-5 rounded text-[10px] font-bold flex items-center justify-center transition-colors cursor-pointer ${
                                  isAbsent
                                    ? 'bg-[#F8E4E1] text-[#7F1D1D] border border-[#B23A32]'
                                    : 'bg-[#FAFAF9] dark:bg-[#292524] text-[#A8A29E] border border-[#E7E5E4] dark:border-[#44403C] hover:bg-[#F5F5F4]'
                                }`}
                              >
                                A
                              </button>
                            </div>
                          </td>
                        );
                      })}

                      <td className="p-2 border border-[#E7E5E4] dark:border-[#44403C] font-bold bg-[#FAFAF9] dark:bg-[#292524]">
                        {r.total} / {totalMax}
                      </td>

                      <td
                        className={`p-2 border border-[#E7E5E4] dark:border-[#44403C] font-bold ${
                          r.maxTotal > 0
                            ? r.pct >= 80
                              ? 'bg-[#D1FAE5] dark:bg-[#064E3B] text-[#065F46] dark:text-[#A7F3D0]'
                              : r.pct >= activeAsmt.passPercent
                              ? 'bg-[#FBF0D9] dark:bg-[#3A2E14] text-[#7A5515] dark:text-[#F8E0A0]'
                              : 'bg-[#F8E4E1] dark:bg-[#4A1A18] text-[#7F1D1D] dark:text-[#F0C8C0]'
                            : ''
                        }`}
                      >
                        {r.maxTotal > 0 ? `${r.pct}%` : "—"}
                      </td>

                      <td className="p-2 border border-[#E7E5E4] dark:border-[#44403C] font-bold">
                        {r.maxTotal === 0 ? (
                          <span className="text-[#A8A29E]">—</span>
                        ) : r.passed ? (
                          <div className="flex items-center justify-center gap-1">
                            <span className="text-[#065F46] dark:text-[#A7F3D0]">PASS</span>
                            {r.manual && !r.computedPass && <span title="Manually passed" className="text-amber-600">✱</span>}
                            {r.manual && (
                              <button
                                type="button"
                                onClick={() => handleToggleManualPass(s.id)}
                                className="px-1.5 py-0.5 rounded text-[10px] bg-[#F5F5F4] dark:bg-[#292524] text-[#78716C] dark:text-[#D6D3D1] hover:bg-[#E7E5E4] cursor-pointer"
                              >
                                Undo
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-1">
                            <span className="text-[#7F1D1D] dark:text-[#F0C8C0]">FAIL</span>
                            <button
                              type="button"
                              onClick={() => handleToggleManualPass(s.id)}
                              className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#FBF0D9] dark:bg-[#3A2E14] text-[#7A5515] dark:text-[#F8E0A0] border border-[#B4791F] hover:bg-[#F5E4C0] cursor-pointer"
                            >
                              Pass anyway
                            </button>
                          </div>
                        )}
                      </td>

                      <td className="p-2 border border-[#E7E5E4] dark:border-[#44403C] font-bold bg-[#FAFAF9] dark:bg-[#292524]">
                        {r.maxTotal > 0 ? ordinal(item.rank) : "—"}
                      </td>

                      <td className="p-1 border border-[#E7E5E4] dark:border-[#44403C]">
                        <SyncInput
                          type="text"
                          value={remarksVal}
                          placeholder="—"
                          onLive={v => handleRemarkChange(s.id, v)}
                          onCommit={() => flushSave()}
                          className="w-full p-1 text-xs bg-transparent border-0 focus:outline-none focus:bg-white dark:focus:bg-[#0C0A09] rounded"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="sticky bottom-0 z-20 bg-white dark:bg-[#1C1917] text-[#1C1917] dark:text-[#F5F5F4] font-bold shadow-[0_-3px_10px_rgba(0,0,0,0.12)]">
                <tr className="bg-white dark:bg-[#1C1917]">
                  <td className="sc1 p-2 bg-white dark:bg-[#1C1917]"></td>
                  <td className="sc2 p-2 text-right pr-2 bg-white dark:bg-[#1C1917]">
                    Average →
                  </td>
                  {subjectStats.map(st => (
                    <td key={st.subId} className="p-2 bg-white dark:bg-[#1C1917]">
                      {st.avg}
                    </td>
                  ))}
                  <td colSpan={4} className="p-2 bg-white dark:bg-[#1C1917]"></td>
                </tr>
                <tr className="bg-white dark:bg-[#1C1917]">
                  <td className="sc1 p-2 bg-white dark:bg-[#1C1917]"></td>
                  <td className="sc2 p-2 text-right pr-2 bg-white dark:bg-[#1C1917]">
                    Highest →
                  </td>
                  {subjectStats.map(st => (
                    <td key={st.subId} className="p-2 bg-white dark:bg-[#1C1917]">
                      {st.cnt ? st.hi : "—"}
                    </td>
                  ))}
                  <td colSpan={4} className="p-2 bg-white dark:bg-[#1C1917]"></td>
                </tr>
                <tr className="bg-white dark:bg-[#1C1917]">
                  <td className="sc1 p-2 bg-white dark:bg-[#1C1917]"></td>
                  <td className="sc2 p-2 text-right pr-2 bg-white dark:bg-[#1C1917]">
                    Lowest →
                  </td>
                  {subjectStats.map(st => (
                    <td key={st.subId} className="p-2 bg-white dark:bg-[#1C1917]">
                      {st.cnt ? st.lo : "—"}
                    </td>
                  ))}
                  <td colSpan={4} className="p-2 bg-white dark:bg-[#1C1917]"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Print Actions Section */}
      <div className="bg-white dark:bg-[#1C1917] border border-[#E7E5E4] dark:border-[#44403C] rounded-2xl p-4 shadow-xs space-y-3">
        <h3 className="text-sm font-bold text-[#1C1917] dark:text-[#F5F5F4]">
          Print Options
        </h3>
        <ActionGrid cols={3}>
          <ActionButton
            variant="primary"
            icon={Printer}
            onClick={handlePrintClassResults}
            fullWidth="mobile-only"
          >
            Class Result Sheet
          </ActionButton>
          <ActionButton
            variant="secondary"
            icon={Printer}
            onClick={handlePrintReportCards}
          >
            Report Cards
          </ActionButton>
          <ActionButton
            variant="secondary"
            icon={Printer}
            onClick={handlePrintMeritList}
          >
            Merit List
          </ActionButton>
        </ActionGrid>
      </div>
    </div>
  );
};
