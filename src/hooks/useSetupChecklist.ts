// ABOUTME: What a school still needs before the app is usable: the profile, an education system, a
// ABOUTME: year with terms, classes and subjects. Read from the canonical tables, never from a flag, so
// ABOUTME: a demo database that already holds a whole school is not nagged.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useSchoolProfile, type SchoolProfile } from '@/hooks/useSchoolProfile';

/** One thing the school still has to record, and where in the wizard it is recorded. */
export interface SetupItem {
  readonly id: 'school' | 'system' | 'year' | 'classes' | 'subjects';
  readonly label: string;
  readonly complete: boolean;
}

export interface SetupChecklist {
  readonly loading: boolean;
  /** False when the canonical database could not be read: the school is not nagged about what cannot be seen. */
  readonly readable: boolean;
  readonly items: readonly SetupItem[];
  readonly missing: readonly SetupItem[];
  readonly complete: boolean;
  readonly completed: number;
  readonly total: number;
  /** Re-reads the tables, for after the wizard closes. */
  readonly refresh: () => void;
}

/** The counts the checklist needs from the canonical database. */
interface Counts {
  readonly programmes: number;
  readonly years: number;
  readonly periods: number;
  readonly classGroups: number;
  readonly learningAreas: number;
}

const EMPTY: Counts = {
  programmes: 0,
  years: 0,
  periods: 0,
  classGroups: 0,
  learningAreas: 0,
};

/** The school profile is recorded when it has a name: the wizard requires exactly that. */
export function profileRecorded(profile: SchoolProfile | null): boolean {
  return Boolean(profile?.name?.trim());
}

/** Whether each step of the wizard has its rows. Exported for the test. */
export function buildChecklist(
  profile: SchoolProfile | null,
  counts: Counts
): readonly SetupItem[] {
  return [
    { id: 'school', label: 'School profile', complete: profileRecorded(profile) },
    { id: 'system', label: 'Education system', complete: counts.programmes > 0 },
    { id: 'year', label: 'Academic year and terms', complete: counts.years > 0 && counts.periods > 0 },
    { id: 'classes', label: 'Classes and streams', complete: counts.classGroups > 0 },
    { id: 'subjects', label: 'Subjects', complete: counts.learningAreas > 0 },
  ];
}

async function readCounts(): Promise<Counts> {
  // Loaded on demand: the header renders on every page, and the canonical database module is heavy.
  const { openCanonicalRepository } = await import('@/data/canonicalRepository');
  const repository = await openCanonicalRepository();
  const count = async (entity: Parameters<typeof repository.list>[0]): Promise<number> => {
    const page = await repository.list(entity, { limit: 1 });
    return page.total;
  };
  const [programmes, years, periods, classGroups, learningAreas] = await Promise.all([
    count('programme'),
    count('academic_year'),
    count('academic_period'),
    count('class_group'),
    count('learning_area'),
  ]);
  return { programmes, years, periods, classGroups, learningAreas };
}

/**
 * The setup checklist.
 *
 * The profile comes from the live `school_details` row the header already reads; the rest is counted
 * in the canonical database once, then again whenever `refresh` is called. A database that cannot be
 * read yet leaves the checklist unreadable rather than nagging the school about rows it could not
 * see, so a loading or broken database never shows the nag.
 */
export function useSetupChecklist(): SetupChecklist {
  const { profile, loading: profileLoading } = useSchoolProfile();
  const [counts, setCounts] = useState<Counts | null>(null);
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void readCounts()
      .then((next) => {
        if (!cancelled && mounted.current) setCounts(next);
      })
      .catch(() => {
        // A database that cannot be read yet is not a school that skipped setup.
        if (!cancelled && mounted.current) setCounts(null);
      })
      .finally(() => {
        if (!cancelled && mounted.current) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [revision]);

  const refresh = useCallback(() => setRevision((value) => value + 1), []);

  const readable = counts !== null;
  const items = useMemo(
    () => buildChecklist(profile, counts ?? EMPTY),
    [profile, counts]
  );
  const missing = useMemo(() => items.filter((item) => !item.complete), [items]);

  return {
    loading: loading || profileLoading,
    readable,
    items,
    missing,
    complete: readable && items.every((item) => item.complete),
    completed: items.length - missing.length,
    total: items.length,
    refresh,
  };
}
