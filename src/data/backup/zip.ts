// ABOUTME: A minimal STORED (uncompressed) zip writer and reader for the browser backup archive,
// ABOUTME: so the archive is a standard file any zip tool opens without a new runtime dependency.

/** An archive entry: its name inside the zip and its bytes. */
export interface ZipEntry {
  readonly name: string;
  readonly data: Uint8Array;
}

/** The bytes are not a zip this reader accepts; the message says what is wrong. */
export class ZipFormatError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ZipFormatError';
  }
}

const LOCAL_HEADER = 0x04034b50;
const CENTRAL_HEADER = 0x02014b50;
const END_OF_CENTRAL_DIRECTORY = 0x06054b50;
const LOCAL_HEADER_SIZE = 30;
const CENTRAL_HEADER_SIZE = 46;
const END_SIZE = 22;
/** Version 2.0: the lowest version a reader needs for a stored entry. */
const VERSION = 20;
/** General purpose flag bit 11: the entry name is UTF-8. */
const UTF8_NAMES = 0x0800;
/** General purpose flag bit 0: the entry is encrypted with zip's own (weak) scheme. */
const ZIP_ENCRYPTED = 0x0001;
/** The classic zip format stores sizes and offsets in 32 bits; there is no zip64 here. */
const MAX_32 = 0xffffffff;

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

/** CRC-32 (IEEE 802.3), the checksum zip records for every entry. */
export function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (let index = 0; index < data.length; index += 1) {
    crc = CRC_TABLE[(crc ^ data[index]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

/** MS-DOS time and date fields; zip has no other timestamp in its fixed headers. */
function dosDateTime(date: Date): { time: number; date: number } {
  const year = Math.min(Math.max(date.getFullYear(), 1980), 2107);
  return {
    time: (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2),
    date: ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
  };
}

/** Write the entries, uncompressed, into one zip archive. */
export function writeZip(entries: readonly ZipEntry[], modified: Date = new Date()): Uint8Array {
  const encoder = new TextEncoder();
  const stamp = dosDateTime(modified);
  const prepared = entries.map((entry) => ({
    name: encoder.encode(entry.name),
    data: entry.data,
    crc: crc32(entry.data),
  }));

  const localSize = prepared.reduce(
    (sum, entry) => sum + LOCAL_HEADER_SIZE + entry.name.length + entry.data.length,
    0
  );
  const centralSize = prepared.reduce((sum, entry) => sum + CENTRAL_HEADER_SIZE + entry.name.length, 0);
  const total = localSize + centralSize + END_SIZE;
  if (total > MAX_32 || prepared.length > 0xffff) {
    throw new ZipFormatError('The archive is too large for the zip format this app writes (4 GiB)');
  }

  const out = new Uint8Array(total);
  const view = new DataView(out.buffer);
  const offsets: number[] = [];
  let at = 0;

  for (const entry of prepared) {
    offsets.push(at);
    view.setUint32(at, LOCAL_HEADER, true);
    view.setUint16(at + 4, VERSION, true);
    view.setUint16(at + 6, UTF8_NAMES, true);
    view.setUint16(at + 8, 0, true);
    view.setUint16(at + 10, stamp.time, true);
    view.setUint16(at + 12, stamp.date, true);
    view.setUint32(at + 14, entry.crc, true);
    view.setUint32(at + 18, entry.data.length, true);
    view.setUint32(at + 22, entry.data.length, true);
    view.setUint16(at + 26, entry.name.length, true);
    view.setUint16(at + 28, 0, true);
    out.set(entry.name, at + LOCAL_HEADER_SIZE);
    out.set(entry.data, at + LOCAL_HEADER_SIZE + entry.name.length);
    at += LOCAL_HEADER_SIZE + entry.name.length + entry.data.length;
  }

  const centralStart = at;
  prepared.forEach((entry, index) => {
    view.setUint32(at, CENTRAL_HEADER, true);
    view.setUint16(at + 4, VERSION, true);
    view.setUint16(at + 6, VERSION, true);
    view.setUint16(at + 8, UTF8_NAMES, true);
    view.setUint16(at + 10, 0, true);
    view.setUint16(at + 12, stamp.time, true);
    view.setUint16(at + 14, stamp.date, true);
    view.setUint32(at + 16, entry.crc, true);
    view.setUint32(at + 20, entry.data.length, true);
    view.setUint32(at + 24, entry.data.length, true);
    view.setUint16(at + 28, entry.name.length, true);
    view.setUint16(at + 30, 0, true);
    view.setUint16(at + 32, 0, true);
    view.setUint16(at + 34, 0, true);
    view.setUint16(at + 36, 0, true);
    view.setUint32(at + 38, 0, true);
    view.setUint32(at + 42, offsets[index], true);
    out.set(entry.name, at + CENTRAL_HEADER_SIZE);
    at += CENTRAL_HEADER_SIZE + entry.name.length;
  });

  view.setUint32(at, END_OF_CENTRAL_DIRECTORY, true);
  view.setUint16(at + 4, 0, true);
  view.setUint16(at + 6, 0, true);
  view.setUint16(at + 8, prepared.length, true);
  view.setUint16(at + 10, prepared.length, true);
  view.setUint32(at + 12, at - centralStart, true);
  view.setUint32(at + 16, centralStart, true);
  view.setUint16(at + 20, 0, true);
  return out;
}

/** True when the bytes start like a zip archive (a local file header). */
export function looksLikeZip(bytes: Uint8Array): boolean {
  return (
    bytes.length >= 4 &&
    new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(0, true) === LOCAL_HEADER
  );
}

function findEndOfCentralDirectory(view: DataView): number {
  // The end record is the last 22 bytes unless the archive carries a comment (up to 64 KiB).
  const lowest = Math.max(0, view.byteLength - END_SIZE - 0xffff);
  for (let at = view.byteLength - END_SIZE; at >= lowest; at -= 1) {
    if (view.getUint32(at, true) === END_OF_CENTRAL_DIRECTORY) return at;
  }
  throw new ZipFormatError('The file is not a zip archive: it has no end-of-archive record');
}

/**
 * Read every entry of a zip archive, checking each against the checksum the archive records.
 *
 * Only stored (uncompressed) entries are accepted: the app writes nothing else, and a compressed
 * entry means the archive was rebuilt by another tool, which a restore should not trust silently.
 */
export function readZip(bytes: Uint8Array): ZipEntry[] {
  if (bytes.length < END_SIZE) {
    throw new ZipFormatError('The file is too short to be a zip archive');
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const end = findEndOfCentralDirectory(view);
  const count = view.getUint16(end + 10, true);
  const centralOffset = view.getUint32(end + 16, true);
  const decoder = new TextDecoder('utf-8', { fatal: true });

  const entries: ZipEntry[] = [];
  const seen = new Set<string>();
  let at = centralOffset;
  for (let index = 0; index < count; index += 1) {
    if (at + CENTRAL_HEADER_SIZE > end || view.getUint32(at, true) !== CENTRAL_HEADER) {
      throw new ZipFormatError('The zip central directory is damaged');
    }
    const flags = view.getUint16(at + 8, true);
    const method = view.getUint16(at + 10, true);
    const expectedCrc = view.getUint32(at + 16, true);
    const compressedSize = view.getUint32(at + 20, true);
    const size = view.getUint32(at + 24, true);
    const nameLength = view.getUint16(at + 28, true);
    const extraLength = view.getUint16(at + 30, true);
    const commentLength = view.getUint16(at + 32, true);
    const localOffset = view.getUint32(at + 42, true);
    const name = decoder.decode(bytes.subarray(at + CENTRAL_HEADER_SIZE, at + CENTRAL_HEADER_SIZE + nameLength));
    at += CENTRAL_HEADER_SIZE + nameLength + extraLength + commentLength;

    if (flags & ZIP_ENCRYPTED) {
      throw new ZipFormatError(`The zip entry ${name} uses zip encryption, which this app does not read`);
    }
    if (method !== 0 || compressedSize !== size) {
      throw new ZipFormatError(`The zip entry ${name} is compressed; a SchoolPilot backup stores its files uncompressed`);
    }
    if (seen.has(name)) {
      throw new ZipFormatError(`The zip archive holds ${name} twice`);
    }
    seen.add(name);

    if (localOffset + LOCAL_HEADER_SIZE > bytes.length || view.getUint32(localOffset, true) !== LOCAL_HEADER) {
      throw new ZipFormatError(`The zip entry ${name} points at a damaged local header`);
    }
    const dataStart =
      localOffset +
      LOCAL_HEADER_SIZE +
      view.getUint16(localOffset + 26, true) +
      view.getUint16(localOffset + 28, true);
    if (dataStart + size > bytes.length) {
      throw new ZipFormatError(`The zip entry ${name} runs past the end of the file`);
    }

    const data = bytes.slice(dataStart, dataStart + size);
    if (crc32(data) !== expectedCrc) {
      throw new ZipFormatError(`The zip entry ${name} does not match its checksum; the file is damaged`);
    }
    entries.push({ name, data });
  }
  return entries;
}
