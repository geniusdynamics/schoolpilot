// ABOUTME: Identifier schemes of a country pack: the schemes offered for an owner type and the
// ABOUTME: validation of a value against its scheme, normalising it the way the pack says.

import { countryLabels, getCountryPack } from './registry';
import type {
  CountryIdentifier,
  IdentifierNormalisation,
  IdentifierSchemeOption,
  IdentifierValidationResult,
  OwnerType,
} from './types';

/** The longest identifier value the admission form stores. */
const MAX_IDENTIFIER_LENGTH = 200;

/**
 * The schemes a country offers for an owner type, in the order the pack ranks them.
 *
 * A scheme without a rank for the owner type follows the ranked ones in pack order.
 */
export function identifierSchemesFor(
  country: string | null | undefined,
  ownerType: OwnerType
): IdentifierSchemeOption[] {
  const pack = getCountryPack(country);
  if (!pack) return [];
  const labels = countryLabels(country);
  return pack.identifiers
    .map((identifier, index) => ({ identifier, index }))
    .filter(({ identifier }) => identifier.appliesTo.includes(ownerType))
    .sort(
      (left, right) =>
        (left.identifier.order?.[ownerType] ?? Number.MAX_SAFE_INTEGER) -
          (right.identifier.order?.[ownerType] ?? Number.MAX_SAFE_INTEGER) || left.index - right.index
    )
    .map(({ identifier }) => {
      const hint = labels[identifier.hintKey];
      return {
        value: identifier.scheme,
        label: labels[identifier.labelKey] ?? identifier.scheme,
        ...(hint ? { hint } : {}),
      };
    });
}

/** The order the pack's normalisations are applied in, whatever order the pack lists them. */
const NORMALISATION_ORDER: readonly IdentifierNormalisation[] = [
  'trim',
  'remove_spaces',
  'remove_hyphens',
  'uppercase',
];

function normalise(value: string, steps: readonly IdentifierNormalisation[]): string {
  let result = value;
  for (const step of NORMALISATION_ORDER) {
    if (!steps.includes(step)) continue;
    if (step === 'trim') result = result.trim();
    else if (step === 'remove_spaces') result = result.replace(/\s+/g, '');
    else if (step === 'remove_hyphens') result = result.replace(/-/g, '');
    else result = result.toUpperCase();
  }
  return result;
}

function schemeOf(country: string | null | undefined, scheme: string): CountryIdentifier | undefined {
  return getCountryPack(country)?.identifiers.find((identifier) => identifier.scheme === scheme);
}

/**
 * Checks a value against its scheme's validation and returns the value to store.
 *
 * A `pattern` scheme is normalised, then the whole value must match; a `free` scheme claims no
 * format, so only an empty or oversize value is refused and the value is stored trimmed.
 */
export function validateIdentifier(
  country: string | null | undefined,
  scheme: string,
  value: string
): IdentifierValidationResult {
  const definition = schemeOf(country, scheme);
  if (!definition) {
    return { ok: false, message: `${scheme} is not an identifier scheme of this country.` };
  }
  const labels = countryLabels(country);
  const label = labels[definition.labelKey] ?? scheme;
  const hint = labels[definition.hintKey];

  const stored =
    definition.validation.type === 'pattern'
      ? normalise(value, definition.validation.normalise)
      : value.trim();
  if (stored === '') return { ok: false, message: `Enter the ${label}.` };
  if (stored.length > MAX_IDENTIFIER_LENGTH) {
    return { ok: false, message: `The ${label} is longer than ${MAX_IDENTIFIER_LENGTH} characters.` };
  }
  if (definition.validation.type === 'pattern' && !new RegExp(definition.validation.pattern).test(stored)) {
    return { ok: false, message: hint ? `Not a valid ${label}. ${hint}` : `Not a valid ${label}.` };
  }
  return { ok: true, value: stored };
}
