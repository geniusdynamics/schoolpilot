// ABOUTME: The registry of country packs the app ships: each packs/country/<cc>/country.json and its
// ABOUTME: English labels are bundled by an eager glob and looked up by ISO 3166-1 alpha-2 code.

import type { CountryPack } from './types';

// The module boundary rule refuses a deep relative import, so the documents are read with Vite's
// eager glob, which also bundles a country pack the moment its directory exists.
const packModules = import.meta.glob('../../../packs/country/*/country.json', {
  eager: true,
  import: 'default',
}) as Record<string, unknown>;
const labelModules = import.meta.glob('../../../packs/country/*/locales/en.json', {
  eager: true,
  import: 'default',
}) as Record<string, { labels: Record<string, string> }>;

interface RegisteredCountry {
  readonly pack: CountryPack;
  readonly labels: Readonly<Record<string, string>>;
}

/** The country directory a glob key belongs to: `.../packs/country/ke/country.json` is `ke`. */
function countryDirectoryOf(key: string): string {
  const match = /\/packs\/country\/([^/]+)\//.exec(key);
  if (!match?.[1]) throw new Error(`the bundled country pack path ${key} has no country directory`);
  return match[1];
}

function buildRegistry(): Readonly<Record<string, RegisteredCountry>> {
  const labelsOf = new Map(
    Object.entries(labelModules).map(([key, document]) => [countryDirectoryOf(key), document.labels])
  );
  const registry: Record<string, RegisteredCountry> = {};
  for (const [key, document] of Object.entries(packModules)) {
    // The documents are validated against packs/country/schema.json by the country pack tests, so
    // each is read as the shape the schema states.
    const pack = document as CountryPack;
    registry[pack.country] = { pack, labels: labelsOf.get(countryDirectoryOf(key)) ?? {} };
  }
  return registry;
}

const REGISTRY = buildRegistry();

function registered(country?: string | null): RegisteredCountry | undefined {
  const code = (country ?? '').trim().toUpperCase();
  return REGISTRY[code];
}

/** The country pack of a country code, or `undefined` when the app ships none. */
export function getCountryPack(country?: string | null): CountryPack | undefined {
  return registered(country)?.pack;
}

/** The English labels of a country pack, keyed by the pack's label keys. */
export function countryLabels(country?: string | null): Readonly<Record<string, string>> {
  return registered(country)?.labels ?? {};
}

/** The country codes the app ships a pack for. */
export const COUNTRY_PACK_CODES: readonly string[] = Object.keys(REGISTRY);
