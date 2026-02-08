/**
 * I18n Provider
 * 
 * React context provider for i18n functionality.
 */

import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { I18nManager, initI18n } from './I18nManager';
import type { I18nConfig, Locale } from './types';

interface I18nContextValue {
  i18n: I18nManager;
  isReady: boolean;
}

export const I18nContext = createContext<I18nContextValue | null>(null);

interface I18nProviderProps {
  children: ReactNode;
  config: I18nConfig;
}

/**
 * I18n Provider Component
 * 
 * @example
 * ```tsx
 * <I18nProvider config={{
 *   defaultLocale: 'en',
 *   supportedLocales: ['en', 'es', 'fr'],
 *   fallbackLocale: 'en',
 * }}>
 *   <App />
 * </I18nProvider>
 * ```
 */
export const I18nProvider: React.FC<I18nProviderProps> = ({ children, config }) => {
  const [i18n] = useState(() => initI18n(config));
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Initialize locale
    const init = async () => {
      // Try to get saved locale from localStorage
      const savedLocale = localStorage.getItem('locale') as Locale | null;
      const localeToLoad = savedLocale || config.defaultLocale;

      await i18n.setLocale(localeToLoad);
      setIsReady(true);
    };

    init();
  }, [i18n, config.defaultLocale]);

  // Save locale changes to localStorage
  useEffect(() => {
    const unsubscribe = i18n.onLocaleChange((locale) => {
      localStorage.setItem('locale', locale);
    });

    return unsubscribe;
  }, [i18n]);

  if (!isReady) {
    // Return loading state or null
    return null;
  }

  return (
    <I18nContext.Provider value={{ i18n, isReady }}>
      {children}
    </I18nContext.Provider>
  );
};

export default I18nProvider;
