// ABOUTME: GP-2 setup portion (spec 08 section 3, "GP-2 Transitional secondary"): a school picks the
// ABOUTME: Kenyan 8-4-4 and CBE packs in one wizard run and comes out with two programmes, each pinned
// ABOUTME: to its pack with the pack's levels, learning areas, schemes and report templates installed,
// ABOUTME: readable on the programme management page, usable from the admission form, and disclosed as
// ABOUTME: unreviewed until a curriculum officer signs the pack off.
// ABOUTME:
// ABOUTME: SCOPE. The spec's GP-2 continues into Grade 10 pathway electives (combination rules enforced),
// ABOUTME: Form 4 mark entry with papers, the KCSE best-7 mean grade on F4 reports, separate fee
// ABOUTME: schedules and one billing run across both programmes. None of that is reachable from a fresh
// ABOUTME: school yet: the pathway/combination picker is not wired into admission (P2-E04 owns promotion,
// ABOUTME: not admission), the paper-level mark entry is the legacy exam-session page (GAP P1-E02), the
// ABOUTME: reports page resolves its template from the bundled ke-cbe pack rather than the installed
// ABOUTME: programme, and billing across two programmes is P3. This suite proves the half the phase built
// ABOUTME: and names the rest in the report.
// ABOUTME: - the aggregate "usable" proof here is the pack's own levels reaching the admission form's
// ABOUTME:   level picker, scoped to the programme the pack was installed as. A learner cannot be placed
// ABOUTME:   into a pack programme's class group yet, because class groups are created by the wizard's
// ABOUTME:   class step under the school's own programme and no canonical page creates one.

import playwright from '@playwright/test';

import {
  COLD_LOAD_TIMEOUT,
  LOAD_TIMEOUT,
  UI_TIMEOUT,
  chooseFromPicker,
  completeSetup,
  go,
  pickerOptions,
  signIn,
} from './goldenPathSupport';

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

    await test.step('the programme management page lists both programmes with their installed structure', async () => {
      await go(page, '/academics/programmes');
      await expect(page.getByRole('heading', { name: 'Programmes' })).toBeVisible({ timeout: LOAD_TIMEOUT });

      const table = page.getByTestId('programmes-table');
      await expect(table).toBeVisible({ timeout: LOAD_TIMEOUT });
      await expect(table).toContainText('ke-844@1.0.0');
      await expect(table).toContainText('ke-cbe@2026.1.0');

      // The transitional 8-4-4 programme: Forms 1-4, the KCSE learning areas, both scales, its scheme
      // and its two report templates.
      const secondary = page.getByTestId(/^programme-row-/).filter({ hasText: 'ke-844@1.0.0' });
      await expect(secondary).toContainText('4 levels');
      await expect(secondary).toContainText('13 learning areas');
      await expect(secondary).toContainText('2 grading scales');
      await expect(secondary).toContainText('1 scheme');
      await expect(secondary).toContainText('2 report templates');

      // The CBE programme sits beside it, not instead of it: PP1-G12, its own areas, schemes and reports.
      const cbe = page.getByTestId(/^programme-row-/).filter({ hasText: 'ke-cbe@2026.1.0' });
      await expect(cbe).toContainText('14 levels');
      await expect(cbe).toContainText('35 learning areas');
      await expect(cbe).toContainText('2 grading scales');
      await expect(cbe).toContainText('2 schemes');
      await expect(cbe).toContainText('3 report templates');
    });

    await test.step('the pack levels the wizard installed are the levels the admission form offers', async () => {
      // The admission form scopes its level picker to the chosen programme, so the levels offered for
      // the 8-4-4 programme are the ones its pack installed (Forms 1-4), not the school's own two.
      await go(page, '/admissions/admit');
      await expect(page.getByRole('heading', { name: 'Admit learner' })).toBeVisible({ timeout: LOAD_TIMEOUT });

      await chooseFromPicker(
        page,
        page.getByTestId('programme-picker'),
        'Kenya 8-4-4 Secondary (KCSE) - Forms 1 to 4'
      );
      const levels = await pickerOptions(page, page.getByTestId('level-picker'));
      expect(levels, `the 8-4-4 pack's levels:\n${levels.join('\n')}`).toEqual([
        'Form 1',
        'Form 2',
        'Form 3',
        'Form 4',
      ]);
    });

    await test.step('each unreviewed pack is disclosed as unreviewed', async () => {
      await go(page, '/academics/programmes');
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
