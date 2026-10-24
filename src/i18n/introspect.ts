// ABOUTME: Static analysis of translation usage: which keys the code asks for, and which it never asks for.
// ABOUTME: Pure string work, so the extraction report can be unit-tested without touching the file system.

import { flattenTree, getAtPath, type Catalogue, type FlatEntry } from './catalogue';
import { DEFAULT_NAMESPACE, isKnownNamespace } from './namespaces';

export type UsageForm = 't' | 'i18nKey' | 'info';

export interface KeyUsage {
  readonly key: string;
  readonly namespace: string;
  readonly file: string;
  readonly line: number;
  readonly form: UsageForm;
  /** English text the call carries inline, e.g. `t('a.b', 'Fallback')`. */
  readonly defaultValue?: string;
}

export interface DynamicUsage {
  readonly expression: string;
  readonly file: string;
  readonly line: number;
}

export interface Extraction {
  readonly usages: KeyUsage[];
  readonly dynamic: DynamicUsage[];
  /** Namespaces named by the file's `useTranslation(...)` call, in order. */
  readonly defaultNamespaces: string[];
}

const KEY_SHAPE = /^[A-Za-z0-9_][A-Za-z0-9_.-]*$/;

const USE_TRANSLATION = /useTranslation\s*\(\s*(\[[^\]]*\]|'[^']*'|"[^"]*")/;
const T_CALL = /(?<![\w$])t\s*\(\s*(?:'([^']*)'|"([^"]*)"|`([^`]*)`)/g;
const I18N_KEY = /i18nKey\s*=\s*(?:"([^"]+)"|'([^']+)'|\{\s*[`'"]([^`'"]+)[`'"]\s*\})/g;
const QUOTED = /'([^']*)'|"([^"]*)"/g;
const INLINE_DEFAULT =
  /^\s*,\s*(?:'([^']{0,800})'|"([^"]{0,800})"|\{[^{}]{0,200}defaultValue\s*:\s*(?:'([^']{0,800})'|"([^"]{0,800})"))/;

/**
 * Replace comments with spaces, keeping every offset and newline.
 *
 * Commented-out `t('...')` calls and JSDoc examples are not translations the
 * app asks for; leaving them in inflates both the missing and the unused list.
 */
export function maskComments(source: string): string {
  const out = source.split('');
  const mask = (from: number, to: number): void => {
    for (let i = from; i < to; i += 1) if (out[i] !== '\n' && out[i] !== '\r') out[i] = ' ';
  };

  let i = 0;
  while (i < source.length) {
    const character = source[i];

    if (character === "'" || character === '"' || character === '`') {
      const quote = character;
      let j = i + 1;
      while (j < source.length) {
        if (source[j] === '\\') {
          j += 2;
          continue;
        }
        if (source[j] === quote) break;
        if (quote !== '`' && source[j] === '\n') break;
        j += 1;
      }
      i = j + 1;
      continue;
    }

    if (character === '/' && source[i + 1] === '/') {
      let j = i;
      while (j < source.length && source[j] !== '\n') j += 1;
      mask(i, j);
      i = j;
      continue;
    }

    if (character === '/' && source[i + 1] === '*') {
      const end = source.indexOf('*/', i + 2);
      const stop = end === -1 ? source.length : end + 2;
      mask(i, stop);
      i = stop;
      continue;
    }

    i += 1;
  }

  return out.join('');
}

function lineLookup(source: string): (index: number) => number {
  const starts = [0];
  for (let i = 0; i < source.length; i += 1) if (source[i] === '\n') starts.push(i + 1);
  return (index: number) => {
    let low = 0;
    let high = starts.length - 1;
    while (low < high) {
      const mid = (low + high + 1) >> 1;
      if (starts[mid] <= index) low = mid;
      else high = mid - 1;
    }
    return low + 1;
  };
}

/** Namespaces a source file scopes itself to, falling back to the default namespace. */
export function namespacesForFile(source: string): string[] {
  const call = USE_TRANSLATION.exec(source);
  if (!call) return [DEFAULT_NAMESPACE];

  const names: string[] = [];
  QUOTED.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = QUOTED.exec(call[1])) !== null) {
    const name = match[1] ?? match[2];
    if (name) names.push(name);
  }
  return names.length > 0 ? names : [DEFAULT_NAMESPACE];
}

function splitNamespacedKey(key: string, fallback: string): { namespace: string; key: string } {
  const separator = key.indexOf(':');
  if (separator > 0) {
    const candidate = key.slice(0, separator);
    if (isKnownNamespace(candidate)) {
      return { namespace: candidate, key: key.slice(separator + 1) };
    }
  }
  return { namespace: fallback, key };
}

/**
 * Find every translation key a source file asks for.
 *
 * The whole file is scanned, so a call broken across lines is still found. Only
 * literal keys are resolved: a template literal or a variable is reported as
 * dynamic rather than guessed at, so the missing-key list stays trustworthy.
 */
export function extractFromSource(source: string, file: string): Extraction {
  const masked = maskComments(source);
  const namespaces = namespacesForFile(masked);
  const fallback = namespaces[0] ?? DEFAULT_NAMESPACE;
  const lineAt = lineLookup(masked);
  const usages: KeyUsage[] = [];
  const dynamic: DynamicUsage[] = [];

  T_CALL.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = T_CALL.exec(masked)) !== null) {
    const lineNumber = lineAt(match.index);
    const literal = match[1] ?? match[2] ?? match[3] ?? '';
    if (literal.includes('${')) {
      dynamic.push({ expression: match[0].trim(), file, line: lineNumber });
      continue;
    }
    const resolved = splitNamespacedKey(literal, fallback);
    if (!KEY_SHAPE.test(resolved.key)) continue;
    const before = masked.slice(Math.max(0, match.index - 40), match.index);
    const form: UsageForm = /\binfo=\{/.test(before) ? 'info' : 't';
    const after = masked.slice(match.index + match[0].length);
    const inline = INLINE_DEFAULT.exec(after);
    const defaultValue = inline?.[1] ?? inline?.[2] ?? inline?.[3] ?? inline?.[4];
    usages.push({
      ...resolved,
      file,
      line: lineNumber,
      form,
      ...(defaultValue ? { defaultValue } : {}),
    });
  }

  I18N_KEY.lastIndex = 0;
  while ((match = I18N_KEY.exec(masked)) !== null) {
    const literal = match[1] ?? match[2] ?? match[3] ?? '';
    const resolved = splitNamespacedKey(literal, fallback);
    if (!KEY_SHAPE.test(resolved.key)) continue;
    usages.push({
      ...resolved,
      file,
      line: lineAt(match.index),
      form: 'i18nKey',
    });
  }

  return { usages, dynamic, defaultNamespaces: namespaces };
}

/** `managementDescription` → `Management Description`, `data_layer` → `Data Layer`. */
export function humanizeKeySegment(segment: string): string {
  return segment
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .trim()
    .split(/\s+/)
    .map((word) => (word.length === 0 ? word : word[0].toUpperCase() + word.slice(1)))
    .join(' ');
}

/** Generic words that say nothing when a page uses them as its own description. */
export const GENERIC_DESCRIPTION_VALUES: readonly string[] = [
  'Description',
  'List',
  'Management Description',
];

export interface PlaceholderFinding {
  readonly namespace: string;
  readonly key: string;
  readonly value: string;
  readonly reason: string;
}

/**
 * Page descriptions whose whole value is the field's own name.
 *
 * Only values reached through an `info=` page description are reported: the
 * same words are perfectly good as a table column header.
 */
export function collectPlaceholders(
  catalogue: Catalogue,
  lang: string,
  usages: readonly KeyUsage[]
): PlaceholderFinding[] {
  const descriptions = new Set(
    usages.filter((usage) => usage.form === 'info').map((usage) => `${usage.namespace}:${usage.key}`)
  );

  const findings: PlaceholderFinding[] = [];
  for (const [namespace, tree] of Object.entries(catalogue[lang] ?? {})) {
    for (const { key, value } of flattenTree(tree)) {
      if (!descriptions.has(`${namespace}:${key}`)) continue;
      if (!GENERIC_DESCRIPTION_VALUES.includes(value.trim())) continue;
      findings.push({
        namespace,
        key,
        value,
        reason: `page description is only the word "${value}"`,
      });
    }
  }
  return findings.sort((a, b) =>
    `${a.namespace}.${a.key}` < `${b.namespace}.${b.key}` ? -1 : 1
  );
}

export interface MissingKey extends KeyUsage {
  readonly occurrences: number;
}

/** Keys the code asks for that the catalogue cannot answer. */
export function missingKeys(
  catalogue: Catalogue,
  lang: string,
  usages: readonly KeyUsage[]
): MissingKey[] {
  const grouped = new Map<string, MissingKey>();
  for (const usage of usages) {
    const tree = catalogue[lang]?.[usage.namespace];
    if (tree && getAtPath(tree, usage.key) !== undefined) continue;
    const id = `${usage.namespace}:${usage.key}`;
    const existing = grouped.get(id);
    if (existing) {
      grouped.set(id, {
        ...existing,
        // Keep an inline default if any occurrence carries one: the report and
        // the backfill both need the English the code already has.
        ...(existing.defaultValue ? {} : usage.defaultValue ? { defaultValue: usage.defaultValue } : {}),
        occurrences: existing.occurrences + 1,
      });
    } else {
      grouped.set(id, { ...usage, occurrences: 1 });
    }
  }
  return [...grouped.values()].sort((a, b) =>
    `${a.namespace}:${a.key}` < `${b.namespace}:${b.key}` ? -1 : 1
  );
}

export interface UnusedKey extends FlatEntry {
  readonly namespace: string;
}

/** Catalogue entries no code reference resolves to. */
export function unusedKeys(
  catalogue: Catalogue,
  lang: string,
  usages: readonly KeyUsage[]
): UnusedKey[] {
  const referenced = new Set(usages.map((usage) => `${usage.namespace}:${usage.key}`));
  const unused: UnusedKey[] = [];
  for (const [namespace, tree] of Object.entries(catalogue[lang] ?? {})) {
    for (const entry of flattenTree(tree)) {
      if (!referenced.has(`${namespace}:${entry.key}`)) unused.push({ namespace, ...entry });
    }
  }
  return unused;
}
