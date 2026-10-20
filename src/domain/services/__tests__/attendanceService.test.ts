// ABOUTME: Tests for the attendance service over a real repository: a register is opened for a
// ABOUTME: scope and a day, the marks are recorded once, and a register outside its academic
// ABOUTME: period is refused.

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { asId } from '@/domain/ids';

import { AttendanceService } from '../attendanceService';
import {
  closeTestContext,
  createLearner,
  createServiceFixture,
  type ServiceFixture,
} from './helpers';

describe('the attendance service', () => {
  let fixture: ServiceFixture;
  let service: AttendanceService;

  beforeAll(async () => {
    fixture = await createServiceFixture();
    service = new AttendanceService({ repository: fixture.repository });
  });

  afterAll(async () => {
    await closeTestContext(fixture.context);
  });

  it('opens the register of a class group and a day, and finds it again', async () => {
    const opened = await service.openRegister({
      scope: { kind: 'class_group', id: fixture.classGroupId },
      date: '2027-02-01',
      session: 'am',
      takenBy: fixture.staffId,
    });
    const again = await service.openRegister({
      scope: { kind: 'class_group', id: fixture.classGroupId },
      date: '2027-02-01',
      session: 'am',
      takenBy: fixture.staffId,
    });

    expect(again.id).toBe(opened.id);
    expect(opened.class_group_id).toBe(fixture.classGroupId);
    expect(opened.locked).toBe(false);
    // The register belongs to the academic period that covers its day.
    expect(opened.academic_period_id).toBe(fixture.academicPeriodId);
  });

  it('opens the register of a residence', async () => {
    const residence = await fixture.repository.list('residence', { limit: 1 });
    const residenceId = asId<'residence'>(residence.items[0].id);

    const register = await service.openRegister({
      scope: { kind: 'residence', id: residenceId },
      date: '2027-02-04',
      session: 'roll_call',
      takenBy: fixture.staffId,
    });

    expect(register.residence_id).toBe(residenceId);
  });

  it('marks the learners of a register once', async () => {
    const register = await service.openRegister({
      scope: { kind: 'class_group', id: fixture.classGroupId },
      date: '2027-02-02',
      session: 'pm',
      takenBy: fixture.staffId,
    });
    const learner = await createLearner(fixture);

    const mark = await service.recordMark({
      sessionId: register.id,
      learnerId: learner.id,
      status: 'present',
    });

    expect(mark.status).toBe('present');
    expect(await service.listMarks(register.id)).toHaveLength(1);

    // A register holds one mark per learner.
    await expect(
      service.recordMark({ sessionId: register.id, learnerId: learner.id, status: 'late', minutesLate: 5 })
    ).rejects.toMatchObject({ code: 'duplicate' });
  });

  it('refuses a mark of a learner who was not there without a reason', async () => {
    const register = await service.openRegister({
      scope: { kind: 'class_group', id: fixture.classGroupId },
      date: '2027-02-05',
      session: 'am',
      takenBy: fixture.staffId,
    });
    const learner = await createLearner(fixture);

    await expect(
      service.recordMark({ sessionId: register.id, learnerId: learner.id, status: 'absent' })
    ).rejects.toMatchObject({ code: 'invalid_request' });

    const mark = await service.recordMark({
      sessionId: register.id,
      learnerId: learner.id,
      status: 'absent',
      reason: 'illness',
    });

    expect(mark.reason).toBe('illness');
  });

  it('refuses a register whose day lies outside its academic period', async () => {
    await expect(
      service.openRegister({
        scope: { kind: 'class_group', id: fixture.classGroupId },
        date: '2027-06-01',
        session: 'am',
        takenBy: fixture.staffId,
        academicPeriodId: fixture.academicPeriodId,
      })
    ).rejects.toMatchObject({ code: 'out_of_period' });
  });

  it('agrees with the repository guard on the day of a register', async () => {
    // The repository refuses the same row the service refuses, and it names the date.
    await expect(
      fixture.repository.create('attendance_session', {
        institution_id: fixture.institutionId,
        academic_period_id: fixture.academicPeriodId,
        date: '2027-06-01',
        session: 'am',
        class_group_id: fixture.classGroupId,
        taken_by: fixture.staffId,
        taken_at: '2027-06-01T08:00:00Z',
        locked: false,
      })
    ).rejects.toMatchObject({
      code: 'invariant',
      invariant: 'attendance.date_in_period',
      issues: [{ path: 'date' }],
    });
  });

  it('writes a register of a day no academic period covers, without a period', async () => {
    const register = await service.openRegister({
      scope: { kind: 'class_group', id: fixture.classGroupId },
      date: '2027-06-01',
      session: 'am',
      takenBy: fixture.staffId,
    });

    // No period covers the day, so the register names none.
    expect(register.academic_period_id).toBeUndefined();

    // The repository accepts a register that names no period.
    const direct = await fixture.repository.create('attendance_session', {
      institution_id: fixture.institutionId,
      date: '2027-06-02',
      session: 'am',
      class_group_id: fixture.classGroupId,
      taken_by: fixture.staffId,
      taken_at: '2027-06-02T08:00:00Z',
      locked: false,
    });

    expect(direct.academic_period_id).toBeUndefined();
  });

  it('refuses a register per lesson that does not name its lesson', async () => {
    await expect(
      service.openRegister({
        scope: { kind: 'class_group', id: fixture.classGroupId },
        date: '2027-02-03',
        session: 'period_n',
        takenBy: fixture.staffId,
      })
    ).rejects.toMatchObject({ code: 'invalid_request' });

    const register = await service.openRegister({
      scope: { kind: 'class_group', id: fixture.classGroupId },
      date: '2027-02-03',
      session: 'period_n',
      periodNumber: 2,
      takenBy: fixture.staffId,
    });

    expect(register.period_number).toBe(2);
  });

  it('records a leave-out, a conduct incident and a health visit', async () => {
    const learner = await createLearner(fixture);

    const leaveOut = await service.recordLeaveOut({
      learnerId: learner.id,
      kind: 'exeat',
      outAt: '2027-02-08T10:00:00Z',
      dueBackAt: '2027-02-08T16:00:00Z',
      authorisedBy: fixture.staffId,
    });
    const incident = await service.recordConductIncident({
      learnerId: learner.id,
      date: '2027-02-08',
      category: 'behaviour',
      description: 'Repeated disruption during the lesson.',
    });
    const visit = await service.recordHealthVisit({
      learnerId: learner.id,
      date: '2027-02-08',
      complaint: 'Headache and dizziness.',
      recordedBy: fixture.staffId,
    });

    expect(leaveOut.learner_id).toBe(learner.id);
    expect(leaveOut.kind).toBe('exeat');
    expect(incident.category).toBe('behaviour');
    expect(incident.confidential).toBe(false);
    expect(visit.complaint).toBe('Headache and dizziness.');
    expect(visit.referred).toBe(false);
  });

  it('locks a register, and a locked register takes no further marks', async () => {
    const register = await service.openRegister({
      scope: { kind: 'class_group', id: fixture.classGroupId },
      date: '2027-02-09',
      session: 'am',
      takenBy: fixture.staffId,
    });
    const learner = await createLearner(fixture);

    const locked = await service.lockRegister(register.id);
    expect(locked.locked).toBe(true);

    await expect(
      service.recordMark({ sessionId: register.id, learnerId: learner.id, status: 'present' })
    ).rejects.toMatchObject({ code: 'invalid_request' });
  });
});
