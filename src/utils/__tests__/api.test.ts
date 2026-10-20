// ABOUTME: Unit tests for the AppDataContext filter helpers in src/utils/api.ts.
// ABOUTME: Ensures class-stream ids match as strings for numeric-string, numeric and UUID ids.

import { describe, expect, it } from 'vitest';
import type { ClassStream, Student } from '@/core/types';
import { getClassStreamName, getStudentsByClassStream, getStudentsForExamEntry } from '../api';

const UUID_STREAM = '874b9758-1c2d-4e5f-8a9b-0c1d2e3f4a5b';
const OTHER_UUID_STREAM = '874b9758-ffff-4e5f-8a9b-0c1d2e3f4a5b';

// Runtime records come from storage, where ids are strings even though the legacy type says number.
const student = (id: string, streamId: unknown, status = 'Active'): Student =>
  ({ id, first_name: id, last_name: 'Test', status, current_class_stream_id: streamId }) as unknown as Student;

const students: Student[] = [
  student('s-seed-1', '1'),
  student('s-seed-1-legacy-number', 1),
  student('s-seed-1-inactive', '1', 'Inactive'),
  student('s-seed-12', '12'),
  student('s-uuid', UUID_STREAM),
  student('s-uuid-inactive', UUID_STREAM, 'Graduated'),
  student('s-other-uuid', OTHER_UUID_STREAM),
  student('s-unassigned', null),
];

const ids = (list: Student[]) => list.map((s) => s.id).sort();

describe('getStudentsByClassStream', () => {
  it('matches a numeric-string stream id against string and legacy numeric student ids', () => {
    expect(ids(getStudentsByClassStream(students, '1'))).toEqual(
      ['s-seed-1', 's-seed-1-inactive', 's-seed-1-legacy-number'].sort()
    );
  });

  it('does not treat "1" as a prefix of "12"', () => {
    expect(ids(getStudentsByClassStream(students, '12'))).toEqual(['s-seed-12']);
  });

  it('matches UUID stream ids exactly without numeric coercion', () => {
    expect(ids(getStudentsByClassStream(students, UUID_STREAM))).toEqual(['s-uuid', 's-uuid-inactive']);
    // parseInt would turn this UUID into 874 and match nothing (or the wrong record).
    expect(getStudentsByClassStream(students, '874')).toEqual([]);
  });

  it('returns nothing for an empty stream id or missing students', () => {
    expect(getStudentsByClassStream(students, '')).toEqual([]);
    expect(getStudentsByClassStream(undefined as unknown as Student[], '1')).toEqual([]);
  });
});

describe('getStudentsForExamEntry', () => {
  it('lists only the active students of a numeric-string stream', () => {
    expect(ids(getStudentsForExamEntry(students, '1'))).toEqual(['s-seed-1', 's-seed-1-legacy-number'].sort());
  });

  it('lists only the active students of a UUID stream', () => {
    expect(ids(getStudentsForExamEntry(students, UUID_STREAM))).toEqual(['s-uuid']);
  });
});

describe('getClassStreamName', () => {
  const streams = [
    { id: '1', class_name: 'Form 1', name: 'A' },
    { id: UUID_STREAM, class_name: 'Grade 7', name: 'North' },
  ] as unknown as ClassStream[];

  it('resolves numeric-string and UUID stream ids', () => {
    expect(getClassStreamName(streams, '1')).toBe('Form 1 A');
    expect(getClassStreamName(streams, 1)).toBe('Form 1 A');
    expect(getClassStreamName(streams, UUID_STREAM)).toBe('Grade 7 North');
  });

  it('returns Unknown when no stream matches', () => {
    expect(getClassStreamName(streams, OTHER_UUID_STREAM)).toBe('Unknown');
  });
});
