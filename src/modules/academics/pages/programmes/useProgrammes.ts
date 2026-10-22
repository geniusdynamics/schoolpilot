// ABOUTME: The data behind the programme management page: each programme with the pack it is pinned to,
// ABOUTME: the pack's verification status and shape, and the other versions the library could upgrade it to.

import { useMemo } from 'react';

import { useEntityQuery } from '@/data/query';
import { MAX_LIMIT, type RepositoryRow } from '@/data/repository';
import type { PackVerification } from '@/domain/curriculum/registry';

import type { AvailablePack } from '@/components/setup/packs/packLibrary';

/** The whole collection: this screen is administrative and reads every row. */
const ALL = { limit: MAX_LIMIT } as const;

/** One programme as the management page shows it. */
export interface ProgrammeView {
  readonly programme: RepositoryRow<'programme'>;
  /** The pack source row recorded for the programme's pin, or null when none was installed. */
  readonly source: RepositoryRow<'curriculum_pack'> | null;
  /** The library pack that matches the pin, or null when the library does not ship it. */
  readonly pack: AvailablePack | null;
  /** The pack's verification, or null when the library does not hold the pinned version. */
  readonly verification: PackVerification | null;
  readonly levelCount: number;
  readonly learningAreaCount: number;
  readonly gradingScaleCount: number;
  readonly assessmentSchemeCount: number;
  readonly reportCount: number;
  /** Other versions of the same pack in the library, newest last. */
  readonly otherVersions: readonly AvailablePack[];
  /** True when a source row records the pin, so the pack is installed. */
  readonly installed: boolean;
}

export interface ProgrammesState {
  readonly loading: boolean;
  readonly error: unknown;
  readonly rows: readonly ProgrammeView[];
  readonly packs: readonly AvailablePack[];
}

/**
 * Reads the programmes and joins each to the pack it runs on.
 *
 * The join is by `code@version`, never by "the" programme: a school may run several, and the
 * page shows each with its own pack. A programme with no source row is shown as not installed
 * rather than hidden, because the demo school creates one and the reader must see it.
 */
export function useProgrammes(
  repository: Parameters<typeof useEntityQuery>[0],
  packs: readonly AvailablePack[]
): ProgrammesState {
  const programmes = useEntityQuery(repository, 'programme', ALL);
  const sources = useEntityQuery(repository, 'curriculum_pack', ALL);
  const levels = useEntityQuery(repository, 'level', ALL);
  const stages = useEntityQuery(repository, 'stage', ALL);
  const learningAreas = useEntityQuery(repository, 'learning_area', ALL);
  const gradingScales = useEntityQuery(repository, 'grading_scale', ALL);
  const schemes = useEntityQuery(repository, 'assessment_scheme', ALL);

  const queries = [programmes, sources, levels, stages, learningAreas, gradingScales, schemes];
  const loading = queries.some((query) => query.status === 'loading');
  const error = queries.find((query) => query.status === 'error')?.error ?? null;

  const rows = useMemo<readonly ProgrammeView[]>(() => {
    const sourceRows = sources.data?.items ?? [];
    const levelRows = levels.data?.items ?? [];
    const stageRows = stages.data?.items ?? [];
    const areaRows = learningAreas.data?.items ?? [];
    const scaleRows = gradingScales.data?.items ?? [];
    const schemeRows = schemes.data?.items ?? [];

    const stageIdsOf = (programmeId: string) =>
      new Set<string>(stageRows.filter((stage) => stage.programme_id === programmeId).map((stage) => stage.id));

    return (programmes.data?.items ?? [])
      .slice()
      .sort((left, right) => left.name.localeCompare(right.name))
      .map((programme) => {
        const source =
          sourceRows.find(
            (row) =>
              row.code === programme.curriculum_pack_code &&
              row.version === programme.pack_version &&
              row.institution_id === programme.institution_id
          ) ?? null;
        const pack =
          packs.find(
            (candidate) =>
              candidate.code === programme.curriculum_pack_code &&
              candidate.version === programme.pack_version
          ) ?? null;
        const stageIds = stageIdsOf(programme.id);
        const programmeLevels = levelRows.filter((level) => stageIds.has(level.stage_id));
        const programmeAreas = areaRows.filter((area) => area.programme_id === programme.id);

        return {
          programme,
          source,
          pack,
          verification: pack?.verification ?? null,
          levelCount: programmeLevels.length,
          learningAreaCount: programmeAreas.length,
          gradingScaleCount: scaleRows.filter((scale) => scale.programme_id === programme.id).length,
          assessmentSchemeCount: schemeRows.filter((scheme) => scheme.programme_id === programme.id).length,
          reportCount: pack?.reports.length ?? 0,
          otherVersions: packs
            .filter(
              (candidate) =>
                candidate.code === programme.curriculum_pack_code &&
                candidate.version !== programme.pack_version
            )
            .sort((left, right) =>
              left.version.localeCompare(right.version, undefined, { numeric: true })
            ),
          installed: source !== null,
        };
      });
  }, [
    programmes.data,
    sources.data,
    levels.data,
    stages.data,
    learningAreas.data,
    gradingScales.data,
    schemes.data,
    packs,
  ]);

  return { loading, error, rows, packs };
}
