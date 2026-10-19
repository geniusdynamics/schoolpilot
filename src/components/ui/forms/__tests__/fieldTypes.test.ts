// ABOUTME: Unit tests for field metadata ordering, schema inference and nested path updates.
// ABOUTME: Covers array paths so nested phone/email entries do not become object keys.

import { describe, expect, it } from 'vitest';
import { z } from 'zod/v4';

import { moneySchema } from '@/domain/schema/common';
import { phoneSchema } from '@/domain/schema/people';
import type { EntityPickerLookup } from '../../EntityPicker';
import {
  fieldControlId,
  getValueAtPath,
  groupFields,
  inferFieldOptions,
  inferFieldRequired,
  inferFieldWidget,
  orderFields,
  resolveFieldWidget,
  setValueAtPath,
  stableFormValue,
  type EntityFormFieldMeta,
  type EntityFormLookup,
} from '../fieldTypes';

const schema = z.strictObject({
  name: z.string(),
  nickname: z.string().optional(),
  gender: z.enum(['female', 'male']),
  date_of_birth: z.iso.date().optional(),
  total: moneySchema,
  phone: phoneSchema.optional(),
  identifier: z.strictObject({ scheme: z.string(), value: z.string() }),
  active: z.boolean(),
  nested: z.strictObject({ code: z.string() }).optional(),
});

describe('schema inference', () => {
  it('infers widgets from the schema at a dotted path', () => {
    expect(inferFieldWidget(schema, 'name')).toBe('text');
    expect(inferFieldWidget(schema, 'gender')).toBe('select');
    expect(inferFieldWidget(schema, 'date_of_birth')).toBe('date');
    expect(inferFieldWidget(schema, 'total')).toBe('money');
    expect(inferFieldWidget(schema, 'phone')).toBe('phone');
    expect(inferFieldWidget(schema, 'identifier')).toBe('identifier');
    expect(inferFieldWidget(schema, 'active')).toBe('checkbox');
    expect(inferFieldWidget(schema, 'nested.code')).toBe('text');
  });

  it('lets metadata override the inferred widget', () => {
    const meta: EntityFormFieldMeta = {
      path: 'name',
      label: 'Name',
      widget: 'textarea',
    };
    expect(resolveFieldWidget(meta, schema)).toBe('textarea');
  });

  it('infers requiredness from optional wrappers', () => {
    expect(inferFieldRequired(schema, 'name')).toBe(true);
    expect(inferFieldRequired(schema, 'nickname')).toBe(false);
    expect(inferFieldRequired(schema, 'date_of_birth')).toBe(false);
    expect(inferFieldRequired(schema, 'nested.code')).toBe(true);
  });

  it('reads enum options from the schema', () => {
    expect(inferFieldOptions(schema, 'gender')).toEqual([
      { value: 'female', label: 'female' },
      { value: 'male', label: 'male' },
    ]);
    expect(inferFieldOptions(schema, 'name')).toBeUndefined();
  });
});

describe('field ordering and sections', () => {
  const fields: EntityFormFieldMeta[] = [
    { path: 'b', label: 'B', order: 2, section: 'Two' },
    { path: 'a', label: 'A', order: 1, section: 'One' },
    { path: 'c', label: 'C', order: 3, section: 'Two' },
  ];

  it('orders by explicit order and groups sections in first-seen order', () => {
    expect(orderFields(fields).map((field) => field.path)).toEqual(['a', 'b', 'c']);
    expect(groupFields(fields).map((group) => group.section)).toEqual(['One', 'Two']);
    expect(groupFields(fields)[1].fields.map((field) => field.path)).toEqual(['b', 'c']);
  });
});

describe('dotted path updates', () => {
  it('updates nested objects without mutating the source', () => {
    const source = { name: 'A', nested: { code: 'x' } };
    const next = setValueAtPath(source, 'nested.code', 'y');

    expect(next).toEqual({ name: 'A', nested: { code: 'y' } });
    expect(source).toEqual({ name: 'A', nested: { code: 'x' } });
    expect(getValueAtPath(next, 'nested.code')).toBe('y');
  });

  it('updates array elements rather than turning the array into an object', () => {
    const source = { phones: [{ number: '+254700000001' }, { number: '+254700000002' }] };
    const next = setValueAtPath(source, 'phones.1.number', '+254700000003');

    expect(Array.isArray(next.phones)).toBe(true);
    expect(next).toEqual({
      phones: [{ number: '+254700000001' }, { number: '+254700000003' }],
    });
    expect(getValueAtPath(next, 'phones.1.number')).toBe('+254700000003');
    expect(source.phones[1].number).toBe('+254700000002');
  });

  it('removes an optional leaf when the new value is undefined', () => {
    const next = setValueAtPath({ nested: { code: 'x' } }, 'nested.code', undefined);
    expect(next).toEqual({ nested: {} });
  });
});

describe('form helpers', () => {
  it('accepts a concrete EntityPicker lookup without casting', () => {
    interface ClassGroupRow {
      readonly id: string;
      readonly name: string;
    }
    const blue: ClassGroupRow = { id: '0192f4a1-1c2d-7b3e-9f40-0a1b2c3d4e5f', name: 'Blue' };
    const pickerLookup: EntityPickerLookup<ClassGroupRow> = {
      options: [blue],
      byId: new Map([[blue.id, blue]]),
      label: (id, fallback = '') => (id === blue.id ? blue.name : fallback),
      resolve: (id) => (id === blue.id ? blue : undefined),
      status: 'success',
      getId: (row: ClassGroupRow) => row.id,
      isArchived: (row: ClassGroupRow) => row.name === 'Archived',
    };

    const formLookup: EntityFormLookup = pickerLookup;

    expect(formLookup.status).toBe('success');
    expect(formLookup.label(blue.id)).toBe('Blue');
  });

  it('serialises key order deterministically for dirty comparison', () => {
    expect(stableFormValue({ b: 2, a: 1 })).toBe(stableFormValue({ a: 1, b: 2 }));
    expect(stableFormValue({ a: undefined })).not.toBe(stableFormValue({}));
    expect(stableFormValue({ items: [1, { b: 2, a: 1 }] })).toContain('"a":1');
  });

  it('builds a stable control id from a dotted path', () => {
    expect(fieldControlId('learner-form', 'contact.email')).toBe('learner-form-contact-email');
  });
});
