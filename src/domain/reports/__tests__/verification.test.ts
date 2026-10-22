// ABOUTME: The verification URL builder and the measured payload budget: an opaque, signed, personal-
// ABOUTME: data-free address, and a preview form the verifier always rejects.

import { describe, expect, it } from 'vitest';
import {
  buildVerificationLink,
  normaliseVerificationHost,
  qrSizeMmFor,
  VERIFICATION_PAYLOAD_BUDGET,
  VerificationLinkError,
} from '../verification';

const HOST = 'https://verify.schoolpilot.app';

describe('verification link', () => {
  it('builds the measured signed URL', () => {
    const link = buildVerificationLink({ host: HOST, documentId: 'RC-2026-000123', signature: '6Kq2x0Yb8m3TfWc' });
    expect(link.url).toBe('https://verify.schoolpilot.app/v1/RC-2026-000123?sig=6Kq2x0Yb8m3TfWc');
    expect(link.preview).toBe(false);
    expect(link.length).toBe(68);
    expect(link.withinBudget).toBe(true);
  });

  it('carries nothing but the document id and the signature', () => {
    const link = buildVerificationLink({ host: HOST, documentId: 'RC-2026-000123', signature: '6Kq2x0Yb8m3TfWc' });
    // The structural guarantee: the builder accepts no name, admission number, mark or fee.
    expect(link.url).not.toMatch(/Amina|Achieng|ADM-|619|12,400/i);
    expect([...new URL(link.url).searchParams.keys()]).toEqual(['sig']);
  });

  it('stays inside the 90-character budget the QR size depends on', () => {
    const link = buildVerificationLink({ host: HOST, documentId: 'RC-2026-000123', signature: '6Kq2x0Yb8m3TfWc' });
    expect(link.length).toBeLessThanOrEqual(VERIFICATION_PAYLOAD_BUDGET);
    const long = buildVerificationLink({ host: HOST, documentId: 'RC-2026-000123', signature: 'a'.repeat(120) });
    expect(long.withinBudget).toBe(false);
    expect(long.length).toBeGreaterThan(VERIFICATION_PAYLOAD_BUDGET);
  });

  it('marks a document without a signature as a preview the verifier rejects', () => {
    const link = buildVerificationLink({ host: HOST, documentId: 'RC-2026-000123' });
    expect(link.preview).toBe(true);
    expect(link.url).toBe('https://verify.schoolpilot.app/v1/RC-2026-000123?preview=1');
  });

  it('keeps the preview flag on a signed document that is still a preview', () => {
    const link = buildVerificationLink({ host: HOST, documentId: 'RC-2026-000123', signature: '6Kq2x0Yb8m3TfWc', preview: true });
    expect(link.preview).toBe(true);
    expect(link.url).toContain('sig=6Kq2x0Yb8m3TfWc');
    expect(link.url).toContain('preview=1');
  });

  it('normalises a trailing slash and rejects a host that is not an absolute URL', () => {
    expect(normaliseVerificationHost('https://verify.schoolpilot.app/')).toBe(HOST);
    expect(() => normaliseVerificationHost('verify.schoolpilot.app')).toThrow(VerificationLinkError);
    expect(() => normaliseVerificationHost('https://verify.schoolpilot.app/?x=1')).toThrow(VerificationLinkError);
  });

  it('rejects a document id that could carry personal data', () => {
    expect(() => buildVerificationLink({ host: HOST, documentId: 'Amina Achieng' })).toThrow(VerificationLinkError);
    expect(() => buildVerificationLink({ host: HOST, documentId: 'ADM/2026/142' })).toThrow(VerificationLinkError);
    expect(() => buildVerificationLink({ host: HOST, documentId: 'RC-1', signature: 'not base64url!' })).toThrow(VerificationLinkError);
  });

  it('grows the QR from 16 mm to 18 mm once the symbol outgrows version 5', () => {
    expect(qrSizeMmFor(1)).toBe(16);
    expect(qrSizeMmFor(5)).toBe(16);
    expect(qrSizeMmFor(6)).toBe(18);
    expect(qrSizeMmFor(10)).toBe(18);
  });
});
