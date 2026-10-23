// ABOUTME: The canonical identity a login acts as: the `user` row a canonical write names, and the
// ABOUTME: `staff` row a teaching scope resolves, both created from the login the platform stores.
// ABOUTME: The login lives in the legacy `users` collection and its id is a UUIDv4, which the canonical
// ABOUTME: model cannot store; the canonical rows are the identity the canonical tables can reference.

import type { Repository, RepositoryRow } from '@/data/repository';
import { asId } from '@/domain/ids';

/** What the platform knows about a login when its canonical identity is created. */
export interface CanonicalLoginInput {
  readonly username: string;
  /** The person's name, as the login records it. */
  readonly displayName: string;
  /** The login's stored password hash, carried onto the canonical row; never a plaintext password. */
  readonly passwordHash: string;
}

/** The canonical rows a login acts as. */
export interface CanonicalLoginLink {
  readonly userId: string;
  readonly staffId: string;
}

/** The employee number a login-derived staff record carries; unique per institution, like the username. */
export function loginEmployeeNumber(username: string): string {
  return `LOGIN/${username.trim()}`.slice(0, 64);
}

/** A display name split into the given and family names the person schema requires. */
function namesOf(displayName: string, fallback: string): { given: string; family: string } {
  const parts = displayName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { given: fallback, family: fallback };
  return { given: parts[0], family: parts.slice(1).join(' ') || parts[0] };
}

/**
 * Ensures the canonical `user` row a login acts as.
 *
 * The username links the login to the canonical user, which is how the app resolves the actor a page
 * writes under. The row is created once per institution; an existing row is returned unchanged.
 */
export async function ensureCanonicalUser(
  repository: Repository,
  input: { readonly username: string; readonly passwordHash: string }
): Promise<RepositoryRow<'user'> | null> {
  const username = input.username.trim();
  if (!username) return null;

  const institution = (await repository.list('institution', { limit: 1 })).items[0];
  if (!institution) return null;

  const existing = (
    await repository.list('user', { where: { institution_id: institution.id, username }, limit: 1 })
  ).items[0];
  if (existing) return existing;

  return repository.create('user', {
    institution_id: asId<'institution'>(institution.id),
    username,
    password_hash: input.passwordHash.trim() || 'external-login',
    status: 'active',
    mfa: false,
  });
}

/**
 * Ensures the staff record of a login, linked the way the schema intends.
 *
 * The link is `staff.user_id -> user`, and the canonical user carries `person_ref` back to the
 * staff row. A staff record already linked to the user is reused, and a staff record carrying the
 * login's employee number is linked rather than duplicated, so re-running is idempotent.
 */
async function ensureStaffForLogin(
  repository: Repository,
  input: {
    readonly institutionId: string;
    readonly username: string;
    readonly displayName: string;
    readonly userId: string;
  }
): Promise<RepositoryRow<'staff'>> {
  const linked = await repository.list('staff', {
    where: { institution_id: input.institutionId, user_id: asId<'user'>(input.userId) },
    limit: 1,
  });
  if (linked.items[0]) return linked.items[0];

  const employeeNumber = loginEmployeeNumber(input.username);
  const byNumber = await repository.list('staff', {
    where: { institution_id: input.institutionId, employee_number: employeeNumber },
    limit: 1,
  });
  const existing = byNumber.items[0];
  if (existing && existing.user_id === undefined) {
    return repository.update(
      'staff',
      existing.id,
      { user_id: asId<'user'>(input.userId) },
      { expectedVersion: existing.rowVersion }
    );
  }
  if (existing) return existing;

  const { given, family } = namesOf(input.displayName, input.username);
  return repository.create('staff', {
    institution_id: asId<'institution'>(input.institutionId),
    given_name: given.slice(0, 100),
    family_name: family.slice(0, 100),
    name_order: 'given_first',
    gender: 'not_stated',
    employee_number: employeeNumber,
    employment_type: 'permanent',
    department_ids: [],
    start_date: new Date().toISOString().slice(0, 10),
    user_id: asId<'user'>(input.userId),
  });
}

/** Points the canonical user at the person row it belongs to, when it does not already. */
export async function linkCanonicalPersonRef(
  repository: Repository,
  input: { readonly userId: string; readonly staffId: string }
): Promise<void> {
  const user = await repository.get('user', asId<'user'>(input.userId));
  if (!user) return;
  if (user.person_ref?.type === 'staff' && user.person_ref.id === input.staffId) return;
  await repository.update(
    'user',
    user.id,
    { person_ref: { type: 'staff', id: asId<'staff'>(input.staffId) } },
    { expectedVersion: user.rowVersion }
  );
}

/**
 * Ensures the canonical `user` and `staff` rows a login acts as, and links them.
 *
 * Returns null when the school has no institution yet, so a caller never creates a canonical
 * identity with nothing to belong to. This is the administrator's path: a login that is also a
 * member of staff gets both rows, linked both ways. A login that is not staff (a learner's or a
 * guardian's) gets only the canonical user, through {@link ensureCanonicalUser}.
 */
export async function ensureCanonicalLogin(
  repository: Repository,
  input: CanonicalLoginInput
): Promise<CanonicalLoginLink | null> {
  const user = await ensureCanonicalUser(repository, input);
  if (!user) return null;

  const staff = await ensureStaffForLogin(repository, {
    institutionId: user.institution_id,
    username: input.username,
    displayName: input.displayName,
    userId: user.id,
  });
  await linkCanonicalPersonRef(repository, { userId: user.id, staffId: staff.id });

  return { userId: user.id, staffId: staff.id };
}
