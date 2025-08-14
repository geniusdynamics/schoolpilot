// ABOUTME: This file is responsible for loading modular translation resources.
// ABOUTME: It dynamically loads translations from each module's i18n directory.

import i18next from 'i18next';

// Use Vite's import.meta.glob to dynamically import translation files
const modules = import.meta.glob('../modules/*/i18n/*.json');
const coreModules = import.meta.glob('../modules/core/i18n/**/*.json');

export const loadModularTranslations = async () => {
  const resources: any = {
    en: { translation: {} },
    fr: { translation: {} }
  };

  const languages = ['en', 'fr'];

  for (const lang of languages) {
    // Initialize namespaces for each language
    resources[lang] = {};

    for (const path in modules) {
      const moduleName = path.split('/')[2];
      if (path.includes(`/${lang}.json`)) {
        const module = await (modules[path] as () => Promise<{ default: any }>)();
        if (!resources[lang][moduleName]) {
          resources[lang][moduleName] = {};
        }
        resources[lang][moduleName] = module.default || module;
      }
    }

    for (const path in coreModules) {
      const coreModuleName = path.split('/')[4].replace('.json', '');
      if (path.includes(`/${lang}/`)) {
        const module = await (coreModules[path] as () => Promise<{ default: any }>)();
        if (!resources[lang][coreModuleName]) {
          resources[lang][coreModuleName] = {};
        }
        resources[lang][coreModuleName] = module.default || module;
      }
    }
  }

  console.log("i18n: Modular resources constructed:", resources);
  return resources;
};