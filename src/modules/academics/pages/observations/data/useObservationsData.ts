// ABOUTME: The canonical rows the observation capture reads: the academics collections plus the
// ABOUTME: outcomes, competencies and observations those pages alone need.

import { useMemo } from 'react';

import { useEntityQuery } from '@/data/query';
import { MAX_LIMIT, type RepositoryRow } from '@/data/repository';

import { useCanonicalAcademics } from '@/modules/academics/data/useCanonicalAcademics';

/** These screens read the whole collection; the pages are administrative. */
const ALL = { limit: MAX_LIMIT } as const;

export type OutcomeRow = RepositoryRow<'outcome'>;
export type CompetencyRow = RepositoryRow<'competency'>;
export type ObservationRow = RepositoryRow<'competency_observation'>;

export function useObservationsData(learningAreaId = '') {
  const academics = useCanonicalAcademics();
  const repository = academics.repository;
  const outcomes = useEntityQuery(repository, 'outcome', ALL);
  const competencies = useEntityQuery(repository, 'competency', ALL);
  // Observations are narrowed to the chosen learning area: a school accumulates more than one page
  // of them over a year, and the page only ever shows the selected area.
  const observationQuery = useMemo(
    () => ({
      limit: MAX_LIMIT,
      ...(learningAreaId === '' ? {} : { where: { learning_area_id: learningAreaId } }),
    }),
    [learningAreaId]
  );
  const observations = useEntityQuery(repository, 'competency_observation', observationQuery, {
    enabled: learningAreaId !== '',
  });

  const isLoading =
    academics.isLoading ||
    outcomes.status === 'loading' ||
    competencies.status === 'loading' ||
    observations.status === 'loading';
  const isError =
    academics.isError ||
    outcomes.status === 'error' ||
    competencies.status === 'error' ||
    observations.status === 'error';
  const error = outcomes.error ?? competencies.error ?? observations.error ?? null;

  return {
    ...academics,
    outcomes: outcomes.data?.items ?? [],
    competencies: competencies.data?.items ?? [],
    observations: observations.data?.items ?? [],
    isLoading,
    isError,
    error,
  };
}
