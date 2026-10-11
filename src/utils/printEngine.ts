import { PrintSizeKey } from '../types';
import { PRINT_SIZES } from './helpers';

export function triggerPrint(
  contentHTML: string,
  orientation: 'portrait' | 'landscape' = 'portrait',
  printSize: PrintSizeKey = 'm',
  forceOrientation: string = ''
) {
  const printArea = document.getElementById('printArea');
  if (!printArea) return;

  const mult = (PRINT_SIZES[printSize] || PRINT_SIZES.m).mult;
  printArea.style.setProperty('--mult', String(mult));
  printArea.innerHTML = contentHTML;
  printArea.style.display = 'block';

  let styleEl = document.getElementById('printPageStyle') as HTMLStyleElement | null;
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = 'printPageStyle';
    document.head.appendChild(styleEl);
  }

  const finalOrientation = forceOrientation || orientation || 'portrait';
  styleEl.textContent = finalOrientation === 'landscape'
    ? '@page { size: A4 landscape; margin: 10mm; }'
    : '@page { size: A4 portrait; margin: 12mm; }';

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      window.print();
    });
  });
}

export function cleanupPrintArea() {
  const printArea = document.getElementById('printArea');
  if (printArea) {
    printArea.innerHTML = '';
    printArea.style.display = 'none';
  }
}
