// ABOUTME: The fees block: balance and next-term fees, shown only when the template includes it and the
// ABOUTME: school's policy allows it.

import type { ReactNode } from 'react';
import type { ReportBlockModel, ReportLabels } from '@/domain/reports/types';
import { DetailList, Ltr } from './shared';

export type FeesBlockModel = Extract<ReportBlockModel, { kind: 'fees' }>;

export function FeesBlock({ block, labels }: { block: FeesBlockModel; labels: ReportLabels }): ReactNode {
  const { fees } = block.payload;
  const rows: { label: string; value: string }[] = [];
  if (fees.balance) rows.push({ label: labels.get('fees.balance'), value: fees.balance });
  if (fees.nextTerm) rows.push({ label: labels.get('fees.next_term'), value: fees.nextTerm });
  return (
    <>
      <DetailList rows={rows} />
      {fees.note ? (
        <p className="report-descriptor">
          <Ltr>{fees.note}</Ltr>
        </p>
      ) : null}
    </>
  );
}
