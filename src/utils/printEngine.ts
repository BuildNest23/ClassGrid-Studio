import { PrintSizeKey } from '../types';
import { PRINT_SIZES } from './helpers';

export function triggerPrint(
  contentHTML: string,
  orientation: 'portrait' | 'landscape' = 'portrait',
  printSize: PrintSizeKey = 'm',
  forceOrientation: string = '',
  pageNumbers: boolean = false
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
  // Optional "Page X of Y" in the bottom page margin (browsers without page-margin-box support simply ignore it)
  const pageNumCSS = pageNumbers
    ? ' @page { @bottom-center { content: "Page " counter(page) " of " counter(pages); font-size: 8pt; color: #555; font-family: Arial, sans-serif; } }'
    : '';
  styleEl.textContent = (finalOrientation === 'landscape'
    ? '@page { size: A4 landscape; margin: 10mm; }'
    : '@page { size: A4 portrait; margin: 12mm; }') + pageNumCSS;

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
