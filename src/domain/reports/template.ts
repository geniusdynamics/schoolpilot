// ABOUTME: Template resolution: validates a pack report template, normalises its page and blocks, and
// ABOUTME: derives the reduced block/column set that A5 and landscape pages actually fit.

import { columnLabel, type ReportLabels } from './labels';
import { needsReducedLayout, resolvePageGeometry } from './page';
import {
  REPORT_BLOCK_KINDS,
  REPORT_COLUMN_KINDS,
  SINGLE_INSTANCE_BLOCKS,
  type ReportBlockKind,
  type ReportColumnKind,
  type ReportColumnSpec,
  type ReportPageGeometry,
  type ReportReduction,
  type ReportTableColumnKind,
  type ReportTemplate,
  type ReportTemplateIssue,
} from './types';

/** Blocks dropped for a page that cannot hold the full card (A5, landscape). */
export const REDUCED_BLOCK_KINDS: readonly ReportBlockKind[] = [
  'competencies',
  'affective_psychomotor',
  'co_curricular',
  'progression',
  'fees',
  'calendar',
];

/** The columns an A5 or landscape results table keeps. `total` is always kept. */
export const REDUCED_COLUMNS: readonly ReportColumnKind[] = ['total', 'grade', 'remark'];

export const DEFAULT_RESULTS_COLUMNS: readonly ReportColumnKind[] = ['total', 'grade'];

/** Relative widths before normalisation; the name column is the widest single field. */
const COLUMN_WEIGHTS: Readonly<Record<ReportTableColumnKind, number>> = {
  name: 22,
  components: 22,
  slots: 12,
  total: 10,
  grade: 8,
  points: 7,
  position: 7,
  class_mean: 9,
  highest: 8,
  lowest: 8,
  teacher_initials: 9,
  remark: 14,
};

const NUMERIC_COLUMNS: readonly ReportColumnKind[] = ['slots', 'total', 'points', 'position', 'class_mean', 'highest', 'lowest'];
const CENTRED_COLUMNS: readonly ReportColumnKind[] = ['grade', 'teacher_initials'];

function alignOf(kind: ReportTableColumnKind): ReportColumnSpec['align'] {
  if (kind !== 'name' && NUMERIC_COLUMNS.includes(kind)) return 'end';
  if (kind !== 'name' && CENTRED_COLUMNS.includes(kind)) return 'center';
  return 'start';
}

/**
 * Widths as percentages that sum to exactly 100. `table-layout: fixed` needs the widths on the
 * `colgroup`, otherwise a long remark column re-flows the whole table on every row.
 */
export function columnWidths(kinds: readonly ReportTableColumnKind[]): number[] {
  const weights = kinds.map((kind) => COLUMN_WEIGHTS[kind]);
  const total = weights.reduce((sum, weight) => sum + weight, 0) || 1;
  const widths = weights.map((weight) => Math.round((weight / total) * 10000) / 100);
  const drift = Math.round((100 - widths.reduce((sum, width) => sum + width, 0)) * 100) / 100;
  if (widths.length > 0) widths[widths.length - 1] = Math.round((widths[widths.length - 1] + drift) * 100) / 100;
  return widths;
}

/** Builds the learning-area name column plus one spec per configured column. */
export function columnsFor(labels: ReportLabels, kinds: readonly ReportColumnKind[]): ReportColumnSpec[] {
  const all: ReportTableColumnKind[] = ['name', ...kinds];
  const widths = columnWidths(all);
  return all.map((kind, index) => ({ kind, label: columnLabel(labels, kind), align: alignOf(kind), width: widths[index] }));
}

/** Structural checks a pack loader can run before a template is used. */
export function validateTemplate(template: ReportTemplate): ReportTemplateIssue[] {
  const issues: ReportTemplateIssue[] = [];
  if (template.blocks.length === 0) {
    issues.push({ code: 'no_blocks', path: 'blocks', detail: 'a template needs at least one block' });
  }
  const seen = new Set<ReportBlockKind>();
  template.blocks.forEach((block, index) => {
    if (!REPORT_BLOCK_KINDS.includes(block.type)) {
      issues.push({ code: 'unknown_block', path: `blocks[${index}].type`, detail: `unknown block type ${String(block.type)}` });
      return;
    }
    if (SINGLE_INSTANCE_BLOCKS.includes(block.type)) {
      if (seen.has(block.type)) {
        issues.push({ code: 'duplicate_block', path: `blocks[${index}]`, detail: `${block.type} may appear once` });
      }
      seen.add(block.type);
    }
    if (block.columns) {
      if (block.columns.length === 0) {
        issues.push({ code: 'empty_columns', path: `blocks[${index}].columns`, detail: 'columns must not be empty' });
      }
      const unknown = block.columns.filter((column) => !REPORT_COLUMN_KINDS.includes(column));
      if (unknown.length > 0) {
        issues.push({ code: 'unknown_column', path: `blocks[${index}].columns`, detail: `unknown columns ${unknown.join(', ')}` });
      }
    }
  });
  return issues;
}

export interface ResolvedTemplateBlock {
  readonly kind: ReportBlockKind;
  readonly labelKey?: string;
  readonly columns: readonly ReportColumnKind[];
}

export interface ResolvedTemplate {
  readonly code: string;
  readonly name: string;
  readonly page: ReportPageGeometry;
  readonly blocks: readonly ResolvedTemplateBlock[];
  readonly reduction: ReportReduction;
  readonly issues: readonly ReportTemplateIssue[];
  readonly commentMaxLength: number | null;
}

export interface ResolveTemplateOptions {
  /** `auto` reduces A5 and landscape; `full` forces the declared blocks; `reduced` always reduces. */
  readonly layout?: 'auto' | 'full' | 'reduced';
}

/**
 * Resolves a template for a page. In `auto` mode an A5 or landscape template gets the reduced set:
 * DR-05 measured the full 11-block card overflowing A5 by 72.5 mm and A4 landscape by 58.5 mm, so the
 * engine must not promise one page for a block list that cannot fit.
 */
export function resolveTemplate(template: ReportTemplate, options: ResolveTemplateOptions = {}): ResolvedTemplate {
  const layout = options.layout ?? 'auto';
  const issues = validateTemplate(template);
  const page = resolvePageGeometry(template.page);
  const reduce = layout === 'reduced' || (layout === 'auto' && needsReducedLayout(page));

  const declared: ResolvedTemplateBlock[] = template.blocks
    .filter((block) => REPORT_BLOCK_KINDS.includes(block.type))
    .map((block) => ({
      kind: block.type,
      labelKey: block.label_key,
      columns:
        block.type === 'results_table'
          ? dedupe<ReportColumnKind>(block.columns && block.columns.length > 0 ? block.columns : DEFAULT_RESULTS_COLUMNS)
          : [],
    }));

  let blocks = declared;
  let dropped: ReportBlockKind[] = [];
  let columnsTrimmed = false;
  if (reduce) {
    blocks = declared.filter((block) => !REDUCED_BLOCK_KINDS.includes(block.kind));
    dropped = declared.filter((block) => REDUCED_BLOCK_KINDS.includes(block.kind)).map((block) => block.kind);
    // Width, not orientation, is what a table lacks: only an A5 page is too narrow for the declared
    // columns. A landscape sheet is wide, so a wide table keeps its columns there.
    if (page.size === 'A5') {
      blocks = blocks.map((block) => {
        if (block.kind !== 'results_table') return block;
        const kept = block.columns.filter((column) => REDUCED_COLUMNS.includes(column));
        const trimmed: ReportColumnKind[] = kept.includes('total') ? kept : [...kept, 'total'];
        columnsTrimmed = columnsTrimmed || trimmed.length !== block.columns.length;
        return { ...block, columns: trimmed };
      });
    }
  }

  // A template whose every block is optional still needs a sheet, so the first declared block survives.
  if (blocks.length === 0) blocks = declared.slice(0, 1);

  return {
    code: template.code,
    name: template.name,
    page,
    blocks,
    reduction: { applied: reduce, dropped, columnsTrimmed },
    issues,
    commentMaxLength: template.comment_max_length ?? null,
  };
}

function dedupe<K extends string>(values: readonly K[]): K[] {
  return values.filter((value, index) => values.indexOf(value) === index);
}
