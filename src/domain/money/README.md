# The money module

Money in this platform is an **integer count of minor units and a currency code**, and nothing
else. No amount is ever held as a major-unit `number`: `15.05` is `{ amount_minor: 1505,
currency: 'KES' }`, and `150000` Ugandan shillings is `{ amount_minor: 150000, currency: 'UGX' }`
because the shilling has no subunit.

```ts
import { allocate, formatMoney, fromMajor, fromMinor, add } from '@/domain/money';

const fee = fromMajor('1500.55', 'KES');   // 150,055 minor units
const paid = fromMinor(50000, 'KES');      // 500.00
const balance = subtract(fee, paid);       // 100,055 minor units
formatMoney(balance);                      // "Ksh 1,000.55"
allocate(fee, [1, 1, 1]);                  // three parts that sum back to 150,055 exactly
```

## Why the amount is not a float

A float cannot hold `0.1` and `0.2` exactly, so `0.1 + 0.2` is `0.30000000000000004`, and a total
of a thousand fees drifts in the last cent. The module therefore:

- holds the amount as a whole number of minor units and does every sum, difference and product in
  `bigint`, narrowing to `number` only through `toMinorUnits`, which refuses anything outside the
  safe integer range;
- refuses to read a decimal that carries more precision than the currency holds, instead of
  rounding it silently: `fromMajor('1.005', 'KES')` throws `over_precision`;
- rounds a rational scaling only where the caller names the rule, in `multiplyRational`.

## The API

### The value and its boundaries

| Export | Signature | What it does |
| --- | --- | --- |
| `Money` | `{ readonly amount_minor: number; readonly currency: CurrencyCode }` | The value. Plain and JSON-safe. |
| `fromMinor` | `(amountMinor: number, currency: CurrencyCode) => Money` | From whole minor units. Refuses a non-integer or out-of-range amount. |
| `fromMajor` | `(amount: number \| string, currency: CurrencyCode) => Money` | The validating boundary from a decimal. Refuses over-precision. |
| `zero` | `(currency: CurrencyCode) => Money` | The zero of a currency, the seed of a sum. |
| `toDecimalString` | `(value: Money) => string` | The exact major-unit text, `"1500.55"` / `"150000"`. |
| `toMinorUnits` | `(value: bigint) => number` | The module's only bigint→number bridge, for a caller that divided in bigint. |
| `isMoney` | `(value: unknown) => value is Money` | Shape guard for a boundary. |
| `MAX_AMOUNT_MINOR` | `number` | `Number.MAX_SAFE_INTEGER`, the largest amount the type holds. |

### Arithmetic

| Export | Signature | Notes |
| --- | --- | --- |
| `add` / `subtract` | `(left: Money, right: Money) => Money` | Different currencies are a `currency_mismatch`, never a coercion. |
| `negate` / `abs` | `(value: Money) => Money` | |
| `multiply` | `(value: Money, factor: number) => Money` | An integer factor; exact. |
| `multiplyRational` | `(value, numerator, denominator, mode: RoundingMode) => Money` | `mode` is required: rounding a fraction of a minor unit is a policy. |
| `multiplyRationalExact` | `(value, numerator, denominator) => Money` | Refuses (`not_exact`) when the result is not a whole minor unit. |
| `compare` | `(left, right) => -1 \| 0 \| 1` | Currencies must match. |
| `equals` / `isZero` / `isNegative` / `isPositive` | `(value) => boolean` | |
| `sum` | `(values: readonly Money[]) => Money` | An empty list is refused: it has no currency. Reduce over `zero(currency)` instead. |
| `ROUNDING_MODES` | `readonly RoundingMode[]` | `half_up`, `half_down`, `half_even`, `up`, `down`. |

### Allocation

| Export | Signature |
| --- | --- |
| `allocate` | `(total: Money, weights: readonly number[]) => Money[]` |
| `allocateEqually` | `(total: Money, parts: number) => Money[]` |

**Algorithm.** Largest remainder. Each part takes the floor of its exact share
(`total × weight ÷ sum`), and the minor units the floors leave go one each to the parts with the
largest remainders. The parts **always sum to the total exactly**.

**Tie-break.** Parts with equal remainders are served in index order. The result is deterministic:
the same total and weights always give the same parts, and multiplying every weight by the same
positive factor changes nothing.

**Invariants** (property-tested, `__tests__/allocate.property.test.ts`):

- the parts sum to the total exactly, for every total and weight list;
- no part is negative when the total is not, and no part is positive when the total is negative;
- the result has one part per weight, all in the total's currency;
- scaling all weights by the same positive factor leaves the result unchanged;
- a zero total gives every part zero;
- weights that are all zero, or an empty weight list, are refused for a non-zero total.

### Currency table

`CURRENCIES` is not exported as a record; use `getCurrency(code)`, `currencyDecimals(code)`,
`currencyDisplayDecimals(code)`, `currencyLocale(code)`, `isCurrencyCode(value)` and
`CURRENCY_CODES`.

| Code | Decimals | Symbol | Name |
| --- | --- | --- | --- |
| KES | 2 | KSh | Kenyan shilling |
| UGX | 0 | USh | Ugandan shilling |
| TZS | 2 (display 0) | TSh | Tanzanian shilling |
| RWF | 0 | RF | Rwandan franc |
| NGN | 2 | ₦ | Nigerian naira |
| GHS | 2 | GH₵ | Ghanaian cedi |
| ZAR | 2 | R | South African rand |
| USD | 2 | $ | United States dollar |
| EUR | 2 | € | Euro |
| GBP | 2 | £ | Pound sterling |
| XOF | 0 | CFA | West African CFA franc |
| XAF | 0 | FCFA | Central African CFA franc |

The table holds every currency a pack or the spec implies (the African currencies of spec 03's
appendices, the CFA zones, the DRC, Guinea) plus the currencies an international school prices in,
and one currency for each other exponent: 0 (JPY, KRW, VND, GNF, KMF) and 3 (KWD and the Gulf
dinars). An unknown code is a `unknown_currency` error, never a default.

### Display

| Export | Signature | Notes |
| --- | --- | --- |
| `formatMoney` | `(value: Money, locale?: string) => string` and `(value: number \| null \| undefined, currency: CurrencyCode, locale?: string) => string` | The `Money` form is exact (the amount becomes decimal text, never a double). The number form is a legacy bridge: the number is major units and the formatter rounds it for display. |
| `formatMoneyCompact` | the same two forms | Compact notation for charts and tight columns. |
| `NO_AMOUNT` | `'—'` | What a missing amount renders as. |

`formatKES` and `formatKESCompact` in `@/utils/format` are deprecated wrappers over these.

## Errors

`MoneyError` carries a `code`: `unknown_currency`, `currency_mismatch`, `invalid_amount`,
`over_precision`, `not_exact`, `invalid_weight`.

## The module

| File | Holds |
| --- | --- |
| `money.ts` | The value, its boundaries and its arithmetic. |
| `currency.ts` | The currency table and its lookups. |
| `allocate.ts` | The largest-remainder allocator. |
| `format.ts` | Display. |
| `errors.ts` | `MoneyError` and its codes. |
| `index.ts` | The public API; a caller imports from here. |

## The tests

| File | Guards |
| --- | --- |
| `__tests__/money.property.test.ts` | The arithmetic invariants (seeded fast-check) and every refusal. |
| `__tests__/allocate.property.test.ts` | The allocation invariants (seeded fast-check). |
| `__tests__/currency.test.ts` | The table's shape and the exponents the acceptance names. |
| `__tests__/format.test.ts` | The rendered strings, including UGX and zero. |
| `__tests__/noFloat.test.ts` | That the arithmetic files hold no float construct. |
