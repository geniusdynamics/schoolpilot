// ABOUTME: Displays a report inside a bounded, keyboard-scrollable screen preview.
// ABOUTME: Keeps a separately measured print copy outside the app root without duplicating screen content.

import type { CSSProperties, ReactNode } from 'react';
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
  // The sheet is only the content box; on paper the @page margins surround it. The preview shows
  // the paper: white, with the template's own margins, so the card is seen as it prints.
  const paperStyle = {
    width: `${model.page.widthMm}mm`,
    paddingTop: `${model.page.margins.top}mm`,
    paddingRight: `${model.page.margins.right}mm`,
    paddingBottom: `${model.page.margins.bottom}mm`,
    paddingLeft: `${model.page.margins.left}mm`,
  } as CSSProperties;
  return (
    <>
      <div
        id={id}
        role="region"
        aria-label={label}
        tabIndex={0}
        className="report-preview-viewport report-screen-only"
      >
        <div className="report-preview-paper" style={paperStyle}>
          <ReportDocument model={model} toolbar={false} />
        </div>
      </div>
      <ReportPrintSurface screenHidden>
        {/* Both copies inject the same per-template @page rule; identical today, so last-wins is
            harmless. If two *different* documents ever mount at once, the later-in-DOM rule wins
            for both — a constraint to lift before that exists. */}
        <ReportDocument model={model} toolbar={false} />
      </ReportPrintSurface>
    </>
  );
}
