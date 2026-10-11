// ABOUTME: Unit tests for the corrupt-stream repair tool (SO-06): streams saved without name or class_id.
// ABOUTME: Covers detection, the reassignment plan for affected students, and reassign-then-delete execution.

import { describe, it, expect, vi } from 'vitest';
import {
  isCorruptStream,
  planCorruptStreamRepair,
  applyCorruptStreamRepair,
} from '../repairCorruptStreams';

const streams = [
  { id: 'S-1', name: 'Blue', class_id: 'C-3' },
  { id: 'S-2', name: null, class_id: null },
  { id: 'S-3', name: 'Green', class_id: '' },
  { id: 'S-4', name: '   ', class_id: 'C-3' },
  { id: 'S-5', name: 'Red', class_id: 'C-4' },
];

const students = [
  { id: 'ST-1', current_class_stream_id: 'S-1' },
  { id: 'ST-2', current_class_stream_id: 'S-2' },
  { id: 'ST-3', class_stream_id: 'S-2' },
  { id: 'ST-4', current_class_stream_id: 'S-4' },
];

describe('isCorruptStream', () => {
  it('flags streams with a missing or blank name or class_id', () => {
    expect(isCorruptStream({ id: 'a', name: 'Blue', class_id: 'C-1' })).toBe(false);
    expect(isCorruptStream({ id: 'b', name: null, class_id: 'C-1' })).toBe(true);
    expect(isCorruptStream({ id: 'c', name: 'Blue', class_id: null })).toBe(true);
    expect(isCorruptStream({ id: 'd', name: '  ', class_id: 'C-1' })).toBe(true);
    expect(isCorruptStream({ id: 'e', name: 'Blue', class_id: '' })).toBe(true);
    expect(isCorruptStream({ id: 'f' })).toBe(true);
  });
});

describe('planCorruptStreamRepair', () => {
  it('lists each corrupt stream with the students still assigned to it', () => {
    const plan = planCorruptStreamRepair(streams, students);

    expect(plan.corrupt.map(entry => entry.stream.id)).toEqual(['S-2', 'S-3', 'S-4']);
    expect(plan.corrupt[0].studentIds).toEqual(['ST-2', 'ST-3']);
    expect(plan.corrupt[1].studentIds).toEqual([]);
    expect(plan.corrupt[2].studentIds).toEqual(['ST-4']);
    expect(plan.validTargets.map(s => s.id)).toEqual(['S-1', 'S-5']);
    expect(plan.studentsToReassign).toBe(3);
  });

  it('returns an empty plan when every stream is valid', () => {
    const plan = planCorruptStreamRepair([streams[0]], students);
    expect(plan.corrupt).toEqual([]);
    expect(plan.studentsToReassign).toBe(0);
  });
});

describe('applyCorruptStreamRepair', () => {
  it('reassigns students to the chosen stream before deleting the corrupt stream', async () => {
    const calls: string[] = [];
    const updateStudent = vi.fn(async (id: string) => { calls.push(`update:${id}`); });
    const deleteStream = vi.fn(async (id: string) => { calls.push(`delete:${id}`); });
    const plan = planCorruptStreamRepair(streams, students);

    const result = await applyCorruptStreamRepair(
      plan,
      { 'S-2': 'S-1', 'S-4': 'S-5' },
      { updateStudent, deleteStream },
    );

    expect(updateStudent).toHaveBeenCalledWith('ST-2', { current_class_stream_id: 'S-1' });
    expect(updateStudent).toHaveBeenCalledWith('ST-3', { current_class_stream_id: 'S-1' });
    expect(updateStudent).toHaveBeenCalledWith('ST-4', { current_class_stream_id: 'S-5' });
    expect(calls.indexOf('delete:S-2')).toBeGreaterThan(calls.indexOf('update:ST-3'));
    expect(calls.indexOf('delete:S-4')).toBeGreaterThan(calls.indexOf('update:ST-4'));
    expect(result).toEqual({ deleted: ['S-2', 'S-3', 'S-4'], reassigned: 3, skipped: [] });
  });

  it('never deletes a stream that still has students and no reassignment target', async () => {
    const updateStudent = vi.fn(async () => undefined);
    const deleteStream = vi.fn(async () => undefined);
    const plan = planCorruptStreamRepair(streams, students);

    const result = await applyCorruptStreamRepair(plan, {}, { updateStudent, deleteStream });

    expect(updateStudent).not.toHaveBeenCalled();
    expect(deleteStream).toHaveBeenCalledTimes(1);
    expect(deleteStream).toHaveBeenCalledWith('S-3');
    expect(result.skipped).toEqual(['S-2', 'S-4']);
    expect(result.deleted).toEqual(['S-3']);
  });

  it('rejects a reassignment target that is not a valid stream', async () => {
    const updateStudent = vi.fn(async () => undefined);
    const deleteStream = vi.fn(async () => undefined);
    const plan = planCorruptStreamRepair(streams, students);

    const result = await applyCorruptStreamRepair(
      plan,
      { 'S-2': 'S-3', 'S-4': 'missing' },
      { updateStudent, deleteStream },
    );

    expect(updateStudent).not.toHaveBeenCalled();
    expect(result.skipped).toEqual(['S-2', 'S-4']);
  });
});
