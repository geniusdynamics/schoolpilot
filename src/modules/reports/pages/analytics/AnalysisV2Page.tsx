// ABOUTME: Analysis v2: subject, class-group and teacher analysis, period trends and competency
// ABOUTME: heat-maps, all read from the results engine's own computation and the actor's scope. When
// ABOUTME: the pack's ranking policy is disabled the page renders no place, ordinal or rank at all.

import React, { useMemo, useState } from 'react';

import Card from '@/components/ui/Card';
import Spinner from '@/components/ui/Spinner';
import type { AggregationDefinition, RankingPolicy } from '@/domain/assessment/aggregation';
import type { GradingScaleDefinition } from '@/domain/assessment/scales';
import type { Id } from '@/domain/ids';
import type { ObservationPack } from '@/modules/academics/pages/observations';
import { displayNumber } from '@/modules/academics/pages/results';

import { useAnalysis } from './analysis';
import type { CohortSummary, HeatmapMode, TeacherAnalysisRow } from './analysis';
import DistributionTable from './components/DistributionTable';
import HeatmapGrid from './components/HeatmapGrid';
import RankingTable from './components/RankingTable';
import TrendChart from './components/TrendChart';

export type AnalysisTab = 'subject' | 'group' | 'teacher' | 'trends' | 'heatmap';

export interface AnalysisV2PageProps {
  readonly actorId: string;
  readonly role?: string | null;
  readonly periodId?: Id<'academic_period'> | null;
  readonly classGroupId?: Id<'class_group'> | null;
  readonly aggregation?: AggregationDefinition;
  /** Overrides the pack's policy; the pack's own when absent. */
  readonly ranking?: RankingPolicy;
  readonly pack?: ObservationPack;
  readonly extraScales?: readonly GradingScaleDefinition[];
  readonly learningAreaId?: string;
  readonly initialTab?: AnalysisTab;
}

const TABS: readonly { readonly id: AnalysisTab; readonly label: string }[] = [
  { id: 'subject', label: 'Subject analysis' },
  { id: 'group', label: 'Class analysis' },
  { id: 'teacher', label: 'Teacher analysis' },
  { id: 'trends', label: 'Trends' },
  { id: 'heatmap', label: 'Competency heat-map' },
];

const EMPTY_BY_TAB: Record<AnalysisTab, string> = {
  subject: 'No learning area has a result in this period yet.',
  group: 'No class group in your scope has a result in this period yet.',
  teacher: 'No teacher in your scope has a group with a result in this period yet.',
  trends: 'No period in this year has a result yet.',
  heatmap: 'No competency observations have been recorded for this class yet.',
};

/** The number of learners a summary counted, in the words the tables use. */
function population(summary: CohortSummary): string {
  return `${summary.withResult} of ${summary.total}`;
}

const TeacherTable: React.FC<{ readonly rows: readonly TeacherAnalysisRow[] }> = ({ rows }) => (
  <div className="overflow-x-auto">
    <table className="w-full text-left text-sm" data-testid="teacher-table">
      <caption className="sr-only">Teacher analysis for the selected period</caption>
      <thead>
        <tr className="text-xs text-surface-muted-fg">
          <th scope="col" className="py-1 pr-3 font-medium">
            Teacher
          </th>
          <th scope="col" className="py-1 pr-3 font-medium">
            Class groups
          </th>
          <th scope="col" className="py-1 pr-3 text-right font-medium">
            Learners with a result
          </th>
          <th scope="col" className="py-1 pr-3 text-right font-medium">
            Mean
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.staffId} className="border-t border-surface-border" data-testid={`teacher-${row.staffId}`}>
            <th scope="row" className="py-1 pr-3 font-normal text-surface-foreground">
              {row.name}
            </th>
            <td className="py-1 pr-3 text-surface-muted-fg">{row.classGroups.join(', ')}</td>
            <td className="py-1 pr-3 text-right tabular-nums text-surface-foreground">
              {population(row.summary)}
            </td>
            <td className="py-1 pr-3 text-right tabular-nums text-surface-foreground">
              {row.summary.mean === null ? '—' : displayNumber(row.summary.mean)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export const AnalysisV2PageContent: React.FC<AnalysisV2PageProps> = ({
  actorId,
  role = null,
  periodId = null,
  classGroupId = null,
  aggregation,
  ranking,
  pack,
  extraScales,
  learningAreaId = '',
  initialTab = 'subject',
}) => {
  const [tab, setTab] = useState<AnalysisTab>(initialTab);
  const [metricKey, setMetricKey] = useState<string | null>(null);
  const [mode, setMode] = useState<HeatmapMode>('competency');

  const analysis = useAnalysis({
    actorId,
    role,
    periodId,
    classGroupId,
    ...(aggregation === undefined ? {} : { aggregation }),
    ...(ranking === undefined ? {} : { ranking }),
    ...(pack === undefined ? {} : { pack }),
    ...(extraScales === undefined ? {} : { extraScales }),
    learningAreaId,
    heatmapMode: mode,
  });

  const series = useMemo(() => {
    if (analysis.trends.length === 0) return null;
    return analysis.trends.find((candidate) => candidate.key === metricKey) ?? analysis.trends[0];
  }, [analysis.trends, metricKey]);

  if (analysis.state === 'loading') {
    return (
      <div data-testid="analysis-page" className="flex items-center justify-center p-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (analysis.state === 'error') {
    return (
      <div data-testid="analysis-page" className="p-6">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          The analysis could not be read from the records.
        </p>
      </div>
    );
  }

  if (analysis.state === 'no-scope') {
    return (
      <div data-testid="analysis-page" className="p-6">
        <p className="text-sm text-surface-muted-fg">
          {analysis.scope.reason} Analysis reads the groups you are assigned to.
        </p>
      </div>
    );
  }

  const heading = (
    <header className="space-y-1">
      <h1 className="text-2xl font-bold text-surface-foreground">Analysis</h1>
      <p className="text-sm text-surface-muted-fg">
        {analysis.periodName ?? 'No period'}
        {analysis.classGroupName === null ? '' : ` · ${analysis.classGroupName}`} ·{' '}
        {analysis.aggregationNote}
      </p>
    </header>
  );

  const body = (() => {
    if (analysis.state === 'no-areas') {
      return <p className="text-sm text-surface-muted-fg">{EMPTY_BY_TAB[tab]}</p>;
    }
    if (analysis.state === 'no-learners') {
      return (
        <p className="text-sm text-surface-muted-fg">
          No learner is a member of these classes in this period yet.
        </p>
      );
    }

    switch (tab) {
      case 'subject':
        return (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2" data-testid="subject-analysis">
            {analysis.subjects.map((row) => (
              <Card key={row.code} title={row.name} subtitle={`${row.classes} class group(s)`}>
                <div data-testid={`subject-${row.code}`}>
                  <DistributionTable summary={row.summary} unit="%" testId={`subject-summary-${row.code}`} />
                </div>
              </Card>
            ))}
          </div>
        );
      case 'group':
        return (
          <div className="space-y-4" data-testid="group-analysis">
            <RankingTable view={analysis.ranking} />
            {analysis.groups.map((row) => (
              <Card key={row.classGroupId} title={`${row.levelName} · ${row.name}`}>
                <div className="space-y-3" data-testid={`group-${row.classGroupId}`}>
                  <DistributionTable summary={row.summary} testId={`group-summary-${row.classGroupId}`} />
                  {row.missingLearners.length > 0 ? (
                    <div data-testid={`group-missing-${row.classGroupId}`} className="space-y-1">
                      <p className="text-xs font-medium text-surface-foreground">
                        {row.missingLearners.length} learner(s) with no result
                      </p>
                      <ul className="list-inside list-disc text-xs text-surface-muted-fg">
                        {row.missingLearners.map((learner) => (
                          <li key={learner.enrolmentId}>
                            {learner.learnerName}
                            {learner.reason === null ? '' : ` — ${learner.reason}`}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <p className="text-xs text-surface-muted-fg">Every learner in this class has a result.</p>
                  )}
                </div>
              </Card>
            ))}
          </div>
        );
      case 'teacher':
        return (
          <div className="space-y-4" data-testid="teacher-analysis">
            {analysis.teachers.length === 0 ? (
              <p className="text-sm text-surface-muted-fg">{EMPTY_BY_TAB.teacher}</p>
            ) : (
              <TeacherTable rows={analysis.teachers} />
            )}
          </div>
        );
      case 'trends':
        return (
          <div className="space-y-4" data-testid="trends-analysis">
            {series === null ? (
              <p className="text-sm text-surface-muted-fg">{EMPTY_BY_TAB.trends}</p>
            ) : (
              <>
                <div className="flex flex-wrap gap-2">
                  {analysis.trends.map((candidate) => (
                    <button
                      key={candidate.key}
                      type="button"
                      aria-pressed={candidate.key === series.key}
                      onClick={() => setMetricKey(candidate.key)}
                      className={`rounded-md px-2 py-1 text-xs font-medium ${
                        candidate.key === series.key
                          ? 'bg-primary-600 text-white'
                          : 'bg-surface-muted text-surface-foreground'
                      }`}
                    >
                      {candidate.label}
                    </button>
                  ))}
                </div>
                <Card>
                  <TrendChart series={series} unit={series.key === analysis.aggregateCode ? '' : '%'} />
                </Card>
              </>
            )}
          </div>
        );
      case 'heatmap':
        return (
          <div className="space-y-4" data-testid="heatmap-analysis">
            <div className="flex flex-wrap gap-2">
              {(['competency', 'outcome'] as const).map((candidate) => (
                <button
                  key={candidate}
                  type="button"
                  aria-pressed={mode === candidate}
                  onClick={() => setMode(candidate)}
                  className={`rounded-md px-2 py-1 text-xs font-medium ${
                    mode === candidate ? 'bg-primary-600 text-white' : 'bg-surface-muted text-surface-foreground'
                  }`}
                >
                  {candidate === 'competency' ? 'Competencies' : 'Outcomes'}
                </button>
              ))}
            </div>
            <Card>
              <HeatmapGrid view={analysis.heatmap} />
            </Card>
          </div>
        );
    }
  })();

  return (
    <div data-testid="analysis-page" className="space-y-4 p-6">
      {heading}
      <div role="tablist" aria-label="Analysis views" className="flex flex-wrap gap-2">
        {TABS.map((entry) => (
          <button
            key={entry.id}
            type="button"
            role="tab"
            id={`analysis-tab-${entry.id}`}
            aria-selected={tab === entry.id}
            aria-controls={`analysis-panel-${entry.id}`}
            onClick={() => setTab(entry.id)}
            className={`min-h-[36px] rounded-md px-3 py-1 text-sm font-medium ${
              tab === entry.id ? 'bg-primary-600 text-white' : 'bg-surface-muted text-surface-foreground'
            }`}
          >
            {entry.label}
          </button>
        ))}
      </div>
      <section role="tabpanel" id={`analysis-panel-${tab}`} aria-labelledby={`analysis-tab-${tab}`}>
        {body}
      </section>
    </div>
  );
};

export default AnalysisV2PageContent;
