// ABOUTME: Tests the whole-class grid: subjects and learners narrowed by scope, level/class filters,
// ABOUTME: membership cells, and the exam-slot selector.

import { describe, expect, it } from 'vitest';

import { buildClassGrid, cellKey, examKeyOf, type ClassGridInput } from '../classGrid';

const scope = (mode: 'all' | 'class' | 'teaching', groupIds: string[]) => ({
  groupIds: new Set(groupIds),
  staffId: mode === 'all' ? null : 'staff-1',
  mode,
  canWrite: mode !== 'class',
  reason: mode === 'class' ? 'read-only class' : 'ok',
});

const base = (mode: 'all' | 'class' | 'teaching', groupIds: string[]): ClassGridInput => ({
  assessments: [
    { id: 'a-math-1', name: 'End of term Maths', kind: 'end_term', slot: 'ET', learningAreaIds: ['math'], classGroupIds: ['c1'], levelIds: ['l1'], maxScore: 100, status: 'open' },
    { id: 'a-eng-1', name: 'End of term English', kind: 'end_term', slot: 'ET', learningAreaIds: ['eng'], classGroupIds: ['c1'], levelIds: ['l1'], maxScore: 100, status: 'open' },
    { id: 'a-math-2', name: 'End of term Maths', kind: 'end_term', slot: 'ET', learningAreaIds: ['math'], classGroupIds: ['c2'], levelIds: ['l1'], maxScore: 100, status: 'open' },
  ],
  groups: [
    { id: 'g-math-c1', learningAreaId: 'math', classGroupIds: ['c1'] },
    { id: 'g-eng-c1', learningAreaId: 'eng', classGroupIds: ['c1'] },
    { id: 'g-math-c2', learningAreaId: 'math', classGroupIds: ['c2'] },
  ],
  enrolments: [
    { id: 'e1', learnerId: 'l1', classGroupId: 'c1', status: 'active' },
    { id: 'e2', learnerId: 'l2', classGroupId: 'c1', status: 'active' },
    { id: 'e3', learnerId: 'l3', classGroupId: 'c2', status: 'active' },
  ],
  learners: [
    { id: 'l1', name: 'Amina Wanjiku', admissionNumber: 'ADM-1' },
    { id: 'l2', name: 'Brian Otieno', admissionNumber: 'ADM-2' },
    { id: 'l3', name: 'Cate Mwangi', admissionNumber: 'ADM-3' },
  ],
  memberships: [
    { teachingGroupId: 'g-math-c1', enrolmentId: 'e1', validFrom: '2027-01-01', validTo: null },
    { teachingGroupId: 'g-eng-c1', enrolmentId: 'e1', validFrom: '2027-01-01', validTo: null },
    { teachingGroupId: 'g-math-c1', enrolmentId: 'e2', validFrom: '2027-01-01', validTo: null },
    { teachingGroupId: 'g-math-c2', enrolmentId: 'e3', validFrom: '2027-01-01', validTo: null },
  ],
  classGroups: [
    { id: 'c1', name: 'Form 1 Blue', levelId: 'l1' },
    { id: 'c2', name: 'Form 1 Red', levelId: 'l1' },
  ],
  learningAreaNames: new Map([
    ['math', 'Mathematics'],
    ['eng', 'English'],
  ]),
  scope: scope(mode, groupIds),
  periodId: 'p1',
  levelId: 'l1',
  classGroupId: 'c1',
  examKey: 'ET',
  learningAreaId: null,
  search: '',
  at: '2027-03-01',
});

describe('buildClassGrid', () => {
  it('shows every subject and learner to an administrator', () => {
    const grid = buildClassGrid(base('all', []));

    expect(grid.examKeys).toEqual([{ key: 'ET', label: 'ET' }]);
    expect(grid.columns.map((column) => column.label)).toEqual(['English', 'Mathematics']);
    expect(grid.rows.map((row) => row.learnerName)).toEqual(['Amina Wanjiku', 'Brian Otieno']);
    expect(grid.nonMembership.has(cellKey('e2', 'area:eng'))).toBe(true);
    expect(grid.nonMembership.has(cellKey('e1', 'area:eng'))).toBe(false);
  });

  it('narrows a subject teacher to their teaching group', () => {
    const grid = buildClassGrid(base('teaching', ['g-math-c1']));

    expect(grid.columns.map((column) => column.learningAreaName)).toEqual(['Mathematics']);
    expect(grid.rows.map((row) => row.learnerName)).toEqual(['Amina Wanjiku', 'Brian Otieno']);
    expect(grid.nonMembership.size).toBe(0);
  });

  it('shows a class teacher every subject but read-only', () => {
    const grid = buildClassGrid(base('class', ['g-math-c1', 'g-eng-c1']));

    expect(grid.columns.map((column) => column.learningAreaName)).toEqual(['English', 'Mathematics']);
    expect(grid.rows).toHaveLength(2);
    expect(grid.nonMembership.has(cellKey('e2', 'area:eng'))).toBe(true);
  });

  it('filters to one subject and treats the exam slot as the key', () => {
    const filtered = buildClassGrid(base('all', []));
    const one = buildClassGrid({ ...base('all', []), learningAreaId: 'eng' });

    expect(one.columns.map((column) => column.learningAreaName)).toEqual(['English']);
    expect(examKeyOf({ slot: null, kind: 'cat' })).toBe('cat');
    expect(filtered.columns.every((column) => column.assessmentId !== null)).toBe(true);
  });
});
