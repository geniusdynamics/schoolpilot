// ABOUTME: The notice shown at the top of a page that still reads the app's old sample collections
// ABOUTME: instead of the school's own records, so nobody reads what it shows as their school's data.

import React from 'react';

export interface LegacyDataNoticeProps {
  /** What this page is, in one clause: "Scheduling here does not reach your exam papers." */
  readonly children?: React.ReactNode;
}

/**
 * Marks a page that is not yet on the school's records.
 *
 * The page still reads the legacy sample collections, so on a demo it shows an invented school and
 * on a real install it shows nothing. Either way what it holds is outside the register, the ledger
 * and the rest of the canonical data, which is what the notice says.
 */
export const LegacyDataNotice: React.FC<LegacyDataNoticeProps> = ({ children }) => (
  <div
    role="note"
    data-testid="legacy-data-notice"
    className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
  >
    <p className="font-medium">Not connected to your school&rsquo;s records yet</p>
    <p className="mt-1">
      {children ?? "This page still shows the app's old sample data."} Anything added or changed here
      does not reach the rest of the school, and it is not counted anywhere else.
    </p>
  </div>
);

export default LegacyDataNotice;
