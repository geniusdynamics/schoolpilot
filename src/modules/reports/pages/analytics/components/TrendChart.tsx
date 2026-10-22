// ABOUTME: One metric across periods as a series. A period with no result is a gap: the line breaks
// ABOUTME: there and the table says so, so a missing period is never interpolated and never zero.

import React from 'react';

import { displayNumber } from '@/modules/academics/pages/results';

import type { TrendSeries } from '../analysis';

export interface TrendChartProps {
  readonly series: TrendSeries;
  /** What the values count: `%` for a percentage, empty for points. */
  readonly unit?: string;
}

const CHART_HEIGHT = 160;
const CHART_WIDTH = 100;
const PADDING = 10;

interface PlotPoint {
  readonly index: number;
  readonly value: string;
  readonly numeric: number;
  readonly x: number;
  readonly y: number;
}

/**
 * The chart's own geometry.
 *
 * Only periods with a value become points, so a gap produces no point and the polyline is broken
 * across it. The y range is taken from the values that exist, so a gap never pulls the line to
 * zero.
 */
function plot(series: TrendSeries): { readonly points: readonly PlotPoint[]; readonly segments: readonly PlotPoint[][] } {
  const present = series.points
    .map((point, index) => ({ point, index }))
    .filter((entry): entry is { point: TrendSeries['points'][number] & { value: string }; index: number } =>
      entry.point.value !== null
    );
  if (present.length === 0) return { points: [], segments: [] };

  const numbers = present.map((entry) => Number(entry.point.value));
  const min = Math.min(...numbers);
  const max = Math.max(...numbers);
  const range = max - min || 1;
  const span = series.points.length > 1 ? series.points.length - 1 : 1;

  const points = present.map((entry) => ({
    index: entry.index,
    value: entry.point.value,
    numeric: Number(entry.point.value),
    x: (entry.index / span) * CHART_WIDTH,
    y: CHART_HEIGHT - PADDING - ((Number(entry.point.value) - min) / range) * (CHART_HEIGHT - 2 * PADDING),
  }));

  const segments: PlotPoint[][] = [];
  let run: PlotPoint[] = [];
  points.forEach((point, position) => {
    const previous = points[position - 1];
    if (previous !== undefined && point.index !== previous.index + 1) {
      segments.push(run);
      run = [];
    }
    run.push(point);
  });
  if (run.length > 0) segments.push(run);
  return { points, segments };
}

const TrendChart: React.FC<TrendChartProps> = ({ series, unit = '' }) => {
  const { points, segments } = plot(series);
  const gaps = series.points.filter((point) => point.value === null);

  return (
    <div className="space-y-3" data-testid={`trend-${series.key}`}>
      <p className="text-sm text-surface-foreground">
        <span className="font-medium">{series.label}</span>
        <span className="text-surface-muted-fg">
          {' '}
          · {points.length} of {series.points.length} period(s) have a result
          {gaps.length > 0 ? `; ${gaps.length} have none` : ''}.
        </span>
      </p>

      {points.length === 0 ? (
        <p className="text-sm text-surface-muted-fg">No result in any period for this metric.</p>
      ) : (
        <svg
          viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
          preserveAspectRatio="none"
          className="w-full"
          style={{ height: `${CHART_HEIGHT}px` }}
          role="img"
          aria-label={`${series.label} across ${series.points.length} period(s)`}
        >
          <title>{series.label}</title>
          {segments.map((segment, index) => (
            <polyline
              key={`segment-${index}`}
              data-testid={`trend-segment-${series.key}-${index}`}
              points={segment.map((point) => `${point.x},${point.y}`).join(' ')}
              fill="none"
              stroke="#6366f1"
              strokeWidth="1.5"
              vectorEffect="non-scaling-stroke"
            />
          ))}
          {points.map((point) => (
            <g key={`point-${point.index}`}>
              <circle
                data-testid={`trend-point-${series.key}-${point.index}`}
                cx={point.x}
                cy={point.y}
                r="2"
                fill="#6366f1"
                stroke="white"
                strokeWidth="0.5"
              />
              <text
                x={point.x}
                y={point.y - 4}
                textAnchor="middle"
                fontSize="5"
                fill="#374151"
              >
                {displayNumber(point.value)}
                {unit}
              </text>
            </g>
          ))}
        </svg>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <caption className="sr-only">{series.label} by period</caption>
          <thead>
            <tr className="text-surface-muted-fg">
              <th scope="col" className="py-1 pr-3 font-medium">
                Period
              </th>
              <th scope="col" className="py-1 pr-3 text-right font-medium">
                Value
              </th>
              <th scope="col" className="py-1 text-right font-medium">
                Learners with a result
              </th>
            </tr>
          </thead>
          <tbody>
            {series.points.map((point) => (
              <tr
                key={point.periodId}
                data-testid={point.value === null ? `trend-gap-${series.key}-${point.periodId}` : `trend-row-${series.key}-${point.periodId}`}
                className="border-t border-surface-border"
              >
                <th scope="row" className="py-1 pr-3 font-normal text-surface-foreground">
                  {point.periodName}
                </th>
                <td className="py-1 pr-3 text-right tabular-nums text-surface-foreground">
                  {point.value === null ? (
                    <span className="text-surface-muted-fg">No result</span>
                  ) : (
                    `${displayNumber(point.value)}${unit}`
                  )}
                </td>
                <td className="py-1 text-right tabular-nums text-surface-foreground">
                  {point.withResult} / {point.learners}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TrendChart;
