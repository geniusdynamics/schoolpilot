// ABOUTME: The translation-platform exchange format: one plain JSON file per namespace, per locale.
// ABOUTME: Export and import are exact inverses, so a platform round trip cannot silently drop keys.

import { checksum, countLeaves, mergeTrees, type Catalogue, type TranslationSource, type TranslationTree } from './catalogue';

export const EXCHANGE_VERSION = 1;

export interface ExchangeNamespace {
  /** `{ [locale]: tree }` — the source tree for reference plus the target tree the platform edits. */
  readonly [locale: string]: TranslationTree;
}

export interface ExchangeManifestEntry {
  readonly name: string;
  readonly keys: number;
  readonly checksum: string;
}

export interface ExchangeManifest {
  readonly version: number;
  readonly sourceLocale: string;
  readonly targetLocale: string;
  readonly namespaces: readonly ExchangeManifestEntry[];
}

/**
 * What a platform imports and exports.
 *
 * `files[namespace][targetLocale]` is byte-for-byte the namespace file the app
 * loads, so an upload needs no transformation on either side. `files[namespace][sourceLocale]`
 * travels with it so a translator sees the English reference in the same file.
 */
export interface Exchange {
  readonly manifest: ExchangeManifest;
  readonly files: Record<string, ExchangeNamespace>;
}

function sortedNamespaces(catalogue: Catalogue): string[] {
  const names = new Set<string>();
  for (const namespaces of Object.values(catalogue)) {
    for (const name of Object.keys(namespaces)) names.add(name);
  }
  return [...names].sort();
}

export function toExchange(
  catalogue: Catalogue,
  sourceLocale: string,
  targetLocale: string
): Exchange {
  const files: Record<string, ExchangeNamespace> = {};
  const entries: ExchangeManifestEntry[] = [];

  for (const name of sortedNamespaces(catalogue)) {
    const source = catalogue[sourceLocale]?.[name] ?? {};
    const target = catalogue[targetLocale]?.[name] ?? {};
    const entry: ExchangeNamespace = {};
    entry[sourceLocale] = source;
    entry[targetLocale] = target;
    files[name] = entry;
    entries.push({ name, keys: countLeaves(source), checksum: checksum({ source, target }) });
  }

  return {
    manifest: {
      version: EXCHANGE_VERSION,
      sourceLocale,
      targetLocale,
      namespaces: entries,
    },
    files,
  };
}

/**
 * Read a platform's return trip back into catalogue sources for the target
 * locale. A namespace the platform did not translate is skipped rather than
 * imported as an empty tree, so "not translated yet" stays distinguishable
 * from "translated to nothing".
 */
export function fromExchange(exchange: Exchange): TranslationSource[] {
  const { sourceLocale, targetLocale } = exchange.manifest;
  if (sourceLocale === targetLocale) {
    throw new Error('Exchange source and target locale must differ');
  }
  if (exchange.manifest.version !== EXCHANGE_VERSION) {
    throw new Error(
      `Unsupported exchange version ${exchange.manifest.version}; expected ${EXCHANGE_VERSION}`
    );
  }

  const sources: TranslationSource[] = [];
  for (const name of Object.keys(exchange.files).sort()) {
    const target = exchange.files[name][targetLocale];
    if (target === undefined || countLeaves(target) === 0) continue;
    sources.push({
      lang: targetLocale,
      namespace: name,
      scope: 'shared',
      origin: `exchange:${name}`,
      data: target,
    });
  }
  return sources;
}

/** Merge a platform's return trip over an existing catalogue for the target locale. */
export function applyExchange(catalogue: Catalogue, exchange: Exchange): Catalogue {
  const { targetLocale } = exchange.manifest;
  const merged: Catalogue = { ...catalogue };
  const forLocale: Record<string, TranslationTree> = { ...(catalogue[targetLocale] ?? {}) };
  for (const source of fromExchange(exchange)) {
    forLocale[source.namespace] = mergeTrees(forLocale[source.namespace], source.data);
  }
  merged[targetLocale] = forLocale;
  return merged;
}

/** Namespaces whose target tree drifted from the manifest's recorded checksum. */
export function driftedNamespaces(exchange: Exchange): string[] {
  const drifted: string[] = [];
  for (const entry of exchange.manifest.namespaces) {
    const file = exchange.files[entry.name];
    if (!file) {
      drifted.push(entry.name);
      continue;
    }
    const actual = checksum({
      source: file[exchange.manifest.sourceLocale] ?? {},
      target: file[exchange.manifest.targetLocale] ?? {},
    });
    if (actual !== entry.checksum) drifted.push(entry.name);
  }
  return drifted;
}
