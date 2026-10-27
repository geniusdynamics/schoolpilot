// ABOUTME: Cross-field checks a country pack needs that JSON Schema cannot state: unique scheme ids,
// ABOUTME: scheme ids under the country's own prefix, resolving source refs and label keys, compiling patterns.

import type { CountryPack } from '../types';

/** Everything wrong with a country pack beyond what its schema checks; empty when it is sound. */
export function checkCountryPackSemantics(
  pack: CountryPack,
  labels: Readonly<Record<string, string>>
): string[] {
  const problems: string[] = [];
  const prefix = `${pack.country.toLowerCase()}.`;

  if (pack.id !== `country-${pack.country.toLowerCase()}`) {
    problems.push(`id ${pack.id} does not match country ${pack.country}`);
  }

  const sourceIds = new Set<string>();
  for (const source of pack.sources) {
    if (sourceIds.has(source.id)) problems.push(`duplicate source id ${source.id}`);
    sourceIds.add(source.id);
  }
  const needsSource = (where: string, ref: string | undefined) => {
    if (ref !== undefined && !sourceIds.has(ref)) problems.push(`${where}: sourceRef ${ref} is not a source`);
  };
  const needsLabel = (where: string, key: string) => {
    if (!(key in labels)) problems.push(`${where}: label key ${key} is not in locales/en.json`);
  };

  const schemes = new Set<string>();
  for (const identifier of pack.identifiers) {
    const where = `identifier ${identifier.scheme}`;
    if (!identifier.scheme.startsWith(prefix)) problems.push(`${where}: does not start with ${prefix}`);
    if (schemes.has(identifier.scheme)) problems.push(`${where}: duplicate scheme`);
    schemes.add(identifier.scheme);
    needsLabel(where, identifier.labelKey);
    needsLabel(where, identifier.hintKey);
    needsSource(where, identifier.sourceRef);
    if (identifier.validation.type === 'pattern') {
      try {
        new RegExp(identifier.validation.pattern);
      } catch {
        problems.push(`${where}: pattern does not compile`);
      }
    }
  }

  const levelKeys = new Set<string>();
  for (const level of pack.addressHierarchy.levels) {
    if (levelKeys.has(level.key)) problems.push(`address level ${level.key}: duplicate key`);
    levelKeys.add(level.key);
    needsLabel(`address level ${level.key}`, level.labelKey);
    const codes = new Set<string>();
    for (const option of level.options?.values ?? []) {
      if (codes.has(option.code)) problems.push(`address level ${level.key}: duplicate option ${option.code}`);
      codes.add(option.code);
    }
  }
  const postalPattern = pack.addressHierarchy.postalCode.pattern;
  if (postalPattern !== undefined) {
    try {
      new RegExp(postalPattern);
    } catch {
      problems.push('postal code pattern does not compile');
    }
  }

  const holidayIds = new Set<string>();
  for (const holiday of pack.holidays) {
    const where = `holiday ${holiday.id}`;
    if (holidayIds.has(holiday.id)) problems.push(`${where}: duplicate id`);
    holidayIds.add(holiday.id);
    needsLabel(where, holiday.nameKey);
    needsSource(where, holiday.sourceRef);
    if (holiday.effectiveTo !== null && holiday.effectiveTo < holiday.effectiveFrom) {
      problems.push(`${where}: effectiveTo is before effectiveFrom`);
    }
  }

  const returnIds = new Set<string>();
  for (const statutoryReturn of pack.statutoryReturns) {
    const where = `statutory return ${statutoryReturn.id}`;
    if (returnIds.has(statutoryReturn.id)) problems.push(`${where}: duplicate id`);
    returnIds.add(statutoryReturn.id);
    needsLabel(where, statutoryReturn.nameKey);
    needsSource(where, statutoryReturn.sourceRef);
  }

  return problems;
}
