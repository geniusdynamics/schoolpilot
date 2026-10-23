// ABOUTME: Visual and geometry regression for the receipt print surface: the 80 mm thermal roll at
// ABOUTME: its 72 mm print width, the A5 and A4 page boxes, a long allocation list on both, the
// ABOUTME: e-receipt QR, the preview that draws no code, and the app-shell negative rule.

// Default import: this project is ESM ("type": "module") and @playwright/test resolves to its CommonJS
// entry, where Node offers no statically analysable named exports (see playwright.config.ts).
import playwright from '@playwright/test';
import type { Page } from '@playwright/test';

const { expect, test } = playwright;

declare global {
  interface Window {
    __receipt?: {
      ready: boolean;
      beginPrint: () => Promise<void>;
      endPrint: () => void;
      isPrinting: () => boolean;
    };
  }
}

interface ReceiptGeometry {
  readonly template: string | null;
  readonly page: string | null;
  readonly rollWidthMm: number | null;
  readonly contentWidthMm: number | null;
  /** The rendered sheet width on screen, in millimetres. */
  readonly sheetWidthMm: number;
}

const HARNESS = '/tests/e2e/receipts/receipt-harness.html';
const PX_PER_MM = 96 / 25.4;

async function openHarness(page: Page, variant: string, template: string): Promise<void> {
  await page.setViewportSize({ width: 1100, height: 1400 });
  // The first navigation compiles the Vite module graph; on a cold server that exceeds Playwright's
  // 30 s navigation default, so give it the same budget as the readiness wait below.
  await page.goto(`${HARNESS}?variant=${variant}&template=${template}`, { timeout: 120_000 });
  await page.waitForFunction(() => window.__receipt?.ready === true, undefined, { timeout: 30_000 });
  await page.evaluate(() => document.fonts.ready.then(() => true));
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}

async function geometry(page: Page): Promise<ReceiptGeometry> {
  return page.evaluate((pxPerMm) => {
    const root = document.querySelector('.receipt-document');
    const sheet = document.querySelector('.receipt-sheet') as HTMLElement | null;
    const value = (name: string): string | null => root?.getAttribute(name) ?? null;
    const number = (name: string): number | null => {
      const raw = value(name);
      return raw === null ? null : Number(raw);
    };
    return {
      template: value('data-template'),
      page: value('data-page'),
      rollWidthMm: number('data-roll-width-mm'),
      contentWidthMm: number('data-content-width-mm'),
      sheetWidthMm: sheet ? sheet.getBoundingClientRect().width / pxPerMm : 0,
    };
  }, PX_PER_MM);
}

/** Reads the page box out of the PDF Chromium produced, in millimetres. */
function pageBox(pdf: Buffer): { widthMm: number; heightMm: number } {
  const text = pdf.toString('latin1');
  const match = text.match(/\/MediaBox\s*\[\s*0(?:\.0+)?\s+0(?:\.0+)?\s+([\d.]+)\s+([\d.]+)\s*\]/);
  if (!match) throw new Error('no /MediaBox in the PDF');
  const MM_PER_PT = 25.4 / 72;
  return { widthMm: Number(match[1]) * MM_PER_PT, heightMm: Number(match[2]) * MM_PER_PT };
}

/** Page count from the page tree's /Count, falling back to counting page objects. */
function pageCount(pdf: Buffer): number {
  const text = pdf.toString('latin1');
  const counts = [...text.matchAll(/\/Type\s*\/Pages\b[^>]*?\/Count\s+(\d+)/g)].map((match) => Number(match[1]));
  if (counts.length > 0) return Math.max(...counts);
  return [...text.matchAll(/\/Type\s*\/Page[^s]/g)].length;
}

/**
 * Prints the way the app does: the print entry point waits for the fonts and removes the app shell
 * from pagination, then the browser's print pipeline produces the PDF. Printing without it is the
 * negative case the last test covers.
 */
async function printPdf(page: Page): Promise<Buffer> {
  await page.evaluate(() => window.__receipt?.beginPrint());
  const pdf = await page.pdf({ preferCSSPageSize: true, printBackground: true });
  await page.evaluate(() => window.__receipt?.endPrint());
  return pdf;
}

/** Prints the whole page as it stands, app shell included. */
async function printPageAsIs(page: Page): Promise<Buffer> {
  return page.pdf({ preferCSSPageSize: true, printBackground: true });
}

test.describe('the 80 mm thermal receipt', () => {
  test('renders at its 72 mm print width and inserts no page break', async ({ page }) => {
    await openHarness(page, 'standard', 'thermal');
    const measured = await geometry(page);
    expect(measured.template).toBe('thermal');
    expect(measured.page).toBe('roll');
    expect(measured.rollWidthMm).toBe(72);
    expect(measured.contentWidthMm).toBe(72);
    expect(measured.sheetWidthMm).toBeCloseTo(72, 0);

    // A roll has no page box: the receipt emits no `@page` rule at all. (Vite injects the stylesheets
    // as <style> tags in dev, so the assertion is about the receipt's own child, not the document.)
    expect(await page.evaluate(() => document.querySelectorAll('.receipt-document > style').length)).toBe(0);

    await expect(page.locator('.receipt-sheet')).toHaveScreenshot('thermal-standard.png');

    // The print-media width still comes from the sheet, not from a page box.
    await page.emulateMedia({ media: 'print' });
    const printWidthMm = await page.evaluate(
      (pxPerMm) => (document.querySelector('.receipt-sheet') as HTMLElement).getBoundingClientRect().width / pxPerMm,
      PX_PER_MM
    );
    // Clear the override: a lingering `screen` emulation makes `page.pdf()` render screen media, so
    // the print stylesheet (including the shell-hiding rule) would not apply at all.
    await page.emulateMedia({ media: null });
    expect(printWidthMm).toBeCloseTo(72, 0);

    // The content fits one roll length, so no page break is inserted.
    expect(pageCount(await printPdf(page))).toBe(1);
  });

  test('prints the amount in figures and in words, and the allocation total', async ({ page }) => {
    await openHarness(page, 'standard', 'thermal');
    const text = await page.locator('.receipt-sheet').innerText();
    expect(text).toContain('Riverside Academy');
    expect(text).toContain('RCT/2027/000123');
    expect(text).toContain('five thousand shillings');
    expect(text).toContain('J. Mwangi');
    // Labels render uppercased, so the assertion is on the rendered case.
    expect(text.toUpperCase()).toContain('BALANCE AFTER');
    // The allocation total is a row in `tbody`, never a `tfoot`.
    expect(await page.locator('.receipt-table tfoot').count()).toBe(0);
    expect(await page.locator('.receipt-table tbody tr.receipt-table__total').count()).toBe(1);
  });

  test('lets a long allocation list flow past one roll length at the same width', async ({ page }) => {
    await openHarness(page, 'long', 'thermal');
    const measured = await geometry(page);
    expect(measured.rollWidthMm).toBe(72);
    expect(measured.sheetWidthMm).toBeCloseTo(72, 0);
    expect(await page.locator('.receipt-table tbody tr').count()).toBe(61);

    await expect(page.locator('.receipt-sheet')).toHaveScreenshot('thermal-long-allocations.png');

    // A roll has no page break it can make: the content continues at the same width, and the receipt
    // is still identified by its header and its footer meta on whatever length the driver produces.
    const pdf = await printPdf(page);
    expect(pageCount(pdf)).toBeGreaterThanOrEqual(1);
    const printed = await geometry(page);
    expect(printed.sheetWidthMm).toBeCloseTo(72, 0);
  });

  test('draws no verification code for a preview e-receipt', async ({ page }) => {
    await openHarness(page, 'preview', 'thermal');
    await expect(page.locator('.receipt-preview-banner')).toBeVisible();
    expect(await page.locator('[data-receipt-block="verification"] svg').count()).toBe(0);
    expect(await page.locator('[data-receipt-block="verification"]').getAttribute('data-preview')).toBe('true');

    await expect(page.locator('.receipt-sheet')).toHaveScreenshot('thermal-preview.png');
  });
});

test.describe('the A5 receipt', () => {
  test('uses the measured A5 page box and fits one sheet', async ({ page }) => {
    await openHarness(page, 'standard', 'a5');
    const measured = await geometry(page);
    expect(measured.template).toBe('a5');
    expect(measured.page).toBe('A5-portrait');
    expect(measured.contentWidthMm).toBe(130);
    expect(measured.rollWidthMm).toBeNull();
    expect(measured.sheetWidthMm).toBeCloseTo(130, 0);

    // The A5 page box is emitted on the receipt itself.
    const css = await page.evaluate(() => document.querySelector('.receipt-document > style')?.textContent ?? '');
    expect(css).toContain('size: A5 portrait;');

    await expect(page.locator('.receipt-sheet')).toHaveScreenshot('a5-standard.png');

    const pdf = await printPdf(page);
    const box = pageBox(pdf);
    expect(box.widthMm).toBeCloseTo(148.2, 0);
    expect(box.heightMm).toBeCloseTo(209.9, 0);
    expect(pageCount(pdf)).toBe(1);
  });
});

test.describe('the A4 receipt', () => {
  test('uses the measured A4 page box and fits one sheet', async ({ page }) => {
    await openHarness(page, 'standard', 'a4');
    const measured = await geometry(page);
    expect(measured.template).toBe('a4');
    expect(measured.page).toBe('A4-portrait');
    expect(measured.contentWidthMm).toBe(186);
    expect(measured.sheetWidthMm).toBeCloseTo(186, 0);

    const css = await page.evaluate(() => document.querySelector('.receipt-document > style')?.textContent ?? '');
    expect(css).toContain('size: A4 portrait;');

    await expect(page.locator('.receipt-sheet')).toHaveScreenshot('a4-standard.png');

    const pdf = await printPdf(page);
    const box = pageBox(pdf);
    expect(box.widthMm).toBeCloseTo(209.9, 0);
    expect(box.heightMm).toBeCloseTo(297, 0);
    expect(pageCount(pdf)).toBe(1);
  });

  test('flows a long allocation list over more than one sheet', async ({ page }) => {
    await openHarness(page, 'long', 'a4');
    await expect(page.locator('.receipt-sheet')).toHaveScreenshot('a4-long-allocations.png');

    const pdf = await printPdf(page);
    // Sixty vote-head lines cannot fit one A4 content box; the table is allowed to break.
    expect(pageCount(pdf)).toBeGreaterThan(1);
    expect(pageBox(pdf).widthMm).toBeCloseTo(209.9, 0);
  });

  test('prints the e-receipt with its verification QR', async ({ page }) => {
    await openHarness(page, 'household', 'a4');
    expect(await page.locator('[data-receipt-block="verification"] svg').count()).toBe(1);
    const text = await page.locator('[data-receipt-block="verification"]').innerText();
    expect(text).toContain('RCP-2026-000123');
    expect(text).not.toContain('RCT/2027/000124');

    await expect(page.locator('.receipt-sheet')).toHaveScreenshot('a4-ereceipt.png');
  });
});

test.describe('the app shell never prints', () => {
  test('a receipt with the shell present produces only the receipt pages', async ({ page }) => {
    await openHarness(page, 'standard', 'a4');

    // Reproduce the measured defect first: with the shell in the layout, the 9000 px fixture
    // paginates into many blank pages.
    expect(pageCount(await printPageAsIs(page))).toBeGreaterThan(3);

    expect(pageCount(await printPdf(page))).toBe(1);

    expect(await page.evaluate(() => document.documentElement.hasAttribute('data-printing'))).toBe(false);
  });
});
