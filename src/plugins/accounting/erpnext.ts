// ABOUTME: The ERPNext journal export: Journal Entry documents for the framework's documented REST create
// ABOUTME: call, with the accounting-entries rows, company, posting date and reference the doctype defines,
// ABOUTME: and the cost centre carried where the school states one.

import { amountNumber } from './amounts';
import { journalFileName } from './files';
import type { ChartMapping } from './mapping';
import type { AccountingDocument, AccountingExport, ExportFile } from './types';

const DOCUMENTATION = [
  'https://docs.frappe.io/erpnext/user/manual/en/journal-entry',
  'https://docs.frappe.io/framework/user/en/api/rest',
  'https://raw.githubusercontent.com/frappe/erpnext/develop/erpnext/accounts/doctype/journal_entry/journal_entry.json',
  'https://raw.githubusercontent.com/frappe/erpnext/develop/erpnext/accounts/doctype/journal_entry_account/journal_entry_account.json',
];

/**
 * The ERPNext target: one Journal Entry document per posted entry, for
 * `POST /api/resource/Journal Entry`.
 *
 * The field names are the doctype's own: `company`, `posting_date`, `cheque_no` (Reference Number),
 * `user_remark`, `voucher_type`, and the `accounts` child table of `account`,
 * `debit_in_account_currency`, `credit_in_account_currency`, `cost_center` and `user_remark`. Every one is
 * confirmed by the doctype definitions, so the payload declares no draft field.
 */
export const erpNextExport: AccountingExport = {
  id: 'erpnext',
  label: 'ERPNext journal entries',
  documentation: DOCUMENTATION,
  draftFields: [],
  mappingRequirements: ['company'],

  render(document: AccountingDocument, mapping: ChartMapping): ExportFile {
    const payload = {
      resource: 'Journal Entry',
      documents: document.entries.map((entry) => ({
        doctype: 'Journal Entry',
        voucher_type: 'Journal Entry',
        company: mapping.company ?? '',
        cheque_no: entry.reference,
        posting_date: entry.date,
        user_remark: entry.description,
        accounts: entry.lines.map((line) => ({
          account: line.targetName,
          debit_in_account_currency: line.side === 'debit' ? amountNumber(line.amountText) : 0,
          credit_in_account_currency: line.side === 'credit' ? amountNumber(line.amountText) : 0,
          user_remark: line.description,
          ...(line.costCentre === null ? {} : { cost_center: line.costCentre }),
        })),
      })),
    };

    return {
      target: 'erpnext',
      filename: journalFileName('erpnext-journal-entries', 'json', document),
      mediaType: 'application/json',
      content: `${JSON.stringify(payload, null, 2)}\n`,
      documentation: DOCUMENTATION,
      draftFields: [],
    };
  },
};
