import { useSyncExternalStore } from 'react';

const CAPS_PRINT_KEY = 'classgridCapsPrint';

function read(): boolean {
  try {
    const raw = localStorage.getItem(CAPS_PRINT_KEY);
    return raw === 'true';
  } catch {
    return false;
  }
}

let current: boolean = read();
const listeners = new Set<() => void>();

export const loadCapsPrint = (): boolean => current;

export function saveCapsPrint(enabled: boolean) {
  current = enabled;
  try {
    localStorage.setItem(CAPS_PRINT_KEY, String(enabled));
  } catch {
    /* ignore */
  }
  listeners.forEach(l => l());
}

const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
};

export function useCapsPrint(): boolean {
  return useSyncExternalStore(subscribe, loadCapsPrint, loadCapsPrint);
}
