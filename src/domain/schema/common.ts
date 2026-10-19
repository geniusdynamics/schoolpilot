// ABOUTME: Shared zod v4 primitives for the canonical entity schemas: ids, ISO dates, money,
// ABOUTME: JSON values, and the audit/tenancy field sets every persisted row carries.

import { z } from 'zod/v4';

/** A UUIDv7 string, the only id format the canonical model stores (spec 02 §1.1). */
export const uuid = () => z.uuidv7();

/** A calendar date in `YYYY-MM-DD`, interpreted in the institution's time zone. */
export const isoDate = () => z.iso.date();

/** An ISO-8601 UTC timestamp. */
export const isoDateTime = () => z.iso.datetime();

/** A wall-clock time in `HH:MM[:SS]`. */
export const isoTime = () => z.iso.time();

/** Base columns for every persisted row (spec 02 §1.1). */
export const entityIdShape = {
  id: uuid(),
} as const;

/** Tenancy column for every row that belongs to an institution (spec 02 §1.1). */
export const tenancyShape = {
  institution_id: uuid(),
} as const;

/** Audit and soft-delete columns (spec 02 §1.5). */
export const auditShape = {
  created_at: isoDateTime(),
  updated_at: isoDateTime(),
  created_by: uuid().optional(),
  updated_by: uuid().optional(),
  deleted_at: isoDateTime().nullish(),
} as const;

/** Money is stored in minor units with an ISO-4217 currency; precision comes from the currency table. */
export const moneySchema = z.strictObject({
  amount_minor: z.int(),
  currency: z.string().regex(/^[A-Z]{3}$/, 'currency must be an ISO-4217 code'),
});

export type Money = z.infer<typeof moneySchema>;

/** Any JSON value; used for pack-contributed or snapshot payloads. */
export const jsonValueSchema = z.json();

export type JsonValue = z.infer<typeof jsonValueSchema>;

/** A JSON object with string keys and arbitrary JSON values. */
export const jsonObjectSchema = z.record(z.string(), z.json());

export type JsonObject = z.infer<typeof jsonObjectSchema>;

/** A short non-empty identifier or display string. */
export const shortText = (max = 200) => z.string().min(1).max(max);
