// ABOUTME: GP-2 setup portion: a transitional Kenyan secondary school sets up ke-844 beside ke-cbe in
// ABOUTME: one wizard run and comes out with two programmes, each pinned to its pack with its levels,
// ABOUTME: learning areas, schemes and scales installed and readable on the programme management page.
// ABOUTME:
// ABOUTME: SCOPED OUT (the rest of GP-2, owned by later tasks):
// ABOUTME: - pathway elective choice for Grade 10 learners and its combination rules (P2-E04 promotion and
// ABOUTME:   the admissions pathway picker);
// ABOUTME: - Form 4 mark entry with papers, the KCSE best-7 mean grade on F4 reports, separate fee
// ABOUTME:   schedules and one billing run across both programmes (P2-D03 report publishing, P3 billing).
// ABOUTME: This suite proves the setup half the card owns: the packs are installed and the programmes are real.

import playwright from '@playwright/test';

import { COLD_LOAD_TIMEOUT, LOAD_TIMEOUT, UI_TIMEOUT, completeSetup, go, signIn } from './goldenPathSupport';

const { test } = playwright;
const expect = playwright.expect.configure({ timeout: UI_TIMEOUT });

test.use({ navigationTimeout: COLD_LOAD_TIMEOUT, actionTimeout: UI_TIMEOUT });

const RUN = `${Date.now()}`;
const ADMIN = {
  username: `gp2-admin-${RUN}`,
  displayName: 'GP2 Administrator',
  password: 'gp2-admin-password',
};
const SCHOOL = {
  name: `Mwangaza Secondary ${RUN}`,
  motto: 'Rise and shine',
  address: 'P.O. Box 7, Kisumu',
  phone: '+254711000000',
  email: `office-${RUN}@mwangaza.test`,
};

test.describe('GP-2 golden path (setup)', () => {
  test('a school installs ke-844 beside ke-cbe and runs two programmes', async ({ page }) => {
    test.setTimeout(900_000);
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));

    await test.step('complete the wizard choosing both Kenyan packs', async () => {
      await completeSetup(page, {
        school: SCHOOL,
        classes: [
          { name: 'Form 1', streams: 'North, South' },
          { name: 'Form 2', streams: 'North' },
        ],
        admin: ADMIN,
        sampleData: false,
        packs: ['ke-844', 'ke-cbe'],
      });
      await signIn(page, ADMIN);
      await expect(page.locator('header')).toContainText(SCHOOL.name);
    });

    await test.step('the programme management page lists both programmes', async () => {
      await go(page, '/academics/programmes');
      await expect(page.getByRole('heading', { name: 'Programmes' })).toBeVisible({ timeout: LOAD_TIMEOUT });

      const table = page.getByTestId('programmes-table');
      await expect(table).toBeVisible({ timeout: LOAD_TIMEOUT });
      await expect(table).toContainText('ke-844@1.0.0');
      await expect(table).toContainText('ke-cbe@2026.1.0');

      // The transitional 8-4-4 programme: Forms 1-4, the KCSE learning areas and both KCSE scales.
      const secondary = page.getByTestId(/^programme-row-/).filter({ hasText: 'ke-844@1.0.0' });
      await expect(secondary).toContainText('4 levels');
      await expect(secondary).toContainText('13 learning areas');
      await expect(secondary).toContainText('2 grading scales');

      // The CBE programme sits beside it, not instead of it.
      const primary = page.getByTestId(/^programme-row-/).filter({ hasText: 'ke-cbe@2026.1.0' });
      await expect(primary).toContainText('14 levels');
      await expect(primary).toContainText('35 learning areas');
    });

    await test.step('each unreviewed pack is disclosed as unreviewed', async () => {
      await expect(page.getByText('Not reviewed by a curriculum officer').first()).toBeVisible({
        timeout: LOAD_TIMEOUT,
      });
      expect(await page.getByText('Not reviewed by a curriculum officer').count()).toBeGreaterThanOrEqual(2);
    });

    await test.step('reload: the programmes survived', async () => {
      await go(page, '/academics/programmes');
      await expect(page.getByTestId('programmes-table')).toContainText('ke-844@1.0.0', { timeout: LOAD_TIMEOUT });
      await expect(page.getByTestId('programmes-table')).toContainText('ke-cbe@2026.1.0');
    });

    await test.step('no uncaught page errors during setup', async () => {
      expect(pageErrors, `uncaught page errors:\n${pageErrors.join('\n')}`).toEqual([]);
    });
  });
});
