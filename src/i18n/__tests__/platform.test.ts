// ABOUTME: Tests for the translation-platform exchange: the file shape, and that export then import is lossless.
// ABOUTME: The round trip is the acceptance evidence for "sync with a translation platform", not a description.

import { buildCatalogue, canonicalJson, type Catalogue, type TranslationTree } from '../catalogue';
import {
  applyExchange,
  driftedNamespaces,
  EXCHANGE_VERSION,
  fromExchange,
  toExchange,
} from '../platform';

const catalogue: Catalogue = {
  en: {
    common: { save: 'Save', cancel: 'Cancel' },
    academics: { subjects: { title: 'Subjects', code: 'Subject Code' } },
  },
  fr: {
    common: { save: 'Enregistrer' },
    academics: { subjects: { title: 'Matières' } },
  },
};

describe('toExchange', () => {
  it('writes one file per namespace holding the source and the target tree', () => {
    const exchange = toExchange(catalogue, 'en', 'fr');
    expect(Object.keys(exchange.files).sort()).toEqual(['academics', 'common']);
    expect(exchange.files.common.en).toEqual({ save: 'Save', cancel: 'Cancel' });
    expect(exchange.files.common.fr).toEqual({ save: 'Enregistrer' });
  });

  it('exposes the target half exactly as the platform would upload it', () => {
    const exchange = toExchange(catalogue, 'en', 'fr');
    expect(canonicalJson(exchange.files.academics.fr)).toBe(
      canonicalJson(catalogue.fr.academics as TranslationTree)
    );
  });

  it('records the version, the locales and a per-namespace key count and checksum', () => {
    const { manifest } = toExchange(catalogue, 'en', 'fr');
    expect(manifest.version).toBe(EXCHANGE_VERSION);
    expect(manifest.sourceLocale).toBe('en');
    expect(manifest.targetLocale).toBe('fr');
    expect(manifest.namespaces).toEqual([
      { name: 'academics', keys: 2, checksum: expect.stringMatching(/^[0-9a-f]{8}$/) },
      { name: 'common', keys: 2, checksum: expect.stringMatching(/^[0-9a-f]{8}$/) },
    ]);
  });

  it('is deterministic', () => {
    expect(canonicalJson(toExchange(catalogue, 'en', 'fr'))).toBe(
      canonicalJson(toExchange(catalogue, 'en', 'fr'))
    );
  });
});

describe('the round trip', () => {
  it('comes back identical for a partially translated locale', () => {
    const exchange = toExchange(catalogue, 'en', 'fr');
    const imported = buildCatalogue(fromExchange(exchange));
    expect(canonicalJson(imported.fr)).toBe(canonicalJson(catalogue.fr));
  });

  it('comes back identical when the platform fills in a missing key', () => {
    const exchange = toExchange(catalogue, 'en', 'fr');
    exchange.files.academics.fr = { subjects: { title: 'Matières', code: 'Code matière' } };

    const merged = applyExchange(catalogue, exchange);
    expect(merged.fr.academics).toEqual({ subjects: { title: 'Matières', code: 'Code matière' } });
    expect(merged.en.academics).toEqual(catalogue.en.academics);
    expect(canonicalJson(buildCatalogue(fromExchange(exchange)).fr)).toBe(canonicalJson(merged.fr));
  });

  it('does not import a namespace the platform left empty', () => {
    const exchange = toExchange(catalogue, 'en', 'fr');
    exchange.files.academics.fr = {};
    const imported = buildCatalogue(fromExchange(exchange));
    expect(imported.fr.academics).toBeUndefined();
    expect(imported.fr.common).toEqual({ save: 'Enregistrer' });
  });

  it('keeps a namespace the target has no translation for out of the import', () => {
    const exchange = toExchange(
      { en: { common: { save: 'Save' }, todos: { title: 'To dos' } }, fr: { common: { save: 'Enregistrer' } } },
      'en',
      'fr'
    );
    expect(fromExchange(exchange).map((entry) => entry.namespace)).toEqual(['common']);
  });
});

describe('driftedNamespaces', () => {
  it('is empty for a freshly exported exchange', () => {
    expect(driftedNamespaces(toExchange(catalogue, 'en', 'fr'))).toEqual([]);
  });

  it('names the namespace a platform changed', () => {
    const exchange = toExchange(catalogue, 'en', 'fr');
    exchange.files.common.fr = { save: 'Sauvegarder' };
    expect(driftedNamespaces(exchange)).toEqual(['common']);
  });

  it('names a namespace whose file went missing', () => {
    const exchange = toExchange(catalogue, 'en', 'fr');
    delete exchange.files.academics;
    expect(driftedNamespaces(exchange)).toEqual(['academics']);
  });
});

describe('guards', () => {
  it('rejects an exchange whose source and target locale are the same', () => {
    expect(() => fromExchange(toExchange(catalogue, 'en', 'en'))).toThrow(/must differ/);
  });

  it('rejects an exchange from a future version', () => {
    const exchange = toExchange(catalogue, 'en', 'fr');
    expect(() =>
      fromExchange({ ...exchange, manifest: { ...exchange.manifest, version: 99 } })
    ).toThrow(/Unsupported exchange version/);
  });
});
