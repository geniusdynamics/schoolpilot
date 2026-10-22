// ABOUTME: End-to-end mark entry: a spreadsheet range pasted into the real grid in Chromium fills the
// ABOUTME: accepted cells, refuses the one above the paper maximum by address, and saves each accepted
// ABOUTME: mark once; the arrow keys move the focus across the same grid.

// Default import: the project is ESM ("type": "module") and @playwright/test resolves to its CommonJS
// entry, where Node offers no statically analysable named exports (see playwright.config.ts).
import playwright from '@playwright/test';
import type { Page } from '@playwright/test';

const { expect, test } = playwright;

declare global {
  interface Window {
    __marks?: {
      writes: () => number;
      scores: () => string[];
    };
  }
}

const HARNESS = '/tests/e2e/marks/mark-entry-harness.html';

async function openHarness(page: Page): Promise<void> {
  // The first navigation compiles the Vite module graph; on a cold server that comfortably exceeds
  // the navigation default, so give it a budget measured on a loaded machine.
  await page.goto(HARNESS, { timeout: 240_000 });
  await expect(page.locator('[data-cell="0:0"]')).toBeVisible({ timeout: 60_000 });
}

async function pasteRange(page: Page, cell: string, text: string): Promise<void> {
  await page.locator(`[data-cell="${cell}"]`).focus();
  await page.evaluate(
    ({ selector, value }) => {
      const input = document.querySelector(selector);
      if (!(input instanceof HTMLInputElement)) throw new Error(`no input at ${selector}`);
      const event = new Event('paste', { bubbles: true, cancelable: true });
      Object.defineProperty(event, 'clipboardData', {
        value: { getData: (type: string) => (type === 'text/plain' ? value : '') },
      });
      input.dispatchEvent(event);
    },
    { selector: `[data-cell="${cell}"]`, value: text }
  );
}

test.describe('mark entry grid', () => {
  test('pastes a range row-major and refuses only the cell above the maximum', async ({ page }) => {
    await openHarness(page);

    await pasteRange(page, '0:0', '10\t50\n15\t200');

    await expect(page.locator('[data-cell="0:0"]')).toHaveValue('10');
    await expect(page.locator('[data-cell="0:1"]')).toHaveValue('50');
    await expect(page.locator('[data-cell="1:0"]')).toHaveValue('15');
    // The refused cell keeps its empty value: nothing above the maximum is ever saved.
    await expect(page.locator('[data-cell="1:1"]')).toHaveValue('');

    await expect(page.getByText(/B2/)).toBeVisible();
    await expect(page.getByText(/A score cannot be above the maximum of 100/)).toBeVisible();

    await expect.poll(() => page.evaluate(() => window.__marks?.scores() ?? [])).toEqual([
      '10',
      '50',
      '15',
    ]);
    await expect.poll(() => page.evaluate(() => window.__marks?.writes() ?? 0)).toBe(3);
  });

  test('moves the focus with the arrow keys and Tab, as a spreadsheet does', async ({ page }) => {
    await openHarness(page);

    await page.locator('[data-cell="0:0"]').focus();
    await page.keyboard.press('ArrowRight');
    await expect
      .poll(() => page.evaluate(() => document.activeElement?.getAttribute('data-cell')))
      .toBe('0:1');

    await page.keyboard.press('ArrowDown');
    await expect
      .poll(() => page.evaluate(() => document.activeElement?.getAttribute('data-cell')))
      .toBe('1:1');

    await page.keyboard.press('Tab');
    await expect
      .poll(() => page.evaluate(() => document.activeElement?.getAttribute('data-cell')))
      .toBe('2:0');
  });
});
