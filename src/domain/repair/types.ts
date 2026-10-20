// ABOUTME: The types of the integrity report: what a finding is, what a fix would do, and the
// ABOUTME: decision the tool refuses to make on its own, so every repair is an explicit consent.

import type { EntityName } from '@/domain/schema';

/** The kinds of defect the integrity report knows. */
export type IntegrityFindingKind =
  | 'orphan_reference'
  | 'malformed_reference'
  | 'null_stream'
  | 'duplicate_id';

/** The kinds of repair the tool can apply. */
export type IntegrityFixKind =
  | 'set_reference'
  | 'replace_reference'
  | 'create_enrolment'
  | 'rekey_duplicate';

/**
 * The choice that drops a reference instead of pointing it at a row.
 *
 * It is one of the options of a {@link IntegrityFix}, not a fix of its own: the user says
 * "clear it" the same way they say "point it at that row".
 */
export const CLEAR_REFERENCE = '__clear__';

/** One choice a human can make for a fix. */
export interface IntegrityOption {
  readonly id: string;
  readonly label: string;
  /** False when the choice would break the model; the reason says why. */
  readonly selectable: boolean;
  /** Why the choice cannot be made; null when it can. */
  readonly reason: string | null;
}

/**
 * The fix the tool would apply to one finding.
 *
 * A fix is a proposal, never an action: it is applied only when the user consents to the
 * finding it belongs to. `needs` names the decision the tool will not take on its own.
 */
export interface IntegrityFix {
  readonly kind: IntegrityFixKind;
  /** The finding this fix repairs. */
  readonly findingId: string;
  readonly entity: EntityName;
  readonly table: string;
  readonly column: string;
  /** The row the fix touches, as it is stored. */
  readonly rowId: string | null;
  /** The value the column holds now. */
  readonly before: string | null;
  /** The value the column will hold afterwards; null when the fix writes a new row. */
  readonly after: string | null;
  /** True when the fix rewrites a row that already exists. */
  readonly rewritesRow: boolean;
  /** What the fix does, in plain words. */
  readonly description: string;
  /** The decision the tool will not make; null when the fix stands on its own. */
  readonly needs: string | null;
  /** The choices the user may pick from. */
  readonly options: readonly IntegrityOption[];
}

/** One defect, with everything a human needs to judge it. */
export interface IntegrityFinding {
  /** Stable identity of the finding: the same defect always gets the same id. */
  readonly id: string;
  readonly kind: IntegrityFindingKind;
  /** The entity whose row carries the defect. */
  readonly entity: EntityName;
  /** The physical table the row lives in. */
  readonly table: string;
  /** The column the defect sits in. */
  readonly column: string;
  /** The offending value, exactly as it is stored; null when the value is missing. */
  readonly value: string | null;
  /** The primary key of the offending row, as it is stored. */
  readonly rowId: string | null;
  /**
   * The handle the tool addresses the row by: the rowid of the table when it has one.
   *
   * A rowid names one row on its own, which a primary key does not when the table holds
   * the same id twice.
   */
  readonly rowHandle: string | null;
  /** The entity the reference points at, when the defect is a reference. */
  readonly relatedEntity: EntityName | null;
  /** What the defect is, in plain words. */
  readonly message: string;
  /** What the tool needs from a human to repair it; null when the tool can do it alone. */
  readonly needs: string | null;
  /** The fix the tool would apply, when it has one. */
  readonly fix: IntegrityFix | null;
}

/** The report of one run of the checks. */
export interface IntegrityReport {
  readonly findings: readonly IntegrityFinding[];
  /** The entities the report looked at. */
  readonly checked: readonly EntityName[];
  /** The entities whose table this database does not hold. */
  readonly missingTables: readonly EntityName[];
  readonly generatedAt: string;
}

/**
 * What the user agreed to.
 *
 * A finding that is not named here is never touched, however good its fix looks. The
 * decisions are the answers the tool refused to give: the id of the row a reference should
 * point at, for instance.
 */
export interface RepairConsent {
  /** The findings the user consented to fix. */
  readonly findingIds: readonly string[];
  /** The decisions the user made, keyed by finding id. */
  readonly decisions?: Readonly<Record<string, string>>;
}

/** One change the tool made, or would make in a dry run. */
export interface AppliedRepair {
  readonly findingId: string;
  readonly kind: IntegrityFixKind;
  readonly entity: EntityName;
  readonly table: string;
  readonly column: string;
  readonly rowId: string | null;
  /** The value before the change. */
  readonly before: string | null;
  /** The value after the change; null when the change added a row. */
  readonly after: string | null;
  /** What the change did, in plain words. */
  readonly description: string;
}

/** One finding the tool did not repair, and why. */
export interface SkippedRepair {
  readonly findingId: string;
  readonly reason: string;
}

/** The outcome of a repair run. */
export interface RepairResult {
  /** True when nothing was written: the run only said what would change. */
  readonly dryRun: boolean;
  /** The changes that were made, or that a dry run would have made. */
  readonly changes: readonly AppliedRepair[];
  /** The findings that were left alone, and why. */
  readonly skipped: readonly SkippedRepair[];
}

/** The findings of a report, grouped by kind. */
export type IntegrityFindingsByKind = Record<IntegrityFindingKind, readonly IntegrityFinding[]>;

/** Groups the findings of a report by their kind, in the order the kinds are declared. */
export function findingsByKind(report: IntegrityReport): IntegrityFindingsByKind {
  const grouped: Record<IntegrityFindingKind, IntegrityFinding[]> = {
    orphan_reference: [],
    malformed_reference: [],
    null_stream: [],
    duplicate_id: [],
  };
  for (const finding of report.findings) grouped[finding.kind].push(finding);
  return grouped;
}
