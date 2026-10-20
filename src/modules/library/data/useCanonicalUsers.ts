// ABOUTME: The canonical users the library pages borrow against: users with their person's name resolved.
// ABOUTME: The canonical user row carries no name, so the staff or learner behind it is read too.

import { useMemo } from 'react';

import { useEntityQuery, useLookup } from '@/data/query';
import type { RepositoryRow } from '@/data/repository';

import { useCanonicalRepository } from './canonicalRepository';

type UserRow = RepositoryRow<'user'>;
type StaffRow = RepositoryRow<'staff'>;
type LearnerRow = RepositoryRow<'learner'>;

/** The kind of person behind a user account, as the library pages name it. */
export type CanonicalUserType = 'Student' | 'Staff' | 'Guardian' | 'User';

/** A canonical user, shaped the way the library pages read a borrower. */
export interface CanonicalUser {
  readonly id: string;
  readonly username: string;
  readonly display_name: string;
  readonly userType: CanonicalUserType;
  readonly isActive: boolean;
}

function staffName(row: StaffRow): string {
  return `${row.preferred_name ?? row.given_name} ${row.family_name}`.trim();
}

function learnerName(row: LearnerRow): string {
  return `${row.preferred_name ?? row.given_name} ${row.family_name}`.trim();
}

/** The name of the person behind a user, or the username when there is none. */
export function canonicalUserName(
  row: UserRow,
  staffById: ReadonlyMap<string, StaffRow>,
  learnerById: ReadonlyMap<string, LearnerRow>
): string {
  const reference = row.person_ref;
  if (!reference) return row.username;
  if (reference.type === 'staff') {
    const staff = staffById.get(reference.id);
    return staff ? staffName(staff) : row.username;
  }
  if (reference.type === 'learner') {
    const learner = learnerById.get(reference.id);
    return learner ? learnerName(learner) : row.username;
  }
  return row.username;
}

/** The canonical users of the institution, with the person behind each resolved. */
export function useCanonicalUsers() {
  const repository = useCanonicalRepository();
  const usersQuery = useEntityQuery(repository, 'user');
  const staffQuery = useEntityQuery(repository, 'staff');
  const learnerQuery = useEntityQuery(repository, 'learner');

  const staffById = useMemo(
    () => new Map((staffQuery.data?.items ?? []).map((row) => [row.id, row] as const)),
    [staffQuery.data]
  );
  const learnerById = useMemo(
    () => new Map((learnerQuery.data?.items ?? []).map((row) => [row.id, row] as const)),
    [learnerQuery.data]
  );

  const users = useMemo<CanonicalUser[]>(
    () =>
      (usersQuery.data?.items ?? []).map((row) => ({
        id: row.id,
        username: row.username,
        display_name: canonicalUserName(row, staffById, learnerById),
        userType:
          row.person_ref?.type === 'staff'
            ? 'Staff'
            : row.person_ref?.type === 'learner'
              ? 'Student'
              : row.person_ref?.type === 'guardian'
                ? 'Guardian'
                : 'User',
        isActive: row.status === 'active',
      })),
    [usersQuery.data, staffById, learnerById]
  );

  const usersLookup = useLookup(repository, 'user', {
    label: (row) => canonicalUserName(row, staffById, learnerById),
  });

  return {
    users,
    usersLookup,
    status: usersQuery.status,
    isLoading: usersQuery.status === 'loading',
    error: usersQuery.error,
  };
}
