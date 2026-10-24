// ABOUTME: Pure catalogue primitives: merging namespace sources, flattening keys, canonical JSON and checksums.
// ABOUTME: Deliberately Vite-free so the runtime loader and the Node CI scripts build the catalogue identically.

/** A namespace's strings as they appear on disk: nested objects with string leaves. */
export interface TranslationTree {
  [key: string]: string | TranslationTree;
}

export interface TranslationSource {
  /** Locale code the file holds strings for. */
  readonly lang: string;
  /** Namespace the file contributes to. */
  readonly namespace: string;
  /**
   * `shared` sources are the canonical namespace files under `src/i18n/locales`.
   * `module` sources are a module's own i18n file. `core` sources are the core
   * module's per-namespace files, which are applied last and win over both.
   * Every source's `navigation` subtree is additionally fanned into the
   * navigation namespace, in that same order.
   */
  readonly scope: 'shared' | 'module' | 'core';
  /** Path the source was read from, for reports. */
  readonly origin: string;
  readonly data: TranslationTree;
}

/** `{ locale: { namespace: tree } }`, the shape i18next is initialised with. */
export type Catalogue = Record<string, Record<string, TranslationTree>>;

function isTree(value: unknown): value is TranslationTree {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function cloneTree(tree: TranslationTree): TranslationTree {
  const out: TranslationTree = {};
  for (const [key, value] of Object.entries(tree)) {
    out[key] = isTree(value) ? cloneTree(value) : value;
  }
  return out;
}

/** Deep merge where `overlay` wins. Objects merge key by key; everything else replaces. */
export function mergeTrees(
  base: TranslationTree | undefined,
  overlay: TranslationTree | undefined
): TranslationTree {
  if (!base) return overlay ? cloneTree(overlay) : {};
  if (!overlay) return cloneTree(base);

  const out: TranslationTree = cloneTree(base);
  for (const [key, value] of Object.entries(overlay)) {
    const current = out[key];
    if (isTree(current) && isTree(value)) {
      out[key] = mergeTrees(current, value);
    } else {
      out[key] = isTree(value) ? cloneTree(value) : value;
    }
  }
  return out;
}

/**
 * Build the catalogue the app runs on.
 *
 * Precedence per locale and namespace: canonical namespace file first, then a
 * module's own file, then the core module's file — the same order the app has
 * always loaded them in, so a module can override a shared default and the core
 * module overrides both.
 *
 * A source contributes only to its own namespace. Navigation labels used to be
 * fanned in from every module's `navigation` subtree, which made the result
 * depend on directory order and made an export/import round trip lossy; those
 * labels now live in `navigation.json`, where a translator can see them.
 */
export function buildCatalogue(sources: readonly TranslationSource[]): Catalogue {
  const catalogue: Catalogue = {};

  const apply = (source: TranslationSource): void => {
    const forLocale = (catalogue[source.lang] ??= {});
    forLocale[source.namespace] = mergeTrees(forLocale[source.namespace], source.data);
  };

  for (const scope of ['shared', 'module', 'core'] as const) {
    for (const source of sources) {
      if (source.scope === scope) apply(source);
    }
  }

  return catalogue;
}

export interface FlatEntry {
  readonly key: string;
  readonly value: string;
}

/** Flatten a tree to dotted keys, sorted, string leaves only. */
export function flattenTree(tree: TranslationTree): FlatEntry[] {
  const entries: FlatEntry[] = [];

  const walk = (node: TranslationTree, prefix: string): void => {
    for (const [key, value] of Object.entries(node)) {
      const path = prefix ? `${prefix}.${key}` : key;
      if (isTree(value)) walk(value, path);
      else if (typeof value === 'string') entries.push({ key: path, value });
    }
  };

  walk(tree, '');
  return entries.sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
}

export function countLeaves(tree: TranslationTree): number {
  return flattenTree(tree).length;
}

/** Read a dotted key out of a tree, or `undefined` when any segment is missing. */
export function getAtPath(tree: TranslationTree, key: string): string | undefined {
  let node: string | TranslationTree | undefined = tree;
  for (const segment of key.split('.')) {
    if (!isTree(node)) return undefined;
    node = node[segment];
  }
  return typeof node === 'string' ? node : undefined;
}

/** Deterministic JSON: object keys sorted, so equal trees always serialise identically. */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null';
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
    a < b ? -1 : a > b ? 1 : 0
  );
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonicalJson(v)}`).join(',')}}`;
}

/** FNV-1a, 32 bit, as eight hex digits. Small, dependency-free, stable across platforms. */
export function checksum(value: unknown): string {
  const input = canonicalJson(value);
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

/**
 * Add one dotted key to a tree, creating intermediate objects.
 *
 * Returns `null` when a key segment already holds a string, because turning it
 * into an object would silently drop whatever that string was.
 */
export function withEntry(tree: TranslationTree, key: string, value: string): TranslationTree | null {
  const segments = key.split('.');
  const out = cloneTree(tree);
  let node = out;

  for (const segment of segments.slice(0, -1)) {
    const next = node[segment];
    if (next === undefined) {
      const created: TranslationTree = {};
      node[segment] = created;
      node = created;
    } else if (isTree(next)) {
      node = next;
    } else {
      return null;
    }
  }

  const last = segments[segments.length - 1];
  if (isTree(node[last])) return null;
  node[last] = value;
  return out;
}

export function countByLocale(catalogue: Catalogue): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const [lang, namespaces] of Object.entries(catalogue)) {
    counts[lang] = Object.values(namespaces).reduce((sum, tree) => sum + countLeaves(tree), 0);
  }
  return counts;
}
