// ABOUTME: The progression block: the promoted/repeat decision on a final-term report, with its note.

import type { ReactNode } from 'react';
import type { ReportBlockModel, ReportLabels } from '@/domain/reports/types';
import { DetailList, Ltr } from './shared';

export type ProgressionBlockModel = Extract<ReportBlockModel, { kind: 'progression' }>;

export function ProgressionBlock({ block, labels }: { block: ProgressionBlockModel; labels: ReportLabels }): ReactNode {
  const { progression } = block.payload;
  return (
    <div className="report-progression">
      <p className="report-progression__decision">
        <span className="report-field__key">{labels.get('progression.decision')}</span>
        <span className="report-progression__value">
          <Ltr>{progression.decision}</Ltr>
        </span>
      </p>
      {progression.note ? <DetailList rows={[{ label: labels.get('progression.note'), value: progression.note }]} /> : null}
    </div>
  );
}
