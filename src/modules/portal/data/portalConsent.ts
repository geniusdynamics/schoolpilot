// ABOUTME: The consent preferences the schema records for a guardian's link to a learner: which
// ABOUTME: channels and reports they receive, read for the portal and written through the repository
// ABOUTME: with the version the reader saw, so a concurrent change is refused rather than overwritten.

import type { RepositoryRow, UpdateInput } from '@/data/repository';
import type { EntityName } from '@/domain/schema';
import { asId, type Id } from '@/domain/ids';
import { PREFERRED_CHANNELS } from '@/domain/schema';

import { assertLearnerAccess, type PortalIdentity } from './portalAccess';

/** One learner-guardian link with the fields the consent editor needs. */
export interface ConsentLink {
  readonly id: string;
  readonly learner_id: string;
  readonly guardian_id: string;
  readonly receives_reports: boolean;
  readonly receives_sms: boolean;
  readonly preferred_channel: string;
  readonly preferred_language?: string | null;
  readonly rowVersion: number;
  readonly deleted_at?: string | null;
}

/** One learner's consent preferences, as the guardian sees them. */
export interface PortalConsent {
  readonly linkId: string;
  readonly learnerId: string;
  readonly learnerName: string;
  readonly receivesReports: boolean;
  readonly receivesSms: boolean;
  readonly preferredChannel: string;
  readonly preferredLanguage: string | null;
}

/** What the guardian asks to change. */
export interface ConsentChange {
  readonly link: ConsentLink;
  readonly receivesReports: boolean;
  readonly receivesSms: boolean;
  readonly preferredChannel: string;
  readonly preferredLanguage: string;
  /** The canonical user making the change, recorded on the row's audit columns. */
  readonly actorId?: string;
}

/** The repository write the consent editor needs. */
export interface ConsentRepository {
  update<E extends EntityName>(
    entity: E,
    id: Id<E>,
    patch: UpdateInput<E>,
    options: { readonly expectedVersion: number; readonly actor?: string }
  ): Promise<RepositoryRow<E>>;
}

/** Why a consent change was refused before it reached the repository. */
export class PortalConsentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PortalConsentError';
  }
}

const isLive = (row: { readonly deleted_at?: string | null }): boolean =>
  row.deleted_at === undefined || row.deleted_at === null;

/** The preferences of each live link the guardian holds, in the order the links arrive. */
export function readConsents(
  identity: PortalIdentity,
  links: readonly ConsentLink[]
): readonly PortalConsent[] {
  return links
    .filter((link) => isLive(link))
    .filter((link) => identity.learners.some((learner) => learner.id === link.learner_id))
    .map((link) => {
      const learner = identity.learners.find((row) => row.id === link.learner_id);
      return {
        linkId: link.id,
        learnerId: link.learner_id,
        learnerName: learner?.name ?? '',
        receivesReports: link.receives_reports,
        receivesSms: link.receives_sms,
        preferredChannel: link.preferred_channel,
        preferredLanguage: link.preferred_language ?? null,
      } satisfies PortalConsent;
    });
}

/**
 * Persists one consent change.
 *
 * The link must belong to a learner the account may read, the channel must be one the schema's
 * `learner_guardian.preferred_channel` allows, and the language tag must fit its column. The write
 * carries the version the reader saw, so the repository's optimistic check refuses a change made
 * against a stale copy instead of silently overwriting it.
 */
export async function saveConsent(
  repository: ConsentRepository,
  identity: PortalIdentity,
  change: ConsentChange
): Promise<RepositoryRow<'learner_guardian'>> {
  assertLearnerAccess(identity, change.link.learner_id);

  if (!PREFERRED_CHANNELS.includes(change.preferredChannel as never)) {
    throw new PortalConsentError(
      `The preferred channel must be one of ${PREFERRED_CHANNELS.join(', ')}.`
    );
  }

  const language = change.preferredLanguage.trim();
  if (language.length > 35) {
    throw new PortalConsentError('A language tag can be at most 35 characters.');
  }

  const patch: UpdateInput<'learner_guardian'> = {
    receives_reports: change.receivesReports,
    receives_sms: change.receivesSms,
    preferred_channel: change.preferredChannel as UpdateInput<'learner_guardian'>['preferred_channel'],
    ...(language ? { preferred_language: language } : {}),
  };

  return repository.update('learner_guardian', asId<'learner_guardian'>(change.link.id), patch, {
    expectedVersion: change.link.rowVersion,
    ...(change.actorId ? { actor: change.actorId } : {}),
  });
}
