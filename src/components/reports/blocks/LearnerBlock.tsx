// ABOUTME: The learner identity block: name, admission number, class, house, identifiers and photo in
// ABOUTME: a three-column field grid beside a photo frame.

import type { ReactNode } from 'react';
import type { ReportBlockModel, ReportLabels } from '@/domain/reports/types';
import { Field, Ltr } from './shared';

export type LearnerBlockModel = Extract<ReportBlockModel, { kind: 'learner' }>;

export function LearnerBlock({ block, labels }: { block: LearnerBlockModel; labels: ReportLabels }): ReactNode {
  const { learner, fields } = block.payload;
  return (
    <div className="report-identity">
      <div className="report-identity__fields">
        {fields.map((field) => (
          <Field key={`${field.key}:${field.value}`} label={labels.get(field.key)} value={field.value} />
        ))}
      </div>
      <div className="report-photo">
        {learner.photo ? <img src={learner.photo} alt="" /> : <Ltr>{labels.get('learner.photo')}</Ltr>}
      </div>
    </div>
  );
}
