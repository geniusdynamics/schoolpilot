// ABOUTME: The named sequences the product issues documents from, and the lookup that resolves a
// ABOUTME: name to its format, scope and reset policy.

import { SequenceDefinitionError } from './errors';
import { validateDefinition } from './scope';
import type { SequenceDefinition } from './types';

/**
 * The built-in sequences.
 *
 * The patterns follow the product spec: admission numbers are per institution and year
 * (`04-student-lifecycle.md` §3), invoice numbers carry the year and term (`05-finance.md` §4),
 * receipt numbers carry the year and are never reused (`05-finance.md` §6). `student_number`
 * shows a scope with no reset, and `credit_note` / `payment_voucher` are the next two documents
 * the finance module needs.
 */
export const SEQUENCE_DEFINITIONS = {
  admission: {
    name: 'admission',
    pattern: 'ADM/{YYYY}/{SEQ:3}',
    scope: ['institution', 'year'],
    reset: 'yearly',
  },
  invoice: {
    name: 'invoice',
    pattern: 'INV/{YYYY}/{TERM}/{SEQ:6}',
    scope: ['institution', 'year', 'term'],
    reset: 'yearly',
  },
  receipt: {
    name: 'receipt',
    pattern: 'RCT/{YYYY}/{SEQ:6}',
    scope: ['institution', 'year'],
    reset: 'yearly',
  },
  credit_note: {
    name: 'credit_note',
    pattern: 'CRN/{YYYY}/{SEQ:6}',
    scope: ['institution', 'year'],
    reset: 'yearly',
  },
  payment_voucher: {
    name: 'payment_voucher',
    pattern: 'PV/{YYYY}/{SEQ:6}',
    scope: ['institution', 'year'],
    reset: 'yearly',
  },
  student_number: {
    name: 'student_number',
    pattern: '{INST}/{SEQ:5}',
    scope: ['institution'],
    reset: 'never',
  },
} as const satisfies Record<string, SequenceDefinition>;

/** The name of a built-in sequence. */
export type NamedSequence = keyof typeof SEQUENCE_DEFINITIONS;

/** Every built-in definition, keyed by name. */
export type SequenceCatalog = Readonly<Record<string, SequenceDefinition>>;

/** The built-in catalog, as a plain record. */
export const CATALOG: SequenceCatalog = SEQUENCE_DEFINITIONS;

/** The names of the built-in sequences. */
export function sequenceNames(): readonly string[] {
  return Object.keys(SEQUENCE_DEFINITIONS);
}

/** Resolves a name in a catalog; throws a {@link SequenceDefinitionError} when it is unknown. */
export function definitionFor(name: string, catalog: SequenceCatalog = CATALOG): SequenceDefinition {
  const definition = catalog[name];
  if (!definition) {
    throw new SequenceDefinitionError(`unknown sequence "${name}"; known: ${Object.keys(catalog).join(', ')}`);
  }
  return definition;
}

// A built-in definition that cannot be issued is a programming error, not a runtime condition, so
// the catalog is checked when the module loads rather than on the first allocation.
for (const definition of Object.values(SEQUENCE_DEFINITIONS)) {
  validateDefinition(definition);
}
