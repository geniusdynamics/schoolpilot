// ABOUTME: The public surface of the accounting plug-in: one call that validates a batch of posted journal
// ABOUTME: entries against the school's chart mapping and renders the file the target system imports.

import { accountingExportFor } from './connectors';
import { validateBatch } from './journal';
import type { ChartMapping } from './mapping';
import type {
  AccountingDocument,
  ExportBatch,
  ExportFile,
  ExportIssue,
} from './types';

export { ACCOUNTING_EXPORTS, accountingExportFor } from './connectors';
export { amountNumber } from './amounts';
export { parseCsv, toCsv, type CsvCell } from './csv';
export { journalFileName } from './files';
export { validateBatch, type ValidationResult } from './journal';
export {
  createChartMapping,
  targetAccount,
  unmappedAccounts,
  type ChartMapping,
  type ChartMappingInput,
  type TargetAccount,
  type UnmappedAccount,
} from './mapping';
export type {
  AccountingDocument,
  AccountingDocumentEntry,
  AccountingDocumentLine,
  AccountingExport,
  AccountingTargetId,
  ExportBatch,
  ExportEntryInput,
  ExportFile,
  ExportIssue,
  ExportLineInput,
  ExportSide,
  MappingRequirement,
} from './types';
export { ACCOUNTING_TARGET_IDS } from './types';

/** The file an export produced, or every reason it produced none. */
export type ExportResult =
  | {
      readonly ok: true;
      readonly document: AccountingDocument;
      readonly file: ExportFile;
    }
  | { readonly ok: false; readonly issues: readonly ExportIssue[] };

/**
 * Validates a batch against the school's chart mapping and renders it for the batch's target.
 *
 * Nothing leaves the platform: an export writes a file or a payload, and the bursar sends it. A batch that
 * cannot be exported in full is refused in full, so a partly mapped batch never reaches a ledger.
 */
export function exportJournal(batch: ExportBatch, mapping: ChartMapping): ExportResult {
  const validation = validateBatch(batch, mapping);
  if (!validation.ok) return validation;

  const connector = accountingExportFor(batch.target);
  if (connector === null) {
    return {
      ok: false,
      issues: [
        {
          path: 'target',
          message: `"${batch.target}" is not an accounting system this plug-in exports`,
        },
      ],
    };
  }

  return {
    ok: true,
    document: validation.document,
    file: connector.render(validation.document, mapping),
  };
}
