// ABOUTME: The consent preferences a guardian can see and change, and the audited repository write
// ABOUTME: that persists them, refusing a child the guardian is not linked to.

import { describe, expect, it, vi } from 'vitest';

import type { RepositoryRow } from '@/data/repository';
import { resolvePortalIdentity } from '../portalAccess';
import {
  PortalConsentError,
  readConsents,
  saveConsent,
  type ConsentLink,
} from '../portalConsent';

import {
  ENROLMENT_A,
  ENROLMENT_B,
  GUARDIAN,
  IDS,
  LEARNER_A,
  LEARNER_B,
  LINK_A,
  LINK_B,
} from './fixtures';

const identity = resolvePortalIdentity({
  status: 'ready',
  loginUserId: IDS.login,
  canonicalUser: { id: IDS.canonicalUser, username: 'grace', person_ref: { type: 'guardian', id: GUARDIAN.id } },
  learners: [LEARNER_A, LEARNER_B],
  enrolments: [ENROLMENT_A, ENROLMENT_B],
  classGroups: [],
  guardians: [GUARDIAN],
  learnerGuardians: [LINK_A, LINK_B],
});

const consentLink = (overrides: Partial<ConsentLink> = {}): ConsentLink => ({
  ...LINK_A,
  rowVersion: 3,
  ...overrides,
});

describe('the portal consent preferences', () => {
  it('shows each linked child’s preferences', () => {
    const consents = readConsents(identity, [consentLink(), consentLink({ ...LINK_B, rowVersion: 1 })]);

    expect(consents.map((consent) => consent.learnerName)).toEqual([
      'Amina Wanjiku',
      'Baraka Wanjiku',
    ]);
    expect(consents[0]).toMatchObject({
      receivesReports: true,
      receivesSms: true,
      preferredChannel: 'sms',
      preferredLanguage: 'sw',
    });
    expect(consents[1]).toMatchObject({ receivesSms: false, preferredChannel: 'portal' });
  });

  it('refuses a link for a child the guardian is not linked to', async () => {
    const other = resolvePortalIdentity({
      status: 'ready',
      loginUserId: IDS.login,
      canonicalUser: { id: IDS.canonicalUser, username: 'peter', person_ref: { type: 'guardian', id: IDS.otherGuardian } },
      learners: [LEARNER_A, LEARNER_B],
      enrolments: [ENROLMENT_A, ENROLMENT_B],
      classGroups: [],
      guardians: [GUARDIAN],
      learnerGuardians: [LINK_A, LINK_B],
    });

    await expect(
      saveConsent({ update: vi.fn() } as never, other, {
        link: consentLink(),
        receivesReports: true,
        receivesSms: false,
        preferredChannel: 'sms',
        preferredLanguage: 'en',
      })
    ).rejects.toThrow(/not linked/i);
  });

  it('writes the preference through the repository with the version it read', async () => {
    const update = vi.fn(async () => ({}) as unknown as RepositoryRow<'learner_guardian'>);
    const repository = { update } as never;

    await saveConsent(repository, identity, {
      link: consentLink(),
      receivesReports: false,
      receivesSms: true,
      preferredChannel: 'email',
      preferredLanguage: 'fr',
    });

    expect(update).toHaveBeenCalledWith(
      'learner_guardian',
      IDS.linkA,
      {
        receives_reports: false,
        receives_sms: true,
        preferred_channel: 'email',
        preferred_language: 'fr',
      },
      { expectedVersion: 3 }
    );
  });

  it('refuses a channel the schema does not know', async () => {
    await expect(
      saveConsent({ update: vi.fn() } as never, identity, {
        link: consentLink(),
        receivesReports: true,
        receivesSms: true,
        preferredChannel: 'carrier-pigeon',
        preferredLanguage: 'en',
      })
    ).rejects.toThrow(PortalConsentError);
  });

  it('refuses a language tag the schema would reject', async () => {
    await expect(
      saveConsent({ update: vi.fn() } as never, identity, {
        link: consentLink(),
        receivesReports: true,
        receivesSms: true,
        preferredChannel: 'sms',
        preferredLanguage: 'a'.repeat(36),
      })
    ).rejects.toThrow(PortalConsentError);
  });
});
