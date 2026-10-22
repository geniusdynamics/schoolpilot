// ABOUTME: GP-5 (spec 08 section 3, "GP-5 Year-end rollover"): a promotion run computed from the pack's
// ABOUTME: progression rules, reviewed with a reasoned override, approved by the head teacher, committed
// ABOUTME: in one transaction, undone, and recommitted — then read back from the rest of the app as the
// ABOUTME: new class lists and the balances carried into the new year.
// ABOUTME:
// ABOUTME: WHY THE WIZARD RUNS TWICE. A rollover needs an opening year that has its own class groups;
// ABOUTME: the only screen that creates a class group is the setup wizard's class step, and it creates
// ABOUTME: them for the year the wizard records. The suite therefore completes the wizard once for the
// ABOUTME: year being closed, then re-runs it from Settings › School Profile for the year being opened.
// ABOUTME: The classes are named F1..F4 so the school's level codes match the pack's progression levels
// ABOUTME: (F1-F3 promote automatically, F4 graduates).
// ABOUTME:
// ABOUTME: WHY THE VERIFICATION COMES LAST. The run lives in the page's own state, and leaving the page
// ABOUTME: discards it, so the undo and the recommit happen before the app is read back. The run record
// ABOUTME: (counts, the override with its reason, the carried balances) is asserted at commit time; the
// ABOUTME: new class lists and the carried balance are then read from the student directory and the
// ABOUTME: financial summary, which read the same database the commit wrote.

import playwright from '@playwright/test';

import {
  COLD_LOAD_TIMEOUT,
  LOAD_TIMEOUT,
  UI_TIMEOUT,
  chooseFromPicker,
  completeSetup,
  go,
  gridRow,
  rerunSetupWizard,
  signIn,
} from './goldenPathSupport';

const { test } = playwright;
const expect = playwright.expect.configure({ timeout: UI_TIMEOUT });

test.use({ navigationTimeout: COLD_LOAD_TIMEOUT, actionTimeout: UI_TIMEOUT });

const RUN = `${Date.now()}`;
const YEAR = new Date().getFullYear();
const NEXT_YEAR = YEAR + 1;
const ADMIN = {
  username: `gp5-admin-${RUN}`,
  displayName: 'GP5 Head Teacher',
  password: 'gp5-admin-password',
};
const SCHOOL = {
  name: `Mwangaza Secondary ${RUN}`,
  motto: 'Rise and shine',
  address: 'P.O. Box 7, Kisumu',
  phone: '+254711000000',
  email: `office-${RUN}@mwangaza.test`,
};

/** Four classes with the pack's level codes, one stream each, so the stream name is unique per level. */
const CLASSES = [
  { name: 'F1', streams: 'North' },
  { name: 'F2', streams: 'North' },
  { name: 'F3', streams: 'North' },
  { name: 'F4', streams: 'North' },
];

/** The learner admitted into the terminal level, so the run has a graduate. */
const GRADUATE = {
  firstName: 'Zawadi',
  lastName: 'Njoroge',
  guardianGiven: 'Halima',
  guardianFamily: 'Njoroge',
  guardianPhone: '+254722000000',
};
const GRADUATE_NAME = `${GRADUATE.firstName} ${GRADUATE.lastName}`;
/** A demo learner in F1 North who is promoted: the new class list is read from this one. */
const PROMOTED = 'David Otieno';
/** A demo learner in F1 North whose suggestion is overridden to a repeat. */
const REPEATED = 'Amani Wekesa';
const OVERRIDE_REASON = 'Repeating F1 on the class council’s recommendation: the year was interrupted.';
/** KES 6,500 is billed for the term; the carried balance doubles it to 13,000. */
const BILLED_WITH_CARRY = 'KES 13,000.00';

test.describe('GP-5 year-end rollover', () => {
  test('a promotion run is computed, reviewed, approved, committed, undone and recommitted', async ({ page }) => {
    test.setTimeout(900_000);
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));

    await test.step('set up the year being closed, with the pack whose rules the run follows', async () => {
      await completeSetup(page, {
        school: SCHOOL,
        classes: CLASSES,
        admin: ADMIN,
        sampleData: true,
        packs: ['ke-844'],
        year: { name: `${YEAR}`, start: `${YEAR}-01-06`, end: `${YEAR}-11-30` },
      });
      await signIn(page, ADMIN);
      await expect(page.locator('header')).toContainText(SCHOOL.name);
    });

    await test.step('admit a learner into the terminal level, so the run has a graduate', async () => {
      await go(page, '/admissions/admit');
      await expect(page.getByRole('heading', { name: 'Admit learner' })).toBeVisible({ timeout: LOAD_TIMEOUT });
      await page.locator('[name=given_name]').fill(GRADUATE.firstName);
      await page.locator('[name=family_name]').fill(GRADUATE.lastName);
      await page.locator('[name=guardians\\.0\\.given_name]').fill(GRADUATE.guardianGiven);
      await page.locator('[name=guardians\\.0\\.family_name]').fill(GRADUATE.guardianFamily);
      await page.locator('[name=guardians\\.0\\.phone]').fill(GRADUATE.guardianPhone);
      await chooseFromPicker(page, page.getByTestId('programme-picker'), 'School Programme');
      await chooseFromPicker(page, page.getByTestId('level-picker'), 'F4');
      await chooseFromPicker(page, page.getByTestId('class-group-picker'), 'North');
      await page.getByTestId('admit-learner').click();
      const result = page.getByTestId('admission-result');
      await expect(result).toBeVisible({ timeout: UI_TIMEOUT });
      await expect(result).toContainText(GRADUATE_NAME);
      await expect(result).toContainText('Placed in North.');
    });

    await test.step('re-run the wizard to open the next year, with its own class groups', async () => {
      await rerunSetupWizard(page, {
        packs: ['ke-844'],
        year: { name: `${NEXT_YEAR}`, start: `${NEXT_YEAR}-01-06`, end: `${NEXT_YEAR}-11-30` },
        classes: CLASSES,
      });
    });

    await test.step('compute the run: every learner gets the pack’s suggestion, nobody is left undecided', async () => {
      await go(page, '/administration/promotion');
      await expect(page.getByRole('heading', { name: 'Promotion run' })).toBeVisible({ timeout: LOAD_TIMEOUT });
      await page.getByLabel('Year being closed', { exact: true }).selectOption({ label: `${YEAR}` });
      await page.getByLabel('Year being opened', { exact: true }).selectOption({ label: `${NEXT_YEAR}` });
      await page.getByTestId('promotion-compute').click();

      // 12 demo learners plus the admitted F4 learner; the pack promotes F1-F3 and graduates F4.
      await expect(
        page.getByText(/13 suggestion\(s\): 0 waiting for a decision, 0 with a conflict\./)
      ).toBeVisible({ timeout: UI_TIMEOUT });
      await expect(page.getByTestId('promotion-failure')).toHaveCount(0);
      await expect(page.getByTestId('promotion-conflicts')).toHaveCount(0);
      await expect(gridRow(page, GRADUATE_NAME)).toContainText('Graduate');
      await expect(gridRow(page, PROMOTED)).toContainText('Promote');
    });

    await test.step('override one suggestion with a reason', async () => {
      await page.getByRole('button', { name: `Override ${REPEATED}` }).click();
      const dialog = page.getByRole('dialog', { name: 'Override suggestion' });
      await expect(dialog).toBeVisible({ timeout: UI_TIMEOUT });
      await dialog.getByLabel('Decision', { exact: true }).selectOption({ label: 'Repeat' });
      await dialog.getByLabel('Reason', { exact: true }).fill(OVERRIDE_REASON);
      await dialog.getByTestId('promotion-override-save').click();
      await expect(dialog).toBeHidden({ timeout: UI_TIMEOUT });

      await expect(page.getByTestId('promotion-notice')).toContainText(`Override recorded for ${REPEATED}.`);
      const row = gridRow(page, REPEATED);
      await expect(row).toContainText('Repeat');
      await expect(row).toContainText('overridden');
      await expect(row).toContainText(OVERRIDE_REASON);
      // Nothing is applied on the council's behalf: the reviewer's decision is the only one recorded.
      await expect(page.getByTestId('promotion-conflicts')).toHaveCount(0);
    });

    await test.step('approve as the head teacher', async () => {
      await page.getByTestId('promotion-approve').click();
      await expect(page.getByTestId('promotion-notice')).toContainText('Approved by');
      await expect(page.getByTestId('promotion-failure')).toHaveCount(0);
    });

    await test.step('commit the run and read the record it writes', async () => {
      await page.getByTestId('promotion-commit').click();
      // 11 promoted (F1-F3 less the repeat), 1 repeated, 1 graduated, 12 balances carried into the new year.
      await expect(page.getByTestId('promotion-notice')).toContainText(
        'Committed: 11 promoted, 1 repeated, 1 graduated.'
      );
      const record = page.getByTestId('promotion-record');
      await expect(record).toBeVisible({ timeout: UI_TIMEOUT });
      await expect(record).toContainText('12 balance(s) carried');
      await expect(record).toContainText(`${OVERRIDE_REASON}`);
      await expect(record).toContainText('promote → repeat');
    });

    await test.step('undo the run, then commit it again', async () => {
      await page.getByTestId('promotion-undo').click();
      await expect(page.getByTestId('promotion-notice')).toContainText(
        'The promotion run was undone; the previous enrolments and class lists are restored.'
      );
      await expect(page.getByTestId('promotion-record')).toHaveCount(0);

      await page.getByTestId('promotion-commit').click();
      await expect(page.getByTestId('promotion-notice')).toContainText(
        'Committed: 11 promoted, 1 repeated, 1 graduated.'
      );
      await expect(page.getByTestId('promotion-record')).toContainText('12 balance(s) carried');
    });

    await test.step('the new class list is readable: the promoted learner is in the next level', async () => {
      await go(page, '/administration/students');
      await expect(page.getByText('Student Management')).toBeVisible({ timeout: LOAD_TIMEOUT });
      const row = gridRow(page, PROMOTED);
      await expect(row).toBeVisible({ timeout: UI_TIMEOUT });
      await expect(row).toContainText('F2');
      await expect(row).toContainText('North');

      // The repeated learner stayed in F1, and the graduate holds no active placement.
      const repeatedRow = gridRow(page, REPEATED);
      await expect(repeatedRow).toContainText('F1');
      const graduateRow = gridRow(page, GRADUATE_NAME);
      await expect(graduateRow).toBeVisible({ timeout: UI_TIMEOUT });
      await expect(graduateRow).not.toContainText('F4');
    });

    await test.step('the carried balance is billed to the learner in the new year', async () => {
      await go(page, '/finance/payments?tab=financial-summary');
      await expect(page.getByRole('heading', { name: 'Student financial summary', exact: true })).toBeVisible({
        timeout: LOAD_TIMEOUT,
      });
      await page.getByPlaceholder('Name or admission number').fill(PROMOTED);
      const row = gridRow(page, PROMOTED);
      await expect(row).toBeVisible({ timeout: UI_TIMEOUT });
      // The term's KES 6,500 plus the opening balance the run carried forward.
      await expect(row).toContainText(BILLED_WITH_CARRY);
    });

    await test.step('no uncaught page errors during the rollover', async () => {
      expect(pageErrors, `uncaught page errors:\n${pageErrors.join('\n')}`).toEqual([]);
    });
  });
});
