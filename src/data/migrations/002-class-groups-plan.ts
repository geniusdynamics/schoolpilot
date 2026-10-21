// ABOUTME: The plan that turns the legacy classes and streams into canonical levels and
// ABOUTME: year-scoped class groups, using the mapping the operator confirmed.

import type { SqliteRow } from '@/data/adapters/sqlite';
import { generateUuidv7 } from '@/domain/ids';
import type { Campus, ClassGroup, Level, Programme, Stage } from '@/domain/schema';

import { legacyText, tableExists, type SqlReader } from './001-legacy-calendar';
import {
  levelMappingKey,
  readLevelMappingSource,
  type LevelDefinition,
  type LevelMappingEntry,
  type LevelMappingSource,
  type LegacyStream,
  type MappingYear,
} from './002-level-mapping';

/** The canonical entities migration M2 writes. */
export type ClassGroupEntity = 'level' | 'class_group';

/** A legacy row the plan could not map. */
export interface ClassGroupUnmappableRow {
  readonly legacyTable: string;
  readonly legacyId: string;
  readonly canonicalEntity: ClassGroupEntity;
  readonly reason: string;
  readonly detail?: string;
}

/** A problem the plan found. An error stops the migration; a warning is reported. */
export interface ClassGroupIssue {
  readonly code: string;
  readonly severity: 'warning' | 'error';
  readonly entity: ClassGroupEntity | 'learner';
  readonly legacyTable: string;
  readonly legacyId: string;
  readonly message: string;
}

/** The mapping between a legacy row and the canonical row it became. */
export interface ClassGroupMapEntry {
  readonly legacyTable: string;
  readonly legacyId: string;
  readonly canonicalEntity: ClassGroupEntity;
  readonly canonicalId: string;
}

/** A canonical row the migration wrote, so the rollback knows what to remove. */
export interface CreatedRow {
  readonly entity: 'campus' | 'programme' | 'stage' | 'level' | 'class_group';
  readonly id: string;
}

/** The rows one entity holds, counted before and after the migration. */
export interface ClassGroupCounts {
  readonly level: number;
  readonly class_group: number;
}

/** A learner whose stream resolves through the id map to a class group. */
export interface LearnerResolution {
  readonly learnerId: string;
  readonly legacyStreamId: string;
  readonly classGroupId: string;
  readonly levelId: string;
  readonly academicYearId: string;
}

/** An academic year, with the calendar it points at. */
export interface CandidateYear extends MappingYear {
  readonly calendarId: string;
}

/** A campus the legacy database already holds. */
export interface ExistingCampus {
  readonly id: string;
  readonly name: string;
  readonly isMain: boolean;
}

/** A programme the database already holds. */
export interface ExistingProgramme {
  readonly id: string;
  readonly name: string;
  readonly calendarId: string;
}

/** A stage the programme already holds. */
export interface ExistingStage {
  readonly id: string;
  readonly programmeId: string;
  readonly code: string;
}

/** A calendar migration M1 wrote. */
export interface ExistingCalendar {
  readonly id: string;
  readonly name: string;
}

/** Every row the plan reads. */
export interface ClassGroupPlanSource {
  readonly mapping: LevelMappingSource;
  /** The canonical institution; null when M1 has not run. */
  readonly institutionId: string | null;
  readonly campus: ExistingCampus | null;
  readonly programmes: readonly ExistingProgramme[];
  readonly stages: readonly ExistingStage[];
  readonly years: readonly CandidateYear[];
  readonly calendars: readonly ExistingCalendar[];
}

/** The options the plan needs. */
export interface ClassGroupPlanOptions {
  /** The timestamp the canonical audit columns carry. */
  readonly referenceTimestamp: string;
}

/** Everything the plan decided. */
export interface ClassGroupMigrationPlan {
  readonly referenceTimestamp: string;
  /** The campus the class groups belong to; null when nothing could be mapped. */
  readonly campusId: string | null;
  readonly campusCreated: Campus | null;
  readonly programmeId: string | null;
  readonly programmeCreated: Programme | null;
  readonly stagesCreated: readonly Stage[];
  readonly levels: readonly Level[];
  readonly classGroups: readonly ClassGroup[];
  readonly mapping: readonly ClassGroupMapEntry[];
  readonly unmappable: readonly ClassGroupUnmappableRow[];
  readonly issues: readonly ClassGroupIssue[];
  readonly assumptions: readonly string[];
  readonly created: readonly CreatedRow[];
  readonly learnerResolutions: readonly LearnerResolution[];
  readonly counts: {
    readonly before: ClassGroupCounts;
    readonly planned: ClassGroupCounts;
  };
}

/** What the plan collects while it walks the legacy rows. */
interface PlanContext {
  readonly options: ClassGroupPlanOptions;
  readonly unmappable: ClassGroupUnmappableRow[];
  readonly issues: ClassGroupIssue[];
  readonly assumptions: string[];
  readonly mapping: ClassGroupMapEntry[];
}

function createPlanContext(options: ClassGroupPlanOptions): PlanContext {
  return { options, unmappable: [], issues: [], assumptions: [], mapping: [] };
}

function addUnmappable(
  context: PlanContext,
  legacyTable: string,
  legacyIdValue: string,
  entity: ClassGroupEntity,
  reason: string,
  detail?: string
): void {
  context.unmappable.push({
    legacyTable,
    legacyId: legacyIdValue,
    canonicalEntity: entity,
    reason,
    ...(detail === undefined ? {} : { detail }),
  });
}

function addIssue(
  context: PlanContext,
  severity: 'warning' | 'error',
  code: string,
  entity: ClassGroupIssue['entity'],
  legacyTable: string,
  legacyIdValue: string,
  message: string
): void {
  context.issues.push({ code, severity, entity, legacyTable, legacyId: legacyIdValue, message });
}

/** Reads a canonical table, or nothing when the canonical schema has not been applied. */
async function readCanonicalTable(reader: SqlReader, table: string): Promise<SqliteRow[]> {
  if (!(await tableExists(reader, table))) return [];
  return reader.all<SqliteRow>(`SELECT * FROM "${table}"`);
}

/** Reads the academic years with the calendar each one points at. */
async function readYears(reader: SqlReader): Promise<CandidateYear[]> {
  const rows = await readCanonicalTable(reader, 'academic_year');
  return rows
    .map((row) => ({
      id: legacyText(row, 'id') ?? '',
      name: legacyText(row, 'name') ?? '',
      startDate: legacyText(row, 'start_date') ?? '',
      endDate: legacyText(row, 'end_date') ?? '',
      status: legacyText(row, 'status') ?? '',
      calendarId: legacyText(row, 'calendar_id') ?? '',
    }))
    .filter((entry) => entry.id !== '');
}

/** Reads every row migration M2 plans from. */
export async function readClassGroupPlanSource(reader: SqlReader): Promise<ClassGroupPlanSource> {
  const mapping = await readLevelMappingSource(reader);

  const institution = await reader.get<{ id: string }>(
    `SELECT id FROM "institution" ORDER BY rowid LIMIT 1`
  );

  const campuses: ExistingCampus[] = (await readCanonicalTable(reader, 'campus'))
    .map((row) => ({
      id: legacyText(row, 'id') ?? '',
      name: legacyText(row, 'name') ?? '',
      isMain: (legacyText(row, 'is_main') ?? '0') === '1',
    }))
    .filter((entry) => entry.id !== '');
  campuses.sort((left, right) =>
    left.isMain === right.isMain ? left.name.localeCompare(right.name) : left.isMain ? -1 : 1
  );

  const programmes: ExistingProgramme[] = (await readCanonicalTable(reader, 'programme'))
    .map((row) => ({
      id: legacyText(row, 'id') ?? '',
      name: legacyText(row, 'name') ?? '',
      calendarId: legacyText(row, 'calendar_id') ?? '',
    }))
    .filter((entry) => entry.id !== '')
    .sort((left, right) => left.name.localeCompare(right.name));

  const stages: ExistingStage[] = (await readCanonicalTable(reader, 'stage'))
    .map((row) => ({
      id: legacyText(row, 'id') ?? '',
      programmeId: legacyText(row, 'programme_id') ?? '',
      code: legacyText(row, 'code') ?? '',
    }))
    .filter((entry) => entry.id !== '');

  const calendars: ExistingCalendar[] = (await readCanonicalTable(reader, 'calendar'))
    .map((row) => ({
      id: legacyText(row, 'id') ?? '',
      name: legacyText(row, 'name') ?? '',
    }))
    .filter((entry) => entry.id !== '');

  return {
    mapping,
    institutionId: institution === null ? null : institution.id,
    campus: campuses[0] ?? null,
    programmes,
    stages,
    years: await readYears(reader),
    calendars,
  };
}

/** The calendar a new programme takes: the one of the first year a decision names. */
function calendarForYears(
  years: readonly CandidateYear[],
  calendars: readonly ExistingCalendar[]
): string | null {
  return years.find((entry) => entry.calendarId !== '')?.calendarId ?? calendars[0]?.id ?? null;
}

/** One legacy class and the streams it owns, or null when it has none. */
interface MappingUnit {
  readonly classId: string;
  readonly className: string;
  readonly stream: LegacyStream | null;
}

/** The units one legacy class produces: one per stream, or one default unit. */
function unitsForClass(
  className: string,
  classId: string,
  streams: readonly LegacyStream[]
): MappingUnit[] {
  if (streams.length === 0) return [{ classId, className, stream: null }];
  return streams.map((stream) => ({ classId, className, stream }));
}

/** True when a level definition is one the canonical model can store. */
function validLevel(level: LevelDefinition): string | null {
  if (level.code.trim() === '' || level.code.length > 50) {
    return 'the level code is empty or longer than 50 characters';
  }
  if (level.name.trim() === '' || level.name.length > 200) {
    return 'the level name is empty or longer than 200 characters';
  }
  if (!Number.isInteger(level.ordinal) || level.ordinal < 0) return 'the level order is not a whole number';
  if (level.stageCode.trim() === '' || level.stageCode.length > 50) {
    return 'the stage code is empty or longer than 50 characters';
  }
  if (level.stageName.trim() === '' || level.stageName.length > 200) {
    return 'the stage name is empty or longer than 200 characters';
  }
  if (!Number.isInteger(level.stageSequence) || level.stageSequence < 0) {
    return 'the stage order is not a whole number';
  }
  return null;
}

/** A class whose level the plan can create. */
interface MappedClass {
  readonly classId: string;
  readonly className: string;
  readonly level: LevelDefinition;
  readonly levelId: string;
  readonly units: readonly MappingUnit[];
  readonly decisions: ReadonlyMap<string, LevelMappingEntry>;
}

/** The decision a mapping unit is confirmed under. */
function decisionFor(
  decisionsByUnit: ReadonlyMap<string, LevelMappingEntry>,
  unit: MappingUnit
): LevelMappingEntry | undefined {
  return decisionsByUnit.get(levelMappingKey(unit.classId, unit.stream?.id ?? ''));
}

/**
 * Plans the levels and the class groups.
 *
 * The function is pure: it reads nothing and writes nothing, so the same legacy rows and the
 * same confirmed decisions always produce the same plan. Nothing is invented: a class the
 * operator did not confirm, a stream with no class and a year the database does not hold are
 * reported, and an incomplete confirmation stops the migration before it writes.
 */
export function planClassGroupMigration(
  source: ClassGroupPlanSource,
  decisions: readonly LevelMappingEntry[],
  options: ClassGroupPlanOptions
): ClassGroupMigrationPlan {
  const context = createPlanContext(options);
  const classes = source.mapping.classes;
  const classIds = new Set(classes.map((entry) => entry.id));

  if (source.institutionId === null) {
    addIssue(
      context,
      'error',
      'no_institution',
      'class_group',
      'institution',
      '',
      'the canonical institution table is empty, so no class group can be attached to a school; migration M1 has to run first'
    );
  }

  const decisionsByUnit = new Map<string, LevelMappingEntry>();
  const decisionByStream = new Map<string, LevelMappingEntry>();
  for (const decision of decisions) {
    decisionsByUnit.set(levelMappingKey(decision.legacyClassId, decision.legacyStreamId), decision);
    if (decision.legacyStreamId !== '') {
      decisionByStream.set(decision.legacyStreamId, decision);
    }
  }

  const streamsByClass = new Map<string, LegacyStream[]>();
  for (const stream of source.mapping.streams) {
    if (stream.classId === null || !classIds.has(stream.classId)) continue;
    const list = streamsByClass.get(stream.classId) ?? [];
    list.push(stream);
    streamsByClass.set(stream.classId, list);
  }

  // A stream whose class the legacy database does not hold cannot become a class group. It is
  // counted and reported, never dropped silently.
  for (const stream of source.mapping.streams) {
    if (stream.classId !== null && classIds.has(stream.classId)) continue;
    addUnmappable(
      context,
      'class_streams',
      stream.id,
      'class_group',
      stream.classId === null
        ? 'the class stream names no class'
        : `the legacy database holds no class "${stream.classId}" for the stream`,
      stream.className === null ? undefined : `the stream calls its class "${stream.className}"`
    );
  }

  const mappedClasses: MappedClass[] = [];
  const levelCodeOwner = new Map<string, string>();
  for (const legacyClass of classes) {
    const streams = (streamsByClass.get(legacyClass.id) ?? []).sort((left, right) =>
      left.name.localeCompare(right.name)
    );
    const units = unitsForClass(legacyClass.name, legacyClass.id, streams);
    const classDecisions = units
      .map((unit) => decisionFor(decisionsByUnit, unit))
      .filter((decision): decision is LevelMappingEntry => decision !== undefined);

    if (classDecisions.length !== units.length) {
      addIssue(
        context,
        'error',
        'mapping_incomplete',
        'level',
        'classes',
        legacyClass.id,
        `the level mapping does not cover the class "${legacyClass.name}"; confirm the mapping again`
      );
      continue;
    }

    const first = classDecisions[0];
    const disagreement = classDecisions.find(
      (decision) =>
        decision.level.code !== first.level.code ||
        decision.level.name !== first.level.name ||
        decision.level.ordinal !== first.level.ordinal ||
        decision.level.isTerminal !== first.level.isTerminal ||
        decision.level.stageCode !== first.level.stageCode ||
        decision.level.stageName !== first.level.stageName ||
        decision.level.stageSequence !== first.level.stageSequence
    );
    if (disagreement !== undefined) {
      addIssue(
        context,
        'error',
        'level_decision_disagrees',
        'level',
        'classes',
        legacyClass.id,
        `the decisions for the class "${legacyClass.name}" name two different levels; one class becomes one level`
      );
      continue;
    }

    const invalid = validLevel(first.level);
    if (invalid !== null) {
      addUnmappable(context, 'classes', legacyClass.id, 'level', invalid);
      for (const unit of units) {
        addUnmappable(
          context,
          unit.stream === null ? 'classes' : 'class_streams',
          unit.stream?.id ?? legacyClass.id,
          'class_group',
          `the level of the class "${legacyClass.name}" is not valid: ${invalid}`
        );
      }
      continue;
    }

    const codeKey = `${first.level.stageCode.toLowerCase()}::${first.level.code.toLowerCase()}`;
    const owner = levelCodeOwner.get(codeKey);
    if (owner !== undefined) {
      addUnmappable(
        context,
        'classes',
        legacyClass.id,
        'level',
        `another class is already mapped to the level code "${first.level.code}"`
      );
      for (const unit of units) {
        addUnmappable(
          context,
          unit.stream === null ? 'classes' : 'class_streams',
          unit.stream?.id ?? legacyClass.id,
          'class_group',
          `the level of the class "${legacyClass.name}" is already taken by the class "${owner}"`
        );
      }
      continue;
    }
    levelCodeOwner.set(codeKey, legacyClass.name);

    mappedClasses.push({
      classId: legacyClass.id,
      className: legacyClass.name,
      level: first.level,
      levelId: generateUuidv7(),
      units,
      decisions: new Map(
        units.map((unit, index) => [
          levelMappingKey(unit.classId, unit.stream?.id ?? ''),
          classDecisions[index],
        ])
      ),
    });
  }

  let campusId: string | null = null;
  let campusCreated: Campus | null = null;
  let programmeId: string | null = null;
  let programmeCreated: Programme | null = null;
  let stagesCreated: Stage[] = [];
  const levels: Level[] = [];
  const classGroups: ClassGroup[] = [];
  const levelByClass = new Map<string, Level>();
  const resolutions: LearnerResolution[] = [];

  if (mappedClasses.length > 0 && source.institutionId !== null) {
    const institutionId = source.institutionId;

    // The campus: the main one the database holds, or one the migration creates.
    let resolvedCampusId = source.campus?.id ?? null;
    if (resolvedCampusId === null) {
      const campus: Campus = {
        id: generateUuidv7(),
        institution_id: institutionId,
        name: 'Main Campus',
        is_main: true,
        created_at: options.referenceTimestamp,
        updated_at: options.referenceTimestamp,
      };
      resolvedCampusId = campus.id;
      campusCreated = campus;
      context.assumptions.push(
        'campus "Main Campus" was created: the legacy database carries no campus, and a class group belongs to one'
      );
    }
    campusId = resolvedCampusId;

    // The programme: one for the calendar of the first confirmed year, or one the migration
    // creates from that calendar.
    const candidateYears = mappedClasses.flatMap((entry) =>
      [...entry.decisions.values()]
        .map((decision) => source.years.find((year) => year.id === decision.academicYearId))
        .filter((year): year is CandidateYear => year !== undefined)
    );
    const calendarId = calendarForYears(candidateYears, source.calendars);
    let resolvedProgrammeId =
      source.programmes.find((entry) => entry.calendarId === calendarId)?.id ??
      source.programmes[0]?.id ??
      null;
    if (resolvedProgrammeId === null) {
      if (calendarId === null) {
        addIssue(
          context,
          'error',
          'no_calendar',
          'class_group',
          'calendar',
          '',
          'the database holds no calendar, so no programme can be created; migration M1 has to run first'
        );
      } else {
        const programme: Programme = {
          id: generateUuidv7(),
          institution_id: institutionId,
          curriculum_pack_code: 'legacy',
          pack_version: '1',
          name: 'Migrated programme',
          calendar_id: calendarId,
          status: 'active',
          created_at: options.referenceTimestamp,
          updated_at: options.referenceTimestamp,
        };
        resolvedProgrammeId = programme.id;
        programmeCreated = programme;
        context.assumptions.push(
          'programme "Migrated programme" was created: the legacy database carries no programme, and a class group belongs to one'
        );
      }
    }
    programmeId = resolvedProgrammeId;

    if (resolvedProgrammeId !== null) {
      const stageByCode = new Map(
        source.stages
          .filter((stage) => stage.programmeId === resolvedProgrammeId)
          .map((stage) => [stage.code.toLowerCase(), stage] as const)
      );
      const createdByCode = new Map<string, Stage>();
      for (const mapped of mappedClasses) {
        const level = mapped.level;
        const stageKey = level.stageCode.toLowerCase();
        let stageId = stageByCode.get(stageKey)?.id ?? createdByCode.get(stageKey)?.id;
        if (stageId === undefined) {
          const stage: Stage = {
            id: generateUuidv7(),
            institution_id: institutionId,
            programme_id: resolvedProgrammeId,
            code: level.stageCode,
            name: level.stageName,
            sequence: level.stageSequence,
            created_at: options.referenceTimestamp,
            updated_at: options.referenceTimestamp,
          };
          createdByCode.set(stageKey, stage);
          stageId = stage.id;
        }

        const row: Level = {
          id: mapped.levelId,
          institution_id: institutionId,
          stage_id: stageId,
          code: level.code,
          name: level.name,
          ordinal: level.ordinal,
          is_terminal: level.isTerminal,
          created_at: options.referenceTimestamp,
          updated_at: options.referenceTimestamp,
        };
        levels.push(row);
        levelByClass.set(mapped.classId, row);
        context.mapping.push({
          legacyTable: 'classes',
          legacyId: mapped.classId,
          canonicalEntity: 'level',
          canonicalId: row.id,
        });
      }
      stagesCreated = [...createdByCode.values()];
      if (stagesCreated.length > 0) {
        context.assumptions.push(
          `stage "${stagesCreated[0].name}" groups the migrated levels: the operator's mapping names the stage`
        );
      }

      // The class groups: one per stream, or one for a class with no streams.
      const groupNames = new Set<string>();
      const classGroupByStream = new Map<string, ClassGroup>();
      for (const mapped of mappedClasses) {
        const level = levelByClass.get(mapped.classId);
        if (level === undefined) continue;
        for (const unit of mapped.units) {
          const decision = mapped.decisions.get(levelMappingKey(unit.classId, unit.stream?.id ?? ''));
          if (decision === undefined) continue;
          const year = source.years.find((entry) => entry.id === decision.academicYearId);
          const unitTable = unit.stream === null ? 'classes' : 'class_streams';
          const unitId = unit.stream?.id ?? mapped.classId;
          if (year === undefined) {
            addUnmappable(
              context,
              unitTable,
              unitId,
              'class_group',
              decision.academicYearId === ''
                ? `the mapping names no academic year for the class "${mapped.className}"`
                : `the academic year "${decision.academicYearId}" is not one the canonical database holds`
            );
            continue;
          }

          const rawName = unit.stream?.name ?? mapped.className;
          let name = rawName;
          if (name.length > 100) {
            name = name.slice(0, 100).trim();
            addIssue(
              context,
              'warning',
              'class_group_name_truncated',
              'class_group',
              unitTable,
              unitId,
              `the class group name "${rawName}" is longer than 100 characters; it was cut to "${name}"`
            );
          }
          const nameKey = `${mapped.levelId}::${year.id}::${name.toLowerCase()}`;
          if (groupNames.has(nameKey)) {
            const suffix = ` (${unitId})`;
            name = `${name.slice(0, 100 - suffix.length)}${suffix}`;
            addIssue(
              context,
              'warning',
              'duplicate_class_group_name',
              'class_group',
              unitTable,
              unitId,
              `another class group of "${mapped.className}" in "${year.name}" is already named "${rawName}"; this one is named "${name}"`
            );
          }
          groupNames.add(`${mapped.levelId}::${year.id}::${name.toLowerCase()}`);

          const classGroup: ClassGroup = {
            id: generateUuidv7(),
            institution_id: institutionId,
            campus_id: resolvedCampusId,
            academic_year_id: year.id,
            programme_id: resolvedProgrammeId,
            level_id: mapped.levelId,
            name,
            homeroom_teacher_ids: [],
            created_at: options.referenceTimestamp,
            updated_at: options.referenceTimestamp,
          };
          classGroups.push(classGroup);
          context.mapping.push({
            legacyTable: unitTable,
            legacyId: unitId,
            canonicalEntity: 'class_group',
            canonicalId: classGroup.id,
          });
          if (unit.stream !== null) classGroupByStream.set(unit.stream.id, classGroup);
        }
      }

      context.assumptions.push(
        'class_group.homeroom_teacher_ids is empty: the legacy class teacher is a legacy staff id that migration C04 carries'
      );
      context.assumptions.push(
        'every class group is scoped to the academic year the operator confirmed; the legacy class streams carry no year'
      );

      // The learner check is the acceptance in miniature: every learner whose stream the
      // legacy database holds must resolve to a class group, and the class group must sit in
      // the level and the year the operator confirmed.
      for (const learner of source.mapping.learners) {
        if (learner.streamId === null) {
          addIssue(
            context,
            'warning',
            'learner_without_class',
            'learner',
            'students',
            learner.id,
            `the learner "${learner.admissionNumber ?? learner.id}" does not point at a class stream`
          );
          continue;
        }
        const classGroup = classGroupByStream.get(learner.streamId);
        if (classGroup === undefined) {
          addIssue(
            context,
            'warning',
            'learner_without_class',
            'learner',
            'students',
            learner.id,
            `the learner "${learner.admissionNumber ?? learner.id}" points at the class stream "${learner.streamId}", which has no class group`
          );
          continue;
        }
        const decision = decisionByStream.get(learner.streamId);
        const expectedLevel = decision === undefined ? undefined : levelByClass.get(decision.legacyClassId);
        if (decision === undefined || expectedLevel === undefined) {
          addIssue(
            context,
            'warning',
            'learner_without_class',
            'learner',
            'students',
            learner.id,
            `the learner "${learner.admissionNumber ?? learner.id}" points at a class stream the mapping does not cover`
          );
          continue;
        }
        if (
          classGroup.level_id !== expectedLevel.id ||
          classGroup.academic_year_id !== decision.academicYearId
        ) {
          addIssue(
            context,
            'error',
            'learner_class_changed',
            'learner',
            'students',
            learner.id,
            `the learner "${learner.admissionNumber ?? learner.id}" would change class: the stream became a class group in another level or year`
          );
          continue;
        }
        resolutions.push({
          learnerId: learner.id,
          legacyStreamId: learner.streamId,
          classGroupId: classGroup.id,
          levelId: classGroup.level_id,
          academicYearId: classGroup.academic_year_id,
        });
      }
    }
  }

  const before: ClassGroupCounts = {
    level: classes.length,
    class_group:
      source.mapping.streams.length +
      classes.filter(
        (entry) => !source.mapping.streams.some((stream) => stream.classId === entry.id)
      ).length,
  };
  const planned: ClassGroupCounts = {
    level: levels.length,
    class_group: classGroups.length,
  };

  const created: CreatedRow[] = [];
  if (campusCreated !== null) created.push({ entity: 'campus', id: campusCreated.id });
  if (programmeCreated !== null) created.push({ entity: 'programme', id: programmeCreated.id });
  for (const stage of stagesCreated) created.push({ entity: 'stage', id: stage.id });
  for (const level of levels) created.push({ entity: 'level', id: level.id });
  for (const classGroup of classGroups) created.push({ entity: 'class_group', id: classGroup.id });

  return {
    referenceTimestamp: options.referenceTimestamp,
    campusId,
    campusCreated,
    programmeId,
    programmeCreated,
    stagesCreated,
    levels,
    classGroups,
    mapping: context.mapping,
    unmappable: context.unmappable,
    issues: context.issues,
    assumptions: context.assumptions,
    created,
    learnerResolutions: resolutions,
    counts: { before, planned },
  };
}
