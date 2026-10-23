// ABOUTME: Promise to pay: a payer's commitment of an amount by a day, against a document. While it
// ABOUTME: is open and its day has not passed it suppresses reminders; once the day passes with the
// ABOUTME: document still outstanding it is broken and reminders resume, escalated when asked.

import type { PromiseStatus, PromiseToPay } from './types';

/**
 * Whether a promise holds reminders back on a day.
 *
 * It holds them while it is `open` and its day is today or later. On the promised day itself the
 * payer is still keeping their word, so reminders stay held; the day after, the promise is broken.
 */
export function promiseSuppresses(promise: PromiseToPay, runDay: string): boolean {
  return promise.status === 'open' && promise.promisedOn >= runDay;
}

/** The promise that holds a document's reminders back on a day, or null. */
export function suppressingPromise(
  promises: readonly PromiseToPay[],
  documentKey: string,
  runDay: string
): PromiseToPay | null {
  for (const promise of promises) {
    if (promise.documentKey !== documentKey) continue;
    if (promiseSuppresses(promise, runDay)) return promise;
  }
  return null;
}

/**
 * Where a promise stands on a day, given whether its document is still outstanding.
 *
 * A document that is no longer outstanding (paid in full, so absent from the statement's aging)
 * resolves the promise as `kept`, whether or not a reminder ever went out. A document still
 * outstanding after the promised day is `broken`; on or before it, the promise is still `open`.
 */
export function promiseResolution(
  promise: PromiseToPay,
  runDay: string,
  stillOutstanding: boolean
): PromiseStatus {
  if (!stillOutstanding) return 'kept';
  return promise.promisedOn < runDay ? 'broken' : 'open';
}

/** What resolving a set of promises found, by outcome. */
export interface PromiseResolution {
  readonly kept: readonly PromiseToPay[];
  readonly broken: readonly PromiseToPay[];
  readonly open: readonly PromiseToPay[];
}

/**
 * Resolves a set of promises against the documents that are still outstanding.
 *
 * `outstandingKeys` is the set of documents the statements still age, so a promise whose document
 * has left the statement is `kept` and one whose document is still there after its day is `broken`.
 */
export function resolvePromises(
  promises: readonly PromiseToPay[],
  runDay: string,
  outstandingKeys: ReadonlySet<string>
): PromiseResolution {
  const kept: PromiseToPay[] = [];
  const broken: PromiseToPay[] = [];
  const open: PromiseToPay[] = [];
  for (const promise of promises) {
    if (promise.status !== 'open') continue;
    switch (promiseResolution(promise, runDay, outstandingKeys.has(promise.documentKey))) {
      case 'kept':
        kept.push(promise);
        break;
      case 'broken':
        broken.push(promise);
        break;
      case 'open':
        open.push(promise);
        break;
    }
  }
  return { kept, broken, open };
}
