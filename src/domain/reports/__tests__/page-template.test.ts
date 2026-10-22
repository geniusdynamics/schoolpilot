// ABOUTME: Page geometry and template resolution: the DR-05 page table, the reduced layout for A5 and
// ABOUTME: landscape, column widths and template validation.

import { describe, expect, it } from 'vitest';
import { needsReducedLayout, pageMarginShorthand, pageSizeKeyword, resolvePageGeometry, TYPE_FLOOR_PT } from '../page';
import { columnWidths, columnsFor, resolveTemplate, validateTemplate } from '../template';
import { resolveLabels } from '../labels';
import { A5_TEMPLATE, LANDSCAPE_TEMPLATE, LOCALES, PRIMARY_TERM_TEMPLATE, SENIOR_TERM_TEMPLATE } from '../__fixtures__/cards';
import type { ReportTemplate } from '../types';

const labels = resolveLabels({ bundles: LOCALES, locale: 'en', defaultLocale: 'en' });

describe('page geometry', () => {
  it('defaults to A4 portrait with the measured content box', () => {
    const page = resolvePageGeometry(undefined);
    expect(page).toMatchObject({ size: 'A4', orientation: 'portrait', widthMm: 210, heightMm: 297, baseFontPt: 8.5 });
    expect(page.margins).toEqual({ top: 14, right: 12, bottom: 16, left: 12 });
    expect(page.contentWidthMm).toBe(186);
    expect(page.contentHeightMm).toBe(267);
    expect(pageSizeKeyword(page)).toBe('A4 portrait');
    expect(pageMarginShorthand(page)).toBe('14mm 12mm 16mm 12mm');
  });

  it('carries the four measured geometries', () => {
    const a4Landscape = resolvePageGeometry({ size: 'A4', orientation: 'landscape' });
    // 210 − 12 (top) − 12 (bottom) = 186 mm, the box the spike's measurement code used and the one
    // that reproduces its measured +58.5 mm overflow (244.5 − 186).
    expect([a4Landscape.contentWidthMm, a4Landscape.contentHeightMm, a4Landscape.baseFontPt]).toEqual([269, 186, 8.2]);

    const a5 = resolvePageGeometry({ size: 'A5', orientation: 'portrait' });
    expect([a5.contentWidthMm, a5.contentHeightMm, a5.baseFontPt]).toEqual([130, 188, 7.6]);

    const a5Landscape = resolvePageGeometry({ size: 'A5', orientation: 'landscape' });
    // 148 − 9 (top) − 9 (bottom) = 130 mm; the DR's table prints 129 mm for the same margin list.
    expect([a5Landscape.contentWidthMm, a5Landscape.contentHeightMm, a5Landscape.baseFontPt]).toEqual([190, 130, 7.2]);
  });

  it('never takes a table or metadata size below its floor', () => {
    for (const spec of [{}, { size: 'A5' as const }, { orientation: 'landscape' as const }]) {
      const page = resolvePageGeometry(spec);
      expect(page.tableFontPt).toBeGreaterThanOrEqual(TYPE_FLOOR_PT.meta);
      expect(page.metaFontPt).toBeGreaterThanOrEqual(TYPE_FLOOR_PT.meta);
    }
    expect(resolvePageGeometry().tableFontPt).toBe(8);
  });

  it('knows which pages cannot hold the full card', () => {
    expect(needsReducedLayout(resolvePageGeometry())).toBe(false);
    expect(needsReducedLayout(resolvePageGeometry({ orientation: 'landscape' }))).toBe(true);
    expect(needsReducedLayout(resolvePageGeometry({ size: 'A5' }))).toBe(true);
  });
});

describe('columns', () => {
  it('sums every table width to exactly 100%', () => {
    const widths = columnWidths(['name', 'components', 'slots', 'total', 'grade', 'points', 'position', 'class_mean', 'highest', 'lowest', 'teacher_initials', 'remark']);
    expect(widths.reduce((sum, width) => sum + width, 0)).toBe(100);
  });

  it('labels the name column and aligns numeric columns to the end', () => {
    const columns = columnsFor(labels, ['total', 'grade', 'remark']);
    expect(columns.map((column) => column.kind)).toEqual(['name', 'total', 'grade', 'remark']);
    expect(columns.map((column) => column.label)).toEqual(['Learning area', 'Total', 'Grade', 'Remark']);
    expect(columns[1].align).toBe('end');
    expect(columns[2].align).toBe('center');
    expect(columns[3].align).toBe('start');
  });
});

describe('template resolution', () => {
  it('keeps the declared block order and columns', () => {
    const resolved = resolveTemplate(PRIMARY_TERM_TEMPLATE);
    expect(resolved.blocks.map((block) => block.kind)).toEqual(PRIMARY_TERM_TEMPLATE.blocks.map((block) => block.type));
    expect(resolved.reduction.applied).toBe(false);
    expect(resolved.page.size).toBe('A4');
  });

  it('defaults a results table without columns to total and grade', () => {
    const template: ReportTemplate = {
      code: 'x',
      name: 'x',
      blocks: [{ type: 'results_table' }],
    };
    expect(resolveTemplate(template).blocks[0].columns).toEqual(['total', 'grade']);
  });

  it('reduces A5 and landscape to a block and column set that can fit', () => {
    const a5 = resolveTemplate(A5_TEMPLATE);
    expect(a5.reduction.applied).toBe(true);
    expect(a5.reduction.dropped).toEqual(expect.arrayContaining(['competencies', 'co_curricular', 'calendar']));
    expect(a5.blocks.map((block) => block.kind)).toEqual([
      'header',
      'learner',
      'attendance',
      'rubric_table',
      'summary',
      'comments',
      'signatures',
      'verification',
    ]);

    const landscape = resolveTemplate({ ...LANDSCAPE_TEMPLATE, blocks: SENIOR_TERM_TEMPLATE.blocks });
    const results = landscape.blocks.find((block) => block.kind === 'results_table');
    expect(landscape.reduction.applied).toBe(true);
    // A landscape sheet is 269 mm wide: the declared columns fit, so only the block set is reduced.
    expect(landscape.reduction.columnsTrimmed).toBe(false);
    expect(results?.columns).toEqual(SENIOR_TERM_TEMPLATE.blocks[3].columns);
  });

  it('trims the columns that an A5 page cannot hold', () => {
    const a5 = resolveTemplate({
      ...SENIOR_TERM_TEMPLATE,
      page: { size: 'A5', orientation: 'landscape' },
    });
    const results = a5.blocks.find((block) => block.kind === 'results_table');
    expect(a5.reduction.applied).toBe(true);
    expect(a5.reduction.columnsTrimmed).toBe(true);
    expect(results?.columns).toEqual(['total', 'grade', 'remark']);
  });

  it('can be forced to keep the declared blocks', () => {
    const full = resolveTemplate(A5_TEMPLATE, { layout: 'full' });
    expect(full.reduction.applied).toBe(false);
    expect(full.blocks).toHaveLength(A5_TEMPLATE.blocks.length);
  });

  it('reports a repeated single-instance block and an unknown column', () => {
    const template: ReportTemplate = {
      code: 'x',
      name: 'x',
      blocks: [
        { type: 'header' },
        { type: 'header' },
        { type: 'results_table', columns: ['total', 'bogus' as never] },
      ],
    };
    const issues = validateTemplate(template);
    expect(issues.map((issue) => issue.code)).toEqual(['duplicate_block', 'unknown_column']);
  });

  it('never leaves a template without blocks after reduction', () => {
    const template: ReportTemplate = { code: 'x', name: 'x', blocks: [{ type: 'fees' }] };
    expect(resolveTemplate({ ...template, page: { size: 'A5' } }).blocks).toHaveLength(1);
  });
});
