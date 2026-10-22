// ABOUTME: The print entry point: waits for the print fonts, hides the app shell with `display: none`
// ABOUTME: (never `visibility: hidden`), prints, and clears the attribute on `afterprint`.

/** Attribute on `<html>` while a report is printing; `report.css` hides `#root` under it. */
export const PRINTING_ATTRIBUTE = 'data-printing';

export interface PrintEnvironment {
  readonly document: Document;
  readonly print: () => void;
}

function defaultEnvironment(): PrintEnvironment {
  return {
    document: window.document,
    print: () => window.print(),
  };
}

let current: PrintEnvironment | null = null;
let afterPrintHandler: (() => void) | null = null;

/** True while a report print job owns the page. */
export function isPrinting(): boolean {
  return current !== null;
}

/**
 * Prepares the page for a report print job.
 *
 * The order matters: the fonts must be loaded before the browser lays the sheet out for print (a
 * late swap changes the line breaks), and the shell is removed from pagination — measured, a hidden
 * but laid-out shell adds blank pages and a card 18 px over the box doubles the job.
 */
export async function beginPrint(environment: PrintEnvironment = defaultEnvironment()): Promise<void> {
  const doc = environment.document;
  const fonts = doc.fonts;
  if (fonts?.ready) await fonts.ready;
  if (current) endPrint(current);
  current = environment;
  doc.documentElement.setAttribute(PRINTING_ATTRIBUTE, '');
  afterPrintHandler = () => endPrint();
  doc.defaultView?.addEventListener('afterprint', afterPrintHandler, { once: true });
}

/** Clears the print state. Safe to call when nothing is printing. */
export function endPrint(environment: PrintEnvironment = defaultEnvironment()): void {
  const doc = environment.document;
  doc.documentElement.removeAttribute(PRINTING_ATTRIBUTE);
  if (afterPrintHandler) {
    doc.defaultView?.removeEventListener('afterprint', afterPrintHandler);
    afterPrintHandler = null;
  }
  current = null;
}

/**
 * The full print job: wait for fonts, hide the shell, call `window.print()`, and restore on
 * `afterprint`. A browser that never fires `afterprint` (a cancelled dialog in some versions) is
 * covered by `endPrint()` being idempotent and by the attribute being cleared on the next begin.
 */
export async function printReport(environment: PrintEnvironment = defaultEnvironment()): Promise<void> {
  await beginPrint(environment);
  try {
    environment.print();
  } catch (error) {
    endPrint(environment);
    throw error;
  }
}
