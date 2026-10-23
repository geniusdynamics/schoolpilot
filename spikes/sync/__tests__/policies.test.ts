// ABOUTME: The merge policies as pure functions: clock order, append-only replays, cell identity,
// ABOUTME: field-level last-write-wins and the conflict each kind of collision records.

import { describe, expect, it } from 'vitest';

import type { Envelope, Snapshot } from '../src/envelope';
import { HlcClock, compareHlc, formatHlc, laterHlc, parseHlc } from '../src/hlc';
import { cellKey, mergeChange, mergeSnapshot, policyFor } from '../src/policies';

const OLD = formatHlc({ wall: 1_000, counter: 0, device: 'a' });
const MID = formatHlc({ wall: 1_000, counter: 1, device: 'b' });
const NEW = formatHlc({ wall: 2_000, counter: 0, device: 'c' });

function intent(overrides: Partial<Envelope> & Pick<Envelope, 'entity' | 'id' | 'hlc'>): Envelope {
  return {
    op: 'update',
    deviceId: 'device',
    fields: [],
    base: {},
    payload: {},
    ...overrides,
  };
}

function learnerRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'learner-1',
    given_name: 'Amani',
    family_name: 'Otieno',
    nationality: 'Kenyan',
    ...overrides,
  };
}

describe('the clock', () => {
  it('renders a fixed width string, so the plain string order is the reading order', () => {
    expect(formatHlc({ wall: 7, counter: 3, device: 'dev' })).toBe(
      '000000000000007:000003:dev'
    );
    expect(compareHlc(OLD, MID)).toBe(-1);
    expect(compareHlc(MID, OLD)).toBe(1);
    expect(compareHlc(OLD, OLD)).toBe(0);
    // Wall time alone would not order these: the counter does, and the device breaks the tie.
    expect(
      compareHlc(
        formatHlc({ wall: 5, counter: 2, device: 'a' }),
        formatHlc({ wall: 5, counter: 2, device: 'b' })
      )
    ).toBe(-1);
  });

  it('round-trips a reading and refuses a malformed one', () => {
    expect(parseHlc(NEW)).toEqual({ wall: 2_000, counter: 0, device: 'c' });
    expect(() => parseHlc('nonsense')).toThrow(RangeError);
    expect(() => formatHlc({ wall: 1, counter: 0, device: 'a:b' })).toThrow(RangeError);
    expect(laterHlc(OLD, undefined)).toBe(OLD);
    expect(laterHlc(undefined, NEW)).toBe(NEW);
    expect(laterHlc(NEW, OLD)).toBe(NEW);
  });

  it('orders a write after every reading it has observed', () => {
    const clock = new HlcClock('a', () => 1_000);
    const first = clock.tick();
    clock.observe(formatHlc({ wall: 9_000, counter: 4, device: 'b' }));
    const next = clock.tick();
    expect(compareHlc(next, first)).toBe(1);
    expect(compareHlc(next, formatHlc({ wall: 9_000, counter: 4, device: 'b' }))).toBe(1);
  });
});

describe('the policy of each entity', () => {
  it('reads the registry class the phase plan commits to', () => {
    expect(policyFor('payment')).toBe('append_only');
    expect(policyFor('invoice')).toBe('append_only');
    expect(policyFor('attendance_session')).toBe('append_only');
    expect(policyFor('mark')).toBe('cell_merge');
    expect(policyFor('learner')).toBe('field_lww');
    expect(policyFor('fee_schedule')).toBe('field_lww');
  });

  it('names a mark by its cell, not its id', () => {
    const row = {
      assessment_id: 'a',
      enrolment_id: 'e',
      learning_area_id: 'l',
      component_id: null,
    };
    expect(cellKey('mark', row)).toEqual(['a', 'e', 'l', null]);
    expect(cellKey('learner', row)).toBeNull();
  });
});

describe('append-only entities', () => {
  it('writes a second create of the same row as a no-op, not a duplicate', () => {
    const row = { id: 'payment-1', amount: { amount_minor: 500, currency: 'KES' } };
    const created: Envelope = intent({
      entity: 'payment',
      id: 'payment-1',
      hlc: OLD,
      op: 'create',
      fields: Object.keys(row),
      payload: row,
    });

    const result = mergeChange('append_only', created, {
      id: 'payment-1',
      row,
      clock: { amount: OLD },
    });

    expect(result.action).toBe('noop');
    expect(result.conflicts).toHaveLength(0);
    expect(result.fields).toHaveLength(0);
  });

  it('refuses a second create that carries different values, and keeps the refusal', () => {
    const original = { id: 'payment-1', reference: 'MPESA-1' };
    const tampered = { id: 'payment-1', reference: 'MPESA-2' };

    const result = mergeChange(
      'append_only',
      intent({
        entity: 'payment',
        id: 'payment-1',
        hlc: NEW,
        op: 'create',
        deviceId: 'b',
        fields: Object.keys(tampered),
        payload: tampered,
      }),
      { id: 'payment-1', row: original, clock: { reference: OLD } }
    );

    expect(result.action).toBe('immutable');
    expect(result.row).toEqual(original);
    expect(result.conflicts).toHaveLength(1);
    expect(result.conflicts[0]?.kind).toBe('immutable');
    expect(result.conflicts[0]?.winner).toBe('stored');
  });
});

describe('cell-level marks', () => {
  const cell = {
    assessment_id: 'assessment-1',
    enrolment_id: 'enrolment-1',
    learning_area_id: 'area-1',
    component_id: null,
  };

  it('folds a second device into the cell that landed first and keeps one row', () => {
    const first = { ...cell, id: 'mark-a', score: '40' };
    const second = { ...cell, id: 'mark-b', score: '55' };

    const result = mergeChange(
      'cell_merge',
      intent({
        entity: 'mark',
        id: 'mark-b',
        hlc: NEW,
        deviceId: 'b',
        fields: Object.keys(second),
        payload: second,
      }),
      { id: 'mark-a', row: first, clock: { score: OLD } }
    );

    expect(result.action).toBe('update');
    expect(result.id).toBe('mark-a');
    expect(result.row.score).toBe('55');
    const identity = result.conflicts.find((note) => note.kind === 'cell_identity');
    expect(identity?.winner).toBe('mark-a');
    expect(identity?.loser).toBe('mark-b');
  });

  it('lets the later clock win even when the earlier-created cell arrives second', () => {
    const stored = { ...cell, id: 'mark-a', score: '40' };
    const late = { ...cell, id: 'mark-b', score: '99' };

    const result = mergeChange(
      'cell_merge',
      intent({
        entity: 'mark',
        id: 'mark-b',
        hlc: OLD,
        fields: Object.keys(late),
        payload: late,
      }),
      { id: 'mark-a', row: stored, clock: { score: NEW } }
    );

    expect(result.row.score).toBe('40');
    expect(result.conflicts.some((note) => note.kind === 'cell_identity')).toBe(true);
  });
});

describe('field-level profiles', () => {
  it('merges edits to different fields without a conflict', () => {
    const stored = learnerRow();
    const result = mergeChange(
      'field_lww',
      intent({
        entity: 'learner',
        id: 'learner-1',
        hlc: NEW,
        deviceId: 'b',
        fields: ['nationality'],
        base: { nationality: OLD },
        payload: learnerRow({ nationality: 'Ugandan' }),
      }),
      { id: 'learner-1', row: stored, clock: { nationality: OLD, given_name: OLD } }
    );

    expect(result.action).toBe('update');
    expect(result.row.nationality).toBe('Ugandan');
    expect(result.row.given_name).toBe('Amani');
    expect(result.conflicts).toHaveLength(0);
  });

  it('records one field conflict when two devices edit the same field concurrently', () => {
    const stored = learnerRow({ given_name: 'Amani' });
    const result = mergeChange(
      'field_lww',
      intent({
        entity: 'learner',
        id: 'learner-1',
        hlc: NEW,
        deviceId: 'b',
        fields: ['given_name'],
        base: { given_name: OLD },
        payload: learnerRow({ given_name: 'Zawadi' }),
      }),
      { id: 'learner-1', row: stored, clock: { given_name: MID } }
    );

    expect(result.row.given_name).toBe('Zawadi');
    expect(result.conflicts).toHaveLength(1);
    expect(result.conflicts[0]).toMatchObject({
      field: 'given_name',
      winner: 'b',
      winnerHlc: NEW,
      loserHlc: MID,
    });
  });

  it('keeps the stored value when the stored write is later, and still logs it', () => {
    const stored = learnerRow({ given_name: 'Zawadi' });
    const result = mergeChange(
      'field_lww',
      intent({
        entity: 'learner',
        id: 'learner-1',
        hlc: OLD,
        deviceId: 'a',
        fields: ['given_name'],
        base: { given_name: formatHlc({ wall: 500, counter: 0, device: 'a' }) },
        payload: learnerRow({ given_name: 'Amani' }),
      }),
      { id: 'learner-1', row: stored, clock: { given_name: NEW } }
    );

    expect(result.row.given_name).toBe('Zawadi');
    expect(result.action).toBe('noop');
    expect(result.conflicts[0]?.winnerHlc).toBe(NEW);
  });

  it('treats a write that saw the stored clock as sequential, not a conflict', () => {
    const stored = learnerRow({ given_name: 'Amani' });
    const result = mergeChange(
      'field_lww',
      intent({
        entity: 'learner',
        id: 'learner-1',
        hlc: NEW,
        deviceId: 'b',
        fields: ['given_name'],
        base: { given_name: MID },
        payload: learnerRow({ given_name: 'Zawadi' }),
      }),
      { id: 'learner-1', row: stored, clock: { given_name: MID } }
    );

    expect(result.row.given_name).toBe('Zawadi');
    expect(result.conflicts).toHaveLength(0);
  });

  it('reaches the same row whichever concurrent edit lands first', () => {
    const first = intent({
      entity: 'learner',
      id: 'learner-1',
      hlc: MID,
      deviceId: 'b',
      fields: ['given_name'],
      base: { given_name: OLD, nationality: OLD },
      payload: learnerRow({ given_name: 'Zawadi', nationality: 'Kenyan' }),
    });
    const second = intent({
      entity: 'learner',
      id: 'learner-1',
      hlc: NEW,
      deviceId: 'c',
      fields: ['nationality'],
      base: { given_name: OLD, nationality: OLD },
      payload: learnerRow({ given_name: 'Amani', nationality: 'Ugandan' }),
    });

    const base = { id: 'learner-1', row: learnerRow(), clock: { given_name: OLD, nationality: OLD } };
    const forward = mergeChange('field_lww', first, base);
    const forwardThen = mergeChange('field_lww', second, {
      id: 'learner-1',
      row: forward.row,
      clock: forward.clock,
    });

    const backward = mergeChange('field_lww', second, base);
    const backwardThen = mergeChange('field_lww', first, {
      id: 'learner-1',
      row: backward.row,
      clock: backward.clock,
    });

    expect(forwardThen.row).toEqual(backwardThen.row);
    expect(forwardThen.clock).toEqual(backwardThen.clock);
  });
});

describe('server-to-device transfers', () => {
  it('takes a field the server knows later and keeps one it does not', () => {
    const snapshot: Snapshot = {
      entity: 'learner',
      id: 'learner-1',
      op: 'update',
      hlc: NEW,
      deviceId: 'c',
      payload: learnerRow({ given_name: 'Server name', nationality: 'Ugandan' }),
      clock: { given_name: NEW, nationality: NEW },
    };

    const result = mergeSnapshot(
      {
        id: 'learner-1',
        row: learnerRow({ given_name: 'Local name', nationality: 'Kenyan' }),
        clock: { given_name: MID, nationality: MID },
      },
      snapshot
    );

    expect(result.action).toBe('update');
    expect(result.row.given_name).toBe('Server name');
    expect(result.row.nationality).toBe('Ugandan');
    expect(result.conflicts).toHaveLength(0);
  });

  it('keeps a local field that is newer than the server, and says so', () => {
    const snapshot: Snapshot = {
      entity: 'learner',
      id: 'learner-1',
      op: 'update',
      hlc: MID,
      deviceId: 'b',
      payload: learnerRow({ given_name: 'Server name' }),
      clock: { given_name: MID },
    };

    const result = mergeSnapshot(
      {
        id: 'learner-1',
        row: learnerRow({ given_name: 'Local name' }),
        clock: { given_name: NEW },
      },
      snapshot
    );

    expect(result.action).toBe('noop');
    expect(result.row.given_name).toBe('Local name');
    expect(result.conflicts).toHaveLength(1);
    expect(result.conflicts[0]?.winnerHlc).toBe(NEW);
  });
});
