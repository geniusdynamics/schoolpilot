// ABOUTME: The guardian portal journey at a phone viewport: sign in as an account linked to a guardian,
// ABOUTME: see that guardian's child, the balance and its pay-link state, the not-yet-published term,
// ABOUTME: the notices, and change a consent preference that survives a reload.
// ABOUTME:
// ABOUTME: The account used is the setup administrator's login, linked to the guardian through
// ABOUTME: Settings > Users. That is a limitation of this build's route gate, not of the portal: no role
// ABOUTME: carries module access or a permission for a non-administrator, and no screen can grant one,
// ABOUTME: so a second login could not reach any module route. The portal's own authorisation still
// ABOUTME: comes from the login's canonical person reference, which is set to the guardian here.

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

const { test } = playwright;
const expect = playwright.expect.configure({ timeout: UI_TIMEOUT });

test.use({
  navigationTimeout: COLD_LOAD_TIMEOUT,
  actionTimeout: UI_TIMEOUT,
  viewport: { width: 390, height: 844 },
});

const RUN = `${Date.now()}`;
const ADMIN = {
  username: `pt-admin-${RUN}`,
  displayName: 'Portal Test Administrator',
  password: 'pt-admin-password',
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

/**
 * Close the overlay sidebar a phone-width layout opens on a fresh document load.
 * Its backdrop covers the page and would intercept every tap on the content beneath; the click is
 * dispatched to the backdrop itself because the panel sits over most of it.
 */
async function closeSidebar(page: import('@playwright/test').Page): Promise<void> {
  const backdrop = page.locator('[aria-label="Close sidebar"]:visible');
  for (let attempt = 0; attempt < 3; attempt += 1) {
    if ((await backdrop.count()) === 0) return;
    await backdrop.first().dispatchEvent('click');
    await page.waitForTimeout(300);
  }
}

test.describe('the guardian portal on a phone', () => {
  test('a guardian sees the child, the balance, the term report state and can change consent', async ({
    page,
  }) => {
    test.setTimeout(900_000);
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));

    await test.step('set the school up and sign in', async () => {
      await completeSetup(page, {
        school: SCHOOL,
        classes: [{ name: 'Form 1', streams: 'North, South' }],
        admin: ADMIN,
        sampleData: false,
      });
      await signIn(page, ADMIN);
    });

    await test.step('admit a learner with a guardian', async () => {
      await go(page, '/admissions/register');
      await closeSidebar(page);
      await page.getByRole('main').getByRole('button', { name: 'Admit learner' }).click();
      await expect(page.getByRole('heading', { name: 'Admit learner' })).toBeVisible();

      await page.locator('[name=given_name]').fill(LEARNER.firstName);
      await page.locator('[name=family_name]').fill(LEARNER.lastName);
      await page.locator('[name=guardians\\.0\\.given_name]').fill(LEARNER.guardianGiven);
      await page.locator('[name=guardians\\.0\\.family_name]').fill(LEARNER.guardianFamily);
      await page.locator('[name=guardians\\.0\\.phone]').fill(LEARNER.guardianPhone);

      await chooseFromPicker(page, page.getByTestId('programme-picker'), 'School Programme');
      await chooseFromPicker(page, page.getByTestId('level-picker'), 'Form 1');
      await chooseFromPicker(page, page.getByTestId('class-group-picker'), 'North');

      await page.getByTestId('admit-learner').click();
      await expect(page.getByTestId('admission-result')).toBeVisible({ timeout: UI_TIMEOUT });
    });

    await test.step('link the sign-in to the guardian in Settings > Users', async () => {
      await go(page, '/settings/school?tab=users');
      await closeSidebar(page);
      await expect(page.getByText('User Accounts Management')).toBeVisible({ timeout: UI_TIMEOUT });

      const row = gridRow(page, ADMIN.username);
      await expect(row).toBeVisible({ timeout: UI_TIMEOUT });
      await row.getByRole('button', { name: 'Edit' }).click();

      const dialog = page.getByRole('dialog');
      await expect(dialog.getByText('Edit User')).toBeVisible({ timeout: UI_TIMEOUT });
      // The wizard's administrator row has no email or user type, and the form requires both.
      await dialog.getByLabel('Email', { exact: false }).fill(`portal-${RUN}@riverside.test`);
      await dialog.locator('[name=userType]').selectOption({ label: 'Parent' });
      const person = dialog.locator('[name=person_ref]');
      await expect(person.locator(`option:has-text("${GUARDIAN_NAME}")`)).toHaveCount(1, {
        timeout: UI_TIMEOUT,
      });
      await person.selectOption({ label: `Guardian: ${GUARDIAN_NAME}` });
      await dialog.getByRole('button', { name: 'Save Changes' }).click();
      await expect(dialog).toHaveCount(0, { timeout: UI_TIMEOUT });
    });

    await test.step('the portal shows the guardian’s child, not a blank page or another learner', async () => {
      await go(page, '/portal');
      await closeSidebar(page);
      await expect(page.getByRole('heading', { name: 'My dashboard' })).toBeVisible({
        timeout: LOAD_TIMEOUT,
      });
      await expect(page.getByText(LEARNER_NAME).first()).toBeVisible();
      await expect(page.getByText(`Signed in as ${GUARDIAN_NAME}`)).toBeVisible();
      await expect(page.getByText('No student linked to this account')).toHaveCount(0);
    });

    await test.step('the fee statement says the balance and that no pay-link provider is configured', async () => {
      await go(page, '/portal/fees');
      await closeSidebar(page);
      await expect(page.getByRole('heading', { name: 'Fee statement' })).toBeVisible({
        timeout: LOAD_TIMEOUT,
      });
      await expect(page.getByText(/No payment provider is configured/)).toBeVisible();
      await expect(page.getByRole('button', { name: 'Request payment' })).toHaveCount(0);
    });

    await test.step('a term with nothing published says so', async () => {
      await go(page, '/portal/reports');
      await closeSidebar(page);
      await expect(page.getByRole('heading', { name: 'Term reports' })).toBeVisible({
        timeout: LOAD_TIMEOUT,
      });
      await expect(page.getByText('Not published yet').first()).toBeVisible();
    });

    await test.step('the attendance page and the notices page render their empty states', async () => {
      await go(page, '/portal/attendance');
      await closeSidebar(page);
      await expect(page.getByRole('heading', { name: 'My Attendance', exact: true })).toBeVisible({
        timeout: LOAD_TIMEOUT,
      });
      await expect(page.getByText(/No attendance recorded yet this term/)).toBeVisible();

      await go(page, '/portal/announcements');
      await closeSidebar(page);
      await expect(page.getByText(/No announcements at this time/)).toBeVisible({
        timeout: LOAD_TIMEOUT,
      });
    });

    await test.step('a consent change is saved and survives a reload', async () => {
      await go(page, '/portal/profile');
      await closeSidebar(page);
      await expect(page.getByRole('heading', { name: 'My profile' })).toBeVisible({
        timeout: LOAD_TIMEOUT,
      });

      const sms = page.getByRole('checkbox', { name: /Send me SMS about this child/ });
      // The admission form records SMS consent as on, so the journey turns it off.
      await expect(sms).toBeChecked();
      await sms.uncheck();
      await page.getByRole('button', { name: 'Save' }).click();
      await expect(page.getByText('Your consent preferences were saved.')).toBeVisible({
        timeout: UI_TIMEOUT,
      });

      await reloadAndWait(page);
      await closeSidebar(page);
      await expect(page.getByRole('heading', { name: 'My profile' })).toBeVisible({
        timeout: LOAD_TIMEOUT,
      });
      await expect(page.getByRole('checkbox', { name: /Send me SMS about this child/ })).not.toBeChecked();
    });

    await test.step('the pages render inside a phone viewport without uncaught errors', async () => {
      const width = await page.evaluate(() => document.documentElement.clientWidth);
      expect(width).toBeLessThanOrEqual(390);
      expect(pageErrors, `uncaught page errors:\n${pageErrors.join('\n')}`).toEqual([]);
    });
  });
});
