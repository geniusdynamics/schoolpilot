// ABOUTME: Public surface of the payment-provider seam: the provider interface and its vocabulary,
// ABOUTME: the provider event ledger that makes a webhook idempotent, the suspense queue, the learner
// ABOUTME: directory, and the intake that turns a delivery into a payment.

import type { SqliteAdapter } from '@/data/adapters/sqlite';

import { ensureProviderEventSchema } from './store';
import { ensureProviderSuspenseSchema } from './suspense';

export * from './types';
export * from './errors';
export * from './store';
export * from './suspense';
export * from './directory';
export * from './intake';

/**
 * Applies every statement the provider seam needs; safe to call repeatedly.
 *
 * A canonical migration must apply these tables; until it does, a caller (and the tests) call this.
 * The two stores are the seam's own: the provider event ledger and the suspense queue. Nothing
 * canonical is created here - a provider payment lands in the existing `payment`, `receipt` and
 * `payment_allocation` tables.
 */
export async function ensureProviderPaymentSchema(adapter: SqliteAdapter): Promise<void> {
  await ensureProviderEventSchema(adapter);
  await ensureProviderSuspenseSchema(adapter);
}
