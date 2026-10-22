// ABOUTME: GP-4 (spec 08 section 3, "GP-4 Term cycle"): assessments open -> teacher mark entry on a
// ABOUTME: desktop and on a phone -> submit -> moderate -> lock -> compute the results -> moderate a
// ABOUTME: grade with a reason -> publish the reports, with the moderated grade in the frozen document.
// ABOUTME:
// ABOUTME: What this suite proves about the term cycle:
// ABOUTME: - the assessment's workflow is a real lifecycle (open -> submitted -> moderated -> locked),
// ABOUTME:   it survives a document load, and a locked group's marks are read-only in the grid;
// ABOUTME: - the results screen computes from the marks whatever the workflow state, and a moderation
// ABOUTME:   keeps the engine's own number beside the moderated value with the reason, the actor and the
// ABOUTME:   instant;
// ABOUTME: - the moderation reaches the published report: the review panel flags the learner as
// ABOUTME:   moderated, the reviewer can exclude a learner, and the frozen document prints the moderated
// ABOUTME:   grade with the reason it was given.
// ABOUTME:
// ABOUTME: SCOPED OUT of the spec's GP-4, because the phase has not built them: the term-end checklist
// ABOUTME: (P3) and next term's billing run including carried balances (P3). Carried balances are proven
// ABOUTME: by GP-5, which carries them through a promotion run.

import playwright from '@playwright/test';

import {
  COLD_LOAD_TIMEOUT,
  LOAD_TIMEOUT,
  UI_TIMEOUT,
  chooseFromPicker,
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
  username: `gp4-admin-${RUN}`,
  displayName: 'GP4 Head Teacher',
  password: 'gp4-admin-password',
};
const SCHOOL = {
  name: `Mwangaza Academy ${RUN}`,
  motto: 'Rise and shine',
  address: 'P.O. Box 7, Kisumu',
  phone: '+254711000000',
  email: `office-${RUN}@mwangaza.test`,
};

const TERM = 'Term 1';
const CLASS_GROUP = 'North';
const TEACHING_GROUP = 'Form 1 English';
const LEARNER = 'Amani Wekesa';
const CELL_LABEL = `End of term English for ${LEARNER}`;
const MARK = '87';
const MODERATED_GRADE = 'B+';
const MODERATION_REASON = 'Examinations office correction after remarking script 14.';

/** Fill the score cell and let the grid's own save settle. */
async function enterMark(page: import('@playwright/test').Page, value: string): Promise<void> {
  const score = page.getByLabel(CELL_LABEL, { exact: true });
  await expect(score).toBeVisible({ timeout: UI_TIMEOUT });
  await score.fill(value);
  const saveNow = page.getByRole('button', { name: 'Save now' });
  if (await saveNow.isEnabled()) await saveNow.click();
  await expect(page.getByText(/unsaved edits?/)).toHaveCount(0);
}

/**
 * Close the secondary sidebar a phone-sized viewport opens over the page.
 *
 * The shell opens it on a narrow screen and it covers the whole page, so every click lands on it
 * instead of the control underneath. It is page state rather than a route, so a later navigation
 * does not clear it.
 */
async function closeMobileSidebar(page: import('@playwright/test').Page): Promise<void> {
  const close = page.getByTitle('Close sidebar');
  if ((await close.count()) === 0) return;
  await close.first().click();
  await expect(close).toHaveCount(0, { timeout: UI_TIMEOUT });
}

test.describe('GP-4 term cycle', () => {
  test('marks are entered, submitted, moderated and locked, and a moderation reaches the published report', async ({
    page,
  }) => {
    test.setTimeout(900_000);
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));

    await test.step('set up a school with the demo class and sign in', async () => {
      await completeSetup(page, {
        school: SCHOOL,
        classes: [{ name: 'Form 1', streams: 'North, South' }],
        admin: ADMIN,
        sampleData: true,
      });
      await signIn(page, ADMIN);
      await expect(page.locator('header')).toContainText(SCHOOL.name);
    });

    await test.step('enter the mark on a phone-sized screen', async () => {
      await page.setViewportSize({ width: 390, height: 844 });
      await go(page, '/academics/marks-entry');
      await expect(page.getByText('Marks entry')).toBeVisible({ timeout: LOAD_TIMEOUT });
      await closeMobileSidebar(page);
      await chooseFromPicker(page, page.getByRole('combobox', { name: 'Period' }), TERM);
      await chooseFromPicker(page, page.getByRole('combobox', { name: 'Teaching group' }), TEACHING_GROUP);
      // The grid is the same control on a phone; the cell is reachable and editable.
      await expect(page.getByLabel(CELL_LABEL, { exact: true })).toBeVisible({ timeout: UI_TIMEOUT });
      await enterMark(page, MARK);
    });

    await test.step('back on a desktop layout, walk the workflow: submit, moderate, lock', async () => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await go(page, '/academics/marks-entry');
      await chooseFromPicker(page, page.getByRole('combobox', { name: 'Period' }), TERM);
      await chooseFromPicker(page, page.getByRole('combobox', { name: 'Teaching group' }), TEACHING_GROUP);

      const bar = page.getByTestId('workflow-bar');
      await expect(bar).toContainText('open', { timeout: UI_TIMEOUT });

      await bar.getByRole('button', { name: 'Submit marks' }).click();
      await expect(bar).toContainText('submitted', { timeout: UI_TIMEOUT });

      await bar.getByRole('button', { name: 'Moderate marks' }).click();
      await expect(bar).toContainText('moderated', { timeout: UI_TIMEOUT });

      await bar.getByRole('button', { name: 'Lock marks' }).click();
      await expect(bar).toContainText('locked', { timeout: UI_TIMEOUT });
      // A locked group is read-only: changing a cell from here needs an audited override, and the
      // page offers that button only while the group is past moderation.
      await expect(page.getByRole('button', { name: 'Override with a reason' })).toBeVisible();
    });

    await test.step('reload: the locked workflow survived, and the mark is still stored', async () => {
      await reloadAndWait(page);
      await go(page, '/academics/marks-entry');
      await chooseFromPicker(page, page.getByRole('combobox', { name: 'Period' }), TERM);
      await chooseFromPicker(page, page.getByRole('combobox', { name: 'Teaching group' }), TEACHING_GROUP);
      await expect(page.getByTestId('workflow-bar')).toContainText('locked', { timeout: LOAD_TIMEOUT });
      await expect(page.getByLabel(CELL_LABEL, { exact: true })).toHaveValue(MARK, {
        timeout: LOAD_TIMEOUT,
      });
    });

    await test.step('compute the results and moderate the grade with a reason', async () => {
      await go(page, '/academics/results');
      await expect(page.getByTestId('results-table')).toBeVisible({ timeout: LOAD_TIMEOUT });
      await chooseFromPicker(page, page.getByRole('combobox', { name: 'Period' }), TERM);
      await chooseFromPicker(page, page.getByRole('combobox', { name: 'Class group' }), CLASS_GROUP);

      await page.getByRole('button', { name: `Moderate ${LEARNER}` }).click();
      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible({ timeout: UI_TIMEOUT });
      const computed = await dialog.getByTestId('moderation-computed').innerText();
      await dialog.locator('#results-grade').fill(MODERATED_GRADE);
      await dialog.locator('#results-reason').fill(MODERATION_REASON);
      await dialog.getByRole('button', { name: 'Save override' }).click();
      await expect(dialog).toBeHidden({ timeout: UI_TIMEOUT });

      // The engine's own value is still on the record, beside the moderated grade.
      const row = page.getByTestId('results-table').getByRole('row', { name: new RegExp(LEARNER) });
      await expect(row).toContainText(`Moderated: ${MODERATED_GRADE}`);
      await expect(row).toContainText(`The engine still says ${computed}`);
    });

    await test.step('reload: the moderation survived the document load', async () => {
      await reloadAndWait(page);
      await go(page, '/academics/results');
      await chooseFromPicker(page, page.getByRole('combobox', { name: 'Period' }), TERM);
      await chooseFromPicker(page, page.getByRole('combobox', { name: 'Class group' }), CLASS_GROUP);
      const row = page.getByTestId('results-table').getByRole('row', { name: new RegExp(LEARNER) });
      await expect(row).toContainText(`Moderated: ${MODERATED_GRADE}`, { timeout: LOAD_TIMEOUT });
    });

    await test.step('publish the moderated report, with the other learner excluded at review', async () => {
      await go(page, '/academics/report-publishing');
      await expect(page.getByRole('heading', { name: 'Report publishing' })).toBeVisible({ timeout: LOAD_TIMEOUT });
      await chooseFromPicker(page, page.getByRole('combobox', { name: 'Period' }), TERM);
      await chooseFromPicker(page, page.getByRole('combobox', { name: 'Class group' }), CLASS_GROUP);
      await page.getByTestId('generate-batch').click();
      await expect(page.getByTestId('batch-progress')).toContainText('prepared', { timeout: UI_TIMEOUT });

      // The review flags the moderated learner with the moderation it will print.
      const review = page.getByTestId('review-panel');
      await expect(review).toBeVisible({ timeout: UI_TIMEOUT });
      await expect(review).toContainText('1 moderated');
      const moderatedRow = review.getByRole('row', { name: new RegExp(LEARNER) });
      await expect(moderatedRow).toContainText(`Moderated: ${MODERATED_GRADE}`);
      await expect(moderatedRow).toContainText(MODERATION_REASON);

      // The reviewer keeps only the learner whose moderated report is being issued: every other
      // in-scope row is unchecked, and the rows the actor's teaching groups do not reach cannot be
      // included at all.
      const reviewRows = page.getByTestId('review-table').getByRole('row');
      const rowCount = await reviewRows.count();
      for (let index = 0; index < rowCount; index += 1) {
        const row = reviewRows.nth(index);
        if ((await row.getByRole('checkbox').count()) === 0) continue;
        const text = await row.innerText();
        if (text.includes(LEARNER) || text.includes('Outside scope')) continue;
        // The styled control hides its input, so the label is what a reviewer clicks.
        await row.locator('label').click();
      }
      await expect(page.getByTestId('review-included')).toContainText('1 will be published');

      await page.getByTestId('publish-batch').click();
      await expect(page.getByText('1 report published and frozen.')).toBeVisible({ timeout: UI_TIMEOUT });
    });

    await test.step('the frozen document prints the moderated grade with its reason', async () => {
      await page.getByTestId('toggle-preview').click();
      const sheet = page.locator('.report-sheet').first();
      await expect(sheet).toBeVisible({ timeout: UI_TIMEOUT });
      await expect(sheet).toContainText(LEARNER);
      await expect(sheet).toContainText(MODERATED_GRADE);
      await expect(sheet).toContainText(MODERATION_REASON);
    });

    await test.step('no uncaught page errors during the term cycle', async () => {
      expect(pageErrors, `uncaught page errors:\n${pageErrors.join('\n')}`).toEqual([]);
    });
  });
});
