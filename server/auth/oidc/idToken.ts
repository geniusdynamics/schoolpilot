// ABOUTME: Verification of an OpenID Connect ID token: the signature against the issuer's keys, and
// ABOUTME: then the issuer, audience, nonce and lifetime claims that make the token this sign-in's.

import { verify as cryptoVerify, type KeyObject } from 'node:crypto';

import { safeEqual } from '../tokens';
import { OidcError } from './errors';

/** The signature algorithms the hub accepts. Symmetric and unsigned tokens are never among them. */
export const ACCEPTED_ID_TOKEN_ALGORITHMS = [
  'RS256',
  'RS384',
  'RS512',
  'ES256',
  'ES384',
  'ES512',
] as const;

/** The most a token may weigh before the hub refuses to parse it. */
export const MAX_ID_TOKEN_BYTES = 64 * 1024;

/** How far apart two clocks may be before a token looks early or expired. */
export const DEFAULT_CLOCK_SKEW_SECONDS = 60;

/** The claims of an ID token, once the token has been verified. */
export interface IdTokenClaims {
  readonly iss: string;
  readonly sub: string;
  readonly aud: string | readonly string[];
  readonly exp: number;
  readonly iat?: number;
  readonly nbf?: number;
  readonly nonce?: string;
  readonly azp?: string;
  readonly email?: string;
  readonly email_verified?: boolean | string;
  readonly name?: string;
  readonly [claim: string]: unknown;
}

/** What a caller needs to verify an ID token. */
export interface VerifyIdTokenOptions {
  readonly token: string;
  /** The issuer the hub was configured with; the token must name it exactly. */
  readonly issuer: string;
  readonly clientId: string;
  /** The nonce the hub put in the authorisation request this token answers. */
  readonly nonce: string;
  /** The keys that may have signed it, in the order they are tried. */
  readonly keys: readonly KeyObject[];
  readonly now?: Date;
  readonly clockSkewSeconds?: number;
}

/** A JWT as it arrives: header, payload and signature, base64url-encoded. */
interface ParsedJwt {
  readonly header: Record<string, unknown>;
  readonly payload: Record<string, unknown>;
  readonly signingInput: string;
  readonly signature: Buffer;
}

/**
 * Verifies an ID token and returns its claims.
 *
 * Everything here is untrusted input from the network. The algorithm is chosen from an allowlist
 * rather than read from the token, so `alg: none` and an HMAC token signed with the client secret
 * are refused before a key is ever selected; the signature is checked before a single claim is
 * believed; and the issuer, audience, nonce and lifetime are then checked against what this
 * sign-in actually asked for. Every failure is the same refusal, so nothing about why is leaked.
 */
export function verifyIdToken(options: VerifyIdTokenOptions): IdTokenClaims {
  if (typeof options.token !== 'string' || options.token.length === 0) {
    throw refuse('the identity provider returned no ID token');
  }
  if (options.token.length > MAX_ID_TOKEN_BYTES) {
    throw refuse('the ID token is larger than the hub accepts');
  }

  const parsed = parseJwt(options.token);
  const algorithm = parsed.header.alg;
  if (typeof algorithm !== 'string' || !isAccepted(algorithm)) {
    throw refuse('the ID token is signed with an algorithm the hub does not accept');
  }
  if (options.keys.length === 0) {
    throw refuse('no key was available to check the ID token');
  }

  const signed = Buffer.from(parsed.signingInput, 'utf8');
  const verified = options.keys.some((key) => verifies(algorithm, signed, key, parsed.signature));
  if (!verified) throw refuse('the ID token signature does not check out');

  const claims = parsed.payload;
  assertIssuer(claims, options.issuer);
  assertAudience(claims, options.clientId);
  assertLifetime(claims, options.now ?? new Date(), options.clockSkewSeconds ?? DEFAULT_CLOCK_SKEW_SECONDS);
  assertNonce(claims, options.nonce);
  if (typeof claims.sub !== 'string' || claims.sub.length === 0) {
    throw refuse('the ID token names no subject');
  }

  return claims as unknown as IdTokenClaims;
}

/** The claims of a token without verifying it: for reading a key id, and for tests. */
export function readJwtHeader(token: string): Record<string, unknown> {
  return parseJwt(token).header;
}

function parseJwt(token: string): ParsedJwt {
  const parts = token.split('.');
  if (parts.length !== 3) throw refuse('the ID token is not a JWT');
  const [headerPart, payloadPart, signaturePart] = parts as [string, string, string];
  if (!headerPart || !payloadPart) throw refuse('the ID token is not a JWT');

  const header = decodeObject(headerPart, 'header');
  const payload = decodeObject(payloadPart, 'payload');

  let signature: Buffer;
  try {
    signature = Buffer.from(signaturePart.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
  } catch {
    throw refuse('the ID token signature is not base64url');
  }
  if (signature.length === 0) throw refuse('the ID token carries no signature');

  return { header, payload, signingInput: `${headerPart}.${payloadPart}`, signature };
}

function decodeObject(part: string, what: string): Record<string, unknown> {
  let text: string;
  try {
    text = Buffer.from(part.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
  } catch {
    throw refuse(`the ID token ${what} is not base64url`);
  }

  let value: unknown;
  try {
    value = JSON.parse(text) as unknown;
  } catch {
    throw refuse(`the ID token ${what} is not JSON`);
  }
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw refuse(`the ID token ${what} is not an object`);
  }
  return value as Record<string, unknown>;
}

function isAccepted(algorithm: string): boolean {
  return (ACCEPTED_ID_TOKEN_ALGORITHMS as readonly string[]).includes(algorithm);
}

const DIGESTS: Readonly<Record<string, string>> = {
  RS256: 'sha256',
  RS384: 'sha384',
  RS512: 'sha512',
  ES256: 'sha256',
  ES384: 'sha384',
  ES512: 'sha512',
};

function verifies(
  algorithm: string,
  data: Buffer,
  key: KeyObject,
  signature: Buffer
): boolean {
  const digest = DIGESTS[algorithm];
  if (digest === undefined) return false;
  try {
    if (algorithm.startsWith('ES')) {
      // A JWS ECDSA signature is the raw R||S pair, not the DER sequence OpenSSL writes.
      return cryptoVerify(digest, data, { key, dsaEncoding: 'ieee-p1363' }, signature);
    }
    return cryptoVerify(digest, data, key, signature);
  } catch {
    // A key that cannot check this algorithm is not a key that signed the token.
    return false;
  }
}

function assertIssuer(claims: Record<string, unknown>, issuer: string): void {
  if (claims.iss !== issuer) throw refuse('the ID token names another issuer');
}

function assertAudience(claims: Record<string, unknown>, clientId: string): void {
  const aud = claims.aud;
  if (typeof aud === 'string') {
    if (aud !== clientId) throw refuse('the ID token is for another client');
    return;
  }
  if (!Array.isArray(aud) || !aud.every((entry) => typeof entry === 'string')) {
    throw refuse('the ID token names no audience');
  }
  if (!aud.includes(clientId)) throw refuse('the ID token is for another client');
  // With more than one audience the token must say which client it was issued to.
  if (aud.length > 1 && claims.azp !== clientId) {
    throw refuse('the ID token does not say it was issued to this client');
  }
}

function assertLifetime(
  claims: Record<string, unknown>,
  now: Date,
  skewSeconds: number
): void {
  const seconds = Math.floor(now.getTime() / 1000);
  const exp = claims.exp;
  if (typeof exp !== 'number' || !Number.isFinite(exp)) {
    throw refuse('the ID token has no expiry');
  }
  if (exp + skewSeconds <= seconds) throw refuse('the ID token has expired');

  const iat = claims.iat;
  if (iat !== undefined) {
    if (typeof iat !== 'number' || !Number.isFinite(iat)) {
      throw refuse('the ID token has an unreadable issue time');
    }
    if (iat - skewSeconds > seconds) throw refuse('the ID token was issued in the future');
  }

  const nbf = claims.nbf;
  if (nbf !== undefined) {
    if (typeof nbf !== 'number' || !Number.isFinite(nbf)) {
      throw refuse('the ID token has an unreadable not-before time');
    }
    if (nbf - skewSeconds > seconds) throw refuse('the ID token is not valid yet');
  }
}

function assertNonce(claims: Record<string, unknown>, nonce: string): void {
  const claimed = claims.nonce;
  if (typeof claimed !== 'string' || !safeEqual(claimed, nonce)) {
    throw refuse('the ID token does not answer this sign-in');
  }
}

function refuse(message: string): OidcError {
  return new OidcError('invalid_id_token', message);
}
