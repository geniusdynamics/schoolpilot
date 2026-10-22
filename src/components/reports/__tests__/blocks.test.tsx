// ABOUTME: Block-level rendering tests: every schema block renders its data, a block without data
// ABOUTME: renders its empty state, tables carry their total as a row, and previews carry no QR.

import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { resolveDocument } from '@/domain/reports/document';
import {
  EMPTY_CARD,
  FULL_CARD,
  LOCALES,
  PRIMARY_TERM_TEMPLATE,
  RTL_CARD,
  VERIFICATION,
} from '@/domain/reports/__fixtures__/cards';
import { ReportDocument } from '../ReportDocument';

const build = (overrides: Partial<Parameters<typeof resolveDocument>[0]> = {}) =>
  resolveDocument({
    template: PRIMARY_TERM_TEMPLATE,
    card: FULL_CARD,
    locales: LOCALES,
    locale: 'en',
    defaultLocale: 'en',
    documentId: 'RC-2026-000123',
    issuedAt: '2026-10-21',
    verification: VERIFICATION,
    ...overrides,
  });

const renderDocument = (overrides: Partial<Parameters<typeof resolveDocument>[0]> = {}) =>
  render(<ReportDocument model={build(overrides)} toolbar={false} />);

describe('block rendering', () => {
  it('renders every block of the template with its heading', () => {
    const { container } = renderDocument();
    const blocks = [...container.querySelectorAll('[data-block]')];
    expect(blocks.map((block) => block.getAttribute('data-block'))).toEqual(PRIMARY_TERM_TEMPLATE.blocks.map((block) => block.type));
    expect(container.querySelector('[data-block="attendance"] .report-block__title')?.textContent).toBe('Attendance');
    expect(container.querySelector('[data-block="header"]')).toHaveTextContent('Riverside Academy');
    expect(container.querySelector('[data-block="learner"]')).toHaveTextContent('Amina Achieng');
    expect(container.querySelector('[data-block="attendance"]')).toHaveTextContent('62');
    expect(container.querySelector('[data-block="competencies"]')).toHaveTextContent('Communication and collaboration');
    expect(container.querySelector('[data-block="co_curricular"]')).toHaveTextContent('Science club');
    expect(container.querySelector('[data-block="summary"]')).toHaveTextContent('619 / 800');
    expect(container.querySelector('[data-block="comments"]')).toHaveTextContent("Class teacher's comment");
    expect(container.querySelector('[data-block="calendar"]')).toHaveTextContent('31 Oct 2026');
    expect(container.querySelector('[data-block="signatures"]')).toHaveTextContent('J. Mwangi');
    expect(container.querySelector('[data-block="verification"]')).toBeTruthy();
  });

  it('renders each block kind on its own, including the ones the primary template omits', () => {
    const card = {
      ...FULL_CARD,
      results: {
        rows: [{ code: 'ENG', name: 'English', cells: { total: '90', grade: 'EE1' } }],
        totals: { code: 'T', name: 'Total', cells: { total: '90' } },
      },
      fees: { balance: 'KES 12,400' },
      progression: { decision: 'Promoted' },
      traits: [{ name: 'Punctuality', level: 'Always' }],
    };
    const template = {
      ...PRIMARY_TERM_TEMPLATE,
      blocks: [
        { type: 'results_table' as const, columns: ['total', 'grade'] as const },
        { type: 'affective_psychomotor' as const },
        { type: 'progression' as const },
        { type: 'fees' as const },
      ],
    };
    const { container } = renderDocument({ card, template });
    expect(container.querySelector('[data-block="results_table"]')).toHaveTextContent('English');
    expect(container.querySelector('[data-block="affective_psychomotor"]')).toHaveTextContent('Punctuality');
    expect(container.querySelector('[data-block="progression"]')).toHaveTextContent('Promoted');
    expect(container.querySelector('[data-block="fees"]')).toHaveTextContent('KES 12,400');
  });

  it('renders a sentence instead of a hole for every empty block', () => {
    const { container } = renderDocument({ card: EMPTY_CARD });
    const empty = [...container.querySelectorAll('[data-block][data-empty="true"]')];
    // Every block but the verification block is empty for an identity-less card.
    expect(empty.length).toBe(PRIMARY_TERM_TEMPLATE.blocks.length - 1);
    expect(container.querySelector('[data-block="attendance"] .report-empty')?.textContent).toBe(
      'No attendance recorded for this term.'
    );
    expect(container.querySelector('[data-block="comments"] .report-empty')).toBeTruthy();
    // A block with no data never renders its content alongside the empty state.
    expect(container.querySelector('[data-block="attendance"] .report-stats')).toBeNull();
  });
});

describe('tables', () => {
  const resultsTemplate = {
    ...PRIMARY_TERM_TEMPLATE,
    blocks: [{ type: 'results_table' as const, columns: ['total', 'grade'] as const }],
  };

  it('repeats its header and puts the total in the body, never in a tfoot', () => {
    const { container } = renderDocument({ template: resultsTemplate });
    const table = container.querySelector('table[data-table="results"]');
    expect(table?.querySelector('thead')).toBeTruthy();
    expect(table?.querySelector('tfoot')).toBeNull();
    const body = table?.querySelector('tbody');
    expect(body?.querySelector('tr.report-table__total')).toBeTruthy();
    expect(body?.querySelectorAll('tr')).toHaveLength(9); // 8 learning areas + the total row
    const headers = [...(table?.querySelectorAll('thead th') ?? [])].map((header) => header.textContent);
    expect(headers).toEqual(['Learning area', 'Total', 'Grade']);
  });

  it('writes every column width on the colgroup', () => {
    const { container } = renderDocument({ template: resultsTemplate });
    const cols = [...(container.querySelectorAll('table[data-table="results"] col') ?? [])];
    // Weights 22 / 10 / 8 normalised to 100: the name column is the widest field.
    expect(cols.map((col) => (col as HTMLElement).style.width)).toEqual(['55%', '25%', '20%']);
  });
});

describe('verification block', () => {
  it('draws a crisp vector QR and the readable URL', () => {
    const { container } = renderDocument();
    const svg = container.querySelector('[data-block="verification"] svg');
    expect(svg).toBeTruthy();
    expect(svg?.getAttribute('shape-rendering')).toBe('crispEdges');
    expect(container.querySelector('[data-block="verification"] .report-verify__url')?.textContent).toBe(
      'https://verify.schoolpilot.app/v1/RC-2026-000123?sig=6Kq2x0Yb8m3TfWc'
    );
    expect(container.querySelector('[data-block="verification"] [data-preview="false"]')).toBeTruthy();
  });

  it('draws no QR for a preview and labels it as invalid', () => {
    const { container } = renderDocument({ verification: { host: VERIFICATION.host } });
    expect(container.querySelector('[data-block="verification"] svg')).toBeNull();
    const label = container.querySelector('[data-block="verification"] [data-preview="true"]');
    expect(label?.textContent).toBe('PREVIEW — not valid for verification');
    expect(container.querySelector('.report-preview-banner')?.textContent).toBe('PREVIEW — not valid for verification');
  });
});

describe('RTL surface', () => {
  it('sets the direction and isolates dates, marks and the verification URL', () => {
    const { container } = renderDocument({ card: RTL_CARD, locale: 'ar' });
    const document_ = container.querySelector('.report-document');
    expect(document_?.getAttribute('dir')).toBe('rtl');
    expect(document_?.getAttribute('lang')).toBe('ar');
    // Dates inside statistics are their own LTR run.
    const calendar = container.querySelector('[data-block="calendar"]');
    const date = [...(calendar?.querySelectorAll('bdi[dir="ltr"]') ?? [])].map((node) => node.textContent);
    expect(date).toContain('31 Oct 2026');
    // The verification URL, which shares the page with Arabic text, is isolated too.
    const url = container.querySelector('[data-block="verification"] bdi[dir="ltr"]');
    expect(url?.textContent).toBe('https://verify.schoolpilot.app/v1/RC-2026-000123?sig=6Kq2x0Yb8m3TfWc');
    // And a mixed Arabic comment keeps its Latin date inside an isolate.
    const comment = container.querySelector('[data-block="comments"] .report-comment__body')?.textContent ?? '';
    const start = comment.indexOf('\u2066');
    const end = comment.indexOf('\u2069');
    expect(start).toBeGreaterThanOrEqual(0);
    expect(end).toBeGreaterThan(start);
    expect(comment.slice(start, end + 1)).toContain('31 Oct 2026');
  });
});
