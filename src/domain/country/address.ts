// ABOUTME: A country pack's address hierarchy in the shape the address form code uses, and the fixed
// ABOUTME: option lists (Kenya's 47 counties) a hierarchy level ships with.

import { getCountryPack } from './registry';
import type { AddressOption, CountryAddressSchema } from './types';

/** The label keys of the fields every country's address form shares. */
export const ADDRESS_POSTAL_CODE_LABEL = 'address.postal_code';
export const ADDRESS_LINE1_LABEL = 'address.line1';
export const ADDRESS_LINE2_LABEL = 'address.line2';

/** The address schema of a country that ships a pack, or `undefined`. */
export function countryAddressSchema(country: string | null | undefined): CountryAddressSchema | undefined {
  const pack = getCountryPack(country);
  if (!pack) return undefined;
  const { levels, hasCity, cityRequired, postalCode } = pack.addressHierarchy;
  return {
    country: pack.country,
    levels: levels.map(({ key, labelKey, required }) => ({ key, labelKey, required })),
    hasCity,
    cityRequired,
    postalCodeRequired: postalCode.required,
    postalCodeLabelKey: ADDRESS_POSTAL_CODE_LABEL,
    line1LabelKey: ADDRESS_LINE1_LABEL,
    line2LabelKey: ADDRESS_LINE2_LABEL,
  };
}

/**
 * The names a select offers for a hierarchy level, for a form that stores the name.
 *
 * A stored value that is not on the list (a record saved before the list was fixed) comes first, so
 * opening the record shows it and leaves it selectable. A level with no fixed list offers nothing.
 */
export function addressLevelChoices(
  country: string | null | undefined,
  levelKey: string,
  current?: string | null
): string[] {
  const names = addressLevelOptions(country, levelKey).map((option) => option.name);
  if (names.length === 0) return [];
  const stored = (current ?? '').trim();
  return stored !== '' && !names.includes(stored) ? [stored, ...names] : names;
}

/** The fixed options of a hierarchy level (the counties of Kenya); empty when the level is free text. */
export function addressLevelOptions(country: string | null | undefined, levelKey: string): readonly AddressOption[] {
  const level = getCountryPack(country)?.addressHierarchy.levels.find((candidate) => candidate.key === levelKey);
  return level?.options?.values ?? [];
}
