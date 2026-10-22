// ABOUTME: The alignment class of one table cell, shared by the header row and the table blocks.

import type { ReportColumnSpec } from '@/domain/reports/types';

export function reportCellClass(align: ReportColumnSpec['align']): string | undefined {
  if (align === 'end') return 'report-cell--end';
  if (align === 'center') return 'report-cell--center';
  return undefined;
}
