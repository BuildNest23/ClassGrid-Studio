import { useState, useEffect } from 'react';

export interface ClassgridPrefs {
  showAdvanced: boolean;
  welcomeDone: boolean;
}

const PREFS_KEY = 'classgridPrefs';
const OLD_WELCOME_KEY = 'classgrid_welcome_shown';

/**
 * Reads preferences from localStorage under key 'classgridPrefs'.
 * Migrates old welcome key 'classgrid_welcome_shown' if present.
 * For brand new installs (no saved data), showAdvanced defaults to false.
 * For existing installs (any saved data in storage), showAdvanced defaults to true.
 */
export function getPrefs(): ClassgridPrefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    const oldWelcome = localStorage.getItem(OLD_WELCOME_KEY) === '1';

    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        showAdvanced: !!parsed.showAdvanced,
        welcomeDone: !!parsed.welcomeDone || oldWelcome,
      };
    }

    // First time reading prefs on this device:
    // Determine whether this is an existing install with saved data or a brand-new install
    let hasExistingData = false;
    const dataStr = localStorage.getItem('classroomData');
    if (dataStr) {
      try {
        const d = JSON.parse(dataStr);
        if (
          (d.students && d.students.length > 0) ||
          (d.assessments && d.assessments.length > 0) ||
          (d.funds && d.funds.length > 0) ||
          (d.attendance && Object.keys(d.attendance).length > 0)
        ) {
          hasExistingData = true;
        }
      } catch { /* ignore */ }
    }

    const shelfStr = localStorage.getItem('classgridShelfIndex');
    if (shelfStr) {
      try {
        const idx = JSON.parse(shelfStr);
        if (Array.isArray(idx) && idx.length > 0) hasExistingData = true;
      } catch { /* ignore */ }
    }

    const initialPrefs: ClassgridPrefs = {
      // Existing installs keep Advanced ON. Brand new installs default OFF.
      showAdvanced: hasExistingData,
      welcomeDone: oldWelcome || hasExistingData,
    };

    localStorage.setItem(PREFS_KEY, JSON.stringify(initialPrefs));
    return initialPrefs;
  } catch {
    return { showAdvanced: false, welcomeDone: false };
  }
}

export function savePrefs(prefs: Partial<ClassgridPrefs>): ClassgridPrefs {
  try {
    const current = getPrefs();
    const updated: ClassgridPrefs = { ...current, ...prefs };
    localStorage.setItem(PREFS_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event('classgrid_prefs_changed'));
    return updated;
  } catch {
    return { showAdvanced: false, welcomeDone: false };
  }
}

export function useClassgridPrefs(): [ClassgridPrefs, (update: Partial<ClassgridPrefs>) => void] {
  const [prefs, setPrefsState] = useState<ClassgridPrefs>(getPrefs);

  useEffect(() => {
    const onPrefsChange = () => setPrefsState(getPrefs());
    window.addEventListener('classgrid_prefs_changed', onPrefsChange);
    window.addEventListener('storage', onPrefsChange);
    return () => {
      window.removeEventListener('classgrid_prefs_changed', onPrefsChange);
      window.removeEventListener('storage', onPrefsChange);
    };
  }, []);

  const updatePrefs = (update: Partial<ClassgridPrefs>) => {
    const next = savePrefs(update);
    setPrefsState(next);
  };

  return [prefs, updatePrefs];
}
