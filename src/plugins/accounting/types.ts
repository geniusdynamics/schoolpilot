// ABOUTME: The accounting export contract: the batch of posted journal entries a caller hands in, the
// ABOUTME: validated intermediate representation every connector renders, the issue a refusal is reported
// ABOUTME: as, and the AccountingExport interface QuickBooks, Xero, Odoo and ERPNext implement.

import type { CurrencyCode } from '@/domain/money';

import type { ChartMapping } from './mapping';

/** The accounting systems this plug-in writes for. */
export type AccountingTargetId = 'quickbooks' | 'xero' | 'xero-api' | 'odoo' | 'erpnext';

/** Every target, in the order the settings offer them. */
export const ACCOUNTING_TARGET_IDS: readonly AccountingTargetId[] = [
  'quickbooks',
  'xero',
  'xero-api',
  'odoo',
  'erpnext',
];

/** Which side of a journal line carries its amount. */
export type ExportSide = 'debit' | 'credit';

/** One reason an export was refused: where the problem is and what is wrong with it. */
export interface ExportIssue {
  readonly path: string;
  readonly message: string;
}

/** A line as a caller states it: exactly one of a debit and a credit, in the batch's currency. */
export interface ExportLineInput {
  /** The code of the school's chart of accounts; the mapping turns it into the target's account. */
  readonly accountCode: string;
  /** The account name, when the caller already resolved it; it is what an unmapped account is reported as. */
  readonly accountName?: string;
  /** The line's own description; the entry's description is used when a line carries none. */
  readonly description?: string;
  /** The debit as a decimal string of major units (`1250.00`), never a float. */
  readonly debit?: string;
  /** The credit as a decimal string of major units. */
  readonly credit?: string;
  /** Where the target knows cost centres or classes, the one this line belongs to. */
  readonly costCentre?: string;
}

/** One posted journal entry as an export states it. */
export interface ExportEntryInput {
  /** The day the entry takes effect, an ISO day (`2027-02-10`). */
  readonly date: string;
  /** The source document's number; it becomes the target's journal or reference number. */
  readonly reference: string;
  /** The entry's narration. */
  readonly description: string;
  readonly lines: readonly ExportLineInput[];
}

/** The batch a caller asks to export: one school's posted entries for one target. */
export interface ExportBatch {
  readonly institutionId: string;
  readonly target: AccountingTargetId;
  /** The currency every amount of the batch is counted in. */
  readonly currency: CurrencyCode;
  readonly entries: readonly ExportEntryInput[];
}

/** One validated line, carrying both the school's account and the target's. */
export interface AccountingDocumentLine {
  readonly lineNumber: number;
  readonly accountCode: string;
  readonly accountName: string | null;
  readonly targetCode: string;
  readonly targetName: string;
  readonly side: ExportSide;
  /** The amount in minor units of the batch currency. */
  readonly amountMinor: number;
  /** The amount as exact decimal text (`1250.00`), the only form an amount is written from. */
  readonly amountText: string;
  readonly description: string;
  readonly costCentre: string | null;
}

/** One validated entry of the intermediate representation. */
export interface AccountingDocumentEntry {
  readonly date: string;
  readonly reference: string;
  readonly description: string;
  readonly lines: readonly AccountingDocumentLine[];
}

/**
 * The validated intermediate representation: every connector renders this and nothing else, so none of
 * them sees a raw caller's batch, an unbalanced entry or an unmapped account.
 */
export interface AccountingDocument {
  readonly target: AccountingTargetId;
  readonly institutionId: string;
  readonly currency: CurrencyCode;
  readonly entries: readonly AccountingDocumentEntry[];
  readonly totalDebitMinor: number;
  readonly totalCreditMinor: number;
}

/** The artifact a connector produces: a file to import, or a payload to post through an API. */
export interface ExportFile {
  readonly target: AccountingTargetId;
  readonly filename: string;
  readonly mediaType: 'text/csv' | 'application/json';
  readonly content: string;
  /** The documentation the format was written against, so a bursar can check it. */
  readonly documentation: readonly string[];
  /**
   * The fields of the format no documentation confirmed. An empty list means the whole shape is
   * documented; a bursar checks a non-empty one against the target's own template before importing.
   */
  readonly draftFields: readonly string[];
}

/** An identifier a target needs from the mapping beyond the accounts themselves. */
export type MappingRequirement = 'journal' | 'company';

/** What every accounting connector implements. */
export interface AccountingExport {
  readonly id: AccountingTargetId;
  readonly label: string;
  /** The documentation the connector was written against. */
  readonly documentation: readonly string[];
  readonly draftFields: readonly string[];
  /** The mapping identifiers the target cannot post without. */
  readonly mappingRequirements: readonly MappingRequirement[];
  /**
   * Refuses a mapping the target cannot read (an identifier that is not the kind the target uses).
   * Called with the validated document, so it sees exactly the accounts the batch posts to.
   */
  validateMapping?(
    mapping: ChartMapping,
    document: AccountingDocument
  ): readonly ExportIssue[];
  render(document: AccountingDocument, mapping: ChartMapping): ExportFile;
}
