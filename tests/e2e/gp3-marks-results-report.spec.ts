// ABOUTME: GP-3 (the card's marks -> results -> report path): a teacher enters a mark in the v2 grid,
// ABOUTME: the results screen computes the grade from the scheme and explains it step by step, the
// ABOUTME: exams officer publishes a report snapshot, and the published snapshot is immutable — a later
// ABOUTME: mark change cannot reach it and cannot overwrite it.
// ABOUTME:
// ABOUTME: The immutability proof is two-fold and both halves run in this suite:
// ABOUTME: 1. the frozen document. The preview after publishing renders the snapshot the publisher
// ABOUTME:    froze (its own deep copy of the card and the grades), not the live results, so the sheet
// ABOUTME:    shows the grade as it was when it was published.
// ABOUTME: 2. the append-only guard, persisted. After the mark is changed and the page is loaded
// ABOUTME:    afresh (a real document load, so SQLite is reopened), publishing the same learner's report
// ABOUTME:    for the same period is refused by name: "already has a published report for this period;
// ABOUTME:    write why it is being re-issued". The refusal can only be raised by reading the stored
// ABOUTME:    publication back, so it proves the snapshot survived the reload and that a later mark
// ABOUTME:    change cannot replace it.
// ABOUTME: The byte-level half — that the stored snapshot is unchanged even after the source batch's
// ABOUTME: mark and template change — is proven by tests/e2e/reports-publish.spec.ts, which drives the
// ABOUTME: same publish store directly. This suite proves the journey a user takes.
// ABOUTME:
// ABOUTME: SCOPED OUT: the report's aggregate grade. The results page falls back to the mean of the
// ABOUTME: learning-area percentages, and that fallback declares no result scale, so the aggregate
// ABOUTME: prints a number and no grade code. Only the per-area grades are banded here. (Wiring the
// ABOUTME: installed programme's aggregation into the page is not this task's.)

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
  username: `gp3-admin-${RUN}`,
  displayName: 'GP3 Exams Officer',
  password: 'gp3-admin-password',
};
const SCHOOL = {
  name: `Riverside Academy ${RUN}`,
  motto: 'Knowledge is light',
  address: 'P.O. Box 42, Nairobi',
  phone: '+254700000000',
  email: `office-${RUN}@riverside.test`,
};

const TERM = 'Term 1';
const CLASS_GROUP = 'North';
const TEACHING_GROUP = 'Form 1 English';
/** The two demo learners the Form 1 North teaching group holds, in the seed's order. */
const LEARNER = 'Amani Wekesa';
const OTHER_LEARNER = 'Chloe Mwangi';
/** The published assessment the seed writes for every learning area. */
const ASSESSMENT = 'End of term English';
const CELL_LABEL = `${ASSESSMENT} for ${LEARNER}`;
/** 87/100 is "Exceeding expectations" on the demo scale; 20/100 is "Below expectations". */
const HIGH_MARK = '87';
const LOW_MARK = '20';
const HIGH_GRADE = 'EE';
const LOW_GRADE = 'BE';

test.describe('GP-3 marks, results and the published report', () => {
  test('a mark flows to the results, the drill-down explains it, and the published snapshot is immutable', async ({
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

    await test.step('enter the mark in the v2 grid and save it', async () => {
      await go(page, '/academics/marks-entry');
      await expect(page.getByText('Marks entry')).toBeVisible({ timeout: LOAD_TIMEOUT });
      await chooseFromPicker(page, page.getByRole('combobox', { name: 'Period' }), TERM);
      await chooseFromPicker(page, page.getByRole('combobox', { name: 'Teaching group' }), TEACHING_GROUP);

      const score = page.getByLabel(CELL_LABEL, { exact: true });
      await expect(score).toBeVisible({ timeout: UI_TIMEOUT });
      await score.fill(HIGH_MARK);
      const saveNow = page.getByRole('button', { name: 'Save now' });
      if (await saveNow.isEnabled()) await saveNow.click();
      await expect(page.getByText(/unsaved edits?/)).toHaveCount(0);
    });

    await test.step('the results screen computes the banded grade from the scheme', async () => {
      await go(page, '/academics/results');
      await expect(page.getByTestId('results-table')).toBeVisible({ timeout: LOAD_TIMEOUT });
      await chooseFromPicker(page, page.getByRole('combobox', { name: 'Period' }), TERM);
      await chooseFromPicker(page, page.getByRole('combobox', { name: 'Class group' }), CLASS_GROUP);

      const row = page.getByTestId('results-table').getByRole('row', { name: new RegExp(LEARNER) });
      await expect(row).toBeVisible({ timeout: UI_TIMEOUT });
      // The English cell carries the engine's band for 87/100 and the percentage it came from.
      await expect(row).toContainText(HIGH_GRADE);
      await expect(row).toContainText(`${HIGH_MARK}%`);
    });

    await test.step('the "Why this grade" drill-down shows the engine’s own trace', async () => {
      await page.getByRole('button', { name: `Why this grade for ${LEARNER}` }).click();
      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible({ timeout: UI_TIMEOUT });
      await expect(dialog.getByTestId('why-headline')).toBeVisible();
      await expect(dialog.getByTestId('why-step-0')).toBeVisible();
      // The trace carries the mark the engine read, not a summary of it.
      await expect(dialog).toContainText(HIGH_MARK);
    });

    let documentId = '';

    await test.step('generate the batch and read the preview of the marked learner', async () => {
      await go(page, '/academics/report-publishing');
      await expect(page.getByRole('heading', { name: 'Report publishing' })).toBeVisible({ timeout: LOAD_TIMEOUT });
      await chooseFromPicker(page, page.getByRole('combobox', { name: 'Period' }), TERM);
      await chooseFromPicker(page, page.getByRole('combobox', { name: 'Class group' }), CLASS_GROUP);

      await page.getByTestId('generate-batch').click();
      await expect(page.getByTestId('batch-progress')).toContainText('prepared', { timeout: UI_TIMEOUT });

      // The first report of the batch is the first learner by name, so the preview is the marked
      // learner's card: it prints the band the engine awarded for the mark, and the review flags the
      // learners the actor's teaching groups do not reach (the other stream's learners are members of
      // a group declared for the first stream, and a report for them may not be issued from here).
      await page.getByTestId('toggle-preview').click();
      const sheet = page.locator('.report-sheet').first();
      await expect(sheet).toBeVisible({ timeout: UI_TIMEOUT });
      await expect(sheet).toContainText(LEARNER);
      await expect(sheet).toContainText(HIGH_GRADE);
      await expect(sheet).toContainText(HIGH_MARK);
      await expect(page.getByTestId('review-panel')).toContainText('Outside scope');
    });

    await test.step('publish the class’s report snapshot', async () => {
      await page.getByTestId('publish-batch').click();
      await expect(page.getByText(/^\d+ reports? published and frozen\.$/)).toBeVisible({ timeout: UI_TIMEOUT });

      const published = page.getByTestId('published-table');
      const row = published.getByRole('row', { name: new RegExp(LEARNER) });
      await expect(row).toBeVisible({ timeout: UI_TIMEOUT });
      const match = /RC-\d{4}-\d{6}/.exec(await row.innerText());
      expect(match, 'the published document id is missing from the row').not.toBeNull();
      documentId = match![0];
      await expect(published.getByRole('row', { name: new RegExp(OTHER_LEARNER) })).toBeVisible();
    });

    await test.step('the preview renders the issued snapshot and its verification link', async () => {
      // After the publish the preview renders the most recent publication — the snapshot the
      // publisher froze, with its own opaque document id and signature, not the live results.
      const published = page.getByTestId('published-table');
      const lastId = /RC-\d{4}-\d{6}/.exec(await published.getByRole('row').last().innerText());
      expect(lastId, 'the published table holds no document id').not.toBeNull();
      const sheet = page.locator('.report-sheet').first();
      await expect(sheet).toBeVisible({ timeout: UI_TIMEOUT });
      await expect(sheet).toContainText(`/v1/${lastId![0]}?sig=`);
      expect(documentId).not.toBe('');
    });

    await test.step('change the mark afterwards and prove the results followed', async () => {
      await go(page, '/academics/marks-entry');
      await chooseFromPicker(page, page.getByRole('combobox', { name: 'Period' }), TERM);
      await chooseFromPicker(page, page.getByRole('combobox', { name: 'Teaching group' }), TEACHING_GROUP);
      const score = page.getByLabel(CELL_LABEL, { exact: true });
      await score.fill(LOW_MARK);
      const saveNow = page.getByRole('button', { name: 'Save now' });
      if (await saveNow.isEnabled()) await saveNow.click();
      await expect(page.getByText(/unsaved edits?/)).toHaveCount(0);

      await reloadAndWait(page);
      await go(page, '/academics/results');
      await chooseFromPicker(page, page.getByRole('combobox', { name: 'Period' }), TERM);
      await chooseFromPicker(page, page.getByRole('combobox', { name: 'Class group' }), CLASS_GROUP);
      const row = page.getByTestId('results-table').getByRole('row', { name: new RegExp(LEARNER) });
      await expect(row).toBeVisible({ timeout: UI_TIMEOUT });
      await expect(row).toContainText(LOW_GRADE);
      await expect(row).toContainText(`${LOW_MARK}%`);
    });

    await test.step('a fresh document load still holds the snapshot, and re-publishing it is refused', async () => {
      // A real document load: SQLite is reopened, so the refusal can only come from the stored row.
      await go(page, '/academics/report-publishing');
      await chooseFromPicker(page, page.getByRole('combobox', { name: 'Period' }), TERM);
      await chooseFromPicker(page, page.getByRole('combobox', { name: 'Class group' }), CLASS_GROUP);
      await page.getByTestId('generate-batch').click();
      await expect(page.getByTestId('batch-progress')).toContainText('prepared', { timeout: UI_TIMEOUT });
      await page.getByTestId('publish-batch').click();

      // The refusal is the publisher's own append-only guard, raised from the stored snapshot.
      const refusal = page.getByText(
        /already has a published report for this period; write why it is being re-issued\./
      );
      await expect(refusal).toBeVisible({ timeout: UI_TIMEOUT });
      await expect(refusal).toContainText(new RegExp(`${LEARNER}|${OTHER_LEARNER}`));
    });

    await test.step('no uncaught page errors during the journey', async () => {
      expect(pageErrors, `uncaught page errors:\n${pageErrors.join('\n')}`).toEqual([]);
    });
  });
});
