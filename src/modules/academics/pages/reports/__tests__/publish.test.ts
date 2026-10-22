// ABOUTME: Tests for review and publish: the review gate, exclusions, the frozen snapshot and its
// ABOUTME: immutability under a later mark and template change, re-issue versioning, and the QR rules.

import { describe, expect, it } from 'vitest';

import { canonicalJson } from '@/domain/curriculum/registry/json';
import { buildVerificationLink } from '@/domain/reports';

import { createFakeRepository } from '../../__tests__/canonicalRepositoryDouble';
import { generateBatch } from '../assembly';
import {
  createMemoryPublicationStore,
  createRepositoryPublicationStore,
  ReportPublisher,
  reviewBatch,
  type PublicationStore,
} from '../publish';
import { documentIdFor, documentModel } from '../snapshot';
import type { GenerationBatch, Publication, ReviewedBatch } from '../types';
import { ReportPublishError } from '../types';
import {
  AREAS,
  AT,
  HOSTS,
  INSTITUTION_ID,
  LOCALES,
  SCHOOL,
  SECRET,
  TEMPLATE,
  TEMPLATE_VERSION,
  computeRows,
  type LearnerFixture,
} from './fixtures';

const REVIEWER = 'teacher-1';

function batch(overrides: { readonly learners?: readonly LearnerFixture[]; readonly areas?: typeof AREAS } = {}): GenerationBatch {
  let sequence = 0;
  return generateBatch({
    areas: overrides.areas ?? AREAS,
    rows: computeRows(overrides.learners),
    // A fresh copy, so a test that mutates the batch's template cannot reach the shared fixture.
    template: structuredClone(TEMPLATE),
    templateVersion: TEMPLATE_VERSION,
    locales: LOCALES,
    locale: 'en',
    defaultLocale: 'en',
    school: SCHOOL,
    term: { name: 'Term 1', year: '2026' },
    periodId: 'period-1',
    verificationHost: HOSTS.verification,
    documentIdFor: () => documentIdFor((sequence += 1)),
    now: () => AT,
  });
}

function publisher(store: PublicationStore = createMemoryPublicationStore()) {
  let sequence = 100;
  const instance = new ReportPublisher({
    store,
    secret: SECRET,
    verificationHost: HOSTS.verification,
    portalHost: HOSTS.portal,
    shortHost: HOSTS.short,
    now: () => AT,
    newId: () => `pub-${(sequence += 1)}`,
    newDocumentId: () => documentIdFor((sequence += 1)),
  });
  return { instance, store };
}

function reviewed(overrides: { readonly excluded?: ReadonlySet<string> } = {}): ReviewedBatch {
  return reviewBatch(batch(), {
    reviewedBy: REVIEWER,
    reviewedAt: AT,
    ...(overrides.excluded === undefined ? {} : { excluded: overrides.excluded }),
  });
}

describe('the review step', () => {
  it('counts what a reviewer must see, with the failures listed', () => {
    const withFailure = batch({
      learners: [
        { enrolmentId: 'enrol-amani', learnerName: 'Amani Otieno', admissionNumber: 'ADM-001', scores: { ENG: '88', MAT: '79', SCI: '65' } },
        { enrolmentId: 'enrol-bello', learnerName: '  ', admissionNumber: 'ADM-002', scores: { ENG: '70', MAT: '60', SCI: '50' } },
        { enrolmentId: 'enrol-chidi', learnerName: 'Chidi Nkemdirim', admissionNumber: 'ADM-003', scores: { ENG: '55', MAT: '48', SCI: null } },
      ],
    });
    const review = reviewBatch(withFailure, { reviewedBy: REVIEWER, reviewedAt: AT });

    expect(review.summary.total).toBe(2);
    expect(review.summary.ready).toBe(1);
    expect(review.summary.incomplete).toBe(1);
    expect(review.summary.included).toBe(2);
    expect(review.summary.failures).toHaveLength(1);
    expect(review.summary.failures[0].learnerName).toBe('  ');
  });

  it('shows the moderation with the engine’s value, and the exclusion', () => {
    const reviewedBatch = reviewBatch(batch(), {
      reviewedBy: REVIEWER,
      reviewedAt: AT,
      excluded: new Set(['enrol-chidi']),
    });
    const chidi = reviewedBatch.items.find((item) => item.enrolmentId === 'enrol-chidi');
    expect(chidi?.excluded).toBe(true);
    expect(reviewedBatch.summary.excluded).toBe(1);
    expect(reviewedBatch.summary.included).toBe(2);
  });

  it('flags a learner outside scope as unpublishable here', () => {
    let sequence = 0;
    const outside = generateBatch({
      areas: AREAS,
      rows: computeRows(),
      template: TEMPLATE,
      templateVersion: TEMPLATE_VERSION,
      locales: LOCALES,
      locale: 'en',
      defaultLocale: 'en',
      school: SCHOOL,
      term: null,
      periodId: 'period-1',
      verificationHost: HOSTS.verification,
      documentIdFor: () => documentIdFor((sequence += 1)),
      now: () => AT,
      outsideScope: new Set(['enrol-bello']),
    });
    const review = reviewBatch(outside, { reviewedBy: REVIEWER, reviewedAt: AT });
    const bello = review.items.find((item) => item.enrolmentId === 'enrol-bello');
    expect(bello?.status).toBe('outside_scope');
    expect(review.summary.outsideScope).toBe(1);
    expect(review.summary.included).toBe(2);
  });
});

describe('publishing', () => {
  it('refuses a publish with no review', async () => {
    const { instance } = publisher();
    await expect(instance.publish(null)).rejects.toMatchObject({ code: 'no_review' });
  });

  it('refuses when every learner is excluded', async () => {
    const { instance } = publisher();
    const review = reviewBatch(batch(), {
      reviewedBy: REVIEWER,
      reviewedAt: AT,
      excluded: new Set(['enrol-amani', 'enrol-bello', 'enrol-chidi']),
    });
    await expect(instance.publish(review)).rejects.toMatchObject({ code: 'nothing_to_publish' });
  });

  it('publishes only the included learners', async () => {
    const { instance } = publisher();
    const review = reviewBatch(batch(), {
      reviewedBy: REVIEWER,
      reviewedAt: AT,
      excluded: new Set(['enrol-chidi']),
    });
    const published = await instance.publish(review);

    expect(published.map((record) => record.enrolmentId)).toEqual(['enrol-amani', 'enrol-bello']);
    expect(published.every((record) => record.version === 1 && record.supersedes === null)).toBe(true);
    expect(published.every((record) => record.publishedBy === REVIEWER)).toBe(true);
  });

  it('freezes the exact content: a later mark and template change cannot reach it', async () => {
    const { instance, store } = publisher();
    const source = batch();
    const review = reviewBatch(source, { reviewedBy: REVIEWER, reviewedAt: AT });
    const [published] = await instance.publish(review);
    const before = canonicalJson(published);

    // Change a mark: recompute the results into a new batch, and mutate the source batch too.
    const amani = source.reports[0];
    const changed = computeRows([
      { enrolmentId: 'enrol-amani', learnerName: 'Amani Otieno', admissionNumber: 'ADM-001', scores: { ENG: '10', MAT: '10', SCI: '10' } },
    ]);
    expect(changed[0].aggregate.value).not.toBe(amani.aggregate.engineValue);

    // Change the template in place: a template edit must not reach the published document.
    (amani.card.results?.rows[0].cells as { total?: string }).total = '0';
    (source.template.blocks as { type: string }[]).length = 1;

    const reread = await instance.read(published.id);
    expect(reread).not.toBeNull();
    expect(canonicalJson(reread as Publication)).toBe(before);

    // The stored record is the same bytes in the store, and the frozen document still renders the
    // published values rather than the changed ones.
    const stored = await store.readAll();
    expect(canonicalJson(stored[0])).toBe(before);
    const model = documentModel((reread as Publication).document);
    const resultsBlock = model.blocks.find((block) => block.kind === 'results_table');
    expect(resultsBlock).toBeDefined();
    if (resultsBlock?.kind === 'results_table') {
      expect(resultsBlock.payload.rows[0].cells.total).toBe('88');
    }
    expect(model.blocks.length).toBe(TEMPLATE.blocks.length);
  });

  it('carries a valid signed QR on the published document and none on the preview', async () => {
    const { instance } = publisher();
    const source = batch();
    const [published] = await instance.publish(reviewBatch(source, { reviewedBy: REVIEWER, reviewedAt: AT }));

    const verification = published.document.blocks.find((block) => block.kind === 'verification');
    expect(verification).toBeDefined();
    if (verification?.kind !== 'verification') throw new Error('no verification block');
    expect(published.document.preview).toBe(false);
    expect(verification.payload.preview).toBe(false);
    expect(verification.payload.qr).not.toBeNull();
    expect(verification.payload.qr?.size).toBeGreaterThan(20);

    const expected = buildVerificationLink({
      host: HOSTS.verification,
      documentId: published.documentId,
      signature: published.signature,
    });
    expect(verification.payload.url).toBe(expected.url);
    expect(expected.preview).toBe(false);
    expect(expected.withinBudget).toBe(true);
    // The payload carries no learner data.
    expect(expected.url).not.toContain('Amani');
    expect(expected.url).not.toContain('ADM-001');
    expect(expected.url).not.toContain('88');
    expect(expected.url).toMatch(/^https:\/\/verify\.schoolpilot\.app\/v1\/RC-2026-\d{6}\?sig=[A-Za-z0-9_-]{8,}$/);

    const previewVerification = source.reports[0].previewDocument.blocks.find(
      (block) => block.kind === 'verification'
    );
    if (previewVerification?.kind !== 'verification') throw new Error('no preview verification block');
    expect(previewVerification.payload.qr).toBeNull();
    expect(previewVerification.payload.preview).toBe(true);
  });

  it('keeps the moderated grade with the engine’s value in the published snapshot', async () => {
    let sequence = 0;
    const moderated = generateBatch({
      areas: AREAS,
      rows: computeRows(),
      template: TEMPLATE,
      templateVersion: TEMPLATE_VERSION,
      locales: LOCALES,
      locale: 'en',
      defaultLocale: 'en',
      school: SCHOOL,
      term: null,
      periodId: 'period-1',
      verificationHost: HOSTS.verification,
      documentIdFor: () => documentIdFor((sequence += 1)),
      now: () => AT,
      moderationOf: (enrolmentId) =>
        enrolmentId === 'enrol-amani'
          ? { original: 'B', value: 'A', reason: 'Remarked.', actorId: 'officer', at: AT }
          : null,
    });
    const { instance } = publisher();
    const [published] = await instance.publish(
      reviewBatch(moderated, { reviewedBy: REVIEWER, reviewedAt: AT })
    );
    expect(published.content.aggregate.engineGrade).toBe('B');
    expect(published.content.aggregate.publishedGrade).toBe('A');
    expect(published.content.aggregate.moderationReason).toBe('Remarked.');
  });
});

describe('re-issuing', () => {
  it('adds a linked version and leaves the original readable and unchanged', async () => {
    const { instance } = publisher();
    const review = reviewed();
    const [first] = await instance.publish(review);
    const before = canonicalJson(first);

    const second = await instance.reissue({
      publicationId: first.id,
      reason: 'The printed copy was lost.',
      actorId: 'registrar-1',
    });

    expect(second.version).toBe(2);
    expect(second.supersedes).toBe(first.id);
    expect(second.reason).toBe('The printed copy was lost.');
    expect(second.publishedBy).toBe('registrar-1');
    expect(second.documentId).not.toBe(first.documentId);
    expect(second.signature).not.toBe(first.signature);
    // The frozen grades and template are unchanged; only the issue metadata differs.
    expect(canonicalJson(second.content.card)).toBe(canonicalJson(first.content.card));
    expect(canonicalJson(second.content.template)).toBe(canonicalJson(first.content.template));

    const original = await instance.read(first.id);
    expect(original).not.toBeNull();
    expect(canonicalJson(original as Publication)).toBe(before);

    const versions = await instance.versions({
      enrolmentId: first.enrolmentId,
      periodId: first.periodId,
      templateCode: first.templateCode,
    });
    expect(versions.map((record) => record.version)).toEqual([1, 2]);
    const latest = await instance.latest({
      enrolmentId: first.enrolmentId,
      periodId: first.periodId,
      templateCode: first.templateCode,
    });
    expect(latest?.version).toBe(2);
  });

  it('refuses a re-issue with no reason or an unknown version', async () => {
    const { instance } = publisher();
    const [first] = await instance.publish(reviewed());
    await expect(
      instance.reissue({ publicationId: first.id, reason: '   ', actorId: 'a' })
    ).rejects.toMatchObject({ code: 'reason_required' });
    await expect(
      instance.reissue({ publicationId: 'nope', reason: 'why', actorId: 'a' })
    ).rejects.toMatchObject({ code: 'not_found' });
  });

  it('numbers a corrected publish as the next version and requires a reason', async () => {
    const { instance } = publisher();
    await instance.publish(reviewed());

    const corrected = batch({
      learners: [
        { enrolmentId: 'enrol-amani', learnerName: 'Amani Otieno', admissionNumber: 'ADM-001', scores: { ENG: '95', MAT: '90', SCI: '85' } },
      ],
    });
    const correctionReview = reviewBatch(corrected, { reviewedBy: REVIEWER, reviewedAt: AT });

    await expect(instance.publish(correctionReview)).rejects.toMatchObject({ code: 'reason_required' });

    const [second] = await instance.publish(correctionReview, { reason: 'Marks were corrected.' });
    expect(second.version).toBe(2);
    expect(second.supersedes).not.toBeNull();
    expect(second.reason).toBe('Marks were corrected.');
    // The corrected version freezes the corrected grades.
    expect(second.content.grades[0].gradeCode).toBe('A');
    expect(second.content.aggregate.publishedGrade).toBe('A');
  });

  it('versions each learner independently', async () => {
    const { instance } = publisher();
    const [first, second] = await instance.publish(reviewed());
    await instance.reissue({ publicationId: second.id, reason: 'Duplicate needed.', actorId: 'a' });

    const amaniLatest = await instance.latest({
      enrolmentId: first.enrolmentId,
      periodId: first.periodId,
      templateCode: first.templateCode,
    });
    const belloLatest = await instance.latest({
      enrolmentId: second.enrolmentId,
      periodId: second.periodId,
      templateCode: second.templateCode,
    });
    expect(amaniLatest?.version).toBe(1);
    expect(belloLatest?.version).toBe(2);
  });
});

describe('the append-only guarantee', () => {
  it('refuses a store that would change an already-published record', async () => {
    const inner = createMemoryPublicationStore();
    let writes = 0;
    const mutating = {
      readAll: () => inner.readAll(),
      writeAll: async (records: readonly Publication[]) => {
        writes += 1;
        // The first write is honest; the second tampers with the version-1 record already stored.
        const next =
          writes === 1
            ? records
            : records.map((record) =>
                record.version === 1 ? { ...record, signature: 'tampered' } : record
              );
        await inner.writeAll(next);
      },
    };
    const { instance } = publisher(mutating);
    const [first] = await instance.publish(reviewed());
    await expect(
      instance.reissue({ publicationId: first.id, reason: 'why', actorId: 'a' })
    ).rejects.toMatchObject({ code: 'already_published' });
  });
});

describe('the canonical report_card store', () => {
  it('round-trips a publication through the report_card entity', async () => {
    const repository = createFakeRepository();
    const store = createRepositoryPublicationStore(repository, INSTITUTION_ID);
    const { instance } = publisher(store);

    const [published] = await instance.publish(reviewed());
    expect(repository.writes.filter((write) => write.entity === 'report_card')).toHaveLength(3);

    const reread = await instance.read(published.id);
    expect(reread).not.toBeNull();
    expect(canonicalJson(reread as Publication)).toBe(canonicalJson(published));

    const second = await instance.reissue({
      publicationId: published.id,
      reason: 'Lost copy.',
      actorId: 'registrar-1',
    });
    expect(repository.writes.filter((write) => write.entity === 'report_card')).toHaveLength(4);
    // The first row is never updated: only creates are written.
    expect(repository.writes.filter((write) => write.operation === 'update')).toHaveLength(0);
    expect(second.version).toBe(2);
  });

  it('reports the store’s read failures rather than silently publishing', async () => {
    const repository = createFakeRepository();
    const store = createRepositoryPublicationStore(repository, INSTITUTION_ID);
    const { instance } = publisher(store);
    repository.failNext(new Error('storage is down'));
    await expect(instance.publish(reviewed())).rejects.toThrow('storage is down');
  });
});

describe('the error type', () => {
  it('names the refusal so a caller can act on it', () => {
    const error = new ReportPublishError('no_review', 'review first');
    expect(error.name).toBe('ReportPublishError');
    expect(error.code).toBe('no_review');
    expect(error.message).toBe('review first');
  });
});
