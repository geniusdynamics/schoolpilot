// ABOUTME: The teacher-scope acceptance, proved at the data path: a teacher calling the repository
// ABOUTME: directly cannot create or update a mark of a group they are not assigned to, because the
// ABOUTME: scoped repository refuses the row whatever the page showed.

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createAuthorizedRepository, ScopePermissionError, type ScopedRepository } from '@/data/auth';
import { AT, createScenario, markInput, type Scenario } from '@/data/auth/__tests__/helpers';
import { asId } from '@/domain/ids';

describe('mark writes through the scoped repository', () => {
  let scenario: Scenario;
  let repository: ScopedRepository;

  beforeAll(async () => {
    scenario = await createScenario();
    const authorised = await createAuthorizedRepository({
      adapter: scenario.adapter,
      actorId: scenario.userIds.teacher,
      roles: ['teacher'],
      at: AT,
    });
    repository = authorised.repository;
  });

  afterAll(async () => {
    await scenario.adapter.close();
  });

  it('serves the teacher their own group and not the other group of the same assessment', async () => {
    const groups = await repository.list('teaching_group', { limit: 50 });
    expect(groups.items.map((row) => row.name)).toEqual(['Grade 7 English Blue']);
  });

  it('creates a mark for a learner of the teacher own group', async () => {
    const created = await repository.create(
      'mark',
      markInput(scenario, scenario.enrolmentIds.blue, { score: '71' })
    );

    expect(created.enrolment_id).toBe(scenario.enrolmentIds.blue);
    expect(created.score).toBe('71');
  });

  it('refuses a mark for another group even when the write path is called directly', async () => {
    await expect(
      repository.create('mark', markInput(scenario, scenario.enrolmentIds.green))
    ).rejects.toBeInstanceOf(ScopePermissionError);
  });

  it('refuses an update of another group stored mark', async () => {
    await expect(
      repository.update(
        'mark',
        asId<'mark'>(scenario.markIds.green),
        { score: '99' },
        { expectedVersion: 1 }
      )
    ).rejects.toBeInstanceOf(ScopePermissionError);
  });

  it('still lets the teacher update their own mark', async () => {
    const updated = await repository.update(
      'mark',
      asId<'mark'>(scenario.markIds.blue),
      { score: '78', version: 2 },
      { expectedVersion: 1, reason: 'Corrected after remarking.' }
    );

    expect(updated.score).toBe('78');
  });
});
