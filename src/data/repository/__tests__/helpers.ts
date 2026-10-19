// ABOUTME: Shared fixtures for the repository integration tests: a real SQLite database, a
// ABOUTME: seeded registry built from the canonical fixtures, and helpers to derive valid inputs.

import { createNodeSqliteAdapter, type SqliteAdapter } from '@/data/adapters/sqlite';
import { asId, type Id } from '@/domain/ids';
import { storageFor, type EntityName } from '@/domain/schema';
import { validFixtures } from '@/domain/schema/__tests__/fixtures';

import { createRepository, type CreateInput, type Repository } from '..';

/** The entities in the order their references allow them to be created. */
export const SEED_ORDER: readonly EntityName[] = [
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

/** The acting user id the tests write with. */
export const TEST_ACTOR = '01930000-0000-7000-8000-00000000aa01';

/** A repository over a real SQLite database. */
export interface TestContext {
  readonly repository: Repository;
  readonly adapter: SqliteAdapter;
  /** The id every seeded row got, keyed by the id of the fixture it came from. */
  readonly ids: ReadonlyMap<string, string>;
}

/** Opens a real database with the repository set up on it. */
export async function createTestContext(): Promise<TestContext> {
  const adapter = createNodeSqliteAdapter({ filename: ':memory:', foreignKeys: true });
  await adapter.open();

  const repository = createRepository({ adapter, actor: TEST_ACTOR });
  await repository.setup();

  const ids = await seedRegistry(repository);
  // Flush the deliveries the seed produced, so a watcher starts from a quiet database.
  await repository.whenIdle();
  return { repository, adapter, ids };
}

/** The id a seeded fixture row got. */
export function seededId<E extends EntityName>(context: TestContext, entity: E): Id<E> {
  const fixtureId = String((validFixtures[entity] as unknown as { id: string }).id);
  const created = context.ids.get(fixtureId);
  if (!created) throw new Error(`the ${entity} fixture was not seeded`);
  return asId<E>(created);
}

/** Closes the database of a context. */
export async function closeTestContext(context: TestContext | undefined): Promise<void> {
  await context?.adapter.close();
}

/** Creates every canonical row from the fixtures, in reference order. */
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

/** The fixture of an entity without the fields the repository owns. */
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

/**
 * A valid input for an entity: the fixture without the server-owned fields, with every
 * reference pointing at the rows the context actually holds.
 */
export function fixtureInput<E extends EntityName>(
  context: TestContext,
  entity: E,
  overrides: Readonly<Record<string, unknown>> = {}
): CreateInput<E> {
  const fixture = validFixtures[entity] as unknown as Record<string, unknown>;
  const input = rewriteReferences(stripServerOwned(fixture), context.ids) as Record<
    string,
    unknown
  >;
  return { ...input, ...overrides } as CreateInput<E>;
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

/** The reference columns of an entity, for tests that need to break one. */
export function referenceColumns(entity: EntityName): readonly string[] {
  return Object.keys(storageFor(entity).refs);
}
