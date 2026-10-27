// ABOUTME: Locale metadata (name, native name, text direction) for every locale the app offers.
// ABOUTME: Replaces the per-locale metadata JSON files; locale-specific formats are layered on top by P5-A02.

export interface LocaleDefinition {
  /** BCP 47 tag used by i18next, or the generated `pseudo` locale. */
  readonly code: string;
  readonly name: string;
  readonly nativeName: string;
  readonly direction: 'ltr' | 'rtl';
  /** Placeholder pattern, not a formatter. P5-A02 owns real date and number formatting. */
  readonly dateFormat?: string;
  readonly timeFormat?: string;
  /** True for locales generated from another locale at load time rather than read from disk. */
  readonly generated?: boolean;
}

export const LOCALES: readonly LocaleDefinition[] = [
  {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    direction: 'ltr',
    dateFormat: 'MM/DD/YYYY',
    timeFormat: 'hh:mm A',
  },
  {
    code: 'fr',
    name: 'French',
    nativeName: 'Français',
    direction: 'ltr',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: 'HH:mm',
  },
  { code: 'sw', name: 'Kiswahili', nativeName: 'Kiswahili', direction: 'ltr' },
  { code: 'rw', name: 'Kinyarwanda', nativeName: 'Ikinyarwanda', direction: 'ltr' },
  {
    code: 'pt',
    name: 'Portuguese',
    nativeName: 'Português',
    direction: 'ltr',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: 'HH:mm',
  },
  {
    code: 'ar',
    name: 'Arabic',
    nativeName: 'العربية',
    direction: 'rtl',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: 'hh:mm A',
  },
  {
    code: 'pseudo',
    name: 'Pseudo-locale',
    nativeName: 'Pseudo-locale',
    direction: 'ltr',
    generated: true,
  },
];

const BY_CODE = new Map(LOCALES.map((locale) => [locale.code, locale]));

export function getLocaleDefinition(code: string): LocaleDefinition | undefined {
  return BY_CODE.get(code);
}

export function isRtl(code: string): boolean {
  return BY_CODE.get(code)?.direction === 'rtl';
}

export function isGeneratedLocale(code: string): boolean {
  return BY_CODE.get(code)?.generated === true;
}
