// ABOUTME: Loads translation resources for every locale from the per-namespace files on disk.
// ABOUTME: Sources are globbed here, then merged by the pure catalogue builder the CI scripts also use.

import { logger } from '@/utils/logging';
import { buildCatalogue, type TranslationSource, type TranslationTree } from './catalogue';
import { PSEUDO_LOCALE, pseudoTranslateCatalogue } from './pseudo';
import { FALLBACK_LOCALE, NAMESPACE_NAMES, SUPPORTED_LOCALES } from './namespaces';

// One file per locale and namespace: src/i18n/locales/<locale>/<namespace>.json.
// A module's strings live in the namespace it owns, never in a second file under
// src/modules/<module>/i18n — `scripts/i18n/consolidate.ts --check` enforces that.
const sharedFiles = import.meta.glob('./locales/*/*.json');

type Loader = () => Promise<{ default?: TranslationTree }>;

const supported = new Set<string>(SUPPORTED_LOCALES);

export const loadModularTranslations = async (): Promise<
  Record<string, Record<string, TranslationTree>>
> => {
  const sources: TranslationSource[] = [];

  for (const path of Object.keys(sharedFiles)) {
    const parts = path.split('/').filter((part) => part.length > 0);
    const lang = parts[parts.length - 2];
    const namespace = parts[parts.length - 1].replace(/\.json$/, '');
    if (!supported.has(lang)) continue;
    const module = (await (sharedFiles[path] as Loader)()) as { default?: TranslationTree };
    sources.push({
      lang,
      namespace,
      scope: 'shared',
      origin: path,
      data: module.default ?? (module as unknown as TranslationTree),
    });
  }

  const catalogue = buildCatalogue(sources);

  // The pseudo-locale is generated from the fallback locale, never shipped as files.
  catalogue[PSEUDO_LOCALE] = pseudoTranslateCatalogue(catalogue[FALLBACK_LOCALE] ?? {});

  logger.info(
    'i18n: resources constructed for',
    Object.keys(catalogue).join(', '),
    '·',
    NAMESPACE_NAMES.length,
    'namespaces'
  );

  return catalogue;
};
