// ABOUTME: Tests the STORED zip writer and parser: a round trip, a read by an external tool, and
// ABOUTME: the refusals for a damaged entry, a compressed entry and a file that is not a zip at all.

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { crc32, readZip, writeZip, ZipFormatError } from '../zip';

const text = (value: string) => new TextEncoder().encode(value);

describe('crc32', () => {
  it('matches the reference value for the standard check string', () => {
    // The CRC-32 of "123456789" is the published check value of the IEEE polynomial.
    expect(crc32(text('123456789'))).toBe(0xcbf43926);
  });
});

describe('writeZip / readZip', () => {
  const entries = [
    { name: 'manifest.json', data: text('{"format":"test"}') },
    { name: 'schoolpilot-canonical.sqlite3', data: new Uint8Array([0, 1, 2, 3, 250, 251, 252]) },
    { name: 'empty.bin', data: new Uint8Array() },
  ];
  const modified = new Date(2026, 10, 2, 14, 30, 10);

  it('reads back every entry it wrote, byte for byte and in order', () => {
    const archive = writeZip(entries, modified);
    const read = readZip(archive);

    expect(read.map((entry) => entry.name)).toEqual(entries.map((entry) => entry.name));
    read.forEach((entry, index) => {
      expect(Array.from(entry.data)).toEqual(Array.from(entries[index].data));
    });
  });

  it('writes a standard archive another tool can extract', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'schoolpilot-zip-'));
    try {
      const file = path.join(directory, 'archive.zip');
      fs.writeFileSync(file, writeZip(entries, modified));
      const out = path.join(directory, 'out');

      if (process.platform === 'win32') {
        execFileSync('powershell.exe', [
          '-NoProfile',
          '-Command',
          `Expand-Archive -LiteralPath '${file}' -DestinationPath '${out}'`,
        ]);
      } else {
        execFileSync('unzip', ['-q', file, '-d', out]);
      }

      for (const entry of entries) {
        expect(Array.from(fs.readFileSync(path.join(out, entry.name)))).toEqual(Array.from(entry.data));
      }
    } finally {
      fs.rmSync(directory, { recursive: true, force: true });
    }
    // A cold PowerShell takes ~15 s on its own and far longer beside a full suite.
  }, 180_000);

  it('refuses an entry whose bytes no longer match its checksum', () => {
    const archive = writeZip(entries, modified);
    // The second entry's data starts after its local header (30 bytes + the name).
    const firstLength = 30 + 'manifest.json'.length + entries[0].data.length;
    const secondData = firstLength + 30 + 'schoolpilot-canonical.sqlite3'.length;
    archive[secondData + 2] ^= 0xff;

    expect(() => readZip(archive)).toThrow(ZipFormatError);
    expect(() => readZip(archive)).toThrow(/schoolpilot-canonical\.sqlite3.*checksum/);
  });

  it('refuses a file that is not a zip archive', () => {
    expect(() => readZip(text('SQLite format 3\u0000 and then some'))).toThrow(ZipFormatError);
  });

  it('refuses a compressed entry it cannot read', () => {
    const archive = writeZip([entries[0]], modified);
    // Method field: offset 8 in the local header and 10 in the central directory header.
    const central = archive.length - 22 - (46 + 'manifest.json'.length);
    archive[8] = 8;
    archive[central + 10] = 8;

    expect(() => readZip(archive)).toThrow(/compressed/);
  });
});
