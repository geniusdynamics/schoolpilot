// ABOUTME: The core competencies and values block: one rating row per competency.

import type { ReactNode } from 'react';
import type { ReportBlockModel } from '@/domain/reports/types';
import { RatingTable } from './RatingTable';

export type CompetenciesBlockModel = Extract<ReportBlockModel, { kind: 'competencies' }>;

export function CompetenciesBlock({ block }: { block: CompetenciesBlockModel }): ReactNode {
  return <RatingTable ratings={block.payload.ratings} />;
}
