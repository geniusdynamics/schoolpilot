// ABOUTME: Idempotent database writers for each setup wizard step. Every writer upserts by natural key
// ABOUTME: (or by the id recorded in the draft) into the defined collections, so Back/Next never duplicates records.

import { databaseService } from '@/services/database/databaseService';
import { collectionsDefinition } from '@/services/database/collections';
import type { ICollection } from '@/services/database/interfaces';
import { FinancialYearStatus } from '@/core/types';
import {
  FINANCIAL_YEARS_COLLECTION,
  FinancialYearRuleError,
  notifyFinancialYearsChanged,
  validateFinancialYear,
  type FinancialYearRecord,
} from '@/modules/finance/data/useFinancialYearData';
import {
  SCHOOL_PERIODS_COLLECTION,
  SchoolPeriodRuleError,
  notifySchoolPeriodsChanged,
  validateSchoolPeriod,
  type SchoolPeriodInput,
  type SchoolPeriodRecord,
} from '@/modules/administration/data/useSchoolPeriodData';
import { ACADEMIC_YEARS_COLLECTION } from '@/modules/administration/data/useAcademicYearData';
import { ACADEMIC_PERIOD_DEFINITIONS_COLLECTION } from '@/modules/administration/data/useAcademicPeriodDefinitionData';
import { KENYAN_CURRICULUM_PRESETS, type KenyanSubjectSeed } from '@/modules/academics/data/templates/kenyan-subject-sets';
import { EDUCATION_SYSTEM_TEMPLATES } from '@/modules/academics/data/templates/education-system-templates';
import { TERM_NAMES, financialYearFor, type ClassRowDraft, type CreatedRecords, type WizardDraft } from './wizardDraft';

type Row = { id: string } & Record<string, any>;

/** The academic-year structure the wizard's three terms belong to. */
export const THREE_TERM_STRUCTURE_NAME = 'Three terms';

const stamp = () => new Date().toISOString();
const sameId = (a: unknown, b: unknown) => String(a ?? '') === String(b ?? '');
const sameName = (a: unknown, b: unknown) => String(a ?? '').trim().toLowerCase() === String(b ?? '').trim().toLowerCase();
const isoDay = (value: unknown) => (value ? String(value).slice(0, 10) : '');

/** Thin access to the defined collections; a missing collection is an error, never a silent no-op. */
export interface WizardStore {
  find(name: string): Promise<Row[]>;
  insert(name: string, doc: Record<string, any>): Promise<Row>;
  update(name: string, id: string, patch: Record<string, any>): Promise<void>;
  remove(name: string, id: string): Promise<void>;
}

/**
 * A new id for `name`. Tables whose schema still declares an integer primary key (e.g. subjects) reject
 * UUIDs in SQLite, so they get a numeric id; every other table gets a UUID.
 */
function newId(name: string): string | number {
  const definition = (collectionsDefinition as Record<string, { schema?: { properties?: Record<string, { type?: unknown }> } }>)[name];
  return definition?.schema?.properties?.id?.type === 'integer' ? databaseService.generateNumericId() : databaseService.generateId();
}

export async function openWizardStore(): Promise<WizardStore> {
  const db = await databaseService.getDatabase();
  const collection = (name: string): ICollection<Row> => {
    const found = db.getCollection(name) as ICollection<Row> | null;
    if (!found) throw new Error(`The '${name}' table is not available. Restart the app and try again.`);
    return found;
  };
  return {
    // Ids are strings at runtime, whatever the column type.
    find: async (name) => ((await collection(name).find({})) || []).map((row) => ({ ...row, id: String(row.id) })),
    insert: async (name, doc) => {
      const id = doc.id ?? newId(name);
      await collection(name).insert({ ...doc, id } as Row);
      return { ...doc, id: String(id) } as Row;
    },
    update: async (name, id, patch) => {
      await collection(name).update(id, patch);
    },
    remove: async (name, id) => {
      await collection(name).remove(id);
    },
  };
}

/** Updates the row matched first by recorded id, then by `matches`; inserts it when neither exists. */
async function upsert(
  store: WizardStore,
  name: string,
  existing: Row[],
  recordedId: string | undefined,
  matches: (row: Row) => boolean,
  fields: Record<string, any>
): Promise<Row> {
  const target = existing.find((row) => recordedId && sameId(row.id, recordedId)) ?? existing.find(matches);
  if (target) {
    await store.update(name, target.id, { ...fields, updated_at: stamp() });
    return { ...target, ...fields };
  }
  const now = stamp();
  return store.insert(name, { ...fields, created_at: now, updated_at: now });
}

export async function saveSchoolProfile(store: WizardStore, school: WizardDraft['school']): Promise<void> {
  const name = school.name.trim();
  if (!name) throw new Error('School name is required.');
  const fields: Record<string, string> = { name };
  if (school.motto.trim()) fields.motto = school.motto.trim();
  if (school.address.trim()) fields.postal_address = school.address.trim();
  if (school.phone.trim()) fields.telephone = school.phone.trim();
  if (school.email.trim()) fields.email = school.email.trim();
  // school_details holds a single row: the profile shown in the header, receipts and reports.
  const [current] = await store.find('school_details');
  await upsert(store, 'school_details', current ? [current] : [], current?.id, () => false, fields);
}

export async function saveEducationSystem(store: WizardStore, draft: WizardDraft): Promise<Partial<CreatedRecords>> {
  if (!draft.curriculum) return {};
  const preset = KENYAN_CURRICULUM_PRESETS[draft.curriculum];
  const template = EDUCATION_SYSTEM_TEMPLATES[preset.templateKey] ?? {};
  const name = template.name ?? preset.label;
  const existing = await store.find('education_system_configurations');
  const recorded = existing.find((row) => draft.created.educationSystemId && sameId(row.id, draft.created.educationSystemId));
  const createdByWizard = Boolean(recorded && draft.created.educationSystemCreated);
  // A configuration with this name that the wizard did not create is reused exactly as it is.
  const reusable = existing.find((row) => sameName(row.name, name) && !(createdByWizard && sameId(row.id, recorded!.id)));
  if (reusable) {
    if (createdByWizard) await store.remove('education_system_configurations', recorded!.id);
    return { educationSystemId: reusable.id, educationSystemCreated: false };
  }
  const saved = await upsert(store, 'education_system_configurations', createdByWizard ? existing : [],
    createdByWizard ? recorded!.id : undefined, () => false, { name, description: preset.label });
  return { educationSystemId: saved.id, educationSystemCreated: true };
}

async function ensureTermDefinitions(store: WizardStore): Promise<Row[]> {
  const structures = await store.find('academic_year_structures');
  const structure = structures.find((row) => sameName(row.name, THREE_TERM_STRUCTURE_NAME))
    ?? (await store.insert('academic_year_structures', { name: THREE_TERM_STRUCTURE_NAME }));
  const definitions = await store.find(ACADEMIC_PERIOD_DEFINITIONS_COLLECTION);
  const result: Row[] = [];
  for (const [index, termName] of TERM_NAMES.entries()) {
    const found = definitions.find((row) => sameId(row.structure_id, structure.id) && sameName(row.name, termName));
    result.push(found ?? (await store.insert(ACADEMIC_PERIOD_DEFINITIONS_COLLECTION, {
      structure_id: structure.id,
      structure_name: structure.name,
      name: termName,
      sequence_order: index + 1,
    })));
  }
  return result;
}

/**
 * The financial year the terms link to. One the school already had (same name, or covering the academic
 * year's start) is reused and never modified; only a year the wizard inserted itself is updated on later passes.
 */
async function ensureFinancialYear(store: WizardStore, draft: WizardDraft): Promise<{ row: Row; created: boolean }> {
  const wanted = financialYearFor(draft);
  const existing = (await store.find(FINANCIAL_YEARS_COLLECTION)) as unknown as FinancialYearRecord[];
  const recorded = existing.find((year) => draft.created.financialYearId && sameId(year.id, draft.created.financialYearId));
  const ownYear = draft.created.financialYearCreated ? recorded : undefined;
  if (!ownYear) {
    const reusable = existing.find((year) => sameName(year.name, wanted.name))
      ?? existing.find((year) => isoDay(year.start_date) <= isoDay(draft.yearStart) && isoDay(draft.yearStart) <= isoDay(year.end_date));
    if (reusable) return { row: reusable as unknown as Row, created: false };
  }
  const violations = validateFinancialYear(wanted, existing, ownYear?.id);
  if (violations.length > 0) throw new FinancialYearRuleError(violations);
  const saved = await upsert(store, FINANCIAL_YEARS_COLLECTION, existing as unknown as Row[], ownYear?.id, () => false, {
    ...wanted,
    status: ownYear?.status ?? FinancialYearStatus.OPEN,
  });
  notifyFinancialYearsChanged();
  return { row: saved, created: true };
}

/** Academic year, its financial year and its three terms with the dates the user entered. */
export async function saveAcademicYear(store: WizardStore, draft: WizardDraft): Promise<Partial<CreatedRecords>> {
  const name = draft.yearName.trim();
  if (!name) throw new Error('Year name is required.');
  if (!draft.yearStart || !draft.yearEnd || draft.yearEnd <= draft.yearStart) {
    throw new Error('The academic year needs a start date and a later end date.');
  }

  const definitions = await ensureTermDefinitions(store);
  const { row: financialYear, created: financialYearCreated } = await ensureFinancialYear(store, draft);
  const years = await store.find(ACADEMIC_YEARS_COLLECTION);
  const others = years.filter((year) => !sameId(year.id, draft.created.academicYearId));
  if (others.some((year) => sameName(year.name, name) && year.structure_id && year.structure_id !== definitions[0].structure_id)) {
    throw new Error(`An academic year named ${name} already exists with a different term structure.`);
  }
  const year = await upsert(store, ACADEMIC_YEARS_COLLECTION, years, draft.created.academicYearId, (row) => sameName(row.name, name), {
    name,
    structure_id: definitions[0].structure_id,
    structure_name: definitions[0].structure_name ?? THREE_TERM_STRUCTURE_NAME,
    start_date: draft.yearStart,
    end_date: draft.yearEnd,
  });

  // Validate all three terms before writing any of them.
  const stored = (await store.find(SCHOOL_PERIODS_COLLECTION)) as unknown as SchoolPeriodRecord[];
  const today = isoDay(stamp());
  const containsToday = draft.terms.findIndex((term) => term.start <= today && today <= term.end);
  const otherYearHasCurrent = stored.some((term) => Boolean(term.is_active) && !sameId(term.academic_year_id, year.id));
  const planned: Array<{ input: SchoolPeriodInput; id?: string }> = [];
  let context = stored.filter((term) => !sameId(term.academic_year_id, year.id));
  for (const [index, term] of draft.terms.entries()) {
    const input: SchoolPeriodInput = {
      academic_year_id: year.id,
      period_definition_id: definitions[index].id,
      financial_year_id: financialYear.id,
      start_date: term.start,
      end_date: term.end,
      is_active: !otherYearHasCurrent && index === Math.max(containsToday, 0),
      name: term.name,
      academic_year_name: name,
      period_definition_name: definitions[index].name,
      financial_year_name: financialYear.name,
    };
    const violations = validateSchoolPeriod(input, { existing: context as SchoolPeriodRecord[], academicYear: { name, start_date: draft.yearStart, end_date: draft.yearEnd } });
    if (violations.length > 0) throw new SchoolPeriodRuleError(violations);
    const current = stored.find((row) => sameId(row.academic_year_id, year.id) && sameId(row.period_definition_id, input.period_definition_id));
    planned.push({ input, id: current?.id });
    context = [...context, { ...input, id: current?.id ?? `planned-${index}` } as unknown as SchoolPeriodRecord];
  }
  for (const { input, id } of planned) {
    await upsert(store, SCHOOL_PERIODS_COLLECTION, stored as unknown as Row[], id, () => false, { ...input });
  }
  notifySchoolPeriodsChanged();
  return { academicYearId: year.id, financialYearId: financialYear.id, financialYearCreated };
}

const streamNames = (row: ClassRowDraft) =>
  row.streams.split(',').map((s) => s.trim()).filter((s, i, all) => s && all.findIndex((o) => sameName(o, s)) === i);

/** Classes by name and their streams by (class, name); rows removed from the draft remove what the wizard created. */
export async function saveClassesAndStreams(
  store: WizardStore,
  draft: WizardDraft
): Promise<{ classes: ClassRowDraft[]; created: Partial<CreatedRecords> }> {
  const classes = await store.find('classes');
  const streams = await store.find('class_streams');
  const createdClassIds = new Set(draft.created.classIds);
  const createdStreamIds = new Set(draft.created.streamIds);
  const keptClassIds = new Set<string>();
  const keptStreamIds = new Set<string>();
  const rows: ClassRowDraft[] = [];

  for (const row of draft.classes) {
    const className = row.name.trim();
    if (!className) {
      rows.push({ ...row, classId: undefined });
      continue;
    }
    const known = classes.find((c) => row.classId && sameId(c.id, row.classId)) ?? classes.find((c) => sameName(c.name, className));
    let classId: string;
    if (known) {
      classId = known.id;
      if (known.name !== className) await store.update('classes', classId, { name: className });
    } else {
      classId = (await store.insert('classes', { name: className })).id;
      createdClassIds.add(classId);
    }
    keptClassIds.add(classId);
    for (const streamName of streamNames(row)) {
      const stream = streams.find((s) => sameId(s.class_id, classId) && sameName(s.name, streamName));
      if (stream) {
        keptStreamIds.add(stream.id);
        continue;
      }
      const inserted = await store.insert('class_streams', { class_id: classId, name: streamName, class_name: className });
      createdStreamIds.add(inserted.id);
      keptStreamIds.add(inserted.id);
    }
    rows.push({ ...row, name: className, classId });
  }

  for (const id of [...createdStreamIds]) {
    if (keptStreamIds.has(id)) continue;
    if (streams.some((s) => sameId(s.id, id))) await store.remove('class_streams', id);
    createdStreamIds.delete(id);
  }
  for (const id of [...createdClassIds]) {
    if (keptClassIds.has(id)) continue;
    if (classes.some((c) => sameId(c.id, id))) await store.remove('classes', id);
    createdClassIds.delete(id);
  }
  return { classes: rows, created: { classIds: [...createdClassIds], streamIds: [...createdStreamIds] } };
}

/** Subjects by subject_code; subjects the wizard created and the user later unticks are removed. */
export async function saveSubjects(
  store: WizardStore,
  chosen: KenyanSubjectSeed[],
  createdIds: Record<string, string>
): Promise<Partial<CreatedRecords>> {
  const existing = await store.find('subjects');
  const subjectIds: Record<string, string> = { ...createdIds };
  for (const subject of chosen) {
    if (existing.some((row) => sameName(row.subject_code, subject.subject_code))) continue;
    const inserted = await store.insert('subjects', {
      subject_code: subject.subject_code,
      name: subject.name,
      abbreviation: subject.abbreviation,
      grouping: subject.grouping,
      is_compulsory: subject.is_compulsory,
    });
    subjectIds[subject.subject_code] = inserted.id;
  }
  const chosenCodes = new Set(chosen.map((subject) => subject.subject_code));
  for (const [code, id] of Object.entries(subjectIds)) {
    if (chosenCodes.has(code)) continue;
    if (existing.some((row) => sameId(row.id, id))) await store.remove('subjects', id);
    delete subjectIds[code];
  }
  return { subjectIds };
}

/** Records on the school profile that setup was completed; re-running the wizard refreshes the time. */
export async function markSetupCompleted(store: WizardStore, completedAt: string = stamp()): Promise<string> {
  const [current] = await store.find('school_details');
  if (!current) throw new Error('Save the school profile before finishing setup.');
  await store.update('school_details', current.id, { setup_completed_at: completedAt, updated_at: stamp() });
  return completedAt;
}

export async function hasAnyUser(store: WizardStore): Promise<boolean> {
  return (await store.find('users')).length > 0;
}
