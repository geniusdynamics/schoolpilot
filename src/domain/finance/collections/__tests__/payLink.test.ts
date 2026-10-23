// ABOUTME: Pay links: the HMAC signature over the token and expiry, the URL that carries only those
// ABOUTME: three parts, and the refusals for an unknown, tampered, used or expired link.

import { describe, expect, it } from 'vitest';

import { fromMinor } from '@/domain/money';

import {
  createWebCryptoPayLinkSigner,
  isCollectionsError,
  isPayLinkExpired,
  parsePayLinkUrl,
  payLinkLeaksPersonalData,
  payLinkPayload,
  payLinkUrl,
  verifyPayLink,
  verifyPayLinkSignature,
  type PayLink,
  type PayLinkUrlParts,
} from '..';

const SECRET = 'a-test-secret-that-is-never-used-in-production';
const TOKEN = '01930000-0000-7000-8000-0000000000ab';
const EXPIRES = '2027-03-01T00:00:00.000Z';
const BASE_URL = 'https://pay.example.test/fees';
const signer = createWebCryptoPayLinkSigner({ secret: SECRET });

async function parts(overrides: Partial<PayLinkUrlParts> = {}): Promise<PayLinkUrlParts> {
  const token = overrides.token ?? TOKEN;
  const expiresAt = overrides.expiresAt ?? EXPIRES;
  return {
    token,
    expiresAt,
    signature: overrides.signature ?? (await signer.sign(payLinkPayload({ token, expiresAt }))),
  };
}

async function record(overrides: Partial<PayLink> = {}): Promise<PayLink> {
  const signed = await parts();
  return {
    token: signed.token,
    institutionId: 'inst-1',
    documentKey: 'inv-1',
    payerId: 'guardian-1',
    amount: fromMinor(500_000, 'KES'),
    createdAt: '2027-02-01T00:00:00.000Z',
    expiresAt: signed.expiresAt,
    signature: signed.signature,
    usedAt: null,
    ...overrides,
  };
}

describe('signing a pay link', () => {
  it('signs the token and expiry, and verifies only that payload', async () => {
    const signed = await parts();
    expect(await verifyPayLinkSignature(signer, signed)).toBe(true);
    expect(
      await verifyPayLinkSignature(signer, { ...signed, expiresAt: '2028-01-01T00:00:00.000Z' })
    ).toBe(false);
    expect(await verifyPayLinkSignature(signer, { ...signed, signature: 'deadbeef' })).toBe(false);
  });

  it('refuses a signer with no secret', () => {
    let caught: unknown;
    try {
      createWebCryptoPayLinkSigner({ secret: '' });
    } catch (error) {
      caught = error;
    }
    expect(isCollectionsError(caught) && caught.code).toBe('pay_link_signature');
  });
});

describe('the pay link URL', () => {
  it('round-trips the three parts', async () => {
    const signed = await parts();
    const url = payLinkUrl({ baseUrl: BASE_URL, ...signed });
    expect(parsePayLinkUrl(url)).toEqual(signed);
    expect(() => parsePayLinkUrl(`${BASE_URL}?t=only-a-token`)).toThrowError();
  });

  it('carries no personal data', async () => {
    const signed = await parts();
    const url = payLinkUrl({ baseUrl: BASE_URL, ...signed });
    // The values that must never travel in a link: the document, the payer, the family and the amount.
    expect(payLinkLeaksPersonalData(url, ['inv-1', 'guardian-1', 'Amani Wekesa', '+254711000000', 'KSh 5,000.00'])).toBeNull();
    // The check does catch a leak, so the assertion above is not vacuous.
    expect(payLinkLeaksPersonalData(`${url}&learner=inv-1`, ['inv-1'])).toBe('inv-1');
  });
});

describe('verifying a pay link', () => {
  const now = new Date('2027-02-10T00:00:00.000Z');

  it('accepts a link that is signed, unused and unexpired', async () => {
    const stored = await record();
    const result = await verifyPayLink({ signer, parts: await parts(), record: stored, now });
    expect(result.valid).toBe(true);
    expect(result.reason).toBe('ok');
    expect(result.link?.documentKey).toBe('inv-1');
  });

  it('refuses an unknown token before it looks at anything else', async () => {
    const result = await verifyPayLink({ signer, parts: await parts(), record: null, now });
    expect(result).toMatchObject({ valid: false, reason: 'unknown_token' });
  });

  it('refuses a signature that does not verify', async () => {
    const stored = await record();
    const result = await verifyPayLink({
      signer,
      parts: { ...(await parts()), signature: '00'.repeat(32) },
      record: stored,
      now,
    });
    expect(result).toMatchObject({ valid: false, reason: 'bad_signature' });
  });

  it('refuses an expiry that does not match the stored row', async () => {
    const stored = await record();
    const tampered = await parts({ expiresAt: '2028-01-01T00:00:00.000Z' });
    const result = await verifyPayLink({ signer, parts: tampered, record: stored, now });
    expect(result).toMatchObject({ valid: false, reason: 'bad_signature' });
  });

  it('refuses a used link', async () => {
    const stored = await record({ usedAt: '2027-02-05T00:00:00.000Z' });
    const result = await verifyPayLink({ signer, parts: await parts(), record: stored, now });
    expect(result).toMatchObject({ valid: false, reason: 'already_used' });
  });

  it('refuses an expired link, and knows when it expired', async () => {
    const stored = await record();
    expect(isPayLinkExpired(stored, new Date('2027-03-01T00:00:00.000Z'))).toBe(true);
    const result = await verifyPayLink({
      signer,
      parts: await parts(),
      record: stored,
      now: new Date('2027-03-02T00:00:00.000Z'),
    });
    expect(result).toMatchObject({ valid: false, reason: 'expired' });
  });
});
