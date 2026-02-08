/**
 * i18n Manager
 * 
 * Core internationalization system for SchoolPilot3.
 * Supports multiple locales, RTL languages, and pluralization.
 */

import type { 
  Locale, 
  LocaleData, 
  I18nConfig, 
  FormatOptions, 
  TranslationDict,
  TranslationValue 
} from './types';

export class I18nManager {
  private config: I18nConfig;
  private currentLocale: Locale;
  private locales: Map<Locale, LocaleData> = new Map();
  private loadingLocales: Set<Locale> = new Set();
  private listeners: Set<(locale: Locale) => void> = new Set();

  constructor(config: I18nConfig) {
    this.config = {
      defaultLocale: 'en',
      fallbackLocale: 'en',
      supportedLocales: ['en'],
      ...config,
    };
    this.currentLocale = this.config.defaultLocale;
  }

  // ============================================================================
  // Locale Management
  // ============================================================================

  /**
   * Get current locale
   */
  getCurrentLocale(): Locale {
    return this.currentLocale;
  }

  /**
   * Get current locale data
   */
  getCurrentLocaleData(): LocaleData | undefined {
    return this.locales.get(this.currentLocale);
  }

  /**
   * Set current locale
   */
  async setLocale(locale: Locale): Promise<void> {
    if (!this.config.supportedLocales.includes(locale)) {
      console.warn(`Locale ${locale} is not in supported locales list`);
    }

    // Load locale if not loaded
    if (!this.locales.has(locale)) {
      await this.loadLocale(locale);
    }

    this.currentLocale = locale;
    
    // Update document direction for RTL support
    this.updateDocumentDirection();
    
    // Notify listeners
    this.notifyListeners();
  }

  /**
   * Register a locale
   */
  registerLocale(data: LocaleData): void {
    this.locales.set(data.code, data);
  }

  /**
   * Check if locale is loaded
   */
  isLocaleLoaded(locale: Locale): boolean {
    return this.locales.has(locale);
  }

  /**
   * Get list of loaded locales
   */
  getLoadedLocales(): Locale[] {
    return Array.from(this.locales.keys());
  }

  /**
   * Get supported locales
   */
  getSupportedLocales(): Locale[] {
    return this.config.supportedLocales;
  }

  // ============================================================================
  // Translation
  // ============================================================================

  /**
   * Translate a key
   */
  t(key: string, options?: FormatOptions): string {
    const translations = this.getTranslations();
    
    let value = this.getNestedValue(translations, key);
    
    // Fallback to default locale if not found
    if (value === undefined && this.currentLocale !== this.config.fallbackLocale) {
      const fallbackTranslations = this.locales.get(this.config.fallbackLocale)?.translations;
      if (fallbackTranslations) {
        value = this.getNestedValue(fallbackTranslations, key);
      }
    }

    // Return key if not found
    if (value === undefined) {
      console.warn(`Translation key not found: ${key}`);
      return key;
    }

    // Handle TranslationValue object
    let text: string;
    if (typeof value === 'object' && value !== null) {
      const tv = value as TranslationValue;
      
      // Handle pluralization
      if (options?.count !== undefined && tv.plural) {
        const pluralKey = this.getPluralKey(options.count, this.currentLocale);
        text = tv.plural[pluralKey] || tv.value;
      } else {
        text = tv.value;
      }
    } else {
      text = String(value);
    }

    // Apply interpolation
    if (options?.interpolation) {
      text = this.interpolate(text, options.interpolation);
    }

    return text;
  }

  /**
   * Check if translation exists
   */
  has(key: string): boolean {
    const translations = this.getTranslations();
    return this.getNestedValue(translations, key) !== undefined;
  }

  // ============================================================================
  // Formatting
  // ============================================================================

  /**
   * Format date
   */
  formatDate(
    date: Date | string | number,
    format: 'short' | 'long' | 'full' | 'relative' = 'long'
  ): string {
    const localeData = this.getCurrentLocaleData();
    const d = new Date(date);

    if (format === 'relative') {
      return this.formatRelativeDate(d);
    }

    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: format === 'short' ? 'short' : 'long',
      day: 'numeric',
    };

    if (format === 'full') {
      options.weekday = 'long';
    }

    return d.toLocaleDateString(this.currentLocale, options);
  }

  /**
   * Format time
   */
  formatTime(date: Date | string | number, includeSeconds = false): string {
    const d = new Date(date);
    return d.toLocaleTimeString(this.currentLocale, {
      hour: '2-digit',
      minute: '2-digit',
      second: includeSeconds ? '2-digit' : undefined,
    });
  }

  /**
   * Format number
   */
  formatNumber(
    num: number,
    options: { decimals?: number; currency?: string } = {}
  ): string {
    const { decimals = 0, currency } = options;

    if (currency) {
      return num.toLocaleString(this.currentLocale, {
        style: 'currency',
        currency,
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      });
    }

    return num.toLocaleString(this.currentLocale, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  }

  /**
   * Format relative time (e.g., "2 hours ago")
   */
  formatRelativeDate(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSecs < 60) {
      return this.t('time.just_now');
    }
    if (diffMins < 60) {
      return this.t('time.minutes_ago', { count: diffMins, interpolation: { count: diffMins } });
    }
    if (diffHours < 24) {
      return this.t('time.hours_ago', { count: diffHours, interpolation: { count: diffHours } });
    }
    if (diffDays < 30) {
      return this.t('time.days_ago', { count: diffDays, interpolation: { count: diffDays } });
    }

    return this.formatDate(date, 'long');
  }

  // ============================================================================
  // Listeners
  // ============================================================================

  /**
   * Subscribe to locale changes
   */
  onLocaleChange(callback: (locale: Locale) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private notifyListeners(): void {
    this.listeners.forEach(cb => cb(this.currentLocale));
  }

  // ============================================================================
  // Loading
  // ============================================================================

  /**
   * Load locale data
   */
  async loadLocale(locale: Locale): Promise<void> {
    if (this.locales.has(locale) || this.loadingLocales.has(locale)) {
      return;
    }

    this.loadingLocales.add(locale);

    try {
      const loadPath = this.config.loadPath || '/locales/{{lng}}.json';
      const url = loadPath.replace('{{lng}}', locale);
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to load locale ${locale}: ${response.statusText}`);
      }

      const data: LocaleData = await response.json();
      this.registerLocale(data);
    } catch (error) {
      console.error(`Failed to load locale ${locale}:`, error);
      
      // Try to load built-in locale
      const builtIn = this.getBuiltInLocale(locale);
      if (builtIn) {
        this.registerLocale(builtIn);
      }
    } finally {
      this.loadingLocales.delete(locale);
    }
  }

  /**
   * Preload multiple locales
   */
  async preloadLocales(locales: Locale[]): Promise<void> {
    await Promise.all(locales.map(l => this.loadLocale(l)));
  }

  // ============================================================================
  // Helpers
  // ============================================================================

  private getTranslations(): TranslationDict {
    return this.locales.get(this.currentLocale)?.translations || {};
  }

  private getNestedValue(obj: TranslationDict, path: string): any {
    const keys = path.split('.');
    let value: any = obj;

    for (const key of keys) {
      if (value === undefined || value === null) {
        return undefined;
      }
      value = value[key];
    }

    return value;
  }

  private interpolate(text: string, values: Record<string, string | number>): string {
    return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return String(values[key] ?? match);
    });
  }

  private getPluralKey(count: number, locale: Locale): string {
    // Simple plural rules
    if (locale === 'ar') {
      // Arabic has more complex plural forms
      if (count === 0) return 'zero';
      if (count === 1) return 'one';
      if (count === 2) return 'two';
      if (count % 100 >= 3 && count % 100 <= 10) return 'few';
      if (count % 100 >= 11 && count % 100 <= 99) return 'many';
      return 'other';
    }

    // Default: singular vs plural
    return count === 1 ? 'one' : 'other';
  }

  private updateDocumentDirection(): void {
    const localeData = this.getCurrentLocaleData();
    if (localeData) {
      document.documentElement.dir = localeData.direction;
      document.documentElement.lang = this.currentLocale;
    }
  }

  private getBuiltInLocale(locale: Locale): LocaleData | null {
    // Built-in fallback locales
    const builtIns: Record<string, LocaleData> = {
      en: {
        code: 'en',
        name: 'English',
        nativeName: 'English',
        direction: 'ltr',
        dateFormat: 'MM/DD/YYYY',
        timeFormat: 'hh:mm A',
        numberFormat: { decimal: '.', thousand: ',', currency: '$' },
        translations: {
          app: { name: 'SchoolPilot3' },
          nav: { dashboard: 'Dashboard', students: 'Students', teachers: 'Teachers' },
          actions: { save: 'Save', cancel: 'Cancel', delete: 'Delete' },
          time: {
            just_now: 'Just now',
            minutes_ago: '{{count}} minute ago',
            minutes_ago_plural: '{{count}} minutes ago',
            hours_ago: '{{count}} hour ago',
            hours_ago_plural: '{{count}} hours ago',
            days_ago: '{{count}} day ago',
            days_ago_plural: '{{count}} days ago',
          },
        },
      },
    };

    return builtIns[locale] || null;
  }
}

// Singleton instance
let i18nInstance: I18nManager | null = null;

export function initI18n(config: I18nConfig): I18nManager {
  i18nInstance = new I18nManager(config);
  return i18nInstance;
}

export function getI18n(): I18nManager {
  if (!i18nInstance) {
    throw new Error('i18n not initialized. Call initI18n first.');
  }
  return i18nInstance;
}

export default I18nManager;
