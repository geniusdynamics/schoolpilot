// ABOUTME: The competency heat-map grid: learners against competencies or outcomes, each cell
// ABOUTME: carrying the pack's own level code and label as text beside its colour, so the level is
// ABOUTME: readable without seeing colour at all.

import React from 'react';

import type { HeatmapView } from '../analysis';

/** The tones a cell takes, in the pack's declared level order (best first). */
const LEVEL_TONES = [
  'bg-emerald-200 text-emerald-950',
  'bg-emerald-100 text-emerald-900',
  'bg-amber-100 text-amber-900',
  'bg-rose-100 text-rose-900',
  'bg-slate-200 text-slate-900',
];

export interface HeatmapGridProps {
  readonly view: HeatmapView;
}

const HeatmapGrid: React.FC<HeatmapGridProps> = ({ view }) => {
  if (view.columns.length === 0) {
    return (
      <p className="text-sm text-surface-muted-fg" data-testid="heatmap-empty">
        No {view.mode === 'competency' ? 'competencies' : 'outcomes'} to observe for this class yet.
      </p>
    );
  }
  if (view.rows.length === 0) {
    return (
      <p className="text-sm text-surface-muted-fg" data-testid="heatmap-empty">
        No active learners in this class.
      </p>
    );
  }

  const toneByCode = new Map(view.levels.map((level, index) => [level.code, LEVEL_TONES[index] ?? LEVEL_TONES[LEVEL_TONES.length - 1]] as const));

  return (
    <div className="space-y-3" data-testid="heatmap">
      <p className="text-xs text-surface-muted-fg" data-testid="heatmap-completeness">
        {view.recorded} of {view.total} cell(s) observed
        {view.learningAreaName === null ? '' : ` · ${view.learningAreaName}`}.
      </p>

      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-surface-muted-fg" aria-label="Level key">
        {view.levels.map((level, index) => (
          <li key={level.code} className="flex items-center gap-1">
            <span
              aria-hidden="true"
              className={`inline-block h-3 w-3 rounded ${(LEVEL_TONES[index] ?? LEVEL_TONES[LEVEL_TONES.length - 1]).split(' ')[0]}`}
            />
            <span className="font-medium text-surface-foreground">{level.code}</span>
            <span>{level.label}</span>
          </li>
        ))}
      </ul>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-xs">
          <caption className="sr-only">
            Rubric levels by learner and {view.mode === 'competency' ? 'competency' : 'outcome'}
          </caption>
          <thead>
            <tr>
              <th scope="col" className="py-1 pr-3 font-medium text-surface-muted-fg">
                Learner
              </th>
              {view.columns.map((column) => (
                <th key={column.id} scope="col" className="px-1 py-1 font-medium text-surface-muted-fg">
                  <abbr title={column.label} className="no-underline">
                    {column.code}
                  </abbr>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {view.rows.map((row) => (
              <tr key={row.enrolmentId} className="border-t border-surface-border">
                <th scope="row" className="whitespace-nowrap py-1 pr-3 font-normal text-surface-foreground">
                  {row.learnerName}
                </th>
                {row.cells.map((cell) => {
                  const tone =
                    cell.levelCode === null
                      ? 'bg-surface-muted text-surface-muted-fg'
                      : (toneByCode.get(cell.levelCode) ?? 'bg-slate-200 text-slate-900');
                  const label =
                    cell.levelCode === null
                      ? 'Not observed'
                      : (cell.levelLabel ?? `${cell.levelCode} (not on the pack scale)`);
                  return (
                    <td key={cell.columnId} className="px-1 py-1">
                      <span
                        data-testid={`heatmap-cell-${row.enrolmentId}-${cell.columnId}`}
                        data-level={cell.levelCode ?? ''}
                        title={cell.observedOn === null ? label : `${label} · observed ${cell.observedOn}`}
                        className={`inline-flex min-w-[2.5rem] justify-center rounded px-1 py-0.5 font-medium ${tone}`}
                      >
                        {cell.levelCode ?? '—'}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default HeatmapGrid;
