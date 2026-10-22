// ABOUTME: The competency heat-map: learners against the competencies or outcomes they were observed
// ABOUTME: on, with each cell carrying the pack's own rubric level code and label so the level is
// ABOUTME: readable without colour. Cells come from E02's own latest-observation rule.

import { cellKeyOf, latestByCell } from '@/modules/academics/pages/observations/data/judgement';
import type { ObservationRecord } from '@/modules/academics/pages/observations/data/judgement';

import type {
  AnalysisLearner,
  HeatmapCell,
  HeatmapColumn,
  HeatmapLevel,
  HeatmapMode,
  HeatmapRow,
  HeatmapView,
} from './types';

export interface HeatmapRequest {
  readonly mode: HeatmapMode;
  readonly learningAreaName: string | null;
  readonly learners: readonly AnalysisLearner[];
  readonly columns: readonly HeatmapColumn[];
  readonly observations: readonly ObservationRecord[];
  /** The pack's levels in declared order; the order is the pack's, never the page's. */
  readonly levels: readonly HeatmapLevel[];
}

/** The level a code names, or null when the recorded code is not on the pack's scale. */
function levelOf(levels: ReadonlyMap<string, HeatmapLevel>, code: string): HeatmapLevel | null {
  return levels.get(code) ?? null;
}

/**
 * Builds the heat-map.
 *
 * The latest observation of each learner-and-target cell wins, using E02's rule, so a correction
 * captured after an original supersedes it here too. A recorded level the pack's scale does not
 * name keeps its raw code and is shown as unknown rather than being silently dropped.
 */
export function buildHeatmap(request: HeatmapRequest): HeatmapView {
  const levels = new Map(request.levels.map((level) => [level.code, level] as const));
  const latest = latestByCell(request.observations, request.mode);

  let recorded = 0;
  const rows: HeatmapRow[] = request.learners.map((learner) => {
    const cells: HeatmapCell[] = request.columns.map((column) => {
      const observation = latest.get(cellKeyOf(column.key, learner.enrolmentId));
      if (observation === undefined) {
        return {
          columnId: column.id,
          levelCode: null,
          levelLabel: null,
          points: null,
          observedOn: null,
        };
      }
      recorded += 1;
      const level = levelOf(levels, observation.rubric_level);
      return {
        columnId: column.id,
        levelCode: observation.rubric_level,
        levelLabel: level?.label ?? null,
        points: level?.points ?? null,
        observedOn: observation.observed_on,
      };
    });
    return {
      enrolmentId: learner.enrolmentId,
      learnerName: learner.learnerName,
      admissionNumber: learner.admissionNumber,
      cells,
    };
  });

  return {
    mode: request.mode,
    learningAreaName: request.learningAreaName,
    columns: request.columns,
    levels: request.levels,
    rows,
    recorded,
    total: request.learners.length * request.columns.length,
  };
}
