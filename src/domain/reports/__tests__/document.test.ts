// ABOUTME: The document resolver: ordered blocks from the template, every block's empty state, the
// ABOUTME: verification block's published/preview semantics, furniture text and page direction.

import { describe, expect, it } from 'vitest';
import { resolveDocument } from '../document';
import {
  A5_TEMPLATE,
  EMPTY_CARD,
  FULL_CARD,
  LANDSCAPE_TEMPLATE,
  LOCALES,
  LONG_COMMENT_CARD,
  PRIMARY_TERM_TEMPLATE,
  RTL_CARD,
  SENIOR_TERM_TEMPLATE,
  VERIFICATION,
  WIDE_CARD,
} from '../__fixtures__/cards';
import type { ReportBlockModel, ReportCardData, ReportTemplate } from '../types';

const documentId = 'RC-2026-000123';
const issuedAt = '2026-10-21';

const build = (overrides: Partial<Parameters<typeof resolveDocument>[0]> = {}) =>
  resolveDocument({
    template: PRIMARY_TERM_TEMPLATE,
    card: FULL_CARD,
    locales: LOCALES,
    locale: 'en',
    defaultLocale: 'en',
    documentId,
    issuedAt,
    verification: VERIFICATION,
    ...overrides,
  });

const blockOf = (blocks: readonly ReportBlockModel[], kind: ReportBlockModel['kind']) =>
  blocks.find((block) => block.kind === kind);

describe('document resolution', () => {
  it('renders every template block in order with its heading', () => {
    const model = build();
    expect(model.blocks.map((block) => block.kind)).toEqual(PRIMARY_TERM_TEMPLATE.blocks.map((block) => block.type));
    expect(model.blocks.every((block) => block.emptyText === null)).toBe(true);
    expect(model.blocks.map((block) => block.heading)).toEqual([
      null,
      'Learner',
      'Attendance',
      'Learning areas and levels',
      'Core competencies and values',
      'Co-curricular activities',
      'Summary',
      'Comments',
      'Calendar',
      'Signatures',
      'Verification',
    ]);
  });

  it('marks a table block as flowing and every other block as unbreakable', () => {
    const model = build();
    const flow = model.blocks.filter((block) => block.flow).map((block) => block.kind);
    expect(flow).toEqual(['rubric_table']);
  });

  it('resolves the label chain for a locale that only partially translates', () => {
    const model = build({ locale: 'ar' });
    const blocks = model.blocks;
    expect(blockOf(blocks, 'learner')?.heading).toBe('الطالب');
    // `block.results` is not in the ar fixture and the template has no results table; `calendar` is.
    expect(blockOf(blocks, 'calendar')?.heading).toBe('التقويم');
    expect(model.dir).toBe('rtl');
    expect(model.locale).toBe('ar');
  });

  it('renders the header title from the template name unless overridden', () => {
    const model = build();
    const header = blockOf(model.blocks, 'header');
    expect(header?.heading).toBeNull();
    expect(header && header.payload).toMatchObject({ title: PRIMARY_TERM_TEMPLATE.name });
    expect(build({ title: 'Term 2 report' }).title).toBe('Term 2 report');
  });
});

describe('empty states', () => {
  it('gives every data block of an empty card a non-empty empty state', () => {
    const model = build({ card: EMPTY_CARD });
    expect(model.blocks).toHaveLength(PRIMARY_TERM_TEMPLATE.blocks.length);
    for (const block of model.blocks) {
      // The verification block is about the document, not the learner: an empty card still has an
      // identity and a valid link, so only the data blocks are asserted empty here.
      if (block.kind === 'verification') continue;
      expect(block.emptyText, `${block.kind} empty state`).toBeTruthy();
      expect(block.emptyText?.trim()).not.toBe('');
    }
    expect(blockOf(model.blocks, 'attendance')?.emptyText).toBe('No attendance recorded for this term.');
    expect(blockOf(model.blocks, 'results_table')).toBeUndefined();
  });

  it('translates the empty state through the same chain', () => {
    const model = build({ card: EMPTY_CARD, locale: 'ar' });
    expect(blockOf(model.blocks, 'attendance')?.emptyText).toBe('لا يوجد سجل حضور لهذا الفصل.');
    // A key the ar fixture does not translate still renders English, never blank.
    expect(blockOf(model.blocks, 'calendar')?.emptyText).toBe('No calendar dates recorded.');
  });

  it('treats a term with no days open as unrecorded attendance', () => {
    const card: ReportCardData = { ...FULL_CARD, attendance: { daysOpen: 0, present: 0, absent: 0 } };
    expect(blockOf(build({ card }).blocks, 'attendance')?.emptyText).not.toBeNull();
  });
});

describe('verification block', () => {
  it('carries the signed URL and a version-5 QR at 16 mm', () => {
    const payload = blockOf(build().blocks, 'verification')?.payload;
    expect(payload).toBeDefined();
    if (!payload || !('qr' in payload)) throw new Error('missing verification payload');
    expect(payload.url).toBe('https://verify.schoolpilot.app/v1/RC-2026-000123?sig=6Kq2x0Yb8m3TfWc');
    expect(payload.preview).toBe(false);
    expect(payload.qr?.version).toBe(5);
    expect(payload.qrSizeMm).toBe(16);
    expect(payload.documentId).toBe(documentId);
    expect(payload.issuedAt).toBe(issuedAt);
  });

  it('draws no QR for an unpublished document and marks it as a preview', () => {
    const model = build({ verification: { host: VERIFICATION.host } });
    const payload = blockOf(model.blocks, 'verification')?.payload;
    if (!payload || !('qr' in payload)) throw new Error('missing verification payload');
    expect(payload.preview).toBe(true);
    expect(payload.qr).toBeNull();
    expect(payload.url).toContain('preview=1');
    expect(model.preview).toBe(true);
  });

  it('treats a document with no verification target as a preview with no URL', () => {
    const model = build({ verification: null });
    const block = blockOf(model.blocks, 'verification');
    if (!block || !('qr' in block.payload)) throw new Error('missing verification payload');
    expect(block.payload.url).toBeNull();
    expect(block.payload.qr).toBeNull();
    expect(block.emptyText).toBe('No verification address configured.');
    expect(model.preview).toBe(true);
  });

  it('surfaces an invalid host as a preview instead of crashing the render', () => {
    const model = build({ verification: { host: 'not-a-host' } });
    expect(model.preview).toBe(true);
    expect(blockOf(model.blocks, 'verification')?.emptyText).toBe('No verification address configured.');
  });
});

describe('page and furniture', () => {
  it('uses the template page and puts the document title in the bottom-left margin box', () => {
    const model = build();
    expect(model.page.contentHeightMm).toBe(267);
    expect(model.furniture.leftText).toBe(`${PRIMARY_TERM_TEMPLATE.name} · ${documentId}`);
    expect(model.furniture.pageNumbers).toBe(false);
    expect(model.furniture.fontPt).toBe(7.5);
  });

  it('enables page numbers only for a flow document', () => {
    const model = build({ template: LANDSCAPE_TEMPLATE, card: WIDE_CARD, pagination: 'flow' });
    expect(model.furniture.pageNumbers).toBe(true);
    expect(model.pagination).toBe('flow');
    expect(model.page.orientation).toBe('landscape');
  });

  it('reduces A5 and reports what it dropped', () => {
    const model = build({ template: A5_TEMPLATE });
    expect(model.page.size).toBe('A5');
    expect(model.reduction.applied).toBe(true);
    expect(model.reduction.dropped).toEqual(
      expect.arrayContaining(['competencies', 'co_curricular', 'calendar'])
    );
    expect(model.blocks.map((block) => block.kind)).not.toContain('co_curricular');
  });
});

describe('template defects', () => {
  it('reports issues without dropping the rest of the document', () => {
    const template: ReportTemplate = {
      ...PRIMARY_TERM_TEMPLATE,
      blocks: [{ type: 'header' }, { type: 'header' }, { type: 'fees' }],
    };
    const model = build({ template });
    expect(model.issues.map((issue) => issue.code)).toContain('duplicate_block');
    expect(model.blocks.map((block) => block.kind)).toEqual(['header', 'header', 'fees']);
  });

  it('keeps the widest results table honest about its columns', () => {
    const model = build({ template: SENIOR_TERM_TEMPLATE, card: WIDE_CARD });
    const results = blockOf(model.blocks, 'results_table');
    if (!results || !('columns' in results.payload)) throw new Error('missing results payload');
    expect(results.payload.columns).toHaveLength(12);
    expect(results.payload.columns.reduce((sum, column) => sum + column.width, 0)).toBe(100);
    expect(results.payload.rows).toHaveLength(40);
  });
});

describe('fixtures', () => {
  it('keeps the fit-check comment inside the pack length limit and to complete prose', () => {
    const text = LONG_COMMENT_CARD.comments?.[0]?.text ?? '';
    expect(text.length).toBeLessThanOrEqual(500);
    expect(text.endsWith('.')).toBe(true);
  });
});

describe('RTL document', () => {  it('keeps Latin dates and URLs as their own runs', () => {
    const model = build({ card: RTL_CARD, locale: 'ar' });
    const calendar = blockOf(model.blocks, 'calendar');
    if (!calendar || !('calendar' in calendar.payload)) throw new Error('missing calendar payload');
    expect(calendar.payload.calendar.closing).toBe('31 Oct 2026');
    const comments = blockOf(model.blocks, 'comments');
    if (!comments || !('comments' in comments.payload)) throw new Error('missing comments payload');
    expect(comments.payload.comments[0].text).toContain('31 Oct 2026');
    expect(model.dir).toBe('rtl');
  });
});
