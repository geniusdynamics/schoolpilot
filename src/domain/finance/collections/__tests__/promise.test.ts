// ABOUTME: Promise to pay: suppression while a promise is in force, resumption once its day passes
// ABOUTME: with the document still outstanding, and resolution as kept when the document is paid.

import { describe, expect, it } from 'vitest';

import { fromMinor } from '@/domain/money';

import { promiseResolution, promiseSuppresses, resolvePromises, suppressingPromise, type PromiseToPay } from '..';

const promise = (overrides: Partial<PromiseToPay> = {}): PromiseToPay => ({
  id: 'promise-1',
  institutionId: 'inst-1',
  documentKey: 'inv-1',
  payerId: 'guardian-1',
  amount: fromMinor(200_000, 'KES'),
  promisedOn: '2027-02-20',
  status: 'open',
  recordedAt: '2027-02-10T09:00:00.000Z',
  resolvedAt: null,
  ...overrides,
});

describe('suppressing a reminder', () => {
  it('holds while the promise is open and its day has not passed', () => {
    expect(promiseSuppresses(promise(), '2027-02-10')).toBe(true);
    expect(promiseSuppresses(promise(), '2027-02-20')).toBe(true);
    expect(promiseSuppresses(promise(), '2027-02-21')).toBe(false);
  });

  it('does not hold once the promise is kept or broken', () => {
    expect(promiseSuppresses(promise({ status: 'kept' }), '2027-02-10')).toBe(false);
    expect(promiseSuppresses(promise({ status: 'broken' }), '2027-02-10')).toBe(false);
  });

  it('picks the promise that covers a document', () => {
    const promises = [promise(), promise({ id: 'promise-2', documentKey: 'inv-2' })];
    expect(suppressingPromise(promises, 'inv-2', '2027-02-10')?.id).toBe('promise-2');
    expect(suppressingPromise(promises, 'inv-3', '2027-02-10')).toBeNull();
  });
});

describe('resolving a promise', () => {
  it('is kept when the document is paid, broken after its day, open before it', () => {
    expect(promiseResolution(promise(), '2027-02-21', false)).toBe('kept');
    expect(promiseResolution(promise(), '2027-02-21', true)).toBe('broken');
    expect(promiseResolution(promise(), '2027-02-20', true)).toBe('open');
    expect(promiseResolution(promise(), '2027-02-01', true)).toBe('open');
  });

  it('sorts a set against the documents the statement still ages', () => {
    const promises = [
      promise({ id: 'paid', documentKey: 'inv-paid' }),
      promise({ id: 'overdue', documentKey: 'inv-overdue' }),
      promise({ id: 'ahead', documentKey: 'inv-ahead', promisedOn: '2027-03-01' }),
      promise({ id: 'already-broken', documentKey: 'inv-broken', status: 'broken' }),
    ];
    const resolution = resolvePromises(promises, '2027-02-21', new Set(['inv-overdue', 'inv-ahead']));
    expect(resolution.kept.map((entry) => entry.id)).toEqual(['paid']);
    expect(resolution.broken.map((entry) => entry.id)).toEqual(['overdue']);
    expect(resolution.open.map((entry) => entry.id)).toEqual(['ahead']);
  });
});
