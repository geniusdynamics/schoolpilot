// ABOUTME: The page frame of a printable receipt: one sheet for A5/A4 (with the template's `@page`
// ABOUTME: geometry and margin-box furniture) or a continuous 72 mm roll for thermal, which has no
// ABOUTME: page box at all. Renders the same receipt data whichever profile is chosen.

import type { CSSProperties, ReactNode } from 'react';

import { pageRuleCss } from '@/domain/reports/printCss';
import { printReport } from '@/components/reports';

import {
  ReceiptAllocation,
  ReceiptAmount,
  ReceiptBalance,
  ReceiptChannel,
  ReceiptFooter,
  ReceiptHeader,
  ReceiptIdentity,
  ReceiptVerification,
} from './ReceiptParts';
import type { ReceiptDocumentModel } from './types';
import '@/components/reports/report.css';
import './receipt.css';

export interface ReceiptDocumentProps {
  readonly model: ReceiptDocumentModel;
  /** The on-screen print toolbar. Hidden in print, and absent from a snapshot that should not carry it. */
  readonly toolbar?: boolean;
}

/** The print hint each profile shows. A roll's scale is its width, not a page. */
function printHint(model: ReceiptDocumentModel): string {
  if (model.rollWidthMm !== null) {
    return `${model.labels.rollWidth} · ${model.rollWidthMm} mm print width, 100% scale`;
  }
  return `${model.page?.size} ${model.page?.orientation}, 100% scale, default margins`;
}

/**
 * Renders one receipt. The `@page` rule is emitted per document from the template geometry so no
 * global rule can win; thermal emits none, because a roll is not a sheet and the printer's driver
 * owns the roll's length.
 */
export function ReceiptDocument({ model, toolbar = true }: ReceiptDocumentProps): ReactNode {
  const style = {
    '--receipt-sheet-width': `${model.contentWidthMm}mm`,
    '--receipt-base': model.page ? `${model.page.baseFontPt}pt` : '8pt',
  } as CSSProperties;

  return (
    <div
      className={`receipt-document receipt-document--${model.kind}`}
      dir={model.dir}
      lang={model.locale}
      style={style}
      data-template={model.kind}
      data-page={model.page ? `${model.page.size}-${model.page.orientation}` : 'roll'}
      data-roll-width-mm={model.rollWidthMm === null ? undefined : String(model.rollWidthMm)}
      data-content-width-mm={String(model.contentWidthMm)}
      data-preview={model.preview ? 'true' : 'false'}
      data-document-id={model.documentId}
    >
      {/* Per-template page geometry. Emitted here so no global @page can win. Thermal emits nothing. */}
      {model.page && model.furniture ? <style>{pageRuleCss(model.page, model.furniture)}</style> : null}
      {toolbar ? (
        <div className="receipt-toolbar receipt-screen-only">
          <button type="button" className="receipt-toolbar__button" onClick={() => void printReport()}>
            {model.labels.title}
          </button>
          <span className="receipt-toolbar__hint">{printHint(model)}</span>
        </div>
      ) : null}
      <div className="receipt-sheet" data-receipt-sheet="true">
        {model.preview ? <div className="receipt-preview-banner">{model.labels.previewBanner}</div> : null}
        <ReceiptHeader model={model} />
        <ReceiptIdentity model={model} />
        <ReceiptAmount model={model} />
        <ReceiptChannel model={model} />
        <ReceiptAllocation model={model} />
        <ReceiptBalance model={model} />
        <ReceiptVerification model={model} />
        <ReceiptFooter model={model} />
      </div>
    </div>
  );
}
