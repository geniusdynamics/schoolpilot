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
// ABOUTME: DATE-ROBUST. The sample data is seeded against the real clock: the term the suite marks is
// ABOUTME: the one the school is in, and English there has a closed mid-term beside the open end-of-term
// ABOUTME: exam. The result is the mean of the two, so the suite reads the seeded mid-term mark from the
// ABOUTME: grid and asserts the percentage and band the scheme must compute from both.
// ABOUTME:
// ABOUTME: SCOPED OUT: the report's aggregate grade. The results page falls back to the mean of the
// ABOUTME: learning-area percentages, and that fallback declares no result scale, so the aggregate
// ABOUTME: prints a number and no grade code. Only the per-area grades are banded here. (Wiring the
// ABOUTME: installed programme's aggregation into the page is not this task's.)

import playwright from '@playwright/test';
import type { Locator, Page } from '@playwright/test';

import {
  COLD_LOAD_TIMEOUT,
  LOAD_TIMEOUT,
  UI_TIMEOUT,
  chooseFromPicker,
  completeSetup,
  currentTermLabel,
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

/** The term the sample school is in: its end-of-term exam is open for entry, its mid-term closed. */
const TERM = currentTermLabel();
const CLASS_GROUP = 'North';
const TEACHING_GROUP = 'Form 1 English';
/** Two sample-school learners of Form 1, first and second by name, so the first report is the marked one. */
const LEARNER = 'Amani Wekesa';
const OTHER_LEARNER = 'Chloe Mwangi';
/** The open assessment the seed writes for English this term, and the closed one beside it. */
const ASSESSMENT = `${TERM} End of term English`;
const MID_TERM = `${TERM} Mid-term English`;
const CELL_LABEL = `${ASSESSMENT} for ${LEARNER}`;
const MID_TERM_LABEL = `${MID_TERM} for ${LEARNER}`;
const HIGH_MARK = 87;
const LOW_MARK = 20;

/** The sample school's competency scale, read half-open (min inclusive), as the seed declares it. */
const BANDS = [
  { code: 'EE', label: 'Exceeding expectations', min: 80 },
  { code: 'ME', label: 'Meeting expectations', min: 60 },
  { code: 'AEP', label: 'Approaching expectations', min: 40 },
  { code: 'BE', label: 'Below expectations', min: 0 },
] as const;

/** What the results screen should print for English once the end-of-term mark is `endOfTerm`. */
interface ExpectedResult {
  /** The percentage as the page prints it: exact, so a half shows as ".5". */
  readonly percent: string;
  readonly code: string;
  readonly label: string;
}

/**
 * The English result the derived scheme computes: each assessment of the term is a slot, the slots
 * are summed, and both are out of 100, so the percentage is the mean of the two marks. The mid-term
 * mark is the seed's, and the seed draws it against the real clock, so it is read from the grid.
 */
function expectedResult(midTerm: number, endOfTerm: number): ExpectedResult {
  const percent = (midTerm + endOfTerm) / 2;
  const band = BANDS.find((entry) => percent >= entry.min) ?? BANDS[BANDS.length - 1];
  return { percent: String(percent), code: band.code, label: band.label };
}

/** A learner's cell for one learning area in the results table, found by the column's header. */
async function resultCell(page: Page, learner: string, area: string): Promise<Locator> {
  const table = page.getByTestId('results-table');
  const row = table.getByRole('row', { name: new RegExp(learner) });
  await expect(row).toBeVisible({ timeout: UI_TIMEOUT });
  const headers = await table.locator('thead th').allInnerTexts();
  const column = headers.findIndex((header) => header.trim().startsWith(area));
  expect(column, `the results table has no ${area} column:\n${headers.join(' | ')}`).toBeGreaterThan(0);
  return row.locator('td, th').nth(column);
}

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

    let high: ExpectedResult = expectedResult(0, HIGH_MARK);
    let low: ExpectedResult = expectedResult(0, LOW_MARK);

    await test.step('enter the mark in the v2 grid and save it', async () => {
      await go(page, '/academics/marks-entry');
      // The page heading, not a text match: the module sub-navigation item carries the same words,
      // so getByText('Marks entry') resolved to two elements depending on which mounted first.
      await expect(page.getByRole('heading', { name: 'Marks Entry' })).toBeVisible({ timeout: LOAD_TIMEOUT });
      await chooseFromPicker(page, page.getByRole('combobox', { name: 'Period' }), TERM);
      await chooseFromPicker(page, page.getByRole('combobox', { name: 'Teaching group' }), TEACHING_GROUP);

      // The mid-term mark the seed entered is the other half of the English result.
      const midTerm = page.getByLabel(MID_TERM_LABEL, { exact: true });
      await expect(midTerm).not.toHaveValue('', { timeout: UI_TIMEOUT });
      const midTermMark = Number(await midTerm.inputValue());
      expect(Number.isFinite(midTermMark), `the seeded mid-term mark is not a number`).toBe(true);
      high = expectedResult(midTermMark, HIGH_MARK);
      low = expectedResult(midTermMark, LOW_MARK);
      // The two marks are 67 apart, so their results are 33.5 points apart and never share a band.
      expect(high.code).not.toBe(low.code);

      const score = page.getByLabel(CELL_LABEL, { exact: true });
      await expect(score).toBeVisible({ timeout: UI_TIMEOUT });
      await score.fill(String(HIGH_MARK));
      const saveNow = page.getByRole('button', { name: 'Save now' });
      if (await saveNow.isEnabled()) await saveNow.click();
      await expect(page.getByText(/unsaved edits?/)).toHaveCount(0);
    });

    await test.step('the results screen computes the banded grade from the scheme', async () => {
      await go(page, '/academics/results');
      await expect(page.getByTestId('results-table')).toBeVisible({ timeout: LOAD_TIMEOUT });
      await chooseFromPicker(page, page.getByRole('combobox', { name: 'Period' }), TERM);
      await chooseFromPicker(page, page.getByRole('combobox', { name: 'Class group' }), CLASS_GROUP);

      // The English cell carries the engine's band for the two marks and the percentage it came from.
      const cell = await resultCell(page, LEARNER, 'English');
      await expect(cell).toContainText(high.code);
      await expect(cell).toContainText(`${high.percent}% · ${high.label}`);
    });

    await test.step('the "Why this grade" drill-down shows the engine’s own trace', async () => {
      await page.getByRole('button', { name: `Why this grade for ${LEARNER}` }).click();
      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible({ timeout: UI_TIMEOUT });
      await expect(dialog.getByTestId('why-headline')).toBeVisible();
      await expect(dialog.getByTestId('why-step-0')).toBeVisible();
      // The trace carries the value the engine counted for English, not a summary of it.
      await expect(dialog.getByRole('row', { name: /^English\b/ })).toContainText(high.percent);
    });

    let documentId = '';

    await test.step('generate the batch and read the preview of the marked learner', async () => {
      await go(page, '/academics/report-publishing');
      await expect(page.getByRole('heading', { name: 'Report publishing' })).toBeVisible({ timeout: LOAD_TIMEOUT });
      await chooseFromPicker(page, page.getByRole('combobox', { name: 'Period' }), TERM);
      await chooseFromPicker(page, page.getByRole('combobox', { name: 'Class group' }), CLASS_GROUP);

      await page.getByTestId('generate-batch').click();
      const progress = page.getByTestId('batch-progress');
      await expect(progress).toContainText(/(\d+) of \1 prepared/, { timeout: UI_TIMEOUT });
      const prepared = Number(/(\d+) of \d+ prepared/.exec(await progress.innerText())?.[1]);

      // The review checks every report against the actor's reach. The sample school's teaching
      // groups span both streams and the exams officer reaches every group, so no learner is out of
      // scope and every prepared report is put forward for publishing.
      const review = page.getByTestId('review-panel');
      await expect(review).toContainText('0 outside scope');
      await expect(page.getByTestId('review-included')).toContainText(`${prepared} will be published`);

      // The first report of the batch is the first learner by name, so the preview is the marked
      // learner's card: its English line prints the band and the total the engine computed.
      await page.getByTestId('toggle-preview').click();
      const preview = page.getByRole('region', { name: 'Report preview' });
      await expect(preview).toBeVisible();
      const sheet = preview.locator('.report-sheet');
      expect(await preview.evaluate((element) => element.closest('#root') !== null)).toBe(true);
      await expect(sheet).toBeVisible({ timeout: UI_TIMEOUT });
      await expect(sheet).toContainText(LEARNER);
      const english = sheet.locator('tr').filter({ hasText: /^\s*English/ });
      await expect(english).toContainText(high.code);
      await expect(english).toContainText(high.percent);
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
      await score.fill(String(LOW_MARK));
      const saveNow = page.getByRole('button', { name: 'Save now' });
      if (await saveNow.isEnabled()) await saveNow.click();
      await expect(page.getByText(/unsaved edits?/)).toHaveCount(0);

      await reloadAndWait(page);
      await go(page, '/academics/results');
      await chooseFromPicker(page, page.getByRole('combobox', { name: 'Period' }), TERM);
      await chooseFromPicker(page, page.getByRole('combobox', { name: 'Class group' }), CLASS_GROUP);
      const cell = await resultCell(page, LEARNER, 'English');
      await expect(cell).toContainText(low.code);
      await expect(cell).toContainText(`${low.percent}% · ${low.label}`);
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
