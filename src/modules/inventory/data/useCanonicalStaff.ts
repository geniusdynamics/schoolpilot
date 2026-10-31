// ABOUTME: The canonical staff the inventory pages pick from: a lookup the picker binds to and a name resolver.
// ABOUTME: Names are resolved from the canonical row; ids stay opaque strings.

import { useMemo } from 'react';

import { useEntityQuery, useLookup } from '@/data/query';
import type { RepositoryRow } from '@/data/repository';
import { asId, type Id } from '@/domain/ids';

import { useCanonicalRepository } from './canonicalRepository';

type StaffRow = RepositoryRow<'staff'>;

/** The display name of a canonical staff member. */
export function canonicalStaffName(row: StaffRow): string {
  return `${row.preferred_name ?? row.given_name} ${row.family_name}`.trim();
}

/** The canonical staff of the institution, with the lookup a picker binds to. */
export function useCanonicalStaff() {
  const repository = useCanonicalRepository();
  const staffQuery = useEntityQuery(repository, 'staff', { limit: 500 });
  const staffLookup = useLookup(repository, 'staff', {});

  const staff = useMemo(
    () => (staffQuery.data?.items ?? []).map((row) => ({
      id: row.id,
      name: canonicalStaffName(row),
      employee_number: row.employee_number,
      is_active: !row.end_date,
    })),
    [staffQuery.data]
  );

  const nameOf = useMemo(
    () => (id: Id<'staff'> | string | null | undefined): string => {
      if (!id) return '';
      const row = staffLookup.resolve(asId<'staff'>(String(id)));
      return row ? canonicalStaffName(row) : '';
    },
    [staffLookup]
  );

  return {
    staff,
    staffLookup,
    nameOf,
    status: staffQuery.status,
    isLoading: staffQuery.status === 'loading',
    error: staffQuery.error,
  };
}
