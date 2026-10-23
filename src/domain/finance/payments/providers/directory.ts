// ABOUTME: The learner directory the provider intake resolves a payer's account reference against:
// ABOUTME: the canonical learner's admission number, which is what a payer quotes to a paybill and
// ABOUTME: what spec 05 §5.1 calls the account reference auto-match reads.

import type { PaymentsStore } from '../types';
import type { LearnerDirectory } from './intake';

/**
 * A directory over the canonical repository.
 *
 * The reference a payer quotes is an admission number, and the learner table holds one per
 * institution, so the lookup is a single indexed read. A reference nobody holds returns null, which
 * the intake turns into suspense rather than an error.
 */
export function createStoreLearnerDirectory(store: PaymentsStore): LearnerDirectory {
  return {
    async findLearnerByAdmissionNumber(
      institutionId: string,
      reference: string
    ): Promise<string | null> {
      const page = await store.list('learner', {
        where: { institution_id: institutionId, admission_number: reference },
        limit: 1,
      });
      return page.items[0]?.id ?? null;
    },
  };
}

/** A directory over a fixed map: the double a test or a caller without a repository uses. */
export function createMapLearnerDirectory(
  byAdmissionNumber: Readonly<Record<string, string>>
): LearnerDirectory {
  return {
    async findLearnerByAdmissionNumber(
      _institutionId: string,
      reference: string
    ): Promise<string | null> {
      return byAdmissionNumber[reference] ?? null;
    },
  };
}
