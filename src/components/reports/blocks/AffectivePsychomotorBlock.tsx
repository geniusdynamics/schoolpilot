// ABOUTME: The affective and psychomotor block: the same rating table used for competencies, over the
// ABOUTME: trait ratings a Nigeria/Ghana-style template records.

import type { ReactNode } from 'react';
import type { ReportBlockModel } from '@/domain/reports/types';
import { RatingTable } from './RatingTable';

export type AffectivePsychomotorBlockModel = Extract<ReportBlockModel, { kind: 'affective_psychomotor' }>;

export function AffectivePsychomotorBlock({ block }: { block: AffectivePsychomotorBlockModel }): ReactNode {
  return <RatingTable ratings={block.payload.ratings} />;
}
