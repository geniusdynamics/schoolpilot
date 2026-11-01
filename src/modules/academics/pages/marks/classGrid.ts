// ABOUTME: The whole-class marks grid: every learner of a class (or level) against every subject's
// ABOUTME: assessment in one exam slot, narrowed to the subjects and learners a teacher may reach.

import type { TeachingScope } from './types';

export interface GridAssessment {
  readonly id: string;
  readonly name: string;
  readonly kind: string;
  readonly slot: string | null;
  readonly learningAreaIds: readonly string[];
  readonly classGroupIds: readonly string[];
  readonly levelIds: readonly string[];
  readonly maxScore: number | null;
  readonly status: string;
}

export interface GridTeachingGroup {
  readonly id: string;
  readonly learningAreaId: string;
  readonly classGroupIds: readonly string[];
}

export interface GridEnrolment {
  readonly id: string;
  readonly learnerId: string;
  readonly classGroupId: string;
  readonly status: string;
}

export interface GridLearner {
  readonly id: string;
  readonly name: string;
  readonly admissionNumber: string;
}

export interface GridMembership {
  readonly teachingGroupId: string;
  readonly enrolmentId: string;
  readonly validFrom: string;
  readonly validTo: string | null;
}

export interface GridClassGroup {
  readonly id: string;
  readonly name: string;
  readonly levelId: string;
}

export interface GridColumn {
  readonly key: string;
  readonly learningAreaId: string;
  readonly learningAreaName: string;
  readonly assessmentId: string | null;
  readonly assessmentName: string | null;
  readonly assessmentStatus: string;
  readonly max: number | null;
  readonly label: string;
  /** The teaching group this subject belongs to in the learner's class, per class group. */
  readonly groupsByClassGroup: Readonly<Record<string, string>>;
}

export interface GridRow {
  readonly id: string;
  readonly enrolmentId: string;
  readonly learnerName: string;
  readonly admissionNumber: string | null;
  readonly classGroupId: string;
  readonly classGroupName: string;
}

export interface ClassGridInput {
  readonly assessments: readonly GridAssessment[];
  readonly groups: readonly GridTeachingGroup[];
  readonly enrolments: readonly GridEnrolment[];
  readonly learners: readonly GridLearner[];
  readonly memberships: readonly GridMembership[];
  readonly classGroups: readonly GridClassGroup[];
  readonly learningAreaNames: ReadonlyMap<string, string>;
  readonly scope: TeachingScope;
  readonly periodId: string | null;
  readonly levelId: string | null;
  readonly classGroupId: string | null;
  readonly examKey: string | null;
  readonly learningAreaId: string | null;
  readonly search: string;
  readonly at: string;
}

export interface ClassGrid {
  readonly columns: readonly GridColumn[];
  readonly rows: readonly GridRow[];
  readonly classGroups: readonly GridClassGroup[];
  /** The exam slots the period offers, in a stable order. */
  readonly examKeys: readonly { readonly key: string; readonly label: string }[];
  /** Cells the learner is not registered for, keyed `rowId|columnKey`. */
  readonly nonMembership: ReadonlySet<string>;
}

/** The exam a set of assessments belongs to: its explicit slot, else its kind. */
export function examKeyOf(assessment: Pick<GridAssessment, 'slot' | 'kind'>): string {
  return assessment.slot?.trim() || assessment.kind;
}

/** A readable label for an exam key. */
export function examKeyLabel(key: string): string {
  return key.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

/** The cells a learner is not registered for. */
export function cellKey(rowId: string, columnKey: string): string {
  return `${rowId}|${columnKey}`;
}

function inDateWindow(membership: GridMembership, at: string): boolean {
  return (
    membership.validFrom <= at && (membership.validTo === null || membership.validTo >= at)
  );
}

/**
 * Builds the grid.
 *
 * The class groups are the streams; a level alone reaches every stream of that level. An
 * administrator reaches every group, a class teacher reaches every subject of their homeroom class,
 * and a subject teacher reaches only the learning areas they are assigned. The latter two are
 * expressed by the scope the caller passes: the columns are widened for a class teacher and
 * narrowed for a subject teacher, and membership decides every cell.
 */
export function buildClassGrid(input: ClassGridInput): ClassGrid {
  const classGroupById = new Map(input.classGroups.map((group) => [group.id, group]));
  const visibleClassGroups = input.classGroups.filter((group) => {
    if (input.classGroupId) return group.id === input.classGroupId;
    if (input.levelId) return group.levelId === input.levelId;
    return true;
  });
  const visibleIds = new Set(visibleClassGroups.map((group) => group.id));

  let groups = input.groups.filter((group) => group.classGroupIds.some((id) => visibleIds.has(id)));
  if (input.scope.mode === 'teaching') {
    groups = groups.filter((group) => input.scope.groupIds.has(group.id));
  }
  if (input.scope.mode === 'class') {
    // A class teacher sees every subject in the class, but the scope already names the class groups.
    const classIds = new Set(
      input.groups
        .filter((group) => input.scope.groupIds.has(group.id))
        .flatMap((group) => group.classGroupIds)
    );
    groups = groups.filter((group) => group.classGroupIds.some((id) => classIds.has(id)));
  }

  const examKeys = [...new Set(input.assessments.map(examKeyOf))].sort();
  const selectedExam = input.examKey ?? examKeys[0] ?? null;

  const assessmentsInExam = input.assessments.filter(
    (assessment) =>
      (selectedExam === null || examKeyOf(assessment) === selectedExam) &&
      (assessment.classGroupIds.length === 0 ||
        assessment.classGroupIds.some((id) => visibleIds.has(id))) &&
      (assessment.levelIds.length === 0 ||
        visibleClassGroups.some((group) => assessment.levelIds.includes(group.levelId)))
  );

  const columns: GridColumn[] = [];
  const areas = new Map<string, GridTeachingGroup[]>();
  for (const group of groups) {
    const list = areas.get(group.learningAreaId) ?? [];
    list.push(group);
    areas.set(group.learningAreaId, list);
  }
  for (const [learningAreaId, areaGroups] of [...areas.entries()].sort(([left], [right]) =>
    (input.learningAreaNames.get(left) ?? left).localeCompare(
      input.learningAreaNames.get(right) ?? right
    )
  )) {
    if (input.learningAreaId && learningAreaId !== input.learningAreaId) continue;
    const candidates = assessmentsInExam
      .filter((assessment) => assessment.learningAreaIds.includes(learningAreaId))
      .sort((left, right) => right.name.localeCompare(left.name));
    const assessment = candidates[0] ?? null;
    const groupsByClassGroup: Record<string, string> = {};
    for (const group of areaGroups) {
      for (const classGroupId of group.classGroupIds) {
        if (visibleIds.has(classGroupId)) groupsByClassGroup[classGroupId] = group.id;
      }
    }
    if (Object.keys(groupsByClassGroup).length === 0) continue;
    columns.push({
      key: `area:${learningAreaId}`,
      learningAreaId,
      learningAreaName: input.learningAreaNames.get(learningAreaId) ?? learningAreaId,
      assessmentId: assessment?.id ?? null,
      assessmentName: assessment?.name ?? null,
      assessmentStatus: assessment?.status ?? 'missing',
      max: assessment?.maxScore ?? null,
      label: input.learningAreaNames.get(learningAreaId) ?? learningAreaId,
      groupsByClassGroup,
    });
  }

  const memberEnrolments = new Set(
    input.memberships
      .filter((membership) => inDateWindow(membership, input.at))
      .map((membership) => membership.enrolmentId)
  );
  const learnerById = new Map(input.learners.map((learner) => [learner.id, learner]));
  const term = input.search.trim().toLowerCase();
  const rows: GridRow[] = input.enrolments
    .filter((enrolment) => visibleIds.has(enrolment.classGroupId))
    .filter((enrolment) => enrolment.status === 'active' || enrolment.status === 'repeating')
    .filter(
      (enrolment) =>
        input.scope.mode !== 'teaching' || memberEnrolments.has(enrolment.id)
    )
    .map((enrolment) => {
      const learner = learnerById.get(enrolment.learnerId);
      return {
        id: enrolment.id,
        enrolmentId: enrolment.id,
        learnerName: learner?.name ?? enrolment.learnerId,
        admissionNumber: learner?.admissionNumber ?? null,
        classGroupId: enrolment.classGroupId,
        classGroupName: classGroupById.get(enrolment.classGroupId)?.name ?? '',
      };
    })
    .filter(
      (row) =>
        !term ||
        row.learnerName.toLowerCase().includes(term) ||
        (row.admissionNumber ?? '').toLowerCase().includes(term)
    )
    .sort(
      (left, right) =>
        left.classGroupName.localeCompare(right.classGroupName) ||
        left.learnerName.localeCompare(right.learnerName)
    );

  const nonMembership = new Set<string>();
  for (const row of rows) {
    for (const column of columns) {
      const groupId = column.groupsByClassGroup[row.classGroupId];
      if (!groupId) {
        nonMembership.add(cellKey(row.id, column.key));
        continue;
      }
      const member = input.memberships.some(
        (membership) =>
          membership.teachingGroupId === groupId &&
          membership.enrolmentId === row.enrolmentId &&
          inDateWindow(membership, input.at)
      );
      if (!member) nonMembership.add(cellKey(row.id, column.key));
    }
  }

  return {
    columns,
    rows,
    classGroups: visibleClassGroups,
    examKeys: examKeys.map((key) => ({ key, label: examKeyLabel(key) })),
    nonMembership,
  };
}
