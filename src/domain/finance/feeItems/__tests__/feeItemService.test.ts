// ABOUTME: The fee-item module, proven against a real SQLite database: every rule and its refusal,
// ABOUTME: the CRUD path with its audit trail and soft delete, and the exact Money it sums.

import { afterEach, describe, expect, it } from 'vitest';

import {
  closeTestContext,
  createTestContext,
  TEST_ACTOR,
  type TestContext,
} from '@/data/__tests__/harness';
import { RepositoryConflictError, isRepositoryError, type AuditEvent } from '@/data/repository';
import { asId } from '@/domain/ids';
import { FEE_FUNDING_SOURCES } from '@/domain/schema';

import {
  FEE_ITEM_FUNDING_SOURCES,
  FeeItemError,
  FeeItemService,
  assertFeeAmount,
  assertFeeItemCategory,
  assertFeeItemCode,
  assertFeeItemName,
  assertFundingSource,
  assertGlAccountCode,
  assertPriority,
  compareFeeItemsForAllocation,
  glMappingOf,
  isFeeItemError,
  nextFreePriority,
  normaliseFeeItemCode,
  orderFeeItemsForAllocation,
  resolveGlAccountCode,
  type FeeItemInput,
  type FeeItemStore,
  type GlAccountDirectory,
} from '..';

const contexts: TestContext[] = [];
const OTHER_ACTOR = '01930000-0000-7000-8000-00000000bb02';

async function freshContext(): Promise<TestContext> {
  const context = await createTestContext();
  contexts.push(context);
  return context;
}

afterEach(async () => {
  await Promise.all(contexts.splice(0).map((context) => closeTestContext(context)));
});

function service(context: TestContext, actor?: string): FeeItemService {
  return new FeeItemService({
    repository: context.repository,
    ...(actor === undefined ? {} : { actor }),
  });
}

/** A valid input for a new item, with the institution of the seeded fixtures. */
function input(context: TestContext, overrides: Partial<FeeItemInput> = {}): FeeItemInput {
  return {
    institutionId: context.seed.idOf('institution'),
    code: 'ACTIVITY',
    name: 'Activity fee',
    category: 'activity',
    ...overrides,
  };
}

describe('the fee-item rules', () => {
  it('canonicalises a code and refuses one that is not well formed', () => {
    expect(normaliseFeeItemCode('  tuition ')).toBe('TUITION');
    expect(assertFeeItemCode('tuition')).toBe('TUITION');
    expect(assertFeeItemCode('DEV_LEVY_2')).toBe('DEV_LEVY_2');

    expect(() => assertFeeItemCode('')).toThrow(FeeItemError);
    expect(() => assertFeeItemCode('   ')).toThrow(FeeItemError);
    expect(() => assertFeeItemCode('TUITION 1')).toThrow(FeeItemError);
    expect(() => assertFeeItemCode('FEE-1')).toThrow(FeeItemError);
    expect(() => assertFeeItemCode(`_${'A'.repeat(50)}`)).toThrow(FeeItemError);
    expect(() => assertFeeItemCode('A'.repeat(51))).toThrow(FeeItemError);
    expect(isFeeItemError(catchOf(() => assertFeeItemCode('TUITION 1')), 'code_malformed')).toBe(true);
  });

  it('refuses an empty name', () => {
    expect(assertFeeItemName('  Tuition ')).toBe('Tuition');
    expect(isFeeItemError(catchOf(() => assertFeeItemName('   ')), 'name_required')).toBe(true);
  });

  it('accepts every declared category and refuses any other', () => {
    expect(assertFeeItemCategory('tuition')).toBe('tuition');
    expect(assertFeeItemCategory('development_levy')).toBe('development_levy');
    expect(isFeeItemError(catchOf(() => assertFeeItemCategory('tuitionn')), 'category_invalid')).toBe(
      true
    );
  });

  it('accepts every declared funding source, including capitation and bursary', () => {
    // The five the owner named, in the canonical spelling.
    expect([...FEE_ITEM_FUNDING_SOURCES]).toEqual([
      'parent',
      'bursary',
      'sponsor',
      'government_capitation',
      'government',
    ]);
    expect(FEE_ITEM_FUNDING_SOURCES).toBe(FEE_FUNDING_SOURCES);
    for (const source of FEE_ITEM_FUNDING_SOURCES) {
      expect(assertFundingSource(source)).toBe(source);
    }
    expect(isFeeItemError(catchOf(() => assertFundingSource('capitation')), 'funding_source_invalid')).toBe(
      true
    );
  });

  it('refuses a priority that is not a whole number at or above the minimum', () => {
    expect(assertPriority(0)).toBe(0);
    expect(assertPriority(7)).toBe(7);
    expect(isFeeItemError(catchOf(() => assertPriority(-1)), 'priority_invalid')).toBe(true);
    expect(isFeeItemError(catchOf(() => assertPriority(1.5)), 'priority_invalid')).toBe(true);
  });

  it('orders allocation by priority, then code, then id', () => {
    const items = [
      { id: 'c', code: 'MEALS', priority: 2 },
      { id: 'b', code: 'BOARDING', priority: 1 },
      { id: 'a', code: 'ACTIVITY', priority: 1 },
      { id: 'd', code: 'ACTIVITY', priority: 1 },
    ];
    expect(orderFeeItemsForAllocation(items).map((item) => item.id)).toEqual(['a', 'd', 'b', 'c']);
    // The tie-break is a total order, so the comparator never reports two distinct rows equal.
    expect(compareFeeItemsForAllocation(items[2], items[3])).toBeLessThan(0);
    expect(compareFeeItemsForAllocation(items[1], items[1])).toBe(0);
    // The caller's list is not reordered in place.
    expect(items.map((item) => item.id)).toEqual(['c', 'b', 'a', 'd']);
  });

  it('gives a new item the number after the highest in use', () => {
    expect(nextFreePriority([])).toBe(0);
    expect(nextFreePriority([{ priority: 1 }, { priority: 1 }, { priority: 3 }])).toBe(4);
    expect(nextFreePriority([{ priority: 0 }])).toBe(1);
  });

  it('canonicalises a GL account code and refuses one that is not well formed', () => {
    expect(assertGlAccountCode('4000')).toBe('4000');
    expect(assertGlAccountCode(' rev.tuition ')).toBe('REV.TUITION');
    expect(assertGlAccountCode('rev-100_a')).toBe('REV-100_A');
    expect(isFeeItemError(catchOf(() => assertGlAccountCode('   ')), 'gl_account_malformed')).toBe(true);
    expect(isFeeItemError(catchOf(() => assertGlAccountCode('4000 1')), 'gl_account_malformed')).toBe(true);
    expect(
      isFeeItemError(catchOf(() => assertGlAccountCode(`4${'0'.repeat(50)}`)), 'gl_account_malformed')
    ).toBe(true);
  });

  it('resolves a GL account against the directory, and refuses one that does not resolve', async () => {
    const directory: GlAccountDirectory = { has: (code) => code === '4000' };
    expect(await resolveGlAccountCode('4000', directory)).toBe('4000');
    expect(await resolveGlAccountCode('  ', directory)).toBeNull();
    expect(await resolveGlAccountCode(null, directory)).toBeNull();
    expect(
      isFeeItemError(
        await rejectOf(() => resolveGlAccountCode('9999', directory)),
        'gl_account_unresolved'
      )
    ).toBe(true);
    // Without a directory only the format is checked.
    expect(await resolveGlAccountCode('9999')).toBe('9999');
  });

  it('reads the GL mapping the posting engine consumes', () => {
    expect(glMappingOf({ revenue_account_code: '4000' })).toEqual({ revenue_account_code: '4000' });
    expect(glMappingOf({})).toEqual({ revenue_account_code: null });
    expect(glMappingOf({ revenue_account_code: '' })).toEqual({ revenue_account_code: null });
  });

  it('refuses an amount that is not exact Money of the institution currency', () => {
    expect(assertFeeAmount({ amount_minor: 150_005, currency: 'KES' }, 'KES')).toEqual({
      amount_minor: 150_005,
      currency: 'KES',
    });
    expect(
      isFeeItemError(catchOf(() => assertFeeAmount(1500.05, 'KES')), 'amount_not_money')
    ).toBe(true);
    expect(
      isFeeItemError(
        catchOf(() => assertFeeAmount({ amount_minor: 150_000, currency: 'UGX' }, 'KES')),
        'amount_currency_mismatch'
      )
    ).toBe(true);
    expect(
      isFeeItemError(
        catchOf(() => assertFeeAmount({ amount_minor: 1.5, currency: 'KES' }, 'KES')),
        'amount_invalid'
      )
    ).toBe(true);
    expect(
      isFeeItemError(
        catchOf(() => assertFeeAmount({ amount_minor: 10, currency: 'ZZZ' }, 'KES')),
        'amount_currency_mismatch'
      )
    ).toBe(true);
  });
});

describe('creating a fee item through the repository', () => {
  it('stores the canonical row with the defaults, and records who created it', async () => {
    const context = await freshContext();
    const created = await service(context).create(
      input(context, { code: 'activity', revenueAccountCode: '4000', fundingSource: 'bursary' })
    );

    expect(created).toMatchObject({
      institution_id: context.seed.idOf('institution'),
      code: 'ACTIVITY',
      name: 'Activity fee',
      category: 'activity',
      revenue_account_code: '4000',
      refundable: false,
      taxable: false,
      priority: 2,
      funding_source: 'bursary',
      created_by: TEST_ACTOR,
    });
    expect(created.deleted_at ?? null).toBeNull();

    const trail = await context.repository.auditTrail('fee_item', created.id);
    expect(trail).toHaveLength(1);
    expect(trail[0]).toMatchObject({ action: 'create', actorId: TEST_ACTOR });
  });

  it('records the actor the service was constructed with', async () => {
    const context = await freshContext();
    const created = await service(context, OTHER_ACTOR).create(input(context));
    expect(created.created_by).toBe(OTHER_ACTOR);
    const trail = await context.repository.auditTrail('fee_item', created.id);
    expect(trail[0]?.actorId).toBe(OTHER_ACTOR);
  });

  it('appends a new item after the items already in use', async () => {
    const context = await freshContext();
    const first = await service(context).create(input(context, { code: 'FIRST' }));
    const second = await service(context).create(input(context, { code: 'SECOND' }));
    // The seeded TUITION item holds priority 1, so the two new items take 2 and 3.
    expect(first.priority).toBe(2);
    expect(second.priority).toBe(3);
    expect((await service(context).list()).map((item) => item.code)).toEqual([
      'TUITION',
      'FIRST',
      'SECOND',
    ]);
  });

  it('refuses a duplicate code, including one a deactivated item still holds', async () => {
    const context = await freshContext();
    expect(
      isFeeItemError(
        await rejectOf(() => service(context).create(input(context, { code: 'tuition' }))),
        'code_taken'
      )
    ).toBe(true);

    const created = await service(context).create(input(context, { code: 'ACTIVITY' }));
    await service(context).deactivate(created.id);
    // The canonical unique key is a plain index, so a soft-deleted row keeps its code.
    expect(
      isFeeItemError(
        await rejectOf(() => service(context).create(input(context, { code: 'ACTIVITY' }))),
        'code_taken'
      )
    ).toBe(true);
  });

  it('refuses a priority an active item already holds', async () => {
    const context = await freshContext();
    expect(
      isFeeItemError(
        await rejectOf(() => service(context).create(input(context, { priority: 1 }))),
        'priority_taken'
      )
    ).toBe(true);
  });

  it('refuses an institution that does not exist', async () => {
    const context = await freshContext();
    expect(
      isFeeItemError(
        await rejectOf(() =>
          service(context).create(input(context, { institutionId: asId<'institution'>(missingId()) }))
        ),
        'institution_missing'
      )
    ).toBe(true);
  });

  it('refuses an unknown funding source and an unknown category', async () => {
    const context = await freshContext();
    expect(
      isFeeItemError(
        await rejectOf(() =>
          service(context).create(input(context, { fundingSource: 'capitation' as never }))
        ),
        'funding_source_invalid'
      )
    ).toBe(true);
    expect(
      isFeeItemError(
        await rejectOf(() => service(context).create(input(context, { category: 'nope' as never }))),
        'category_invalid'
      )
    ).toBe(true);
  });

  it('refuses a GL account the directory does not know', async () => {
    const context = await freshContext();
    const directory: GlAccountDirectory = { has: (code) => code === '4000' };
    const withDirectory = new FeeItemService({ repository: context.repository, glAccounts: directory });

    expect(
      isFeeItemError(
        await rejectOf(() => withDirectory.create(input(context, { revenueAccountCode: '9999' }))),
        'gl_account_unresolved'
      )
    ).toBe(true);
    const created = await withDirectory.create(input(context, { revenueAccountCode: '4000' }));
    expect(created.revenue_account_code).toBe('4000');
  });

  it('maps a unique conflict from the store onto the named refusal', async () => {
    // The pre-check reads the items, then the write happens; a row written in that window is a
    // conflict the store raises, and the service names it as the code it is. A store that reads
    // through the real repository and refuses only the write reaches exactly that window.
    const context = await freshContext();
    const real = context.repository;
    const store: FeeItemStore = {
      get: (entity, id, options) => real.get(entity, id, options),
      list: (entity, query) => real.list(entity, query),
      create: async () => {
        throw new RepositoryConflictError(
          'fee_item',
          'unique',
          'fee_item breaks the unique constraint on institution_id, code',
          { columns: ['institution_id', 'code'] }
        );
      },
      update: (entity, id, patch, options) => real.update(entity, id, patch, options),
      remove: (entity, id, options) => real.remove(entity, id, options),
    };

    expect(
      isFeeItemError(
        await rejectOf(() => new FeeItemService({ repository: store }).create(input(context))),
        'code_taken'
      )
    ).toBe(true);
  });
});

describe('editing a fee item', () => {
  it('writes the patch, moves the row version and audits the change', async () => {
    const context = await freshContext();
    const created = await service(context).create(input(context, { code: 'ACTIVITY' }));

    const updated = await service(context).update(
      created.id,
      { name: 'Activity and clubs', code: 'clubs', priority: 5, fundingSource: 'sponsor' },
      { expectedVersion: created.rowVersion, reason: 'renamed by the bursar' }
    );

    expect(updated).toMatchObject({
      code: 'CLUBS',
      name: 'Activity and clubs',
      priority: 5,
      funding_source: 'sponsor',
      rowVersion: created.rowVersion + 1,
    });

    const trail = await context.repository.auditTrail('fee_item', created.id);
    const events = oldestFirst(trail);
    expect(events.map((event) => event.action)).toEqual(['create', 'update']);
    expect(events[1]?.changedFields).toEqual(
      expect.arrayContaining(['code', 'name', 'priority', 'funding_source'])
    );
    expect(events[1]?.reason).toBe('renamed by the bursar');
  });

  it('cannot be edited into a state the create path would refuse', async () => {
    const context = await freshContext();
    const svc = service(context);
    const first = await svc.create(input(context, { code: 'FIRST' }));
    const second = await svc.create(input(context, { code: 'SECOND' }));

    expect(
      isFeeItemError(
        await rejectOf(() =>
          svc.update(second.id, { code: 'TUITION' }, { expectedVersion: second.rowVersion })
        ),
        'code_taken'
      )
    ).toBe(true);
    expect(
      isFeeItemError(
        await rejectOf(() =>
          svc.update(second.id, { priority: first.priority }, { expectedVersion: second.rowVersion })
        ),
        'priority_taken'
      )
    ).toBe(true);
    expect(
      isFeeItemError(
        await rejectOf(() =>
          svc.update(second.id, { code: 'not a code' }, { expectedVersion: second.rowVersion })
        ),
        'code_malformed'
      )
    ).toBe(true);
    expect(
      isFeeItemError(
        await rejectOf(() =>
          svc.update(second.id, { fundingSource: 'nope' as never }, { expectedVersion: second.rowVersion })
        ),
        'funding_source_invalid'
      )
    ).toBe(true);

    // Nothing was written: the row is where it was.
    const stored = await svc.get(second.id);
    expect(stored).toMatchObject({ code: 'SECOND', rowVersion: second.rowVersion });
  });

  it('keeps its own priority when the patch does not name one', async () => {
    const context = await freshContext();
    const svc = service(context);
    const created = await svc.create(input(context, { code: 'ACTIVITY' }));
    const updated = await svc.update(created.id, { name: 'Renamed' }, { expectedVersion: created.rowVersion });
    expect(updated.priority).toBe(created.priority);
  });

  it('refuses to clear a GL account the item already has', async () => {
    const context = await freshContext();
    const svc = service(context);
    const created = await svc.create(input(context, { revenueAccountCode: '4000' }));
    expect(
      isFeeItemError(
        await rejectOf(() =>
          svc.update(created.id, { revenueAccountCode: null }, { expectedVersion: created.rowVersion })
        ),
        'gl_account_not_clearable'
      )
    ).toBe(true);
  });

  it('lets the repository refuse a stale write, unchanged', async () => {
    const context = await freshContext();
    const svc = service(context);
    const created = await svc.create(input(context, { code: 'ACTIVITY' }));
    await svc.update(created.id, { name: 'First edit' }, { expectedVersion: created.rowVersion });

    const error = await rejectOf(() =>
      svc.update(created.id, { name: 'Second edit' }, { expectedVersion: created.rowVersion })
    );
    expect(isRepositoryError(error, 'conflict')).toBe(true);
  });

  it('refuses an item that does not exist', async () => {
    const context = await freshContext();
    expect(
      isFeeItemError(
        await rejectOf(() =>
          service(context).update(asId<'fee_item'>(missingId()), { name: 'x' }, { expectedVersion: 1 })
        ),
        'not_found'
      )
    ).toBe(true);
  });
});

describe('deactivating a fee item', () => {
  it('soft-deletes an unreferenced item, and the reads follow', async () => {
    const context = await freshContext();
    const svc = service(context);
    const created = await svc.create(input(context, { code: 'ACTIVITY' }));

    const removed = await svc.deactivate(created.id);
    expect(removed.deleted_at).toBeTruthy();

    expect(await svc.get(created.id)).toBeNull();
    expect((await svc.list()).map((item) => item.code)).not.toContain('ACTIVITY');
    expect(
      (await svc.list({ institutionId: context.seed.idOf('institution'), includeInactive: true })).map(
        (item) => item.code
      )
    ).toContain('ACTIVITY');
    const archived = await svc.get(created.id, { includeInactive: true });
    expect(archived?.deleted_at).toBeTruthy();

    const trail = await context.repository.auditTrail('fee_item', created.id);
    expect(oldestFirst(trail).map((event) => event.action)).toEqual(['create', 'remove']);
  });

  it('refuses an item a fee structure or a live invoice references', async () => {
    const context = await freshContext();
    const error = await rejectOf(() => service(context).deactivate(context.seed.idOf('fee_item')));
    expect(isFeeItemError(error, 'fee_item_in_use')).toBe(true);
    expect((error as FeeItemError).message).toMatch(/fee structure line/);
    expect((error as FeeItemError).message).toMatch(/invoice INV\/2027\/T1\/000123/);
    // The seeded invoice is 600000 minor units with 300000 allocated, so 300000 is outstanding.
    expect((error as FeeItemError).message).toMatch(/300000 KES outstanding/);
  });

  it('refuses an item that does not exist', async () => {
    const context = await freshContext();
    expect(
      isFeeItemError(await rejectOf(() => service(context).deactivate(asId<'fee_item'>(missingId()))), 'not_found')
    ).toBe(true);
  });
});

describe('the outstanding balance of an invoice', () => {
  it('is the total less every allocation, exact in minor units', async () => {
    const context = await freshContext();
    const balance = await service(context).outstandingBalance(context.seed.idOf('invoice'));
    expect(balance).toEqual({ amount_minor: 300_000, currency: 'KES' });
  });

  it('refuses an invoice counted in another currency than the institution', async () => {
    const context = await freshContext();
    const invoice = await context.repository.create('invoice', {
      institution_id: context.seed.idOf('institution'),
      number: 'INV/2027/T1/999999',
      learner_id: context.seed.idOf('learner'),
      issue_date: '2027-03-01',
      total: { amount_minor: 150_000, currency: 'UGX' },
      status: 'posted',
    });
    expect(
      isFeeItemError(
        await rejectOf(() => service(context).outstandingBalance(invoice.id)),
        'amount_currency_mismatch'
      )
    ).toBe(true);
  });

  it('refuses an invoice that does not exist', async () => {
    const context = await freshContext();
    expect(
      isFeeItemError(
        await rejectOf(() => service(context).outstandingBalance(asId<'invoice'>(missingId()))),
        'not_found'
      )
    ).toBe(true);
  });
});

describe('the GL mapping of a stored item', () => {
  it('is read from the row, for the posting engine', async () => {
    const context = await freshContext();
    const svc = service(context);
    const created = await svc.create(input(context, { revenueAccountCode: '4000' }));
    expect(await svc.glMapping(created.id)).toEqual({ revenue_account_code: '4000' });
    expect(await svc.glMapping(context.seed.idOf('fee_item'))).toEqual({
      revenue_account_code: '4000',
    });
  });
});

/** A UUIDv7 that names no row, for the "does not exist" paths. */
function missingId(): string {
  return '01930000-0000-7000-8000-0000deadbeef';
}

/** The audit trail oldest first; the repository reads it newest first. */
function oldestFirst(events: readonly AuditEvent[]): AuditEvent[] {
  return [...events].reverse();
}

/** The error a call throws, for an assertion on its type. */
function catchOf(work: () => unknown): unknown {
  try {
    work();
    return null;
  } catch (error) {
    return error;
  }
}

/** The error an async call rejects with. */
async function rejectOf(work: () => Promise<unknown>): Promise<unknown> {
  try {
    await work();
    return null;
  } catch (error) {
    return error;
  }
}
