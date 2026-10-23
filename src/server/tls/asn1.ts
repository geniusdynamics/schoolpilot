// ABOUTME: The DER primitives X.509 needs and Node does not expose: definite-length tags, OIDs,
// ABOUTME: times and the context tags a certificate and its extensions are built from.

/** DER's single-byte tag numbers, named for the ones a certificate uses. */
export const TAG = {
  boolean: 0x01,
  integer: 0x02,
  bitString: 0x03,
  octetString: 0x04,
  objectIdentifier: 0x06,
  utf8String: 0x0c,
  utcTime: 0x17,
  generalizedTime: 0x18,
  sequence: 0x30,
  set: 0x31,
} as const;

/** Encodes DER's definite length form: short form under 128 bytes, long form above it. */
export function encodeLength(length: number): Buffer {
  if (!Number.isInteger(length) || length < 0) {
    throw new RangeError(`a DER length must be a non-negative integer, received ${length}`);
  }
  if (length < 0x80) return Buffer.from([length]);

  const bytes: number[] = [];
  let remaining = length;
  while (remaining > 0) {
    bytes.unshift(remaining & 0xff);
    remaining = Math.floor(remaining / 256);
  }
  return Buffer.from([0x80 | bytes.length, ...bytes]);
}

/** One tag-length-value triple. */
export function tlv(tag: number, content: Buffer): Buffer {
  return Buffer.concat([Buffer.from([tag]), encodeLength(content.length), content]);
}

export function sequence(...parts: Buffer[]): Buffer {
  return tlv(TAG.sequence, Buffer.concat(parts));
}

export function set(...parts: Buffer[]): Buffer {
  return tlv(TAG.set, Buffer.concat(parts));
}

/**
 * A positive INTEGER.
 *
 * DER integers are signed, so a value whose first byte has the high bit set carries a leading
 * zero. Leading zero bytes are otherwise stripped, because two encodings of one number are not
 * both valid DER.
 */
export function integer(value: number | bigint | Buffer): Buffer {
  let bytes: Buffer;
  if (typeof value === 'number' || typeof value === 'bigint') {
    const numeric = BigInt(value);
    if (numeric < 0n) throw new RangeError('this encoder only writes non-negative integers');
    const hex = numeric.toString(16);
    bytes = Buffer.from(hex.length % 2 === 0 ? hex : `0${hex}`, 'hex');
  } else {
    bytes = Buffer.from(value);
  }

  let start = 0;
  while (start < bytes.length - 1 && bytes[start] === 0x00) start += 1;
  bytes = bytes.subarray(start);

  const body = (bytes[0] ?? 0) & 0x80 ? Buffer.concat([Buffer.from([0x00]), bytes]) : bytes;
  return tlv(TAG.integer, body);
}

/** A random positive serial number of `bytes` bytes, as a certificate needs. */
export function randomSerial(bytes = 16): Buffer {
  // 0x7f keeps the top bit clear so the value is unambiguously positive.
  const serial = Buffer.alloc(bytes);
  for (let index = 0; index < bytes; index += 1) {
    serial[index] = Math.floor(Math.random() * 256);
  }
  serial[0] = (serial[0] ?? 0) & 0x7f;
  if (serial[0] === 0) serial[0] = 1;
  return serial;
}

/** An OBJECT IDENTIFIER from its dotted form, e.g. `1.2.840.10045.4.3.2`. */
export function objectIdentifier(dotted: string): Buffer {
  const parts = dotted.split('.').map((part) => {
    const value = Number(part);
    if (!Number.isInteger(value) || value < 0) {
      throw new RangeError(`"${dotted}" is not a dotted object identifier`);
    }
    return value;
  });
  if (parts.length < 2) throw new RangeError(`"${dotted}" needs at least two components`);

  const first = parts[0] ?? 0;
  const second = parts[1] ?? 0;
  const body: number[] = [first * 40 + second];

  for (const part of parts.slice(2)) {
    const encoded: number[] = [];
    let remaining = part;
    do {
      encoded.unshift(remaining & 0x7f);
      remaining = Math.floor(remaining / 128);
    } while (remaining > 0);
    for (let index = 0; index < encoded.length - 1; index += 1) {
      encoded[index] = (encoded[index] ?? 0) | 0x80;
    }
    body.push(...encoded);
  }

  return tlv(TAG.objectIdentifier, Buffer.from(body));
}

export function utf8String(value: string): Buffer {
  return tlv(TAG.utf8String, Buffer.from(value, 'utf8'));
}

export function ia5String(value: string): Buffer {
  return tlv(0x16, Buffer.from(value, 'ascii'));
}

export function octetString(value: Buffer): Buffer {
  return tlv(TAG.octetString, value);
}

export function bitString(value: Buffer, unusedBits = 0): Buffer {
  return tlv(TAG.bitString, Buffer.concat([Buffer.from([unusedBits]), value]));
}

export function boolean(value: boolean): Buffer {
  return tlv(TAG.boolean, Buffer.from([value ? 0xff : 0x00]));
}

/** UTCTime, `YYMMDDHHMMSSZ`; the form every certificate inside this century uses. */
export function utcTime(date: Date): Buffer {
  const pad = (value: number): string => String(value).padStart(2, '0');
  const text =
    pad(date.getUTCFullYear() % 100) +
    pad(date.getUTCMonth() + 1) +
    pad(date.getUTCDate()) +
    pad(date.getUTCHours()) +
    pad(date.getUTCMinutes()) +
    pad(date.getUTCSeconds()) +
    'Z';
  return tlv(TAG.utcTime, Buffer.from(text, 'ascii'));
}

/** A context-specific constructed tag, `[n] EXPLICIT`. */
export function explicit(tagNumber: number, content: Buffer): Buffer {
  return tlv(0xa0 + tagNumber, content);
}

/** A context-specific primitive tag, the implicit form a GeneralName uses. */
export function implicit(tagNumber: number, content: Buffer): Buffer {
  return tlv(0x80 + tagNumber, content);
}
