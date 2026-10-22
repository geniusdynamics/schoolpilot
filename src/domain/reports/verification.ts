// ABOUTME: Builds the signed verification URL a report's QR carries and keeps the payload free of
// ABOUTME: anything personal: host, document id and signature only, with a 90-character budget.

/** The QR payload budget from DR-05: a 90-character URL stays at version 6, printable at 16–18 mm. */
export const VERIFICATION_PAYLOAD_BUDGET = 90;

/** A document id is an opaque reference, never a name or an admission number. */
const DOCUMENT_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,63}$/;

/** base64url, as the publish service (P2-D03) produces it. */
const SIGNATURE_PATTERN = /^[A-Za-z0-9_-]{8,120}$/;

export type VerificationLinkErrorReason = 'invalid_host' | 'invalid_document_id' | 'invalid_signature';

export class VerificationLinkError extends Error {
  readonly reason: VerificationLinkErrorReason;

  constructor(reason: VerificationLinkErrorReason, detail: string) {
    super(detail);
    this.name = 'VerificationLinkError';
    this.reason = reason;
  }
}

export interface VerificationTarget {
  /** Verification host, for example `https://verify.schoolpilot.app`. */
  readonly host: string;
  readonly documentId: string;
  /** base64url signature over document id + snapshot hash + issued-at. Absent means unpublished. */
  readonly signature?: string | null;
  /** Force the preview form even when a signature is present. */
  readonly preview?: boolean;
}

export interface VerificationLink {
  readonly url: string;
  /** True when the verifier will reject the link: no signature, or an explicit preview. */
  readonly preview: boolean;
  readonly length: number;
  readonly withinBudget: boolean;
}

/**
 * Normalises the verification host: no trailing slash, no query, an absolute http(s) origin.
 * A host with a path is rejected rather than silently producing a broken `/v1` route.
 */
export function normaliseVerificationHost(host: string): string {
  const trimmed = host.trim().replace(/\/+$/, '');
  if (!/^https?:\/\/[^\s/?#]+(\/[^\s?#]*)?$/.test(trimmed)) {
    throw new VerificationLinkError('invalid_host', `verification host is not an absolute http(s) URL: ${host}`);
  }
  return trimmed;
}

/**
 * `<host>/v1/<document-id>?sig=<base64url>` — or, for an unpublished document,
 * `<host>/v1/<document-id>?preview=1`, which the verifier always rejects (DR-05 §QR verification).
 *
 * The signature is the only personal-data-free guarantee the builder can make structurally: the
 * function accepts no name, admission number, mark or fee, so none can reach the payload.
 */
export function buildVerificationLink(target: VerificationTarget): VerificationLink {
  const host = normaliseVerificationHost(target.host);
  const documentId = target.documentId.trim();
  if (!DOCUMENT_ID_PATTERN.test(documentId)) {
    throw new VerificationLinkError('invalid_document_id', `document id is not an opaque reference: ${target.documentId}`);
  }
  const signature = target.signature?.trim() ?? '';
  if (signature !== '' && !SIGNATURE_PATTERN.test(signature)) {
    throw new VerificationLinkError('invalid_signature', 'signature is not base64url');
  }
  const preview = target.preview === true || signature === '';
  const query = signature !== '' ? `?sig=${signature}${preview ? '&preview=1' : ''}` : '?preview=1';
  const url = `${host}/v1/${documentId}${query}`;
  return { url, preview, length: url.length, withinBudget: url.length <= VERIFICATION_PAYLOAD_BUDGET };
}

/**
 * QR edge length: 16 mm at version 5 or below, 18 mm once the payload pushes the symbol larger so
 * the module pitch stays above ~0.36 mm (DR-05: decodes from a 150 DPI raster at 16 mm/version 5).
 */
export function qrSizeMmFor(version: number): number {
  return version <= 5 ? 16 : 18;
}
