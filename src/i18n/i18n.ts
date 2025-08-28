import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { loadModularTranslations } from './modularLoader';

// Track initialization state
export let i18nReady = false;
export let initializationPromise: Promise<void> | null = null;

// Create the i18next instance with react-i18next
const i18n = i18next.createInstance();

// Initialize i18next
const initializeI18n = async (): Promise<void> => {
  // Prevent multiple initializations
  if (i18nReady) {
    console.log('i18n: Already initialized, skipping...');
    return;
  }
  
  // Return existing promise if initialization is in progress
  if (initializationPromise) {
    console.log('i18n: Initialization in progress, waiting...');
    return initializationPromise;
  }
  
  // Create and store the initialization promise
  initializationPromise = (async () => {
    try {
      console.log('i18n: Starting initialization...');
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
      try {
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
        console.log('i18n: Fallback initialization successful');
        i18nReady = true;
      } catch (fallbackError) {
        console.error('i18n: Fallback initialization also failed:', fallbackError);
        i18nReady = true; // Set to true to prevent infinite loops
        throw fallbackError;
      }
    } finally {
      initializationPromise = null;
    }
  })();
  
  return initializationPromise;
};

// Export the initialization function for manual control
export { initializeI18n };
export default i18n;