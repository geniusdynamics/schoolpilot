// ABOUTME: Person names in a locale: the given/family order a locale writes, a single-name learner,
// ABOUTME: several middle names, a preferred name, and sorting by the institution's configured key.

import { activeLocale, nameOrderOfLocale, resolveLocale, type NameOrder } from './locales';

/** What a missing name renders as, the app's placeholder for "no value". */
export const NO_NAME = '—';

/** The name fields of the people schema, as a formatter reads them. */
export interface PersonNameParts {
  readonly given_name?: string;
  readonly middle_names?: readonly string[];
  readonly family_name?: string;
  readonly preferred_name?: string;
  readonly name_order?: NameOrder;
}

export interface PersonNameOptions {
  readonly locale?: string;
  /** Overrides the person's own `name_order` and the locale's default. */
  readonly order?: NameOrder;
  /** Use `preferred_name` where there is one; the app's lists do. Default true. */
  readonly usePreferredName?: boolean;
  readonly includeMiddleNames?: boolean;
}

/** Which name a sort keys on. */
export type PersonSortKey = 'family' | 'given';

const COLLATORS = new Map<string, Intl.Collator>();

function collatorFor(locale: string): Intl.Collator {
  const tag = resolveLocale(locale).tag;
  const cached = COLLATORS.get(tag);
  if (cached) return cached;
  // `sensitivity: 'base'` folds case and accents, so "élodie" and "Elodie" sort together;
  // `numeric` keeps "Class 2" before "Class 10" for names that carry numbers.
  const collator = new Intl.Collator(tag, { sensitivity: 'base', numeric: true });
  COLLATORS.set(tag, collator);
  return collator;
}

function clean(part?: string): string {
  return (part ?? '').trim().replace(/\s+/g, ' ');
}

/** The name order a person's record asks for, else the locale's own. */
export function personNameOrder(person: PersonNameParts, locale: string = activeLocale()): NameOrder {
  return person.name_order ?? nameOrderOfLocale(locale);
}

/**
 * Writes a person's name in the locale's order.
 *
 * `en-GB` (given first): "Amina Nyambura Wanjiku Otieno". `hu-HU` (family first): "Otieno Amina
 * Nyambura Wanjiku". A single-name learner whose family name repeats the given name is written
 * once, and blank parts leave no stray spaces.
 */
export function formatPersonName(person: PersonNameParts, options: PersonNameOptions = {}): string {
  const locale = options.locale ?? activeLocale();
  const order = options.order ?? personNameOrder(person, locale);
  const given = clean(
    options.usePreferredName === false
      ? person.given_name
      : person.preferred_name || person.given_name
  );
  const middles =
    options.includeMiddleNames === false
      ? []
      : (person.middle_names ?? []).map(clean).filter(Boolean);
  const family = clean(person.family_name);
  const givenParts = [given, ...middles].filter(Boolean);

  // A learner recorded with one name keeps one name: the family name is not repeated.
  const familyIsDistinct = family !== '' && family.toLowerCase() !== given.toLowerCase();
  if (!familyIsDistinct) return givenParts.join(' ');
  return order === 'family_first' ? [family, ...givenParts].join(' ') : [...givenParts, family].join(' ');
}

/** `formatPersonName`, or the placeholder when every part is blank. */
export function formatPersonNameOrPlaceholder(
  person: PersonNameParts,
  options: PersonNameOptions = {}
): string {
  return formatPersonName(person, options) || NO_NAME;
}

/** Orders two names by the institution's configured key, using the locale's collation. */
export function comparePersonNames(
  a: PersonNameParts,
  b: PersonNameParts,
  locale: string = activeLocale(),
  key: PersonSortKey = 'family'
): number {
  const collator = collatorFor(locale);
  const aParts = key === 'family' ? [a.family_name, a.given_name] : [a.given_name, a.family_name];
  const bParts = key === 'family' ? [b.family_name, b.given_name] : [b.given_name, b.family_name];
  for (let index = 0; index < aParts.length; index += 1) {
    const compared = collator.compare(clean(aParts[index]), clean(bParts[index]));
    if (compared !== 0) return compared;
  }
  return 0;
}

/** A new array of names sorted by the configured key; the input is left alone. */
export function sortPersonNames<T extends PersonNameParts>(
  names: readonly T[],
  locale: string = activeLocale(),
  key: PersonSortKey = 'family'
): T[] {
  return [...names].sort((a, b) => comparePersonNames(a, b, locale, key));
}
