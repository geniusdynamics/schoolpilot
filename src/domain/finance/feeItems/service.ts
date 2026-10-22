// ABOUTME: The fee-item (vote head) service: create, read, edit and deactivate a fee item with its
// ABOUTME: GL mapping, allocation priority and funding source, through the canonical repository.

import { RepositoryConflictError, type RepositoryRow } from '@/data/repository';
import { asId, type Id } from '@/domain/ids';
import { add, isCurrencyCode, subtract, zero, type CurrencyCode, type Money } from '@/domain/money';

import { FeeItemError } from './errors';
import {
  glMappingOf,
  resolveGlAccountCode,
  type FeeItemGlMapping,
  type GlAccountDirectory,
} from './glMapping';
import { assertPriority, nextFreePriority, orderFeeItemsForAllocation } from './priority';
import type {
  FeeItemInput,
  FeeItemListQuery,
  FeeItemPatch,
  FeeItemStore,
} from './types';
import {
  assertFeeAmount,
  assertFeeItemCategory,
  assertFeeItemCode,
  assertFeeItemName,
  assertFundingSource,
} from './validation';

/** What every write of the service accepts. */
export interface FeeItemWriteOptions {
  /** Why the write happened, recorded on the audit event. */
  readonly reason?: string;
}

/** What an edit accepts: the version the caller read, and why it happened. */
export interface FeeItemUpdateOptions extends FeeItemWriteOptions {
  /** The row version the caller read; the write is refused when the row moved on. */
  readonly expectedVersion: number;
}

/** What a deactivation accepts. */
export interface FeeItemDeactivateOptions extends FeeItemWriteOptions {
  /** Optional version guard; when given, a stale row is not deactivated. */
  readonly expectedVersion?: number;
}

export interface FeeItemServiceOptions {
  /** The store every read and write goes through. The canonical repository satisfies it. */
  readonly repository: FeeItemStore;
  /** The actor recorded on the writes; the repository's own actor when omitted. */
  readonly actor?: string;
  /**
   * The chart of accounts the GL mapping resolves against. The accounts land with the P3 ledger
   * (P3-A02); until a caller supplies a directory, only the format of a code is checked.
   */
  readonly glAccounts?: GlAccountDirectory;
}

/** What a fee item is referenced by, the reason a deactivation can be refused. */
export interface FeeItemReferences {
  /** Live fee structure lines that bill the item. */
  readonly scheduleLines: number;
  /** Live (non-void) invoices that carry a line for the item, with what each still owes. */
  readonly invoices: readonly { readonly number: string; readonly outstanding: Money }[];
}

/** The longest page the service reads; the repository caps a page at 500 rows. */
const PAGE_LIMIT = 500;

/**
 * The fee-item service.
 *
 * Every read and write goes through the canonical repository, so the audit trail, the optimistic
 * concurrency counter and the soft delete are the repository's own. The service adds the rules the
 * entity cannot carry: a well-formed and unique code, a unique priority among active items, a
 * funding source and category of the declared values, a GL account that resolves, and a refusal to
 * deactivate an item a fee structure or a live invoice still references.
 *
 * Nothing here validates the assembled row a second time: the repository runs the entity's own
 * zod schema on the write, so a shape the service missed is refused there.
 */
export class FeeItemService {
  private readonly repository: FeeItemStore;
  private readonly actor: string | undefined;
  private readonly glAccounts: GlAccountDirectory | undefined;

  constructor(options: FeeItemServiceOptions) {
    this.repository = options.repository;
    this.actor = options.actor;
    this.glAccounts = options.glAccounts;
  }

  /** The fee items of an institution, in the order allocation follows. */
  async list(query: FeeItemListQuery = {}): Promise<readonly RepositoryRow<'fee_item'>[]> {
    const page = await this.repository.list('fee_item', {
      ...(query.institutionId ? { where: { institution_id: query.institutionId } } : {}),
      ...(query.includeInactive ? { includeDeleted: true } : {}),
      limit: PAGE_LIMIT,
    });
    return orderFeeItemsForAllocation(page.items);
  }

  /** One fee item, or null. A deactivated item is not found unless `includeInactive` is set. */
  async get(
    id: Id<'fee_item'>,
    options: { readonly includeInactive?: boolean } = {}
  ): Promise<RepositoryRow<'fee_item'> | null> {
    return this.repository.get('fee_item', id, {
      includeDeleted: options.includeInactive === true,
    });
  }

  /** The GL mapping of an item: the account a posting for it credits. The posting engine reads this. */
  async glMapping(id: Id<'fee_item'>): Promise<FeeItemGlMapping> {
    const item = await this.requireItem(id);
    return glMappingOf(item);
  }

  /**
   * Creates a fee item.
   *
   * A code is unique within the institution, including among deactivated items: the canonical
   * unique key does not exclude a soft-deleted row, so a code is never reused. A priority that
   * another active item holds is refused; when the caller names none, the next free number is
   * used, so the order of the items a school already has never moves.
   */
  async create(
    input: FeeItemInput,
    options: FeeItemWriteOptions = {}
  ): Promise<RepositoryRow<'fee_item'>> {
    await this.assertInstitution(input.institutionId);

    const code = assertFeeItemCode(input.code);
    const name = assertFeeItemName(input.name);
    const category = assertFeeItemCategory(input.category);
    const fundingSource = assertFundingSource(input.fundingSource ?? 'parent');
    const revenueAccountCode = await resolveGlAccountCode(input.revenueAccountCode, this.glAccounts);

    const active = await this.activeItems(input.institutionId);
    const priority = await this.assertFreePriority(
      input.priority === undefined ? nextFreePriority(active) : input.priority,
      active,
      undefined
    );

    const all = await this.allItems(input.institutionId);
    if (all.some((item) => item.code === code)) {
      throw new FeeItemError('code_taken', `the code ${code} is already used in this institution`, {
        field: 'code',
      });
    }

    try {
      return await this.repository.create(
        'fee_item',
        {
          institution_id: input.institutionId,
          code,
          name,
          category,
          refundable: input.refundable ?? false,
          taxable: input.taxable ?? false,
          priority,
          funding_source: fundingSource,
          ...(revenueAccountCode === null ? {} : { revenue_account_code: revenueAccountCode }),
        },
        this.writeOptions(options)
      );
    } catch (error) {
      throw this.asCodeTaken(error, code);
    }
  }

  /**
   * Edits a fee item.
   *
   * The patch is merged into the stored row before it is validated, so an item can never be edited
   * into a state the create path would have refused: a duplicate code, a duplicate priority, an
   * unknown funding source or category, or an unresolvable GL account.
   */
  async update(
    id: Id<'fee_item'>,
    patch: FeeItemPatch,
    options: FeeItemUpdateOptions
  ): Promise<RepositoryRow<'fee_item'>> {
    const current = await this.requireItem(id);

    const code = patch.code === undefined ? current.code : assertFeeItemCode(patch.code);
    const name = patch.name === undefined ? current.name : assertFeeItemName(patch.name);
    const category =
      patch.category === undefined ? current.category : assertFeeItemCategory(patch.category);
    const fundingSource =
      patch.fundingSource === undefined
        ? current.funding_source
        : assertFundingSource(patch.fundingSource);
    const priority =
      patch.priority === undefined ? current.priority : assertPriority(patch.priority);

    const revenueAccountCode = await this.nextGlAccountCode(current, patch);

    const active = await this.activeItems(asId<'institution'>(current.institution_id));
    await this.assertFreePriority(priority, active, id);

    if (code !== current.code) {
      const all = await this.allItems(asId<'institution'>(current.institution_id));
      if (all.some((item) => item.code === code && item.id !== id)) {
        throw new FeeItemError('code_taken', `the code ${code} is already used in this institution`, {
          field: 'code',
        });
      }
    }

    try {
      return await this.repository.update(
        'fee_item',
        id,
        {
          code,
          name,
          category,
          funding_source: fundingSource,
          priority,
          ...(patch.refundable === undefined ? {} : { refundable: patch.refundable }),
          ...(patch.taxable === undefined ? {} : { taxable: patch.taxable }),
          ...(revenueAccountCode === undefined
            ? {}
            : { revenue_account_code: revenueAccountCode }),
        },
        { expectedVersion: options.expectedVersion, ...this.writeOptions(options) }
      );
    } catch (error) {
      throw this.asCodeTaken(error, code);
    }
  }

  /**
   * Deactivates a fee item: the row stays, marked deleted, and drops out of the default reads.
   *
   * An item a fee structure or a live invoice still references is refused: deactivating it would
   * orphan a line that is billed or posted. The refusal names what references it and, for an
   * invoice, what it still owes.
   */
  async deactivate(
    id: Id<'fee_item'>,
    options: FeeItemDeactivateOptions = {}
  ): Promise<RepositoryRow<'fee_item'>> {
    await this.requireItem(id);
    const references = await this.referencesTo(id);
    if (references.scheduleLines > 0 || references.invoices.length > 0) {
      throw new FeeItemError('fee_item_in_use', describeReferences(id, references), {
        id,
        field: 'deleted_at',
      });
    }
    return this.repository.remove('fee_item', id, {
      ...this.writeOptions(options),
      ...(options.expectedVersion === undefined ? {} : { expectedVersion: options.expectedVersion }),
    });
  }

  /** What still references the item: the fee structure lines and the live invoices that bill it. */
  async referencesTo(id: Id<'fee_item'>): Promise<FeeItemReferences> {
    const scheduleLines = await this.repository.list('fee_schedule_line', {
      where: { fee_item_id: id },
      limit: PAGE_LIMIT,
    });
    const invoiceLines = await this.repository.list('invoice_line', {
      where: { fee_item_id: id },
      limit: PAGE_LIMIT,
    });

    const invoiceIds = [...new Set(invoiceLines.items.map((line) => line.invoice_id))];
    const invoices: { number: string; outstanding: Money }[] = [];
    for (const invoiceId of invoiceIds) {
      const invoice = await this.repository.get('invoice', asId<'invoice'>(invoiceId));
      if (!invoice || invoice.status === 'void') continue;
      const currency = await this.institutionCurrency(asId<'institution'>(invoice.institution_id));
      invoices.push({
        number: invoice.number,
        outstanding: await this.outstandingFor(invoice.total, asId<'invoice'>(invoiceId), currency),
      });
    }

    return { scheduleLines: scheduleLines.items.length, invoices };
  }

  /**
   * What an invoice still owes: its total less every allocation recorded against it, exact in
   * minor units. A total or an allocation that is not Money of the institution's currency is
   * refused by name rather than summed.
   */
  async outstandingBalance(invoiceId: Id<'invoice'>): Promise<Money> {
    const invoice = await this.repository.get('invoice', invoiceId);
    if (!invoice) {
      throw new FeeItemError('not_found', `the invoice ${invoiceId} does not exist`, {
        id: invoiceId,
      });
    }
    const currency = await this.institutionCurrency(asId<'institution'>(invoice.institution_id));
    return this.outstandingFor(invoice.total, invoiceId, currency);
  }

  /** The base currency of an institution, the currency every amount it holds is counted in. */
  async institutionCurrency(institutionId: Id<'institution'>): Promise<CurrencyCode> {
    const institution = await this.repository.get('institution', institutionId);
    if (!institution) {
      throw new FeeItemError('institution_missing', `the institution ${institutionId} does not exist`, {
        id: institutionId,
      });
    }
    const currency = institution.base_currency;
    if (!isCurrencyCode(currency)) {
      throw new FeeItemError(
        'institution_currency_invalid',
        `the institution's base currency "${currency}" is not a currency of the table`,
        { id: institutionId }
      );
    }
    return currency;
  }

  private async outstandingFor(
    total: unknown,
    invoiceId: Id<'invoice'>,
    currency: CurrencyCode
  ): Promise<Money> {
    const allocations = await this.repository.list('payment_allocation', {
      where: { invoice_id: invoiceId },
      limit: PAGE_LIMIT,
    });
    const amount = assertFeeAmount(total, currency);
    const paid = allocations.items.reduce(
      (running, allocation) => add(running, assertFeeAmount(allocation.amount, currency)),
      zero(currency)
    );
    return subtract(amount, paid);
  }

  private async assertInstitution(institutionId: Id<'institution'>): Promise<void> {
    const institution = await this.repository.get('institution', institutionId);
    if (!institution) {
      throw new FeeItemError('institution_missing', `the institution ${institutionId} does not exist`, {
        id: institutionId,
      });
    }
  }

  private async requireItem(id: Id<'fee_item'>): Promise<RepositoryRow<'fee_item'>> {
    const item = await this.repository.get('fee_item', id);
    if (!item) {
      throw new FeeItemError('not_found', `the fee item ${id} does not exist or is deactivated`, {
        id,
      });
    }
    return item;
  }

  /** The live items of an institution; the ones a deactivation dropped are left out. */
  private async activeItems(institutionId: Id<'institution'>): Promise<RepositoryRow<'fee_item'>[]> {
    const page = await this.repository.list('fee_item', {
      where: { institution_id: institutionId },
      limit: PAGE_LIMIT,
    });
    return [...page.items];
  }

  /** Every item of an institution, including the deactivated ones, whose codes are still taken. */
  private async allItems(institutionId: Id<'institution'>): Promise<RepositoryRow<'fee_item'>[]> {
    const page = await this.repository.list('fee_item', {
      where: { institution_id: institutionId },
      includeDeleted: true,
      limit: PAGE_LIMIT,
    });
    return [...page.items];
  }

  private async assertFreePriority(
    priority: number,
    active: readonly RepositoryRow<'fee_item'>[],
    selfId: string | undefined
  ): Promise<number> {
    const wanted = assertPriority(priority);
    const holder = active.find((item) => item.priority === wanted && item.id !== selfId);
    if (holder) {
      throw new FeeItemError(
        'priority_taken',
        `the priority ${wanted} is already held by "${holder.code} ${holder.name}"; a priority is unique among active items`,
        { field: 'priority', id: holder.id }
      );
    }
    return wanted;
  }

  /**
   * The account code the item ends up with.
   *
   * `undefined` keeps the stored code. A code resolves through the directory when one is given.
   * The column is optional but not nullable, so a code can never be cleared: naming `null` or an
   * empty string to clear it is refused rather than silently ignored.
   */
  private async nextGlAccountCode(
    current: RepositoryRow<'fee_item'>,
    patch: FeeItemPatch
  ): Promise<string | undefined> {
    if (patch.revenueAccountCode === undefined) return undefined;
    if (patch.revenueAccountCode === null || patch.revenueAccountCode.trim() === '') {
      if (current.revenue_account_code === undefined || current.revenue_account_code === '') {
        return undefined;
      }
      throw new FeeItemError(
        'gl_account_not_clearable',
        'a fee item GL account cannot be cleared once set: the canonical column is optional but not nullable',
        { field: 'revenue_account_code', id: current.id }
      );
    }
    const resolved = await resolveGlAccountCode(patch.revenueAccountCode, this.glAccounts);
    return resolved ?? undefined;
  }

  private writeOptions(options: FeeItemWriteOptions): { actor?: string; reason?: string } {
    return {
      ...(this.actor === undefined ? {} : { actor: this.actor }),
      ...(options.reason === undefined ? {} : { reason: options.reason }),
    };
  }

  /** A unique conflict from the database, named as the code it is. */
  private asCodeTaken(error: unknown, code: string): unknown {
    if (error instanceof RepositoryConflictError && error.reason === 'unique') {
      return new FeeItemError(
        'code_taken',
        `the code ${code} is already used in this institution`,
        { field: 'code', cause: error }
      );
    }
    return error;
  }
}

/** The refusal message of a referenced item, naming what holds it and what is still owed. */
function describeReferences(id: string, references: FeeItemReferences): string {
  const parts: string[] = [];
  if (references.scheduleLines > 0) {
    parts.push(`${references.scheduleLines} fee structure line(s)`);
  }
  for (const invoice of references.invoices) {
    parts.push(`invoice ${invoice.number} (${invoice.outstanding.amount_minor} ${invoice.outstanding.currency} outstanding)`);
  }
  return `the fee item ${id} is referenced by ${parts.join(', ')}; deactivate the structure lines or settle the invoices first`;
}
