// ABOUTME: Dispatches one resolved block to its component, around the shared heading and empty state.
// ABOUTME: Every block kind of the report schema has a component here; a block with no data says so.

import type { ReactNode } from 'react';
import type { ReportBlockModel, ReportLabels } from '@/domain/reports/types';
import { AffectivePsychomotorBlock } from './blocks/AffectivePsychomotorBlock';
import { AttendanceBlock } from './blocks/AttendanceBlock';
import { CalendarBlock } from './blocks/CalendarBlock';
import { CoCurricularBlock } from './blocks/CoCurricularBlock';
import { CommentsBlock } from './blocks/CommentsBlock';
import { CompetenciesBlock } from './blocks/CompetenciesBlock';
import { FeesBlock } from './blocks/FeesBlock';
import { HeaderBlock } from './blocks/HeaderBlock';
import { LearnerBlock } from './blocks/LearnerBlock';
import { ProgressionBlock } from './blocks/ProgressionBlock';
import { ResultsTableBlock } from './blocks/ResultsTableBlock';
import { RubricTableBlock } from './blocks/RubricTableBlock';
import { SignaturesBlock } from './blocks/SignaturesBlock';
import { SummaryBlock } from './blocks/SummaryBlock';
import { VerificationBlock } from './blocks/VerificationBlock';
import { BlockHeading, EmptyState } from './blocks/shared';

function content(block: ReportBlockModel, labels: ReportLabels): ReactNode {
  switch (block.kind) {
    case 'header':
      return <HeaderBlock block={block} />;
    case 'learner':
      return <LearnerBlock block={block} labels={labels} />;
    case 'attendance':
      return <AttendanceBlock block={block} labels={labels} />;
    case 'results_table':
      return <ResultsTableBlock block={block} />;
    case 'rubric_table':
      return <RubricTableBlock block={block} />;
    case 'competencies':
      return <CompetenciesBlock block={block} />;
    case 'affective_psychomotor':
      return <AffectivePsychomotorBlock block={block} />;
    case 'co_curricular':
      return <CoCurricularBlock block={block} />;
    case 'summary':
      return <SummaryBlock block={block} labels={labels} />;
    case 'comments':
      return <CommentsBlock block={block} labels={labels} />;
    case 'progression':
      return <ProgressionBlock block={block} labels={labels} />;
    case 'fees':
      return <FeesBlock block={block} labels={labels} />;
    case 'calendar':
      return <CalendarBlock block={block} labels={labels} />;
    case 'signatures':
      return <SignaturesBlock block={block} labels={labels} />;
    case 'verification':
      return <VerificationBlock block={block} labels={labels} />;
  }
}

export function ReportBlock({ block, labels }: { block: ReportBlockModel; labels: ReportLabels }): ReactNode {
  const classes = ['report-block'];
  if (block.flow) classes.push('report-block--flow');
  if (block.kind === 'header') classes.push('report-block--header');
  return (
    <section
      className={classes.join(' ')}
      data-block={block.kind}
      data-empty={block.emptyText ? 'true' : undefined}
      data-flow={block.flow ? 'true' : undefined}
    >
      {block.heading ? <BlockHeading label={block.heading} /> : null}
      {block.emptyText ? <EmptyState text={block.emptyText} /> : content(block, labels)}
    </section>
  );
}
