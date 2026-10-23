// ABOUTME: The billing run's acceptance, measured rather than asserted: 1,000 learners with
// ABOUTME: enrolments and a published schedule, previewed and posted, with the two durations the
// ABOUTME: spec names printed so a slow machine is reported rather than hidden.

import { describe, expect, it } from 'vitest';

import type { Id } from '@/domain/ids';

import { createBillingFixture, type BillingFixture } from './fixtures';

/** The acceptance of spec 05 §4: 1,000 learners. */
const LEARNERS = 1_000;
/** Preview in ≤ 30 s, post in ≤ 2 min. */
const PREVIEW_BUDGET_MS = 30_000;
const POST_BUDGET_MS = 120_000;

/**
 * Seeds the learners a run bills: one learner and one enrolment each, written in a single
 * transaction, because the harness's own write path is what a thousand one-by-one admissions would
 * otherwise spend the budget on.
 */
async function seedLearners(fixture: BillingFixture, count: number): Promise<readonly Id<'learner'>[]> {
  const { context } = fixture;
  const ids: Id<'learner'>[] = [];
  await context.repository.transaction(async () => {
    for (let index = 0; index < count; index += 1) {
      const admission = `PERF-${String(index + 1).padStart(4, '0')}`;
      const learner = await context.repository.create(
        'learner',
        context.seed.inputFor('learner', {
          admission_number: admission,
          residence_status: 'day',
          status: 'enrolled',
          admission_date: '2027-01-05',
        })
      );
      await context.repository.create(
        'enrolment',
        context.seed.inputFor('enrolment', {
          learner_id: learner.id,
          level_id: fixture.levelId,
          class_group_id: fixture.classGroupId,
          start_date: '2027-01-05',
          end_date: null,
          status: 'active',
        })
      );
      ids.push(learner.id);
    }
  });
  return ids;
}

/** A published schedule of one day cell pricing four fee items. */
async function publishPerfSchedule(fixture: BillingFixture): Promise<void> {
  const items = await Promise.all([
    fixture.feeItem('PERF-TUIT', 'Tuition', '4100'),
    fixture.feeItem('PERF-BOARD', 'Boarding and meals', '4200'),
    fixture.feeItem('PERF-LUNCH', 'Lunch', '4300'),
    fixture.feeItem('PERF-ACT', 'Activity', '4400'),
  ]);
  await fixture.publishSchedule({
    name: 'Perf 2027 Term 1',
    levelIds: [fixture.levelId],
    residences: ['day'],
    feeCategoryIds: [fixture.feeCategoryId],
    lines: items.map((feeItemId, index) => ({
      feeItemId,
      amountMinor: 100_000 + index * 25_000,
      levelId: fixture.levelId,
      residence: 'day' as const,
      prorationRule: 'pro_rata_days' as const,
    })),
  });
}

const seconds = (milliseconds: number): string => `${(milliseconds / 1000).toFixed(2)}s`;

describe('1,000 learners', () => {
  it(
    'previews in ≤ 30 s and posts in ≤ 2 min, and reports what it measured',
    async () => {
      const fixture = await createBillingFixture();
      try {
        await publishPerfSchedule(fixture);
        const learnerIds = await seedLearners(fixture, LEARNERS);
        const service = fixture.service();
        const request = fixture.request({ learnerIds });

        const previewStart = performance.now();
        const preview = await service.preview(request);
        const previewMs = performance.now() - previewStart;

        expect(preview.lines).toHaveLength(LEARNERS);
        expect(preview.totals.amount.amount_minor).toBe(
          LEARNERS * (100_000 + 125_000 + 150_000 + 175_000)
        );

        const postStart = performance.now();
        const outcome = await service.post(request);
        const postMs = performance.now() - postStart;

        expect(outcome.invoicesCreated).toBe(LEARNERS);
        expect(outcome.ledgerEntries).toBe(LEARNERS);

        process.stdout.write(
          `\n[billing perf] ${LEARNERS} learners: preview ${seconds(previewMs)} ` +
            `(budget ${seconds(PREVIEW_BUDGET_MS)}), post ${seconds(postMs)} ` +
            `(budget ${seconds(POST_BUDGET_MS)}) — ` +
            `${outcome.invoicesCreated} invoices, ${outcome.ledgerEntries} journal entries\n`
        );

        expect(previewMs, `preview took ${seconds(previewMs)}`).toBeLessThan(PREVIEW_BUDGET_MS);
        expect(postMs, `post took ${seconds(postMs)}`).toBeLessThan(POST_BUDGET_MS);

        // The re-run of the identical run is the cheapest of all: it writes nothing.
        const replayStart = performance.now();
        const replay = await service.post(request);
        const replayMs = performance.now() - replayStart;
        expect(replay.replayed).toBe(true);
        expect(replay.invoicesCreated).toBe(0);
        process.stdout.write(`[billing perf] idempotent re-run: ${seconds(replayMs)}, 0 invoices\n`);
      } finally {
        await fixture.close();
      }
    },
    15 * 60_000
  );
});
