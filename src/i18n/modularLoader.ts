// ABOUTME: This file is responsible for loading modular translation resources.
// ABOUTME: It dynamically loads translations from each module's i18n directory.

import i18next from 'i18next';

// Use Vite's import.meta.glob to dynamically import translation files
const modules = import.meta.glob('../modules/*/i18n/*.json');
const coreModules = import.meta.glob('../modules/core/i18n/**/*.json');

export const loadModularTranslations = async () => {
  const resources: any = {
    en: { translation: {} },
    fr: { translation: {} },
    es: { translation: {} },
    de: { translation: {} },
    it: { translation: {} },
    pt: { translation: {} },
    nl: { translation: {} },
    sw: { translation: {} },
    rw: { translation: {} }
  };

  const languages = ['en', 'fr', 'es', 'de', 'it', 'pt', 'nl', 'sw', 'rw'];

  for (const lang of languages) {
    // Initialize namespaces for each language
    resources[lang] = {
      navigation: {} // Initialize unified navigation namespace
    };

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
        
        // Extract navigation translations and merge into unified navigation namespace
        if (moduleData.navigation) {
          Object.assign(resources[lang].navigation, moduleData.navigation);
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
          Object.assign(resources[lang].navigation, moduleData.navigation);
        }
      }
    }
  }

  console.log("i18n: Modular resources constructed:", resources);
  return resources;
};