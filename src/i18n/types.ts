/**
 * i18n Types
 * 
 * Type definitions for internationalization system.
 */

export type Locale = 'en' | 'es' | 'fr' | 'de' | 'ar' | 'sw' | string;

export interface TranslationValue {
  value: string;
  context?: string;
  plural?: Record<string, string>;
}

export type TranslationDict = Record<string, string | TranslationValue>;

export interface LocaleData {
  code: Locale;
  name: string;
  nativeName: string;
  direction: 'ltr' | 'rtl';
  translations: TranslationDict;
  dateFormat: string;
  timeFormat: string;
  numberFormat: {
    decimal: string;
    thousand: string;
    currency: string;
  };
}

export interface I18nConfig {
  defaultLocale: Locale;
  supportedLocales: Locale[];
  fallbackLocale: Locale;
  loadPath?: string;
}

export interface FormatOptions {
  count?: number;
  context?: string;
  interpolation?: Record<string, string | number>;
}

export type TranslateFunction = (
  key: string,
  options?: FormatOptions
) => string;

export type FormatDateFunction = (
  date: Date | string | number,
  format?: 'short' | 'long' | 'full' | 'relative'
) => string;

export type FormatNumberFunction = (
  num: number,
  options?: { decimals?: number; currency?: string }
) => string;
