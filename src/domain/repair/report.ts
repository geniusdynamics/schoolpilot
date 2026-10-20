// ABOUTME: Runs the integrity checks over the canonical tables and returns the report: every
// ABOUTME: defect with the row it sits in and the fix the tool would apply if it were allowed to.

import { ENTITY_NAMES, storageFor, type EntityName } from '@/domain/schema';
import type { SqliteAdapter } from '@/data/adapters/sqlite';

import {
  checkDuplicateIds,
  checkReferences,
  IntegrityContext,
  learnerWithoutClassGroup,
} from './checks';
import type { IntegrityFinding, IntegrityFindingKind, IntegrityReport } from './types';

/** The order the kinds of finding are reported in. */
const KIND_ORDER: readonly IntegrityFindingKind[] = [
  'orphan_reference',
  'malformed_reference',
  'null_stream',
  'duplicate_id',
];

/** How the report can be run. */
export interface IntegrityReportOptions {
  /** The entities to check. Defaults to every registered entity. */
  readonly entities?: readonly EntityName[];
  /** The clock, so a report can be pinned in a test. */
  readonly now?: () => Date;
}

/**
 * Checks the database and reports what it found.
 *
 * The report only reads: nothing is written, and no defect is repaired. A repair needs the
 * user's consent, which `applyIntegrityFixes` asks for.
 */
export async function runIntegrityReport(
  adapter: SqliteAdapter,
  options: IntegrityReportOptions = {}
): Promise<IntegrityReport> {
  const entities = options.entities ?? ENTITY_NAMES;
  const now = options.now ?? (() => new Date());
  const context = new IntegrityContext(adapter);

  const findings: IntegrityFinding[] = [];
  const checked: EntityName[] = [];
  const missingTables: EntityName[] = [];

  for (const entity of entities) {
    const live = await context.liveTable(storageFor(entity).table);
    if (!live) {
      missingTables.push(entity);
      continue;
    }
    checked.push(entity);
    findings.push(...(await checkReferences(context, entity, live)));
    findings.push(...(await checkDuplicateIds(context, entity, live)));
  }

  if (entities.includes('learner')) {
    const learnerTable = await context.liveTable(storageFor('learner').table);
    const enrolmentTable = await context.liveTable(storageFor('enrolment').table);
    if (learnerTable) {
      findings.push(
        ...(await learnerWithoutClassGroup(context, 'learner', learnerTable, enrolmentTable))
      );
    }
  }

  return {
    findings: sortFindings(findings),
    checked,
    missingTables,
    generatedAt: now().toISOString(),
  };
}

/** The findings in a stable order: by kind, then by the row they sit in. */
function sortFindings(findings: readonly IntegrityFinding[]): IntegrityFinding[] {
  return [...findings].sort((left, right) => {
    const byKind = KIND_ORDER.indexOf(left.kind) - KIND_ORDER.indexOf(right.kind);
    if (byKind !== 0) return byKind;
    if (left.table !== right.table) return left.table.localeCompare(right.table);
    if (left.column !== right.column) return left.column.localeCompare(right.column);
    return left.id.localeCompare(right.id);
  });
}
