// ABOUTME: Repairs demo seed data for the Kenyan January-November academic calendar and real guardian links.
// ABOUTME: Produces deterministic calendar/financial-year records, guardian relationships and canonical foreign keys.

import { FinancialYearStatus } from '@/core/types';

type SeedRecord = Record<string, any>;

export interface DemoSeedCalendar {
  academic_year_structures: SeedRecord[];
  academic_period_definitions: SeedRecord[];
  academic_years: SeedRecord[];
  school_periods: SeedRecord[];
  financial_years: SeedRecord[];
}

export interface GuardianRepairInput {
  students: SeedRecord[];
  guardians: SeedRecord[];
  relationships: SeedRecord[];
}

export interface GuardianRepairResult {
  guardians: SeedRecord[];
  relationships: SeedRecord[];
}

/** A foreign key declared by the collection schema: `child.column` -> `parent`. */
export interface SeedForeignKeyReference {
  child: string;
  column: string;
  parent: string;
}

export interface SeedForeignKeyRepairReport {
  remapped: number;
  dropped: Array<{ collection: string; id: string; column: string; value: string }>;
}

const SEED_TIMESTAMP = '2023-01-01T00:00:00.000Z';

// The demo always shows the calendar year the product pitches (2026) as current.
const DEMO_YEARS = [2023, 2024, 2025, 2026];
const CURRENT_DEMO_YEAR = 2026;

// Term windows stay inside January-November so a term can never spill into the next year.
const TERM_WINDOWS = [
  { definitionId: 1, name: 'Term 1', startMonthDay: '01-06', endMonthDay: '04-10' },
  { definitionId: 2, name: 'Term 2', startMonthDay: '05-06', endMonthDay: '08-08' },
  { definitionId: 3, name: 'Term 3', startMonthDay: '09-02', endMonthDay: '11-22' }
];

const STRUCTURE_ID = 1;
const STRUCTURE_NAME = 'Kenyan 3-Term Calendar';

const pad = (value: string | number, length = 2): string => String(value).padStart(length, '0');

const isoDate = (year: number, monthDay: string): string => `${year}-${monthDay}`;

const record = (id: number | string, values: SeedRecord): SeedRecord => ({
  id,
  ...values,
  created_at: SEED_TIMESTAMP,
  updated_at: SEED_TIMESTAMP
});

/**
 * Builds a complete Kenyan academic calendar: four calendar-year academic years,
 * three terms inside each year, and one financial year covering every term of its year.
 */
export const buildKenyanDemoCalendar = (): DemoSeedCalendar => {
  const academic_year_structures = [
    record(STRUCTURE_ID, { name: STRUCTURE_NAME })
  ];

  const academic_period_definitions = TERM_WINDOWS.map((term) =>
    record(term.definitionId, {
      structure_id: STRUCTURE_ID,
      name: term.name,
      sequence_order: term.definitionId,
      structure_name: STRUCTURE_NAME
    })
  );

  const academic_years: SeedRecord[] = [];
  const school_periods: SeedRecord[] = [];
  const financial_years: SeedRecord[] = [];
  let periodId = 1;

  DEMO_YEARS.forEach((year, index) => {
    const academicYearId = index + 1;
    const startDate = isoDate(year, '01-01');
    const endDate = isoDate(year, '11-30');
    const financialYearId = index + 1;
    const isCurrentYear = year === CURRENT_DEMO_YEAR;

    academic_years.push(
      record(academicYearId, {
        name: String(year),
        structure_id: STRUCTURE_ID,
        start_date: startDate,
        end_date: endDate,
        structure_name: STRUCTURE_NAME
      })
    );

    financial_years.push(
      record(financialYearId, {
        name: `FY ${year}`,
        start_date: isoDate(year, '01-01'),
        end_date: isoDate(year, '12-31'),
        status: isCurrentYear ? FinancialYearStatus.OPEN : FinancialYearStatus.CLOSED
      })
    );

    TERM_WINDOWS.forEach((term) => {
      const termStart = isoDate(year, term.startMonthDay);
      const termEnd = isoDate(year, term.endMonthDay);
      // Term 3 of the current year is the active reporting term for the demo.
      const isActive = isCurrentYear && term.definitionId === 3;

      school_periods.push(
        record(periodId++, {
          academic_year_id: academicYearId,
          period_definition_id: term.definitionId,
          financial_year_id: financialYearId,
          start_date: termStart,
          end_date: termEnd,
          is_active: isActive,
          name: `${term.name} - ${year}`,
          academic_year_name: String(year),
          period_definition_name: term.name,
          financial_year_name: `FY ${year}`
        })
      );
    });
  });

  return {
    academic_year_structures,
    academic_period_definitions,
    academic_years,
    school_periods,
    financial_years
  };
};

// Generated ids such as `id_1792318648638_f1cj1` change on every import/run.
// Rewrite them to stable per-collection ids and point any direct foreign keys at them.
const GENERATED_ID_PATTERN = /_\d{10,}_[a-z0-9]+$/i;

const contentHash = (value: string): string => {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36).toUpperCase();
};

export const stabiliseSeedIds = (sampleMap: Map<string, SeedRecord[]>): void => {
  const replacements = new Map<string, string>();

  for (const [collectionName, rows] of sampleMap.entries()) {
    const usedIds = new Set<string>();
    rows.forEach((row) => {
      const id = row?.id;
      if (typeof id !== 'string' || !GENERATED_ID_PATTERN.test(id)) {
        return;
      }

      // Hash the record's stable content, not its position: volume sampling
      // shuffles rows, so an index-based id would differ between runs.
      const stableContent = Object.entries(row)
        .filter(([key]) => key !== 'id' && key !== 'created_at' && key !== 'updated_at')
        .sort(([left], [right]) => left.localeCompare(right));
      let stableId = `${collectionName.toUpperCase()}_SEED_${contentHash(JSON.stringify(stableContent))}`;
      let suffix = 2;
      while (usedIds.has(stableId)) {
        stableId = `${collectionName.toUpperCase()}_SEED_${contentHash(JSON.stringify(stableContent))}_${suffix++}`;
      }

      usedIds.add(stableId);
      replacements.set(id, stableId);
      row.id = stableId;
    });
  }

  if (replacements.size === 0) {
    return;
  }

  for (const rows of sampleMap.values()) {
    for (const row of rows) {
      for (const key of Object.keys(row)) {
        if (!key.endsWith('_id')) {
          continue;
        }
        const value = row[key];
        if (typeof value === 'string' && replacements.has(value)) {
          row[key] = replacements.get(value);
        }
      }
    }
  }
};

// Subjects carry a denormalised department name; some point at departments the
// administration seed does not define. Add those parents rather than orphan them.
export const repairSubjectDepartments = (subjects: SeedRecord[], departments: SeedRecord[]): SeedRecord[] => {
  const repaired = [...departments];
  const existingIds = new Set(repaired.map((department, index) => String(department.id ?? `DEPT_EXISTING_${index + 1}`)));

  subjects.forEach((subject) => {
    const departmentId = subject.department_id == null ? '' : String(subject.department_id);
    if (!departmentId || existingIds.has(departmentId)) {
      return;
    }

    existingIds.add(departmentId);
    repaired.push(
      record(departmentId, {
        name: typeof subject.department_name === 'string' && subject.department_name.trim()
          ? subject.department_name.trim()
          : `Department ${departmentId}`,
        is_academic: true
      })
    );
  });

  return repaired;
};

const GUARDIAN_FIRST_NAMES = [
  'Grace', 'Peter', 'Mary', 'James', 'Esther', 'Daniel', 'Mercy', 'Samuel',
  'Faith', 'Joseph', 'Catherine', 'Michael', 'Agnes', 'David', 'Ruth', 'Paul'
];

const MALE_GUARDIAN_NAMES = new Set(['Peter', 'James', 'Daniel', 'Samuel', 'Joseph', 'Michael', 'David', 'Paul']);

const normaliseName = (value: string): string => value.trim().replace(/\s+/g, ' ').toLowerCase();

const studentDisplayName = (student: SeedRecord): string => {
  const first = String(student.first_name ?? '').trim();
  const last = String(student.last_name ?? '').trim();
  return normaliseName(`${first} ${last}`.trim());
};

const stableIndex = (value: string, modulo: number): number => {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return modulo > 0 ? hash % modulo : 0;
};

const guaranteedPhone = (index: number): string => `0700${pad(100000 + index, 6)}`.slice(0, 10);

const buildGuardianForStudent = (student: SeedRecord, index: number): SeedRecord => {
  const studentId = String(student.id ?? index);
  const lastName = String(student.last_name ?? 'Guardian').trim() || 'Guardian';
  const studentName = studentDisplayName(student);
  let firstName = GUARDIAN_FIRST_NAMES[stableIndex(studentId, GUARDIAN_FIRST_NAMES.length)];

  if (`${firstName} ${lastName}`.trim().toLowerCase() === studentName) {
    firstName = GUARDIAN_FIRST_NAMES[(stableIndex(studentId, GUARDIAN_FIRST_NAMES.length) + 1) % GUARDIAN_FIRST_NAMES.length];
  }

  const relationshipType = MALE_GUARDIAN_NAMES.has(firstName) ? 'Father' : 'Mother';
  const localPart = `${firstName}.${lastName}`.toLowerCase().replace(/[^a-z0-9.]+/g, '.');

  return record(`PG_DEMO_${studentId}`, {
    name: `${firstName} ${lastName}`,
    phone: guaranteedPhone(index),
    email: `${localPart}@example.com`,
    relationship_type: relationshipType
  });
};

const embeddedGuardianIsUsable = (student: SeedRecord, guardian: SeedRecord | null | undefined): boolean => {
  if (!guardian || typeof guardian !== 'object') {
    return false;
  }

  const guardianId = guardian.id == null ? '' : String(guardian.id);
  const guardianName = typeof guardian.name === 'string' ? normaliseName(guardian.name) : '';

  if (!guardianId || !guardianName) {
    return false;
  }

  if (guardianId === String(student.id ?? '')) {
    return false;
  }

  return guardianName !== studentDisplayName(student);
};

const guardianFromEmbedded = (guardian: SeedRecord, index: number): SeedRecord =>
  record(String(guardian.id), {
    name: String(guardian.name).trim(),
    phone: typeof guardian.phone === 'string' && guardian.phone.trim() ? guardian.phone.trim() : guaranteedPhone(index),
    email: typeof guardian.email === 'string' && guardian.email.trim() ? guardian.email.trim() : null,
    relationship_type: typeof guardian.relationship_type === 'string' ? guardian.relationship_type : 'Guardian'
  });

/**
 * Ensures every student has at least one guardian who is a distinct person, linked
 * through student_guardian_relationships. Existing reusable guardian rows are kept,
 * so one guardian can remain the parent of several children.
 */
export const repairStudentGuardianLinks = (input: GuardianRepairInput): GuardianRepairResult => {
  const guardiansById = new Map<string, SeedRecord>();
  input.guardians.forEach((guardian, index) => {
    const id = guardian.id == null ? `PG_EXISTING_${index + 1}` : String(guardian.id);
    if (!guardiansById.has(id)) {
      guardiansById.set(id, { ...guardian, id });
    }
  });

  const relationships: SeedRecord[] = [];
  const linkedStudents = new Set<string>();

  input.relationships.forEach((relationship, index) => {
    const studentId = relationship.student_id == null ? '' : String(relationship.student_id);
    const guardianId = relationship.guardian_id == null ? '' : String(relationship.guardian_id);
    if (!studentId || !guardianId || studentId === guardianId || !guardiansById.has(guardianId)) {
      return;
    }

    relationships.push(
      record(
        relationship.id == null ? `SGR_EXISTING_${index + 1}` : String(relationship.id),
        {
          student_id: studentId,
          guardian_id: guardianId,
          is_primary: Boolean(relationship.is_primary ?? relationship.is_primary_contact),
          relationship_type: String(relationship.relationship_type ?? 'Guardian'),
          can_pickup: Boolean(relationship.can_pickup ?? false),
          receives_communication: Boolean(relationship.receives_communication ?? true)
        }
      )
    );
    linkedStudents.add(studentId);
  });

  input.students.forEach((student, index) => {
    const studentId = String(student.id ?? '');
    if (!studentId) {
      return;
    }

    const embedded = student.primary_guardian as SeedRecord | undefined;
    let guardian: SeedRecord | null = null;

    if (embeddedGuardianIsUsable(student, embedded)) {
      const embeddedId = String(embedded!.id);
      guardian = guardiansById.get(embeddedId) ?? guardianFromEmbedded(embedded!, index);
      guardiansById.set(embeddedId, guardian);
    }

    if (!guardian) {
      const fallback = buildGuardianForStudent(student, index);
      const fallbackId = String(fallback.id);
      guardian = guardiansById.get(fallbackId) ?? fallback;
      guardiansById.set(fallbackId, guardian);
    }

    student.primary_guardian = {
      id: String(guardian.id),
      name: String(guardian.name),
      phone: String(guardian.phone),
      email: guardian.email ?? null,
      relationship_type: guardian.relationship_type ?? 'Guardian',
      created_at: guardian.created_at,
      updated_at: guardian.updated_at
    };

    if (!linkedStudents.has(studentId)) {
      const guardianId = String(guardian.id);
      if (guardianId === studentId) {
        return;
      }

      relationships.push(
        record(`SGR_DEMO_${studentId}`, {
          student_id: studentId,
          guardian_id: guardianId,
          is_primary: true,
          relationship_type: String(guardian.relationship_type ?? 'Guardian'),
          can_pickup: true,
          receives_communication: true
        })
      );
      linkedStudents.add(studentId);
    }
  });

  return {
    guardians: Array.from(guardiansById.values()),
    relationships
  };
};

const normaliseLabel = (value: unknown): string =>
  typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').toLowerCase() : '';

const trailingOrdinal = (value: string): number | null => {
  const match = /(\d+)$/.exec(value);
  if (!match) {
    return null;
  }
  const ordinal = Number(match[1]);
  return Number.isSafeInteger(ordinal) && ordinal > 0 ? ordinal : null;
};

const parentDisplayText = (row: SeedRecord): string => {
  const candidates = [row.display_name, row.name, row.title];
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate.trim();
    }
  }
  return `${row.first_name ?? ''} ${row.last_name ?? ''}`.trim();
};

const parentLabel = (row: SeedRecord): string => {
  // Accounts carry a role suffix ("Jim Halpert (Student)"); the person a loan or
  // wallet names is "Jim Halpert".
  const withoutRole = parentDisplayText(row).replace(/\s*\([^)]*\)\s*$/, '').trim();
  return normaliseName(withoutRole);
};

interface ParentIndex {
  rows: SeedRecord[];
  ids: Set<string>;
  byId: Map<string, SeedRecord>;
  byLabel: Map<string, SeedRecord>;
  byOrdinal: Map<number, SeedRecord>;
}

const buildParentIndex = (rows: SeedRecord[]): ParentIndex => {
  const index: ParentIndex = { rows, ids: new Set(), byId: new Map(), byLabel: new Map(), byOrdinal: new Map() };

  rows.forEach((row, position) => {
    if (row?.id == null) {
      return;
    }
    const id = String(row.id);
    index.ids.add(id);
    if (!index.byId.has(id)) {
      index.byId.set(id, row);
    }

    const label = parentLabel(row);
    if (label && !index.byLabel.has(label)) {
      index.byLabel.set(label, row);
    }

    // Legacy mock ids number rows from 1: student `1` is `S001`, session `2` is
    // `ES002`, template `tpl-003` is the third template. The numeric suffix wins
    // over array position so sampling cannot change what `1` means.
    const ordinal = trailingOrdinal(id);
    if (ordinal != null && !index.byOrdinal.has(ordinal)) {
      index.byOrdinal.set(ordinal, row);
    }
    if (!index.byOrdinal.has(position + 1)) {
      index.byOrdinal.set(position + 1, row);
    }
  });

  return index;
};

/**
 * Chooses the parent row that a reference should point at in a sampled volume.
 * Prefers the same row when it survived sampling, then the same ordinal, then
 * the same label; falls back to the first sampled row so the child stays closed
 * instead of dangling. Returns undefined only when the parent collection is empty.
 */
const pickSampledParent = (
  sampled: ParentIndex,
  candidate: SeedRecord,
  ordinal: number | null
): SeedRecord | undefined => {
  if (sampled.ids.has(String(candidate.id))) {
    return candidate;
  }
  if (ordinal != null) {
    const byOrdinal = sampled.byOrdinal.get(ordinal);
    if (byOrdinal) {
      return byOrdinal;
    }
  }
  const label = parentLabel(candidate);
  const byLabel = label ? sampled.byLabel.get(label) : undefined;
  return byLabel ?? sampled.rows[0];
};

export interface SeedForeignKeyRepairOptions {
  /** Leave unresolved values in place instead of dropping their row (used by the full-data pre-pass). */
  dropUnresolved?: boolean;
}

/**
 * Resolves every non-null schema-declared foreign key against the collections
 * that will actually be seeded. Legacy ids are rewritten to the canonical
 * seeded id of the parent: a denormalised label match wins ("Jim Halpert"),
 * then the legacy 1-based numeric suffix (`1` -> `S001`, `STU003` -> `S003`,
 * `tpl-001` -> template 1).
 *
 * `completeRowsByCollection` is the unsampled seed. It resolves legacy ids and
 * decides whether a key names a parent that exists at all. When the canonical
 * parent was sampled out, the reference is pointed at the matching sampled row
 * (same label, then same ordinal, then the first sampled row) so no FK dangles
 * at tiny/small volumes. A key absent from the complete set is genuinely
 * dangling and its row is dropped unless `dropUnresolved` is false.
 */
export const repairSeedForeignKeys = (
  rowsByCollection: Map<string, SeedRecord[]>,
  references: readonly SeedForeignKeyReference[],
  completeRowsByCollection: Map<string, SeedRecord[]> = new Map(),
  options: SeedForeignKeyRepairOptions = {}
): SeedForeignKeyRepairReport => {
  const dropUnresolved = options.dropUnresolved !== false;
  const sampledCache = new Map<string, ParentIndex>();
  const completeCache = new Map<string, ParentIndex>();

  const sampledIndex = (collectionName: string): ParentIndex => {
    const cached = sampledCache.get(collectionName);
    if (cached) {
      return cached;
    }
    const built = buildParentIndex(rowsByCollection.get(collectionName) ?? []);
    sampledCache.set(collectionName, built);
    return built;
  };

  const completeIndex = (collectionName: string): ParentIndex => {
    const cached = completeCache.get(collectionName);
    if (cached) {
      return cached;
    }
    const built = buildParentIndex(
      completeRowsByCollection.get(collectionName) ?? rowsByCollection.get(collectionName) ?? []
    );
    completeCache.set(collectionName, built);
    return built;
  };

  const report: SeedForeignKeyRepairReport = { remapped: 0, dropped: [] };

  for (const { child, column, parent } of references) {
    // Module-filtered seeds only carry the collections they selected plus the
    // parents their relationship definitions pull in. A parent outside the seed
    // cannot be resolved here; leave the value untouched rather than deleting
    // rows the selected modules still need.
    if (!rowsByCollection.has(parent)) {
      continue;
    }

    const childRows = rowsByCollection.get(child);
    if (!childRows || childRows.length === 0) {
      continue;
    }

    const sampled = sampledIndex(parent);
    const complete = completeIndex(parent);
    const labelColumn = `${column.replace(/_id$/, '')}_name`;
    const kept: SeedRecord[] = [];

    for (const row of childRows) {
      const rawValue = row?.[column];
      if (rawValue === null || rawValue === undefined || rawValue === '') {
        kept.push(row);
        continue;
      }

      const value = String(rawValue);
      if (sampled.ids.has(value)) {
        kept.push(row);
        continue;
      }

      const ordinal = trailingOrdinal(value);
      const exactCompleteParent = complete.byId.get(value);

      let parentRow: SeedRecord | undefined;
      if (exactCompleteParent) {
        // The parent exists in the full school but this volume's sample dropped
        // it. Keep the FK closed by pointing at the sampled row that matches
        // the canonical parent: same label, then same ordinal, else first.
        parentRow = pickSampledParent(sampled, exactCompleteParent, ordinal);
      } else {
        const label = normaliseLabel(row?.[labelColumn]);
        const namedParent = (label && (sampled.byLabel.get(label) ?? complete.byLabel.get(label))) || undefined;
        const ordinalParent = ordinal == null
          ? undefined
          : sampled.byOrdinal.get(ordinal) ?? complete.byOrdinal.get(ordinal);
        const candidate = namedParent ?? ordinalParent;
        parentRow = candidate ? pickSampledParent(sampled, candidate, ordinal) : undefined;
      }

      if (!parentRow || parentRow.id == null) {
        // The full pre-pass leaves unresolved values for the later repairs
        // (departments, templates) to satisfy; the volume pass drops them.
        if (!dropUnresolved) {
          kept.push(row);
          continue;
        }
        report.dropped.push({
          collection: child,
          id: String(row.id ?? row.student_id ?? ''),
          column,
          value
        });
        continue;
      }

      row[column] = String(parentRow.id);

      // Keep the denormalised label describing the same parent row. User names
      // stay as the person's name rather than the account's role-suffixed name.
      if (parent !== 'users' && labelColumn in row) {
        const display = parentDisplayText(parentRow);
        if (display) {
          row[labelColumn] = display;
        }
      }

      report.remapped++;
      kept.push(row);
    }

    if (kept.length !== childRows.length) {
      rowsByCollection.set(child, kept);
    }
  }

  return report;
};

/**
 * Communication templates are seeded from the `templateComms` export, while the
 * auto-SMS rules and message campaigns reference templates that were never
 * defined. Reuse a template with the same name where one exists, otherwise add
 * the missing template from the referencing row's own id and name.
 */
export const repairCommunicationTemplateLinks = (
  templates: SeedRecord[],
  autoSmsSettings: SeedRecord[],
  campaigns: SeedRecord[]
): SeedRecord[] => {
  const repaired = [...templates];
  const byId = new Map<string, SeedRecord>();
  const byName = new Map<string, SeedRecord>();

  const remember = (template: SeedRecord): void => {
    if (template?.id != null) {
      byId.set(String(template.id), template);
    }
    const name = typeof template?.name === 'string' ? normaliseName(template.name) : '';
    if (name && !byName.has(name)) {
      byName.set(name, template);
    }
  };

  repaired.forEach(remember);

  const ensureTemplate = (row: SeedRecord, idKey: string, nameKey: string): void => {
    const rawId = row?.[idKey];
    if (rawId === null || rawId === undefined || rawId === '') {
      return;
    }

    const id = String(rawId);
    if (byId.has(id)) {
      return;
    }

    const name = typeof row?.[nameKey] === 'string' ? row[nameKey].trim() : '';
    const namedTemplate = name ? byName.get(normaliseName(name)) : undefined;
    if (namedTemplate) {
      row[idKey] = String(namedTemplate.id);
      return;
    }

    const created = record(id, {
      name: name || `Template ${id}`,
      type: 'SMS',
      subject: name || 'Notification',
      body_template: name ? `${name}: {{message}}` : '{{message}}'
    });
    repaired.push(created);
    remember(created);
  };

  autoSmsSettings.forEach((setting) => ensureTemplate(setting, 'template_id', 'template_name'));
  campaigns.forEach((campaign) => ensureTemplate(campaign, 'template_id', 'template_name'));

  return repaired;
};
