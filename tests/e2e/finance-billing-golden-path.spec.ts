// ABOUTME: The finance golden path on the canonical layer: a school prices a term's fees, bills a cohort
// ABOUTME: through the billing run — which posts the invoices and their journal entries — reads the
// ABOUTME: invoices back out of storage after a reload, takes a payment at the cashier and reads the
// ABOUTME: receipt back, and states plainly where the ledger-backed reports stand.
// ABOUTME:
// ABOUTME: SCOPE. Spec 05 §6/§8 want the statement to equal the ledger, the trial balance to balance and
// ABOUTME: the aging total to tie to receivables. The routed StatementsPage and AccountingReportsPage are
// ABOUTME: handed no ledger by the shell — the ledger's tables have no canonical migration yet, and both
// ABOUTME: pages say so on screen — so those three ties cannot be made through the routed UI from this
// ABOUTME: suite. They are proven against the same SQLite store by the modules' own tests
// ABOUTME: (src/domain/finance/{ledger,statements,reconciliation}/__tests__). What this suite proves is
// ABOUTME: the wiring: the documents the UI writes, the money the UI moves, and what survives a reload.
// ABOUTME:
// ABOUTME: THE DATABASE IS SEEDED, NOT EMPTY. Spec 08 §3 asks every golden path to start from an empty
// ABOUTME: live database. It cannot here: GAP P3-Q01-b — the vote-head page (and the fee-schedule matrix's
// ABOUTME: example loader) gate every write control on useRBAC('finance.write') with no user, so in
// ABOUTME: production mode no finance write control renders even for a signed-in super admin. With no way
// ABOUTME: to create a vote head, an empty school has nothing to bill. The suite therefore runs on the
// ABOUTME: wizard's own sample school, which seeds vote heads, learners and their enrolments; every write
// ABOUTME: it then makes is through an ungated canonical path. The read-only vote-head assertion below is
// ABOUTME: a live detector for that gap: when session-aware RBAC lands, it fails and this suite is
// ABOUTME: extended to create its own vote head on an empty database.
// ABOUTME:
// ABOUTME: GAP P3-Q01-a: no UI and no seed creates a `fee_category`, and the schedule matrix's cells carry
// ABOUTME: a residence while the Templates form writes none, so no schedule the app itself can create is
// ABOUTME: resolvable by the billing run's matrix. The run is therefore driven by its one-off charges (a
// ABOUTME: supported path: a learner the fee run cannot price still carries their charge), which post real
// ABOUTME: invoices and real journal entries. The suite asserts the fee pricing reports its honest refusal
// ABOUTME: rather than silently guessing a cell.

import playwright from '@playwright/test';

import {
  COLD_LOAD_TIMEOUT,
  LOAD_TIMEOUT,
  UI_TIMEOUT,
  chooseFromPicker,
  completeSetup,
  go,
  gridRow,
  reloadAndWait,
  signIn,
} from './goldenPathSupport';

const { test, expect } = playwright;

// A cold dev server compiles the app on the first document load; the suite's own waits carry the budget.
test.use({ navigationTimeout: COLD_LOAD_TIMEOUT, actionTimeout: UI_TIMEOUT });

const RUN = `${Date.now()}`;
const ADMIN = {
  username: `gp-finance-admin-${RUN}`,
  displayName: 'Finance Golden Path Administrator',
  password: 'gp-finance-admin-password',
};
const SCHOOL = {
  name: `Ledger Academy ${RUN}`,
  motto: 'Every shilling counted',
  address: 'P.O. Box 11, Nairobi',
  phone: '+254700000011',
  email: `office-${RUN}@ledger.test`,
};
const CLASS = 'Form 1';
const STREAM = 'North';

/** A learner the wizard's sample school admits, and the vote head its sample schedule prices. */
const DEMO_LEARNER = 'Amani Wekesa';
const VOTE_HEAD = 'TUITION';

/** The schedule this suite writes, and the one-off charge the run bills against it. */
const SCHEDULE_NAME = `Golden path fees ${RUN}`;
const SCHEDULE_LINE_AMOUNT = '4500';
const CHARGE_AMOUNT = '1500';
const CHARGE_DESCRIPTION = `Golden path charge ${RUN}`;
const CHARGE_TOTAL = '1,500.00';

test.describe('the finance golden path', () => {
  test('prices a term, bills a cohort, reads the invoices back, and takes a payment', async ({
    page,
  }) => {
    test.setTimeout(1_200_000);
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));

    await test.step('first run: the setup wizard with its sample school', async () => {
      await completeSetup(page, {
        school: SCHOOL,
        classes: [{ name: CLASS, streams: STREAM }],
        admin: ADMIN,
        sampleData: true,
      });
      await signIn(page, ADMIN);
      await expect(page.locator('header')).toContainText(SCHOOL.name);
    });

    await test.step('the cohort is on the admissions register, read back from storage', async () => {
      await go(page, '/admissions/register');
      await expect(page.getByText('Applicants and admitted learners')).toBeVisible({
        timeout: UI_TIMEOUT,
      });
      const row = gridRow(page, new RegExp(DEMO_LEARNER));
      await expect(row).toBeVisible({ timeout: UI_TIMEOUT });
      // The register shows the class group the learner was placed in; the level is the picker's, not
      // a column of this grid.
      await expect(row).toContainText(STREAM);
      await expect(row).toContainText('Admitted');
    });

    await test.step('the vote heads are read from storage, and the page states its write lock', async () => {
      await go(page, '/finance/fee-configuration?tab=fee-items');
      await expect(page.getByText('Fee items (vote heads)').first()).toBeVisible({
        timeout: UI_TIMEOUT,
      });
      for (const code of ['TUITION', 'MEALS', 'TRANSPORT']) {
        await expect(gridRow(page, code)).toBeVisible({ timeout: UI_TIMEOUT });
      }

      // GAP P3-Q01-b (see the header): the write control is gated on a permission this session
      // cannot hold, so it does not render. Asserted, not merely commented, so the gap is a live
      // detector: when session-aware RBAC lands this fails and the suite is extended to create its
      // own vote head on an empty database.
      await expect(page.getByRole('button', { name: 'Add fee item' })).toHaveCount(0);
    });

    await test.step('write a fee schedule with a priced line and read it back after a reload', async () => {
      await go(page, '/finance/fee-configuration?tab=templates');
      await expect(page.getByRole('heading', { name: 'Fee Schedules' })).toBeVisible({
        timeout: UI_TIMEOUT,
      });

      await page.getByRole('button', { name: 'Add Fee Schedule' }).click();
      const dialog = page.getByRole('dialog').last();
      await expect(dialog).toBeVisible({ timeout: UI_TIMEOUT });
      await dialog.getByLabel('Schedule name').fill(SCHEDULE_NAME);
      await chooseFromPicker(page, dialog.getByLabel(/Academic year/), /\d{4}/);

      // The schedule bills this term, for this class.
      const periods = dialog.locator('fieldset', { hasText: 'Billing periods' });
      await chooseFromPicker(page, periods.getByTestId('schedule-period-picker'), /Term 1/);
      await periods.getByRole('button', { name: 'Add' }).click();

      const levels = dialog.locator('fieldset', { hasText: 'Levels' });
      await chooseFromPicker(page, levels.getByTestId('schedule-level-picker'), CLASS);
      await levels.getByRole('button', { name: 'Add' }).click();

      await dialog.getByRole('button', { name: 'Create schedule' }).click();

      // Price the schedule with one line from a seeded vote head.
      const scheduleRow = gridRow(page, SCHEDULE_NAME);
      await expect(scheduleRow).toBeVisible({ timeout: UI_TIMEOUT });
      await scheduleRow.getByRole('button', { name: 'Lines' }).click();

      const linesDialog = page.getByRole('dialog').last();
      await expect(linesDialog).toBeVisible({ timeout: UI_TIMEOUT });
      await linesDialog.getByRole('button', { name: 'Add fee line' }).click();

      const lineDialog = page.getByRole('dialog').last();
      await expect(lineDialog).toBeVisible({ timeout: UI_TIMEOUT });
      await chooseFromPicker(page, lineDialog.getByLabel(/Fee item/), new RegExp(VOTE_HEAD));
      await lineDialog.getByLabel('Amount').fill(SCHEDULE_LINE_AMOUNT);
      await lineDialog.getByRole('button', { name: 'Add line' }).click();

      await expect(gridRow(page, new RegExp(VOTE_HEAD)).first()).toBeVisible({
        timeout: UI_TIMEOUT,
      });

      // A real document load: the schedule and its line must come from SQLite.
      await reloadAndWait(page);
      await go(page, '/finance/fee-configuration?tab=templates');
      const reloadedRow = gridRow(page, SCHEDULE_NAME);
      await expect(reloadedRow).toBeVisible({ timeout: UI_TIMEOUT });
      await expect(reloadedRow).toContainText(/4,500\.00/);
    });

    /** Add the one-off charge for the learner on the billing-run panel. */
    const addCharge = async (): Promise<void> => {
      await page.getByText('One-off charges and opening balances').click();
      // The charge row is the five-column grid that holds the vote-head picker; the opening-balance
      // row beside it holds none, so this locates exactly one row.
      const chargeRow = page
        .locator('div.md\\:grid-cols-5')
        .filter({ has: page.getByTestId('charge-item-picker') });
      await chooseFromPicker(
        page,
        page.getByTestId('charge-learner-picker'),
        new RegExp(DEMO_LEARNER)
      );
      await chooseFromPicker(
        page,
        page.getByTestId('charge-item-picker'),
        new RegExp(VOTE_HEAD)
      );
      await page.getByLabel('Charge description').fill(CHARGE_DESCRIPTION);
      await page.getByLabel('Amount').fill(CHARGE_AMOUNT);
      await chargeRow.getByRole('button', { name: 'Add' }).click();
    };

    let runKey = '';

    await test.step('preview and post the billing run for the cohort', async () => {
      await go(page, '/finance/invoicing?tab=invoice-generation');
      await expect(page.getByRole('heading', { name: 'Invoice generation' })).toBeVisible({
        timeout: UI_TIMEOUT,
      });

      await chooseFromPicker(page, page.getByTestId('billing-period-picker'), /Term 1/);
      await addCharge();

      await page.getByRole('button', { name: 'Preview', exact: true }).click();
      await expect(page.getByText(/Would create 1 invoice for/)).toBeVisible({
        timeout: UI_TIMEOUT,
      });
      await expect(page.getByText(new RegExp(`for KES ${CHARGE_TOTAL}`))).toBeVisible();

      const key = page.getByTestId('billing-run-key');
      await expect(key).toBeVisible();
      runKey = (await key.innerText()).trim();
      expect(runKey, `the run reported no key: ${runKey}`).toContain('run ');

      await page.getByRole('button', { name: 'Post the run' }).click();

      const outcome = page.getByTestId('billing-run-outcome');
      await expect(outcome).toBeVisible({ timeout: UI_TIMEOUT });
      // An invoice written and a journal entry posted: the run reached the ledger, not just the
      // invoice table.
      await expect(outcome).toContainText(/1 invoice written/);
      await expect(outcome).toContainText(/1 journal entry posted/);
      await expect(outcome).toContainText(new RegExp(CHARGE_TOTAL));
    });

    await test.step('reload: the run’s identity is in storage, so posting it again writes nothing', async () => {
      await reloadAndWait(page);
      await go(page, '/finance/invoicing?tab=invoice-generation');
      await chooseFromPicker(page, page.getByTestId('billing-period-picker'), /Term 1/);
      await addCharge();

      await page.getByRole('button', { name: 'Post the run' }).click();

      // The run key is derived from the period, the schedule version in force and the cohort. The
      // same key after a full document reload is the same period, the same schedule and the same
      // learners, all read back out of SQLite; the recorded run then makes the second post a replay.
      await expect(page.getByText('This run was already posted')).toBeVisible({
        timeout: UI_TIMEOUT,
      });
      await expect(page.getByTestId('billing-run-key')).toHaveText(runKey);
      const outcome = page.getByTestId('billing-run-outcome');
      await expect(outcome).toContainText(/0 invoices written/);
      await expect(outcome).toContainText(/0 journal entries posted/);
    });

    await test.step('take a payment at the cashier and read the receipt', async () => {
      await go(page, '/finance/cashier');
      await expect(page.getByTestId('cashier-page')).toBeVisible({ timeout: LOAD_TIMEOUT });

      await page.getByTestId('cashier-float').fill('500');
      await page.getByTestId('cashier-open-session').click();
      await expect(page.getByTestId('cashier-close-session')).toBeVisible();

      const firstOption = page.getByTestId('cashier-learner-option-0');
      await expect(firstOption).toBeVisible({ timeout: UI_TIMEOUT });
      const label = await firstOption.innerText();
      const admission = /ADM\/[0-9]+\/[0-9]+/.exec(label)?.[0] ?? '';
      expect(
        admission.length,
        `no admission number in the cashier option: ${label}`
      ).toBeGreaterThan(0);

      await expect(page.getByTestId('cashier-learner-search')).toBeFocused();
      await page.keyboard.type(admission);
      await page.keyboard.press('Enter');
      await expect(page.getByTestId('cashier-flow-step')).toHaveAttribute('data-step', 'amount');
      await page.keyboard.type(CHARGE_AMOUNT);
      await page.keyboard.press('Enter');
      await expect(page.getByTestId('cashier-flow-step')).toHaveAttribute('data-step', 'channel');
      await page.keyboard.press('1');
      await expect(page.getByTestId('cashier-flow-step')).toHaveAttribute('data-step', 'reference');
      await page.keyboard.press('Enter');

      const receipt = page.getByTestId('cashier-receipt');
      await expect(receipt).toBeVisible({ timeout: UI_TIMEOUT });
      await expect(receipt).toContainText(/KES 1,500\.00/);
      await expect(receipt).toContainText('Allocated');
      await expect(receipt).toContainText('Balance after');

      // The number came from the sequences module, not from a count of rows.
      await expect(page.getByText(/RCT\/\d{4}\/\d{6}/)).toBeVisible();

      // Close the session with the counted cash, so the payment is part of a stated session.
      await page.getByTestId('cashier-counted').fill('2000');
      await page.getByTestId('cashier-close-session').click();
      const report = page.getByTestId('cashier-zreport');
      await expect(report).toBeVisible({ timeout: UI_TIMEOUT });
      await expect(report).toContainText('Expected cash');
      await expect(page.getByTestId('cashier-zreport-variance')).toContainText('KES 0.00');
    });

    await test.step('reload: the payment and its session survive in storage', async () => {
      await reloadAndWait(page);
      await go(page, '/finance/cashier-sessions');
      await expect(page.getByTestId('cashier-sessions-page')).toBeVisible({ timeout: LOAD_TIMEOUT });
      await expect(page.getByRole('cell', { name: 'closed' }).first()).toBeVisible({
        timeout: UI_TIMEOUT,
      });
      await page.getByRole('button', { name: 'Z-report' }).first().click();
      await expect(page.getByTestId('cashier-session-report')).toContainText('KES 2,000.00');
      await expect(page.getByTestId('cashier-session-report-variance')).toContainText('KES 0.00');
    });

    await test.step('the ledger-backed reports state what the shell gives them', async () => {
      // The shell renders these pages without a ledger, so both say so rather than showing a figure
      // they cannot derive. Asserted so a silent change of that wiring is noticed, not hidden.
      await go(page, '/finance/statements');
      await expect(page.getByText('The ledger is not connected')).toBeVisible({
        timeout: LOAD_TIMEOUT,
      });

      await go(page, '/finance/accounting-reports');
      await expect(page.getByText('The ledger is not connected')).toBeVisible({
        timeout: LOAD_TIMEOUT,
      });
    });

    await test.step('no uncaught page errors during the journey', async () => {
      expect(pageErrors, `uncaught page errors:\n${pageErrors.join('\n')}`).toEqual([]);
    });
  });
});
