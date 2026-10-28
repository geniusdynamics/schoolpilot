// ABOUTME: Resolves the signed-in login to the learner records the portal may read, and refuses every
// ABOUTME: read outside that scope. The rule lives here so a page cannot widen it by asking nicely.

/** One learner as the portal shows them: the record the scope names, named for a guardian. */
export interface PortalLearner {
  readonly id: string;
  readonly name: string;
  readonly admissionNumber: string;
  readonly className: string | null;
}

/** What the login is: a learner reading their own record, or a guardian reading linked children. */
export type PortalRole = 'learner' | 'guardian';

/**
 * Who the portal viewer is.
 *
 * `learners` is the whole of what the viewer may read. A page that needs a learner asks this scope
 * for it; there is no second path to a learner record in the portal.
 */
export interface PortalIdentity {
  readonly status: 'loading' | 'unlinked' | 'linked';
  readonly role: PortalRole | null;
  readonly learners: readonly PortalLearner[];
  /** The guardian's own name, when the viewer is a guardian. */
  readonly guardianName: string | null;
}

/** Why a read was refused. */
export class PortalAccessError extends Error {
  readonly code: 'not-linked';
  readonly learnerId: string;

  constructor(learnerId: string) {
    super(`This account is not linked to learner ${learnerId}, so the portal cannot show that record.`);
    this.name = 'PortalAccessError';
    this.code = 'not-linked';
    this.learnerId = learnerId;
  }
}

/** The fields of a canonical `user` row the portal resolves an account through. */
export interface PortalAccount {
  readonly id: string;
  readonly username: string;
  readonly person_ref?: {
    readonly type: 'learner' | 'guardian' | 'staff';
    readonly id: string;
  };
}

export interface LearnerSource {
  readonly id: string;
  readonly admission_number: string;
  readonly given_name: string;
  readonly preferred_name?: string;
  readonly family_name: string;
  readonly deleted_at?: string | null;
}

export interface EnrolmentSource {
  readonly id: string;
  readonly learner_id: string;
  readonly class_group_id: string;
  readonly status: string;
}

export interface ClassGroupSource {
  readonly id: string;
  readonly name: string;
  readonly stream?: string | null;
}

export interface GuardianSource {
  readonly id: string;
  readonly given_name: string;
  readonly family_name: string;
  readonly deleted_at?: string | null;
}

export interface LearnerGuardianSource {
  readonly id: string;
  readonly learner_id: string;
  readonly guardian_id: string;
  readonly deleted_at?: string | null;
}

/** Everything the identity is resolved from. */
export interface PortalIdentityInput {
  /** `loading` until the login and the canonical rows have arrived. */
  readonly status: 'loading' | 'ready';
  /** The login's own id, used only to tell two sessions apart. */
  readonly loginUserId: string;
  /** The canonical `user` row the login resolves to, or null when the school has none. */
  readonly canonicalUser: PortalAccount | null;
  readonly learners: readonly LearnerSource[];
  readonly enrolments: readonly EnrolmentSource[];
  readonly classGroups: readonly ClassGroupSource[];
  readonly guardians: readonly GuardianSource[];
  readonly learnerGuardians: readonly LearnerGuardianSource[];
}

const live = (row: { readonly deleted_at?: string | null }): boolean =>
  row.deleted_at === undefined || row.deleted_at === null;

const learnerName = (learner: LearnerSource): string =>
  `${learner.preferred_name ?? learner.given_name} ${learner.family_name}`.trim();

/**
 * The learners each learner row's current class group names.
 *
 * Only the enrolment in force is used: a learner with an active enrolment shows that class group,
 * and a learner with none shows no class rather than a past one.
 */
function currentClassGroups(
  enrolments: readonly EnrolmentSource[],
  classGroups: readonly ClassGroupSource[]
): Map<string, string> {
  const groupById = new Map(classGroups.map((group) => [group.id, group]));
  const byLearner = new Map<string, string>();
  for (const enrolment of enrolments) {
    if (enrolment.status !== 'active' && enrolment.status !== 'repeating') continue;
    const group = groupById.get(enrolment.class_group_id);
    if (!group) continue;
    if (byLearner.has(enrolment.learner_id)) continue;
    byLearner.set(enrolment.learner_id, `${group.name} ${group.stream ?? ''}`.trim());
  }
  return byLearner;
}

function toLearner(
  learner: LearnerSource,
  classGroups: ReadonlyMap<string, string>
): PortalLearner {
  return {
    id: learner.id,
    name: learnerName(learner),
    admissionNumber: learner.admission_number,
    className: classGroups.get(learner.id) ?? null,
  };
}

/**
 * Who this login is, and which learners it may read.
 *
 * The link is the canonical `user.person_ref`: a learner account names its own learner row, and a
 * guardian account names its guardian row, whose live `learner_guardian` links are the children.
 * An account with no person reference is not linked to anything, and the portal shows it the access
 * notice instead of guessing from a name, a phone number or the school's only learner.
 */
export function resolvePortalIdentity(input: PortalIdentityInput): PortalIdentity {
  if (input.status === 'loading') {
    return { status: 'loading', role: null, learners: [], guardianName: null };
  }

  const account = input.canonicalUser;
  const reference = account?.person_ref;
  if (!account || !reference) {
    return { status: 'unlinked', role: null, learners: [], guardianName: null };
  }

  const classGroups = currentClassGroups(input.enrolments, input.classGroups);
  const learnersById = new Map(
    input.learners.filter(live).map((learner) => [learner.id, learner])
  );

  if (reference.type === 'learner') {
    const learner = learnersById.get(reference.id);
    if (!learner) {
      return { status: 'unlinked', role: null, learners: [], guardianName: null };
    }
    return {
      status: 'linked',
      role: 'learner',
      learners: [toLearner(learner, classGroups)],
      guardianName: null,
    };
  }

  if (reference.type !== 'guardian') {
    return { status: 'unlinked', role: null, learners: [], guardianName: null };
  }

  const guardian = input.guardians.find((row) => row.id === reference.id && live(row));
  const children = input.learnerGuardians
    .filter((link) => link.guardian_id === reference.id && live(link))
    .map((link) => learnersById.get(link.learner_id))
    .filter((learner): learner is LearnerSource => learner !== undefined);

  if (children.length === 0) {
    return { status: 'unlinked', role: null, learners: [], guardianName: null };
  }

  return {
    status: 'linked',
    role: 'guardian',
    learners: children.map((learner) => toLearner(learner, classGroups)),
    guardianName: guardian ? `${guardian.given_name} ${guardian.family_name}`.trim() : null,
  };
}

/**
 * The guard every portal read calls first.
 *
 * A learner's own id is the only id a learner account holds; a guardian holds the ids of the
 * children its live links name. Anything else is refused here, before a row is looked at.
 */
export function assertLearnerAccess(identity: PortalIdentity, learnerId: string): void {
  if (identity.status !== 'linked') throw new PortalAccessError(learnerId);
  if (!identity.learners.some((learner) => learner.id === learnerId)) {
    throw new PortalAccessError(learnerId);
  }
}
