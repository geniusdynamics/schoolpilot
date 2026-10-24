import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { loadModularTranslations } from './modularLoader';
import { logger } from '@/utils/logging';
import { applyLocaleDirection } from '@/utils/locale';


// Track initialization state
export let i18nReady = false;
export let initializationPromise: Promise<void> | null = null;

// Create the i18next instance with react-i18next
const i18n = i18next.createInstance();

// Publish the language's reading direction on <html> whenever it changes, so logical CSS
// (ms-/me-/ps-/pe-/start-/end-) mirrors the layout and `activeLocale()` follows the choice.
i18n.on('languageChanged', (language: string) => applyLocaleDirection(language));

// Initialize i18next
const initializeI18n = async (): Promise<void> => {
  // Prevent multiple initializations
  if (i18nReady) {
    logger.info('i18n: Already initialized, skipping...');
    return;
  }
  
  // Return existing promise if initialization is in progress
  if (initializationPromise) {
    logger.info('i18n: Initialization in progress, waiting...');
    return initializationPromise;
  }
  
  // Create and store the initialization promise
  initializationPromise = (async () => {
    try {
      logger.info('i18n: Starting initialization...');
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
            'nutrition',
            'portal',
            'reports',
            'settings',
            'todos',
            'assignments',
            'houses',
            'pickup',
            'analytics',
            'lessonplans',
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
      
      logger.info('i18n: Successfully initialized');
      i18nReady = true;
    } catch (error) {
      logger.error('i18n: Failed to initialize:', error);
      // Fallback to basic initialization
      try {
        await i18n
          .use(LanguageDetector)
          .use(initReactI18next)
          .init({
            fallbackLng: 'en',
            debug: process.env.NODE_ENV === 'development',
            defaultNS: 'common',
            ns: ['common', 'navigation'],
            resources: {
              en: {
                common: { title: 'SchoolPilot' },
                navigation: { home: 'Home' }
              },
              fr: {
                common: { title: 'SchoolPilot' },
                navigation: { home: 'Accueil' }
              }
            },
            interpolation: { escapeValue: false },
            react: { useSuspense: true },
          });
        logger.info('i18n: Fallback initialization successful');
        i18nReady = true;
      } catch (fallbackError) {
        logger.error('i18n: Fallback initialization also failed:', fallbackError);
        i18nReady = true; // Set to true to prevent infinite loops
        throw fallbackError;
      }
    } finally {
      applyLocaleDirection(i18n.language);
      initializationPromise = null;
    }
  })();
  
  return initializationPromise;
};

// Export the initialization function for manual control
export { initializeI18n };
export default i18n;