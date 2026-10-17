// ABOUTME: Read-only hook for the school profile: the single school_details record, live-updating after saves.
// ABOUTME: Used by the header, receipts and report headers; also formats address and contact lines.

import { useDatabaseDocument } from '@/hooks/useDatabaseDocument';
import type { SchoolDetails } from '@/types';

/** A school_details row as stored (string id); every field but the name may be missing. */
export type SchoolProfile = Partial<Omit<SchoolDetails, 'id'>> & { id?: string; name?: string };

export interface UseSchoolProfileResult {
  profile: SchoolProfile | null;
  /** The saved school name, or null when no profile (or an empty name) is saved. */
  schoolName: string | null;
  loading: boolean;
}

export function useSchoolProfile(): UseSchoolProfileResult {
  const { data, loading } = useDatabaseDocument<SchoolProfile>('school_details');
  const schoolName = data?.name?.trim() ? data.name.trim() : null;
  return { profile: data, schoolName, loading };
}

const joinParts = (parts: Array<string | null | undefined>, separator: string) =>
  parts.map((p) => (p ?? '').trim()).filter(Boolean).join(separator);

/** "P.O. Box 1, Nairobi" from postal address (or address) and town. */
export function formatSchoolAddress(profile: SchoolProfile | null | undefined): string {
  if (!profile) return '';
  return joinParts([profile.postal_address || profile.address, profile.town], ', ');
}

/** "0700 | info@school.ke" from telephone (or phone) and email. */
export function formatSchoolContact(profile: SchoolProfile | null | undefined): string {
  if (!profile) return '';
  return joinParts([profile.telephone || profile.phone, profile.email], ' | ');
}
