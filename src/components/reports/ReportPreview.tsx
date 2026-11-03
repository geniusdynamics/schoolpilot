// ABOUTME: Displays a report inside a bounded, keyboard-scrollable screen preview.
// ABOUTME: Keeps a separately measured print copy outside the app root without duplicating screen content.

import type { ReactNode } from 'react';
import type { ReportDocumentModel } from '@/domain/reports/types';
import { ReportDocument } from './ReportDocument';
import { ReportPrintSurface } from './ReportPrintSurface';

export function ReportPreview({
  model,
  id,
  label,
}: {
  readonly model: ReportDocumentModel;
  readonly id: string;
  readonly label: string;
}): ReactNode {
  return (
    <>
      <div
        id={id}
        role="region"
        aria-label={label}
        tabIndex={0}
        className="report-preview-viewport report-screen-only"
      >
        <ReportDocument model={model} toolbar={false} />
      </div>
      <ReportPrintSurface screenHidden>
        <ReportDocument model={model} toolbar={false} />
      </ReportPrintSurface>
    </>
  );
}
