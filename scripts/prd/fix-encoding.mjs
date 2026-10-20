#!/usr/bin/env node
// ABOUTME: Detects and repairs mojibake (UTF-8 text mis-read as Windows-1252 and re-saved) in source files.
// ABOUTME: `--check` exits 1 on mojibake or non-UTF-8 files; `--write` repairs them and verifies each fix round-trips.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const TEXT_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.json', '.css', '.scss', '.html', '.md', '.svg', '.txt', '.yml', '.yaml']);
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', 'coverage']);

// Same sequences the gate (G5) rejects: U+00C3 + Latin-1 continuation, U+00E2 U+20AC, U+00F0 U+0178.
// Kept as escapes (here and below) so this file never contains the markers itself.
const MOJIBAKE_RE = /\u00C3[\u0080-\u00BF]|\u00E2\u20AC|\u00F0\u0178/;

// Windows-1252 bytes 0x80..0x9F (0 = undefined). Hard-coded because Node's TextDecoder('windows-1252')
// decodes this range as Latin-1 C1 controls.
const CP1252_HIGH = [
  0x20ac, 0, 0x201a, 0x0192, 0x201e, 0x2026, 0x2020, 0x2021, 0x02c6, 0x2030, 0x0160, 0x2039, 0x0152, 0, 0x017d, 0,
  0, 0x2018, 0x2019, 0x201c, 0x201d, 0x2022, 0x2013, 0x2014, 0x02dc, 0x2122, 0x0161, 0x203a, 0x0153, 0, 0x017e, 0x0178,
];
const BYTE_TO_CHAR = Array.from({ length: 256 }, (_, b) =>
  String.fromCharCode(b >= 0x80 && b <= 0x9f && CP1252_HIGH[b - 0x80] ? CP1252_HIGH[b - 0x80] : b));
// Character -> byte. C1 controls (U+0080..U+009F) also map to their own byte, which covers the five
// bytes Windows-1252 leaves undefined and text that was mis-read as Latin-1.
const CHAR_TO_BYTE = new Map();
for (let b = 0x80; b <= 0x9f; b++) CHAR_TO_BYTE.set(String.fromCharCode(b), b);
BYTE_TO_CHAR.forEach((c, b) => CHAR_TO_BYTE.set(c, b));
const breakBytes = (s) => Array.from(new TextEncoder().encode(s), (b) => BYTE_TO_CHAR[b]).join('');
// ignoreBOM keeps a leading U+FEFF in the decoded text, so it is written back and the round-trip is byte-exact.
const strictUtf8 = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true });

// A 2-byte sequence is only repaired when it decodes to what Windows-1252 mojibake really produces:
// Latin-1 Supplement / Latin Extended-A (accented letters, copyright, times, Y-diaeresis) or the Windows-1252
// letters f-hook, circumflex and small tilde seen in multi-layer mojibake. Other pairs (e.g. inside UTF-8 mis-read as CP850) decode by coincidence.
const plausibleTwoByte = (ch) => {
  const cp = ch.codePointAt(0);
  return cp <= 0x017f || cp === 0x0192 || cp === 0x02c6 || cp === 0x02dc;
};

const sequenceLength =(lead) => (lead >= 0xc2 && lead <= 0xdf ? 2 : lead >= 0xe0 && lead <= 0xef ? 3 : lead >= 0xf0 && lead <= 0xf4 ? 4 : 0);

// A Windows-1252 letter for a UTF-8 lead byte followed by letters for continuation bytes.
const CANDIDATE_RE = /[\u00C2-\u00F4][\u0080-\u00BF\u0152\u0153\u0160\u0161\u0178\u017D\u017E\u0192\u02C6\u02DC\u2013\u2014\u2018-\u2022\u2026\u2030\u2039\u203A\u20AC\u2122]/;

/** True when the text holds the gate's mojibake markers or any sequence that decodes as double-encoded UTF-8. */
export const hasMojibake = (text) => MOJIBAKE_RE.test(text) || (CANDIDATE_RE.test(text) && fixPass(text).fixes.length > 0);

/** One repair pass. Returns the new text and the fixes, each with its position in the new text. */
function fixPass(text) {
  let out = '';
  const fixes = [];
  for (let i = 0; i < text.length; ) {
    const lead = CHAR_TO_BYTE.get(text[i]);
    const n = lead === undefined ? 0 : sequenceLength(lead);
    if (n && i + n <= text.length) {
      const bytes = [lead];
      for (let k = 1; k < n; k++) {
        const b = CHAR_TO_BYTE.get(text[i + k]);
        if (b === undefined || b < 0x80 || b > 0xbf) break;
        bytes.push(b);
      }
      if (bytes.length === n) {
        let decoded = null;
        try { decoded = strictUtf8.decode(Uint8Array.from(bytes)); } catch { /* not a valid sequence */ }
        if (decoded && (n > 2 || plausibleTwoByte(decoded))) {
          fixes.push({ at: out.length, from: text.slice(i, i + n), to: decoded });
          out += decoded;
          i += n;
          continue;
        }
      }
    }
    out += text[i];
    i += 1;
  }
  return { text: out, fixes };
}

/** Repairs mojibake, repeating passes for text that was mis-encoded more than once. */
export function fixText(text) {
  const passes = [];
  let current = text;
  for (let p = 0; p < 6; p++) {
    const result = fixPass(current);
    if (!result.fixes.length) break;
    passes.push(result.fixes);
    current = result.text;
  }
  return { text: current, passes, fixes: passes.flat() };
}

/** Rebuilds the original text from a fixText result by re-breaking only the repaired segments. */
export function reverseFixes({ text, passes }) {
  let current = text;
  for (let p = passes.length - 1; p >= 0; p--) {
    let rebuilt = '';
    let cursor = 0;
    for (const { at, to } of passes[p]) {
      if (current.slice(at, at + to.length) !== to) throw new Error(`round-trip mismatch at ${at}`);
      rebuilt += current.slice(cursor, at) + breakBytes(to);
      cursor = at + to.length;
    }
    current = rebuilt + current.slice(cursor);
  }
  return current;
}

function* walk(target) {
  const stat = fs.statSync(target);
  if (stat.isFile()) { yield target; return; }
  for (const entry of fs.readdirSync(target, { withFileTypes: true })) {
    if (entry.isDirectory() && SKIP_DIRS.has(entry.name)) continue;
    const p = path.join(target, entry.name);
    if (entry.isDirectory()) yield* walk(p);
    else if (TEXT_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) yield p;
  }
}

function inspect(file) {
  const bytes = fs.readFileSync(file);
  try {
    const text = strictUtf8.decode(bytes);
    return { file, bytes, text, invalid: false, mojibake: hasMojibake(text) };
  } catch {
    return { file, text: null, invalid: true, mojibake: false };
  }
}

function main(argv) {
  const mode = argv.includes('--write') ? 'write' : 'check';
  const targets = argv.filter((a) => !a.startsWith('--'));
  const roots = (targets.length ? targets : ['src']).map((t) => path.resolve(ROOT, t));
  const rel = (f) => path.relative(ROOT, f) || f;
  const problems = [];
  const summary = new Map();
  let fixedFiles = 0;
  let fixedSequences = 0;

  for (const root of roots) {
    for (const file of walk(root)) {
      const info = inspect(file);
      if (info.invalid) { problems.push(`${rel(file)}: not valid UTF-8`); continue; }
      if (!info.mojibake) continue;
      if (mode === 'check') { problems.push(`${rel(file)}: contains mojibake`); continue; }

      const result = fixText(info.text);
      let restored = null;
      try { restored = Buffer.from(reverseFixes(result), 'utf8'); } catch { /* reported below */ }
      if (!restored || !restored.equals(info.bytes)) { problems.push(`${rel(file)}: round-trip FAILED, file left unchanged`); continue; }
      fs.writeFileSync(file, Buffer.from(result.text, 'utf8'));
      fixedFiles += 1;
      fixedSequences += result.fixes.length;
      const finalFixes = result.passes.length ? result.passes[result.passes.length - 1] : [];
      for (const { to } of finalFixes) summary.set(to, (summary.get(to) || 0) + 1);
      const left = hasMojibake(result.text);
      console.log(`fixed ${rel(file)}: ${result.fixes.length} sequence(s) in ${result.passes.length} pass(es), round-trip OK${left ? ', RESIDUAL mojibake' : ''}`);
      if (left) problems.push(`${rel(file)}: residual mojibake needs manual review`);
    }
  }

  if (mode === 'write') {
    console.log(`\nRound-trip report: ${fixedFiles} file(s) repaired, ${fixedSequences} sequence(s); each repaired file was written only after `
      + 'reversing its fixes reproduced the original file bytes exactly (BOM and line endings included).');
    const top = [...summary.entries()].sort((a, b) => b[1] - a[1]);
    if (top.length) console.log(`Characters restored: ${top.map(([c, n]) => `${JSON.stringify(c)}x${n}`).join(' ')}`);
  }
  for (const p of problems) console.log(p);
  console.log(`${problems.length} file(s) with encoding problems`);
  return problems.length ? 1 : 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exit(main(process.argv.slice(2)));
}
