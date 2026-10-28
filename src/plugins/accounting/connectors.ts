// ABOUTME: The connector registry: the one export that implements each target the settings offer, and the
// ABOUTME: lookup the validator and the export use to find it.

import { erpNextExport } from './erpnext';
import { odooExport } from './odoo';
import { quickBooksExport } from './quickbooks';
import type { AccountingExport, AccountingTargetId } from './types';
import { xeroApiExport, xeroCsvExport } from './xero';

/** Every connector, one per target. */
export const ACCOUNTING_EXPORTS: readonly AccountingExport[] = [
  quickBooksExport,
  xeroCsvExport,
  xeroApiExport,
  odooExport,
  erpNextExport,
];

/** The connector for a target, or null when the plug-in does not export for it. */
export function accountingExportFor(target: AccountingTargetId): AccountingExport | null {
  return ACCOUNTING_EXPORTS.find((connector) => connector.id === target) ?? null;
}
