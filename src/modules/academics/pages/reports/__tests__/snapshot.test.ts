// ABOUTME: Tests for the snapshot primitives: freezing and rehydrating a document, the canonical
// ABOUTME: content hash, the keyed signature and the opaque document id.

import { describe, expect, it } from 'vitest';

import { canonicalJson } from '@/domain/curriculum/registry/json';
import { resolveDocument } from '@/domain/reports';
import type { ReportBlockModel } from '@/domain/reports/types';

import {
  documentIdFor,
  documentModel,
  freezeDocument,
  hashSnapshotContent,
  keyedSignature,
  signSnapshot,
} from '../snapshot';
import type { SnapshotContent } from '../types';
import { HOSTS, LOCALES, SCHOOL, TEMPLATE, TEMPLATE_VERSION, computeRows, AT } from './fixtures';

const rows = computeRows();
const labelSource = { bundles: LOCALES, locale: 'en', defaultLocale: 'en' };

const content: SnapshotContent = {
  documentId: 'RC-2026-000001',
  issuedAt: AT,
  template: TEMPLATE,
  templateVersion: TEMPLATE_VERSION,
  locale: 'en',
  card: {
    school: SCHOOL,
    learner: { name: 'Amani Otieno', admissionNo: 'ADM-001' },
    results: { rows: [{ code: 'ENG', name: 'English', cells: { total: '88', grade: 'A' } }] },
  },
  grades: [
    { areaCode: 'ENG', areaName: 'English', percent: '88', gradeCode: 'A', gradeLabel: 'A' },
  ],
  aggregate: {
    code: 'overall',
    engineValue: '77.33',
    engineGrade: 'B',
    moderatedValue: null,
    moderationReason: null,
    moderationActorId: null,
    moderationAt: null,
    publishedGrade: 'B',
  },
};

function buildModel() {
  const report = rows[0];
  return resolveDocument({
    template: TEMPLATE,
    card: {
      school: SCHOOL,
      learner: { name: report.learnerName, admissionNo: report.admissionNumber },
      results: { rows: [], totals: null },
    },
    locales: LOCALES,
    locale: 'en',
    defaultLocale: 'en',
    documentId: 'RC-2026-000001',
    issuedAt: AT,
    verification: { host: HOSTS.verification, signature: '6Kq2x0Yb8m3TfWc' },
  });
}

describe('freezing a document', () => {
  it('round-trips the model: every field and every label survives', () => {
    const model = buildModel();
    const snapshot = freezeDocument(model, labelSource);
    const restored = documentModel(snapshot);

    expect(restored.documentId).toBe(model.documentId);
    expect(restored.title).toBe(model.title);
    expect(restored.locale).toBe(model.locale);
    expect(restored.dir).toBe(model.dir);
    expect(restored.page).toEqual(model.page);
    expect(restored.blocks).toEqual(model.blocks);
    expect(restored.furniture).toEqual(model.furniture);
    expect(restored.issuedAt).toBe(model.issuedAt);
    // The label lookup is rebuilt from the frozen source, so the render asks the same dictionary.
    expect(restored.labels.get('block.summary')).toBe(model.labels.get('block.summary'));
    expect(restored.labels.get('summary.moderated')).toBe('Moderated');
  });

  it('is a deep copy: a later change to the live model cannot reach the snapshot', () => {
    const model = buildModel();
    const snapshot = freezeDocument(model, labelSource);
    const before = canonicalJson(snapshot);

    const learnerBlock = model.blocks.find((block) => block.kind === 'learner');
    if (learnerBlock && learnerBlock.kind === 'learner') {
      (learnerBlock.payload as { learner: { name: string } }).learner.name = 'Changed Name';
    }
    (model.blocks as ReportBlockModel[]).length = 0;

    expect(canonicalJson(snapshot)).toBe(before);
    expect(documentModel(snapshot).blocks.length).toBeGreaterThan(0);
  });
});

describe('the snapshot hash', () => {
  it('is canonical: key order does not change it', () => {
    const reordered = {
      ...content,
      card: {
        learner: { admissionNo: 'ADM-001', name: 'Amani Otieno' },
        school: SCHOOL,
        results: { rows: [{ cells: { grade: 'A', total: '88' }, name: 'English', code: 'ENG' }] },
      },
    } as SnapshotContent;
    expect(hashSnapshotContent(reordered)).toBe(hashSnapshotContent(content));
  });

  it('changes when a frozen grade changes', () => {
    const changed: SnapshotContent = {
      ...content,
      aggregate: { ...content.aggregate, publishedGrade: 'A' },
    };
    expect(hashSnapshotContent(changed)).not.toBe(hashSnapshotContent(content));
  });
});

describe('the keyed signature', () => {
  it('is deterministic, base64url and 22 characters', () => {
    const first = keyedSignature('message', 'secret');
    expect(first).toBe(keyedSignature('message', 'secret'));
    expect(first).toMatch(/^[A-Za-z0-9_-]{22}$/);
  });

  it('changes with the secret and with the message', () => {
    expect(keyedSignature('message', 'secret')).not.toBe(keyedSignature('message', 'other'));
    expect(keyedSignature('message', 'secret')).not.toBe(keyedSignature('other', 'secret'));
  });

  it('signs document id + snapshot hash + issued-at', () => {
    const hash = hashSnapshotContent(content);
    const base = { documentId: content.documentId, snapshotHash: hash, issuedAt: content.issuedAt, secret: 's' };
    expect(signSnapshot(base)).toBe(signSnapshot(base));
    expect(signSnapshot({ ...base, issuedAt: '2027-01-01T00:00:00.000Z' })).not.toBe(signSnapshot(base));
    expect(signSnapshot({ ...base, documentId: 'RC-2026-000002' })).not.toBe(signSnapshot(base));
  });

  it('uses an injected signer when one is given', () => {
    const hash = hashSnapshotContent(content);
    const signature = signSnapshot({
      documentId: content.documentId,
      snapshotHash: hash,
      issuedAt: content.issuedAt,
      secret: 's',
      sign: (message) => `injected:${message.length}`,
    });
    expect(signature).toBe(`injected:${`${content.documentId}|${hash}|${content.issuedAt}`.length}`);
  });
});

describe('the document id', () => {
  it('is an opaque reference in the DR-05 shape', () => {
    const id = documentIdFor(123, 2026);
    expect(id).toBe('RC-2026-000123');
    expect(id).toMatch(/^[A-Za-z0-9][A-Za-z0-9._:-]{0,63}$/);
  });
});
