// ABOUTME: Seeding for the repository integration harness: the canonical fixtures of the entity
// ABOUTME: registry, written in reference order against a real database, with the ids they got.

import { asId, type Id } from '@/domain/ids';
import { validFixtures } from '@/domain/schema/__tests__/fixtures';
import { ENTITY_NAMES, storageFor, type EntityName } from '@/domain/schema';

import type { CreateInput, Repository } from '@/data/repository';

import { referenceOrder } from './order';

/**
 * The entities in the order their references allow them to be created.
 *
 * This is the hand-written order, kept as the preference: an entity the registry gains
 * later is placed after the entities it depends on, so the list stays a valid creation
 * order without a second list to forget. The result is the seed order of every
 * registered entity, and nothing else names one.
 */
const BASE_SEED_ORDER: readonly EntityName[] = [
  'institution',
  'institution_identifier',
  'campus',
  'user',
  'job_title',
  'staff',
  'department',
  'house',
  'residence',
  'residence_bed',
  'calendar',
  'calendar_event',
  'financial_year',
  'academic_year',
  'academic_period',
  'curriculum_pack',
  'programme',
  'stage',
  'level',
  'pathway',
  'learning_area',
  'component',
  'outcome',
  'competency',
  'combination_rule',
  'guardian',
  'household',
  'learner',
  'sponsorship',
  'class_group',
  'enrolment',
  'teaching_group',
  'teaching_group_member',
  'teaching_assignment',
  'timetable_slot',
  'timetable_entry',
  'identifier',
  'learner_guardian',
  'enrolment_change',
  'learning_area_enrolment',
  'promotion_decision',
  'assessment_scheme',
  'grading_scale',
  'assessment',
  'mark',
  'competency_observation',
  'result',
  'period_result',
  'report_card',
  'comment_bank_entry',
  'fee_category',
  'fee_item',
  'installment_plan',
  'fee_schedule',
  'fee_schedule_line',
  'discount_rule',
  'invoice',
  'invoice_line',
  'credit_note',
  'payment',
  'payment_allocation',
  'receipt',
  'refund',
];

/**
 * Every registered entity, in an order their references allow them to be created.
 *
 * The order is derived from the registry, so an entity that is registered later is
 * seeded as soon as it exists and the seed order can never fall behind the registry.
 */
export const SEED_ORDER: readonly EntityName[] = referenceOrder(ENTITY_NAMES, BASE_SEED_ORDER);

/** The acting user id the harness writes with. */
export const TEST_ACTOR = '01930000-0000-7000-8000-00000000aa01';

/**
 * The seeded state of a database: which id every fixture row got, and the inputs a test
 * needs to write another row of the same shape.
 */
export interface Seed {
  /** The id every seeded row got, keyed by the id of the fixture it came from. */
  readonly ids: ReadonlyMap<string, string>;
  /** The id the fixture row of an entity got. */
  idOf<E extends EntityName>(entity: E): Id<E>;
  /** The fixture of an entity, without the fields the repository owns. */
  fixtureOf<E extends EntityName>(entity: E): Record<string, unknown>;
  /**
   * A valid input for an entity: the fixture without the server-owned fields, with every
   * reference pointing at the rows the database actually holds.
   */
  inputFor<E extends EntityName>(
    entity: E,
    overrides?: Readonly<Record<string, unknown>>
  ): CreateInput<E>;
}

/** The fixture of an entity, without the fields the repository owns. */
export function stripServerOwned(
  fixture: Readonly<Record<string, unknown>>
): Record<string, unknown> {
  const copy: Record<string, unknown> = { ...fixture };
  delete copy.id;
  delete copy.created_at;
  delete copy.updated_at;
  delete copy.created_by;
  delete copy.updated_by;
  delete copy.deleted_at;
  return copy;
}

/** Replaces every id of the fixtures with the id the seeded row actually got. */
export function rewriteReferences(value: unknown, ids: ReadonlyMap<string, string>): unknown {
  if (typeof value === 'string') return ids.get(value) ?? value;
  if (Array.isArray(value)) return value.map((entry) => rewriteReferences(entry, ids));
  if (value !== null && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const rewritten: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(record)) {
      rewritten[key] = rewriteReferences(entry, ids);
    }
    return rewritten;
  }
  return value;
}

/**
 * Creates every canonical row from the fixtures, in reference order.
 *
 * The returned map holds the id each row actually got, keyed by the id of the fixture it
 * came from, so a caller can point a new row at a seeded one.
 */
export async function seedRegistry(
  repository: Repository,
  entities: readonly EntityName[] = SEED_ORDER
): Promise<Map<string, string>> {
  const ids = new Map<string, string>();

  for (const entity of entities) {
    const fixture = validFixtures[entity] as unknown as Record<string, unknown>;
    const input = rewriteReferences(stripServerOwned(fixture), ids);
    const created = await repository.create(entity, input as CreateInput<EntityName>);
    ids.set(String(fixture.id), created.id);
  }

  return ids;
}

/** The seeded state of a database, built from the ids the seed produced. */
export function createSeed(ids: ReadonlyMap<string, string>): Seed {
  const fixtureId = (entity: EntityName): string =>
    String((validFixtures[entity] as unknown as { id: string }).id);

  return {
    ids,
    idOf<E extends EntityName>(entity: E): Id<E> {
      const created = ids.get(fixtureId(entity));
      if (!created) throw new Error(`the ${entity} fixture was not seeded`);
      return asId<E>(created);
    },
    fixtureOf<E extends EntityName>(entity: E): Record<string, unknown> {
      const fixture = validFixtures[entity] as unknown as Record<string, unknown>;
      return { ...fixture };
    },
    inputFor<E extends EntityName>(
      entity: E,
      overrides: Readonly<Record<string, unknown>> = {}
    ): CreateInput<E> {
      return fixtureInput({ ids }, entity, overrides);
    },
  };
}

/**
 * A valid input for an entity: the fixture without the server-owned fields, with every
 * reference pointing at the rows the database actually holds.
 *
 * The context is anything that knows the seeded ids, so the repository tests and the
 * harness share one implementation.
 */
export function fixtureInput<E extends EntityName>(
  context: { readonly ids: ReadonlyMap<string, string> },
  entity: E,
  overrides: Readonly<Record<string, unknown>> = {}
): CreateInput<E> {
  const fixture = validFixtures[entity] as unknown as Record<string, unknown>;
  const input = rewriteReferences(stripServerOwned(fixture), context.ids) as Record<string, unknown>;
  return { ...input, ...overrides } as CreateInput<E>;
}

/** The id the fixture row of an entity got. */
export function seededId<E extends EntityName>(
  context: { readonly seed: Seed },
  entity: E
): Id<E> {
  return context.seed.idOf(entity);
}

/**
 * The entities to seed for a request: the wanted ones and every entity they reference.
 *
 * A row whose reference does not resolve is refused by the repository, so a context that
 * seeds only part of the registry has to seed the ancestors of what it seeds as well.
 */
export function withAncestors(wanted: readonly EntityName[]): readonly EntityName[] {
  const byTable = new Map(ENTITY_NAMES.map((entity) => [storageFor(entity).table, entity]));
  const seeded = new Set<EntityName>(wanted);
  const queue: EntityName[] = [...wanted];

  while (queue.length > 0) {
    const entity = queue.pop() as EntityName;
    for (const target of Object.values(storageFor(entity).refs)) {
      const parent = byTable.get(target);
      if (!parent || seeded.has(parent)) continue;
      seeded.add(parent);
      queue.push(parent);
    }
  }

  // The seed order keeps the ancestors before the rows that point at them.
  return SEED_ORDER.filter((entity) => seeded.has(entity));
}

/** The reference columns of an entity, for tests that need to break one. */
export function referenceColumns(entity: EntityName): readonly string[] {
  return Object.keys(storageFor(entity).refs);
}
