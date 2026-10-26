// ABOUTME: Addresses per country: the hierarchy a country's forms collect (Kenya county, sub-county
// ABOUTME: and ward, Uganda district, sub-county and parish, Nigeria state and LGA, and so on), the
// ABOUTME: fields in order, and the locale's line order for printing one.

import {
  ADDRESS_LINE1_LABEL,
  ADDRESS_LINE2_LABEL,
  ADDRESS_POSTAL_CODE_LABEL,
  countryAddressSchema,
} from '@/domain/country';
import type { Address } from '@/domain/schema/people';

import { activeLocale, resolveLocale } from './locales';

/** One level of a country's address hierarchy; `key` is the value key the pack stores. */
export interface AddressLevel {
  readonly key: string;
  readonly labelKey: string;
  readonly required: boolean;
}

/** What a country's address form collects and how it is labelled. */
export interface CountryAddressSchema {
  readonly country: string;
  readonly levels: readonly AddressLevel[];
  readonly hasCity: boolean;
  readonly cityRequired: boolean;
  readonly postalCodeRequired: boolean;
  readonly postalCodeLabelKey: string;
  readonly line1LabelKey: string;
  readonly line2LabelKey: string;
}

/** An address as the form holds it: the schema's fields plus one value per hierarchy level. */
export interface LocaleAddress extends Address {
  readonly subdivisions?: Readonly<Record<string, string | undefined>>;
}

/** One field of a country's address form, in the order the form shows them. */
export interface AddressField {
  readonly key: string;
  readonly labelKey: string;
  readonly required: boolean;
  readonly kind: 'line' | 'level' | 'city' | 'region' | 'postal_code';
}

const POSTAL_LABEL = ADDRESS_POSTAL_CODE_LABEL;
const LINE1_LABEL = ADDRESS_LINE1_LABEL;
const LINE2_LABEL = ADDRESS_LINE2_LABEL;

/** The address schema a country's pack declares; the countries that ship a pack take theirs from it. */
function packAddressSchema(country: string): CountryAddressSchema {
  const schema = countryAddressSchema(country);
  if (!schema) throw new Error(`No country pack for ${country}`);
  return schema;
}

/**
 * The address hierarchies of spec 06 §6, plus the countries the app's own packs cover.
 *
 * Labels are i18n keys, not English text, so the locale tasks translate them once and every
 * country's form follows. `required` is what the country's postal service needs, not a preference.
 */
const ADDRESS_SCHEMAS: Readonly<Record<string, CountryAddressSchema>> = {
  KE: packAddressSchema('KE'),
  UG: {
    country: 'UG',
    levels: [
      { key: 'district', labelKey: 'address.ug.district', required: true },
      { key: 'sub_county', labelKey: 'address.ug.sub_county', required: true },
      { key: 'parish', labelKey: 'address.ug.parish', required: false },
    ],
    hasCity: true,
    cityRequired: false,
    postalCodeRequired: false,
    postalCodeLabelKey: POSTAL_LABEL,
    line1LabelKey: LINE1_LABEL,
    line2LabelKey: LINE2_LABEL,
  },
  TZ: {
    country: 'TZ',
    levels: [
      { key: 'region', labelKey: 'address.tz.region', required: true },
      { key: 'district', labelKey: 'address.tz.district', required: true },
      { key: 'ward', labelKey: 'address.tz.ward', required: false },
    ],
    hasCity: true,
    cityRequired: false,
    postalCodeRequired: false,
    postalCodeLabelKey: POSTAL_LABEL,
    line1LabelKey: LINE1_LABEL,
    line2LabelKey: LINE2_LABEL,
  },
  RW: {
    country: 'RW',
    levels: [
      { key: 'province', labelKey: 'address.rw.province', required: true },
      { key: 'district', labelKey: 'address.rw.district', required: true },
      { key: 'sector', labelKey: 'address.rw.sector', required: false },
    ],
    hasCity: true,
    cityRequired: false,
    postalCodeRequired: false,
    postalCodeLabelKey: POSTAL_LABEL,
    line1LabelKey: LINE1_LABEL,
    line2LabelKey: LINE2_LABEL,
  },
  NG: packAddressSchema('NG'),
  GH: {
    country: 'GH',
    levels: [
      { key: 'region', labelKey: 'address.gh.region', required: true },
      { key: 'district', labelKey: 'address.gh.district', required: true },
    ],
    hasCity: true,
    cityRequired: false,
    postalCodeRequired: false,
    postalCodeLabelKey: POSTAL_LABEL,
    line1LabelKey: LINE1_LABEL,
    line2LabelKey: LINE2_LABEL,
  },
  ZA: {
    country: 'ZA',
    levels: [
      { key: 'province', labelKey: 'address.za.province', required: true },
      { key: 'municipality', labelKey: 'address.za.municipality', required: true },
    ],
    hasCity: true,
    cityRequired: false,
    postalCodeRequired: true,
    postalCodeLabelKey: POSTAL_LABEL,
    line1LabelKey: LINE1_LABEL,
    line2LabelKey: LINE2_LABEL,
  },
  GB: {
    country: 'GB',
    levels: [{ key: 'county', labelKey: 'address.gb.county', required: false }],
    hasCity: true,
    cityRequired: true,
    postalCodeRequired: true,
    postalCodeLabelKey: POSTAL_LABEL,
    line1LabelKey: LINE1_LABEL,
    line2LabelKey: LINE2_LABEL,
  },
  US: {
    country: 'US',
    levels: [{ key: 'state', labelKey: 'address.us.state', required: true }],
    hasCity: true,
    cityRequired: true,
    postalCodeRequired: true,
    postalCodeLabelKey: POSTAL_LABEL,
    line1LabelKey: LINE1_LABEL,
    line2LabelKey: LINE2_LABEL,
  },
  FR: {
    country: 'FR',
    levels: [{ key: 'department', labelKey: 'address.fr.department', required: false }],
    hasCity: true,
    cityRequired: true,
    postalCodeRequired: true,
    postalCodeLabelKey: POSTAL_LABEL,
    line1LabelKey: LINE1_LABEL,
    line2LabelKey: LINE2_LABEL,
  },
  PT: {
    country: 'PT',
    levels: [{ key: 'district', labelKey: 'address.pt.district', required: false }],
    hasCity: true,
    cityRequired: true,
    postalCodeRequired: true,
    postalCodeLabelKey: POSTAL_LABEL,
    line1LabelKey: LINE1_LABEL,
    line2LabelKey: LINE2_LABEL,
  },
  EG: {
    country: 'EG',
    levels: [
      { key: 'governorate', labelKey: 'address.eg.governorate', required: true },
      { key: 'district', labelKey: 'address.eg.district', required: false },
    ],
    hasCity: true,
    cityRequired: true,
    postalCodeRequired: false,
    postalCodeLabelKey: POSTAL_LABEL,
    line1LabelKey: LINE1_LABEL,
    line2LabelKey: LINE2_LABEL,
  },
  ET: {
    country: 'ET',
    levels: [
      { key: 'region', labelKey: 'address.et.region', required: true },
      { key: 'zone', labelKey: 'address.et.zone', required: false },
      { key: 'woreda', labelKey: 'address.et.woreda', required: false },
    ],
    hasCity: true,
    cityRequired: false,
    postalCodeRequired: false,
    postalCodeLabelKey: POSTAL_LABEL,
    line1LabelKey: LINE1_LABEL,
    line2LabelKey: LINE2_LABEL,
  },
};

/** The form every country without its own schema gets: street, city, region, postcode. */
const GENERIC_ADDRESS_SCHEMA: CountryAddressSchema = {
  country: '',
  levels: [],
  hasCity: true,
  cityRequired: false,
  postalCodeRequired: false,
  postalCodeLabelKey: POSTAL_LABEL,
  line1LabelKey: LINE1_LABEL,
  line2LabelKey: LINE2_LABEL,
};

/** The address schema of a country; the generic one when the country is unknown. */
export function addressSchemaFor(country?: string | null): CountryAddressSchema {
  const code = (country ?? '').trim().toUpperCase();
  return ADDRESS_SCHEMAS[code] ?? GENERIC_ADDRESS_SCHEMA;
}

/** The countries with a hierarchy of their own. */
export const ADDRESS_COUNTRIES = Object.keys(ADDRESS_SCHEMAS);

/** A country's address form fields, in the order the form shows them. */
export function addressFieldsFor(country?: string | null): AddressField[] {
  const schema = addressSchemaFor(country);
  const fields: AddressField[] = [
    { key: 'line1', labelKey: schema.line1LabelKey, required: true, kind: 'line' },
    { key: 'line2', labelKey: schema.line2LabelKey, required: false, kind: 'line' },
    ...schema.levels.map((level) => ({
      key: level.key,
      labelKey: level.labelKey,
      required: level.required,
      kind: 'level' as const,
    })),
  ];
  if (schema.levels.length === 0) {
    fields.push({ key: 'region', labelKey: 'address.region', required: false, kind: 'region' });
  }
  if (schema.hasCity) {
    fields.push({ key: 'city', labelKey: 'address.city', required: schema.cityRequired, kind: 'city' });
  }
  fields.push({
    key: 'postal_code',
    labelKey: schema.postalCodeLabelKey,
    required: schema.postalCodeRequired,
    kind: 'postal_code',
  });
  return fields;
}

function clean(part?: string | null): string {
  return (part ?? '').trim().replace(/\s+/g, ' ');
}

/** The subdivision values in hierarchy order; the address's `region` fills the first level. */
function orderedSubdivisions(address: LocaleAddress, schema: CountryAddressSchema): string[] {
  return schema.levels
    .map((level, index) =>
      clean(address.subdivisions?.[level.key] ?? (index === 0 ? address.region : undefined))
    )
    .filter(Boolean);
}

/** The country's name in the locale ("Kenya", "كينيا"), falling back to its code. */
function countryName(code: string, locale: string): string {
  if (!code) return '';
  try {
    const names = new Intl.DisplayNames(locale, { type: 'region' });
    return names.of(code) ?? code;
  } catch {
    return code;
  }
}

/**
 * The address as printed lines, in the locale's own order.
 *
 * Kenya and the other hierarchy countries print the hierarchy under the town; French and
 * Portuguese print the postcode and town on one line; Arabic prints the hierarchy, then the city,
 * then the postcode. Empty parts produce no line, so a short address has no blank rows.
 */
export function formatAddressLines(
  address: LocaleAddress | null | undefined,
  locale: string = activeLocale()
): string[] {
  if (!address) return [];
  const profile = resolveLocale(locale);
  const country = clean(address.country ?? profile.country).toUpperCase();
  const schema = addressSchemaFor(country);
  const subdivisions = orderedSubdivisions(address, schema);
  const city = clean(address.city);
  const region = clean(address.region);
  const postal = clean(address.postal_code);

  const lines: string[] = [];
  const push = (value: string) => {
    if (value) lines.push(value);
  };

  for (const token of profile.addressOrder) {
    switch (token) {
      case 'line1':
        push(clean(address.line1));
        break;
      case 'line2':
        push(clean(address.line2));
        break;
      case 'subdivisions':
        subdivisions.forEach(push);
        break;
      case 'city':
        push(city);
        break;
      case 'region':
        push(region);
        break;
      case 'postal_code':
        push(postal);
        break;
      case 'postal_with_city':
        push([postal, city].filter(Boolean).join(' '));
        break;
      case 'country':
        push(countryName(country, profile.tag));
        break;
    }
  }
  return lines;
}

/** The address as one string; newline-separated lines by default, `', '` for a table cell. */
export function formatAddress(
  address: LocaleAddress | null | undefined,
  locale: string = activeLocale(),
  options: { separator?: string } = {}
): string {
  return formatAddressLines(address, locale).join(options.separator ?? '\n');
}

/** The keys of the fields the country requires that the address does not fill. */
export function missingAddressFields(
  address: LocaleAddress | null | undefined,
  country?: string | null
): string[] {
  const schema = addressSchemaFor(country ?? address?.country);
  const missing: string[] = [];
  if (!clean(address?.line1)) missing.push('line1');
  for (const level of schema.levels) {
    if (level.required && !clean(address?.subdivisions?.[level.key])) missing.push(level.key);
  }
  if (schema.cityRequired && !clean(address?.city)) missing.push('city');
  if (schema.postalCodeRequired && !clean(address?.postal_code)) missing.push('postal_code');
  return missing;
}
