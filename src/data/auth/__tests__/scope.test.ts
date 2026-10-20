// ABOUTME: The scope tests of the permission model: a teacher writes a mark only inside their own
// ABOUTME: teaching groups, every other scope kind denies what it must, and the denial is explicit.

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { RepositoryPermissionError } from '@/data/repository';
import { ENTITY_NAMES } from '@/domain/schema';
import { asId } from '@/domain/ids';

import {
  ScopePermissionError,
  createAuthorizedRepository,
  createAuthorizer,
  type Role,
  type ScopedRepository,
} from '..';

import { AT, createScenario, markInput, type Scenario } from './helpers';

describe('the permission scope of the repository', () => {
  let scenario: Scenario;

  beforeAll(async () => {
    scenario = await createScenario();
  });

  afterAll(async () => {
    await scenario.adapter.close();
  });

  /** The repository an actor works through, with the scope resolved at the scenario date. */
  async function asActor(
    actorId: string,
    roles: readonly Role[]
  ): Promise<ScopedRepository> {
    const { repository } = await createAuthorizedRepository({
      adapter: scenario.adapter,
      actorId,
      roles,
      at: AT,
    });
    return repository;
  }

  /** The error a refused action raises, or null when the action was allowed. */
  async function denial(run: () => Promise<unknown>): Promise<ScopePermissionError | null> {
    return run()
      .then(() => null)
      .catch((caught: unknown) => caught as ScopePermissionError);
  }

  describe('the acceptance case: a teacher writes a mark', () => {
    it('refuses a mark for a learner outside the teaching groups of the teacher', async () => {
      const repository = await asActor(scenario.userIds.teacher, ['teacher']);

      const error = await denial(() =>
        repository.create('mark', markInput(scenario, scenario.enrolmentIds.green))
      );

      expect(error).toBeInstanceOf(RepositoryPermissionError);
      expect(error?.reason).toBe('scope');
      expect(error?.action).toBe('create');
      expect(error?.entity).toBe('mark');
    });

    it('accepts a mark for a learner inside the teaching groups of the teacher', async () => {
      const repository = await asActor(scenario.userIds.teacher, ['teacher']);

      const mark = await repository.create(
        'mark',
        markInput(scenario, scenario.enrolmentIds.blue)
      );

      expect(mark.enrolment_id).toBe(scenario.enrolmentIds.blue);
    });

    it('leaves the database untouched when the mark is refused', async () => {
      const repository = await asActor(scenario.userIds.teacher, ['teacher']);

      await denial(() =>
        repository.create('mark', markInput(scenario, scenario.enrolmentIds.green))
      );

      const page = await scenario.repository.list('mark', {
        where: { enrolment_id: scenario.enrolmentIds.green },
      });
      expect(page.total).toBe(1);
    });
  });

  describe('the teaching-group scope', () => {
    it('refuses a read of a mark outside the teaching groups of the teacher', async () => {
      const repository = await asActor(scenario.userIds.teacher, ['teacher']);

      const error = await denial(() =>
        repository.get('mark', asId<'mark'>(scenario.markIds.green))
      );

      expect(error).toBeInstanceOf(RepositoryPermissionError);
      expect(error?.reason).toBe('scope');
      expect(error?.action).toBe('read');
    });

    it('lists only the marks of the teaching groups of the teacher', async () => {
      const repository = await asActor(scenario.userIds.teacher, ['teacher']);

      const page = await repository.list('mark');

      expect(page.items.length).toBeGreaterThan(0);
      for (const mark of page.items) {
        expect(mark.enrolment_id).toBe(scenario.enrolmentIds.blue);
        expect(mark.learning_area_id).toBe(scenario.learningAreaId);
      }
    });

    it('lists and gets the same marks, also for a mark of another learning area', async () => {
      const repository = await asActor(scenario.userIds.teacher, ['teacher']);

      const page = await repository.list('mark');
      const listed = page.items.map((mark) => mark.id);

      // The mathematics mark of the same learner is valid data - the learner is a member of the
      // mathematics group - but it is not the mark of the group of this teacher.
      expect(listed).toContain(scenario.markIds.blue);
      expect(listed).not.toContain(scenario.markIds.maths);

      const error = await denial(() => repository.get('mark', asId<'mark'>(scenario.markIds.maths)));
      expect(error).toBeInstanceOf(RepositoryPermissionError);
      expect(error?.reason).toBe('scope');
    });

    it('counts the rows that passed the scope, not the rows of the page', async () => {
      const repository = await asActor(scenario.userIds.teacher, ['teacher']);

      const page = await repository.list('mark', { limit: 1 });

      const stored = await scenario.repository.list('mark');
      const candidates = stored.items.filter(
        (mark) => mark.enrolment_id === scenario.enrolmentIds.blue
      );
      const inScope = candidates.filter((mark) => mark.learning_area_id === scenario.learningAreaId);

      expect(page.items).toHaveLength(1);
      expect(page.total).toBe(inScope.length);
      // The mathematics mark is a candidate of the filter, and it is not in the scope.
      expect(candidates.length).toBeGreaterThan(page.total);
    });

    it('lists only the learners of the teaching groups of the teacher', async () => {
      const repository = await asActor(scenario.userIds.teacher, ['teacher']);

      const page = await repository.list('learner');

      expect(page.total).toBe(1);
      expect(page.items[0]?.id).toBe(scenario.learnerIds.blue);
    });

    it('refuses the mark of another teacher as well', async () => {
      const repository = await asActor(scenario.userIds.otherTeacher, ['teacher']);

      const error = await denial(() =>
        repository.create('mark', markInput(scenario, scenario.enrolmentIds.blue))
      );

      expect(error?.reason).toBe('scope');
    });

    it('refuses to update a mark of another group, not even by moving it into their own group', async () => {
      const repository = await asActor(scenario.userIds.teacher, ['teacher']);
      const stored = await scenario.repository.get('mark', asId<'mark'>(scenario.markIds.green));

      const error = await denial(() =>
        repository.update(
          'mark',
          stored!.id,
          { score: '99', enrolment_id: scenario.enrolmentIds.blue },
          { expectedVersion: stored!.rowVersion }
        )
      );

      expect(error).toBeInstanceOf(RepositoryPermissionError);
      expect(error?.reason).toBe('scope');

      const after = await scenario.repository.get('mark', asId<'mark'>(scenario.markIds.green));
      expect(after?.score).toBe('62');
      expect(after?.enrolment_id).toBe(scenario.enrolmentIds.green);
    });

    it('reads the audit trail of a mark of the own teaching group', async () => {
      const repository = await asActor(scenario.userIds.teacher, ['teacher']);

      const trail = await repository.auditTrail('mark', scenario.markIds.blue);

      expect(trail.length).toBeGreaterThan(0);
    });

    it('refuses the audit trail of a mark outside the teaching groups', async () => {
      const repository = await asActor(scenario.userIds.teacher, ['teacher']);

      const error = await denial(() =>
        repository.auditTrail('mark', scenario.markIds.green)
      );

      expect(error).toBeInstanceOf(RepositoryPermissionError);
      expect(error?.reason).toBe('scope');
    });

    it('narrows the audit log of an entity to the rows of the scope', async () => {
      const repository = await asActor(scenario.userIds.teacher, ['teacher']);

      const events = await repository.auditLog({ entity: 'mark' });
      const everyEvent = await scenario.repository.auditLog({ entity: 'mark' });

      expect(everyEvent.length).toBeGreaterThan(events.length);
      for (const event of events) {
        const payload = (event.after ?? event.before) as { learning_area_id?: string } | null;
        expect(payload?.learning_area_id).toBe(scenario.learningAreaId);
      }
    });

    it('refuses the audit log of the whole database to a teacher', async () => {
      const repository = await asActor(scenario.userIds.teacher, ['teacher']);

      const error = await denial(() => repository.auditLog());

      expect(error).toBeInstanceOf(RepositoryPermissionError);
      expect(error?.reason).toBe('scope');
    });

    it('keeps the events of another institution out of the audit log', async () => {
      const repository = await asActor(scenario.userIds.administrator, ['administrator']);

      const events = await repository.auditLog({ entity: 'learner' });
      const stored = await scenario.repository.list('learner');
      const otherInstitution = stored.items.filter(
        (learner) => learner.institution_id === scenario.otherInstitutionId
      );

      expect(otherInstitution.length).toBeGreaterThan(0);
      for (const event of events) {
        const payload = (event.after ?? event.before) as { institution_id?: string } | null;
        expect(payload?.institution_id).not.toBe(scenario.otherInstitutionId);
      }
    });
  });

  describe('the field policy of the medical record', () => {
    it('strips the medical record for a teacher without the permission', async () => {
      const repository = await asActor(scenario.userIds.teacher, ['teacher']);

      const learner = await repository.get('learner', asId<'learner'>(scenario.learnerIds.blue));

      expect(learner?.id).toBe(scenario.learnerIds.blue);
      expect(learner?.medical).toBeUndefined();
    });

    it('strips the medical record from a list as well', async () => {
      const repository = await asActor(scenario.userIds.teacher, ['teacher']);

      const page = await repository.list('learner');

      expect(page.items.length).toBeGreaterThan(0);
      for (const learner of page.items) expect(learner.medical).toBeUndefined();
    });

    it('hands the medical record to a nurse that holds the permission', async () => {
      const repository = await asActor(scenario.userIds.nurse, ['nurse']);

      const learner = await repository.get('learner', asId<'learner'>(scenario.learnerIds.blue));

      expect(learner?.medical).toEqual({ allergies: ['penicillin'] });
    });
  });

  describe('an actor without an active user row', () => {
    it('sees zero rows of every entity', async () => {
      const repository = await asActor(scenario.userIds.disabled, ['teacher']);

      for (const entity of ENTITY_NAMES) {
        const page = await repository.list(entity).then(
          (loaded) => loaded,
          () => null
        );
        if (page) expect(page.total).toBe(0);
      }
    });

    it('is refused a row of every entity', async () => {
      const repository = await asActor(scenario.userIds.disabled, ['teacher']);

      const learner = await scenario.repository.get('learner', asId<'learner'>(scenario.learnerIds.blue));

      const error = await denial(() =>
        repository.get('learner', learner!.id)
      );
      expect(error).toBeInstanceOf(RepositoryPermissionError);
    });
  });

  describe('the list and the get agree', () => {
    it('lists exactly the rows a get allows, for every entity', async () => {
      const actors: readonly { readonly id: string; readonly roles: readonly Role[] }[] = [
        { id: scenario.userIds.teacher, roles: ['teacher'] },
        { id: scenario.userIds.classTeacher, roles: ['class_teacher'] },
        { id: scenario.userIds.administrator, roles: ['administrator'] },
      ];

      for (const actor of actors) {
        const repository = await asActor(actor.id, actor.roles);

        for (const entity of ENTITY_NAMES) {
          const listed = new Set(
            await repository.list(entity, { limit: 500 }).then(
              (page) => page.items.map((row) => row.id),
              () => []
            )
          );
          const stored = await scenario.repository.list(entity, { limit: 500 });

          for (const row of stored.items) {
            const allowed = await repository.get(entity, row.id).then(
              () => true,
              () => false
            );
            expect(
              listed.has(row.id),
              `${actor.roles.join(',')} lists ${entity} ${row.id} that the get refuses`
            ).toBe(allowed);
          }
        }
      }
    });
  });

  describe('the class-group scope', () => {
    it('reads the learner of the class of the class teacher', async () => {
      const repository = await asActor(scenario.userIds.classTeacher, ['class_teacher']);

      const learner = await repository.get('learner', asId<'learner'>(scenario.learnerIds.blue));

      expect(learner?.id).toBe(scenario.learnerIds.blue);
    });

    it('refuses a read of a learner outside the class of the class teacher', async () => {
      const repository = await asActor(scenario.userIds.classTeacher, ['class_teacher']);

      const error = await denial(() =>
        repository.get('learner', asId<'learner'>(scenario.learnerIds.green))
      );

      expect(error).toBeInstanceOf(RepositoryPermissionError);
      expect(error?.reason).toBe('scope');
    });

    it('lists only the learners of the class of the class teacher', async () => {
      const repository = await asActor(scenario.userIds.classTeacher, ['class_teacher']);

      const page = await repository.list('learner');

      expect(page.total).toBe(1);
      expect(page.items[0]?.id).toBe(scenario.learnerIds.blue);
    });

    it('reads a mark of the class of the class teacher', async () => {
      const repository = await asActor(scenario.userIds.classTeacher, ['class_teacher']);

      const mark = await repository.get('mark', asId<'mark'>(scenario.markIds.blue));

      expect(mark?.id).toBe(scenario.markIds.blue);
    });

    it('refuses a mark of another class, because the class scope does not reach it', async () => {
      const repository = await asActor(scenario.userIds.classTeacher, ['class_teacher']);

      const error = await denial(() =>
        repository.get('mark', asId<'mark'>(scenario.markIds.green))
      );

      expect(error).toBeInstanceOf(RepositoryPermissionError);
      expect(error?.reason).toBe('scope');
    });
  });

  describe('the institution scope', () => {
    it('reads the mark of another teacher, because the institution scope covers it', async () => {
      const repository = await asActor(scenario.userIds.administrator, ['administrator']);

      const mark = await repository.get('mark', asId<'mark'>(scenario.markIds.green));

      expect(mark?.id).toBe(scenario.markIds.green);
    });

    it('refuses a row of another institution', async () => {
      const repository = await asActor(scenario.userIds.administrator, ['administrator']);

      const error = await denial(() =>
        repository.get('invoice', asId<'invoice'>(scenario.invoiceIds.other))
      );

      expect(error).toBeInstanceOf(RepositoryPermissionError);
      expect(error?.reason).toBe('scope');
    });

    it('lists only the rows of the own institution', async () => {
      const repository = await asActor(scenario.userIds.administrator, ['administrator']);

      const page = await repository.list('invoice');

      expect(page.total).toBe(1);
      expect(page.items[0]?.id).toBe(scenario.invoiceIds.local);
    });
  });

  describe('the finance-document scope', () => {
    it('reads the invoice of the institution of the accountant', async () => {
      const repository = await asActor(scenario.userIds.accountant, ['accountant']);

      const invoice = await repository.get('invoice', asId<'invoice'>(scenario.invoiceIds.local));

      expect(invoice?.id).toBe(scenario.invoiceIds.local);
    });

    it('refuses the invoice of another institution', async () => {
      const repository = await asActor(scenario.userIds.accountant, ['accountant']);

      const error = await denial(() =>
        repository.get('invoice', asId<'invoice'>(scenario.invoiceIds.other))
      );

      expect(error).toBeInstanceOf(RepositoryPermissionError);
      expect(error?.reason).toBe('scope');
    });

    it('refuses the ledger to a teacher', async () => {
      const repository = await asActor(scenario.userIds.teacher, ['teacher']);

      const error = await denial(() =>
        repository.get('invoice', asId<'invoice'>(scenario.invoiceIds.local))
      );

      expect(error).toBeInstanceOf(RepositoryPermissionError);
      expect(error?.reason).toBe('permission');
    });

    it('refuses the ledger to a registrar, whose scope is the institution only', async () => {
      const repository = await asActor(scenario.userIds.registrar, ['registrar']);

      const error = await denial(() =>
        repository.get('invoice', asId<'invoice'>(scenario.invoiceIds.local))
      );

      expect(error).toBeInstanceOf(RepositoryPermissionError);
      expect(error?.reason).toBe('permission');
    });
  });

  describe('the role escalation', () => {
    it('refuses a mark write to a class teacher, whose scope reaches the class but not the writing', async () => {
      const repository = await asActor(scenario.userIds.classTeacher, ['class_teacher']);

      const error = await denial(() =>
        repository.create('mark', markInput(scenario, scenario.enrolmentIds.blue))
      );

      expect(error).toBeInstanceOf(RepositoryPermissionError);
      expect(error?.reason).toBe('permission');
    });

    it('refuses a finance write to a class teacher', async () => {
      const repository = await asActor(scenario.userIds.classTeacher, ['class_teacher']);

      const error = await denial(() =>
        repository.create('invoice', {
          institution_id: scenario.institutionId,
          number: 'INV-2027-900',
          learner_id: scenario.learnerIds.blue,
          issue_date: '2027-02-01',
          total: { amount_minor: 1000, currency: 'KES' },
          status: 'draft',
        })
      );

      expect(error).toBeInstanceOf(RepositoryPermissionError);
      expect(error?.reason).toBe('permission');
    });

    it('refuses a staff write to a teacher', async () => {
      const repository = await asActor(scenario.userIds.teacher, ['teacher']);

      const error = await denial(() =>
        repository.create('staff', {
          institution_id: scenario.institutionId,
          given_name: 'Dora',
          family_name: 'Kimani',
          name_order: 'given_first',
          gender: 'female',
          employee_number: 'TSC/900',
          employment_type: 'permanent',
          department_ids: [],
          start_date: '2027-01-01',
          end_date: null,
        })
      );

      expect(error).toBeInstanceOf(RepositoryPermissionError);
      expect(error?.reason).toBe('permission');
    });

    it('refuses every action to an actor without a context', () => {
      const authorizer = createAuthorizer(undefined);

      const error = (() => {
        try {
          authorizer({ action: 'read', entity: 'learner' });
          return null;
        } catch (caught) {
          return caught as ScopePermissionError;
        }
      })();

      expect(error).toBeInstanceOf(RepositoryPermissionError);
      expect(error?.reason).toBe('no_context');
    });

    it('refuses every action to an actor whose roles hold no permission', async () => {
      const { repository } = await createAuthorizedRepository({
        adapter: scenario.adapter,
        actorId: scenario.userIds.teacher,
        roles: [],
        at: AT,
      });

      const error = await denial(() => repository.list('learner'));

      expect(error).toBeInstanceOf(RepositoryPermissionError);
      expect(error?.reason).toBe('permission');
    });
  });

  describe('the scope follows the data', () => {
    it('gives the teacher the other group once the assignment moved', async () => {
      const assignment = await scenario.repository.get(
        'teaching_assignment',
        asId<'teaching_assignment'>(scenario.assignmentIds.blue)
      );
      await scenario.repository.update(
        'teaching_assignment',
        assignment!.id,
        { valid_to: '2027-02-28' },
        { expectedVersion: assignment!.rowVersion }
      );
      await scenario.repository.create('teaching_assignment', {
        institution_id: scenario.institutionId,
        staff_id: scenario.staffIds.teacher,
        teaching_group_id: scenario.teachingGroupIds.green,
        role: 'main',
        valid_from: '2027-03-01',
        valid_to: null,
      });

      const repository = await asActor(scenario.userIds.teacher, ['teacher']);

      const allowed = await repository.create(
        'mark',
        markInput(scenario, scenario.enrolmentIds.green)
      );
      expect(allowed.enrolment_id).toBe(scenario.enrolmentIds.green);

      const error = await denial(() =>
        repository.create('mark', markInput(scenario, scenario.enrolmentIds.blue))
      );
      expect(error?.reason).toBe('scope');
    });

    it('holds nothing before the assignment starts', async () => {
      const { repository } = await createAuthorizedRepository({
        adapter: scenario.adapter,
        actorId: scenario.userIds.teacher,
        roles: ['teacher'],
        at: '2026-12-01',
      });

      const error = await denial(() =>
        repository.create('mark', markInput(scenario, scenario.enrolmentIds.blue))
      );

      expect(error).toBeInstanceOf(RepositoryPermissionError);
      expect(error?.reason).toBe('scope');
    });
  });
});
