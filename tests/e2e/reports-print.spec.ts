// ABOUTME: Visual and page-box regression for the report print surface: A4 and A5 cards, a long-comment
// ABOUTME: fit case, an Arabic card, a landscape wide table, and the app-shell negative rule.

// Default import: this project is ESM ("type": "module") and @playwright/test resolves to its CommonJS
// entry, where Node offers no statically analysable named exports (see playwright.config.ts).
import playwright from '@playwright/test';
import type { Page } from '@playwright/test';

const { expect, test } = playwright;

declare global {
  interface Window {
    __report?: {
      ready: boolean;
      beginPrint: () => Promise<void>;
      endPrint: () => void;
    };
  }
}

interface ReportDocumentStats {
  readonly page: string | null;
  readonly density: string | null;
  readonly overflow: string | null;
  readonly heightMm: number | null;
  readonly contentHeightMm: number | null;
  readonly layout: string | null;
}

const HARNESS = '/tests/e2e/reports/report-harness.html';

async function openHarness(page: Page, variant: string, size: string): Promise<void> {
  await page.setViewportSize({ width: 1100, height: 1400 });
  // The first navigation to the harness compiles the Vite module graph; on a cold server that exceeds
  // Playwright's 30 s navigation default, so give it the same budget as the readiness wait below.
  await page.goto(`${HARNESS}?variant=${variant}&page=${size}`, { timeout: 120_000 });
  await page.waitForFunction(() => window.__report?.ready === true, undefined, { timeout: 30_000 });
  await page.evaluate(() => document.fonts.ready.then(() => true));
  // One more layout pass after the fit check has applied its density.
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}

async function stats(page: Page): Promise<ReportDocumentStats> {
  return page.evaluate(() => {
    const root = document.querySelector('.report-document');
    const value = (name: string): string | null => root?.getAttribute(name) ?? null;
    const number = (name: string): number | null => {
      const raw = value(name);
      return raw === null ? null : Number(raw);
    };
    return {
      page: value('data-page'),
      density: value('data-density'),
      overflow: value('data-overflow'),
      heightMm: number('data-height-mm'),
      contentHeightMm: number('data-content-height-mm'),
      layout: value('data-layout'),
    };
  });
}

/** Reads the page box out of the PDF Chromium produced, in millimetres. */
function pageBox(pdf: Buffer): { widthMm: number; heightMm: number } {
  const text = pdf.toString('latin1');
  const match = text.match(/\/MediaBox\s*\[\s*0(?:\.0+)?\s+0(?:\.0+)?\s+([\d.]+)\s+([\d.]+)\s*\]/);
  if (!match) throw new Error('no /MediaBox in the PDF');
  const pt = (value: string): number => Number(value);
  const MM_PER_PT = 25.4 / 72;
  return { widthMm: pt(match[1]) * MM_PER_PT, heightMm: pt(match[2]) * MM_PER_PT };
}

/** Page count from the page tree's /Count, falling back to counting page objects. */
function pageCount(pdf: Buffer): number {
  const text = pdf.toString('latin1');
  const counts = [...text.matchAll(/\/Type\s*\/Pages\b[^>]*?\/Count\s+(\d+)/g)].map((match) => Number(match[1]));
  if (counts.length > 0) return Math.max(...counts);
  return [...text.matchAll(/\/Type\s*\/Page[^s]/g)].length;
}

/**
 * Prints the way the app does: the report entry point waits for the fonts and removes the app shell
 * from pagination, then the browser's print pipeline produces the PDF. Printing without it is the
 * negative case the last test covers.
 */
async function printPdf(page: Page): Promise<Buffer> {
  await page.evaluate(() => window.__report?.beginPrint());
  const pdf = await page.pdf({ preferCSSPageSize: true, printBackground: true });
  await page.evaluate(() => window.__report?.endPrint());
  return pdf;
}

/** Prints the whole page as it stands, app shell included. */
async function printPageAsIs(page: Page): Promise<Buffer> {
  return page.pdf({ preferCSSPageSize: true, printBackground: true });
}

test.describe('report print surface', () => {
  test('A4 card fits one sheet at the measured page box', async ({ page }) => {
    await openHarness(page, 'full', 'A4');
    const measured = await stats(page);
    expect(measured.page).toBe('A4-portrait');
    expect(measured.overflow).toBe('false');
    expect(measured.heightMm).not.toBeNull();
    expect(measured.heightMm as number).toBeLessThanOrEqual(measured.contentHeightMm as number);

    await expect(page.locator('.report-sheet')).toHaveScreenshot('a4-full.png');

    const pdf = await printPdf(page);
    const box = pageBox(pdf);
    expect(box.widthMm).toBeCloseTo(209.9, 0);
    expect(box.heightMm).toBeCloseTo(297, 0);
    expect(pageCount(pdf)).toBe(1);
  });

  test('A5 card uses the reduced layout and fits one sheet', async ({ page }) => {
    await openHarness(page, 'full', 'A5');
    const measured = await stats(page);
    expect(measured.page).toBe('A5-portrait');
    expect(measured.layout).toBe('reduced');
    expect(measured.overflow).toBe('false');
    expect(measured.heightMm as number).toBeLessThanOrEqual(measured.contentHeightMm as number);

    await expect(page.locator('.report-sheet')).toHaveScreenshot('a5-full.png');

    const pdf = await printPdf(page);
    const box = pageBox(pdf);
    expect(box.widthMm).toBeCloseTo(148.2, 0);
    expect(box.heightMm).toBeCloseTo(209.9, 0);
    expect(pageCount(pdf)).toBe(1);
  });

  test('the 500-character comment still fits one A4 sheet', async ({ page }) => {
    await openHarness(page, 'long', 'A4');
    const measured = await stats(page);
    expect(measured.overflow).toBe('false');
    expect(measured.heightMm as number).toBeLessThanOrEqual(measured.contentHeightMm as number);

    await expect(page.locator('.report-sheet')).toHaveScreenshot('a4-long-comment.png');

    const pdf = await printPdf(page);
    expect(pageCount(pdf)).toBe(1);
    expect(pageBox(pdf).heightMm).toBeCloseTo(297, 0);
  });

  test('the Arabic card is RTL and still fits one A4 sheet', async ({ page }) => {
    await openHarness(page, 'rtl', 'A4');
    const direction = await page.evaluate(() => document.querySelector('.report-document')?.getAttribute('dir'));
    expect(direction).toBe('rtl');
    const measured = await stats(page);
    expect(measured.overflow).toBe('false');

    await expect(page.locator('.report-sheet')).toHaveScreenshot('a4-rtl.png');

    const pdf = await printPdf(page);
    expect(pageCount(pdf)).toBe(1);
    expect(pageBox(pdf).widthMm).toBeCloseTo(209.9, 0);
  });

  test('the landscape wide table spans pages with a landscape page box', async ({ page }) => {
    await openHarness(page, 'wide', 'landscape');
    const measured = await stats(page);
    expect(measured.page).toBe('A4-landscape');
    expect(measured.layout).toBe('reduced');

    await expect(page.locator('.report-sheet')).toHaveScreenshot('a4-landscape-wide.png');

    const pdf = await printPdf(page);
    const box = pageBox(pdf);
    expect(box.widthMm).toBeCloseTo(297, 0);
    expect(box.heightMm).toBeCloseTo(209.9, 0);
    // Forty rows cannot fit one landscape sheet; the table is allowed to break and the header repeats.
    expect(pageCount(pdf)).toBeGreaterThan(1);
  });
});

test.describe('the app shell never prints', () => {
  test('a document with the shell present produces only the report pages', async ({ page }) => {
    await openHarness(page, 'full', 'A4');

    // Reproduce the measured defect first: with the shell in the layout, the 9000 px fixture
    // paginates into many blank pages.
    const withShell = pageCount(await printPageAsIs(page));
    expect(withShell).toBeGreaterThan(3);

    const reportOnly = pageCount(await printPdf(page));
    expect(reportOnly).toBe(1);

    expect(await page.evaluate(() => document.documentElement.hasAttribute('data-printing'))).toBe(false);
  });
});
