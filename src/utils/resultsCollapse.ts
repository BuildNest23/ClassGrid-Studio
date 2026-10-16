const RESULTS_COLLAPSE_KEY = 'classgridResultsCollapse';

export interface ResultsCollapseState {
  asmtDetails?: boolean;  // true = collapsed
  subjects?: boolean;     // true = collapsed
  aiEdit?: boolean;       // true = collapsed
  printOptions?: boolean; // true = collapsed
}

export function loadResultsCollapse(): ResultsCollapseState {
  try {
    const raw = localStorage.getItem(RESULTS_COLLAPSE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (typeof parsed === 'object' && parsed !== null) {
        return parsed;
      }
    }
  } catch {}
  return {
    asmtDetails: false,
    subjects: false,
    aiEdit: true,
    printOptions: false,
  };
}

export function saveResultsCollapse(state: ResultsCollapseState): void {
  try {
    localStorage.setItem(RESULTS_COLLAPSE_KEY, JSON.stringify(state));
  } catch {}
}
