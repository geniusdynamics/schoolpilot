// ABOUTME: Direction handling for the print surface: locale direction, detection of Latin/digit-only
// ABOUTME: runs, and the U+2066…U+2069 isolation that stops an RTL paragraph reordering a date or URL.

const RTL_RANGES: readonly (readonly [number, number])[] = [
  [0x0590, 0x05ff], // Hebrew
  [0x0600, 0x06ff], // Arabic
  [0x0700, 0x074f], // Syriac
  [0x0750, 0x077f], // Arabic Supplement
  [0x0780, 0x07bf], // Thaana
  [0x07c0, 0x07ff], // NKo
  [0x0800, 0x083f], // Samaritan
  [0x08a0, 0x08ff], // Arabic Extended-A
  [0xfb1d, 0xfb4f], // Hebrew presentation forms
  [0xfb50, 0xfdff], // Arabic presentation forms A
  [0xfe70, 0xfeff], // Arabic presentation forms B
  [0x10800, 0x10fff], // Cypriot, Phoenician, Kharoshthi and other RTL historic scripts
  [0x1e800, 0x1efff], // Adlam, Arabic mathematical forms
];

const LTR_LETTER = /[A-Za-z\u00c0-\u024f\u1e00-\u1eff]/;
const DIGIT = /[0-9\u0660-\u0669\u06f0-\u06f9]/;

/** True for a code point in an RTL script. */
export function isRtlCodePoint(code: number): boolean {
  return RTL_RANGES.some(([start, end]) => code >= start && code <= end);
}

export function hasRtlText(text: string): boolean {
  for (const char of text) {
    if (isRtlCodePoint(char.codePointAt(0) ?? 0)) return true;
  }
  return false;
}

/** True when the whole string is a Latin/digit run that an RTL paragraph would reorder. */
export function isLtrRun(text: string): boolean {
  if (text.trim() === '' || hasRtlText(text)) return false;
  return LTR_LETTER.test(text) || DIGIT.test(text);
}

/** Wraps a Latin/digit-only run in a first-strong isolate. Anything else is returned unchanged. */
export function isolateLtr(text: string): string {
  return isLtrRun(text) ? `\u2066${text}\u2069` : text;
}

type CharClass = 'rtl' | 'ltr' | 'neutral';

function classify(char: string): CharClass {
  const code = char.codePointAt(0) ?? 0;
  if (isRtlCodePoint(code)) return 'rtl';
  if (LTR_LETTER.test(char) || DIGIT.test(char)) return 'ltr';
  return 'neutral';
}

/**
 * Isolates every Latin/digit run inside a mixed string, leaving the RTL runs alone.
 *
 * A pure RTL string is returned unchanged, and so is a pure LTR string (the caller isolates that as
 * a whole with `dir="ltr"`). This is the function a teacher's comment or a school address needs.
 */
export function isolateRuns(text: string): string {
  if (!hasRtlText(text)) return text;
  const runs: { cls: CharClass; text: string }[] = [];
  /** The neutral gap that preceded each run; gaps stay outside the isolate so spaces are not moved. */
  const gaps: string[] = [];
  let pending = '';
  for (const char of text) {
    const cls = classify(char);
    if (cls === 'neutral') {
      pending += char;
      continue;
    }
    if (runs.length === 0) gaps.push(pending);
    else if (runs[runs.length - 1].cls === cls) {
      // Same class: the gap belongs inside the run it separates.
      runs[runs.length - 1].text += pending;
    } else gaps.push(pending);
    if (runs.length === 0 || runs[runs.length - 1].cls !== cls) runs.push({ cls, text: char });
    else runs[runs.length - 1].text += char;
    pending = '';
  }
  let result = gaps[0] ?? '';
  for (let i = 0; i < runs.length; i += 1) {
    const run = runs[i];
    if (i > 0) result += gaps[i] ?? '';
    result += run.cls === 'ltr' ? `\u2066${run.text}\u2069` : run.text;
  }
  return result + pending;
}

/** The document direction a pack locale implies. */
export function directionOf(locale: string): 'ltr' | 'rtl' {
  const base = locale.toLowerCase().split(/[-_]/)[0];
  return ['ar', 'arc', 'ckb', 'dv', 'fa', 'he', 'iw', 'ks', 'ku', 'ps', 'sd', 'ug', 'ur', 'yi'].includes(base)
    ? 'rtl'
    : 'ltr';
}
