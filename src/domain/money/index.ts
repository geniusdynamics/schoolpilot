// ABOUTME: The public API of the money module: the money value and its arithmetic, the currency
// ABOUTME: table, the largest-remainder allocator and the display formatter. A caller imports
// ABOUTME: from here, never from a file inside the module.

export { MoneyError, type MoneyErrorCode } from './errors';

export {
  CURRENCY_CODES,
  currencyDecimals,
  currencyDisplayDecimals,
  currencyLocale,
  getCurrency,
  isCurrencyCode,
  type CurrencyCode,
  type CurrencyDefinition,
  type CurrencyFacts,
} from './currency';

export {
  MAX_AMOUNT_MINOR,
  ROUNDING_MODES,
  abs,
  add,
  compare,
  equals,
  fromMajor,
  fromMinor,
  isMoney,
  isNegative,
  isPositive,
  isZero,
  multiply,
  multiplyRational,
  multiplyRationalExact,
  negate,
  subtract,
  sum,
  toDecimalString,
  toMinorUnits,
  zero,
  type Money,
  type RoundingMode,
} from './money';

export { allocate, allocateEqually } from './allocate';

export { NO_AMOUNT, formatMoney, formatMoneyCompact } from './format';
