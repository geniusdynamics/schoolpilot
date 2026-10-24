// ABOUTME: The locale table of the app: for each supported BCP-47 tag, the country its addresses and
// ABOUTME: phones default to, its currency, its week start, its name order and its address line order.
// ABOUTME: Unknown tags are canonicalised into a profile rather than refused, so a new locale formats
// ABOUTME: correctly before anyone has written it into the table.

import { type CurrencyCode } from '@/domain/money';
import { directionOf } from '@/domain/reports/bidi';
import type { NAME_ORDERS } from '@/domain/schema/people';

/** Reading direction of a locale. */
export type Direction = 'ltr' | 'rtl';

/** The canonical name orders of the people schema, reused rather than restated. */
export type NameOrder = (typeof NAME_ORDERS)[number];

/** Day of the week a locale starts its calendar on; 0 is Sunday, as `Date#getDay` counts. */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/** The pieces an address line order is built from. */
export type AddressToken =
  | 'line1'
  | 'line2'
  | 'subdivisions'
  | 'city'
  | 'region'
  | 'postal_code'
  | 'postal_with_city'
  | 'country';

/** What the table says about one locale. */
export interface LocaleFacts {
  /** The ISO 3166-1 alpha-2 country this locale's addresses and phone numbers default to. */
  readonly country: string;
  /** The currency amounts of this locale default to; null when the locale names no known one. */
  readonly currency: CurrencyCode | null;
  readonly weekStartsOn: Weekday;
  readonly nameOrder: NameOrder;
  /** The order address lines are printed in; `postal_with_city` is one line, postal code first. */
  readonly addressOrder: readonly AddressToken[];
}

/** A locale of the table, resolved: the table's facts plus the tag and its reading direction. */
export interface LocaleProfile extends LocaleFacts {
  readonly tag: string;
  readonly language: string;
  readonly region: string | null;
  readonly direction: Direction;
}

/** The locale the app falls back to when nothing names one. */
export const DEFAULT_LOCALE = 'en-KE';

/** Address order for a country whose convention we have not been told: street, city, region, postcode. */
const WESTERN_ADDRESS_ORDER: readonly AddressToken[] = [
  'line1',
  'line2',
  'city',
  'region',
  'postal_code',
  'country',
];

/** Address order for the countries whose hierarchy runs county → sub-county → ward → town. */
const HIERARCHY_ADDRESS_ORDER: readonly AddressToken[] = [
  'line1',
  'line2',
  'subdivisions',
  'city',
  'postal_code',
  'country',
];

/** Address order of the francophone and lusophone convention: postcode and town share a line. */
const CONTINENTAL_ADDRESS_ORDER: readonly AddressToken[] = [
  'line1',
  'line2',
  'subdivisions',
  'postal_with_city',
  'country',
];

/** Address order of the Arabic convention: hierarchy, then city, then postcode. */
const ARABIC_ADDRESS_ORDER: readonly AddressToken[] = [
  'line1',
  'line2',
  'subdivisions',
  'city',
  'postal_code',
  'country',
];

/**
 * The locales the product ships: the English variants of its country packs, Kiswahili, French,
 * Portuguese, Arabic and Amharic. A tag absent here still resolves (see `resolveLocale`).
 */
const LOCALE_TABLE = {
  'en-GB': { country: 'GB', currency: 'GBP', weekStartsOn: 1, nameOrder: 'given_first', addressOrder: WESTERN_ADDRESS_ORDER },
  'en-KE': { country: 'KE', currency: 'KES', weekStartsOn: 1, nameOrder: 'given_first', addressOrder: HIERARCHY_ADDRESS_ORDER },
  'en-UG': { country: 'UG', currency: 'UGX', weekStartsOn: 1, nameOrder: 'given_first', addressOrder: HIERARCHY_ADDRESS_ORDER },
  'en-TZ': { country: 'TZ', currency: 'TZS', weekStartsOn: 1, nameOrder: 'given_first', addressOrder: HIERARCHY_ADDRESS_ORDER },
  'en-RW': { country: 'RW', currency: 'RWF', weekStartsOn: 1, nameOrder: 'given_first', addressOrder: HIERARCHY_ADDRESS_ORDER },
  'en-NG': { country: 'NG', currency: 'NGN', weekStartsOn: 1, nameOrder: 'given_first', addressOrder: HIERARCHY_ADDRESS_ORDER },
  'en-GH': { country: 'GH', currency: 'GHS', weekStartsOn: 1, nameOrder: 'given_first', addressOrder: HIERARCHY_ADDRESS_ORDER },
  'en-ZA': { country: 'ZA', currency: 'ZAR', weekStartsOn: 1, nameOrder: 'given_first', addressOrder: HIERARCHY_ADDRESS_ORDER },
  'en-US': { country: 'US', currency: 'USD', weekStartsOn: 0, nameOrder: 'given_first', addressOrder: WESTERN_ADDRESS_ORDER },
  'sw-KE': { country: 'KE', currency: 'KES', weekStartsOn: 1, nameOrder: 'given_first', addressOrder: HIERARCHY_ADDRESS_ORDER },
  'sw-TZ': { country: 'TZ', currency: 'TZS', weekStartsOn: 1, nameOrder: 'given_first', addressOrder: HIERARCHY_ADDRESS_ORDER },
  'rw-RW': { country: 'RW', currency: 'RWF', weekStartsOn: 1, nameOrder: 'given_first', addressOrder: HIERARCHY_ADDRESS_ORDER },
  'fr-FR': { country: 'FR', currency: 'EUR', weekStartsOn: 1, nameOrder: 'given_first', addressOrder: CONTINENTAL_ADDRESS_ORDER },
  'fr-SN': { country: 'SN', currency: 'XOF', weekStartsOn: 1, nameOrder: 'given_first', addressOrder: CONTINENTAL_ADDRESS_ORDER },
  'fr-CI': { country: 'CI', currency: 'XOF', weekStartsOn: 1, nameOrder: 'given_first', addressOrder: CONTINENTAL_ADDRESS_ORDER },
  'fr-CM': { country: 'CM', currency: 'XAF', weekStartsOn: 1, nameOrder: 'given_first', addressOrder: CONTINENTAL_ADDRESS_ORDER },
  'fr-CD': { country: 'CD', currency: 'CDF', weekStartsOn: 1, nameOrder: 'given_first', addressOrder: CONTINENTAL_ADDRESS_ORDER },
  'pt-PT': { country: 'PT', currency: 'EUR', weekStartsOn: 1, nameOrder: 'given_first', addressOrder: CONTINENTAL_ADDRESS_ORDER },
  'pt-MZ': { country: 'MZ', currency: 'MZN', weekStartsOn: 1, nameOrder: 'given_first', addressOrder: CONTINENTAL_ADDRESS_ORDER },
  'pt-AO': { country: 'AO', currency: 'AOA', weekStartsOn: 1, nameOrder: 'given_first', addressOrder: CONTINENTAL_ADDRESS_ORDER },
  'ar-EG': { country: 'EG', currency: 'EGP', weekStartsOn: 6, nameOrder: 'given_first', addressOrder: ARABIC_ADDRESS_ORDER },
  'ar-SA': { country: 'SA', currency: 'SAR', weekStartsOn: 0, nameOrder: 'given_first', addressOrder: ARABIC_ADDRESS_ORDER },
  'ar-AE': { country: 'AE', currency: 'AED', weekStartsOn: 1, nameOrder: 'given_first', addressOrder: ARABIC_ADDRESS_ORDER },
  'am-ET': { country: 'ET', currency: 'ETB', weekStartsOn: 1, nameOrder: 'given_first', addressOrder: HIERARCHY_ADDRESS_ORDER },
} as const satisfies Record<string, LocaleFacts>;

/** Every tag the table names, in the table's order. */
export const SUPPORTED_LOCALES = Object.keys(LOCALE_TABLE) as readonly string[];

/** The currency a country's amounts default to when the locale table does not name it. */
const CURRENCY_BY_COUNTRY: Readonly<Record<string, CurrencyCode>> = {
  AE: 'AED', AO: 'AOA', AT: 'EUR', AU: 'AUD', BD: 'BDT', BE: 'EUR', BH: 'BHD', BW: 'BWP',
  CA: 'CAD', CD: 'CDF', CH: 'CHF', CM: 'XAF', CN: 'CNY', DE: 'EUR', DK: 'DKK', EG: 'EGP',
  ES: 'EUR', ET: 'ETB', FI: 'EUR', FR: 'EUR', GB: 'GBP', GH: 'GHS', GM: 'GMD', GN: 'GNF',
  GR: 'EUR', HK: 'HKD', ID: 'IDR', IE: 'EUR', IN: 'INR', IT: 'EUR', JO: 'JOD', JP: 'JPY',
  KE: 'KES', KM: 'KMF', KR: 'KRW', KW: 'KWD', LR: 'LRD', LY: 'LYD', MA: 'MAD', MW: 'MWK',
  MX: 'MXN', MY: 'MYR', MZ: 'MZN', NA: 'NAD', NG: 'NGN', NL: 'EUR', NO: 'NOK', NZ: 'NZD',
  OM: 'OMR', PH: 'PHP', PK: 'PKR', PL: 'PLN', PT: 'EUR', QA: 'QAR', RW: 'RWF', SA: 'SAR',
  SD: 'SDG', SE: 'SEK', SG: 'SGD', SL: 'SLE', SN: 'XOF', SO: 'SOS', SS: 'SSP', TH: 'THB',
  TN: 'TND', TR: 'TRY', TZ: 'TZS', UG: 'UGX', US: 'USD', VN: 'VND', ZA: 'ZAR', ZM: 'ZMW',
  ZW: 'ZWG',
};

/** The week start of a region, for a tag the table does not name. */
const WEEK_START_BY_REGION: Readonly<Record<string, Weekday>> = {
  US: 0, CA: 0, JP: 0, IN: 0, AU: 0, PH: 0, HK: 0, SG: 0, ZA: 0,
  EG: 6, SA: 6, AE: 6, QA: 6, KW: 6, OM: 6, BH: 6, JO: 6, LY: 6, SD: 6,
};

/** The week start of a language whose region we do not know. */
const WEEK_START_BY_LANGUAGE: Readonly<Record<string, Weekday>> = { ar: 6, he: 0, fa: 6 };

/** Languages that write the family name first; everything else is given-name first. */
const FAMILY_FIRST_LANGUAGES = new Set(['hu', 'ja', 'ko', 'vi', 'zh']);

const PROFILE_CACHE = new Map<string, LocaleProfile>();

/** A tag's language and region, canonicalised; null when the tag is not usable at all. */
function parseTag(tag: string): { tag: string; language: string; region: string | null } | null {
  const cleaned = tag.trim().replace(/_/g, '-');
  if (cleaned === '') return null;
  let canonical: string;
  try {
    canonical = Intl.getCanonicalLocales(cleaned)[0];
  } catch {
    return null;
  }
  if (!canonical) return null;
  const [language, second] = canonical.split('-');
  const region = second && /^([A-Za-z]{2}|\d{3})$/.test(second) ? second.toUpperCase() : null;
  return { tag: canonical, language: language.toLowerCase(), region };
}

/** The profile of a tag, building and caching it when the table does not hold one. */
export function resolveLocale(locale?: string | null): LocaleProfile {
  const requested = locale?.trim() ?? '';
  const cached = PROFILE_CACHE.get(requested.toLowerCase());
  if (cached) return cached;

  const parsed = parseTag(requested) ?? parseTag(DEFAULT_LOCALE)!;
  const tableEntry = (LOCALE_TABLE as Record<string, LocaleFacts>)[
    Object.keys(LOCALE_TABLE).find((key) => key.toLowerCase() === parsed.tag.toLowerCase()) ?? ''
  ];

  const region = parsed.region;
  const language = parsed.language;
  const facts: LocaleFacts =
    tableEntry ?? {
      country: region ?? '',
      currency: region ? CURRENCY_BY_COUNTRY[region] ?? null : null,
      weekStartsOn:
        (region ? WEEK_START_BY_REGION[region] : undefined) ??
        WEEK_START_BY_LANGUAGE[language] ??
        1,
      nameOrder: FAMILY_FIRST_LANGUAGES.has(language) ? 'family_first' : 'given_first',
      addressOrder: directionOf(parsed.tag) === 'rtl' ? ARABIC_ADDRESS_ORDER : WESTERN_ADDRESS_ORDER,
    };

  const profile: LocaleProfile = {
    tag: parsed.tag,
    language,
    region,
    direction: directionOf(parsed.tag),
    country: facts.country,
    currency: facts.currency,
    weekStartsOn: facts.weekStartsOn,
    nameOrder: facts.nameOrder,
    addressOrder: facts.addressOrder,
  };

  PROFILE_CACHE.set(requested.toLowerCase(), profile);
  return profile;
}

/** The reading direction of a locale, the one place the app asks. */
export function localeDirection(locale?: string | null): Direction {
  return resolveLocale(locale).direction;
}

/** True when a locale reads right to left. */
export function isRtlLocale(locale?: string | null): boolean {
  return localeDirection(locale) === 'rtl';
}

/** The country a locale's addresses and phone numbers default to; '' when it names none. */
export function countryOfLocale(locale?: string | null): string {
  return resolveLocale(locale).country;
}

/** The currency a locale's amounts default to; null when the locale names no known one. */
export function currencyOfLocale(locale?: string | null): CurrencyCode | null {
  return resolveLocale(locale).currency;
}

/** The name order a locale writes person names in. */
export function nameOrderOfLocale(locale?: string | null): NameOrder {
  return resolveLocale(locale).nameOrder;
}

/** The day a locale's week starts on; 0 is Sunday. */
export function weekStartsOn(locale?: string | null): Weekday {
  return resolveLocale(locale).weekStartsOn;
}

/**
 * The locale in force in the running app: the `lang` the document carries, or `DEFAULT_LOCALE`.
 *
 * The document is the single place a locale is published, so a formatter stays free of the i18n
 * framework and still follows the user's choice. Pass an explicit locale when the caller knows one.
 */
export function activeLocale(fallback: string = DEFAULT_LOCALE): string {
  if (typeof document !== 'undefined') {
    const lang = document.documentElement.getAttribute('lang');
    if (lang && lang.trim() !== '') return lang;
  }
  return fallback;
}

/** The attributes that publish a locale on an element: `lang`, `dir` and a `data-locale` hook. */
export function localeAttributes(locale?: string | null): {
  lang: string;
  dir: Direction;
  'data-locale': string;
} {
  const profile = resolveLocale(locale);
  return { lang: profile.tag, dir: profile.direction, 'data-locale': profile.tag };
}

/** Publishes a locale on the document element, which is what logical CSS and `activeLocale` read. */
export function applyLocaleDirection(locale?: string | null, root?: HTMLElement | null): void {
  if (typeof document === 'undefined') return;
  const element = root ?? document.documentElement;
  if (!element) return;
  const attributes = localeAttributes(locale);
  element.setAttribute('lang', attributes.lang);
  element.setAttribute('dir', attributes.dir);
  element.setAttribute('data-locale', attributes['data-locale']);
}
