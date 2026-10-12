import React, { useState } from 'react';
import { Info, X } from 'lucide-react';

interface HowItWorksProps {
  /** Unique key per screen, e.g. "attendance". Remembers hidden/shown on this device. */
  id: string;
  title?: string;
  steps: React.ReactNode[];
  note?: React.ReactNode;
}

/**
 * Small dismissible "How this works" box. Once hidden, a one-line link
 * stays in its place so the help can be brought back any time.
 */
export const HowItWorks: React.FC<HowItWorksProps> = ({
  id,
  title = 'How this works',
  steps,
  note
}) => {
  const storageKey = `classgrid_help_hidden_${id}`;
  const [hidden, setHidden] = useState<boolean>(() => {
    try { return localStorage.getItem(storageKey) === '1'; } catch { return false; }
  });

  const toggle = (hide: boolean) => {
    setHidden(hide);
    try { localStorage.setItem(storageKey, hide ? '1' : '0'); } catch { /* ignore */ }
  };

  if (hidden) {
    return (
      <button
        type="button"
        onClick={() => toggle(false)}
        className="flex items-center gap-1.5 text-xs font-bold text-red-800 dark:text-red-300 cursor-pointer"
      >
        <Info size={14} /> How does this work?
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/30 px-3.5 py-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 text-sm font-black text-amber-900 dark:text-amber-200">
          <Info size={16} /> {title}
        </div>
        <button
          type="button"
          onClick={() => toggle(true)}
          aria-label="Hide help"
          className="p-1 -m-1 text-amber-800 dark:text-amber-300 cursor-pointer"
        >
          <X size={16} />
        </button>
      </div>
      <ol className="mt-1.5 space-y-1 text-xs font-semibold text-amber-950 dark:text-amber-100 list-decimal pl-4">
        {steps.map((s, i) => <li key={i}>{s}</li>)}
      </ol>
      {note && (
        <p className="mt-1.5 text-[11px] font-semibold text-amber-800 dark:text-amber-300">{note}</p>
      )}
    </div>
  );
};
