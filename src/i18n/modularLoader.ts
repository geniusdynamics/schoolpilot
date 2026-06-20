// ABOUTME: This file is responsible for loading modular translation resources.
// ABOUTME: It dynamically loads translations from each module's i18n directory.

import i18next from 'i18next';

// Use Vite's import.meta.glob to dynamically import translation files
const modules = import.meta.glob('../modules/*/i18n/*.json');
const coreModules = import.meta.glob('../modules/core/i18n/**/*.json');
// Also load static translation files from locales directory
const staticTranslations = import.meta.glob('./locales/**/*.json');

/**
 * Deep-merges `source` into `target`. Unlike `Object.assign`, this recurses
 * into plain-object children so that partial overlaps don't wipe out
 * sibling keys.
 *
 * Semantics:
 *  - If both `target[k]` and `source[k]` are plain objects, recurse.
 *  - Otherwise, `source[k]` (the later value) wins.
 *  - Arrays and primitives are replaced wholesale â€” we never try to
 *    "merge" an array, because doing so silently drops items.
 *  - The function is type-safe and side-effect free: it mutates and
 *    returns `target`.
 *
 * Why this matters: the previous implementation used `Object.assign` to
 * fold each module's `navigation` object into a unified namespace. That
 * shallow merge meant that any module whose `navigation.<section>` object
 * was incomplete (e.g. `academics` in `src/modules/academics/i18n/<lang>.json`
 * missing `allocations`, `assignments`, `lessonPlans`) would silently
 * overwrite the richer version coming from `src/i18n/locales/<lang>/navigation.json`,
 * producing raw key paths at runtime (e.g. `navigation:academics.allocations`
 * showing up verbatim in the sidebar instead of the translated label).
 */
function deepMerge(target: any, source: any): any {
  if (target === null || target === undefined) return source;
  if (source === null || source === undefined) return target;
  if (typeof target !== 'object' || typeof source !== 'object') {
    return source;
  }
  if (Array.isArray(target) || Array.isArray(source)) {
    return source;
  }

  for (const key of Object.keys(source)) {
    const targetValue = target[key];
    const sourceValue = source[key];
    const targetIsObject =
      targetValue !== null &&
      typeof targetValue === 'object' &&
      !Array.isArray(targetValue);
    const sourceIsObject =
      sourceValue !== null &&
      typeof sourceValue === 'object' &&
      !Array.isArray(sourceValue);

    if (targetIsObject && sourceIsObject) {
      deepMerge(targetValue, sourceValue);
    } else if (sourceValue !== undefined) {
      target[key] = sourceValue;
    }
  }

  return target;
}

export const loadModularTranslations = async () => {
  const resources: any = {
    en: { translation: {} },
    fr: { translation: {} },
    sw: { translation: {} },
    rw: { translation: {}
  }
  };

  const languages = ['en', 'fr', 'sw', 'rw'];

  for (const lang of languages) {
    // Initialize namespaces for each language
    resources[lang] = {
      navigation: {} // Initialize unified navigation namespace
    };

    // First, load static translations from locales directory
    for (const path in staticTranslations) {
      // Path format: ./locales/{lang}/{namespace}.json
      const pathParts = path.split('/');
      if (pathParts.length >= 4) {
        const fileLang = pathParts[2]; // e.g., 'en'
        const namespace = pathParts[3].replace('.json', ''); // e.g., 'navigation'

        if (fileLang === lang) {
          const module = await (staticTranslations[path] as () => Promise<{ default: any }>)();
          const moduleData = module.default || module;

          // Initialize namespace if needed
          if (!resources[lang][namespace]) {
            resources[lang][namespace] = {};
          }

          // Deep-merge static translations so partially-overlapping
          // structures don't clobber each other.
          deepMerge(resources[lang][namespace], moduleData);
        }
      }
    }

    for (const path in modules) {
      const moduleName = path.split('/')[2];
      if (path.includes(`/${lang}.json`)) {
        const module = await (modules[path] as () => Promise<{ default: any }>)();
        const moduleData = module.default || module;

        // Create module-specific namespace
        if (!resources[lang][moduleName]) {
          resources[lang][moduleName] = {};
        }
        resources[lang][moduleName] = moduleData;

        // Extract navigation translations and merge into unified navigation namespace.
        // Deep-merge is critical here: a module's `navigation.<section>` is
        // commonly a strict subset of the static `src/i18n/locales/*/navigation.json`
        // entry. A shallow merge would wipe out keys that exist only in the
        // static file (e.g. `academics.allocations` is in the static file but
        // not in the academics module's i18n).
        if (moduleData.navigation) {
          deepMerge(resources[lang].navigation, moduleData.navigation);
        }
      }
    }

    for (const path in coreModules) {
      const coreModuleName = path.split('/')[4].replace('.json', '');
      if (path.includes(`/${lang}/`)) {
        const module = await (coreModules[path] as () => Promise<{ default: any }>)();
        const moduleData = module.default || module;

        // Create core module-specific namespace
        if (!resources[lang][coreModuleName]) {
          resources[lang][coreModuleName] = {};
        }
        resources[lang][coreModuleName] = moduleData;

        // Extract navigation translations and merge into unified navigation namespace
        if (moduleData.navigation) {
          deepMerge(resources[lang].navigation, moduleData.navigation);
        }
      }
    }
  }

  console.log("i18n: Modular resources constructed:", resources);
  return resources;
};
