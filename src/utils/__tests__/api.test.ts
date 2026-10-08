// ABOUTME: Unit tests for the AppDataContext filtering helpers in src/utils/api.ts.
// ABOUTME: Ids are compared as strings so numeric-string, numeric and UUID stream ids all match.

import { describe, expect, it } from 'vitest';
import type { ClassStream, Student } from '@/core/types';
import { getClassStreamName, getStudentsByClassStream, getStudentsForExamEntry } from '../api';

const UUID_STREAM = '874b9758-1c2d-4e5f-8a9b-0c1d2e3f4a5b';
const OTHER_UUID_STREAM = '874b9758-ffff-4e5f-8a9b-0c1d2e3f4a5b';

// Persisted records carry string ids at runtime even where the static types still say number.
const student = (id: string, streamId: unknown, status = 'Active'): Student =>
  ({
    id,
    admission_no: `ADM-${id}`,
    first_name: 'First',
    last_name: id,
    status,
    current_class_stream_id: streamId,
  }) as unknown as Student;

const stream = (id: unknown, className: string, name: string): ClassStream =>
  ({ id, class_id: 'class-1', class_name: className, name }) as unknown as ClassStream;

const students: Student[] = [
  student('s1', '1'),
  student('s2', '1', 'Transferred'),
  student('s3', '12'),
  student('s4', UUID_STREAM),
  student('s5', UUID_STREAM, 'Withdrawn'),
  student('s6', OTHER_UUID_STREAM),
  student('s7', null),
  student('s8', undefined),
];

const ids = (list: Student[]) => list.map((s) => s.id);

describe('getStudentsByClassStream', () => {
  it('matches a numeric-string stream id against string-typed student references', () => {
    expect(ids(getStudentsByClassStream(students, '1'))).toEqual(['s1', 's2']);
  });

  it('matches a numeric stream id against string-typed student references', () => {
    expect(ids(getStudentsByClassStream(students, 1))).toEqual(['s1', 's2']);
  });

  it('matches a string stream id against a legacy numeric student reference', () => {
    expect(ids(getStudentsByClassStream([student('legacy', 1)], '1'))).toEqual(['legacy']);
  });

  it('matches UUID stream ids exactly, without parseInt prefix collisions', () => {
    expect(ids(getStudentsByClassStream(students, UUID_STREAM))).toEqual(['s4', 's5']);
    // parseInt('874b9758-…') === 874 must never select anything
    expect(getStudentsByClassStream([student('n', 874)], UUID_STREAM)).toEqual([]);
  });

  it('never matches students without a stream, and returns [] for empty input', () => {
    expect(getStudentsByClassStream(students, '')).toEqual([]);
    expect(getStudentsByClassStream(undefined as unknown as Student[], '1')).toEqual([]);
  });
});

describe('getStudentsForExamEntry', () => {
  it('lists only the active students of a numeric-string stream', () => {
    expect(ids(getStudentsForExamEntry(students, '1'))).toEqual(['s1']);
  });

  it('lists only the active students of a UUID stream', () => {
    expect(ids(getStudentsForExamEntry(students, UUID_STREAM))).toEqual(['s4']);
  });
});

describe('getClassStreamName', () => {
  const streams = [stream('1', 'Form 1', 'A'), stream(UUID_STREAM, 'Form 2', 'East')];

  it('resolves numeric-string and numeric ids', () => {
    expect(getClassStreamName(streams, '1')).toBe('Form 1 A');
    expect(getClassStreamName(streams, 1)).toBe('Form 1 A');
  });

  it('resolves UUID ids', () => {
    expect(getClassStreamName(streams, UUID_STREAM)).toBe('Form 2 East');
  });

  it('returns Unknown when nothing matches', () => {
    expect(getClassStreamName(streams, OTHER_UUID_STREAM)).toBe('Unknown');
  });
});
