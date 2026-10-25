// ABOUTME: The three random values of an authorisation request: the PKCE verifier and its S256
// ABOUTME: challenge, the state that ties the redirect back to this sign-in, and the nonce the ID
// ABOUTME: token has to echo.

import { createHash, randomBytes } from 'node:crypto';

/** A PKCE pair as RFC 7636 defines it. */
export interface PkcePair {
  /** The secret the hub keeps between the two legs and sends only at the token endpoint. */
  readonly verifier: string;
  /** What travels in the authorisation URL. */
  readonly challenge: string;
  readonly method: 'S256';
}

/** A fresh verifier and its S256 challenge. 32 random bytes, base64url, inside the RFC's limits. */
export function newPkce(): PkcePair {
  const verifier = randomBytes(32).toString('base64url');
  return { verifier, challenge: challengeFor(verifier), method: 'S256' };
}

/** The S256 challenge of a verifier: base64url(sha256(ASCII(verifier))). */
export function challengeFor(verifier: string): string {
  return createHash('sha256').update(verifier, 'ascii').digest('base64url');
}

/** An opaque state, so a redirect can be matched to the sign-in that started it. */
export function newState(): string {
  return randomBytes(32).toString('base64url');
}

/** An opaque nonce, which the ID token has to echo to prove it answers this request. */
export function newNonce(): string {
  return randomBytes(32).toString('base64url');
}
