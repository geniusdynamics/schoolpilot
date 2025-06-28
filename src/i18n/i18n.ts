// ABOUTME: This file configures and initializes the i18next internationalization library.
// ABOUTME: It sets up language detection, namespaces, and translation resources.

import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { loadTranslations } from './loader'; // Import the loader

i18next
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    debug: process.env.NODE_ENV === 'development', // Enable debug logs in development
    fallbackLng: 'en', // Fallback language if detected language is not available
    supportedLngs: ['en', 'fr'], // Explicitly list supported languages
    
    defaultNS: 'common', 
    ns: ['common', 'navigation', 'dashboard', 'reports', 'settings', 
         'academics', 'administration', 'finance', 'hr', 'inventory', 'library',
         'nutrition' 
        // Add other namespaces as they are created for modules like:
        // 'studentDetails'
    ],

    interpolation: {
      escapeValue: false, // React already safes from xss
    },

    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      lookupLocalStorage: 'i18nextLng',
      caches: ['localStorage'],
    },
  });

// Load translations using the centralized loader
loadTranslations(i18next);

export default i18next;