// ABOUTME: This file is responsible for loading modular translation resources.
// ABOUTME: It dynamically loads translations from each module's i18n directory.

import i18next from 'i18next';

// Use Vite's import.meta.glob to dynamically import translation files
const modules = import.meta.glob('../modules/*/i18n/*.json');
const coreModules = import.meta.glob('../modules/core/i18n/**/*.json');
// Also load static translation files from locales directory
const staticTranslations = import.meta.glob('./locales/**/*.json');

export const loadModularTranslations = async () => {
  const resources: any = {
    en: { translation: {} },
    fr: { translation: {} },
    sw: { translation: {} },
    rw: { translation: {} }
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
          
          // Merge static translations
          Object.assign(resources[lang][namespace], moduleData);
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