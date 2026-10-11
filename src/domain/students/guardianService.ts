// ABOUTME: Persists a learner's primary guardian as a parents_guardians row plus a student_guardian_relationships row.
// ABOUTME: Also resolves the primary guardian of each learner at read time (relationship first, legacy embedded copy last).

/** A guardian as stored in the `parents_guardians` collection. */
export interface GuardianRecord {
  id: string;
  name: string;
  phone: string;
  relationship_type?: string | null;
  deleted_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

/** A link between a learner and a guardian in `student_guardian_relationships`. */
export interface GuardianRelationshipRecord {
  id: string;
  student_id: string;
  guardian_id: string;
  relationship_type: string;
  is_primary?: boolean | null;
  /** Legacy flag used by older seed data; read, never written. */
  is_primary_contact?: boolean | string | number | null;
  can_pickup?: boolean;
  receives_communication?: boolean;
  created_at?: string;
  updated_at?: string;
}

/** Guardian details captured by the student form. */
export interface GuardianInput {
  /** Existing guardian id when editing; omitted for a new guardian. */
  id?: string;
  name: string;
  phone?: string;
  relationship_type: string;
}

/** Minimal write port over a collection (matches useDatabaseCollection's insert/update). */
export interface WritableCollection<T> {
  insert(doc: T): Promise<unknown>;
  update(id: string, patch: Partial<T>): Promise<unknown>;
}

export interface GuardianStore {
  guardians: WritableCollection<GuardianRecord>;
  relationships: WritableCollection<GuardianRelationshipRecord>;
  /** Current relationship rows (used to update an existing primary link instead of duplicating it). */
  existingRelationships: readonly GuardianRelationshipRecord[];
}

export interface SaveGuardianOptions {
  now?: () => string;
  newId?: () => string;
}

export interface SavedGuardian {
  guardianId: string;
  relationshipId: string;
}

const defaultNow = () => new Date().toISOString();
const defaultNewId = () => crypto.randomUUID();

const isPrimaryRelationship = (rel: GuardianRelationshipRecord): boolean => {
  if (rel.is_primary === true) return true;
  const legacy = rel.is_primary_contact;
  return legacy === true || legacy === 'true' || legacy === 1;
};

/** The learner's primary relationship; falls back to their first relationship when none is flagged primary. */
export function findPrimaryRelationship(
  studentId: string,
  relationships: readonly GuardianRelationshipRecord[],
): GuardianRelationshipRecord | undefined {
  const own = relationships.filter((rel) => String(rel.student_id) === String(studentId));
  return own.find(isPrimaryRelationship) ?? own[0];
}

/**
 * Creates or updates the learner's primary guardian and the relationship that links them.
 * Returns null (and writes nothing) when no guardian name was entered.
 */
export async function saveStudentGuardian(
  store: GuardianStore,
  studentId: string,
  input: GuardianInput | undefined,
  options: SaveGuardianOptions = {},
): Promise<SavedGuardian | null> {
  const name = input?.name?.trim();
  if (!input || !name) return null;
  if (!studentId) throw new Error('Cannot save a guardian without a student id');

  const now = (options.now ?? defaultNow)();
  const newId = options.newId ?? defaultNewId;
  const relationshipType = input.relationship_type || 'Guardian';
  const guardianFields = { name, phone: input.phone?.trim() ?? '', relationship_type: relationshipType };

  let guardianId = input.id;
  if (guardianId) {
    await store.guardians.update(guardianId, { ...guardianFields, updated_at: now });
  } else {
    guardianId = newId();
    await store.guardians.insert({ id: guardianId, ...guardianFields, created_at: now, updated_at: now });
  }

  const existing = findPrimaryRelationship(studentId, store.existingRelationships);
  if (existing) {
    await store.relationships.update(existing.id, {
      guardian_id: guardianId,
      relationship_type: relationshipType,
      is_primary: true,
      updated_at: now,
    });
    return { guardianId, relationshipId: existing.id };
  }

  const relationshipId = newId();
  await store.relationships.insert({
    id: relationshipId,
    student_id: studentId,
    guardian_id: guardianId,
    relationship_type: relationshipType,
    is_primary: true,
    can_pickup: true,
    receives_communication: true,
    created_at: now,
    updated_at: now,
  });
  return { guardianId, relationshipId };
}

export interface ResolvedGuardian {
  id: string;
  name: string;
  phone: string;
  relationship_type: string;
}

/** Legacy shape: seed learners carry an embedded copy of their guardian. */
interface LegacyGuardianCarrier {
  id: string;
  primary_guardian?: { id?: string; name?: string | null; phone?: string | null; relationship_type?: string | null } | null;
}

/**
 * Primary guardian of a learner resolved from live rows. The relationship rows are the source of truth;
 * the embedded `primary_guardian` copy is used only for older records that have no relationship row.
 */
export function resolvePrimaryGuardian(
  student: LegacyGuardianCarrier,
  relationships: readonly GuardianRelationshipRecord[],
  guardiansById: ReadonlyMap<string, GuardianRecord>,
): ResolvedGuardian | null {
  const rel = findPrimaryRelationship(student.id, relationships);
  const guardian = rel ? guardiansById.get(String(rel.guardian_id)) : undefined;
  if (rel && guardian && !guardian.deleted_at) {
    return {
      id: String(guardian.id),
      name: guardian.name ?? '',
      phone: guardian.phone ?? '',
      relationship_type: rel.relationship_type || guardian.relationship_type || 'Guardian',
    };
  }
  const legacy = student.primary_guardian;
  if (legacy?.name) {
    return {
      // Only reuse the legacy id when that guardian row really exists; otherwise Edit creates a new row.
      id: legacy.id && guardiansById.has(String(legacy.id)) ? String(legacy.id) : '',
      name: legacy.name,
      phone: legacy.phone ?? '',
      relationship_type: legacy.relationship_type || 'Guardian',
    };
  }
  return null;
}
