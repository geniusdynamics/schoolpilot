// ABOUTME: QR golden matrices and structural decoding: every committed vector decodes to its payload
// ABOUTME: (zxing-cpp, recorded in the fixture), selects the lowest-penalty mask, and carries valid
// ABOUTME: format and version information.

import { describe, expect, it } from 'vitest';
import { maskPenalty, qrEncode, qrMatrix, qrSvgPath, QR_MAX_BYTES, QrCapacityError } from '../qr';
import goldens from './fixtures/qr-goldens.json';

interface GoldenVector {
  readonly payload: string;
  readonly bytes: number;
  readonly version: number;
  readonly size: number;
  readonly mask: number;
  readonly penalty: number;
  readonly candidates: readonly { mask: number; penalty: number }[];
  readonly rows: readonly string[];
}

const vectors = (goldens as { vectors: GoldenVector[] }).vectors;

const toModules = (rows: readonly string[]): boolean[][] => rows.map((row) => [...row].map((cell) => cell === '1'));

/** The BCH(15,5) format value, implemented here so the test does not trust the encoder's own copy. */
function bch15(data: number): number {
  let remainder = data << 10;
  for (let bit = 14; bit >= 10; bit -= 1) {
    if ((remainder >> bit) & 1) remainder ^= 0x537 << (bit - 10);
  }
  return (data << 10) | remainder;
}

/** Reads the 15 format bits from the standard positions and returns the decoded data word. */
function readFormatData(modules: readonly (readonly boolean[])[], size: number): number {
  let bits = 0;
  const read = (row: number, column: number, index: number): void => {
    if (modules[row][column]) bits |= 1 << index;
  };
  for (let i = 0; i < 15; i += 1) {
    if (i < 6) read(i, 8, i);
    else if (i < 8) read(i + 1, 8, i);
    else read(size - 15 + i, 8, i);
  }
  const maskBits = bits ^ 0x5412;
  for (let data = 0; data < 32; data += 1) {
    if (bch15(data) === maskBits) return data;
  }
  return -1;
}

describe('QR goldens', () => {
  it('has a golden for every version and every block layout', () => {
    const versions = new Set(vectors.map((vector) => vector.version));
    expect([...versions].sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it('reproduces every committed matrix', () => {
    for (const vector of vectors) {
      const matrix = qrMatrix(vector.payload);
      expect(matrix.version, `${vector.bytes}-byte payload version`).toBe(vector.version);
      expect(matrix.size).toBe(vector.size);
      expect(matrix.mask).toBe(vector.mask);
      expect(matrix.modules.map((row) => row.map((dark) => (dark ? '1' : '0')).join(''))).toEqual(vector.rows);
    }
  });

  it('selects the mask with the lowest penalty of the eight', () => {
    for (const vector of vectors) {
      const { matrix, candidates } = qrEncode(vector.payload);
      expect(candidates).toHaveLength(8);
      const best = Math.min(...candidates.map((candidate) => candidate.penalty));
      expect(matrix.penalty).toBe(best);
      expect(candidates[matrix.mask].penalty).toBe(best);
      expect(maskPenalty(matrix.modules, matrix.size)).toBe(vector.penalty);
    }
  });

  it('writes format information that decodes to EC level M and the selected mask', () => {
    for (const vector of vectors) {
      const data = readFormatData(toModules(vector.rows), vector.size);
      expect(data, `format word of a ${vector.bytes}-byte vector`).toBeGreaterThanOrEqual(0);
      expect(data >> 3, 'EC level M is 00').toBe(0);
      expect(data & 0b111).toBe(vector.mask);
    }
  });

  it('draws the three finder patterns and the timing patterns', () => {
    for (const vector of vectors) {
      const modules = toModules(vector.rows);
      const size = vector.size;
      const finder = (row0: number, column0: number): void => {
        for (let row = 0; row < 7; row += 1) {
          for (let column = 0; column < 7; column += 1) {
            const ring = row === 0 || row === 6 || column === 0 || column === 6;
            const core = row >= 2 && row <= 4 && column >= 2 && column <= 4;
            expect(modules[row0 + row][column0 + column], `finder ${row0},${column0} at ${row},${column}`).toBe(ring || core);
          }
        }
      };
      finder(0, 0);
      finder(0, size - 7);
      finder(size - 7, 0);
      for (let i = 8; i < size - 8; i += 1) {
        expect(modules[6][i]).toBe(i % 2 === 0);
        expect(modules[i][6]).toBe(i % 2 === 0);
      }
      expect(modules[size - 8][8]).toBe(true);
    }
  });

  it('encodes multi-byte text by UTF-8 byte length', () => {
    const arabic = qrMatrix('تحقق');
    expect(arabic.version).toBe(1);
    const long = qrMatrix('تحقق '.repeat(10));
    expect(long.version).toBeGreaterThan(1);
  });

  it('refuses a payload beyond a version-10 symbol', () => {
    expect(() => qrMatrix('x'.repeat(QR_MAX_BYTES + 1))).toThrow(QrCapacityError);
    expect(() => qrMatrix('x'.repeat(QR_MAX_BYTES))).not.toThrow();
  });
});

describe('QR rendering', () => {
  it('returns a path in module units with a four-module quiet zone', () => {
    const matrix = qrMatrix('https://verify.schoolpilot.app/v1/RC-2026-000123?sig=6Kq2x0Yb8m3TfWc');
    const rendered = qrSvgPath(matrix);
    expect(rendered.quietZone).toBe(4);
    expect(rendered.dimension).toBe(matrix.size + 8);
    const darkModules = matrix.modules.flat().filter(Boolean).length;
    expect(rendered.path.match(/h1v1h-1z/g)).toHaveLength(darkModules);
    // Every sub-path starts inside the quiet zone, never at 0,0.
    expect(rendered.path.startsWith('M4 4')).toBe(true);
    expect(rendered.path).not.toContain('M0 ');
  });
});
