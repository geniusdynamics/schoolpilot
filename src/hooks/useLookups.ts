// ABOUTME: Shared id → label lookup maps built from live collections (classes, streams, categories, dormitories, guardians).
// ABOUTME: Lets grids resolve display names at read time instead of reading denormalised *_name fields on records.

import { useCallback, useMemo } from 'react';
import { useDatabaseCollection } from '@/hooks/useDatabaseCollection';
import type { GuardianRecord, GuardianRelationshipRecord } from '@/domain/students/guardianService';

type Row = Record<string, unknown> & { id?: unknown };

export interface LookupSources {
  classes: readonly Row[];
  classStreams: readonly Row[];
  studentCategories: readonly Row[];
  dormitories: readonly Row[];
  guardians: readonly GuardianRecord[];
  guardianRelationships: readonly GuardianRelationshipRecord[];
}

export interface StreamLookup {
  id: string;
  name: string;
  classId: string | null;
  className: string | null;
  /** "Grade 7 · Blue" — or just the stream name when its class cannot be resolved. */
  label: string;
}

export interface Lookups {
  classNameById: ReadonlyMap<string, string>;
  streamById: ReadonlyMap<string, StreamLookup>;
  categoryNameById: ReadonlyMap<string, string>;
  dormitoryNameById: ReadonlyMap<string, string>;
  guardiansById: ReadonlyMap<string, GuardianRecord>;
  guardianRelationships: readonly GuardianRelationshipRecord[];
  /** Stream picker options; values are string ids (never coerced to numbers). */
  streamOptions: ReadonlyArray<{ value: string; label: string }>;
}

const text = (value: unknown): string => (value == null ? '' : String(value));

const nameMap = (rows: readonly Row[]): Map<string, string> => {
  const map = new Map<string, string>();
  for (const row of rows) {
    if (row?.id == null) continue;
    map.set(String(row.id), text(row.name));
  }
  return map;
};

/** Pure builder behind useLookups (exported for tests and non-React callers). */
export function buildLookups(sources: LookupSources): Lookups {
  const classNameById = nameMap(sources.classes);

  const streamById = new Map<string, StreamLookup>();
  for (const stream of sources.classStreams) {
    if (stream?.id == null) continue;
    const id = String(stream.id);
    const name = text(stream.name);
    const classId = stream.class_id == null || stream.class_id === '' ? null : String(stream.class_id);
    const className = classId ? classNameById.get(classId) ?? null : null;
    streamById.set(id, { id, name, classId, className, label: className ? `${className} · ${name}` : name });
  }

  const guardiansById = new Map<string, GuardianRecord>();
  for (const guardian of sources.guardians) {
    if (guardian?.id != null) guardiansById.set(String(guardian.id), guardian);
  }

  const streamOptions = [...streamById.values()]
    .map((s) => ({ value: s.id, label: s.label }))
    .sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }));

  return {
    classNameById,
    streamById,
    categoryNameById: nameMap(sources.studentCategories),
    dormitoryNameById: nameMap(sources.dormitories),
    guardiansById,
    guardianRelationships: sources.guardianRelationships,
    streamOptions,
  };
}

/** Class and stream names of a learner, resolved from their `current_class_stream_id`. */
export function resolveClassPlacement(
  lookups: Pick<Lookups, 'streamById'>,
  streamId: unknown,
): { className: string | null; streamName: string | null } {
  if (streamId == null || streamId === '') return { className: null, streamName: null };
  const stream = lookups.streamById.get(String(streamId));
  return { className: stream?.className ?? null, streamName: stream?.name ?? null };
}

export interface UseLookupsResult extends Lookups {
  loading: boolean;
  refresh: () => Promise<void>;
}

/** Live lookup maps for the academic structure and guardians. */
export function useLookups(): UseLookupsResult {
  const classes = useDatabaseCollection<Row>('classes');
  const classStreams = useDatabaseCollection<Row>('class_streams');
  const studentCategories = useDatabaseCollection<Row>('student_categories');
  const dormitories = useDatabaseCollection<Row>('dormitories');
  const guardians = useDatabaseCollection<GuardianRecord>('parents_guardians');
  const guardianRelationships = useDatabaseCollection<GuardianRelationshipRecord>('student_guardian_relationships');

  const lookups = useMemo(
    () =>
      buildLookups({
        classes: classes.data,
        classStreams: classStreams.data,
        studentCategories: studentCategories.data,
        dormitories: dormitories.data,
        guardians: guardians.data,
        guardianRelationships: guardianRelationships.data,
      }),
    [classes.data, classStreams.data, studentCategories.data, dormitories.data, guardians.data, guardianRelationships.data],
  );

  const refreshes = [
    classes.refresh, classStreams.refresh, studentCategories.refresh,
    dormitories.refresh, guardians.refresh, guardianRelationships.refresh,
  ];
  const refresh = useCallback(async () => {
    await Promise.all(refreshes.map((r) => r()));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, refreshes);

  const loading =
    classes.loading || classStreams.loading || studentCategories.loading ||
    dormitories.loading || guardians.loading || guardianRelationships.loading;

  return { ...lookups, loading, refresh };
}
