// ABOUTME: The name an exported journal file carries: the target's prefix and the first and last day the
// ABOUTME: batch covers, so two exports of the same range sort together and never overwrite each other.

import type { AccountingDocument } from './types';

/** `quickbooks-journal-2027-02-10_2027-02-11.csv` for a batch covering those two days. */
export function journalFileName(
  prefix: string,
  extension: string,
  document: AccountingDocument
): string {
  const dates = document.entries.map((entry) => entry.date).sort();
  const from = dates[0] ?? 'empty';
  const to = dates[dates.length - 1] ?? from;
  return `${prefix}-${from}_${to}.${extension}`;
}
