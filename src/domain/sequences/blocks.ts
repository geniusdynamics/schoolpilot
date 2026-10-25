// ABOUTME: The device side of server-allocated number blocks: it numbers documents from the block
// ABOUTME: it holds, tops the block up from the hub when one runs out, and fails loudly when it is
// ABOUTME: offline with none - so two devices can never issue the same number.

import { SequenceBlockExhaustedError } from './errors';
import { resolveScopeKey } from './scope';
import { DEFAULT_BLOCK_SIZE, type SequenceService } from './service';
import type { Allocation, BlockReservation, BlockSummary, ScopeValues } from './types';

/** A request for a fresh range of numbers. */
export interface BlockRequest {
  readonly sequence: string;
  readonly scope: ScopeValues;
  /** The device the range belongs to. It is recorded on the block, and reported to an operator. */
  readonly deviceId: string;
  readonly size: number;
}

/**
 * Where a device gets a fresh range of numbers.
 *
 * The hub over HTTP satisfies it; so does anything a test or a single-device deployment puts in
 * its place. The port is deliberately one call: a device never reads the hub's counter, it asks
 * for a range and is told which one it got.
 */
export interface BlockSource {
  allocateBlock(request: BlockRequest): Promise<BlockReservation>;
}

export interface BlockAllocatorOptions {
  /** The device's own sequences: the block it holds and the ledger of what it issued. */
  readonly service: SequenceService;
  /** The device this allocator numbers for; it is recorded on every block and number. */
  readonly deviceId: string;
  /**
   * The hub that hands out ranges.
   *
   * Without one the device is the only authority for its own numbers - a single-device
   * deployment has no other device to collide with - so it numbers straight from its own
   * counter. With one, every number comes from a range the hub allocated.
   */
  readonly hub?: BlockSource;
  /** How many numbers to ask the hub for. Defaults to {@link DEFAULT_BLOCK_SIZE}. */
  readonly blockSize?: number;
}

/**
 * Numbers documents on a device that may be offline.
 *
 * The rule is one sentence: **a number is issued from a block, and a block comes from the hub**.
 * A device that holds part of a block hands numbers out while it is disconnected; when the block
 * runs out it asks the hub for another one; when it cannot, it refuses to issue rather than invent
 * or reuse a number. Gaps are the accepted cost - a block that is abandoned or lost stays burnt,
 * because a number that may already be on a printed receipt must never be handed to anyone else.
 *
 * The allocator is a drop-in for anything that issues a document number: it has the same `issue`
 * verb the sequences module and the payments core's `DocumentNumberSource` port have.
 */
export class BlockAllocator {
  private readonly service: SequenceService;
  private readonly deviceId: string;
  private readonly hub: BlockSource | undefined;
  private readonly blockSize: number;

  constructor(options: BlockAllocatorOptions) {
    const blockSize = options.blockSize ?? DEFAULT_BLOCK_SIZE;
    if (!Number.isSafeInteger(blockSize) || blockSize < 1) {
      throw new RangeError(`a block size must be a positive integer, got ${blockSize}`);
    }
    this.service = options.service;
    this.deviceId = options.deviceId;
    this.hub = options.hub;
    this.blockSize = blockSize;
  }

  /**
   * Issues the next number of a sequence.
   *
   * The block the device holds is spent first. When it is empty - or the device holds none - the
   * hub is asked for a new one. A hub that cannot answer leaves the caller with a
   * {@link SequenceBlockExhaustedError} and no number.
   */
  async issue(name: string, scope: ScopeValues): Promise<Allocation> {
    const held = await this.service.issueFromBlock(name, scope, { deviceId: this.deviceId });
    if (held) return held;

    if (!this.hub) return this.service.issue(name, scope, { deviceId: this.deviceId });

    await this.topUp(name, scope);
    const issued = await this.service.issueFromBlock(name, scope, { deviceId: this.deviceId });
    if (!issued) throw this.exhausted(name, scope);
    return issued;
  }

  /** The block the device holds for a scope, or null. */
  openBlock(name: string, scope: ScopeValues): Promise<BlockSummary | null> {
    return this.service.openBlock(name, scope, this.deviceId);
  }

  /**
   * Asks the hub for a range and records it locally.
   *
   * Only the hub call is turned into an exhausted-block refusal: a device that cannot reach the
   * hub has no numbers. A hub whose answer does not fit the request is a different fault, and
   * `adoptBlock` raises it rather than folding a foreign range into this sequence.
   */
  private async topUp(name: string, scope: ScopeValues): Promise<void> {
    const hub = this.hub;
    if (!hub) throw this.exhausted(name, scope);

    let reservation: BlockReservation;
    try {
      reservation = await hub.allocateBlock({
        sequence: name,
        scope,
        deviceId: this.deviceId,
        size: this.blockSize,
      });
    } catch (error) {
      throw this.exhausted(name, scope, error);
    }

    await this.service.adoptBlock(name, scope, reservation);
  }

  /** The refusal a device with no numbers left raises. */
  private exhausted(name: string, scope: ScopeValues, cause?: unknown): SequenceBlockExhaustedError {
    return new SequenceBlockExhaustedError(
      {
        sequence: name,
        scopeKey: resolveScopeKey(this.service.definition(name), scope).scopeKey,
        deviceId: this.deviceId,
      },
      cause === undefined ? {} : { cause }
    );
  }
}
