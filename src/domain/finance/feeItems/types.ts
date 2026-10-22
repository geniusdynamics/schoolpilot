// ABOUTME: The fee item (vote head) model of the finance domain: its funding sources, its
// ABOUTME: categories, its GL-account mapping, its allocation priority, and the store it writes through.

import type {
  CreateInput,
  ListQuery,
  Page,
  RepositoryRow,
  UpdateInput,
  UpdateOptions,
  WriteOptions,
} from '@/data/repository';
import type { Id } from '@/domain/ids';
import type { EntityName } from '@/domain/schema';
import { FEE_FUNDING_SOURCES, FEE_ITEM_CATEGORIES, type FeeItem } from '@/domain/schema';

/**
 * The funding sources a fee item may carry.
 *
 * The list is the canonical one, not a second vocabulary: `parent` is the learner's family
 * paying, `government_capitation` is the capitation the owner named, `sponsor` a sponsor, and
 * `bursary` and `government` are the two sources the spec did not name (P3-B01 added them).
 */
export const FEE_ITEM_FUNDING_SOURCES = FEE_FUNDING_SOURCES;
export type FeeItemFundingSource = FeeItem['funding_source'];

/** The categories a fee item may carry (spec 05 §2.1). */
export const FEE_ITEM_CATEGORY_VALUES = FEE_ITEM_CATEGORIES;
export type FeeItemCategory = FeeItem['category'];

/** The label a funding source renders as. */
export const FUNDING_SOURCE_LABELS: Readonly<Record<FeeItemFundingSource, string>> = {
  parent: 'Learner / guardian',
  bursary: 'Bursary',
  sponsor: 'Sponsor',
  government_capitation: 'Government capitation',
  government: 'Government (other)',
};

/** The label a category renders as. */
export const CATEGORY_LABELS: Readonly<Record<FeeItemCategory, string>> = {
  tuition: 'Tuition',
  boarding: 'Boarding',
  meals: 'Meals',
  transport: 'Transport',
  activity: 'Activity',
  exam: 'Exam',
  development_levy: 'Development / levy',
  uniform_books: 'Uniform / books',
  deposit: 'Deposit',
  fine: 'Fine',
  other: 'Other',
};

/** A fee item as a caller collects it: the writable fields, with the ones that have a default optional. */
export interface FeeItemInput {
  /** The institution the item belongs to. A code is unique within it. */
  readonly institutionId: Id<'institution'>;
  /** The vote-head code, e.g. `TUITION`. Unique within the institution and well formed. */
  readonly code: string;
  /** The display name. */
  readonly name: string;
  readonly category: FeeItemCategory;
  /** The GL revenue account a posting for this item credits; `null` for the institution default. */
  readonly revenueAccountCode?: string | null;
  /** Whether the item is refundable; `false` when the caller does not say. */
  readonly refundable?: boolean;
  /** Whether the item is taxable; `false` when the caller does not say. */
  readonly taxable?: boolean;
  /** The allocation order; the next free number when the caller does not say. */
  readonly priority?: number;
  /** Who funds the item; the learner's family (`parent`) when the caller does not say. */
  readonly fundingSource?: FeeItemFundingSource;
}

/** A change to an existing fee item. The institution is fixed: an item never moves between schools. */
export type FeeItemPatch = Partial<Omit<FeeItemInput, 'institutionId'>>;

/** What a caller can narrow the list of fee items by. */
export interface FeeItemListQuery {
  /** Only the items of this institution. */
  readonly institutionId?: Id<'institution'>;
  /** Include deactivated (soft-deleted) items. Off by default. */
  readonly includeInactive?: boolean;
}

/**
 * The write surface the fee item service needs.
 *
 * The canonical `Repository` satisfies it, and so does the finance module's test double, so the
 * service can be exercised against either. It is deliberately smaller than `Repository`: the
 * service opens no transaction (it writes one row per call) and reads no audit trail.
 */
export interface FeeItemStore {
  get<E extends EntityName>(
    entity: E,
    id: Id<E>,
    options?: { readonly includeDeleted?: boolean }
  ): Promise<RepositoryRow<E> | null>;
  list<E extends EntityName>(entity: E, query?: ListQuery): Promise<Page<RepositoryRow<E>>>;
  create<E extends EntityName>(
    entity: E,
    input: CreateInput<E>,
    options?: WriteOptions
  ): Promise<RepositoryRow<E>>;
  update<E extends EntityName>(
    entity: E,
    id: Id<E>,
    patch: UpdateInput<E>,
    options: UpdateOptions
  ): Promise<RepositoryRow<E>>;
  remove<E extends EntityName>(
    entity: E,
    id: Id<E>,
    options?: WriteOptions
  ): Promise<RepositoryRow<E>>;
}
