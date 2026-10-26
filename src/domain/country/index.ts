// ABOUTME: The public API of the country module: the pack registry, identifier schemes and their
// ABOUTME: validation, public holidays and the address hierarchy. A caller imports from here.

export { COUNTRY_PACK_CODES, countryLabels, getCountryPack } from './registry';
export { identifierSchemesFor, validateIdentifier } from './identifiers';
export { easterSunday, holidaysOf } from './holidays';
export {
  ADDRESS_LINE1_LABEL,
  ADDRESS_LINE2_LABEL,
  ADDRESS_POSTAL_CODE_LABEL,
  addressLevelChoices,
  addressLevelOptions,
  countryAddressSchema,
} from './address';
export type {
  AddressOption,
  CountryAddressSchema,
  CountryHoliday,
  CountryIdentifier,
  CountryPack,
  DatedHoliday,
  IdentifierSchemeOption,
  IdentifierValidationResult,
  OwnerType,
  StatutoryReturn,
  Verification,
} from './types';
