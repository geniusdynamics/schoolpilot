// ABOUTME: HMAC-SHA-256 and HMAC-SHA-1 in plain TypeScript, with a constant-time comparison, so a
// ABOUTME: webhook can be verified without a dependency and in a browser as well as on a server.

/** The 64 round constants of SHA-256, FIPS 180-4 §4.2.2. */
const SHA256_K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

const SHA256_INITIAL = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
const SHA1_INITIAL = [0x67452301, 0xefcdab89, 0x98badcfe, 0x10325476, 0xc3d2e1f0];
const BLOCK_BYTES = 64;

function rotl(value: number, bits: number): number {
  return ((value << bits) | (value >>> (32 - bits))) >>> 0;
}

function rotr(value: number, bits: number): number {
  return ((value >>> bits) | (value << (32 - bits))) >>> 0;
}

/** The bytes of a string (UTF-8) or a copy of the bytes given. */
function toBytes(input: string | Uint8Array): Uint8Array {
  if (typeof input !== 'string') return new Uint8Array(input);
  return new TextEncoder().encode(input);
}

/** Appends the 0x80, the zero padding and the 64-bit big-endian bit length. */
function pad(message: Uint8Array): Uint8Array {
  const bitLength = message.length * 8;
  const paddedLength = Math.ceil((message.length + 9) / BLOCK_BYTES) * BLOCK_BYTES;
  const padded = new Uint8Array(paddedLength);
  padded.set(message);
  padded[message.length] = 0x80;
  const high = Math.floor(bitLength / 0x100000000);
  const low = bitLength >>> 0;
  padded[paddedLength - 8] = (high >>> 24) & 0xff;
  padded[paddedLength - 7] = (high >>> 16) & 0xff;
  padded[paddedLength - 6] = (high >>> 8) & 0xff;
  padded[paddedLength - 5] = high & 0xff;
  padded[paddedLength - 4] = (low >>> 24) & 0xff;
  padded[paddedLength - 3] = (low >>> 16) & 0xff;
  padded[paddedLength - 2] = (low >>> 8) & 0xff;
  padded[paddedLength - 1] = low & 0xff;
  return padded;
}

/** SHA-256, FIPS 180-4. */
function sha256(message: Uint8Array): Uint8Array {
  const state = [...SHA256_INITIAL];
  const padded = pad(message);
  const schedule = new Uint32Array(64);

  for (let offset = 0; offset < padded.length; offset += BLOCK_BYTES) {
    for (let index = 0; index < 16; index += 1) {
      const at = offset + index * 4;
      schedule[index] =
        ((padded[at]! << 24) | (padded[at + 1]! << 16) | (padded[at + 2]! << 8) | padded[at + 3]!) >>>
        0;
    }
    for (let index = 16; index < 64; index += 1) {
      const previous15 = schedule[index - 15]!;
      const previous2 = schedule[index - 2]!;
      const small0 = rotr(previous15, 7) ^ rotr(previous15, 18) ^ (previous15 >>> 3);
      const small1 = rotr(previous2, 17) ^ rotr(previous2, 19) ^ (previous2 >>> 10);
      schedule[index] = (schedule[index - 16]! + small0 + schedule[index - 7]! + small1) >>> 0;
    }

    let [a, b, c, d, e, f, g, h] = state as [
      number,
      number,
      number,
      number,
      number,
      number,
      number,
      number,
    ];

    for (let index = 0; index < 64; index += 1) {
      const sum1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const choice = (e & f) ^ (~e & g);
      const temporary1 = (h + sum1 + choice + SHA256_K[index]! + schedule[index]!) >>> 0;
      const sum0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const majority = (a & b) ^ (a & c) ^ (b & c);
      const temporary2 = (sum0 + majority) >>> 0;

      h = g;
      g = f;
      f = e;
      e = (d + temporary1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temporary1 + temporary2) >>> 0;
    }

    state[0] = (state[0]! + a) >>> 0;
    state[1] = (state[1]! + b) >>> 0;
    state[2] = (state[2]! + c) >>> 0;
    state[3] = (state[3]! + d) >>> 0;
    state[4] = (state[4]! + e) >>> 0;
    state[5] = (state[5]! + f) >>> 0;
    state[6] = (state[6]! + g) >>> 0;
    state[7] = (state[7]! + h) >>> 0;
  }

  const digest = new Uint8Array(32);
  state.forEach((word, index) => {
    digest[index * 4] = (word >>> 24) & 0xff;
    digest[index * 4 + 1] = (word >>> 16) & 0xff;
    digest[index * 4 + 2] = (word >>> 8) & 0xff;
    digest[index * 4 + 3] = word & 0xff;
  });
  return digest;
}

/** SHA-1, FIPS 180-4. Kept because Twilio signs webhooks with HMAC-SHA-1. */
function sha1(message: Uint8Array): Uint8Array {
  const state = [...SHA1_INITIAL];
  const padded = pad(message);
  const schedule = new Uint32Array(80);

  for (let offset = 0; offset < padded.length; offset += BLOCK_BYTES) {
    for (let index = 0; index < 16; index += 1) {
      const at = offset + index * 4;
      schedule[index] =
        ((padded[at]! << 24) | (padded[at + 1]! << 16) | (padded[at + 2]! << 8) | padded[at + 3]!) >>>
        0;
    }
    for (let index = 16; index < 80; index += 1) {
      schedule[index] = rotl(
        schedule[index - 3]! ^ schedule[index - 8]! ^ schedule[index - 14]! ^ schedule[index - 16]!,
        1
      );
    }

    let [a, b, c, d, e] = state as [number, number, number, number, number];

    for (let index = 0; index < 80; index += 1) {
      let round: number;
      let constant: number;
      if (index < 20) {
        round = (b & c) | (~b & d);
        constant = 0x5a827999;
      } else if (index < 40) {
        round = b ^ c ^ d;
        constant = 0x6ed9eba1;
      } else if (index < 60) {
        round = (b & c) | (b & d) | (c & d);
        constant = 0x8f1bbcdc;
      } else {
        round = b ^ c ^ d;
        constant = 0xca62c1d6;
      }
      const temporary = (rotl(a, 5) + round + e + constant + schedule[index]!) >>> 0;
      e = d;
      d = c;
      c = rotl(b, 30);
      b = a;
      a = temporary;
    }

    state[0] = (state[0]! + a) >>> 0;
    state[1] = (state[1]! + b) >>> 0;
    state[2] = (state[2]! + c) >>> 0;
    state[3] = (state[3]! + d) >>> 0;
    state[4] = (state[4]! + e) >>> 0;
  }

  const digest = new Uint8Array(20);
  state.forEach((word, index) => {
    digest[index * 4] = (word >>> 24) & 0xff;
    digest[index * 4 + 1] = (word >>> 16) & 0xff;
    digest[index * 4 + 2] = (word >>> 8) & 0xff;
    digest[index * 4 + 3] = word & 0xff;
  });
  return digest;
}

/** HMAC over a 64-byte-block hash, RFC 2104. */
function hmac(
  hash: (bytes: Uint8Array) => Uint8Array,
  key: string | Uint8Array,
  message: string | Uint8Array
): Uint8Array {
  const rawKey = toBytes(key);
  const usableKey = rawKey.length > BLOCK_BYTES ? hash(rawKey) : rawKey;
  const innerPad = new Uint8Array(BLOCK_BYTES);
  const outerPad = new Uint8Array(BLOCK_BYTES);
  for (let index = 0; index < BLOCK_BYTES; index += 1) {
    const byte = usableKey[index] ?? 0;
    innerPad[index] = byte ^ 0x36;
    outerPad[index] = byte ^ 0x5c;
  }
  const messageBytes = toBytes(message);
  const innerInput = new Uint8Array(BLOCK_BYTES + messageBytes.length);
  innerInput.set(innerPad);
  innerInput.set(messageBytes, BLOCK_BYTES);
  const innerDigest = hash(innerInput);

  const outerInput = new Uint8Array(BLOCK_BYTES + innerDigest.length);
  outerInput.set(outerPad);
  outerInput.set(innerDigest, BLOCK_BYTES);
  return hash(outerInput);
}

function toHex(bytes: Uint8Array): string {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

const BASE64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function toBase64(bytes: Uint8Array): string {
  let output = '';
  for (let index = 0; index < bytes.length; index += 3) {
    const first = bytes[index]!;
    const second = bytes[index + 1];
    const third = bytes[index + 2];
    const triple = (first << 16) | ((second ?? 0) << 8) | (third ?? 0);
    output += BASE64_ALPHABET[(triple >>> 18) & 0x3f];
    output += BASE64_ALPHABET[(triple >>> 12) & 0x3f];
    output += second === undefined ? '=' : BASE64_ALPHABET[(triple >>> 6) & 0x3f];
    output += third === undefined ? '=' : BASE64_ALPHABET[triple & 0x3f];
  }
  return output;
}

/** Base64 of a UTF-8 string, for the HTTP Basic header. */
export function base64Encode(text: string): string {
  return toBase64(toBytes(text));
}

/** HMAC-SHA-256 of `message` with `secret`, as lower-case hex. */
export function hmacSha256Hex(secret: string | Uint8Array, message: string | Uint8Array): string {
  return toHex(hmac(sha256, secret, message));
}

/** HMAC-SHA-1 of `message` with `secret`, as lower-case hex. */
export function hmacSha1Hex(secret: string | Uint8Array, message: string | Uint8Array): string {
  return toHex(hmac(sha1, secret, message));
}

/** HMAC-SHA-1 of `message` with `secret`, as base64. Twilio signs webhooks this way. */
export function hmacSha1Base64(secret: string | Uint8Array, message: string | Uint8Array): string {
  return toBase64(hmac(sha1, secret, message));
}

/**
 * Compares two strings without returning early on the first differing character.
 *
 * A length difference is reported at once; that reveals only the length, not the content.
 */
export function timingSafeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}
