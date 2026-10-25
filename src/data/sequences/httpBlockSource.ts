// ABOUTME: The HTTP wire between a device and a hub for number blocks: one authenticated request
// ABOUTME: for a range of numbers, over the `/api/sequences/blocks` route the hub serves.

import type { BlockSource, BlockRequest } from '@/domain/sequences';
import type { BlockReservation } from '@/domain/sequences';

export interface HttpBlockSourceOptions {
  /** The hub's origin, without a trailing slash, e.g. `http://192.168.1.10:3000`. */
  readonly baseUrl: string;
  /** Extra headers; the bearer session the hub requires goes here. */
  readonly headers?: Readonly<Record<string, string>>;
  /** The fetch implementation; defaults to the platform's. */
  readonly fetch?: typeof fetch;
}

/**
 * Builds the device side of the number-block wire.
 *
 * A failed request throws: the allocator above turns that into an exhausted block, because a
 * device that cannot reach the hub has no numbers. The hub's answer is returned as it came, and
 * the allocator checks that it fits the request before recording it.
 */
export function createHttpBlockSource(options: HttpBlockSourceOptions): BlockSource {
  const baseUrl = options.baseUrl.replace(/\/+$/, '');
  const request = options.fetch ?? fetch;

  return {
    async allocateBlock(input: BlockRequest): Promise<BlockReservation> {
      const response = await request(`${baseUrl}/api/sequences/blocks`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...options.headers },
        body: JSON.stringify(input),
      });

      const text = await response.text();
      const body: unknown = text === '' ? undefined : JSON.parse(text);
      if (!response.ok) {
        const message =
          body !== null && typeof body === 'object' && 'error' in body
            ? JSON.stringify((body as { error: unknown }).error)
            : `${response.status} ${response.statusText}`;
        throw new Error(`the block request failed: ${message}`);
      }

      const block = (body as { block?: BlockReservation } | undefined)?.block;
      if (!block) throw new Error('the hub answered no block');
      return block;
    },
  };
}
