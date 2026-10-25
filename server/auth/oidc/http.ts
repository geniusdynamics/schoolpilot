// ABOUTME: The two guards every call to an identity provider goes through: a fetch that always has
// ABOUTME: a deadline, and the check that an endpoint a provider document names is one the hub may trust.

import { OidcError } from './errors';

/** How long the hub waits on an identity provider before giving up. */
export const PROVIDER_TIMEOUT_MS = 10_000;

/**
 * Fetches with a deadline.
 *
 * A provider that never answers must not hold a sign-in open forever, and a hub behind a school
 * line is exactly where that happens. The wait is bounded by racing the request against a timer
 * rather than by an `AbortSignal`: the hub runs in Node, but its tests run in a browser-like
 * environment whose `AbortSignal` is a different class from the one the platform fetch insists
 * on, and an implementation that only cancels in one of the two would be verified in neither.
 * The abandoned request is left to the platform to reap; the caller never waits past the deadline.
 */
export async function fetchWithTimeout(
  fetchImpl: typeof fetch,
  url: string,
  init: RequestInit,
  timeoutMs: number = PROVIDER_TIMEOUT_MS
): Promise<Response> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () =>
        reject(
          new OidcError('provider_unavailable', `the identity provider did not answer within ${timeoutMs} ms`)
        ),
      timeoutMs
    );
  });

  try {
    return await Promise.race([fetchImpl(url, init), deadline]);
  } catch (error) {
    if (error instanceof OidcError) throw error;
    throw new OidcError(
      'provider_unavailable',
      `the identity provider did not answer: ${messageOf(error)}`
    );
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

/**
 * The URL an endpoint of a provider document names, or a refusal.
 *
 * Discovery documents are untrusted input: the hub reached the issuer because an operator named
 * it, but the endpoints inside the document come back over the wire. Only `https` is accepted —
 * a plain-HTTP endpoint would let anyone on the path read the authorisation code and the client
 * secret — with one deliberate exception: a loopback address, which is how a provider that runs
 * beside the hub (and the test suite) is reached. Nothing remote can be loopback.
 */
export function assertSecureEndpoint(value: unknown, what: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new OidcError('discovery_failed', `the provider document names no ${what}`);
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new OidcError('discovery_failed', `the provider's ${what} is not a URL`);
  }

  if (url.protocol === 'https:') return url.toString();
  if (url.protocol === 'http:' && isLoopback(url.hostname)) return url.toString();
  throw new OidcError(
    'insecure_endpoint',
    `the provider's ${what} is not served over https`
  );
}

function isLoopback(hostname: string): boolean {
  const host = hostname.replace(/^\[|\]$/g, '').toLowerCase();
  return host === '127.0.0.1' || host === 'localhost' || host === '::1';
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
