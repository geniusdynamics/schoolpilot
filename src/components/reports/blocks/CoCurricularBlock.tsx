// ABOUTME: The co-curricular block: the clubs, sports and service activities the learner took part in.

import type { ReactNode } from 'react';
import type { ReportBlockModel } from '@/domain/reports/types';
import { Ltr } from './shared';

export type CoCurricularBlockModel = Extract<ReportBlockModel, { kind: 'co_curricular' }>;

export function CoCurricularBlock({ block }: { block: CoCurricularBlockModel }): ReactNode {
  return (
    <ul className="report-list">
      {block.payload.activities.map((activity) => (
        <li key={activity}>
          <Ltr>{activity}</Ltr>
        </li>
      ))}
    </ul>
  );
}
