// ABOUTME: The refusal a pack operation raises: a typed code, the issues of an invalid pack and,
// ABOUTME: for an unsafe upgrade, the preview that says what would break.

import type { PackIssue, UpgradePreview } from './types';

export type PackRegistryCode =
  /** The candidate document failed the pack schema or a runtime rule. */
  | 'invalid_pack'
  | 'programme_not_found'
  /** The programme names a pack, but no `curriculum_pack` source row was ever recorded. */
  | 'nothing_installed'
  /** The source cannot produce the installed pack document. */
  | 'pack_source_missing'
  /** The document the source returned is not the one the install recorded. */
  | 'checksum_mismatch'
  /** The same code@version was recorded with different content; a version is immutable. */
  | 'checksum_conflict'
  /** A different pack (or version) is installed; it has to go through the upgrade path. */
  | 'upgrade_required'
  /** The preview found something the upgrade would break. */
  | 'upgrade_unsafe'
  /** The path is not inside the limits the installed pack declares (spec 03 §2.3). */
  | 'override_not_allowed'
  /** The path does not exist in the installed pack. */
  | 'override_unresolved'
  /** There is no override under this path to revert. */
  | 'override_not_found'
  /** The value is not JSON, so the programme row could not store it. */
  | 'override_invalid_value';

export interface PackRegistryErrorDetails {
  readonly issues?: readonly PackIssue[];
  readonly preview?: UpgradePreview;
  /** The pack reference the refused operation concerned, when it is known. */
  readonly pack?: string;
  /** The programme the refused operation concerned, when it is known. */
  readonly programmeId?: string;
}

/** Thrown by the registry for every refusal; `code` says which rule refused. */
export class PackRegistryError extends Error {
  readonly code: PackRegistryCode;
  readonly issues: readonly PackIssue[];
  readonly preview: UpgradePreview | null;
  readonly pack: string | null;
  readonly programmeId: string | null;

  constructor(code: PackRegistryCode, message: string, details: PackRegistryErrorDetails = {}) {
    super(message);
    this.name = 'PackRegistryError';
    this.code = code;
    this.issues = details.issues ?? [];
    this.preview = details.preview ?? null;
    this.pack = details.pack ?? null;
    this.programmeId = details.programmeId ?? null;
  }
}

export function isPackRegistryError(
  error: unknown,
  code?: PackRegistryCode
): error is PackRegistryError {
  return error instanceof PackRegistryError && (code === undefined || error.code === code);
}
