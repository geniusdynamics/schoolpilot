// ABOUTME: Branded Id<T> string type and the UUIDv7 generator every entity id comes from.
// ABOUTME: Ids are opaque, time-ordered strings; nothing in this module treats them as numbers.

/**
 * An entity id. Ids are opaque strings (UUIDv7), never numbers: they are generated
 * offline, sorted lexicographically and compared with string equality only.
 *
 * The brand is compile-time only; at runtime an {@link Id} is the same string value.
 */
export type Id<T> = string & { readonly __entity: T };

const UUID_V7_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const MAX_COUNTER = (1n << 74n) - 1n;
const RAND_B_MASK = (1n << 62n) - 1n;
const RAND_B_LOW_MASK = (1n << 48n) - 1n;

let lastTimestamp = -1;
let counter = 0n;

function randomBytes(length: number): Uint8Array {
  const webCrypto = globalThis.crypto;
  if (!webCrypto?.getRandomValues) {
    throw new Error('UUIDv7 generation requires crypto.getRandomValues');
  }
  const bytes = new Uint8Array(length);
  webCrypto.getRandomValues(bytes);
  return bytes;
}

/** A random 74-bit starting point for the monotonic counter (rand_a + rand_b). */
function randomCounter(): bigint {
  const bytes = randomBytes(10);
  let value = 0n;
  for (const byte of bytes) value = (value << 8n) | BigInt(byte);
  return value & MAX_COUNTER;
}

/**
 * Generates a UUIDv7: a 48-bit Unix-millisecond timestamp followed by 74 random bits.
 *
 * Successive calls are strictly increasing, including calls made within the same
 * millisecond: the 74 random bits act as a counter. A clock that moves backwards
 * reuses the last timestamp so ordering never regresses.
 */
export function generateUuidv7(): string {
  const now = Date.now();
  if (now > lastTimestamp) {
    lastTimestamp = now;
    counter = randomCounter();
  } else {
    counter += 1n;
    if (counter > MAX_COUNTER) {
      // Practically unreachable: 2^74 ids would have to be issued in one millisecond.
      lastTimestamp += 1;
      counter = randomCounter();
    }
  }

  const timestampHex = lastTimestamp.toString(16).padStart(12, '0');
  const randA = Number((counter >> 62n) & 0xfffn)
    .toString(16)
    .padStart(3, '0');
  const randB = counter & RAND_B_MASK;
  const variantHigh = Number((randB >> 48n) & 0x3fffn);
  const group4 = (0x8000 | variantHigh).toString(16).padStart(4, '0');
  const group5 = (randB & RAND_B_LOW_MASK).toString(16).padStart(12, '0');

  return `${timestampHex.slice(0, 8)}-${timestampHex.slice(8, 12)}-7${randA}-${group4}-${group5}`;
}

/**
 * Brands a string as an {@link Id} without inspecting it. Use at a boundary where the
 * value is already known to be an id; use {@link isId} for untrusted input.
 */
export function asId<T>(value: string): Id<T> {
  return value as Id<T>;
}

/** True when `value` is a canonical UUIDv7 string, the only id format the domain stores. */
export function isId<T = unknown>(value: unknown): value is Id<T> {
  return typeof value === 'string' && UUID_V7_PATTERN.test(value);
}

/** Orders ids by their opaque string value; UUIDv7 ids therefore sort by creation time. */
export function compareIds(a: Id<unknown>, b: Id<unknown>): number {
  return a < b ? -1 : a > b ? 1 : 0;
}
