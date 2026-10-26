// ABOUTME: Pure completeness check of a locale namespace against English: missing, extra, empty, untranslated, placeholders.
// ABOUTME: Shared by the check-locales CI script and the vitest suite so both judge a translation the same way.

import { flattenTree, type TranslationTree } from './catalogue';

/** Locales whose core namespaces must be complete. English is the source and is never listed. */
export const COMPLETE_LOCALES: readonly string[] = ['sw', 'fr'];

export type ProblemKind = 'missing' | 'extra' | 'empty' | 'untranslated' | 'placeholder';

export interface Problem {
  readonly namespace: string;
  readonly key: string;
  readonly kind: ProblemKind;
  readonly detail: string;
}

/** Keys that may legitimately equal the English text, as `namespace:key` -> reason. */
export type Allowlist = Readonly<Record<string, string>>;

const PLACEHOLDER = /\{\{\s*([^,}\s]+)[^}]*\}\}/g;

/** The sorted, de-duplicated names of the `{{name}}` interpolations in a string. */
export function extractPlaceholders(value: string): string[] {
  const names = new Set<string>();
  for (const match of value.matchAll(PLACEHOLDER)) names.add(match[1]);
  return [...names].sort();
}

/** True when a string has no words to translate once interpolations are removed: a number, a unit symbol, punctuation. */
export function isLegitimatelyIdentical(value: string): boolean {
  return !/\p{L}/u.test(value.replace(PLACEHOLDER, ''));
}

function toMap(tree: TranslationTree): Map<string, string> {
  return new Map(flattenTree(tree).map(({ key, value }) => [key, value]));
}

export function checkLocaleNamespace(
  namespace: string,
  english: TranslationTree,
  locale: TranslationTree,
  allowlist: Allowlist
): Problem[] {
  const source = toMap(english);
  const target = toMap(locale);
  const problems: Problem[] = [];
  const report = (key: string, kind: ProblemKind, detail: string): void => {
    problems.push({ namespace, key, kind, detail });
  };

  for (const [key, englishValue] of source) {
    const value = target.get(key);
    if (value === undefined) {
      report(key, 'missing', 'key is absent from the locale');
      continue;
    }
    if (value.trim() === '') {
      report(key, 'empty', 'value is empty');
      continue;
    }

    const expected = extractPlaceholders(englishValue).join(', ');
    const actual = extractPlaceholders(value).join(', ');
    if (expected !== actual) {
      report(key, 'placeholder', `placeholders {${actual}} differ from English {${expected}}`);
      continue;
    }

    if (value === englishValue && !isLegitimatelyIdentical(value) && allowlist[`${namespace}:${key}`] === undefined) {
      report(key, 'untranslated', 'value is identical to English and not on the allowlist');
    }
  }

  for (const key of target.keys()) {
    if (!source.has(key)) report(key, 'extra', 'key does not exist in English');
  }

  return problems;
}
