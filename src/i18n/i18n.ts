// ABOUTME: This file initializes the i18next library for internationalization.
// ABOUTME: It configures language detection, loads translations, and sets up React integration.

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { loadModularTranslations } from './modularLoader';

// Asynchronous initialization
(async () => {
  try {
    const modularResources = await loadModularTranslations();

    await i18n
      .use(LanguageDetector)
      .use(initReactI18next)
      .init({
        debug: true,
        fallbackLng: 'en',
        interpolation: {
          escapeValue: false, // not needed for react as it escapes by default
        },
        resources: modularResources,
        // Default namespace
        defaultNS: 'common',
        // Namespaces to load initially
        ns: ['common', 'navigation', 'dashboard', 'academics', 'administration', 'finance', 'hr', 'inventory', 'library', 'settings', 'student', 'teacher'],
      });

    console.log("i18next initialized successfully.");

  } catch (error) {
    console.error("i18next initialization failed:", error);
  }
})();

export default i18n;