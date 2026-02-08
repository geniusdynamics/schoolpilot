/**
 * useTranslation Hook
 * 
 * React hook for accessing i18n functionality.
 */

import { useState, useEffect, useCallback, useContext } from 'react';
import { I18nContext } from './I18nProvider';
import type { Locale, FormatOptions } from './types';

interface UseTranslationResult {
  t: (key: string, options?: FormatOptions) => string;
  locale: Locale;
  setLocale: (locale: Locale) => Promise<void>;
  isLoading: boolean;
  formatDate: (date: Date | string | number, format?: 'short' | 'long' | 'full' | 'relative') => string;
  formatNumber: (num: number, options?: { decimals?: number; currency?: string }) => string;
  formatTime: (date: Date | string | number) => string;
}

/**
 * Hook for translations
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { t, locale, setLocale } = useTranslation();
 *   
 *   return (
 *     <div>
 *       <h1>{t('welcome.title')}</h1>
 *       <p>{t('welcome.message', { interpolation: { name: 'John' } })}</p>
 *       <select value={locale} onChange={(e) => setLocale(e.target.value)}>
 *         <option value="en">English</option>
 *         <option value="es">Español</option>
 *       </select>
 *     </div>
 *   );
 * }
 * ```
 */
export function useTranslation(): UseTranslationResult {
  const context = useContext(I18nContext);
  
  if (!context) {
    throw new Error('useTranslation must be used within I18nProvider');
  }

  const { i18n } = context;
  const [locale, setLocaleState] = useState<Locale>(i18n.getCurrentLocale());
  const [isLoading, setIsLoading] = useState(false);

  // Subscribe to locale changes
  useEffect(() => {
    const unsubscribe = i18n.onLocaleChange((newLocale) => {
      setLocaleState(newLocale);
      setIsLoading(false);
    });

    return unsubscribe;
  }, [i18n]);

  // Translation function
  const t = useCallback(
    (key: string, options?: FormatOptions) => {
      return i18n.t(key, options);
    },
    [i18n, locale]
  );

  // Set locale with loading state
  const setLocale = useCallback(
    async (newLocale: Locale) => {
      setIsLoading(true);
      await i18n.setLocale(newLocale);
    },
    [i18n]
  );

  // Format helpers
  const formatDate = useCallback(
    (date: Date | string | number, format?: 'short' | 'long' | 'full' | 'relative') => {
      return i18n.formatDate(date, format);
    },
    [i18n, locale]
  );

  const formatNumber = useCallback(
    (num: number, options?: { decimals?: number; currency?: string }) => {
      return i18n.formatNumber(num, options);
    },
    [i18n, locale]
  );

  const formatTime = useCallback(
    (date: Date | string | number) => {
      return i18n.formatTime(date);
    },
    [i18n, locale]
  );

  return {
    t,
    locale,
    setLocale,
    isLoading,
    formatDate,
    formatNumber,
    formatTime,
  };
}

export default useTranslation;
