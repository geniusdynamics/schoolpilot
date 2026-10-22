// ABOUTME: The sequence service: issues unique document numbers, reserves offline device blocks,
// ABOUTME: and parses a number back into its scope and counter.

import { CATALOG, definitionFor, type SequenceCatalog } from './catalog';
import { SequenceDefinitionError, SequencePolicyError, SequenceStoreError } from './errors';
import { compileDefinition, formatNumber, parseNumber, type CompiledFormat } from './format';
import { resolveScope, scopeKey, validateDefinition } from './scope';
import type { SequenceStore } from './store';
import type {
  Allocation,
  BlockReservation,
  BlockSummary,
  FailurePolicy,
  ParsedNumber,
  ScopeValues,
  SequenceDefinition,
} from './types';

/** How many numbers a device reserves at a time when no size is given. */
export const DEFAULT_BLOCK_SIZE = 50;

/** Options of one issuance. */
export interface IssueOptions {
  /** Overrides the service's failure policy for this call. */
  readonly policy?: FailurePolicy;
  /** Overrides the service's device id, which is recorded on the ledger row. */
  readonly deviceId?: string;
}

/** Options of a block reservation. */
export interface ReserveBlockOptions extends IssueOptions {
  /** How many numbers to reserve. Defaults to the service's block size. */
  readonly size?: number;
}

export interface SequenceServiceOptions {
  readonly store: SequenceStore;
  /** The catalog to resolve names in. Defaults to the built-in one. */
  readonly definitions?: SequenceCatalog;
  /** The device this service issues from, recorded on every number and used for blocks. */
  readonly deviceId?: string;
  /** The size of a reserved block. Defaults to {@link DEFAULT_BLOCK_SIZE}. */
  readonly blockSize?: number;
  /** What happens to a number whose issuance fails. Defaults to `burn`. */
  readonly failurePolicy?: FailurePolicy;
  /** The clock, so a reset can be tested. Defaults to the system clock. */
  readonly now?: () => Date;
}

/**
 * Issues document numbers from named sequences.
 *
 * Every number comes from the store's atomic counter, so two callers never receive the same one,
 * and every number is written to the store's ledger, whose unique key refuses a repeat. The
 * service never reads a counter and writes it back.
 *
 * A number can also be issued from a block the device reserved in advance, which is how a device
 * issues while it is disconnected.
 */
export class SequenceService {
  private readonly store: SequenceStore;
  private readonly definitions: SequenceCatalog;
  private readonly deviceId: string | undefined;
  private readonly blockSize: number;
  private readonly failurePolicy: FailurePolicy;
  private readonly clock: () => Date;
  /** The names whose definition has already been checked, so a custom one is checked once. */
  private readonly checked = new Set<string>();

  constructor(options: SequenceServiceOptions) {
    const blockSize = options.blockSize ?? DEFAULT_BLOCK_SIZE;
    if (!Number.isSafeInteger(blockSize) || blockSize < 1) {
      throw new SequenceDefinitionError(`a block size must be a positive integer, got ${blockSize}`);
    }
    this.store = options.store;
    this.definitions = options.definitions ?? CATALOG;
    this.deviceId = options.deviceId;
    this.blockSize = blockSize;
    this.failurePolicy = options.failurePolicy ?? 'burn';
    this.clock = options.now ?? (() => new Date());
  }

  /**
   * Runs `work` in one store transaction, handing it a service bound to that transaction.
   *
   * This is how a number and the document it belongs to commit together: issue with the `reuse`
   * policy inside the callback, and a failure rolls the number back with the document. A number
   * issued with the `burn` policy inside the callback is refused, because burning needs a
   * transaction of its own.
   */
  withTransaction<T>(work: (service: SequenceService) => Promise<T>): Promise<T> {
    return this.store.transaction((tx) => work(this.boundTo(tx)));
  }

  /** The names of the sequences this service can issue. */
  names(): readonly string[] {
    return Object.keys(this.definitions);
  }

  /** Resolves a definition; throws when the name is unknown or the definition is inconsistent. */
  definition(name: string): SequenceDefinition {
    const definition = definitionFor(name, this.definitions);
    if (!this.checked.has(definition.name)) {
      validateDefinition(definition);
      this.checked.add(definition.name);
    }
    return definition;
  }

  /** Renders a number for a definition without issuing it. */
  format(name: string, scope: ScopeValues, seq: number): string {
    return formatNumber(compileDefinition(this.definition(name)), scope, seq);
  }

  /**
   * Reads a number back for a sequence.
   *
   * Returns the counter and the scope segments the pattern renders, or null when the value is
   * not a number of that sequence. This is the check an import uses to tell an issued number
   * from a manual or foreign one.
   */
  parse(name: string, value: string | null | undefined): ParsedNumber | null {
    return parseNumber(compileDefinition(this.definition(name)), value);
  }

  /** True when `value` is a well-formed number of the sequence. */
  matches(name: string, value: string | null | undefined): boolean {
    return this.parse(name, value) !== null;
  }

  /**
   * Issues the next number of a sequence.
   *
   * With the `burn` policy the allocation commits on its own, so a failure after this call
   * leaves a gap and the number is never handed out again. With `reuse` the allocation joins the
   * transaction `withTransaction` opened, so a rollback returns the number.
   */
  async issue(name: string, scope: ScopeValues, options: IssueOptions = {}): Promise<Allocation> {
    const definition = this.definition(name);
    const format = compileDefinition(definition);
    const resolved = resolveScope(definition, scope, this.clock());
    const key = scopeKey(resolved);
    const deviceId = options.deviceId ?? this.deviceId;

    return this.runInUnit(options.policy ?? this.failurePolicy, async (store) => {
      const seq = await store.allocate(definition.name, key, 1);
      const number = formatNumber(format, resolved, seq);
      await store.record({
        sequence: definition.name,
        scopeKey: key,
        seq,
        number,
        issuedAt: this.clock().toISOString(),
        deviceId: deviceId ?? null,
      });
      return allocationOf(definition.name, key, resolved, seq, number, deviceId);
    });
  }

  /**
   * Reserves a block of numbers for a device.
   *
   * The block is taken from the same counter as direct issuance, so the hub's next number is
   * after the block and the two can never collide. The range is recorded before it is used, so
   * the numbers a device never uses stay reserved and are never handed to another device.
   */
  async reserveBlock(
    name: string,
    scope: ScopeValues,
    options: ReserveBlockOptions = {}
  ): Promise<BlockReservation> {
    const definition = this.definition(name);
    const resolved = resolveScope(definition, scope, this.clock());
    const key = scopeKey(resolved);
    const deviceId = options.deviceId ?? this.deviceId;
    if (!deviceId) {
      throw new SequenceDefinitionError(`reserving a block of "${name}" needs a device id`);
    }
    const size = options.size ?? this.blockSize;
    if (!Number.isSafeInteger(size) || size < 1) {
      throw new SequenceDefinitionError(`a block size must be a positive integer, got ${size}`);
    }

    const now = this.clock().toISOString();
    return this.runInUnit(options.policy ?? this.failurePolicy, async (store) => {
      const endSeq = await store.allocate(definition.name, key, size);
      const startSeq = endSeq - size + 1;
      await store.createBlock({
        sequence: definition.name,
        scopeKey: key,
        deviceId,
        startSeq,
        endSeq,
        createdAt: now,
        updatedAt: now,
      });
      return {
        sequence: definition.name,
        scopeKey: key,
        deviceId,
        startSeq,
        endSeq,
        size,
        status: 'open' as const,
        createdAt: now,
        updatedAt: now,
      };
    });
  }

  /**
   * Issues the next number of the device's reserved block.
   *
   * Returns null when the device holds no open block or the block is used up; the caller then
   * reserves a new one. The block's position advances as part of the call, so a crash after a
   * number is taken does not hand that number to anyone else.
   */
  async issueFromBlock(
    name: string,
    scope: ScopeValues,
    options: IssueOptions = {}
  ): Promise<Allocation | null> {
    const definition = this.definition(name);
    const format = compileDefinition(definition);
    const resolved = resolveScope(definition, scope, this.clock());
    const key = scopeKey(resolved);
    const deviceId = options.deviceId ?? this.deviceId;
    if (!deviceId) {
      throw new SequenceDefinitionError(`issuing from a block of "${name}" needs a device id`);
    }

    return this.runInUnit(options.policy ?? this.failurePolicy, async (store) => {
      const block = await store.openBlock(definition.name, key, deviceId);
      if (!block) return null;

      const updatedAt = this.clock().toISOString();
      const seq = await store.claimWithinBlock({
        sequence: definition.name,
        scopeKey: key,
        deviceId,
        startSeq: block.startSeq,
        updatedAt,
      });
      if (seq === null) return null;

      const number = formatNumber(format, resolved, seq);
      await store.record({
        sequence: definition.name,
        scopeKey: key,
        seq,
        number,
        issuedAt: updatedAt,
        deviceId,
        blockStart: block.startSeq,
      });
      return allocationOf(definition.name, key, resolved, seq, number, deviceId, block.startSeq);
    });
  }

  /** The device's open block for a scope, or null. */
  openBlock(name: string, scope: ScopeValues, deviceId?: string): Promise<BlockSummary | null> {
    const definition = this.definition(name);
    const resolved = resolveScope(definition, scope, this.clock());
    const target = deviceId ?? this.deviceId;
    if (!target) {
      throw new SequenceDefinitionError(`reading a block of "${name}" needs a device id`);
    }
    return this.store.openBlock(definition.name, scopeKey(resolved), target);
  }

  /**
   * Releases a block the device will not use further.
   *
   * The numbers it did not use stay burnt: they are not returned to the sequence, because a
   * receipt that may already have been printed must never be handed to someone else.
   */
  async releaseBlock(
    name: string,
    scope: ScopeValues,
    block: { startSeq: number; deviceId?: string }
  ): Promise<void> {
    const definition = this.definition(name);
    const resolved = resolveScope(definition, scope, this.clock());
    const target = block.deviceId ?? this.deviceId;
    if (!target) {
      throw new SequenceDefinitionError(`releasing a block of "${name}" needs a device id`);
    }
    await this.store.releaseBlock({
      sequence: definition.name,
      scopeKey: scopeKey(resolved),
      deviceId: target,
      startSeq: block.startSeq,
      updatedAt: this.clock().toISOString(),
    });
  }

  /** Every block the hub knows about. */
  blocks(filter?: {
    sequence?: string;
    scopeKey?: string;
    deviceId?: string;
  }): Promise<readonly BlockSummary[]> {
    return this.store.blocks(filter);
  }

  /**
   * The blocks still holding numbers.
   *
   * This is what the hub reports so an administrator can see which numbers a disconnected device
   * is holding and which blocks can be retired.
   */
  outstandingBlocks(filter?: {
    sequence?: string;
    scopeKey?: string;
    deviceId?: string;
  }): Promise<readonly BlockSummary[]> {
    return this.store.outstandingBlocks(filter);
  }

  /** A copy of this service bound to a transaction. */
  private boundTo(store: SequenceStore): SequenceService {
    return new SequenceService({
      store,
      definitions: this.definitions,
      deviceId: this.deviceId,
      blockSize: this.blockSize,
      failurePolicy: this.failurePolicy,
      now: this.clock,
    });
  }

  /**
   * Runs `work` where the policy says the allocation belongs.
   *
   * `burn` opens a store transaction that commits on its own, so the number survives a later
   * failure. That needs no transaction already open; when one is, the caller must either issue
   * the number first or ask for `reuse`, and the error says so.
   */
  private async runInUnit<T>(
    policy: FailurePolicy,
    work: (store: SequenceStore) => Promise<T>
  ): Promise<T> {
    if (policy === 'reuse') return work(this.store);
    try {
      return await this.store.transaction(work);
    } catch (error) {
      if (error instanceof SequenceStoreError && error.code === 'nested_transaction') {
        throw new SequencePolicyError(
          'a "burn" allocation commits on its own, but a transaction is already open; issue the number before opening it or use the "reuse" policy',
          { cause: error }
        );
      }
      throw error;
    }
  }
}

function allocationOf(
  sequence: string,
  scopeKey: string,
  scope: ScopeValues,
  seq: number,
  number: string,
  deviceId?: string,
  blockStart?: number
): Allocation {
  return {
    sequence,
    scopeKey,
    scope,
    seq,
    number,
    ...(deviceId === undefined ? {} : { deviceId }),
    ...(blockStart === undefined ? {} : { blockStart }),
  };
}

/** The compiled format of a definition, exposed so a caller can reuse it across many numbers. */
export function compileSequence(name: string, catalog: SequenceCatalog = CATALOG): CompiledFormat {
  return compileDefinition(definitionFor(name, catalog));
}
