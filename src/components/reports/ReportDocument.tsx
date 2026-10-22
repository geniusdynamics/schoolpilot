// ABOUTME: The page frame of a printable report: one card = one sheet, with a render-time fit check that
// ABOUTME: applies the compact density, marks an overflow and exposes the measured height.

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import {
  DENSITY_SPACING,
  FIT_DENSITIES,
  resolveFit,
  type FitDensity,
  type FitReading,
  type FitResult,
} from '@/domain/reports/fit';
import { pageRuleCss } from '@/domain/reports/printCss';
import type { ReportDocumentModel } from '@/domain/reports/types';
import { ReportBlock } from './ReportBlock';
import { ReportToolbar } from './ReportToolbar';
import './report.css';

const PX_PER_MM = 96 / 25.4;

export interface ReportDocumentProps {
  readonly model: ReportDocumentModel;
  /** Receives the measured fit so a caller can assert "one card = one sheet". Keep it stable. */
  readonly onFit?: (fit: FitResult) => void;
  readonly toolbar?: boolean;
}

const documentKey = (model: ReportDocumentModel): string =>
  `${model.documentId}:${model.page.size}-${model.page.orientation}:${model.blocks.map((block) => block.kind).join(',')}`;

/**
 * Renders one report as a sheet. The fit check is an invariant, not a CSS hope: after layout the sheet
 * height is compared with the template's content box, the compact density is tried, and a sheet that
 * still does not fit is marked `data-overflow` and allowed to break — a two-page card is a defect the
 * renderer surfaces, never one it hides behind a "page 1 of 1" footer.
 */
export function ReportDocument({ model, onFit, toolbar = true }: ReportDocumentProps): ReactNode {
  const sheetRef = useRef<HTMLDivElement>(null);
  const readings = useRef<FitReading[]>([]);
  const lastKey = useRef<string | null>(null);
  const onFitRef = useRef(onFit);
  const [density, setDensity] = useState<FitDensity>('full');
  const [fit, setFit] = useState<FitResult | null>(null);
  const [measurePass, setMeasurePass] = useState(0);
  const { contentHeightMm } = model.page;
  const key = documentKey(model);
  // A flow document is a multi-page document by design; "one card = one sheet" does not apply to it.
  const isFlow = model.pagination === 'flow';

  onFitRef.current = onFit;

  // The first measurement can happen with fallback font metrics; the print font changes line wrapping,
  // so the fit is re-decided once the fonts are loaded (the same dependency printing has).
  useEffect(() => {
    const fonts = typeof document === 'undefined' ? undefined : document.fonts;
    if (!fonts?.ready) return;
    let cancelled = false;
    void fonts.ready.then(() => {
      if (!cancelled) setMeasurePass((pass) => pass + 1);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useLayoutEffect(() => {
    if (isFlow) {
      setFit(null);
      return;
    }
    const sheet = sheetRef.current;
    if (!sheet) return;
    if (lastKey.current !== key) {
      lastKey.current = key;
      readings.current = [];
      if (density !== 'full') {
        setDensity('full');
        return;
      }
      setFit(null);
    }
    // The sheet's min-height and pinned footer would clamp a short card to the page box, so the real
    // content height is read with both suspended for one synchronous layout pass.
    sheet.setAttribute('data-measuring', 'true');
    const heightMm = Math.round((sheet.scrollHeight / PX_PER_MM) * 10) / 10;
    sheet.removeAttribute('data-measuring');
    if (heightMm <= 0) return; // not laid out (jsdom, display:none): nothing to measure
    readings.current = [...readings.current.filter((reading) => reading.density !== density), { density, heightMm }];
    const pass = resolveFit(readings.current, contentHeightMm);
    const index = FIT_DENSITIES.indexOf(density);
    if (pass.overflow && index < FIT_DENSITIES.length - 1) {
      // Still over the box at this density: try the next one before declaring the card broken.
      setDensity(FIT_DENSITIES[index + 1]);
      return;
    }
    setFit(pass);
    onFitRef.current?.(pass);
  }, [density, isFlow, key, contentHeightMm, measurePass]);

  const style = {
    '--report-base': `${model.page.baseFontPt}pt`,
    '--report-sheet-width': `${model.page.contentWidthMm}mm`,
    '--report-sheet-height': `${model.page.contentHeightMm}mm`,
    '--report-space': String(DENSITY_SPACING[density]),
  } as CSSProperties;

  return (
    <div
      className={model.pagination === 'flow' ? 'report-document report-document--flow' : 'report-document'}
      dir={model.dir}
      lang={model.locale}
      style={style}
      data-page={`${model.page.size}-${model.page.orientation}`}
      data-density={density}
      data-overflow={isFlow ? 'n/a' : fit?.overflow ? 'true' : 'false'}
      data-height-mm={fit ? String(fit.heightMm) : undefined}
      data-content-height-mm={String(contentHeightMm)}
      data-layout={model.reduction.applied ? 'reduced' : 'full'}
      data-preview={model.preview ? 'true' : 'false'}
      data-document-id={model.documentId}
    >
      {/* Per-template page geometry. Emitted here so no global @page can win. */}
      <style>{pageRuleCss(model.page, model.furniture)}</style>
      {toolbar ? <ReportToolbar hint={`${model.page.size} ${model.page.orientation}, 100% scale, default margins`} /> : null}
      <div
        ref={sheetRef}
        className={model.pagination === 'flow' ? 'report-sheet report-sheet--flow' : 'report-sheet'}
        data-report-sheet="true"
      >
        {model.preview ? <div className="report-preview-banner">{model.labels.get('verification.preview')}</div> : null}
        {model.blocks.map((block) => (
          <ReportBlock key={`${block.kind}:${block.heading ?? ''}`} block={block} labels={model.labels} />
        ))}
        <footer className="report-sheet__footer">
          <div className="report-meta">
            <div>
              <bdi dir="ltr">
                {model.labels.get('document.id')} {model.documentId}
              </bdi>
            </div>
            {model.issuedAt ? (
              <div>
                <bdi dir="ltr">
                  {model.labels.get('document.issued')} {model.issuedAt}
                </bdi>
              </div>
            ) : null}
          </div>
        </footer>
      </div>
    </div>
  );
}
