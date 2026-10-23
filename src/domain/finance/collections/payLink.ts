// ABOUTME: Pay links: a link a payer follows to pay, carrying an opaque token, an expiry and an
// ABOUTME: HMAC signature and nothing else. The row behind it holds the learner, the payer and the
// ABOUTME: amount, so a link that leaks reveals no personal data. Signing is injected; the default
// ABOUTME: uses Web Crypto HMAC-SHA256, available in the browser and in Node.

import { CollectionsError } from './errors';
import type { PayLink, PayLinkSigner, PayLinkUrlParts, PayLinkVerification } from './types';

/** The string a pay link's signature covers: the token and the expiry, and nothing else. */
export function payLinkPayload(parts: Pick<PayLinkUrlParts, 'token' | 'expiresAt'>): string {
  return `${parts.token}.${parts.expiresAt}`;
}

/**
 * The URL a payer follows.
 *
 * It carries the token, the expiry and the signature. It carries no learner id, no payer id, no
 * name, no phone number and no amount: everything the payment page needs is looked up from the
 * token, server-side, when the link is opened.
 */
export function payLinkUrl(input: {
  readonly baseUrl: string;
  readonly token: string;
  readonly expiresAt: string;
  readonly signature: string;
}): string {
  const separator = input.baseUrl.includes('?') ? '&' : '?';
  const query = new URLSearchParams({
    t: input.token,
    e: input.expiresAt,
    s: input.signature,
  });
  return `${input.baseUrl}${separator}${query.toString()}`;
}

/** Reads the three parts back out of a pay link URL. */
export function parsePayLinkUrl(url: string): PayLinkUrlParts {
  let parsed: URL;
  try {
    parsed = new URL(url, 'https://pay.invalid/');
  } catch (error) {
    throw new CollectionsError('pay_link_not_found', `"${url}" is not a URL a pay link can be read from`, {
      detail: { url },
      cause: error,
    });
  }
  const token = parsed.searchParams.get('t');
  const expiresAt = parsed.searchParams.get('e');
  const signature = parsed.searchParams.get('s');
  if (!token || !expiresAt || !signature) {
    throw new CollectionsError(
      'pay_link_not_found',
      'a pay link needs a token, an expiry and a signature',
      { detail: { url } }
    );
  }
  return { token, expiresAt, signature };
}

/**
 * The first piece of personal data a link carries, or null.
 *
 * The check the module's own test uses, exported so a caller can assert it too: given the values
 * that must never travel in a link (a learner id, a payer id, a name, a phone number, an amount),
 * it returns the first one the URL contains.
 */
export function payLinkLeaksPersonalData(url: string, sensitive: readonly string[]): string | null {
  const haystack = url.toLowerCase();
  for (const value of sensitive) {
    const needle = value.trim().toLowerCase();
    if (needle === '') continue;
    if (haystack.includes(needle)) return value;
  }
  return null;
}

/** Whether a stored link is past its expiry. */
export function isPayLinkExpired(link: PayLink, now: Date): boolean {
  return Date.parse(link.expiresAt) <= now.getTime();
}

/** True when the signature verifies for the parts. */
export async function verifyPayLinkSignature(
  signer: PayLinkSigner,
  parts: PayLinkUrlParts
): Promise<boolean> {
  return signer.verify(payLinkPayload(parts), parts.signature);
}

/**
 * Verifies a pay link end to end.
 *
 * The order is deliberate: an unknown token is refused before any cryptography, a signature that
 * does not verify before the record is trusted, and a used link before an expiry is reported - so
 * an expired link the payer already used says so rather than inviting a second payment.
 */
export async function verifyPayLink(input: {
  readonly signer: PayLinkSigner;
  readonly parts: PayLinkUrlParts;
  readonly record: PayLink | null;
  readonly now?: Date;
}): Promise<PayLinkVerification> {
  const { parts, record } = input;
  if (!record || record.token !== parts.token) {
    return { valid: false, reason: 'unknown_token', link: null };
  }
  const signatureOk =
    record.expiresAt === parts.expiresAt && (await verifyPayLinkSignature(input.signer, parts));
  if (!signatureOk) return { valid: false, reason: 'bad_signature', link: record };
  if (record.usedAt !== null) return { valid: false, reason: 'already_used', link: record };
  if (isPayLinkExpired(record, input.now ?? new Date())) {
    return { valid: false, reason: 'expired', link: record };
  }
  return { valid: true, reason: 'ok', link: record };
}

const encoder = new TextEncoder();

function subtleCrypto(): SubtleCrypto {
  const crypto = globalThis.crypto;
  if (!crypto?.subtle) {
    throw new CollectionsError(
      'crypto_unavailable',
      'pay-link signing needs the Web Crypto API (crypto.subtle), which this runtime does not expose'
    );
  }
  return crypto.subtle;
}

function toHex(bytes: ArrayBuffer): string {
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function fromHex(hex: string): Uint8Array | null {
  if (hex.length === 0 || hex.length % 2 !== 0 || !/^[0-9a-f]+$/i.test(hex)) return null;
  const bytes = new Uint8Array(hex.length / 2);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16);
  }
  return bytes;
}

/**
 * An HMAC-SHA256 pay-link signer.
 *
 * The secret is the caller's; the module never stores or logs it. The imported key is cached per
 * signer, so a run signs many links without re-importing it.
 */
export function createWebCryptoPayLinkSigner(options: { readonly secret: string }): PayLinkSigner {
  if (options.secret === '') {
    throw new CollectionsError('pay_link_signature', 'a pay-link signer needs a non-empty secret');
  }
  let key: Promise<CryptoKey> | null = null;
  const importKey = (): Promise<CryptoKey> => {
    key ??= subtleCrypto().importKey(
      'raw',
      encoder.encode(options.secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign', 'verify']
    );
    return key;
  };

  return {
    async sign(payload: string): Promise<string> {
      const signature = await subtleCrypto().sign('HMAC', await importKey(), encoder.encode(payload));
      return toHex(signature);
    },
    async verify(payload: string, signature: string): Promise<boolean> {
      const bytes = fromHex(signature);
      if (!bytes) return false;
      return subtleCrypto().verify('HMAC', await importKey(), bytes, encoder.encode(payload));
    },
  };
}
