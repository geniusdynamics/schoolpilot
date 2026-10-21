// ABOUTME: GP-6 golden path on the canonical layer: a fresh setup admits a learner with a guardian and the
// ABOUTME: admissions register and the administration directory both show the learner, the guardian and the placement.
// ABOUTME:
// ABOUTME: SCOPE: the canonical registry models the admission itself (learner, guardians, links, identifiers and
// ABOUTME: enrolment). It does not yet model an admission application, screening, interview, offer or acceptance
// ABOUTME: (GAP P1-E04: application/review/interview forms still read the legacy collections), so this suite covers
// ABOUTME: the registrar's direct admission end to end and stops there.

import playwright from '@playwright/test';

import {
  COLD_LOAD_TIMEOUT,
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
  username: `gp6-admin-${RUN}`,
  displayName: 'GP6 Registrar',
  password: 'gp6-admin-password',
};
const SCHOOL = {
  name: `Riverside Academy ${RUN}`,
  motto: 'Knowledge is light',
  address: 'P.O. Box 42, Nairobi',
  phone: '+254700000000',
  email: `office-${RUN}@riverside.test`,
};
const LEARNER = {
  firstName: 'Amina',
  lastName: 'Wanjiku',
  guardianGiven: 'Grace',
  guardianFamily: 'Mwangi',
  guardianPhone: '+254711000000',
};
const LEARNER_NAME = `${LEARNER.firstName} ${LEARNER.lastName}`;
const GUARDIAN_NAME = `${LEARNER.guardianGiven} ${LEARNER.guardianFamily}`;

test.describe('GP-6 admission path', () => {
  test('a fresh school admits a learner with a guardian, and both registers show them', async ({ page }) => {
    test.setTimeout(900_000);
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));

    await test.step('first run: complete the setup wizard without sample data', async () => {
      await completeSetup(page, {
        school: SCHOOL,
        classes: [{ name: 'Form 1', streams: 'North, South' }],
        admin: ADMIN,
        sampleData: false,
      });
      await signIn(page, ADMIN);
    });

    await test.step('the admissions register starts empty', async () => {
      await go(page, '/admissions/register');
      await expect(page.getByText('Applicants and admitted learners')).toBeVisible({
        timeout: UI_TIMEOUT,
      });
      await expect(page.getByText('No learner matches this view.')).toBeVisible({
        timeout: UI_TIMEOUT,
      });
    });

    let admissionNumber = '';

    await test.step('admit a learner and a guardian through the admission form', async () => {
      await page.getByRole('button', { name: 'Admit learner' }).click();
      await expect(page.getByRole('heading', { name: 'Admit learner' })).toBeVisible({
        timeout: UI_TIMEOUT,
      });

      await page.locator('[name=given_name]').fill(LEARNER.firstName);
      await page.locator('[name=family_name]').fill(LEARNER.lastName);
      await page.locator('[name=guardians\\.0\\.given_name]').fill(LEARNER.guardianGiven);
      await page.locator('[name=guardians\\.0\\.family_name]').fill(LEARNER.guardianFamily);
      await page.locator('[name=guardians\\.0\\.phone]').fill(LEARNER.guardianPhone);

      // The placement is three canonical pickers, not one legacy class-stream select.
      await chooseFromPicker(page, page.getByTestId('programme-picker'), 'School Programme');
      await chooseFromPicker(page, page.getByTestId('level-picker'), 'Form 1');
      await chooseFromPicker(page, page.getByTestId('class-group-picker'), 'North');

      await page.getByTestId('admit-learner').click();

      const result = page.getByTestId('admission-result');
      await expect(result).toBeVisible({ timeout: UI_TIMEOUT });
      await expect(result).toContainText(LEARNER_NAME);
      await expect(result).toContainText('1 guardian created and linked.');
      await expect(result).toContainText('1 guardian link written.');
      await expect(result).toContainText('Placed in North.');

      const text = await result.innerText();
      const match = /ADM\/\d{4}\/\d+/.exec(text);
      expect(match, `the admission number is missing from the result:\n${text}`).not.toBeNull();
      admissionNumber = match![0];
    });

    await test.step('the admissions register shows the learner, the class group, the guardian and the admission', async () => {
      await go(page, '/admissions/register');
      const row = gridRow(page, admissionNumber);
      await expect(row).toBeVisible({ timeout: UI_TIMEOUT });
      await expect(row).toContainText(LEARNER_NAME);
      await expect(row).toContainText('North');
      await expect(row).toContainText(GUARDIAN_NAME);
      await expect(row).toContainText('Admitted');
      // A disabled editor means no primary guardian is linked; enabled proves the link row exists.
      await expect(row.getByRole('button', { name: 'Edit guardian' })).toBeEnabled();
    });

    await test.step('the administration student directory shows the same learner and guardian', async () => {
      await go(page, '/administration/students');
      await expect(page.getByText('Student Management')).toBeVisible({ timeout: UI_TIMEOUT });
      const row = gridRow(page, admissionNumber);
      await expect(row).toBeVisible({ timeout: UI_TIMEOUT });
      await expect(row).toContainText(LEARNER_NAME);
      await expect(row).toContainText('Form 1');
      await expect(row).toContainText('North');
      await expect(row).toContainText(GUARDIAN_NAME);
    });

    await test.step('reload: the admission survives in both registers', async () => {
      await reloadAndWait(page);
      const directoryRow = gridRow(page, admissionNumber);
      await expect(directoryRow).toBeVisible({ timeout: UI_TIMEOUT });
      await expect(directoryRow).toContainText(LEARNER_NAME);
      await expect(directoryRow).toContainText(GUARDIAN_NAME);

      await go(page, '/admissions/register');
      const registerRow = gridRow(page, admissionNumber);
      await expect(registerRow).toBeVisible({ timeout: UI_TIMEOUT });
      await expect(registerRow).toContainText(LEARNER_NAME);
      await expect(registerRow).toContainText(GUARDIAN_NAME);
    });

    await test.step('no uncaught page errors during the admission', async () => {
      expect(pageErrors, `uncaught page errors:\n${pageErrors.join('\n')}`).toEqual([]);
    });
  });
});
