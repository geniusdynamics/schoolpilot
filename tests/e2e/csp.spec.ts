// ABOUTME: Proves the app runs under its own content-security policy: the policy is in the
// ABOUTME: document, the app boots, an injected inline script is refused, and the boot is clean.

import playwright from '@playwright/test';

import { COLD_LOAD_TIMEOUT, LOAD_TIMEOUT } from './goldenPathSupport';

const { test } = playwright;
const expect = playwright.expect;

test.use({ navigationTimeout: COLD_LOAD_TIMEOUT });

/** The console messages Chromium writes when it refuses a script. */
const VIOLATION = /Content Security Policy|Refused to (execute|load|apply)/i;

test.describe('the content-security policy', () => {
  test('the app boots under a strict policy and refuses an injected inline script', async ({
    page,
  }) => {
    test.setTimeout(600_000);

    const violations: string[] = [];
    const pageErrors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error' && VIOLATION.test(message.text())) {
        violations.push(message.text());
      }
    });
    page.on('pageerror', (error) => pageErrors.push(error.message));

    const response = await page.goto('/', { waitUntil: 'domcontentloaded', timeout: COLD_LOAD_TIMEOUT });

    // The framing and referrer controls a `<meta>` policy cannot carry are response headers. The
    // production host has to set the same two; this asserts the server the suite runs against does.
    expect(response?.headers()['x-frame-options']).toBe('DENY');
    expect(response?.headers()['referrer-policy']).toBe('no-referrer');

    // index.html ships a spinner and an inline <style> inside #root. React's first commit clears
    // them, so their absence is proof the module script loaded and ran under the policy.
    await expect(page.locator('#root > style')).toHaveCount(0, { timeout: LOAD_TIMEOUT });
    await expect(page.locator('#root')).not.toBeEmpty();

    const policy = await page
      .locator('meta[http-equiv="Content-Security-Policy"]')
      .getAttribute('content');

    expect(policy, 'the document carries a content-security policy').toBeTruthy();
    expect(policy).toContain("script-src 'self' 'wasm-unsafe-eval'");
    expect(policy).not.toContain("'unsafe-eval'");
    expect(policy).toContain("default-src 'self'");
    expect(policy).toContain("object-src 'none'");
    // The development preamble react-refresh injects is inline, so the policy must carry its hash.
    expect(policy).toMatch(/'sha256-[A-Za-z0-9+/=]+'/);

    // Booting is not allowed to violate the policy it just loaded.
    await page.waitForTimeout(1_000);
    expect(violations, `boot violations: ${violations.join(' | ')}`).toEqual([]);

    // A script the document did not hash must not run, even when it is inserted by the page.
    const ran = await page.evaluate(() => {
      const script = document.createElement('script');
      script.textContent = 'window.__cspProbe = "ran";';
      document.head.appendChild(script);
      return (window as unknown as Record<string, unknown>).__cspProbe === 'ran';
    });

    expect(ran, 'an injected inline script was allowed to run').toBe(false);
    await expect.poll(() => violations.length, { timeout: 10_000 }).toBeGreaterThan(0);

    expect(pageErrors).toEqual([]);
  });
});
