// ABOUTME: Tests for the enrolment service over a real repository: the enrolment follows its
// ABOUTME: class group, the invariants of spec 02 §12 hold, an enrolment ends with a reason and a
// ABOUTME: transfer moves the learner.

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { EnrolmentService } from '../enrolmentService';
import {
  closeTestContext,
  createAcademicYear,
  createClassGroup,
  createLearner,
  createLevel,
  createServiceFixture,
  missingId,
  type ServiceFixture,
} from './helpers';

describe('the enrolment service', () => {
  let fixture: ServiceFixture;
  let service: EnrolmentService;

  beforeAll(async () => {
    fixture = await createServiceFixture();
    service = new EnrolmentService({ repository: fixture.repository });
  });

  afterAll(async () => {
    await closeTestContext(fixture.context);
  });

  it('enrols a learner into the class group of the year', async () => {
    const learner = await createLearner(fixture);

    const enrolment = await service.enrol({
      learnerId: learner.id,
      classGroupId: fixture.classGroupId,
      startDate: '2027-01-05',
    });

    expect(enrolment.learner_id).toBe(learner.id);
    expect(enrolment.class_group_id).toBe(fixture.classGroupId);
    // The class group is year-scoped and carries the level and the programme of the enrolment.
    expect(enrolment.academic_year_id).toBe(fixture.academicYearId);
    expect(enrolment.level_id).toBe(fixture.levelId);
    expect(enrolment.programme_id).toBe(fixture.programmeId);
    expect(enrolment.status).toBe('active');
    expect(enrolment.entry_reason).toBe('new_admission');
  });

  it('refuses a class group that does not exist', async () => {
    const learner = await createLearner(fixture);

    await expect(
      service.enrol({
        learnerId: learner.id,
        classGroupId: missingId<'class_group'>('00000000ff01'),
        startDate: '2027-01-05',
      })
    ).rejects.toMatchObject({ code: 'missing_reference', entity: 'class_group' });
  });

  it('refuses a level that the class group does not carry', async () => {
    const learner = await createLearner(fixture);
    const otherLevel = await createLevel(fixture, 'G9');

    await expect(
      service.enrol({
        learnerId: learner.id,
        classGroupId: fixture.classGroupId,
        startDate: '2027-01-05',
        levelId: otherLevel.id,
      })
    ).rejects.toMatchObject({ code: 'invalid_request' });
  });

  it('keeps one active enrolment per learner and academic year', async () => {
    const learner = await createLearner(fixture);

    await service.enrol({
      learnerId: learner.id,
      classGroupId: fixture.classGroupId,
      startDate: '2027-01-05',
    });

    // The second enrolment overlaps the first one, so the repository refuses it (§12.1).
    await expect(
      service.enrol({
        learnerId: learner.id,
        classGroupId: fixture.classGroupId,
        startDate: '2027-02-01',
      })
    ).rejects.toMatchObject({
      code: 'invariant',
      invariant: 'enrolment.single_active_per_calendar',
    });
  });

  it('ends an enrolment with a reason, and the current class follows it', async () => {
    const learner = await createLearner(fixture);
    const enrolment = await service.enrol({
      learnerId: learner.id,
      classGroupId: fixture.classGroupId,
      startDate: '2027-01-05',
    });

    expect((await service.currentClass(learner.id, '2027-01-10'))?.id).toBe(enrolment.id);

    const ended = await service.end(enrolment.id, {
      endDate: '2027-02-28',
      exitReason: 'withdrawn',
      learnerStatus: 'withdrawn',
    });

    expect(ended.enrolment.status).toBe('left');
    expect(ended.enrolment.exit_reason).toBe('withdrawn');
    expect(ended.enrolment.end_date).toBe('2027-02-28');
    expect(ended.learner?.status).toBe('withdrawn');

    // The class of a learner is the enrolment that runs on the day.
    expect(await service.currentClass(learner.id, '2027-03-01')).toBeNull();
    expect((await service.currentClass(learner.id, '2027-01-10'))?.id).toBe(enrolment.id);
  });

  it('moves the learner to another class group', async () => {
    const learner = await createLearner(fixture);
    const enrolment = await service.enrol({
      learnerId: learner.id,
      classGroupId: fixture.classGroupId,
      startDate: '2027-01-05',
    });
    const target = await createClassGroup(fixture);

    const moved = await service.transfer(enrolment.id, {
      toClassGroupId: target.id,
      effectiveDate: '2027-02-01',
      reason: 'Capacity rebalance',
    });

    expect(moved.enrolment.class_group_id).toBe(target.id);
    expect(moved.change.kind).toBe('class_change');
    expect(moved.change.effective_date).toBe('2027-02-01');
    expect((await service.currentClass(learner.id, '2027-02-02'))?.class_group_id).toBe(target.id);
  });

  it('refuses a move into a class group of another year', async () => {
    const learner = await createLearner(fixture);
    const enrolment = await service.enrol({
      learnerId: learner.id,
      classGroupId: fixture.classGroupId,
      startDate: '2027-01-05',
    });
    const otherYear = await createAcademicYear(fixture, { name: '2028' });
    const target = await createClassGroup(fixture, { academicYearId: otherYear.id });

    // The class group of another year is a promotion, not a class change (§12.2).
    await expect(
      service.transfer(enrolment.id, {
        toClassGroupId: target.id,
        effectiveDate: '2027-02-01',
        reason: 'Wrong year',
      })
    ).rejects.toMatchObject({ code: 'invariant', invariant: 'enrolment.class_group_alignment' });
  });

  it('lists the enrolments of a learner', async () => {
    const learner = await createLearner(fixture);
    const enrolment = await service.enrol({
      learnerId: learner.id,
      classGroupId: fixture.classGroupId,
      startDate: '2027-01-05',
    });

    const enrolments = await service.listEnrolments(learner.id);
    expect(enrolments.map((row) => row.id)).toContain(enrolment.id);
  });
});
