// ABOUTME: The daily life of the demo school: ten recent school days of registers with the absences and
// ABOUTME: lateness a real week has, a suspension with its incident, clinic visits and conduct incidents.

import { asId } from '@/domain/ids';
import { AttendanceService } from '@/domain/services';

import type { DemoContext } from './context';
import { addDays, earlierOf, laterOf, listAll, weekdaysBetween } from './helpers';
import type { DemoRoster, RosterLearner } from './people';
import type { DemoStaff } from './staff';

type Mark =
  | { readonly status: 'present' }
  | { readonly status: 'late'; readonly minutesLate: number }
  | { readonly status: 'absent' | 'medical' | 'excused' | 'suspended'; readonly reason: 'illness' | 'family_emergency' | 'medical_appointment' | 'religious_holiday' | 'other' };

function hashOf(value: string): number {
  let hash = 5;
  for (const letter of value) hash = (Math.imul(hash, 37) + letter.charCodeAt(0)) >>> 0;
  return hash;
}

/** How a learner shows up on a day: mostly present, with the odd late arrival, absence or clinic day. */
function markOf(entry: RosterLearner, day: string, suspendedDays: ReadonlySet<string>): Mark {
  if (entry.cast.fate === 'suspended' && suspendedDays.has(day)) return { status: 'suspended', reason: 'other' };
  const roll = hashOf(`${entry.cast.key}:${day}`) % 100;
  if (roll < 5) return { status: 'late', minutesLate: 5 + (roll % 4) * 5 };
  if (roll < 8) return { status: 'absent', reason: 'illness' };
  if (roll === 8) return { status: 'absent', reason: 'family_emergency' };
  if (roll === 9 && entry.cast.medical) return { status: 'medical', reason: 'medical_appointment' };
  return { status: 'present' };
}

/** Writes the registers, the clinic visits and the conduct record of the school's recent days. */
export async function seedPastoral(ctx: DemoContext, staff: DemoStaff, roster: DemoRoster): Promise<void> {
  const { repository, options } = ctx;
  ctx.at('register');
  const attendance = new AttendanceService({ repository });

  const term = ctx.current.terms[ctx.currentTermIndex];
  if (!term) return;
  const end = earlierOf(term.end_date, ctx.today);
  const start = laterOf(term.start_date, addDays(end, -21));
  const days = weekdaysBetween(start, end).slice(-10);
  if (days.length === 0) return;

  const deputy = staff.byKey.get('deputy');
  const nurse = staff.byKey.get('nurse') ?? deputy;
  if (!deputy || !nurse) return;

  // A learner is suspended for the last week of the days shown, after a fight the day before.
  const suspendedDays = new Set(days.slice(-5));
  const incidentDay = days[Math.max(days.length - 6, 0)] ?? days[0] ?? end;

  const classGroups = await listAll(repository, 'class_group', {
    where: { academic_year_id: ctx.current.year.id },
  });
  for (const group of classGroups) {
    const teacher = group.homeroom_teacher_ids[0];
    const learnersOfGroup = roster.learners.filter((entry) => entry.currentClassGroupId === group.id);
    for (const day of days) {
      const present = learnersOfGroup.filter((entry) => entry.leftOn === null || entry.leftOn >= day);
      if (present.length === 0) continue;
      const session = await attendance.openRegister({
        scope: { kind: 'class_group', id: asId<'class_group'>(group.id) },
        date: day,
        session: 'am',
        takenBy: asId<'staff'>(teacher ?? deputy.id),
        academicPeriodId: asId<'academic_period'>(term.id),
        takenAt: `${day}T07:45:00.000Z`,
      });
      ctx.count('attendance_session');
      for (const entry of present) {
        const mark = markOf(entry, day, suspendedDays);
        await attendance.recordMark({
          sessionId: session.id,
          learnerId: entry.learnerId,
          status: mark.status,
          ...(mark.status === 'late' ? { minutesLate: mark.minutesLate } : {}),
          ...('reason' in mark ? { reason: mark.reason } : {}),
          ...(mark.status !== 'present' ? { notifiedGuardianAt: `${day}T09:00:00.000Z` } : {}),
        });
        ctx.count('attendance_mark');
      }
    }
  }

  ctx.at('pastoral');

  // The suspended learner: the incident, the guardian told, the disciplinary leave and the status.
  const suspended = roster.learners.find((entry) => entry.cast.fate === 'suspended');
  if (suspended) {
    await attendance.recordConductIncident({
      learnerId: suspended.learnerId,
      date: incidentDay,
      category: 'violence',
      description: 'Fought with another learner during the morning break.',
      action: 'Suspended for one week; the deputy head met the parent before the learner returns.',
      points: 10,
      guardianInformedAt: `${incidentDay}T14:00:00.000Z`,
    });
    ctx.count('conduct_incident');
    await attendance.recordLeaveOut({
      learnerId: suspended.learnerId,
      kind: 'disciplinary',
      outAt: `${addDays(incidentDay, 1)}T08:00:00.000Z`,
      dueBackAt: `${addDays(incidentDay, 8)}T08:00:00.000Z`,
      authorisedBy: asId<'staff'>(deputy.id),
      ...(suspended.primaryGuardianId ? { collectedByGuardianId: suspended.primaryGuardianId } : {}),
    });
    ctx.count('leave_out');
    const learner = await repository.get('learner', suspended.learnerId);
    if (learner) {
      await repository.update('learner', learner.id, { status: 'suspended' }, { expectedVersion: learner.rowVersion, ...options });
    }
  }

  const incidents: ReadonlyArray<{ key: string; category: 'behaviour' | 'bullying' | 'property_damage' | 'academic_misconduct' | 'theft'; description: string; action: string; points: number; confidential?: boolean; offset: number }> = [
    { key: 'david', category: 'behaviour', description: 'Disrupted the Mathematics lesson more than once.', action: 'Warned and moved to the front row.', points: 1, offset: 3 },
    { key: 'moses', category: 'property_damage', description: 'Broke a classroom window while playing ball indoors.', action: 'Parent to pay for the repair.', points: 3, offset: 4 },
    { key: 'quentin', category: 'academic_misconduct', description: 'Found with notes during the mid-term Science exam.', action: 'The paper was voided and the learner sat a re-test.', points: 5, offset: 5 },
    { key: 'liam', category: 'bullying', description: 'Reported by a classmate for repeated name-calling.', action: 'Counselled; parent informed; to be reviewed in a month.', points: 4, confidential: true, offset: 6 },
    { key: 'nadia', category: 'theft', description: 'A calculator was missing from a desk; later found with the learner.', action: 'Returned; guidance and counselling.', points: 2, confidential: true, offset: 7 },
  ];
  for (const item of incidents) {
    const entry = roster.byKey.get(item.key);
    if (!entry || entry.leftOn) continue;
    await attendance.recordConductIncident({
      learnerId: entry.learnerId,
      date: laterOf(term.start_date, addDays(end, -item.offset * 3)),
      category: item.category,
      description: item.description,
      action: item.action,
      points: item.points,
      guardianInformedAt: `${addDays(end, -item.offset * 3)}T15:00:00.000Z`,
      ...(item.confidential ? { confidential: true } : {}),
    });
    ctx.count('conduct_incident');
  }

  const visits: ReadonlyArray<{ key: string; complaint: string; treatment: string; referred: boolean; offset: number }> = [
    { key: 'amani', complaint: 'Wheezing after the games lesson.', treatment: 'Inhaler used; rested for twenty minutes and returned to class.', referred: false, offset: 2 },
    { key: 'baraka', complaint: 'Itchy rash after lunch.', treatment: 'Antihistamine given; the kitchen was told about his nut allergy.', referred: false, offset: 5 },
    { key: 'joy', complaint: 'Dizzy and shaking before lunch.', treatment: 'Glucose given and the blood sugar checked; she recovered.', referred: false, offset: 8 },
    { key: 'imani', complaint: 'A seizure in the corridor.', treatment: 'Kept safe until it passed; the mother was called and collected her.', referred: true, offset: 11 },
    { key: 'omar', complaint: 'Headache and a fever.', treatment: 'Rested and given paracetamol; sent home with his father.', referred: false, offset: 14 },
    { key: 'ian', complaint: 'A grazed knee from football.', treatment: 'Cleaned and dressed.', referred: false, offset: 4 },
    { key: 'ruth', complaint: 'Stomach ache.', treatment: 'Rested and given water; returned to class.', referred: false, offset: 9 },
  ];
  for (const visit of visits) {
    const entry = roster.byKey.get(visit.key);
    if (!entry || entry.leftOn) continue;
    await attendance.recordHealthVisit({
      learnerId: entry.learnerId,
      date: laterOf(term.start_date, addDays(end, -visit.offset)),
      complaint: visit.complaint,
      treatment: visit.treatment,
      referred: visit.referred,
      recordedBy: asId<'staff'>(nurse.id),
    });
    ctx.count('health_visit');
  }

  // The learner who had the seizure was sent home: a medical leave-out, collected by the parent.
  const sentHome = roster.byKey.get('imani');
  if (sentHome && !sentHome.leftOn) {
    const day = laterOf(term.start_date, addDays(end, -11));
    await attendance.recordLeaveOut({
      learnerId: sentHome.learnerId,
      kind: 'medical',
      outAt: `${day}T11:30:00.000Z`,
      dueBackAt: `${addDays(day, 2)}T08:00:00.000Z`,
      returnedAt: `${addDays(day, 2)}T07:50:00.000Z`,
      authorisedBy: asId<'staff'>(nurse.id),
      ...(sentHome.primaryGuardianId ? { collectedByGuardianId: sentHome.primaryGuardianId } : {}),
    });
    ctx.count('leave_out');
  }
}
