// ABOUTME: Exports the statutory return rows a pack's return layout describes: one row per payslip, the
// ABOUTME: columns in the layout's order, each value read from a named payslip field or line.

import { toDecimalString, zero } from '@/domain/money';

import { isWithin } from './dates';
import { PayrollError } from './errors';
import type { PayrollPack, Payslip, ReturnColumn, ReturnExport, ReturnLayout } from './types';

const LINE_SOURCE_PREFIX = 'line:';

/** The text a payslip gives for a layout column. */
function columnValue(payslip: Payslip, column: ReturnColumn): string {
  switch (column.source) {
    case 'employeeId':
      return payslip.employeeId;
    case 'periodStart':
      return payslip.period.start;
    case 'periodEnd':
      return payslip.period.end;
    case 'grossPay':
      return toDecimalString(payslip.grossPay);
    case 'taxablePay':
      return toDecimalString(payslip.taxablePay);
    case 'netPay':
      return toDecimalString(payslip.netPay);
  }
  if (column.source.startsWith(LINE_SOURCE_PREFIX)) {
    const code = column.source.slice(LINE_SOURCE_PREFIX.length);
    const line = payslip.lines.find((candidate) => candidate.code === code);
    return toDecimalString(line === undefined ? zero(payslip.currency) : line.amount);
  }
  throw new PayrollError('invalid_pack', `return column "${column.key}" reads the unknown field "${column.source}"`);
}

/**
 * The statutory return `returnId` of a pack for the payslips of one period.
 *
 * The layout in force on the period's first day is used; the columns are the layout's list and nothing
 * else, and `verification` says whether the layout itself was confirmed against the authority's file.
 */
export function exportReturn(pack: PayrollPack, returnId: string, payslips: readonly Payslip[]): ReturnExport {
  if (payslips.length === 0) throw new PayrollError('invalid_input', 'a return needs at least one payslip');
  const start = payslips[0].period.start;
  if (payslips.some((payslip) => payslip.period.start !== start)) {
    throw new PayrollError('mixed_periods', 'a return covers one payroll period; the payslips start on different days');
  }
  if (payslips.some((payslip) => payslip.packId !== pack.id)) {
    throw new PayrollError('invalid_input', `every payslip must have been computed with the ${pack.id} pack`);
  }
  const layouts: readonly ReturnLayout[] = pack.returns.filter((candidate) => candidate.id === returnId);
  if (layouts.length === 0) throw new PayrollError('unknown_return', `${pack.id} has no return layout "${returnId}"`);
  const layout = layouts.find((candidate) => isWithin(start, candidate.effectiveFrom, candidate.effectiveTo));
  if (layout === undefined) {
    throw new PayrollError('no_rule_in_force', `${pack.id} has no "${returnId}" layout in force on ${start}`);
  }
  return {
    id: layout.id,
    labelKey: layout.labelKey,
    label: pack.labels[layout.labelKey] ?? layout.labelKey,
    authority: layout.authority,
    verification: layout.verification,
    columns: layout.columns.map((column) => ({ key: column.key, label: pack.labels[column.labelKey] ?? column.labelKey })),
    rows: payslips.map((payslip) => layout.columns.map((column) => columnValue(payslip, column))),
  };
}
