// ABOUTME: The signatures block: one ruled signature line per role, kept whole across a page break.

import type { ReactNode } from 'react';
import { roleLabel } from '@/domain/reports/labels';
import type { ReportBlockModel, ReportLabels } from '@/domain/reports/types';
import { Ltr } from './shared';

export type SignaturesBlockModel = Extract<ReportBlockModel, { kind: 'signatures' }>;

export function SignaturesBlock({ block, labels }: { block: SignaturesBlockModel; labels: ReportLabels }): ReactNode {
  return (
    <div className="report-signatures">
      {block.payload.signatures.map((signature) => (
        <div className="report-signature" key={signature.role}>
          <div className="report-signature__role">{roleLabel(labels, 'signature', signature.role)}</div>
          <div className="report-signature__name">{signature.name ? <Ltr>{signature.name}</Ltr> : '\u00a0'}</div>
        </div>
      ))}
    </div>
  );
}
