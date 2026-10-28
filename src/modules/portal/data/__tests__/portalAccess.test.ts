// ABOUTME: The portal's identity and authorisation rules: who the signed-in login is, which learners
// ABOUTME: it may read, and the refusal every other read must raise.

import { describe, expect, it } from 'vitest';

import {
  PortalAccessError,
  assertLearnerAccess,
  resolvePortalIdentity,
  type PortalIdentityInput,
} from '../portalAccess';

import {
  ENROLMENT_A,
  ENROLMENT_B,
  GUARDIAN,
  IDS,
  LEARNER_A,
  LEARNER_B,
  LEARNER_OTHER,
  LINK_A,
  LINK_B,
  OTHER_LINK,
} from './fixtures';

const baseInput = (overrides: Partial<PortalIdentityInput> = {}): PortalIdentityInput => ({
  status: 'ready',
  loginUserId: IDS.login,
  canonicalUser: { id: IDS.canonicalUser, username: 'grace.mwangi' },
  learners: [LEARNER_A, LEARNER_B, LEARNER_OTHER],
  enrolments: [ENROLMENT_A, ENROLMENT_B],
  classGroups: [{ id: '00000000-0000-7000-8000-0000000000f1', name: 'Form 1', stream: 'North' }],
  guardians: [GUARDIAN],
  learnerGuardians: [LINK_A, LINK_B, OTHER_LINK],
  ...overrides,
});

describe('the portal identity', () => {
  it('resolves a learner account to its own record only', () => {
    const identity = resolvePortalIdentity(
      baseInput({
        canonicalUser: {
          id: IDS.canonicalUser,
          username: 'amina.wanjiku',
          person_ref: { type: 'learner', id: IDS.learnerA },
        },
      })
    );

    expect(identity.status).toBe('linked');
    expect(identity.role).toBe('learner');
    expect(identity.learners.map((learner) => learner.id)).toEqual([IDS.learnerA]);
    expect(identity.learners[0].name).toBe('Amina Wanjiku');
    expect(identity.learners[0].className).toBe('Form 1 North');
  });

  it('gives a guardian every linked child and nobody else', () => {
    const identity = resolvePortalIdentity(
      baseInput({
        canonicalUser: {
          id: IDS.canonicalUser,
          username: 'grace.mwangi',
          person_ref: { type: 'guardian', id: IDS.guardian },
        },
      })
    );

    expect(identity.role).toBe('guardian');
    expect(identity.learners.map((learner) => learner.id)).toEqual([IDS.learnerA, IDS.learnerB]);
    expect(identity.learners.map((learner) => learner.name)).toEqual([
      'Amina Wanjiku',
      'Baraka Wanjiku',
    ]);
  });

  it('does not link a login to a guardian record that has no person reference', () => {
    const identity = resolvePortalIdentity(
      baseInput({ canonicalUser: { id: IDS.canonicalUser, username: 'grace.mwangi' } })
    );

    expect(identity.status).toBe('unlinked');
    expect(identity.role).toBeNull();
    expect(identity.learners).toEqual([]);
  });

  it('reports loading until the session and the rows have arrived', () => {
    const identity = resolvePortalIdentity(baseInput({ status: 'loading' }));

    expect(identity.status).toBe('loading');
    expect(identity.learners).toEqual([]);
  });

  it('stays unlinked when no canonical user matches the login', () => {
    const identity = resolvePortalIdentity(baseInput({ canonicalUser: null }));

    expect(identity.status).toBe('unlinked');
    expect(identity.role).toBeNull();
  });

  it('drops a learner whose Guardian link was removed', () => {
    const identity = resolvePortalIdentity(
      baseInput({
        canonicalUser: {
          id: IDS.canonicalUser,
          username: 'grace.mwangi',
          person_ref: { type: 'guardian', id: IDS.guardian },
        },
        learnerGuardians: [
          LINK_A,
          { ...LINK_B, deleted_at: '2026-02-01T00:00:00.000Z' },
        ],
      })
    );

    expect(identity.learners.map((learner) => learner.id)).toEqual([IDS.learnerA]);
  });

  it('refuses a learner account that tries to read another learner', () => {
    const identity = resolvePortalIdentity(
      baseInput({
        canonicalUser: {
          id: IDS.canonicalUser,
          username: 'amina.wanjiku',
          person_ref: { type: 'learner', id: IDS.learnerA },
        },
      })
    );

    expect(() => assertLearnerAccess(identity, IDS.learnerOther)).toThrow(PortalAccessError);
    expect(() => assertLearnerAccess(identity, IDS.learnerB)).toThrow(/not linked/i);
  });

  it('refuses a guardian account that tries to read a child it is not linked to', () => {
    const identity = resolvePortalIdentity(
      baseInput({
        canonicalUser: {
          id: IDS.canonicalUser,
          username: 'grace.mwangi',
          person_ref: { type: 'guardian', id: IDS.guardian },
        },
      })
    );

    expect(() => assertLearnerAccess(identity, IDS.learnerOther)).toThrow(PortalAccessError);
    expect(() => assertLearnerAccess(identity, IDS.learnerA)).not.toThrow();
  });

  it('refuses every read for an unlinked account, including its own login id', () => {
    const identity = resolvePortalIdentity(baseInput({ canonicalUser: null }));

    expect(() => assertLearnerAccess(identity, IDS.learnerA)).toThrow(PortalAccessError);
    expect(() => assertLearnerAccess(identity, IDS.canonicalUser)).toThrow(PortalAccessError);
  });
});
