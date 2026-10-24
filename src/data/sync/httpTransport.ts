// ABOUTME: The HTTP wire between a device and a hub: one batched push and one pull page per
// ABOUTME: call, over the `/api/sync` routes the hub serves.

import type { Envelope, Snapshot } from './envelope';
import type { SyncTransport } from './node';
import type { ReplicaScope } from './scope';
import type { ApplyResult } from './store';

export interface HttpSyncTransportOptions {
  /** The hub's origin, without a trailing slash, e.g. `http://192.168.1.10:3000`. */
  readonly baseUrl: string;
  /** The replica's scope; the hub filters the change log by it and refuses out-of-scope pushes. */
  readonly scope?: ReplicaScope;
  /** Extra headers, such as the actor a later task authenticates. */
  readonly headers?: Readonly<Record<string, string>>;
  /** The fetch implementation; defaults to the platform's. */
  readonly fetch?: typeof fetch;
}

/**
 * Builds the device side of the sync wire.
 *
 * A failed request throws: a transport that silently answered an empty page would move the
 * cursor past changes nobody stored. The hub's refusals travel in the results array, so a
 * batch that carries one bad change still delivers the rest.
 */
export function createHttpSyncTransport(options: HttpSyncTransportOptions): SyncTransport {
  const baseUrl = options.baseUrl.replace(/\/+$/, '');
  const request = options.fetch ?? fetch;

  async function send(path: string, init: RequestInit): Promise<unknown> {
    const response = await request(`${baseUrl}${path}`, {
      ...init,
      headers: {
        'content-type': 'application/json',
        ...options.headers,
        ...(init.headers as Record<string, string> | undefined),
      },
    });

    const text = await response.text();
    const body: unknown = text === '' ? undefined : JSON.parse(text);
    if (!response.ok) {
      const message =
        body !== null && typeof body === 'object' && 'error' in body
          ? JSON.stringify((body as { error: unknown }).error)
          : `${response.status} ${response.statusText}`;
      throw new Error(`the sync request to ${path} failed: ${message}`);
    }
    return body;
  }

  return {
    async push(changes: readonly Envelope[]): Promise<readonly ApplyResult[]> {
      const body = (await send('/api/sync/push', {
        method: 'POST',
        body: JSON.stringify({ changes }),
      })) as { results?: ApplyResult[] } | undefined;
      if (!body || !Array.isArray(body.results)) {
        throw new Error('the sync push answered no results');
      }
      return body.results;
    },

    async pull(since: number): Promise<{ snapshots: readonly Snapshot[]; cursor: number }> {
      const query = new URLSearchParams({ since: String(since) });
      if (options.scope) {
        query.set('institutionId', options.scope.institutionId);
        if (options.scope.entities) query.set('entities', JSON.stringify(options.scope.entities));
      }

      const body = (await send(`/api/sync/changes?${query.toString()}`, {
        method: 'GET',
      })) as { snapshots?: Snapshot[]; cursor?: number } | undefined;
      if (!body || !Array.isArray(body.snapshots) || typeof body.cursor !== 'number') {
        throw new Error('the sync pull answered no page');
      }
      return { snapshots: body.snapshots, cursor: body.cursor };
    },
  };
}
