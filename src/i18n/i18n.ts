import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { loadModularTranslations } from './modularLoader';

// Track initialization state
export let i18nReady = false;

// Create the i18next instance with react-i18next
const i18n = i18next.createInstance();

// Initialize i18next
const initializeI18n = async () => {
  try {
    const resources = await loadModularTranslations();
    
    await i18n
      .use(LanguageDetector)
      .use(initReactI18next)
      .init({
        resources,
        fallbackLng: 'en',
        debug: process.env.NODE_ENV === 'development',
        defaultNS: 'common',
        returnNull: false, // Ensure empty strings instead of null
        ns: [
          'common',
          'navigation',
          'dashboard',
          'academics',
          'administration',
          'finance',
          'hr',
          'inventory',
          'library',
          'settings',
          'student',
          'teacher'
        ],
        interpolation: {
          escapeValue: false,
        },
        react: {
          useSuspense: true,
          bindI18n: 'languageChanged loaded',
          bindI18nStore: 'added removed',
          nsMode: 'default',
        },
        detection: {
          order: ['localStorage', 'navigator', 'htmlTag'],
          caches: ['localStorage'],
        },
      });
    
    console.log('i18n: Successfully initialized');
    i18nReady = true;
  } catch (error) {
    console.error('i18n: Failed to initialize:', error);
    // Fallback to basic initialization
    await i18n
      .use(LanguageDetector)
      .use(initReactI18next)
      .init({
        fallbackLng: 'en',
        debug: process.env.NODE_ENV === 'development',
        defaultNS: 'common',
        ns: ['common', 'navigation', 'settings'],
        resources: {
          en: {
            common: { title: 'SchoolPilot' },
            navigation: { home: 'Home' },
            settings: { title: 'Settings' }
          },
          fr: {
            common: { title: 'SchoolPilot' },
            navigation: { home: 'Accueil' },
            settings: { title: 'Paramètres' }
          }
        },
        interpolation: { escapeValue: false },
        react: { useSuspense: true },
      });
    i18nReady = true;
  }
};

// Initialize immediately
initializeI18n();

export default i18n;