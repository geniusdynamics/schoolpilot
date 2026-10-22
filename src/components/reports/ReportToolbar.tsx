// ABOUTME: The screen-only print toolbar: the print button and the settings hint, both excluded from
// ABOUTME: the printed sheet.

import type { ReactNode } from 'react';
import { printReport } from './print';

export function ReportToolbar({ hint }: { hint: string }): ReactNode {
  return (
    <div className="report-toolbar report-screen-only">
      <button type="button" className="report-toolbar__button" onClick={() => void printReport()}>
        Print / Save as PDF
      </button>
      <span className="report-toolbar__hint">{hint}</span>
    </div>
  );
}
