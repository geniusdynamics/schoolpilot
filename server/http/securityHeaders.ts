// ABOUTME: The response headers the hub sets on every reply: no sniffing, no framing, no referrer,
// ABOUTME: no caching, and a policy that lets an API reply load nothing at all.

import type { ServerResponse } from 'node:http';

/**
 * The hub's security headers.
 *
 * The hub serves JSON, so its own policy is `default-src 'none'`: if a response were ever
 * rendered as a document, nothing in it could load. `frame-ancestors` is a header-only directive,
 * which is why it is here and not in the app's `<meta>` policy, and it is the clickjacking control
 * for the hub's surface. `no-store` keeps restricted values out of a browser's disk cache and out
 * of any proxy between the client and the hub.
 */
export const SECURITY_HEADERS: Readonly<Record<string, string>> = {
  'content-security-policy':
    "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'; sandbox",
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'DENY',
  'referrer-policy': 'no-referrer',
  'cross-origin-opener-policy': 'same-origin',
  'cross-origin-resource-policy': 'same-origin',
  'permissions-policy': 'camera=(), microphone=(), geolocation=(), payment=()',
  'cache-control': 'no-store',
};

/** Sets the hub's security headers on a response. */
export function applySecurityHeaders(res: ServerResponse): void {
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    res.setHeader(name, value);
  }
}
