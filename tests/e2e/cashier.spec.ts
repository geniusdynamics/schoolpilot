// ABOUTME: The cashier screen end to end: a session opened with a float, a payment taken with the
// ABOUTME: keyboard alone, the flow's own elapsed time read from the page and checked against the
// ABOUTME: spec's twenty-second budget, then the session closed and its Z-report stated.

import playwright from '@playwright/test';

import {
  COLD_LOAD_TIMEOUT,
  LOAD_TIMEOUT,
  UI_TIMEOUT,
  completeSetup,
  go,
  reloadAndWait,
  signIn,
} from './goldenPathSupport';

const { test } = playwright;
const expect = playwright.expect.configure({ timeout: UI_TIMEOUT });

test.use({ navigationTimeout: COLD_LOAD_TIMEOUT, actionTimeout: UI_TIMEOUT });

const RUN = `${Date.now()}`;
const ADMIN = {
  username: `cashier-admin-${RUN}`,
  displayName: 'Cashier Administrator',
  password: 'cashier-admin-password',
};
const SCHOOL = {
  name: `Cashier Academy ${RUN}`,
  motto: 'Every shilling counted',
  address: 'P.O. Box 7, Nairobi',
  phone: '+254700000007',
  email: `office-${RUN}@cashier.test`,
};

const FLOAT = '500';
const AMOUNT = '1500';
const COUNTED = '2000';
const BUDGET_MS = 20_000;

test.describe('the cashier screen', () => {
  test('takes a payment with the keyboard alone, inside 20 seconds, and reports the session', async ({
    page,
  }) => {
    test.setTimeout(900_000);
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));

    await test.step('set up the school and sign in', async () => {
      await completeSetup(page, {
        school: SCHOOL,
        classes: [{ name: 'Form 1', streams: 'North' }],
        admin: ADMIN,
        sampleData: true,
      });
      await signIn(page, ADMIN);
      await expect(page.locator('header')).toContainText(SCHOOL.name);
    });

    await test.step('open a cashier session with its float', async () => {
      await go(page, '/finance/cashier');
      await expect(page.getByTestId('cashier-page')).toBeVisible({ timeout: LOAD_TIMEOUT });
      await page.getByTestId('cashier-float').fill(FLOAT);
      await page.getByTestId('cashier-open-session').click();
      await expect(page.getByTestId('cashier-close-session')).toBeVisible();
    });

    // The learner the flow will pay, read from the search list before the clock starts.
    const firstOption = page.getByTestId('cashier-learner-option-0');
    await expect(firstOption).toBeVisible();
    const label = await firstOption.innerText();
    const learnerName = (label.split('·')[0] ?? label).trim();
    const admission = /ADM\/[0-9]+\/[0-9]+/.exec(label)?.[0] ?? label.split('·').pop()?.trim() ?? '';
    expect(admission.length, `no admission number in the learner option: ${label}`).toBeGreaterThan(0);

    await test.step('the flow starts on the learner search, with the pointer untouched', async () => {
      // Opening the session hands focus back to the search; nothing below clicks.
      await expect(page.getByTestId('cashier-learner-search')).toBeFocused();
    });

    let elapsedMs = 0;

    await test.step('take the payment with keystrokes only, and read the measured time', async () => {
      await page.keyboard.type(admission);
      await page.keyboard.press('Enter');
      await expect(page.getByTestId('cashier-flow-step')).toHaveAttribute('data-step', 'amount');

      await page.keyboard.type(AMOUNT);
      await page.keyboard.press('Enter');
      await expect(page.getByTestId('cashier-flow-step')).toHaveAttribute('data-step', 'channel');

      // The cash hotkey, not a click on the channel.
      await page.keyboard.press('1');
      await expect(page.getByTestId('cashier-flow-step')).toHaveAttribute('data-step', 'reference');

      // Enter on the reference saves; the receipt is on screen and the flow is at the print step.
      await page.keyboard.press('Enter');
      await expect(page.getByTestId('cashier-receipt')).toBeVisible();
      await expect(page.getByTestId('cashier-flow-step')).toHaveAttribute('data-step', 'print');

      const elapsed = page.getByTestId('cashier-flow-elapsed');
      const attribute = await elapsed.getAttribute('data-elapsed-ms');
      elapsedMs = Number(attribute ?? 0);
      console.log(`[P3-D01] measured keyboard flow: ${elapsedMs} ms (${attribute} ms attribute)`);

      expect(Number.isFinite(elapsedMs), `the page did not record an elapsed time: ${attribute}`).toBe(true);
      expect(elapsedMs).toBeGreaterThan(0);
      expect(elapsedMs).toBeLessThanOrEqual(BUDGET_MS);
      await expect(elapsed).toHaveAttribute('data-within-budget', 'true');
      await expect(elapsed).toContainText('Last payment:');
    });

    await test.step('the receipt shows what §5.2 asks for', async () => {
      const receipt = page.getByTestId('cashier-receipt');
      await expect(receipt).toContainText(learnerName);
      await expect(receipt).toContainText('KES 1,500.00');
      await expect(receipt).toContainText('one thousand five hundred shillings');
      await expect(receipt).toContainText('Cash');
      // The allocation by vote head and the balance after the payment are both stated.
      await expect(receipt).toContainText('Allocated');
      await expect(receipt).toContainText(/TUITION|MEALS|TRANSPORT|Unallocated/);
      await expect(receipt).toContainText('Balance after');
      await expect(receipt).toContainText(/KES [\d,]+\.\d{2}/);
      // The number came from the sequences module, not from a count of rows.
      await expect(page.getByText(/RCT\/\d{4}\/\d{6}/)).toBeVisible();
    });

    await test.step('Enter prints the receipt and the flow restarts on the search', async () => {
      await page.keyboard.press('Enter');
      await expect(page.getByTestId('cashier-flow-step')).toHaveAttribute('data-step', 'learner');
    });

    await test.step('close the session with the counted cash and read the Z-report', async () => {
      await page.getByTestId('cashier-counted').fill(COUNTED);
      await page.getByTestId('cashier-close-session').click();

      const report = page.getByTestId('cashier-zreport');
      await expect(report).toBeVisible();
      await expect(report).toContainText('Cash');
      await expect(report).toContainText('KES 1,500.00');
      await expect(report).toContainText('Expected cash');
      await expect(report).toContainText('KES 2,000.00');
      await expect(page.getByTestId('cashier-zreport-variance')).toContainText('KES 0.00');
    });

    await test.step('reload: the session and its Z-report are still stored', async () => {
      await reloadAndWait(page);
      await go(page, '/finance/cashier-sessions');
      await expect(page.getByTestId('cashier-sessions-page')).toBeVisible({ timeout: LOAD_TIMEOUT });
      await expect(page.getByRole('cell', { name: 'closed' }).first()).toBeVisible();
      await page.getByRole('button', { name: 'Z-report' }).first().click();
      await expect(page.getByTestId('cashier-session-report')).toContainText('KES 2,000.00');
      await expect(page.getByTestId('cashier-session-report-variance')).toContainText('KES 0.00');
    });

    await test.step('no uncaught page errors during the journey', async () => {
      expect(pageErrors, `uncaught page errors:\n${pageErrors.join('\n')}`).toEqual([]);
    });
  });
});
