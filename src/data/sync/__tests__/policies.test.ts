// ABOUTME: The three per-entity conflict policies of spec 06 §3.2 proved as pure functions:
// ABOUTME: append-only events, cell-merged marks, and field-level last-write-wins with a note.

import { describe, expect, it } from 'vitest';

import type { Envelope, Snapshot } from '../envelope';
import { formatHlc } from '../hlc';
import {
  cellFieldsFor,
  cellKey,
  mergeChange,
  mergeSnapshot,
  policyFor,
  type StoredState,
} from '../policies';

const clock = (wall: number, counter = 0, device = 'device-a'): string =>
  formatHlc({ wall, counter, device });

describe('the policy of an entity', () => {
  it('appends financial and attendance events', () => {
    for (const entity of [
      'invoice',
      'invoice_line',
      'payment',
      'payment_allocation',
      'receipt',
      'credit_note',
      'refund',
      'attendance_session',
      'attendance_mark',
    ] as const) {
      expect(policyFor(entity)).toBe('append_only');
    }
  });

  it('merges a mark by its cell', () => {
    expect(policyFor('mark')).toBe('cell_merge');
    expect(cellFieldsFor('mark')).toEqual([
      'assessment_id',
      'enrolment_id',
      'learning_area_id',
      'component_id',
    ]);
  });

  it('merges every other row field by field', () => {
    expect(policyFor('learner')).toBe('field_lww');
    expect(policyFor('guardian')).toBe('field_lww');
    expect(policyFor('enrolment')).toBe('field_lww');
    expect(cellFieldsFor('learner')).toBeNull();
  });

  it('reads a cell key from the columns that name it', () => {
    expect(
      cellKey('mark', {
        assessment_id: 'assessment-1',
        enrolment_id: 'enrolment-1',
        learning_area_id: 'area-1',
        component_id: null,
      })
    ).toEqual(['assessment-1', 'enrolment-1', 'area-1', null]);
    expect(cellKey('learner', { id: 'learner-1' })).toBeNull();
  });
});

describe('an append-only entity', () => {
  it('inserts an event id it has never seen', () => {
    const result = mergeChange(
      'append_only',
      {
        entity: 'payment',
        id: 'payment-1',
        op: 'create',
        hlc: clock(1_000),
        deviceId: 'device-a',
        fields: ['reference'],
        base: {},
        payload: { id: 'payment-1', reference: 'A-1' },
      },
      null
    );

    expect(result.action).toBe('insert');
    expect(result.id).toBe('payment-1');
    expect(result.conflicts).toHaveLength(0);
    expect(result.clock.reference).toBe(clock(1_000));
  });

  it('treats a re-delivered create of the same event as a no-op', () => {
    const existing: StoredState = {
      id: 'payment-1',
      row: { id: 'payment-1', reference: 'A-1' },
      clock: { reference: clock(1_000) },
    };

    const result = mergeChange(
      'append_only',
      {
        entity: 'payment',
        id: 'payment-1',
        op: 'create',
        hlc: clock(2_000),
        deviceId: 'device-b',
        fields: ['reference'],
        base: {},
        payload: { id: 'payment-1', reference: 'A-1' },
      },
      existing
    );

    expect(result.action).toBe('noop');
    expect(result.fields).toEqual([]);
    expect(result.conflicts).toHaveLength(0);
  });

  it('refuses a second create of one event id and keeps the refusal as a conflict', () => {
    const existing: StoredState = {
      id: 'payment-1',
      row: { id: 'payment-1', reference: 'A-1' },
      clock: { reference: clock(1_000) },
    };

    const result = mergeChange(
      'append_only',
      {
        entity: 'payment',
        id: 'payment-1',
        op: 'create',
        hlc: clock(2_000, 0, 'device-b'),
        deviceId: 'device-b',
        fields: ['reference'],
        base: {},
        payload: { id: 'payment-1', reference: 'B-1' },
      },
      existing
    );

    expect(result.action).toBe('immutable');
    expect(result.row.reference).toBe('A-1');
    expect(result.conflicts).toHaveLength(1);
    expect(result.conflicts[0]).toMatchObject({
      entity: 'payment',
      entityId: 'payment-1',
      policy: 'append_only',
      kind: 'immutable',
      winner: 'stored',
      loser: 'device-b',
    });
  });

  it('still merges a later state transition as an ordinary field write', () => {
    const existing: StoredState = {
      id: 'payment-1',
      row: { id: 'payment-1', status: 'draft' },
      clock: { status: clock(1_000) },
    };

    const result = mergeChange(
      'append_only',
      {
        entity: 'payment',
        id: 'payment-1',
        op: 'update',
        hlc: clock(2_000),
        deviceId: 'device-a',
        fields: ['status'],
        base: { status: clock(1_000) },
        payload: { id: 'payment-1', status: 'posted' },
      },
      existing
    );

    expect(result.action).toBe('update');
    expect(result.row.status).toBe('posted');
    expect(result.conflicts).toHaveLength(0);
  });
});

describe('a field-merged row', () => {
  const existing: StoredState = {
    id: 'learner-1',
    row: { id: 'learner-1', given_name: 'Amani', nationality: 'Kenyan' },
    clock: { given_name: clock(1_000), nationality: clock(1_000) },
  };

  const change = (overrides: Partial<Envelope>): Envelope => ({
    entity: 'learner',
    id: 'learner-1',
    op: 'update',
    hlc: clock(2_000),
    deviceId: 'device-a',
    fields: [],
    base: {},
    payload: { id: 'learner-1' },
    ...overrides,
  });

  it('keeps both edits when two devices touched different columns', () => {
    const result = mergeChange(
      'field_lww',
      change({
        fields: ['nationality'],
        base: { nationality: clock(1_000) },
        payload: { id: 'learner-1', nationality: 'Ugandan' },
      }),
      existing
    );

    expect(result.action).toBe('update');
    expect(result.row).toEqual({ id: 'learner-1', given_name: 'Amani', nationality: 'Ugandan' });
    expect(result.conflicts).toHaveLength(0);
  });

  it('records a conflict and takes the later clock when both devices wrote one column', () => {
    const result = mergeChange(
      'field_lww',
      change({
        hlc: clock(2_000, 0, 'device-b'),
        deviceId: 'device-b',
        fields: ['given_name'],
        base: { given_name: clock(500) },
        payload: { id: 'learner-1', given_name: 'From-B' },
      }),
      { ...existing, row: { ...existing.row, given_name: 'From-A' }, clock: { ...existing.clock } }
    );

    expect(result.action).toBe('update');
    expect(result.row.given_name).toBe('From-B');
    expect(result.conflicts).toHaveLength(1);
    expect(result.conflicts[0]).toMatchObject({
      policy: 'field_lww',
      kind: 'field',
      field: 'given_name',
      winner: 'device-b',
      loser: 'device-a',
    });
  });

  it('keeps the stored value when the incoming write is the earlier one', () => {
    const result = mergeChange(
      'field_lww',
      change({
        hlc: clock(1_500),
        fields: ['given_name'],
        base: { given_name: clock(500) },
        payload: { id: 'learner-1', given_name: 'From-A' },
      }),
      {
        ...existing,
        clock: { ...existing.clock, given_name: clock(2_000, 0, 'device-b') },
      }
    );

    expect(result.action).toBe('noop');
    expect(result.row.given_name).toBe('Amani');
    expect(result.conflicts).toHaveLength(1);
    expect(result.conflicts[0]).toMatchObject({ winner: 'device-b', loser: 'device-a' });
  });

  it('supersedes a value the writer had seen without calling it a conflict', () => {
    const result = mergeChange(
      'field_lww',
      change({
        fields: ['given_name'],
        base: { given_name: clock(1_000) },
        payload: { id: 'learner-1', given_name: 'Amani W.' },
      }),
      existing
    );

    expect(result.action).toBe('update');
    expect(result.row.given_name).toBe('Amani W.');
    expect(result.conflicts).toHaveLength(0);
  });

  it('ignores a write older than the clock of the column it touches', () => {
    const result = mergeChange(
      'field_lww',
      change({
        hlc: clock(900),
        fields: ['given_name'],
        base: { given_name: clock(1_000) },
        payload: { id: 'learner-1', given_name: 'Stale' },
      }),
      existing
    );

    expect(result.action).toBe('noop');
    expect(result.row.given_name).toBe('Amani');
    expect(result.conflicts).toHaveLength(0);
  });

  it('does not count a column whose value did not change', () => {
    const result = mergeChange(
      'field_lww',
      change({
        fields: ['given_name', 'nationality'],
        base: { given_name: clock(1_000), nationality: clock(1_000) },
        payload: { id: 'learner-1', given_name: 'Amani', nationality: 'Ugandan' },
      }),
      existing
    );

    expect(result.action).toBe('update');
    expect(result.fields).toEqual(['nationality']);
  });
});

describe('a cell-merged mark', () => {
  const cell = {
    assessment_id: 'assessment-1',
    enrolment_id: 'enrolment-1',
    learning_area_id: 'area-1',
    component_id: 'component-1',
  };

  it('folds a second device write into the id that landed first', () => {
    const existing: StoredState = {
      id: 'mark-from-a',
      row: { id: 'mark-from-a', ...cell, score: '51' },
      clock: { ...cell, score: clock(1_000) },
    };

    const result = mergeChange(
      'cell_merge',
      {
        entity: 'mark',
        id: 'mark-from-b',
        op: 'create',
        hlc: clock(2_000, 0, 'device-b'),
        deviceId: 'device-b',
        fields: ['id', ...Object.keys(cell), 'score'],
        base: {},
        payload: { id: 'mark-from-b', ...cell, score: '61' },
      },
      existing
    );

    expect(result.action).toBe('update');
    expect(result.id).toBe('mark-from-a');
    expect(result.row.score).toBe('61');
    expect(result.conflicts).toHaveLength(1);
    expect(result.conflicts[0]).toMatchObject({
      policy: 'cell_merge',
      kind: 'cell_identity',
      field: 'id',
      winner: 'mark-from-a',
      loser: 'mark-from-b',
    });
  });
});

describe('a server state transfer folded into a device', () => {
  const snapshot: Snapshot = {
    entity: 'learner',
    id: 'learner-1',
    op: 'update',
    hlc: clock(2_000, 0, 'device-b'),
    deviceId: 'device-b',
    payload: { id: 'learner-1', given_name: 'From-B', nationality: 'Ugandan' },
    clock: { given_name: clock(2_000, 0, 'device-b'), nationality: clock(2_000, 0, 'device-b') },
    serverSeq: 7,
  };

  it('inserts a row the device has never seen, with the server clocks', () => {
    const result = mergeSnapshot(null, snapshot);

    expect(result.action).toBe('insert');
    expect(result.row.given_name).toBe('From-B');
    expect(result.clock.given_name).toBe(snapshot.clock.given_name);
  });

  it('takes a column the server knows later', () => {
    const result = mergeSnapshot(
      {
        id: 'learner-1',
        row: { id: 'learner-1', given_name: 'Old', nationality: 'Kenyan' },
        clock: { given_name: clock(1_000), nationality: clock(1_000) },
      },
      snapshot
    );

    expect(result.action).toBe('update');
    expect(result.row.given_name).toBe('From-B');
    expect(result.row.nationality).toBe('Ugandan');
    expect(result.conflicts).toHaveLength(0);
  });

  it('keeps a column the device knows later and records the disagreement', () => {
    const result = mergeSnapshot(
      {
        id: 'learner-1',
        row: { id: 'learner-1', given_name: 'Local' },
        clock: { given_name: clock(3_000) },
      },
      snapshot
    );

    expect(result.action).toBe('update');
    expect(result.row.given_name).toBe('Local');
    expect(result.row.nationality).toBe('Ugandan');
    expect(result.conflicts).toHaveLength(1);
    expect(result.conflicts[0]).toMatchObject({
      kind: 'field',
      field: 'given_name',
      winner: 'device-a',
      loser: 'device-b',
    });
  });

  it('writes nothing when the clocks and values already agree', () => {
    const result = mergeSnapshot(
      {
        id: 'learner-1',
        row: { ...snapshot.payload },
        clock: { ...snapshot.clock },
      },
      snapshot
    );

    expect(result.action).toBe('noop');
    expect(result.fields).toEqual([]);
    expect(result.conflicts).toHaveLength(0);
  });
});
