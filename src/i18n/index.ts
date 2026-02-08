/**
 * i18n Module
 * 
 * Internationalization system for SchoolPilot3.
 * 
 * @example
 * ```tsx
 * // Setup
 * <I18nProvider config={{
 *   defaultLocale: 'en',
 *   supportedLocales: ['en', 'es', 'fr', 'ar'],
 *   fallbackLocale: 'en'
 * }}>
 *   <App />
 * </I18nProvider>
 * 
 * // Usage in components
 * function MyComponent() {
 *   const { t, locale, setLocale, formatDate } = useTranslation();
 *   
 *   return (
 *     <div>
 *       <h1>{t('app.name')}</h1>
 *       <p>{t('welcome.message', { interpolation: { name: user.name } })}</p>
 *       <p>{formatDate(new Date())}</p>
 *       <LanguageSwitcher />
 *     </div>
 *   );
 * }
 * ```
 */

// Types
export type {
  Locale,
  TranslationValue,
  TranslationDict,
  LocaleData,
  I18nConfig,
  FormatOptions,
  TranslateFunction,
  FormatDateFunction,
  FormatNumberFunction,
} from './types';

// Core
export { I18nManager, initI18n, getI18n } from './I18nManager';
export { I18nContext } from './I18nProvider';

// React
export { I18nProvider } from './I18nProvider';
export { useTranslation } from './useTranslation';

// Components
export { LanguageSwitcher } from './components/LanguageSwitcher';
