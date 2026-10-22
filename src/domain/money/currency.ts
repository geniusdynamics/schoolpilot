// ABOUTME: The currency table of the platform: each ISO 4217 code the product meets, with its
// ABOUTME: minor-unit exponent (the decimals a stored amount is scaled by), its symbol, its name
// ABOUTME: and the locale its default display uses.

import { MoneyError } from './errors';

/**
 * What the table says about one currency.
 *
 * `decimals` is the exponent: an amount is stored as a whole number of minor units, and
 * `10 ** decimals` minor units make one major unit. It is 0 for the shillings and francs that
 * have no subunit (UGX, RWF, XOF, XAF, GNF, KMF), 2 for most currencies and 3 for the dinars
 * that are divided into a thousand fils.
 *
 * `displayDecimals` is only present when the display default differs from the exponent: the
 * Tanzanian shilling is stored with two decimals but is shown in whole shillings by default
 * (spec 05 §1).
 */
export interface CurrencyFacts {
  readonly decimals: number;
  readonly symbol: string;
  readonly name: string;
  /** The BCP-47 locale a formatter uses when the caller names none. */
  readonly locale: string;
  readonly displayDecimals?: number;
}

/** A currency of the table, with the code it is keyed by. */
export interface CurrencyDefinition extends CurrencyFacts {
  readonly code: CurrencyCode;
}

/**
 * The currencies this product will meet.
 *
 * Coverage is deliberate: every country whose curriculum pack exists or is planned (Kenya,
 * Uganda, Tanzania, Rwanda, Nigeria, Ghana, South Africa, Zambia, Malawi, Zimbabwe, Botswana,
 * Namibia, Ethiopia, Egypt, Morocco, Mozambique, Angola, Sudan, South Sudan, Somalia, the DRC,
 * Guinea, the CFA zones), the currencies an international school prices in (USD, EUR, GBP,
 * CHF, CAD, AUD), and one currency for each other exponent a real school could meet: JPY, KRW
 * and VND at 0 decimals, KWD and the other Gulf dinars at 3.
 */
const TABLE = {
  AED: { decimals: 2, symbol: 'AED', name: 'UAE dirham', locale: 'en-AE' },
  AOA: { decimals: 2, symbol: 'Kz', name: 'Angolan kwanza', locale: 'pt-AO' },
  AUD: { decimals: 2, symbol: 'A$', name: 'Australian dollar', locale: 'en-AU' },
  BDT: { decimals: 2, symbol: 'BDT', name: 'Bangladeshi taka', locale: 'bn-BD' },
  BHD: { decimals: 3, symbol: 'BD', name: 'Bahraini dinar', locale: 'en-BH' },
  BWP: { decimals: 2, symbol: 'P', name: 'Botswana pula', locale: 'en-BW' },
  CAD: { decimals: 2, symbol: 'C$', name: 'Canadian dollar', locale: 'en-CA' },
  CDF: { decimals: 2, symbol: 'FC', name: 'Congolese franc', locale: 'fr-CD' },
  CHF: { decimals: 2, symbol: 'CHF', name: 'Swiss franc', locale: 'de-CH' },
  CNY: { decimals: 2, symbol: '¥', name: 'Chinese yuan', locale: 'zh-CN' },
  DKK: { decimals: 2, symbol: 'kr', name: 'Danish krone', locale: 'da-DK' },
  EGP: { decimals: 2, symbol: 'E£', name: 'Egyptian pound', locale: 'en-EG' },
  ETB: { decimals: 2, symbol: 'Br', name: 'Ethiopian birr', locale: 'en-ET' },
  EUR: { decimals: 2, symbol: '€', name: 'Euro', locale: 'en-IE' },
  GBP: { decimals: 2, symbol: '£', name: 'Pound sterling', locale: 'en-GB' },
  GHS: { decimals: 2, symbol: 'GH₵', name: 'Ghanaian cedi', locale: 'en-GH' },
  GMD: { decimals: 2, symbol: 'D', name: 'Gambian dalasi', locale: 'en-GM' },
  GNF: { decimals: 0, symbol: 'FG', name: 'Guinean franc', locale: 'fr-GN' },
  HKD: { decimals: 2, symbol: 'HK$', name: 'Hong Kong dollar', locale: 'en-HK' },
  IDR: { decimals: 2, symbol: 'Rp', name: 'Indonesian rupiah', locale: 'id-ID' },
  INR: { decimals: 2, symbol: '₹', name: 'Indian rupee', locale: 'en-IN' },
  JOD: { decimals: 3, symbol: 'JD', name: 'Jordanian dinar', locale: 'en-JO' },
  JPY: { decimals: 0, symbol: '¥', name: 'Japanese yen', locale: 'ja-JP' },
  KES: { decimals: 2, symbol: 'KSh', name: 'Kenyan shilling', locale: 'en-KE' },
  KMF: { decimals: 0, symbol: 'CF', name: 'Comorian franc', locale: 'fr-KM' },
  KRW: { decimals: 0, symbol: '₩', name: 'South Korean won', locale: 'ko-KR' },
  KWD: { decimals: 3, symbol: 'KD', name: 'Kuwaiti dinar', locale: 'en-KW' },
  LRD: { decimals: 2, symbol: 'L$', name: 'Liberian dollar', locale: 'en-LR' },
  LYD: { decimals: 3, symbol: 'LD', name: 'Libyan dinar', locale: 'en-LY' },
  MAD: { decimals: 2, symbol: 'DH', name: 'Moroccan dirham', locale: 'fr-MA' },
  MWK: { decimals: 2, symbol: 'MK', name: 'Malawian kwacha', locale: 'en-MW' },
  MXN: { decimals: 2, symbol: 'MX$', name: 'Mexican peso', locale: 'es-MX' },
  MYR: { decimals: 2, symbol: 'RM', name: 'Malaysian ringgit', locale: 'ms-MY' },
  MZN: { decimals: 2, symbol: 'MT', name: 'Mozambican metical', locale: 'pt-MZ' },
  NAD: { decimals: 2, symbol: 'N$', name: 'Namibian dollar', locale: 'en-NA' },
  NGN: { decimals: 2, symbol: '₦', name: 'Nigerian naira', locale: 'en-NG' },
  NOK: { decimals: 2, symbol: 'kr', name: 'Norwegian krone', locale: 'nb-NO' },
  NZD: { decimals: 2, symbol: 'NZ$', name: 'New Zealand dollar', locale: 'en-NZ' },
  OMR: { decimals: 3, symbol: 'OMR', name: 'Omani rial', locale: 'en-OM' },
  PHP: { decimals: 2, symbol: 'PHP', name: 'Philippine peso', locale: 'en-PH' },
  PKR: { decimals: 2, symbol: 'PKR', name: 'Pakistani rupee', locale: 'en-PK' },
  PLN: { decimals: 2, symbol: 'PLN', name: 'Polish zloty', locale: 'pl-PL' },
  QAR: { decimals: 2, symbol: 'QAR', name: 'Qatari riyal', locale: 'en-QA' },
  RWF: { decimals: 0, symbol: 'RF', name: 'Rwandan franc', locale: 'en-RW' },
  SAR: { decimals: 2, symbol: 'SAR', name: 'Saudi riyal', locale: 'en-SA' },
  SDG: { decimals: 2, symbol: 'SDG', name: 'Sudanese pound', locale: 'en-SD' },
  SEK: { decimals: 2, symbol: 'kr', name: 'Swedish krona', locale: 'sv-SE' },
  SGD: { decimals: 2, symbol: 'S$', name: 'Singapore dollar', locale: 'en-SG' },
  SLE: { decimals: 2, symbol: 'Le', name: 'Sierra Leonean leone', locale: 'en-SL' },
  SOS: { decimals: 2, symbol: 'Sh', name: 'Somali shilling', locale: 'en-SO' },
  SSP: { decimals: 2, symbol: 'SSP', name: 'South Sudanese pound', locale: 'en-SS' },
  THB: { decimals: 2, symbol: 'THB', name: 'Thai baht', locale: 'th-TH' },
  TND: { decimals: 3, symbol: 'DT', name: 'Tunisian dinar', locale: 'fr-TN' },
  TRY: { decimals: 2, symbol: 'TRY', name: 'Turkish lira', locale: 'tr-TR' },
  TZS: { decimals: 2, symbol: 'TSh', name: 'Tanzanian shilling', locale: 'en-TZ', displayDecimals: 0 },
  UGX: { decimals: 0, symbol: 'USh', name: 'Ugandan shilling', locale: 'en-UG' },
  USD: { decimals: 2, symbol: '$', name: 'United States dollar', locale: 'en-US' },
  VND: { decimals: 0, symbol: 'VND', name: 'Vietnamese dong', locale: 'vi-VN' },
  XAF: { decimals: 0, symbol: 'FCFA', name: 'Central African CFA franc', locale: 'fr-CM' },
  XOF: { decimals: 0, symbol: 'CFA', name: 'West African CFA franc', locale: 'fr-SN' },
  ZAR: { decimals: 2, symbol: 'R', name: 'South African rand', locale: 'en-ZA' },
  ZMW: { decimals: 2, symbol: 'ZK', name: 'Zambian kwacha', locale: 'en-ZM' },
  ZWG: { decimals: 2, symbol: 'ZiG', name: 'Zimbabwe Gold', locale: 'en-ZW' },
  ZWL: { decimals: 2, symbol: 'Z$', name: 'Zimbabwe dollar (legacy)', locale: 'en-ZW' },
} as const satisfies Record<string, CurrencyFacts>;

/** The ISO 4217 codes the table holds; a money value is counted in one of them. */
export type CurrencyCode = keyof typeof TABLE;

/** Every code of the table, in the table's order. */
export const CURRENCY_CODES = Object.keys(TABLE) as readonly CurrencyCode[];

/** True when a value is a code the table holds; the guard a boundary uses before it trusts one. */
export function isCurrencyCode(value: unknown): value is CurrencyCode {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(TABLE, value);
}

/** The definition of a code; a code the table does not hold is refused, never defaulted. */
export function getCurrency(code: string): CurrencyDefinition {
  if (!isCurrencyCode(code)) {
    throw new MoneyError(
      'unknown_currency',
      `"${code}" is not a currency of the table; add it to src/domain/money/currency.ts before it is used`
    );
  }
  return { code, ...TABLE[code] };
}

/** The exponent of a code: the number of decimal places a stored amount is scaled by. */
export function currencyDecimals(code: CurrencyCode): number {
  return getCurrency(code).decimals;
}

/** The decimals a code is displayed with by default (the exponent, unless the table says otherwise). */
export function currencyDisplayDecimals(code: CurrencyCode): number {
  const definition = getCurrency(code);
  return definition.displayDecimals ?? definition.decimals;
}

/** The locale a code is formatted in when the caller names none. */
export function currencyLocale(code: CurrencyCode): string {
  return getCurrency(code).locale;
}
