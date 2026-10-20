// ABOUTME: The interactive level mapping migration M2 reads: the legacy classes and streams, the
// ABOUTME: proposal rule, and the table of decisions the operator confirms before M2 runs.

import type { SqliteBindValue, SqliteRow, SqliteTransaction } from '@/data/adapters/sqlite';

import {
  legacyDay,
  legacyId,
  legacyInteger,
  legacyKey,
  legacyRef,
  legacyText,
  tableExists,
  type SqlReader,
} from './001-legacy-calendar';

/** The table that holds the mapping the operator confirmed. */
export const LEVEL_MAPPING_TABLE = '_legacy_level_mapping';

/** How much the proposal is trusted. The operator confirms every value either way. */
export type MappingConfidence = 'high' | 'medium' | 'low';

/** The legacy tables the mapping reads. */
export const LEVEL_MAPPING_SOURCES = {
  classes: 'classes',
  classStreams: 'class_streams',
  students: 'students',
} as const;

/** A legacy class: an id and a name (`Form 1`). */
export interface LegacyClass {
  readonly id: string;
  readonly name: string;
}

/** A legacy stream: a row of `class_streams`, or one the class carries in its nested array. */
export interface LegacyStream {
  readonly id: string;
  /** The class the stream belongs to; null when the row names no class. */
  readonly classId: string | null;
  readonly name: string;
  /** The class name the legacy row carries, when it carries one. */
  readonly className: string | null;
  /** True when only the nested `classes.streams` array holds the stream. */
  readonly fromNested: boolean;
}

/** A legacy learner, read for the count and for the class it points at. */
export interface LegacyLearner {
  readonly id: string;
  readonly admissionNumber: string | null;
  readonly streamId: string | null;
  readonly className: string | null;
  readonly streamName: string | null;
  readonly status: string | null;
}

/** A canonical academic year, as the mapping proposes and the migration reads it. */
export interface MappingYear {
  readonly id: string;
  readonly name: string;
  readonly startDate: string;
  readonly endDate: string;
  readonly status: string;
}

/** The level a legacy class becomes. */
export interface LevelDefinition {
  readonly stageCode: string;
  readonly stageName: string;
  readonly stageSequence: number;
  readonly code: string;
  readonly name: string;
  readonly ordinal: number;
  readonly isTerminal: boolean;
}

/**
 * One confirmed decision: the level a class becomes and the academic year one of its streams
 * belongs to. A stream of `''` means the class has no streams and becomes one default class
 * group.
 */
export interface LevelMappingEntry {
  readonly legacyClassId: string;
  readonly legacyStreamId: string;
  readonly legacyClassName: string;
  readonly legacyStreamName: string;
  readonly level: LevelDefinition;
  readonly academicYearId: string;
  readonly levelConfidence: MappingConfidence;
  readonly levelRule: string;
  readonly yearConfidence: MappingConfidence;
  readonly yearRule: string;
  /** True when the operator changed at least one proposal for this row. */
  readonly operatorCorrected: boolean;
  /** When the operator confirmed the row; null for a proposal that is not confirmed yet. */
  readonly confirmedAt: string | null;
  readonly confirmedBy: string | null;
}

/** The legacy rows and the decisions the step and the migration share. */
export interface LevelMappingSource {
  readonly classes: readonly LegacyClass[];
  readonly streams: readonly LegacyStream[];
  readonly learners: readonly LegacyLearner[];
  readonly years: readonly MappingYear[];
  readonly confirmed: readonly LevelMappingEntry[];
}

/** What the step shows before the operator touches it. */
export interface LevelMappingProposal {
  readonly entries: readonly LevelMappingEntry[];
  /** Streams whose class the legacy database does not hold; they cannot become a class group. */
  readonly orphanStreams: readonly LegacyStream[];
  readonly classCount: number;
  readonly streamCount: number;
}

/** The shape of the nested `classes.streams` array. */
interface NestedStream {
  readonly id?: unknown;
  readonly class_id?: unknown;
  readonly name?: unknown;
}

/** The default stage every migrated class is grouped under. */
const DEFAULT_STAGE = {
  code: 'LEGACY',
  name: 'Legacy classes',
  sequence: 0,
} as const;

/** The system words a legacy class name can start with, and the canonical label each takes. */
const SYSTEMS: Record<string, { readonly label: string; readonly code: string }> = {
  form: { label: 'Form', code: 'FORM' },
  grade: { label: 'Grade', code: 'GRADE' },
  year: { label: 'Year', code: 'YEAR' },
  class: { label: 'Class', code: 'CLASS' },
  standard: { label: 'Standard', code: 'STANDARD' },
  std: { label: 'Standard', code: 'STANDARD' },
};

const LEVEL_NAME_PATTERN = /^(form|grade|year|class|standard|std)\s*[-:]?\s*(\d{1,2})$/i;
const ANY_NUMBER_PATTERN = /\b(\d{1,2})\b/;

const MAPPING_COLUMNS = [
  'legacy_class_id',
  'legacy_stream_id',
  'legacy_class_name',
  'legacy_stream_name',
  'stage_code',
  'stage_name',
  'stage_sequence',
  'level_code',
  'level_name',
  'level_ordinal',
  'level_is_terminal',
  'academic_year_id',
  'level_confidence',
  'level_rule',
  'year_confidence',
  'year_rule',
  'operator_corrected',
  'confirmed_at',
  'confirmed_by',
] as const;

const MAPPING_DDL = `CREATE TABLE IF NOT EXISTS "${LEVEL_MAPPING_TABLE}" (
   legacy_class_id TEXT NOT NULL,
   legacy_stream_id TEXT NOT NULL,
   legacy_class_name TEXT NOT NULL,
   legacy_stream_name TEXT NOT NULL,
   stage_code TEXT NOT NULL,
   stage_name TEXT NOT NULL,
   stage_sequence INTEGER NOT NULL,
   level_code TEXT NOT NULL,
   level_name TEXT NOT NULL,
   level_ordinal INTEGER NOT NULL,
   level_is_terminal INTEGER NOT NULL,
   academic_year_id TEXT NOT NULL,
   level_confidence TEXT NOT NULL,
   level_rule TEXT NOT NULL,
   year_confidence TEXT NOT NULL,
   year_rule TEXT NOT NULL,
   operator_corrected INTEGER NOT NULL,
   confirmed_at TEXT NOT NULL,
   confirmed_by TEXT,
   PRIMARY KEY (legacy_class_id, legacy_stream_id)
 )`;

/** The key a decision is identified by: the class and the stream, each normalised. */
export function levelMappingKey(legacyClassId: string, legacyStreamId: string): string {
  return `${legacyClassId}::${legacyStreamId}`;
}

/** Reads the rows of a table, or nothing when the legacy database does not hold it. */
async function readTable(reader: SqlReader, table: string): Promise<SqliteRow[]> {
  if (!(await tableExists(reader, table))) return [];
  return reader.all<SqliteRow>(`SELECT * FROM ${table}`);
}

/** Reads a JSON array of nested streams out of `classes.streams`. */
function readNestedStreams(row: SqliteRow): NestedStream[] {
  const raw = row['streams'];
  if (typeof raw !== 'string' || raw.trim() === '') return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is NestedStream => typeof item === 'object' && item !== null
    );
  } catch {
    return [];
  }
}

/** Orders legacy ids numerically when both are numbers, lexicographically otherwise. */
function compareLegacyIds(left: string, right: string): number {
  const leftNumber = /^\d+$/.test(left) ? Number(left) : null;
  const rightNumber = /^\d+$/.test(right) ? Number(right) : null;
  if (leftNumber !== null && rightNumber !== null) return leftNumber - rightNumber;
  return left.localeCompare(right);
}

/** Reads and orders the legacy classes, with the streams the class carries nested in it. */
function readClasses(rows: readonly SqliteRow[]): LegacyClass[] {
  const classes: LegacyClass[] = [];
  for (const row of rows) {
    const id = legacyId(row);
    const name = legacyText(row, 'name');
    if (id === '' || name === null) continue;
    classes.push({ id, name: normalizedClassName(name) });
  }
  return classes.sort((left, right) => compareLegacyIds(left.id, right.id));
}

/** The class name with its whitespace collapsed, so `Form  1` and `Form 1` are one name. */
function normalizedClassName(name: string): string {
  return name.replace(/\s+/g, ' ').trim();
}

/** A value out of the nested `classes.streams` array as text, or null when it is not one. */
function nestedText(value: unknown): string | null {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'bigint') return String(value);
  return null;
}

/** Reads `class_streams`, and the streams only the class's nested array holds. */
function readStreams(
  rows: readonly SqliteRow[],
  classes: readonly LegacyClass[],
  classRows: readonly SqliteRow[]
): LegacyStream[] {
  const classNameById = new Map(classes.map((entry) => [entry.id, entry.name]));
  const streams = new Map<string, LegacyStream>();
  for (const row of rows) {
    const id = legacyId(row);
    const name = legacyText(row, 'name');
    if (id === '' || name === null) continue;
    const classId = legacyRef(row, 'class_id');
    streams.set(id, {
      id,
      classId,
      name: normalizedClassName(name),
      className:
        legacyText(row, 'class_name') ??
        (classId === null ? null : classNameById.get(classId) ?? null),
      fromNested: false,
    });
  }

  for (const row of classRows) {
    const classId = legacyId(row);
    if (classId === '') continue;
    for (const nested of readNestedStreams(row)) {
      const id = legacyKey(nestedText(nested.id));
      if (id === null || streams.has(id)) continue;
      const name = nested.name === undefined ? '' : normalizedClassName(nestedText(nested.name) ?? '');
      if (name === '') continue;
      const nestedClassId = legacyKey(nestedText(nested.class_id));
      streams.set(id, {
        id,
        classId: nestedClassId ?? classId,
        name,
        className: classNameById.get(classId) ?? null,
        fromNested: true,
      });
    }
  }

  return [...streams.values()];
}

/** Reads the learners, for the count per stream and for the class each one points at. */
function readLearners(rows: readonly SqliteRow[]): LegacyLearner[] {
  return rows.map((row) => ({
    id: legacyId(row),
    admissionNumber: legacyText(row, 'admission_no'),
    streamId: legacyRef(row, 'current_class_stream_id'),
    className: legacyText(row, 'current_class_name'),
    streamName: legacyText(row, 'current_class_stream_name'),
    status: legacyText(row, 'status'),
  }));
}

/** Reads the canonical academic years the operator can choose from. */
async function readYears(reader: SqlReader): Promise<MappingYear[]> {
  if (!(await tableExists(reader, 'academic_year'))) return [];
  const rows = await reader.all<SqliteRow>(
    `SELECT id, name, start_date, end_date, status FROM academic_year
      ORDER BY start_date, name`
  );
  const years: MappingYear[] = [];
  for (const row of rows) {
    const id = legacyText(row, 'id');
    const name = legacyText(row, 'name');
    const startDate = legacyDay(row, 'start_date');
    const endDate = legacyDay(row, 'end_date');
    if (id === null || name === null || startDate === null || endDate === null) continue;
    years.push({
      id,
      name,
      startDate,
      endDate,
      status: legacyText(row, 'status') ?? '',
    });
  }
  return years;
}

/** Reads the decisions the operator confirmed, or nothing when the step never ran. */
export async function readLevelMapping(reader: SqlReader): Promise<LevelMappingEntry[]> {
  if (!(await tableExists(reader, LEVEL_MAPPING_TABLE))) return [];
  const rows = await reader.all<SqliteRow>(
    `SELECT * FROM "${LEVEL_MAPPING_TABLE}"
      ORDER BY legacy_class_id, legacy_stream_id`
  );
  return rows.map((row) => ({
    legacyClassId: legacyText(row, 'legacy_class_id') ?? '',
    legacyStreamId: legacyText(row, 'legacy_stream_id') ?? '',
    legacyClassName: legacyText(row, 'legacy_class_name') ?? '',
    legacyStreamName: legacyText(row, 'legacy_stream_name') ?? '',
    level: {
      stageCode: legacyText(row, 'stage_code') ?? DEFAULT_STAGE.code,
      stageName: legacyText(row, 'stage_name') ?? DEFAULT_STAGE.name,
      stageSequence: legacyInteger(row, 'stage_sequence') ?? DEFAULT_STAGE.sequence,
      code: legacyText(row, 'level_code') ?? '',
      name: legacyText(row, 'level_name') ?? '',
      ordinal: legacyInteger(row, 'level_ordinal') ?? 0,
      isTerminal: legacyInteger(row, 'level_is_terminal') === 1,
    },
    academicYearId: legacyText(row, 'academic_year_id') ?? '',
    levelConfidence: confidenceOf(legacyText(row, 'level_confidence')),
    levelRule: legacyText(row, 'level_rule') ?? '',
    yearConfidence: confidenceOf(legacyText(row, 'year_confidence')),
    yearRule: legacyText(row, 'year_rule') ?? '',
    operatorCorrected: legacyInteger(row, 'operator_corrected') === 1,
    confirmedAt: legacyText(row, 'confirmed_at'),
    confirmedBy: legacyText(row, 'confirmed_by'),
  }));
}

function confidenceOf(value: string | null): MappingConfidence {
  return value === 'high' || value === 'medium' || value === 'low' ? value : 'low';
}

/** Reads every legacy row and every confirmed decision the mapping needs. */
export async function readLevelMappingSource(reader: SqlReader): Promise<LevelMappingSource> {
  const classRows = await readTable(reader, LEVEL_MAPPING_SOURCES.classes);
  const streamRows = await readTable(reader, LEVEL_MAPPING_SOURCES.classStreams);
  const learnerRows = await readTable(reader, LEVEL_MAPPING_SOURCES.students);
  const classes = readClasses(classRows);
  return {
    classes,
    streams: readStreams(streamRows, classes, classRows),
    learners: readLearners(learnerRows),
    years: await readYears(reader),
    confirmed: await readLevelMapping(reader),
  };
}

/** The level a class name names, and how sure the rule is. */
interface ClassLevelProposal {
  readonly level: LevelDefinition;
  readonly confidence: MappingConfidence;
  readonly rule: string;
}

/** The academic year a stream belongs to, and how sure the rule is. */
interface YearProposal {
  readonly yearId: string;
  readonly confidence: MappingConfidence;
  readonly rule: string;
}

/** Turns a class name into a level code: `Form 1` becomes `FORM-1`. */
function levelCode(system: string | null, name: string): string {
  if (system !== null) return `${system}-${name.match(ANY_NUMBER_PATTERN)?.[1] ?? ''}`.replace(/-$/, '');
  const slug = name
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);
  return slug === '' ? 'LEVEL' : slug;
}

/**
 * Proposes the level a legacy class becomes.
 *
 * The rule follows spec 02 §13: the class name is matched to a level. A name that carries a
 * system word and a number (`Form 1`, `Grade 7`, `Year 8`) is a confident match; a name that
 * carries a number anywhere is a reasonable one; a name without a number can only fall back to
 * the class's position in the list, which is why the operator has to confirm it.
 */
function proposeClassLevel(className: string, index: number): ClassLevelProposal {
  const match = LEVEL_NAME_PATTERN.exec(className);
  if (match !== null) {
    const system = SYSTEMS[match[1].toLowerCase()];
    const ordinal = Number(match[2]);
    const name = `${system.label} ${ordinal}`;
    return {
      level: {
        ...DEFAULT_STAGE_FIELDS(),
        code: levelCode(system.code, name),
        name,
        ordinal,
        isTerminal: false,
      },
      confidence: 'high',
      rule: `the class name "${className}" names a level: ${name}, order ${ordinal}`,
    };
  }

  const number = ANY_NUMBER_PATTERN.exec(className);
  if (number !== null) {
    const ordinal = Number(number[1]);
    return {
      level: {
        ...DEFAULT_STAGE_FIELDS(),
        code: levelCode(null, className),
        name: className,
        ordinal,
        isTerminal: false,
      },
      confidence: 'medium',
      rule: `the number in the class name "${className}" sets the level order ${ordinal}`,
    };
  }

  const ordinal = index + 1;
  return {
    level: {
      ...DEFAULT_STAGE_FIELDS(),
      code: levelCode(null, className),
      name: className,
      ordinal,
      isTerminal: false,
    },
    confidence: 'low',
    rule: `the class name "${className}" carries no number; the level order ${ordinal} is the class's position in the list`,
  };
}

/** The stage fields every proposed level carries. */
function DEFAULT_STAGE_FIELDS(): Pick<
  LevelDefinition,
  'stageCode' | 'stageName' | 'stageSequence'
> {
  return {
    stageCode: DEFAULT_STAGE.code,
    stageName: DEFAULT_STAGE.name,
    stageSequence: DEFAULT_STAGE.sequence,
  };
}

/**
 * Proposes the academic year a stream belongs to.
 *
 * The year that covers the migration day is the confident answer. Without one, the year marked
 * current is the next best, then the latest year that had ended, then the earliest to come. A
 * database with no academic year proposes nothing and the operator has to run M1 or fix the
 * calendar first.
 */
export function proposeAcademicYear(
  years: readonly MappingYear[],
  referenceDate: string
): YearProposal {
  const covering = years.find(
    (year) => year.startDate <= referenceDate && referenceDate <= year.endDate
  );
  if (covering !== undefined) {
    return {
      yearId: covering.id,
      confidence: 'high',
      rule: `the academic year "${covering.name}" covers ${referenceDate}`,
    };
  }

  const current = years.find((year) => year.status === 'current');
  if (current !== undefined) {
    return {
      yearId: current.id,
      confidence: 'medium',
      rule: `the academic year "${current.name}" is marked current`,
    };
  }

  const ended = [...years]
    .filter((year) => year.endDate < referenceDate)
    .sort((left, right) => right.endDate.localeCompare(left.endDate))[0];
  if (ended !== undefined) {
    return {
      yearId: ended.id,
      confidence: 'medium',
      rule: `the latest academic year that had ended by ${referenceDate} is "${ended.name}"`,
    };
  }

  const upcoming = [...years].sort((left, right) =>
    left.startDate.localeCompare(right.startDate)
  )[0];
  if (upcoming !== undefined) {
    return {
      yearId: upcoming.id,
      confidence: 'low',
      rule: `the earliest academic year that starts after ${referenceDate} is "${upcoming.name}"`,
    };
  }

  return {
    yearId: '',
    confidence: 'low',
    rule: 'the database holds no academic year',
  };
}

/**
 * Proposes one decision per legacy stream, and one for a class that has no streams.
 *
 * The function is pure: the same legacy rows and the same day always produce the same
 * proposal. Nothing is written here; the operator confirms or corrects every row before the
 * step saves it.
 */
export function proposeLevelMapping(
  source: LevelMappingSource,
  options: { readonly referenceDate: string }
): LevelMappingProposal {
  const classIds = new Set(source.classes.map((entry) => entry.id));
  const streamsByClass = new Map<string, LegacyStream[]>();
  const orphanStreams: LegacyStream[] = [];
  for (const stream of source.streams) {
    if (stream.classId === null || !classIds.has(stream.classId)) {
      orphanStreams.push(stream);
      continue;
    }
    const list = streamsByClass.get(stream.classId) ?? [];
    list.push(stream);
    streamsByClass.set(stream.classId, list);
  }

  const classProposals = source.classes.map((entry, index) => ({
    class: entry,
    proposal: proposeClassLevel(entry.name, index),
  }));
  const highestOrdinal = classProposals.reduce(
    (highest, entry) => Math.max(highest, entry.proposal.level.ordinal),
    0
  );
  const terminalIndex = classProposals.reduce(
    (last, entry, index) => (entry.proposal.level.ordinal === highestOrdinal ? index : last),
    -1
  );

  const year = proposeAcademicYear(source.years, options.referenceDate);
  const entries: LevelMappingEntry[] = [];
  classProposals.forEach((entry, index) => {
    const isTerminal = index === terminalIndex;
    const level: LevelDefinition = { ...entry.proposal.level, isTerminal };
    const levelRule = isTerminal
      ? `${entry.proposal.rule}; it is the last class, so it is the final level`
      : entry.proposal.rule;
    const streams = (streamsByClass.get(entry.class.id) ?? []).sort((left, right) => {
      const byName = left.name.localeCompare(right.name);
      return byName !== 0 ? byName : compareLegacyIds(left.id, right.id);
    });
    const units = streams.length === 0 ? [null] : streams;
    for (const stream of units) {
      entries.push({
        legacyClassId: entry.class.id,
        legacyStreamId: stream?.id ?? '',
        legacyClassName: entry.class.name,
        legacyStreamName: stream?.name ?? '',
        level,
        academicYearId: year.yearId,
        levelConfidence: entry.proposal.confidence,
        levelRule,
        yearConfidence: year.confidence,
        yearRule: year.rule,
        operatorCorrected: false,
        confirmedAt: null,
        confirmedBy: null,
      });
    }
  });

  return {
    entries,
    orphanStreams,
    classCount: source.classes.length,
    streamCount: source.streams.length,
  };
}

/** Creates the decisions table; safe to run against an existing database. */
export async function ensureLevelMappingTable(writer: SqliteTransaction): Promise<void> {
  await writer.exec(MAPPING_DDL);
}

/**
 * Replaces the confirmed mapping with the decisions given.
 *
 * The replacement is deliberate: the operator confirms the whole mapping in one step, and a
 * re-run of the migration must use the latest confirmation rather than a merge of two.
 */
export async function saveLevelMapping(
  writer: SqliteTransaction,
  entries: readonly LevelMappingEntry[]
): Promise<void> {
  const seen = new Set<string>();
  for (const entry of entries) {
    const key = levelMappingKey(entry.legacyClassId, entry.legacyStreamId);
    if (seen.has(key)) {
      throw new Error(`The level mapping holds the class "${entry.legacyClassName}" twice`);
    }
    seen.add(key);
    if (entry.level.code.trim() === '' || entry.level.name.trim() === '') {
      throw new Error(
        `The level mapping for the class "${entry.legacyClassName}" needs a level name and a level code`
      );
    }
    if (entry.academicYearId.trim() === '') {
      throw new Error(
        `The level mapping for the class "${entry.legacyClassName}" needs an academic year`
      );
    }
  }

  await ensureLevelMappingTable(writer);
  await writer.exec(`DELETE FROM "${LEVEL_MAPPING_TABLE}"`);
  const placeholders = MAPPING_COLUMNS.map(() => '?').join(', ');
  const sql = `INSERT INTO "${LEVEL_MAPPING_TABLE}" (${MAPPING_COLUMNS.map((column) => `"${column}"`).join(', ')})
               VALUES (${placeholders})`;
  for (const entry of entries) {
    const values: SqliteBindValue[] = [
      entry.legacyClassId,
      entry.legacyStreamId,
      entry.legacyClassName,
      entry.legacyStreamName,
      entry.level.stageCode,
      entry.level.stageName,
      entry.level.stageSequence,
      entry.level.code,
      entry.level.name,
      entry.level.ordinal,
      entry.level.isTerminal ? 1 : 0,
      entry.academicYearId,
      entry.levelConfidence,
      entry.levelRule,
      entry.yearConfidence,
      entry.yearRule,
      entry.operatorCorrected ? 1 : 0,
      entry.confirmedAt ?? '',
      entry.confirmedBy,
    ];
    await writer.run(sql, values);
  }
}
