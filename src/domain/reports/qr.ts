// ABOUTME: A dependency-free QR encoder (byte mode, error correction level M, versions 1–10) with the
// ABOUTME: four penalty rules for mask selection, returning the module matrix for inline SVG.

import type { QrMatrix } from './types';

/**
 * Per version: total codewords, EC codewords per block, then (blocks, data codewords) for the first
 * group and for the second group. EC level M only — the level the print surface uses.
 */
const VERSION_TABLE: Readonly<Record<number, readonly [number, number, number, number, number, number]>> = {
  1: [26, 10, 1, 16, 0, 0],
  2: [44, 16, 1, 28, 0, 0],
  3: [70, 26, 1, 44, 0, 0],
  4: [100, 18, 2, 32, 0, 0],
  5: [134, 24, 2, 43, 0, 0],
  6: [172, 16, 4, 27, 0, 0],
  7: [196, 18, 4, 31, 0, 0],
  8: [242, 22, 2, 38, 2, 39],
  9: [292, 22, 3, 36, 2, 37],
  10: [346, 26, 4, 43, 1, 44],
};

/** Row/column centres of the alignment patterns per version. */
const ALIGNMENT_CENTRES: Readonly<Record<number, readonly number[]>> = {
  1: [],
  2: [6, 18],
  3: [6, 22],
  4: [6, 26],
  5: [6, 30],
  6: [6, 34],
  7: [6, 22, 38],
  8: [6, 24, 42],
  9: [6, 26, 46],
  10: [6, 28, 50],
};

const MAX_VERSION = 10;

export class QrCapacityError extends Error {
  constructor(byteLength: number) {
    super(`payload of ${byteLength} bytes exceeds a version-10 EC-M symbol`);
    this.name = 'QrCapacityError';
  }
}

// ---------------------------------------------------------------- Galois field

const EXP = new Uint8Array(512);
const LOG = new Uint8Array(256);
{
  let x = 1;
  for (let i = 0; i < 255; i += 1) {
    EXP[i] = x;
    LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i += 1) EXP[i] = EXP[i - 255];
}

const multiply = (a: number, b: number): number => (a && b ? EXP[LOG[a] + LOG[b]] : 0);

function generatorPolynomial(degree: number): number[] {
  let polynomial = [1];
  for (let i = 0; i < degree; i += 1) {
    const next = new Array<number>(polynomial.length + 1).fill(0);
    for (let j = 0; j < polynomial.length; j += 1) {
      next[j] ^= polynomial[j];
      next[j + 1] ^= multiply(polynomial[j], EXP[i]);
    }
    polynomial = next;
  }
  return polynomial;
}

function errorCorrection(data: readonly number[], degree: number): number[] {
  const generator = generatorPolynomial(degree);
  const remainder = new Array<number>(degree).fill(0);
  for (const byte of data) {
    const factor = byte ^ remainder[0];
    remainder.shift();
    remainder.push(0);
    for (let i = 0; i < degree; i += 1) remainder[i] ^= multiply(generator[i + 1], factor);
  }
  return remainder;
}

/** BCH code used by the format and version information. */
function bch(data: number, polynomial: number, shift: number): number {
  const bitLength = (value: number): number => {
    let n = 0;
    let v = value;
    while (v !== 0) {
      n += 1;
      v >>>= 1;
    }
    return n;
  };
  let remainder = data << shift;
  while (bitLength(remainder) - bitLength(polynomial) >= 0) {
    remainder ^= polynomial << (bitLength(remainder) - bitLength(polynomial));
  }
  return (data << shift) | remainder;
}

// ------------------------------------------------------------------- capacity

/** The largest payload a version-10 EC-M symbol accepts in byte mode. */
export const QR_MAX_BYTES = (() => {
  const [, , blocks1, data1, blocks2, data2] = VERSION_TABLE[MAX_VERSION];
  const dataCodewords = blocks1 * data1 + blocks2 * data2;
  // Mode indicator 4 bits + a 16-bit character count, then the payload, rounded down to whole bytes.
  return Math.floor((dataCodewords * 8 - 4 - 16) / 8);
})();

function chooseVersion(byteLength: number): number {
  for (let version = 1; version <= MAX_VERSION; version += 1) {
    const [, , blocks1, data1, blocks2, data2] = VERSION_TABLE[version];
    const dataCodewords = blocks1 * data1 + blocks2 * data2;
    const headerBits = 4 + (version < 10 ? 8 : 16);
    if (headerBits + byteLength * 8 <= dataCodewords * 8) return version;
  }
  throw new QrCapacityError(byteLength);
}

// -------------------------------------------------------------- penalty rules

/**
 * Rule 3: the 1:1:3:1:1 finder-like pattern with a light area four modules wide on at least one
 * side. A pattern at the symbol edge counts, because the quiet zone supplies the light area — the
 * same reading as ISO/IEC 18004 §7.8.3.
 */
function finderPenalty(line: readonly boolean[], size: number): number {
  let score = 0;
  for (let start = 0; start + 7 <= size; start += 1) {
    const matches =
      line[start] &&
      !line[start + 1] &&
      line[start + 2] &&
      line[start + 3] &&
      line[start + 4] &&
      !line[start + 5] &&
      line[start + 6];
    if (!matches) continue;
    const before = line.slice(Math.max(start - 4, 0), start);
    const after = line.slice(start + 7, Math.min(start + 11, size));
    if (before.every((module) => !module) || after.every((module) => !module)) score += 40;
  }
  return score;
}

/**
 * The four mask penalty rules of ISO/IEC 18004 §8.8.2, each scored separately so a test can prove
 * the selected mask is the lowest scored of the eight.
 */
export function maskPenalty(modules: readonly (readonly boolean[])[], size: number): number {
  const lines: boolean[][] = [];
  for (let row = 0; row < size; row += 1) lines.push([...modules[row]]);
  for (let column = 0; column < size; column += 1) {
    lines.push(modules.map((row) => row[column]));
  }

  let score = 0;
  // Rule 1: five or more same-coloured modules in a line.
  for (const line of lines) {
    let run = 1;
    for (let i = 1; i < size; i += 1) {
      if (line[i] === line[i - 1]) run += 1;
      else {
        if (run >= 5) score += 3 + (run - 5);
        run = 1;
      }
    }
    if (run >= 5) score += 3 + (run - 5);
    // Rule 3: the finder-like pattern with a light area on one side.
    score += finderPenalty(line, size);
  }
  // Rule 2: every 2×2 block of one colour.
  for (let row = 0; row < size - 1; row += 1) {
    for (let column = 0; column < size - 1; column += 1) {
      const dark = modules[row][column];
      if (dark === modules[row][column + 1] && dark === modules[row + 1][column] && dark === modules[row + 1][column + 1]) {
        score += 3;
      }
    }
  }
  // Rule 4: deviation from a 50% dark ratio, in 5% steps.
  let dark = 0;
  for (const row of modules) for (const module of row) if (module) dark += 1;
  score += Math.floor(Math.abs((dark * 100) / (size * size) - 50) / 5) * 10;
  return score;
}

// -------------------------------------------------------------------- encoder

const MASK_FUNCTIONS: readonly ((row: number, column: number) => boolean)[] = [
  (row, column) => (row + column) % 2 === 0,
  (row) => row % 2 === 0,
  (_row, column) => column % 3 === 0,
  (row, column) => (row + column) % 3 === 0,
  (row, column) => (Math.floor(row / 2) + Math.floor(column / 3)) % 2 === 0,
  (row, column) => ((row * column) % 2) + ((row * column) % 3) === 0,
  (row, column) => (((row * column) % 2) + ((row * column) % 3)) % 2 === 0,
  (row, column) => (((row + column) % 2) + ((row * column) % 3)) % 2 === 0,
];

/**
 * Encodes text as a QR symbol: byte mode, EC level M, versions 1–10, and the mask with the lowest
 * penalty score. Returns the module matrix (true = dark) with no quiet zone, plus the score of every
 * candidate mask so a caller (or a test) can prove the selection.
 */
export function qrEncode(text: string): {
  readonly matrix: QrMatrix;
  readonly candidates: readonly { readonly mask: number; readonly penalty: number }[];
} {
  const bytes = new TextEncoder().encode(text);
  const version = chooseVersion(bytes.length);
  const [, ecPerBlock, blocks1, data1, blocks2, data2] = VERSION_TABLE[version];
  const dataCodewords = blocks1 * data1 + blocks2 * data2;

  const bits: number[] = [];
  const push = (value: number, length: number): void => {
    for (let i = length - 1; i >= 0; i -= 1) bits.push((value >>> i) & 1);
  };
  push(0b0100, 4); // byte mode
  push(bytes.length, version < 10 ? 8 : 16);
  for (const byte of bytes) push(byte, 8);

  const capacityBits = dataCodewords * 8;
  for (let i = 0; i < 4 && bits.length < capacityBits; i += 1) bits.push(0);
  while (bits.length % 8 !== 0) bits.push(0);
  const codewords: number[] = [];
  for (let i = 0; i < bits.length; i += 8) {
    let value = 0;
    for (let j = 0; j < 8; j += 1) value = (value << 1) | bits[i + j];
    codewords.push(value);
  }
  for (let i = 0; codewords.length < dataCodewords; i += 1) codewords.push(i % 2 === 0 ? 0xec : 0x11);

  const blocks: number[][] = [];
  let offset = 0;
  for (let i = 0; i < blocks1; i += 1) {
    blocks.push(codewords.slice(offset, offset + data1));
    offset += data1;
  }
  for (let i = 0; i < blocks2; i += 1) {
    blocks.push(codewords.slice(offset, offset + data2));
    offset += data2;
  }
  const ecBlocks = blocks.map((block) => errorCorrection(block, ecPerBlock));
  const interleaved: number[] = [];
  const longest = Math.max(data1, data2);
  for (let i = 0; i < longest; i += 1) {
    for (const block of blocks) if (i < block.length) interleaved.push(block[i]);
  }
  for (let i = 0; i < ecPerBlock; i += 1) {
    for (const block of ecBlocks) interleaved.push(block[i]);
  }

  const size = version * 4 + 17;
  const modules: boolean[][] = Array.from({ length: size }, () => new Array<boolean>(size).fill(false));
  const reserved: boolean[][] = Array.from({ length: size }, () => new Array<boolean>(size).fill(false));
  const place = (row: number, column: number, dark: boolean): void => {
    modules[row][column] = dark;
    reserved[row][column] = true;
  };

  const drawFinder = (row0: number, column0: number): void => {
    for (let row = -1; row <= 7; row += 1) {
      for (let column = -1; column <= 7; column += 1) {
        const r = row0 + row;
        const c = column0 + column;
        if (r < 0 || r >= size || c < 0 || c >= size) continue;
        const dark =
          (row >= 0 && row <= 6 && (column === 0 || column === 6)) ||
          (column >= 0 && column <= 6 && (row === 0 || row === 6)) ||
          (row >= 2 && row <= 4 && column >= 2 && column <= 4);
        place(r, c, dark);
      }
    }
  };
  drawFinder(0, 0);
  drawFinder(0, size - 7);
  drawFinder(size - 7, 0);

  for (let i = 8; i < size - 8; i += 1) {
    place(6, i, i % 2 === 0);
    place(i, 6, i % 2 === 0);
  }

  const centres = ALIGNMENT_CENTRES[version];
  for (let i = 0; i < centres.length; i += 1) {
    for (let j = 0; j < centres.length; j += 1) {
      const overlapsFinder =
        (i === 0 && j === 0) || (i === 0 && j === centres.length - 1) || (i === centres.length - 1 && j === 0);
      if (overlapsFinder) continue;
      for (let row = -2; row <= 2; row += 1) {
        for (let column = -2; column <= 2; column += 1) {
          place(centres[i] + row, centres[j] + column, Math.max(Math.abs(row), Math.abs(column)) !== 1);
        }
      }
    }
  }

  place(size - 8, 8, true); // the fixed dark module

  for (let i = 0; i < 9; i += 1) {
    reserved[8][i] = true;
    reserved[i][8] = true;
  }
  for (let i = 0; i < 8; i += 1) {
    reserved[8][size - 1 - i] = true;
    reserved[size - 1 - i][8] = true;
  }
  if (version >= 7) {
    for (let i = 0; i < 6; i += 1) {
      for (let j = 0; j < 3; j += 1) {
        reserved[i][size - 11 + j] = true;
        reserved[size - 11 + j][i] = true;
      }
    }
  }

  // Data placement: two-module columns, right to left, alternating direction, skipping column 6.
  let row = size - 1;
  let direction = -1;
  let bitIndex = 7;
  let byteIndex = 0;
  for (let column = size - 1; column > 0; column -= 2) {
    if (column === 6) column -= 1;
    for (;;) {
      for (let c = 0; c < 2; c += 1) {
        if (!reserved[row][column - c]) {
          let dark = false;
          if (byteIndex < interleaved.length) {
            dark = ((interleaved[byteIndex] >>> bitIndex) & 1) === 1;
          }
          modules[row][column - c] = dark;
          bitIndex -= 1;
          if (bitIndex === -1) {
            byteIndex += 1;
            bitIndex = 7;
          }
        }
      }
      row += direction;
      if (row < 0 || row >= size) {
        row -= direction;
        direction = -direction;
        break;
      }
    }
  }

  const withFormat = (base: readonly (readonly boolean[])[], mask: number): boolean[][] => {
    const result = base.map((line) => [...line]);
    // EC level M is 00; the format value is BCH(15,5) XOR 0x5412.
    const format = bch(mask, 0x537, 10) ^ 0x5412;
    for (let i = 0; i < 15; i += 1) {
      const dark = ((format >> i) & 1) === 1;
      if (i < 6) result[i][8] = dark;
      else if (i < 8) result[i + 1][8] = dark;
      else result[size - 15 + i][8] = dark;
      if (i < 8) result[8][size - i - 1] = dark;
      else if (i < 9) result[8][15 - i] = dark;
      else result[8][15 - i - 1] = dark;
    }
    result[size - 8][8] = true;
    if (version >= 7) {
      const versionBits = bch(version, 0x1f25, 12);
      for (let i = 0; i < 18; i += 1) {
        const dark = ((versionBits >> i) & 1) === 1;
        result[Math.floor(i / 3)][(i % 3) + size - 11] = dark;
        result[(i % 3) + size - 11][Math.floor(i / 3)] = dark;
      }
    }
    return result;
  };

  let best: boolean[][] | null = null;
  let bestMask = 0;
  let bestScore = Number.POSITIVE_INFINITY;
  const candidates: { mask: number; penalty: number }[] = [];
  for (let mask = 0; mask < 8; mask += 1) {
    const candidate = modules.map((line, r) =>
      line.map((dark, c) => (!reserved[r][c] && MASK_FUNCTIONS[mask](r, c) ? !dark : dark))
    );
    const scored = withFormat(candidate, mask);
    const score = maskPenalty(scored, size);
    candidates.push({ mask, penalty: score });
    if (score < bestScore) {
      best = scored;
      bestScore = score;
      bestMask = mask;
    }
  }

  return {
    matrix: { version, size, mask: bestMask, penalty: bestScore, modules: best ?? modules },
    candidates,
  };
}

/** The module matrix for a payload: the common case, without the per-mask scores. */
export function qrMatrix(text: string): QrMatrix {
  return qrEncode(text).matrix;
}

export interface QrSvgPath {
  /** SVG path data in module units, quiet zone included. */
  readonly path: string;
  /** viewBox width and height in module units (matrix size plus both quiet-zone bands). */
  readonly dimension: number;
  readonly quietZone: number;
}

/**
 * The dark modules as one SVG path in module units. The caller sizes the element in millimetres and
 * sets `shape-rendering="crispEdges"`; a vector QR keeps the PDF image-XObject count at zero.
 */
export function qrSvgPath(matrix: QrMatrix, quietZone = 4): QrSvgPath {
  const dimension = matrix.size + quietZone * 2;
  let path = '';
  for (let row = 0; row < matrix.size; row += 1) {
    for (let column = 0; column < matrix.size; column += 1) {
      if (matrix.modules[row][column]) {
        path += `M${column + quietZone} ${row + quietZone}h1v1h-1z`;
      }
    }
  }
  return { path, dimension, quietZone };
}
