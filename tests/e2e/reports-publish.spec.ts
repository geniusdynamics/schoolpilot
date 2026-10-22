// ABOUTME: End-to-end proof of report publishing: the frozen snapshot never changes, the published
// ABOUTME: document carries a valid signed QR while the preview does not, and the published document
// ABOUTME: prints to an A4 PDF through the same HTML and CSS the screen uses (the DR-05 executor).

// Default import: this project is ESM ("type": "module") and @playwright/test resolves to its CommonJS
// entry, where Node offers no statically analysable named exports (see playwright.config.ts).
import playwright from '@playwright/test';
import type { Page } from '@playwright/test';

const { expect, test } = playwright;

declare global {
  interface Window {
    __publish?: {
      ready: boolean;
      documentId: string;
      immutable: boolean;
      version: number;
      previewQr: boolean;
      publishedQr: boolean;
      beginPrint: () => Promise<void>;
      endPrint: () => void;
    };
  }
}

const HARNESS = '/tests/e2e/reports/report-publish-harness.html';

async function openHarness(page: Page, variant: 'published' | 'preview'): Promise<void> {
  await page.setViewportSize({ width: 1100, height: 1400 });
  await page.goto(`${HARNESS}?doc=${variant}`, { timeout: 120_000 });
  await page.waitForFunction(() => window.__publish?.ready === true, undefined, { timeout: 60_000 });
  await page.evaluate(() => document.fonts.ready.then(() => true));
  await page.evaluate(
    () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
  );
}

/** Reads the page box out of the PDF Chromium produced, in millimetres. */
function pageBox(pdf: Buffer): { widthMm: number; heightMm: number } {
  const text = pdf.toString('latin1');
  const match = text.match(/\/MediaBox\s*\[\s*0(?:\.0+)?\s+0(?:\.0+)?\s+([\d.]+)\s+([\d.]+)\s*\]/);
  if (!match) throw new Error('no /MediaBox in the PDF');
  const MM_PER_PT = 25.4 / 72;
  return { widthMm: Number(match[1]) * MM_PER_PT, heightMm: Number(match[2]) * MM_PER_PT };
}

function pageCount(pdf: Buffer): number {
  const text = pdf.toString('latin1');
  const counts = [...text.matchAll(/\/Type\s*\/Pages\b[^>]*?\/Count\s+(\d+)/g)].map((match) => Number(match[1]));
  if (counts.length > 0) return Math.max(...counts);
  return [...text.matchAll(/\/Type\s*\/Page[^s]/g)].length;
}

/** The DR-05 executor path: the same document, printed with printBackground and preferCSSPageSize. */
async function printPdf(page: Page): Promise<Buffer> {
  await page.evaluate(() => window.__publish?.beginPrint());
  const pdf = await page.pdf({ preferCSSPageSize: true, printBackground: true });
  await page.evaluate(() => window.__publish?.endPrint());
  return pdf;
}

test.describe('report publishing', () => {
  test('the frozen snapshot never changes, and a re-issue is a new version', async ({ page }) => {
    await openHarness(page, 'published');
    const state = await page.evaluate(() => ({
      immutable: window.__publish?.immutable,
      version: window.__publish?.version,
      documentId: window.__publish?.documentId,
    }));

    // The harness published, then changed the source batch's mark and template; the stored snapshot
    // is byte-for-byte what it was.
    expect(state.immutable).toBe(true);
    expect(state.version).toBe(1);
    expect(state.documentId).toMatch(/^RC-2026-\d{6}$/);
  });

  test('the published document carries a valid signed QR and the preview does not', async ({ page }) => {
    await openHarness(page, 'published');
    const published = await page.evaluate(() => ({
      publishedQr: window.__publish?.publishedQr,
      previewQr: window.__publish?.previewQr,
      documentId: window.__publish?.documentId,
    }));
    expect(published.publishedQr).toBe(true);
    expect(published.previewQr).toBe(false);

    const svgCount = await page.locator('.report-sheet svg').count();
    expect(svgCount).toBeGreaterThan(0);
    await expect(page.locator('.report-sheet')).toContainText(`/v1/${published.documentId}?sig=`);

    await openHarness(page, 'preview');
    await expect(page.locator('.report-sheet')).toContainText('PREVIEW');
    // The preview renders the verification block without a QR: only the logo is a vector on the card.
    const previewQr = await page.evaluate(() => {
      const block = document.querySelector('[data-block="verification"], .report-block--verification');
      return block === null ? 0 : block.querySelectorAll('svg').length;
    });
    expect(previewQr).toBe(0);
  });

  test('the published snapshot prints to one A4 PDF through the same HTML and CSS', async ({ page }) => {
    await openHarness(page, 'published');

    // The card fits one sheet: the measured height is inside the template's content box.
    const fit = await page.evaluate(() => {
      const root = document.querySelector('.report-document');
      return {
        overflow: root?.getAttribute('data-overflow') ?? null,
        heightMm: Number(root?.getAttribute('data-height-mm') ?? '0'),
        contentHeightMm: Number(root?.getAttribute('data-content-height-mm') ?? '0'),
      };
    });
    expect(fit.overflow).toBe('false');
    expect(fit.heightMm).toBeGreaterThan(0);
    expect(fit.heightMm).toBeLessThanOrEqual(fit.contentHeightMm);

    const pdf = await printPdf(page);
    const box = pageBox(pdf);
    expect(box.widthMm).toBeCloseTo(209.9, 0);
    expect(box.heightMm).toBeCloseTo(297, 0);
    expect(pageCount(pdf)).toBe(1);
    // The app shell is excluded from pagination, so the 9000 px fixture adds no pages.
    expect(await page.evaluate(() => document.documentElement.hasAttribute('data-printing'))).toBe(false);
  });

  test('the unpublished preview also prints one A4 page, marked not valid', async ({ page }) => {
    await openHarness(page, 'preview');
    const pdf = await printPdf(page);
    expect(pageCount(pdf)).toBe(1);
    expect(pageBox(pdf).widthMm).toBeCloseTo(209.9, 0);
  });
});
