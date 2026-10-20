// ABOUTME: The admission end to end over a real repository: the page drives the service, and the
// ABOUTME: learner, guardians, links, identifiers and enrolment land in a real SQLite database.

import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { afterEach, describe, expect, it } from 'vitest';

import { CanonicalRepositoryProvider } from '@/data/canonicalRepository';
import {
  closeTestContext,
  createServiceFixture,
  type ServiceFixture,
} from '@/domain/services/__tests__/helpers';
import { AdmitLearnerPageContent } from '../../pages/AdmitLearnerPage';

let fixture: ServiceFixture | undefined;

afterEach(async () => {
  // Unmount before the database closes: the page's watchers read through the adapter.
  cleanup();
  await closeTestContext(fixture?.context);
  fixture = undefined;
});

const renderPage = () => {
  if (!fixture) throw new Error('the fixture is not open');
  render(
    <CanonicalRepositoryProvider repository={fixture.repository}>
      <AdmitLearnerPageContent />
    </CanonicalRepositoryProvider>
  );
};

const field = (name: string) => {
  const element = document.querySelector(`[name="${name}"]`);
  if (!element) throw new Error(`field "${name}" is not rendered`);
  return element as HTMLInputElement | HTMLSelectElement;
};

const type = (name: string, value: string) => {
  fireEvent.change(field(name), { target: { name, value } });
};

const choose = async (testId: string, option: RegExp) => {
  fireEvent.click(screen.getByTestId(testId));
  fireEvent.click(await screen.findByRole('option', { name: option }));
};

const fillAdmission = async (familyName: string) => {
  type('given_name', 'Amani');
  type('family_name', familyName);
  type('date_of_birth', '2014-02-03');
  type('guardians.0.given_name', 'Wairimu');
  type('guardians.0.family_name', familyName);
  type('guardians.0.phone', '+254712345678');
  type('start_date', '2027-01-05');

  await choose('programme-picker', /CBE Junior School/);
  await choose('level-picker', /Grade 7/);
  await choose('class-group-picker', /Blue/);
};

describe('admitting a learner on a real repository', () => {
  it('writes the learner, the guardian, the link, the identifier and the enrolment', async () => {
    fixture = await createServiceFixture();
    renderPage();
    await fillAdmission('Njoroge-E2E');
    type('identifier_scheme', 'ke.kemis_upi');
    type('identifier_value', 'UPI-E2E-1');
    type('guardian_identifier_scheme', 'ke.national_id');
    type('guardian_identifier_value', 'ID-E2E-1');
    fireEvent.submit(document.querySelector('form') as HTMLFormElement);

    const result = await screen.findByTestId('admission-result', {}, { timeout: 10_000 });
    expect(result).toHaveTextContent('Amani Njoroge-E2E');
    expect(result).toHaveTextContent('Placed in Blue.');

    const learners = await fixture.repository.list('learner', {
      where: { family_name: 'Njoroge-E2E' },
      includeDeleted: true,
    });
    expect(learners.total).toBe(1);
    const learner = learners.items[0];
    expect(learner.admission_number).toMatch(/^ADM\/2027\/\d{3}$/);
    expect(learner.status).toBe('enrolled');
    expect(learner.institution_id).toBe(fixture.institutionId);

    const guardians = await fixture.repository.list('guardian', {
      where: { institution_id: fixture.institutionId },
    });
    const guardian = guardians.items.find((row) => row.family_name === 'Njoroge-E2E');
    expect(guardian).toBeDefined();
    expect(guardian?.phones?.[0]?.number).toBe('+254712345678');

    const links = await fixture.repository.list('learner_guardian', {
      where: { learner_id: learner.id },
    });
    expect(links.total).toBe(1);
    expect(links.items[0].guardian_id).toBe(guardian?.id);
    expect(links.items[0].is_primary).toBe(true);

    const identifiers = await fixture.repository.list('identifier', {
      where: { owner_id: learner.id },
    });
    expect(identifiers.items.map((row) => [row.scheme, row.value])).toEqual([
      ['ke.kemis_upi', 'UPI-E2E-1'],
    ]);
    const guardianIdentifiers = await fixture.repository.list('identifier', {
      where: { owner_id: guardian?.id },
    });
    expect(guardianIdentifiers.items.map((row) => [row.scheme, row.value])).toEqual([
      ['ke.national_id', 'ID-E2E-1'],
    ]);

    const enrolments = await fixture.repository.list('enrolment', {
      where: { learner_id: learner.id },
    });
    expect(enrolments.total).toBe(1);
    expect(enrolments.items[0]).toMatchObject({
      class_group_id: fixture.classGroupId,
      academic_year_id: fixture.academicYearId,
      programme_id: fixture.programmeId,
      level_id: fixture.levelId,
      status: 'active',
      start_date: '2027-01-05',
    });
  });

  it('refuses a class group that was archived after it was chosen, and writes nothing', async () => {
    fixture = await createServiceFixture();
    renderPage();
    await fillAdmission('Odhiambo-E2E');

    await act(async () => {
      if (!fixture) throw new Error('the fixture is not open');
      await fixture.repository.remove('class_group', fixture.classGroupId);
    });

    fireEvent.submit(document.querySelector('form') as HTMLFormElement);

    const failure = await screen.findByTestId('admission-failure', {}, { timeout: 10_000 });
    expect(failure).toHaveAttribute('data-field', 'class_group_id');
    expect(failure).toHaveTextContent(/Class group: This class group no longer exists/);

    const learners = await fixture.repository.list('learner', {
      where: { family_name: 'Odhiambo-E2E' },
      includeDeleted: true,
    });
    expect(learners.total).toBe(0);
  });
});
