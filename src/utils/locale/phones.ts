// ABOUTME: Phone numbers: national entry normalised to E.164 (the storage form), and E.164 rendered
// ABOUTME: back in a country's own national or international shape. No dependency — the grouping
// ABOUTME: table is small and explicit, and an unknown country is left in its canonical E.164 form.

import type { Phone } from '@/domain/schema/people';

import { countryOfLocale, resolveLocale } from './locales';

/** How a phone number is displayed: with its trunk prefix, or with its country code. */
export type PhoneDisplayStyle = 'national' | 'international';

/** What the formatter needs to know about a country's numbering plan. */
export interface PhoneCountryFormat {
  readonly dialCode: string;
  /** The national (trunk) prefix dropped from an international number, e.g. `0` in Kenya. */
  readonly nationalPrefix?: string;
  /** Digit groups of the national significant number, left to right. */
  readonly groups: readonly number[];
}

/**
 * The numbering plans SchoolPilot meets: the regions its packs cover and the countries its schools
 * call. `groups` must sum to the length of the national significant number for a format to apply;
 * anything else is left as canonical E.164 rather than mis-grouped.
 */
const PHONE_COUNTRIES: Readonly<Record<string, PhoneCountryFormat>> = {
  KE: { dialCode: '254', nationalPrefix: '0', groups: [3, 3, 3] },
  UG: { dialCode: '256', nationalPrefix: '0', groups: [3, 3, 3] },
  TZ: { dialCode: '255', nationalPrefix: '0', groups: [3, 3, 3] },
  RW: { dialCode: '250', nationalPrefix: '0', groups: [3, 3, 3] },
  NG: { dialCode: '234', nationalPrefix: '0', groups: [3, 3, 4] },
  GH: { dialCode: '233', nationalPrefix: '0', groups: [3, 3, 3] },
  ZA: { dialCode: '27', nationalPrefix: '0', groups: [2, 3, 4] },
  GB: { dialCode: '44', nationalPrefix: '0', groups: [4, 6] },
  US: { dialCode: '1', groups: [3, 3, 4] },
  FR: { dialCode: '33', nationalPrefix: '0', groups: [1, 2, 2, 2, 2] },
  PT: { dialCode: '351', groups: [3, 3, 3] },
  ET: { dialCode: '251', nationalPrefix: '0', groups: [2, 3, 4] },
  CM: { dialCode: '237', groups: [1, 2, 2, 2, 2] },
  SN: { dialCode: '221', groups: [2, 3, 2, 2] },
  CI: { dialCode: '225', groups: [2, 2, 2, 2, 2] },
  EG: { dialCode: '20', nationalPrefix: '0', groups: [2, 4, 4] },
  SA: { dialCode: '966', nationalPrefix: '0', groups: [2, 3, 4] },
  AE: { dialCode: '971', nationalPrefix: '0', groups: [2, 3, 4] },
  MZ: { dialCode: '258', groups: [2, 3, 4] },
  AO: { dialCode: '244', groups: [3, 3, 3] },
  BR: { dialCode: '55', nationalPrefix: '0', groups: [2, 5, 4] },
};

/** Dialling prefixes by country code; packs may pass an explicit code instead. */
export const DIAL_CODES: Readonly<Record<string, string>> = Object.fromEntries(
  Object.entries(PHONE_COUNTRIES).map(([country, format]) => [country, format.dialCode])
);

/** The dialling prefix of a country; undefined when the country has no format of its own. */
export function dialCodeForCountry(country?: string): string | undefined {
  if (!country) return undefined;
  return DIAL_CODES[country.toUpperCase()];
}

/** True for a string that is already a valid E.164 number. */
export function isValidE164(value: string): boolean {
  return /^\+[1-9]\d{1,14}$/.test(value.trim());
}

export interface PhoneParseOptions {
  readonly country?: string;
  readonly dialCode?: string;
}

export type PhoneParseResult =
  | { readonly ok: true; readonly number: string }
  | { readonly ok: false; readonly reason: 'empty' | 'invalid' };

/**
 * Normalises a national or international number to E.164. Leading zeroes are replaced by
 * the supplied dialling prefix; `00` and bare country-code entries are accepted.
 */
export function normalisePhone(input: string, options: PhoneParseOptions = {}): PhoneParseResult {
  const trimmed = input.trim();
  if (trimmed === '') return { ok: false, reason: 'empty' };

  const dial = (options.dialCode ?? dialCodeForCountry(options.country) ?? '254').replace(/\D/g, '');
  const compact = trimmed.replace(/[\s().\-/]/g, '');
  if (!/^[+\d]+$/.test(compact)) return { ok: false, reason: 'invalid' };

  let candidate: string;
  if (compact.startsWith('+')) {
    candidate = compact;
  } else if (compact.startsWith('00')) {
    candidate = `+${compact.slice(2)}`;
  } else if (compact.startsWith(dial) && compact.length > dial.length) {
    candidate = `+${compact}`;
  } else if (compact.startsWith('0')) {
    candidate = `+${dial}${compact.slice(1)}`;
  } else {
    candidate = `+${dial}${compact}`;
  }

  if (!/^\+[1-9]\d{1,14}$/.test(candidate)) return { ok: false, reason: 'invalid' };
  return { ok: true, number: candidate };
}

/** The country whose dialling prefix matches the number, preferring the longest match. */
function countryForDigits(digits: string): string | null {
  let best: string | null = null;
  let bestLength = 0;
  for (const [country, format] of Object.entries(PHONE_COUNTRIES)) {
    if (digits.startsWith(format.dialCode) && format.dialCode.length > bestLength) {
      best = country;
      bestLength = format.dialCode.length;
    }
  }
  return best;
}

/** Splits the digit groups of a number; null when the groups do not fit its length. */
function groupDigits(national: string, groups: readonly number[]): string | null {
  const expected = groups.reduce((total, size) => total + size, 0);
  if (national.length !== expected) return null;
  const parts: string[] = [];
  let offset = 0;
  for (const size of groups) {
    parts.push(national.slice(offset, offset + size));
    offset += size;
  }
  return parts.join(' ');
}

export interface PhoneFormatOptions {
  /** The locale the phone field belongs to; its country is the default. */
  readonly locale?: string;
  /** The country whose shape to use; the number's own dialling code wins when they disagree. */
  readonly country?: string;
  readonly style?: PhoneDisplayStyle;
}

/**
 * Renders a stored phone number in a country's own shape.
 *
 * Kenya `+254712345678` → `0712 345 678` national, `+254 712 345 678` international. France
 * `+33612345678` → `06 12 34 56 78` / `+33 6 12 34 56 78`. A number whose country has no format
 * here, or whose digits do not fit it, is returned as canonical E.164 rather than mis-grouped.
 */
export function formatPhone(
  phone: Phone | string | null | undefined,
  options: PhoneFormatOptions = {}
): string {
  const e164 = (typeof phone === 'string' ? phone : phone?.number ?? '').trim();
  if (e164 === '') return '';
  if (!isValidE164(e164)) return e164;

  const digits = e164.slice(1);
  const inferred = countryForDigits(digits);
  const explicit = options.country?.toUpperCase();
  const explicitMatches = explicit ? PHONE_COUNTRIES[explicit] : undefined;
  const country =
    inferred ??
    (explicitMatches && digits.startsWith(explicitMatches.dialCode) ? explicit : undefined) ??
    (options.locale ? countryOfLocale(options.locale) : undefined);
  const format = country ? PHONE_COUNTRIES[country] : undefined;
  if (!format || !digits.startsWith(format.dialCode)) return e164;

  const grouped = groupDigits(digits.slice(format.dialCode.length), format.groups);
  if (!grouped) return e164;

  if ((options.style ?? 'international') === 'national' && format.nationalPrefix !== undefined) {
    const [first, ...rest] = grouped.split(' ');
    return [`${format.nationalPrefix}${first}`, ...rest].join(' ');
  }
  return `+${format.dialCode} ${grouped}`;
}

/** An example number for a country's phone field, e.g. `+254 700 000000`. */
export function phonePlaceholder(country?: string, locale?: string): string {
  const code = dialCodeForCountry(country) ?? dialCodeForCountry(countryOfLocale(locale)) ?? '254';
  return `+${code} 700 000000`;
}

/** The locale's country as a phone country code; '' when the locale names none. */
export function phoneCountryOfLocale(locale?: string): string {
  return countryOfLocale(resolveLocale(locale).tag);
}
