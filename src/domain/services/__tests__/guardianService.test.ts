// ABOUTME: Tests for the guardian service over a real repository: a guardian is linked to a
// ABOUTME: learner, a learner keeps one primary contact, the identifiers are managed and the UI
// ABOUTME: gets the contact details.

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { KEMIS_UPI_SCHEME } from '../common';
import { GuardianService } from '../guardianService';
import {
  closeTestContext,
  createLearner,
  createServiceFixture,
  type ServiceFixture,
} from './helpers';

describe('the guardian service', () => {
  let fixture: ServiceFixture;
  let service: GuardianService;

  beforeAll(async () => {
    fixture = await createServiceFixture();
    service = new GuardianService({ repository: fixture.repository });
  });

  afterAll(async () => {
    await closeTestContext(fixture.context);
  });

  it('adds a guardian and links it to a learner', async () => {
    const learner = await createLearner(fixture);
    const guardian = await service.addGuardian({
      institutionId: fixture.institutionId,
      givenName: 'Grace',
      familyName: 'Wekesa',
      nameOrder: 'given_first',
      gender: 'female',
      phones: [{ number: '+254711222333', label: 'home' }],
    });

    const link = await service.linkGuardian({
      learnerId: learner.id,
      guardianId: guardian.id,
      relationship: 'mother',
      isFeePayer: true,
    });

    expect(link.learner_id).toBe(learner.id);
    expect(link.guardian_id).toBe(guardian.id);
    expect(link.relationship).toBe('mother');
    expect(link.is_fee_payer).toBe(true);
    expect(link.is_primary).toBe(true);
  });

  it('keeps one primary contact per learner', async () => {
    const learner = await createLearner(fixture);
    const first = await service.addGuardian({
      institutionId: fixture.institutionId,
      givenName: 'First',
      familyName: 'Guardian',
      nameOrder: 'given_first',
      gender: 'female',
    });
    const second = await service.addGuardian({
      institutionId: fixture.institutionId,
      givenName: 'Second',
      familyName: 'Guardian',
      nameOrder: 'given_first',
      gender: 'female',
    });

    await service.linkGuardian({
      learnerId: learner.id,
      guardianId: first.id,
      relationship: 'mother',
      isPrimary: true,
    });
    await service.linkGuardian({
      learnerId: learner.id,
      guardianId: second.id,
      relationship: 'father',
      isPrimary: true,
    });

    const contacts = await service.listContacts(learner.id);
    expect(contacts.filter((contact) => contact.isPrimary)).toHaveLength(1);
    expect(contacts.find((contact) => contact.isPrimary)?.guardian.id).toBe(second.id);
  });

  it('refuses a second link of the same guardian', async () => {
    const learner = await createLearner(fixture);
    const guardian = await service.addGuardian({
      institutionId: fixture.institutionId,
      givenName: 'Twice',
      familyName: 'Guardian',
      nameOrder: 'given_first',
      gender: 'female',
    });

    await service.linkGuardian({
      learnerId: learner.id,
      guardianId: guardian.id,
      relationship: 'guardian',
    });

    await expect(
      service.linkGuardian({
        learnerId: learner.id,
        guardianId: guardian.id,
        relationship: 'guardian',
      })
    ).rejects.toMatchObject({ code: 'duplicate' });
  });

  it('removes a guardian and the links to the learners', async () => {
    const learner = await createLearner(fixture);
    const guardian = await service.addGuardian({
      institutionId: fixture.institutionId,
      givenName: 'Gone',
      familyName: 'Guardian',
      nameOrder: 'given_first',
      gender: 'female',
    });
    await service.linkGuardian({
      learnerId: learner.id,
      guardianId: guardian.id,
      relationship: 'sponsor',
    });

    const removed = await service.removeGuardian(guardian.id);

    expect(removed.unlinked).toHaveLength(1);
    expect(await service.listContacts(learner.id)).toHaveLength(0);
  });

  it('finds a guardian by phone', async () => {
    const guardian = await service.addGuardian({
      institutionId: fixture.institutionId,
      givenName: 'Findable',
      familyName: 'Guardian',
      nameOrder: 'given_first',
      gender: 'female',
      phones: [{ number: '+254712345678' }],
    });

    const found = await service.findByPhone('+254 712 345 678', {
      institutionId: fixture.institutionId,
    });

    expect(found.map((row) => row.id)).toEqual([guardian.id]);
  });

  it('records the ke.kemis_upi identifier of a learner and refuses it for another owner', async () => {
    const learner = await createLearner(fixture);
    const other = await createLearner(fixture);

    const identifier = await service.addIdentifier({
      owner: { ownerType: 'learner', ownerId: learner.id },
      scheme: KEMIS_UPI_SCHEME,
      value: 'UPI-4242',
    });

    expect(identifier.owner_type).toBe('learner');
    expect(identifier.owner_id).toBe(learner.id);
    expect(await service.listIdentifiers('learner', learner.id)).toHaveLength(1);

    await expect(
      service.addIdentifier({
        owner: { ownerType: 'learner', ownerId: other.id },
        scheme: KEMIS_UPI_SCHEME,
        value: 'UPI-4242',
      })
    ).rejects.toMatchObject({ code: 'duplicate' });
  });

  it('removes an identifier', async () => {
    const learner = await createLearner(fixture);
    const identifier = await service.addIdentifier({
      owner: { ownerType: 'learner', ownerId: learner.id },
      scheme: 'ke.birth_certificate',
      value: 'BC-77',
    });

    await service.removeIdentifier(identifier.id);

    expect(await service.listIdentifiers('learner', learner.id)).toHaveLength(0);
  });

  it('hands the UI the contact details of the guardians of a learner', async () => {
    const learner = await createLearner(fixture);
    const guardian = await service.addGuardian({
      institutionId: fixture.institutionId,
      givenName: 'Grace',
      familyName: 'Wekesa',
      nameOrder: 'given_first',
      gender: 'female',
      phones: [{ number: '+254713456789', label: 'mobile' }],
      emails: [{ address: 'grace@example.test' }],
      address: { city: 'Nairobi', country: 'KE' },
    });
    await service.linkGuardian({
      learnerId: learner.id,
      guardianId: guardian.id,
      relationship: 'mother',
      preferredChannel: 'whatsapp',
    });

    const contacts = await service.listContacts(learner.id);

    expect(contacts).toHaveLength(1);
    expect(contacts[0].name).toBe('Grace Wekesa');
    expect(contacts[0].phones.map((phone) => phone.number)).toEqual(['+254713456789']);
    expect(contacts[0].emails.map((email) => email.address)).toEqual(['grace@example.test']);
    expect(contacts[0].address?.city).toBe('Nairobi');
    expect(contacts[0].relationship).toBe('mother');
    expect(contacts[0].preferredChannel).toBe('whatsapp');
  });
});
