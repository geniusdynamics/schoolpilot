// ABOUTME: The public API of the locale module. Callers import from here, never from a file inside
// ABOUTME: the module: locale profiles and direction, dates, numbers, money, names, addresses,
// ABOUTME: phones and the bidi text helpers.

export {
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  activeLocale,
  applyLocaleDirection,
  countryOfLocale,
  currencyOfLocale,
  isRtlLocale,
  localeAttributes,
  localeDirection,
  nameOrderOfLocale,
  resolveLocale,
  weekStartsOn,
  type AddressToken,
  type Direction,
  type LocaleFacts,
  type LocaleProfile,
  type NameOrder,
  type Weekday,
} from './locales';

export {
  NO_DATE,
  dateEntryPattern,
  formatIsoDate,
  formatLocaleDate,
  formatLocaleDateTime,
  formatLocaleMonthYear,
  formatLocaleTime,
  parseIsoDate,
  startOfLocaleWeek,
  weekdayLabels,
  type DateEntryPattern,
  type DateInput,
  type DatePart,
  type DateStyleName,
  type LocaleDateOptions,
  type LocaleDateTimeOptions,
  type LocaleTimeOptions,
  type WeekdayLabelOptions,
} from './dates';

export {
  NO_NUMBER,
  formatLocaleNumber,
  formatLocalePercent,
  numberSymbols,
  parseLocaleNumber,
  toAsciiDigits,
  type LocaleNumberOptions,
  type NumberSymbols,
} from './numbers';

export {
  formatLocaleMoney,
  formatLocaleMoneyCompact,
  localeCurrency,
  moneyInputSeparators,
} from './currency';

export {
  NO_NAME,
  comparePersonNames,
  formatPersonName,
  formatPersonNameOrPlaceholder,
  personNameOrder,
  sortPersonNames,
  type PersonNameOptions,
  type PersonNameParts,
  type PersonSortKey,
} from './names';

export {
  ADDRESS_COUNTRIES,
  addressFieldsFor,
  addressSchemaFor,
  formatAddress,
  formatAddressLines,
  missingAddressFields,
  type AddressField,
  type AddressLevel,
  type CountryAddressSchema,
  type LocaleAddress,
} from './addresses';

export {
  DIAL_CODES,
  dialCodeForCountry,
  formatPhone,
  isValidE164,
  normalisePhone,
  phoneCountryOfLocale,
  phonePlaceholder,
  type PhoneCountryFormat,
  type PhoneDisplayStyle,
  type PhoneFormatOptions,
  type PhoneParseOptions,
  type PhoneParseResult,
} from './phones';

export { hasRtlText, isolateLtrText, isolateMixedText, textDirection } from './text';
