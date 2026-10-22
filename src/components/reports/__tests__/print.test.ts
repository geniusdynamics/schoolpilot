// ABOUTME: The print entry point and the negative rule it enforces: `display: none` on the app shell,
// ABOUTME: never `visibility: hidden`, cleared on afterprint, and no `position: fixed` furniture in CSS.

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { beginPrint, endPrint, isPrinting, printReport, PRINTING_ATTRIBUTE } from '../print';

// Vitest runs with the repository root as its working directory; `import.meta.url` is an http URL
// under the jsdom environment, so the stylesheet is read from the project root instead.
const css = readFileSync(resolve(process.cwd(), 'src/components/reports/report.css'), 'utf8');

describe('print entry point', () => {
  beforeEach(() => {
    Object.defineProperty(document, 'fonts', { configurable: true, value: { ready: Promise.resolve() } });
  });

  afterEach(() => {
    endPrint();
    vi.restoreAllMocks();
  });

  it('sets the printing attribute and clears it on afterprint', async () => {
    await beginPrint();
    expect(document.documentElement.hasAttribute(PRINTING_ATTRIBUTE)).toBe(true);
    expect(isPrinting()).toBe(true);

    window.dispatchEvent(new Event('afterprint'));
    expect(document.documentElement.hasAttribute(PRINTING_ATTRIBUTE)).toBe(false);
    expect(isPrinting()).toBe(false);
  });

  it('waits for the fonts before it hides the shell', async () => {
    let releaseFonts: () => void = () => {};
    const fontsReady = new Promise<void>((resolve) => {
      releaseFonts = resolve;
    });
    Object.defineProperty(document, 'fonts', { configurable: true, value: { ready: fontsReady } });

    const started = beginPrint();
    await Promise.resolve();
    expect(document.documentElement.hasAttribute(PRINTING_ATTRIBUTE)).toBe(false);

    releaseFonts();
    await started;
    expect(document.documentElement.hasAttribute(PRINTING_ATTRIBUTE)).toBe(true);
  });

  it('prints only after the shell is hidden, and restores after the dialog', async () => {
    const print = vi.spyOn(window, 'print').mockImplementation(() => {});
    const observed: boolean[] = [];
    print.mockImplementation(() => {
      observed.push(document.documentElement.hasAttribute(PRINTING_ATTRIBUTE));
    });

    await printReport();
    expect(print).toHaveBeenCalledTimes(1);
    expect(observed).toEqual([true]);
    expect(isPrinting()).toBe(true);

    window.dispatchEvent(new Event('afterprint'));
    expect(isPrinting()).toBe(false);
  });

  it('restores the page when the print call throws', async () => {
    vi.spyOn(window, 'print').mockImplementation(() => {
      throw new Error('no printer');
    });
    await expect(printReport()).rejects.toThrow('no printer');
    expect(document.documentElement.hasAttribute(PRINTING_ATTRIBUTE)).toBe(false);
  });

  it('is idempotent', () => {
    expect(() => {
      endPrint();
      endPrint();
    }).not.toThrow();
    expect(document.documentElement.hasAttribute(PRINTING_ATTRIBUTE)).toBe(false);
  });
});

describe('the negative rule in the stylesheet', () => {
  // Comments explain why the rejected mechanisms were rejected; only declarations may be asserted.
  const declarations = css.replace(/\/\*[\s\S]*?\*\//g, '');

  it('removes the app shell with display: none', () => {
    expect(declarations).toMatch(/html\[data-printing\] #root \{\s*display: none !important;/);
  });

  it('never hides the shell with visibility: hidden and never uses fixed furniture', () => {
    // Measured: a hidden-but-laid-out shell paginates and adds blank pages, and `position: fixed`
    // furniture overprints the last rows while its page counter prints "Page 0 of 0".
    expect(declarations).not.toMatch(/visibility:\s*hidden/);
    expect(declarations).not.toMatch(/position:\s*fixed/);
  });

  it('repeats table headers, keeps rows whole, and lets table blocks break', () => {
    expect(declarations).toMatch(/thead \{\s*display: table-header-group;/);
    expect(declarations).toMatch(/tr,\s*\.report-row \{\s*break-inside: avoid;/);
    expect(declarations).toMatch(/\.report-block--flow \{\s*break-inside: auto;/);
    expect(declarations).toMatch(/orphans: 3;\s*widows: 3;/);
    expect(declarations).toMatch(/\.report-sheet \{[^}]*break-after: page;/);
  });

  it('declares no global @page rule', () => {
    // Page geometry is emitted per document by ReportDocument; a global rule would fight it.
    expect(declarations).not.toMatch(/@page\s*\{/);
  });
});
