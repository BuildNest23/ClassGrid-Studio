import React, { useState } from 'react';
import { useClassroom } from '../../context/ClassroomContext';
import { getSortedStudents, esc } from '../../utils/helpers';
import { triggerPrint } from '../../utils/printEngine';
import { downloadStudentListPNG } from '../../utils/canvasExport';
import { ActionGrid, ActionButton } from '../ActionGrid';
import { HowItWorks } from '../HowItWorks';
import { Printer, Download, ArrowLeft } from 'lucide-react';

export const StudentDirectoryView: React.FC = () => {
  const { data, setActiveTab, toast, buildPrintHeaderHTML } = useClassroom();
  const [downloading, setDownloading] = useState(false);
  const sortedStudents = getSortedStudents(data.students);

  const handlePrint = () => {
    const rows = sortedStudents.map((s, i) => `
      <tr>
        <td class="center font-bold">${i + 1}</td>
        <td class="center font-mono">${esc(s.admissionNo || "—")}</td>
        <td class="center font-mono font-bold">${esc(s.rollNo || "—")}</td>
        <td>${esc(s.name || "—")}</td>
        <td>${esc(s.fatherName || "—")}</td>
        <td class="center">${esc(s.phone || "—")}</td>
        <td>${esc(s.address || "—")}</td>
        <td>${esc(s.notes || "—")}</td>
      </tr>`).join("");

    const fullPrintHTML = `<div class="print-sheet">
      ${buildPrintHeaderHTML("Student List")}
      <table>
        <thead>
          <tr>
            <th style="width:5%">#</th>
            <th style="width:11%">Adm. No</th>
            <th style="width:8%">Roll</th>
            <th style="width:20%">Name</th>
            <th style="width:20%">Father Name</th>
            <th style="width:12%">Phone</th>
            <th style="width:14%">Address</th>
            <th style="width:10%">Notes</th>
          </tr>
        </thead>
        <tbody>${rows || '<tr><td colspan="8" class="center">No students</td></tr>'}</tbody>
      </table>
    </div>`;

    triggerPrint(fullPrintHTML, "portrait", data.printSize, data.forceOrientation);
  };

  const handleDownloadPNG = async () => {
    if (!sortedStudents.length) {
      toast("No students to save.", "info");
      return;
    }
    setDownloading(true);
    try {
      const ok = await downloadStudentListPNG(data);
      if (ok) toast("Student list image downloaded.", "success");
      else toast("Failed to create image.", "error");
    } finally {
      setDownloading(false);
    }
  };

  const classSub = data.className ? `Class: ${data.className}` : "";
  const inchargeSub = data.inchargeName ? `Incharge: ${data.inchargeName}` : "";
  const line1 = [classSub, inchargeSub].filter(Boolean).join(" • ");

  return (
    <div className="space-y-3">
      <HowItWorks
        id="directory"
        title="About this list"
        steps={[
          <>This page only <b>shows</b> your class list. To add, edit or remove students, go to the <b>Students</b> tab.</>,
          <>Tap <b>Print View</b> for a paper copy, or <b>Save as Image</b> to share it, for example on WhatsApp.</>
        ]}
      />

      <div className="bg-white dark:bg-[#1C1917] border border-[#E7E5E4] dark:border-[#44403C] rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex justify-between items-center gap-2 flex-wrap">
          <div>
            <h2 className="text-base font-bold text-[#1C1917] dark:text-[#F5F5F4]">
              View Students
            </h2>
            <div className="text-xs text-[#78716C] dark:text-[#A8A29E]">
              Total: <b>{sortedStudents.length}</b> student{sortedStudents.length === 1 ? "" : "s"}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setActiveTab('dashboard')}
            className="text-xs font-bold text-red-800 dark:text-red-400 hover:underline cursor-pointer flex items-center gap-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Dashboard</span>
          </button>
        </div>

        <ActionGrid cols={2}>
          <ActionButton
            variant="primary"
            icon={Printer}
            onClick={handlePrint}
          >
            Print View
          </ActionButton>
          <ActionButton
            variant="secondary"
            icon={Download}
            onClick={handleDownloadPNG}
            disabled={downloading}
          >
            {downloading ? "Generating..." : "Save as Image"}
          </ActionButton>
        </ActionGrid>
      </div>

      {/* Styled Directory Sheet */}
      <div className="bg-white dark:bg-[#1C1917] border border-[#E7E5E4] dark:border-[#44403C] rounded-2xl p-4 md:p-6 shadow-xs">
        {/* Sheet Letterhead Header */}
        <div className="flex items-center gap-4 pb-3 border-b-2 border-[#1C1917] dark:border-[#F5F5F4] mb-4">
          {data.schoolLogo && (
            <div className="w-16 h-16 flex items-center justify-center shrink-0">
              <img src={data.schoolLogo} alt="Logo" className="max-h-16 max-w-16 object-contain" />
            </div>
          )}

          <div className="flex-1 text-center min-w-0">
            <h2 className="text-xl font-bold text-[#1C1917] dark:text-[#F5F5F4] m-0">
              {data.schoolName}
            </h2>
            {line1 && <div className="text-xs font-bold text-[#78716C] dark:text-[#A8A29E] mt-1">{line1}</div>}
            {data.academicYear && (
              <div className="text-xs text-[#A8A29E] mt-0.5">{data.academicYear}</div>
            )}
            <div className="text-sm font-extrabold uppercase tracking-wider text-[#B91C1C] dark:text-[#FCA5A5] mt-2">
              Student List
            </div>
          </div>

          {data.schoolLogo && <div className="w-16 h-16 shrink-0 invisible" />}
        </div>

        {/* Directory Table */}
        {sortedStudents.length === 0 ? (
          <div className="text-center py-8 text-[#78716C] dark:text-[#A8A29E]">
            No students enrolled yet. Add students in the Students tab.
          </div>
        ) : (
          <div className="overflow-x-auto border border-[#E7E5E4] dark:border-[#44403C] rounded-xl">
            <table className="w-full text-xs text-center border-collapse">
              <thead>
                <tr className="bg-[#FAFAF9] dark:bg-[#292524] text-[#1C1917] dark:text-[#F5F5F4]">
                  <th className="p-2.5 border border-[#E7E5E4] dark:border-[#44403C] w-10">#</th>
                  <th className="p-2.5 border border-[#E7E5E4] dark:border-[#44403C] w-20">Adm. No</th>
                  <th className="p-2.5 border border-[#E7E5E4] dark:border-[#44403C] w-14">Roll</th>
                  <th className="p-2.5 border border-[#E7E5E4] dark:border-[#44403C] text-left">Name</th>
                  <th className="p-2.5 border border-[#E7E5E4] dark:border-[#44403C] text-left">Father Name</th>
                  <th className="p-2.5 border border-[#E7E5E4] dark:border-[#44403C] w-24">Phone</th>
                  <th className="p-2.5 border border-[#E7E5E4] dark:border-[#44403C] text-left">Address</th>
                  <th className="p-2.5 border border-[#E7E5E4] dark:border-[#44403C] text-left">Notes</th>
                </tr>
              </thead>
              <tbody>
                {sortedStudents.map((s, idx) => (
                  <tr key={s.id} className="even:bg-[#FAFAF9] dark:even:bg-[#0C0A09]">
                    <td className="p-2.5 border border-[#E7E5E4] dark:border-[#44403C] font-bold">{idx + 1}</td>
                    <td className="p-2.5 border border-[#E7E5E4] dark:border-[#44403C] font-mono">{s.admissionNo || "—"}</td>
                    <td className="p-2.5 border border-[#E7E5E4] dark:border-[#44403C] font-mono font-bold">{s.rollNo || "—"}</td>
                    <td className="p-2.5 border border-[#E7E5E4] dark:border-[#44403C] text-left font-semibold">{s.name || "—"}</td>
                    <td className="p-2.5 border border-[#E7E5E4] dark:border-[#44403C] text-left text-[#78716C] dark:text-[#A8A29E]">{s.fatherName || "—"}</td>
                    <td className="p-2.5 border border-[#E7E5E4] dark:border-[#44403C] font-mono">{s.phone || "—"}</td>
                    <td className="p-2.5 border border-[#E7E5E4] dark:border-[#44403C] text-left text-[#78716C] dark:text-[#A8A29E]">{s.address || "—"}</td>
                    <td className="p-2.5 border border-[#E7E5E4] dark:border-[#44403C] text-left text-[#78716C] dark:text-[#A8A29E]">{s.notes || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
