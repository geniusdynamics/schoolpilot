// ABOUTME: The summary block: total, mean, mean grade, division, position and any other figure the
// ABOUTME: aggregate produced, as a row of stat boxes.

import type { ReactNode } from 'react';
import type { ReportBlockModel, ReportLabels } from '@/domain/reports/types';
import { Stat } from './shared';

export type SummaryBlockModel = Extract<ReportBlockModel, { kind: 'summary' }>;

export function SummaryBlock({ block, labels }: { block: SummaryBlockModel; labels: ReportLabels }): ReactNode {
  const { items } = block.payload;
  return (
    <div className={items.length === 3 ? 'report-stats report-stats--three' : 'report-stats'}>
      {items.map((item) => (
        <Stat key={item.key} label={labels.get(item.key)} value={item.value} />
      ))}
    </div>
  );
}
