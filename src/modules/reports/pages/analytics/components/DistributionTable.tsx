// ABOUTME: The distribution panel the analysis tables share: a mean, the completeness of the
// ABOUTME: population, and the band counts in the scale's own order. Every number is text, so the
// ABOUTME: panel reads the same without colour.

import React from 'react';

import { displayNumber } from '@/modules/academics/pages/results';

import type { CohortSummary } from '../analysis';

export interface DistributionTableProps {
  /** The exact mean, canonical text; null when nobody in the population has a result. */
  readonly summary: CohortSummary;
  /** What the numbers count: `%` for a percentage, empty for points or a bare number. */
  readonly unit?: string;
  /** The label the mean row is shown under. */
  readonly meanLabel?: string;
  readonly testId?: string;
}

/** The completeness line, so an incomplete cohort is visible rather than averaged away. */
export const CompletenessLine: React.FC<{ summary: CohortSummary; testId?: string }> = ({
  summary,
  testId,
}) => (
  <p className="text-xs text-surface-muted-fg" data-testid={testId}>
    {summary.withResult} of {summary.total} learner(s) have a result
    {summary.missing > 0 ? `; ${summary.missing} have none` : ''}.
  </p>
);

const DistributionTable: React.FC<DistributionTableProps> = ({
  summary,
  unit = '',
  meanLabel = 'Mean',
  testId,
}) => {
  const total = summary.distribution.reduce((sum, band) => sum + band.count, 0);
  return (
    <div className="space-y-2" data-testid={testId}>
      <p className="text-sm text-surface-foreground">
        <span className="font-medium">{meanLabel}: </span>
        {summary.mean === null ? (
          <span className="text-surface-muted-fg">No result yet</span>
        ) : (
          <span data-testid={testId ? `${testId}-mean` : undefined}>
            {displayNumber(summary.mean)}
            {unit}
          </span>
        )}
      </p>
      <CompletenessLine summary={summary} testId={testId ? `${testId}-completeness` : undefined} />
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <caption className="sr-only">Distribution of bands</caption>
          <thead>
            <tr className="text-surface-muted-fg">
              <th scope="col" className="py-1 pr-3 font-medium">
                Band
              </th>
              <th scope="col" className="py-1 pr-3 text-right font-medium">
                Learners
              </th>
              <th scope="col" className="py-1 font-medium">
                Share
              </th>
            </tr>
          </thead>
          <tbody>
            {summary.distribution.map((band) => {
              const share = total === 0 ? 0 : Math.round((band.count / total) * 100);
              return (
                <tr key={band.code} className="border-t border-surface-border">
                  <th scope="row" className="py-1 pr-3 font-normal text-surface-foreground">
                    {band.label}
                  </th>
                  <td className="py-1 pr-3 text-right tabular-nums text-surface-foreground">
                    {band.count}
                  </td>
                  <td className="py-1">
                    <span className="flex items-center gap-2">
                      <span
                        aria-hidden="true"
                        className="h-2 rounded bg-primary-500"
                        style={{ width: `${share}%`, minWidth: share > 0 ? '2px' : '0' }}
                      />
                      <span className="tabular-nums text-surface-muted-fg">{share}%</span>
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DistributionTable;
