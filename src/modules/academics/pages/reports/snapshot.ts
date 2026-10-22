// ABOUTME: Freezing and rehydrating a report document, the canonical hash of a snapshot's content and
// ABOUTME: the keyed signature the publish service puts over document id + snapshot hash + issued-at.

import { canonicalJson } from '@/domain/curriculum/registry/json';
import { sha256Hex } from '@/domain/curriculum/registry';
import { resolveLabels } from '@/domain/reports';
import type { ReportDocumentModel } from '@/domain/reports/types';

import type { DocumentSnapshot, SnapshotContent } from './types';

/** The label source a frozen document carries, so `documentModel` rebuilds the identical lookup. */
export type FrozenLabelSource = DocumentSnapshot['labelSource'];

/**
 * Copies a resolved document into plain data.
 *
 * The document model is already plain except for `labels`, whose `get` is a function. The label
 * *source* is frozen in its place, so the lookup is rebuilt from the same bundles and chain rather
 * than stored as a partial map — the keys the surface asks for come from the data (`summary.total`,
 * `comment.class_teacher`), so a stored map could never be complete.
 *
 * The copy is deep, so nothing that later mutates the live model can reach a frozen snapshot.
 */
export function freezeDocument(
  model: ReportDocumentModel,
  labelSource: FrozenLabelSource
): DocumentSnapshot {
  return structuredClone({
    documentId: model.documentId,
    template: { code: model.template.code, name: model.template.name },
    locale: model.locale,
    dir: model.dir,
    labelSource,
    page: model.page,
    blocks: model.blocks,
    furniture: model.furniture,
    reduction: model.reduction,
    issues: model.issues,
    pagination: model.pagination,
    preview: model.preview,
    issuedAt: model.issuedAt,
    commentMaxLength: model.commentMaxLength,
    title: model.title,
  });
}

/** Rebuilds the renderable model from a frozen snapshot: no store, no clock, no live template. */
export function documentModel(snapshot: DocumentSnapshot): ReportDocumentModel {
  return {
    documentId: snapshot.documentId,
    template: snapshot.template,
    locale: snapshot.locale,
    dir: snapshot.dir,
    labels: resolveLabels({
      bundles: snapshot.labelSource.bundles,
      locale: snapshot.labelSource.locale,
      defaultLocale: snapshot.labelSource.defaultLocale,
    }),
    page: snapshot.page,
    blocks: snapshot.blocks,
    furniture: snapshot.furniture,
    reduction: snapshot.reduction,
    issues: snapshot.issues,
    pagination: snapshot.pagination,
    preview: snapshot.preview,
    issuedAt: snapshot.issuedAt,
    commentMaxLength: snapshot.commentMaxLength,
    title: snapshot.title,
  };
}

/** The canonical text of a snapshot's content: sorted keys, so two equal contents hash the same. */
export function snapshotContentJson(content: SnapshotContent): string {
  return canonicalJson(content);
}

/** The snapshot hash: SHA-256 over the canonical content. It covers no signature and no QR. */
export function hashSnapshotContent(content: SnapshotContent): string {
  return sha256Hex(snapshotContentJson(content));
}

const BASE64URL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

/** XOR of two equal-length lowercase hex strings, as hex. */
function xorHex(left: string, right: string): string {
  let out = '';
  for (let index = 0; index < left.length; index += 1) {
    const value = parseInt(left[index], 16) ^ parseInt(right[index], 16);
    out += value.toString(16);
  }
  return out;
}

/** base64url (no padding) of a lowercase hex digest. */
function base64urlFromHex(hex: string): string {
  const bytes: number[] = [];
  for (let index = 0; index < hex.length; index += 2) {
    bytes.push(parseInt(hex.slice(index, index + 2), 16));
  }
  let out = '';
  for (let index = 0; index < bytes.length; index += 3) {
    const a = bytes[index];
    const b = index + 1 < bytes.length ? bytes[index + 1] : 0;
    const c = index + 2 < bytes.length ? bytes[index + 2] : 0;
    out += BASE64URL[a >> 2];
    out += BASE64URL[((a & 0x03) << 4) | (b >> 4)];
    if (index + 1 < bytes.length) out += BASE64URL[((b & 0x0f) << 2) | (c >> 6)];
    if (index + 2 < bytes.length) out += BASE64URL[c & 0x3f];
  }
  return out;
}

/**
 * A keyed MAC over a message, built from the repository's own SHA-256: the key is derived, the two
 * pads are XORed on the hex form (so no byte-order ambiguity), and the inner digest is nested inside
 * the outer hash. It is deterministic and needs no dependency.
 *
 * This is the default signer. The verification host holds the same secret; a stronger scheme
 * (HMAC-SHA-256 through Web Crypto, or Ed25519) can replace it by injecting a different signer.
 */
export function keyedSignature(message: string, secret: string, bytes = 16): string {
  const key = sha256Hex(secret);
  const ipad = xorHex(key, '36'.repeat(32));
  const opad = xorHex(key, '5c'.repeat(32));
  const mac = sha256Hex(opad + sha256Hex(ipad + message));
  return base64urlFromHex(mac).slice(0, Math.ceil((bytes * 4) / 3));
}

/** The signature the QR's verification URL carries, over document id + snapshot hash + issued-at. */
export function signSnapshot(input: {
  readonly documentId: string;
  readonly snapshotHash: string;
  readonly issuedAt: string;
  readonly secret: string;
  readonly sign?: (message: string) => string;
}): string {
  const message = `${input.documentId}|${input.snapshotHash}|${input.issuedAt}`;
  return (input.sign ?? ((value: string) => keyedSignature(value, input.secret)))(message);
}

/** An opaque, personal-data-free document id, in the DR-05 `RC-2026-000123` shape. */
export function documentIdFor(sequence: number, year = new Date().getUTCFullYear()): string {
  return `RC-${year}-${String(sequence).padStart(6, '0')}`;
}
