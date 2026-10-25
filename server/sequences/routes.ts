// ABOUTME: The hub's sequence API: it hands a device a block of numbers for a named sequence, and
// ABOUTME: reports the blocks still holding numbers, over the `SequenceService` the hub opens
// ABOUTME: beside its repository.

import type { SequenceService, ScopeValues } from '@/domain/sequences';

import { HttpError, readJsonBody, requireObject } from '../http/http';
import type { Router } from '../http/router';

export interface SequenceRouteOptions {
  /**
   * The hub's sequences.
   *
   * It must resolve the same catalog the devices resolve: a block is handed out for the scope key
   * the hub computes, and the device records it under the scope key it computes, so two catalogs
   * that partition a sequence differently would print the same number twice. The hub and the
   * cashier both use the built-in catalog.
   */
  readonly sequences: SequenceService;
}

/** Registers the sequence API under `/api/sequences`. */
export function addSequenceRoutes(router: Router, options: SequenceRouteOptions): void {
  router.add('POST', '/api/sequences/blocks', async (request) => {
    const body = requireObject(await readJsonBody(request.req));
    const sequence = requireName(body, 'sequence');
    const deviceId = requireName(body, 'deviceId');
    const scope = requireScope(body.scope);
    const size = optionalSize(body.size);

    // Authenticated by default: a device must be signed in before the hub will reserve numbers for
    // it, so an unauthenticated caller cannot burn a school's receipt range.
    const block = await options.sequences.reserveBlock(sequence, scope, {
      deviceId,
      ...(size === undefined ? {} : { size }),
    });
    return { status: 201, body: { block } };
  });

  router.add('GET', '/api/sequences/blocks', async (request) => {
    const sequence = queryValue(request.url, 'sequence');
    const deviceId = queryValue(request.url, 'deviceId');
    return {
      body: {
        blocks: await options.sequences.outstandingBlocks({
          ...(sequence === undefined ? {} : { sequence }),
          ...(deviceId === undefined ? {} : { deviceId }),
        }),
      },
    };
  });
}

/** A required non-empty string field. */
function requireName(body: Readonly<Record<string, unknown>>, name: string): string {
  const value = body[name];
  if (typeof value !== 'string' || value.length === 0) {
    throw new HttpError(400, 'invalid_body', `${name} must be a non-empty string`);
  }
  return value;
}

/** The scope a device asks a block for: a map of scope segments to strings and numbers. */
function requireScope(value: unknown): ScopeValues {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new HttpError(400, 'invalid_body', 'scope must be a JSON object of scope values');
  }

  const scope: ScopeValues = {};
  for (const [segment, raw] of Object.entries(value as Record<string, unknown>)) {
    if (typeof raw !== 'string' && typeof raw !== 'number') {
      throw new HttpError(400, 'invalid_body', `scope.${segment} must be a string or a number`);
    }
    scope[segment as keyof ScopeValues] = raw;
  }
  return scope;
}

/** How many numbers to reserve; absent leaves the service's own block size. */
function optionalSize(value: unknown): number | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1) {
    throw new HttpError(400, 'invalid_body', 'size must be a positive integer');
  }
  return value;
}

function queryValue(url: URL, name: string): string | undefined {
  const raw = url.searchParams.get(name);
  return raw === null || raw === '' ? undefined : raw;
}
