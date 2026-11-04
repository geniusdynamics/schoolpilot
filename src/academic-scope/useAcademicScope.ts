// ABOUTME: The hook behind the shared Year → Class → Stream → Period bar: canonical rows (every
// ABOUTME: page), cascade-safe setters, and the period default a required-period screen needs.

import { useCallback, useMemo, useState } from 'react';

import { useCanonicalRepository } from '@/data/canonicalRepository';
import { useEntityQuery } from '@/data/query';
import { currentPeriodOf } from '@/utils/academicLabels';

import {
  resolveAcademicScope,
  type ResolvedScope,
  type ScopeSelection,
} from './scope';

/** How the bar treats the period control. */
export type PeriodMode = 'none' | 'optional' | 'required';

/** What a screen receives from {@link useAcademicScope}. */
export interface AcademicScope {
  /** The validated scope: effective ids (never null) and the options the pickers list. */
  readonly scope: ResolvedScope;
  /** The raw selection, with `null` for "auto" fields. */
  readonly selection: ScopeSelection;
  readonly setYear: (yearId: string | null) => void;
  readonly setLevel: (levelId: string | null) => void;
  readonly setStream: (classGroupId: string | null) => void;
  readonly setPeriod: (periodId: string | null) => void;
  readonly reset: () => void;
  readonly status: 'loading' | 'ready' | 'error';
  readonly error: unknown;
}

const EVERY_PAGE = { allPages: true } as const;

/**
 * Reads the canonical calendar, class-group and level rows and resolves the shared scope.
 *
 * The setters cascade: choosing a year clears the class, stream and period; choosing a class
 * clears the stream; nothing downstream can survive a parent change. Defaults are derived, not
 * stored: `null` means "resolve it", so a late data load cannot strand an initial value.
 */
export function useAcademicScope(options: { readonly period?: PeriodMode } = {}): AcademicScope {
  const periodMode = options.period ?? 'none';
  const repository = useCanonicalRepository();

  const yearsQuery = useEntityQuery(repository, 'academic_year', {}, EVERY_PAGE);
  const periodsQuery = useEntityQuery(repository, 'academic_period', {}, EVERY_PAGE);
  const groupsQuery = useEntityQuery(repository, 'class_group', {}, EVERY_PAGE);
  const levelsQuery = useEntityQuery(repository, 'level', {}, EVERY_PAGE);
  const stagesQuery = useEntityQuery(repository, 'stage', {}, EVERY_PAGE);
  const programmesQuery = useEntityQuery(repository, 'programme', {}, EVERY_PAGE);

  const [selection, setSelection] = useState<ScopeSelection>({});

  const rows = useMemo(
    () => ({
      years: yearsQuery.data?.items ?? [],
      periods: periodsQuery.data?.items ?? [],
      classGroups: groupsQuery.data?.items ?? [],
      // A level belongs to a stage and a stage to a programme, so the level's programme is
      // resolved here once: the resolver only needs it to disambiguate duplicate level names.
      levels: (levelsQuery.data?.items ?? []).map((level) => ({
        ...level,
        programme_id: (stagesQuery.data?.items ?? []).find((stage) => stage.id === level.stage_id)
          ?.programme_id,
      })),
      programmes: programmesQuery.data?.items ?? [],
    }),
    [yearsQuery.data, periodsQuery.data, groupsQuery.data, levelsQuery.data, stagesQuery.data, programmesQuery.data]
  );

  const resolved = useMemo(
    () => resolveAcademicScope({ rows, selection }),
    [rows, selection]
  );

  const setYear = useCallback((yearId: string | null) => {
    setSelection({ yearId, levelId: null, classGroupId: null, periodId: null });
  }, []);

  const setLevel = useCallback((levelId: string | null) => {
    setSelection((current) => ({ ...current, levelId, classGroupId: null }));
  }, []);

  const setStream = useCallback((classGroupId: string | null) => {
    setSelection((current) => ({ ...current, classGroupId }));
  }, []);

  const setPeriod = useCallback((periodId: string | null) => {
    setSelection((current) => ({ ...current, periodId }));
  }, []);

  const reset = useCallback(() => setSelection({}), []);

  // A required-period screen gets the period the calendar is in — the same rule the publishing
  // page uses — and keeps it only while it belongs to the chosen year.
  const scope = useMemo<ResolvedScope>(() => {
    if (periodMode !== 'required') return resolved;
    if (resolved.effective.periodId !== '') return resolved;
    const current = currentPeriodOf(resolved.periodsOfYear);
    if (!current) return resolved;
    return {
      ...resolved,
      effective: { ...resolved.effective, periodId: current.id },
    };
  }, [periodMode, resolved]);

  const status = [yearsQuery.status, groupsQuery.status, levelsQuery.status].includes('loading')
    ? 'loading'
    : [yearsQuery.status, groupsQuery.status, levelsQuery.status].includes('error')
      ? 'error'
      : 'ready';

  return {
    scope,
    selection,
    setYear,
    setLevel,
    setStream,
    setPeriod,
    reset,
    status,
    error: yearsQuery.error ?? groupsQuery.error ?? levelsQuery.error ?? null,
  };
}
