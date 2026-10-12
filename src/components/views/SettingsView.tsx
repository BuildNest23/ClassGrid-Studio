import React, { useState, useEffect } from 'react';
import { useClassroom } from '../../context/ClassroomContext';
import { PrintSizeKey } from '../../types';
import { PRINT_SIZES } from '../../utils/helpers';
import { ActionGrid, ActionButton } from '../ActionGrid';
import { HowItWorks } from '../HowItWorks';
import {
  Printer,
  Image,
  Database,
  Moon,
  HelpCircle,
  AlertTriangle,
  ArrowLeft,
  X,
  Upload,
  Download,
  RotateCcw,
  Sparkles
} from 'lucide-react';
import { generateSampleClassData } from '../../utils/sampleData';

const LAST_BACKUP_KEY = 'classgrid_last_backup';
const STORAGE_LIMIT_CHARS = 5 * 1024 * 1024; // browsers allow roughly 5 MB of local storage

/** Approximate local-storage use (characters stored by this app) */
function readStorageChars(): number {
  let total = 0;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k) continue;
      total += k.length + (localStorage.getItem(k) || '').length;
    }
  } catch { /* ignore */ }
  return total;
}

function readLastBackup(): number | null {
  try {
    const v = Number(localStorage.getItem(LAST_BACKUP_KEY));
    return v > 0 ? v : null;
  } catch { return null; }
}

export const SettingsView: React.FC = () => {
  const {
    data,
    saveData,
    replaceAllData,
    resetEverything,
    toast,
    uiConfirm,
    setActiveTab,
    toggleDarkMode,
    openHelp
  } = useClassroom();

  const [className, setClassName] = useState(data.className);
  const [inchargeName, setInchargeName] = useState(data.inchargeName);
  const [schoolName, setSchoolName] = useState(data.schoolName);
  const [academicYear, setAcademicYear] = useState(data.academicYear);
  const [lastBackup, setLastBackup] = useState<number | null>(readLastBackup);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const usedChars = React.useMemo(() => readStorageChars(), [data]);
  const usedPct = Math.min(100, Math.round((usedChars / STORAGE_LIMIT_CHARS) * 100));
  const usedLabel = usedChars < 1024 * 1024
    ? `${Math.max(1, Math.round(usedChars / 1024))} KB`
    : `${(usedChars / (1024 * 1024)).toFixed(1)} MB`;
  const logoKB = Math.round((data.schoolLogo || '').length / 1024);
  const daysSinceBackup = lastBackup ? Math.floor((Date.now() - lastBackup) / 86400000) : null;
  const backupOld = daysSinceBackup === null || daysSinceBackup > 30;
  const barColor = usedPct >= 80 ? 'bg-red-600' : usedPct >= 50 ? 'bg-amber-500' : 'bg-emerald-600';
  const [emisCode, setEmisCode] = useState(data.emisCode || '');
  const [section, setSection] = useState(data.section || '');
  const [printNote, setPrintNote] = useState(data.printNote);

  // Keep the form in sync when data changes from outside (Undo / Redo / Import)
  useEffect(() => {
    setClassName(data.className);
    setInchargeName(data.inchargeName);
    setSchoolName(data.schoolName);
    setAcademicYear(data.academicYear);
    setEmisCode(data.emisCode || '');
    setSection(data.section || '');
    setPrintNote(data.printNote);
  }, [data.className, data.inchargeName, data.schoolName, data.academicYear, data.printNote, data.emisCode, data.section]);

  const handleSaveInfo = (e: React.FormEvent) => {
    e.preventDefault();
    saveData(prev => ({
      ...prev,
      className: className.trim(),
      inchargeName: inchargeName.trim(),
      schoolName: schoolName.trim() || "Your School Name",
      academicYear: academicYear.trim(),
      emisCode: emisCode.trim(),
      section: section.trim(),
      printNote: printNote.trim()
    }));
    toast("Classroom setup saved.", "success");
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 500 * 1024) {
      const ok = await uiConfirm(
        `This image is ${Math.round(file.size / 1024)} KB. Large images may exceed local storage quotas.\n\nContinue anyway?`,
        { title: "Large Logo", yesText: "Continue", icon: "warning" }
      );
      if (!ok) {
        e.target.value = "";
        return;
      }
    }

    const reader = new FileReader();
    reader.onload = ev => {
      const result = ev.target?.result as string;
      if (result) {
        saveData(prev => ({ ...prev, schoolLogo: result }));
        toast("School logo uploaded.", "success");
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleRemoveLogo = async () => {
    const ok = await uiConfirm("Remove school logo?", {
      title: "Remove Logo",
      yesText: "Remove",
      danger: true,
      icon: "warning"
    });
    if (!ok) return;

    saveData(prev => ({ ...prev, schoolLogo: "" }));
    toast("Logo removed.", "success");
  };

  const handlePrintSizeChange = (val: PrintSizeKey) => {
    saveData(prev => ({ ...prev, printSize: val }));
    toast(`Print size set to ${PRINT_SIZES[val].label}`, "info");
  };

  const handleForceOrientationChange = (val: '' | 'portrait' | 'landscape') => {
    saveData(prev => ({ ...prev, forceOrientation: val }));
    toast(val ? `Orientation forced to ${val}` : "Orientation set to Auto", "info");
  };

  const handleResetPrintSettings = () => {
    saveData(prev => ({ ...prev, printSize: "m", forceOrientation: "" }));
    toast("Print settings reset to default.", "success");
  };

  // Export JSON Backup
  const handleExportBackup = () => {
    const payload = {
      app: "ClassroomManager",
      version: 6,
      exportedAt: new Date().toISOString(),
      data: data
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const stamp = new Date().toISOString().slice(0, 10);
    a.download = `classroom-backup-${stamp}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    try { localStorage.setItem(LAST_BACKUP_KEY, String(Date.now())); } catch { /* ignore */ }
    setLastBackup(Date.now());
    toast("Backup file downloaded.", "success");
  };

  // Import JSON Backup
  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async ev => {
      try {
        const text = ev.target?.result as string;
        const parsed = JSON.parse(text);

        let importedData = null;
        if (parsed.app === "ClassroomManager" && parsed.data) {
          importedData = parsed.data;
        } else if (parsed.students && Array.isArray(parsed.students)) {
          importedData = parsed;
        } else {
          throw new Error("Invalid backup format");
        }

        const ok = await uiConfirm("Replace current data with imported backup?\n\nThis will overwrite current records.", {
          title: "Import Backup",
          yesText: "Import",
          danger: true,
          icon: "warning"
        });
        if (!ok) return;

        replaceAllData(importedData);

        toast("Backup imported successfully.", "success");
        setActiveTab("dashboard");
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Error reading file";
        toast("Could not import: " + msg, "error");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  // Load 50 Sample Students Demo Data
  const handleLoadSampleData = async () => {
    const ok = await uiConfirm(
      "Load 50 Sample Students & Complete Demo Data?\n\nThis will replace current records with a complete sample dataset to test attendance, daily quick tests, Punjab SED register printing, results, and fund tracking.",
      {
        title: "Load 50 Sample Students",
        yesText: "Load Demo Data",
        danger: false,
        icon: "warning"
      }
    );
    if (!ok) return;

    const sample = generateSampleClassData();
    replaceAllData(sample);
    toast("Loaded 50 sample students and complete demo records!", "success");
    setActiveTab("dailytest");
  };

  // Reset Everything
  const handleResetEverything = async () => {
    const ok1 = await uiConfirm("This will erase ALL data (students, attendance, assessments, funds) and reset the app. Continue?", {
      title: "Reset Everything?",
      yesText: "Continue",
      danger: true,
      icon: "warning"
    });
    if (!ok1) return;

    const ok2 = await uiConfirm("Are you absolutely sure?\n\nThis cannot be undone. Make sure you have exported a backup.", {
      title: "Last Chance",
      yesText: "Yes, Reset",
      danger: true,
      icon: "warning"
    });
    if (!ok2) return;

    resetEverything();

    toast("All data has been reset.", "success");
    setActiveTab("dashboard");
  };

  return (
    <div className="space-y-3">
      <HowItWorks
        id="settings"
        title="How settings work"
        steps={[
          <>Fill in <b>Class Name</b> and your <b>School Name</b> first. They appear at the top of every printout. EMIS Code and Section are optional.</>,
          <>Tap <b>Save Setup</b> after changing these details. They are not saved until you do.</>,
          <>If a printout runs onto a second page, choose a smaller <b>Print Size</b>. You can also add your <b>School Logo</b>.</>,
          <>Tap <b>Export Backup</b> regularly and keep the file safe, for example on WhatsApp or Google Drive. <b>Import Backup</b> restores it on any phone or computer.</>
        ]}
        note="Careful: Load Demo Data and Reset Everything both replace your real records. Export a backup first."
      />

      {/* Classroom Setup Form */}
      <div className="bg-white dark:bg-[#232019] border border-[#E5DFD0] dark:border-[#3A3527] rounded-xl p-4 shadow-xs">
        <h2 className="text-base font-bold font-serif-academic text-[#232019] dark:text-[#EFE9DD] mb-3">
          Classroom Setup
        </h2>

        <form onSubmit={handleSaveInfo} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#6E6656] dark:text-[#A79B85] uppercase mb-1">
                Class Name *
              </label>
              <input
                type="text"
                value={className}
                placeholder="e.g. 6th Jinnah"
                onChange={e => setClassName(e.target.value)}
                className="w-full p-2.5 text-xs rounded-lg border border-[#DAD3C3] dark:border-[#3A3527] bg-[#F8F5EE] dark:bg-[#1F1C17] text-inherit"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#6E6656] dark:text-[#A79B85] uppercase mb-1">
                Incharge / Teacher Name
              </label>
              <input
                type="text"
                value={inchargeName}
                placeholder="e.g. Mr. Waqas"
                onChange={e => setInchargeName(e.target.value)}
                className="w-full p-2.5 text-xs rounded-lg border border-[#DAD3C3] dark:border-[#3A3527] bg-[#F8F5EE] dark:bg-[#1F1C17] text-inherit"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#6E6656] dark:text-[#A79B85] uppercase mb-1">
                School Name
              </label>
              <input
                type="text"
                value={schoolName}
                placeholder="School Name"
                onChange={e => setSchoolName(e.target.value)}
                className="w-full p-2.5 text-xs rounded-lg border border-[#DAD3C3] dark:border-[#3A3527] bg-[#F8F5EE] dark:bg-[#1F1C17] text-inherit"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#6E6656] dark:text-[#A79B85] uppercase mb-1">
                Academic Year / Session
              </label>
              <input
                type="text"
                value={academicYear}
                placeholder="e.g. 2026-27"
                onChange={e => setAcademicYear(e.target.value)}
                className="w-full p-2.5 text-xs rounded-lg border border-[#DAD3C3] dark:border-[#3A3527] bg-[#F8F5EE] dark:bg-[#1F1C17] text-inherit"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#6E6656] dark:text-[#A79B85] uppercase mb-1">
                EMIS Code (Optional)
              </label>
              <input
                type="text"
                value={emisCode}
                placeholder="e.g. 35210123"
                onChange={e => setEmisCode(e.target.value)}
                className="w-full p-2.5 text-xs rounded-lg border border-[#DAD3C3] dark:border-[#3A3527] bg-[#F8F5EE] dark:bg-[#1F1C17] text-inherit"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#6E6656] dark:text-[#A79B85] uppercase mb-1">
                Section (Optional)
              </label>
              <input
                type="text"
                value={section}
                placeholder="e.g. A"
                onChange={e => setSection(e.target.value)}
                className="w-full p-2.5 text-xs rounded-lg border border-[#DAD3C3] dark:border-[#3A3527] bg-[#F8F5EE] dark:bg-[#1F1C17] text-inherit"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-[#6E6656] dark:text-[#A79B85] uppercase mb-1">
                Additional Print Line (Optional)
              </label>
              <input
                type="text"
                value={printNote}
                placeholder="e.g. Principal: Mr. XYZ"
                onChange={e => setPrintNote(e.target.value)}
                className="w-full p-2.5 text-xs rounded-lg border border-[#DAD3C3] dark:border-[#3A3527] bg-[#F8F5EE] dark:bg-[#1F1C17] text-inherit"
              />
            </div>
          </div>

          <div className="flex justify-between items-center pt-2">
            <button
              type="submit"
              className="py-2.5 px-4 text-xs font-bold rounded-lg bg-[#991B1B] text-white hover:bg-[#7F1D1D]"
            >
              Save Setup
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("dashboard")}
              className="text-xs font-bold text-red-800 dark:text-red-400 hover:underline cursor-pointer flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Dashboard</span>
            </button>
          </div>
        </form>
      </div>

      {/* Print Settings Card */}
      <div className="bg-white dark:bg-[#232019] border border-[#E5DFD0] dark:border-[#3A3527] rounded-xl p-4 shadow-xs space-y-3">
        <h3 className="text-sm font-bold font-serif-academic text-[#232019] dark:text-[#EFE9DD] flex items-center gap-2">
          <Printer className="w-4 h-4 text-red-800 dark:text-red-400" />
          <span>Print Settings</span>
        </h3>
        <p className="text-xs text-[#6E6656] dark:text-[#A79B85]">
          Controls document formatting across all printed sheets. If reports overflow to a second page, pick a smaller size.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-[#6E6656] dark:text-[#A79B85] uppercase mb-1">
              Print Size Scaling
            </label>
            <select
              value={data.printSize}
              onChange={e => handlePrintSizeChange(e.target.value as PrintSizeKey)}
              className="w-full p-2 text-xs rounded-lg border border-[#DAD3C3] dark:border-[#3A3527] bg-[#F8F5EE] dark:bg-[#1F1C17] text-inherit"
            >
              {(Object.keys(PRINT_SIZES) as PrintSizeKey[]).map(k => (
                <option key={k} value={k}>
                  {PRINT_SIZES[k].label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#6E6656] dark:text-[#A79B85] uppercase mb-1">
              Orientation Override
            </label>
            <select
              value={data.forceOrientation}
              onChange={e => handleForceOrientationChange(e.target.value as '' | 'portrait' | 'landscape')}
              className="w-full p-2 text-xs rounded-lg border border-[#DAD3C3] dark:border-[#3A3527] bg-[#F8F5EE] dark:bg-[#1F1C17] text-inherit"
            >
              <option value="">Auto (Recommended)</option>
              <option value="portrait">Force Portrait</option>
              <option value="landscape">Force Landscape</option>
            </select>
          </div>
        </div>

        <div>
          <button
            type="button"
            onClick={handleResetPrintSettings}
            className="py-1.5 px-3 text-xs font-bold rounded-lg bg-[#EFEBE2] dark:bg-[#2A261F] text-[#232019] dark:text-[#EFE9DD] hover:bg-[#E5DFD0]"
          >
            Reset Print Settings
          </button>
        </div>
      </div>

      {/* School Logo Upload Card */}
      <div className="bg-white dark:bg-[#232019] border border-[#E5DFD0] dark:border-[#3A3527] rounded-xl p-4 shadow-xs space-y-3">
        <h3 className="text-sm font-bold font-serif-academic text-[#232019] dark:text-[#EFE9DD] flex items-center gap-2">
          <Image className="w-4 h-4 text-red-800 dark:text-red-400" />
          <span>School Logo</span>
        </h3>
        <p className="text-xs text-[#6E6656] dark:text-[#A79B85]">
          Upload a PNG or JPG (recommended under 500 KB). This appears in the top header of all printed slips and merit lists.
        </p>

        <div className="border border-dashed border-[#DAD3C3] dark:border-[#3A3527] rounded-xl p-4 flex items-center justify-center min-h-[100px] bg-[#F8F5EE] dark:bg-[#1F1C17]">
          {data.schoolLogo ? (
            <img src={data.schoolLogo} alt="School Logo" className="max-h-20 max-w-40 object-contain" />
          ) : (
            <span className="text-xs text-[#8A8270] dark:text-[#A79B85]">No logo uploaded yet</span>
          )}
        </div>

        <div className="flex gap-2">
          <label className="py-2 px-3 text-xs font-bold rounded-lg bg-[#EFEBE2] dark:bg-[#2A261F] text-[#232019] dark:text-[#EFE9DD] hover:bg-[#E5DFD0] cursor-pointer flex items-center gap-1.5">
            <Upload className="w-3.5 h-3.5" />
            <span>Choose Logo…</span>
            <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
          </label>
          {data.schoolLogo && (
            <button
              type="button"
              onClick={handleRemoveLogo}
              className="py-2 px-3 text-xs font-bold rounded-lg bg-red-100 text-[#991B1B] hover:bg-red-200 flex items-center gap-1.5"
            >
              <X className="w-3.5 h-3.5" />
              <span>Remove Logo</span>
            </button>
          )}
        </div>
      </div>

      {/* Example Demo Data (50 Students) Card */}
      <div className="bg-white dark:bg-[#232019] border border-emerald-300 dark:border-emerald-800/80 rounded-xl p-4 shadow-xs space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold font-serif-academic text-emerald-900 dark:text-emerald-300 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
              <span>Example Demo Data (50 Students)</span>
            </h3>
            <p className="text-xs text-stone-600 dark:text-stone-400 mt-1">
              Populate a complete, realistic dataset of 50 students with full Attendance roll calls, Daily Quick Tests, SBA and Term Examinations, and Class Funds to test all features and print registers.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleLoadSampleData}
          className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-700 active:bg-emerald-900 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition cursor-pointer shadow-xs"
        >
          <Sparkles className="w-4 h-4" />
          <span>Load 50 Sample Students & Demo Records</span>
        </button>
      </div>

      {/* Backup & Restore Card */}
      <div className="bg-white dark:bg-[#232019] border border-[#E5DFD0] dark:border-[#3A3527] rounded-xl p-4 shadow-xs space-y-3">
        <h3 className="text-sm font-bold font-serif-academic text-[#232019] dark:text-[#EFE9DD] flex items-center gap-2">
          <Database className="w-4 h-4 text-red-800 dark:text-red-400" />
          <span>Backup & Restore</span>
        </h3>
        <p className="text-xs text-[#6E6656] dark:text-[#A79B85]">
          Export all class records, attendance history, assessments, and funds to a JSON backup file. Import it on another computer or browser to restore everything.
        </p>

        {/* Storage meter + backup status */}
        <div className="rounded-xl border border-[#E5DFD0] dark:border-[#3A3527] bg-[#F8F5EE] dark:bg-[#1F1C17] p-3 space-y-1.5">
          <div className="flex justify-between items-baseline text-xs font-bold text-[#232019] dark:text-[#EFE9DD]">
            <span>Storage used</span>
            <span>{usedLabel} of about 5 MB ({usedPct}%)</span>
          </div>
          <div
            className="h-2 rounded-full bg-[#E5DFD0] dark:bg-[#3A3527] overflow-hidden"
            role="progressbar"
            aria-valuenow={usedPct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Storage used"
          >
            <div className={`h-full ${barColor}`} style={{ width: `${Math.max(usedPct, 1)}%` }} />
          </div>
          {logoKB > 200 && (
            <p className="text-[11px] font-semibold text-amber-800 dark:text-amber-300">
              Your school logo uses {logoKB} KB. A smaller logo will free up space.
            </p>
          )}
          {usedPct >= 80 && (
            <p className="text-[11px] font-semibold text-red-700 dark:text-red-400">
              Storage is almost full. Export a backup now, and remove the logo if it is large.
            </p>
          )}
          <p className={`text-[11px] font-semibold ${backupOld ? 'text-amber-800 dark:text-amber-300' : 'text-[#6E6656] dark:text-[#A79B85]'}`}>
            {daysSinceBackup === null
              ? 'No backup exported from this device yet. Tap Export Backup below.'
              : daysSinceBackup === 0
              ? 'Last backup: today'
              : `Last backup: ${daysSinceBackup} day${daysSinceBackup === 1 ? '' : 's'} ago${backupOld ? '. Time for a new one.' : ''}`}
          </p>
        </div>

        <ActionGrid cols={2}>
          <ActionButton
            variant="primary"
            icon={Download}
            onClick={handleExportBackup}
          >
            Export Backup
          </ActionButton>
          <label className="w-full min-h-12 px-2.5 sm:px-3 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 sm:gap-2 whitespace-nowrap transition-colors select-none cursor-pointer bg-stone-50 hover:bg-stone-100 active:bg-stone-200 text-stone-800 border border-stone-200 dark:bg-stone-800/90 dark:hover:bg-stone-700/90 dark:text-stone-200 dark:border-stone-700">
            <Upload className="w-4 h-4 shrink-0" />
            <span className="truncate">Import Backup</span>
            <input type="file" accept=".json,application/json" onChange={handleImportBackup} className="hidden" />
          </label>
        </ActionGrid>
      </div>

      {/* Appearance & User Guide */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="bg-white dark:bg-[#232019] border border-[#E5DFD0] dark:border-[#3A3527] rounded-xl p-4 shadow-xs space-y-2">
          <h3 className="text-sm font-bold font-serif-academic text-[#232019] dark:text-[#EFE9DD] flex items-center gap-2">
            <Moon className="w-4 h-4 text-red-800 dark:text-red-400" />
            <span>Appearance</span>
          </h3>
          <p className="text-xs text-[#6E6656] dark:text-[#A79B85]">
            Switch between light parchment and dark modes.
          </p>
          <button
            type="button"
            onClick={toggleDarkMode}
            className="py-2 px-3 text-xs font-bold rounded-lg bg-[#EFEBE2] dark:bg-[#2A261F] text-[#232019] dark:text-[#EFE9DD] hover:bg-[#E5DFD0] cursor-pointer"
          >
            Toggle Dark Mode
          </button>
        </div>

        <div className="bg-white dark:bg-[#232019] border border-[#E5DFD0] dark:border-[#3A3527] rounded-xl p-4 shadow-xs space-y-2">
          <h3 className="text-sm font-bold font-serif-academic text-[#232019] dark:text-[#EFE9DD] flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-red-800 dark:text-red-400" />
            <span>Help & Guide</span>
          </h3>
          <p className="text-xs text-[#6E6656] dark:text-[#A79B85]">
            View comprehensive instructions and keyboard shortcuts.
          </p>
          <button
            type="button"
            onClick={openHelp}
            className="py-2 px-3 text-xs font-bold rounded-lg bg-[#EFEBE2] dark:bg-[#2A261F] text-[#232019] dark:text-[#EFE9DD] hover:bg-[#E5DFD0] cursor-pointer"
          >
            Open User Guide
          </button>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-red-50 dark:bg-red-950/20 border-2 border-red-300 dark:border-red-900 rounded-xl p-4 shadow-xs space-y-2">
        <h3 className="text-sm font-bold font-serif-academic text-[#991B1B] dark:text-red-400 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-600" />
          <span>Danger Zone — Reset Everything</span>
        </h3>
        <p className="text-xs text-[#991B1B] dark:text-red-300 leading-relaxed">
          This will permanently wipe all enrolled students, attendance logs, assessments, and fund payments. Make sure you have exported a JSON backup first.
        </p>
        <button
          type="button"
          onClick={handleResetEverything}
          className="py-2 px-3 text-xs font-bold rounded-lg bg-[#991B1B] text-white hover:bg-[#7F1D1D] cursor-pointer"
        >
          Reset Everything
        </button>
      </div>
    </div>
  );
};
