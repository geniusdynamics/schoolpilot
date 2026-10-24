// ABOUTME: Pseudo-locale generation: accents every English string, expands it and marks both ends.
// ABOUTME: Untranslated text stays plain ASCII, and 30% extra width makes over-long labels visible.

import type { TranslationTree } from './catalogue';
import { cloneTree } from './catalogue';

export const PSEUDO_LOCALE = 'pseudo';

/** How much wider the pseudo string is than its source, as a fraction of the letter count. */
export const PSEUDO_EXPANSION = 0.3;

const OPEN_MARKER = '«';
const CLOSE_MARKER = '»';
const FILLER = '·';

const ACCENTS: Record<string, string> = {
  a: 'á',
  b: 'ƀ',
  c: 'ç',
  d: 'ð',
  e: 'é',
  f: 'ƒ',
  g: 'ĝ',
  h: 'ĥ',
  i: 'í',
  j: 'ĵ',
  k: 'ķ',
  l: 'ĺ',
  m: 'ɱ',
  n: 'ñ',
  o: 'ó',
  p: 'þ',
  q: 'q',
  r: 'ŕ',
  s: 'š',
  t: 'ţ',
  u: 'ú',
  v: 'v',
  w: 'ŵ',
  x: 'ẋ',
  y: 'ý',
  z: 'ž',
  A: 'Á',
  B: 'Ɓ',
  C: 'Ç',
  D: 'Ð',
  E: 'É',
  F: 'Ƒ',
  G: 'Ĝ',
  H: 'Ĥ',
  I: 'Í',
  J: 'Ĵ',
  K: 'Ķ',
  L: 'Ĺ',
  M: 'Ṁ',
  N: 'Ñ',
  O: 'Ó',
  P: 'Þ',
  Q: 'Q',
  R: 'Ŕ',
  S: 'Š',
  T: 'Ţ',
  U: 'Ú',
  V: 'V',
  W: 'Ŵ',
  X: 'Ẋ',
  Y: 'Ý',
  Z: 'Ž',
};

/**
 * Tokens that must survive the transform untouched: i18next interpolations,
 * ICU-style single-brace placeholders, JSX tags and printf verbs.
 */
const PROTECTED = /\{\{[^{}]*\}\}|\{[^{}]*\}|<\/?[^<>]{0,80}>|%[sdif]/g;

const LETTERS = /[A-Za-z]/;

/** A string is pseudo-translatable when it has a letter outside its placeholders. */
export function isPseudoTranslatable(value: string): boolean {
  return LETTERS.test(value.replace(PROTECTED, ''));
}

export function pseudoTranslate(value: string, expansion = PSEUDO_EXPANSION): string {
  if (!isPseudoTranslatable(value)) return value;

  const parts = value.split(PROTECTED);
  const protectedTokens = value.match(PROTECTED) ?? [];

  let accented = '';
  let letterCount = 0;
  parts.forEach((part, index) => {
    for (const character of part) {
      const replacement = ACCENTS[character];
      accented += replacement ?? character;
      if (replacement) letterCount += 1;
    }
    if (index < protectedTokens.length) accented += protectedTokens[index];
  });

  const filler = FILLER.repeat(Math.round(letterCount * expansion));
  return `${OPEN_MARKER}${accented}${filler}${CLOSE_MARKER}`;
}

export function pseudoTranslateTree(tree: TranslationTree): TranslationTree {
  const out = cloneTree(tree);
  const walk = (node: TranslationTree): void => {
    for (const [key, value] of Object.entries(node)) {
      if (typeof value === 'string') {
        node[key] = pseudoTranslate(value);
      } else if (typeof value === 'object' && value !== null) {
        walk(value);
      }
    }
  };
  walk(out);
  return out;
}

/** Every namespace of a catalogue, pseudo-translated. */
export function pseudoTranslateCatalogue(
  catalogue: Record<string, TranslationTree>
): Record<string, TranslationTree> {
  const out: Record<string, TranslationTree> = {};
  for (const [namespace, tree] of Object.entries(catalogue)) {
    out[namespace] = pseudoTranslateTree(tree);
  }
  return out;
}
