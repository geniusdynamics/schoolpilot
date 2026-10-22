// ABOUTME: The verification block: the inline-SVG QR of the signed verification URL, its label and the
// ABOUTME: readable address. A preview document draws no QR at all and says so.

import type { ReactNode } from 'react';
import { qrSvgPath } from '@/domain/reports/qr';
import type { ReportBlockModel, ReportLabels } from '@/domain/reports/types';

export type VerificationBlockModel = Extract<ReportBlockModel, { kind: 'verification' }>;

export function VerificationBlock({ block, labels }: { block: VerificationBlockModel; labels: ReportLabels }): ReactNode {
  const { qr, url, preview, qrSizeMm } = block.payload;
  const rendered = qr ? qrSvgPath(qr) : null;
  return (
    <div className="report-verify">
      {qr && rendered ? (
        <div className={qrSizeMm >= 18 ? 'report-qr report-qr--large' : 'report-qr'} data-qr-version={qr.version} data-qr-size-mm={qrSizeMm}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox={`0 0 ${rendered.dimension} ${rendered.dimension}`}
            shapeRendering="crispEdges"
            role="img"
            aria-label={labels.get('verification.scan')}
          >
            <rect width={rendered.dimension} height={rendered.dimension} fill="#ffffff" />
            <path d={rendered.path} fill="#000000" />
          </svg>
        </div>
      ) : null}
      <div>
        <div
          className={preview ? 'report-verify__label report-verify__label--preview' : 'report-verify__label'}
          data-preview={preview ? 'true' : 'false'}
        >
          {preview ? labels.get('verification.preview') : labels.get('verification.scan')}
        </div>
        {url ? (
          <div className="report-verify__url">
            <bdi dir="ltr">{url}</bdi>
          </div>
        ) : null}
      </div>
    </div>
  );
}
