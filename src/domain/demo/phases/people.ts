// ABOUTME: The learners and their guardians of the demo school: each admitted through the admission
// ABOUTME: service in the year they joined, rolled into this year, graduated or left as their story says.

import type { RepositoryRow } from '@/data/repository';
import { asId, type Id } from '@/domain/ids';
import { AdmissionService, EnrolmentService } from '@/domain/services';

import {
  GUARDIANS,
  LEARNERS,
  STAFF,
  type CastGuardian,
  type CastLearner,
  type LevelSlot,
} from '../cast';
import type { DemoContext, DemoYear } from './context';
import { findOrCreate, findOne, sequenceYear } from './helpers';
import type { DemoStaff } from './staff';

/** The demo learner who signs in to the student portal. */
const STUDENT_LOGIN = { username: 'student', learnerKey: 'amani' } as const;
const NO_PASSWORD = 'demo-account-no-password';

export interface RosterLearner {
  readonly cast: CastLearner;
  readonly learnerId: Id<'learner'>;
  /** The guardians in the order the cast names them. */
  readonly guardianIds: readonly Id<'guardian'>[];
  readonly primaryGuardianId: Id<'guardian'> | null;
  readonly previousEnrolmentId: Id<'enrolment'> | null;
  readonly currentEnrolmentId: Id<'enrolment'> | null;
  readonly previousClassGroupId: Id<'class_group'> | null;
  readonly currentClassGroupId: Id<'class_group'> | null;
  /** The day the learner left the school, when they have left by the day the demo is set on. */
  readonly leftOn: string | null;
}

export interface DemoRoster {
  readonly learners: readonly RosterLearner[];
  readonly byKey: ReadonlyMap<string, RosterLearner>;
  /** The guardian rows by the key the cast names them with. */
  readonly guardians: ReadonlyMap<string, RepositoryRow<'guardian'>>;
}

/** The index in the school's levels a slot stands for: the lowest, the one above, the terminal one. */
export function levelIndexOf(slot: LevelSlot, levelCount: number): number {
  if (slot === 'entry') return 0;
  if (slot === 'middle') return Math.min(1, levelCount - 1);
  return levelCount - 1;
}

/** The class group of `year` at a level, taking the stream the cast names (wrapped over the streams). */
function classGroupOf(
  year: DemoYear,
  level: RepositoryRow<'level'> | undefined,
  stream: number
): RepositoryRow<'class_group'> | null {
  if (!level) return null;
  const groups = year.classGroups.filter((group) => group.level_id === level.id);
  return groups.length === 0 ? null : (groups[stream % groups.length] ?? null);
}

const AGE_AT_SLOT: Record<LevelSlot, number> = { entry: 12, middle: 13, final: 14 };

/**
 * Admits the cast through `AdmissionService`, in the year each learner joined, then rolls them through
 * the years: a learner who was here last year is promoted into this year's class, a leaver of last
 * year graduates, and a learner whose story ends this year is transferred out or expelled.
 */
export async function seedPeople(ctx: DemoContext, staff: DemoStaff): Promise<DemoRoster> {
  const { repository, institutionId, options } = ctx;
  const admissions = new AdmissionService({ repository });
  const enrolments = new EnrolmentService({ repository });
  const levelCount = ctx.levels.length;
  const currentYear = sequenceYear(ctx.current.year.start_date);
  const previousYear = currentYear - 1;
  const castGuardians = new Map<string, CastGuardian>(GUARDIANS.map((guardian) => [guardian.key, guardian]));

  // A household for every family that has more than one child at the school.
  const childrenOf = new Map<string, string[]>();
  for (const learner of LEARNERS) {
    const family = learner.links.map((link) => link.guardian).sort().join('+');
    childrenOf.set(family, [...(childrenOf.get(family) ?? []), learner.key]);
  }
  const households = new Map<string, RepositoryRow<'household'>>();
  for (const [family, keys] of childrenOf) {
    if (keys.length < 2) continue;
    const surname = LEARNERS.find((learner) => learner.key === keys[0])?.family ?? 'Family';
    const row = await findOrCreate<'household'>(
      repository,
      'household',
      { where: { institution_id: institutionId, name: `${surname} family` } },
      () => ({ institution_id: institutionId, name: `${surname} family` }),
      options,
      () => ctx.count('household')
    );
    households.set(family, row);
  }

  const admissionCounters = new Map<number, number>();
  const nextAdmission = (year: number): string => {
    const next = (admissionCounters.get(year) ?? 0) + 1;
    admissionCounters.set(year, next);
    return `ADM/${year}/${String(next).padStart(3, '0')}`;
  };

  const guardianRows = new Map<string, RepositoryRow<'guardian'>>();
  const roster: RosterLearner[] = [];
  const byKey = new Map<string, RosterLearner>();

  for (const [index, person] of LEARNERS.entries()) {
    const alumnus = person.fate === 'graduated';
    const targetLevelIndex = levelIndexOf(person.slot, levelCount);
    // Where the learner was last year, if they were here: an alumnus left from their slot's level,
    // everyone else was one level lower than they are now.
    const previousLevelIndex = alumnus
      ? targetLevelIndex
      : person.joined === 'previous'
        ? Math.max(0, targetLevelIndex - 1)
        : null;
    const previousGroup =
      previousLevelIndex === null
        ? null
        : classGroupOf(ctx.previous, ctx.levels[previousLevelIndex], person.stream);
    const currentGroup = alumnus
      ? null
      : classGroupOf(ctx.current, ctx.levels[targetLevelIndex], person.stream);
    const firstGroup = previousGroup ?? currentGroup;
    if (!firstGroup) throw new Error(`the demo learner ${person.key} has no class group to join`);

    const admissionYear = previousGroup ? previousYear : currentYear;
    const startDate = previousGroup ? ctx.previous.year.start_date : ctx.current.year.start_date;
    const links = person.links.map((link) => {
      const guardian = castGuardians.get(link.guardian);
      if (!guardian) throw new Error(`the demo learner ${person.key} names an unknown guardian ${link.guardian}`);
      return { link, guardian };
    });
    const family = person.links.map((link) => link.guardian).sort().join('+');
    const household = households.get(family);

    const result = await admissions.admit({
      learner: {
        givenName: person.given,
        familyName: person.family,
        nameOrder: 'given_first',
        gender: person.gender,
        dateOfBirth: `${currentYear - AGE_AT_SLOT[person.slot] - (alumnus ? 1 : 0)}-${String(1 + ((index * 5) % 12)).padStart(2, '0')}-${String(1 + ((index * 7) % 28)).padStart(2, '0')}`,
        admissionNumber: nextAdmission(admissionYear),
        admissionDate: startDate,
        residenceStatus: 'day',
        ...(person.medical
          ? {
              medical: {
                ...(person.medical.allergies ? { allergies: person.medical.allergies } : {}),
                ...(person.medical.conditions ? { conditions: person.medical.conditions } : {}),
                ...(person.medical.medications ? { medications: person.medical.medications } : {}),
              },
            }
          : {}),
        ...(person.previousSchool ? { previousSchool: person.previousSchool } : {}),
        ...(household ? { householdId: asId<'household'>(household.id) } : {}),
      },
      guardians: links.map(({ link, guardian }, position) => ({
        givenName: guardian.given,
        familyName: guardian.family,
        nameOrder: 'given_first' as const,
        gender: guardian.gender,
        phones: [{ number: guardian.phone, label: 'mobile' }],
        occupation: guardian.occupation,
        relationship: link.relationship,
        isPrimary: position === 0,
        isFeePayer: position === 0,
        hasParentalResponsibility: link.relationship !== 'grandparent',
        preferredChannel: 'sms' as const,
      })),
      enrolment: {
        classGroupId: asId<'class_group'>(firstGroup.id),
        startDate,
        entryReason: person.previousSchool ? 'transferred_in' : 'new_admission',
      },
      identifiers: [
        {
          owner: 'learner' as const,
          scheme: 'ke.kemis_upi',
          value: `UPI/${admissionYear}/${String(index + 1).padStart(4, '0')}`,
        },
      ],
    });
    ctx.count('learner');
    ctx.count('enrolment');
    for (let linked = 0; linked < result.links.length; linked += 1) ctx.count('learner_guardian');
    if (result.identifiers.length > 0) ctx.count('identifier');
    for (let created = 0; created < result.guardians.length; created += 1) ctx.count('guardian');

    const guardianIds = result.links.map((link) => asId<'guardian'>(link.guardian_id));
    for (const [position, id] of guardianIds.entries()) {
      const key = links[position]?.guardian.key;
      if (!key || guardianRows.has(key)) continue;
      const row = await repository.get('guardian', id);
      if (row) guardianRows.set(key, row);
    }

    // A guardian who works at the school is that member of staff, so a staff-ward discount finds them.
    for (const [position, { guardian }] of links.entries()) {
      const member = guardian.staffKey ? staff.byKey.get(guardian.staffKey) : undefined;
      const row = guardianRows.get(guardian.key);
      const id = guardianIds[position];
      if (!member || !row || !id || row.is_staff_member_id === member.id) continue;
      const updated = await repository.update(
        'guardian',
        id,
        { is_staff_member_id: asId<'staff'>(member.id) },
        { expectedVersion: row.rowVersion, ...options }
      );
      guardianRows.set(guardian.key, updated);
    }

    if (household && !household.primary_payer_guardian_id && guardianIds[0]) {
      const updated = await repository.update(
        'household',
        household.id,
        { primary_payer_guardian_id: guardianIds[0] },
        { expectedVersion: household.rowVersion, ...options }
      );
      households.set(family, updated);
    }

    const learnerId = asId<'learner'>(result.learner.id);
    const firstEnrolmentId = asId<'enrolment'>(result.enrolment.id);
    let currentEnrolmentId: Id<'enrolment'> | null = previousGroup ? null : firstEnrolmentId;
    let leftOn: string | null = null;

    if (previousGroup) {
      if (alumnus) {
        // Left the final level at the end of last year. The learner's own status changes later (see
        // `applyFates`): a billing run bills only learners still enrolled, and last year's was run then.
        await enrolments.end(firstEnrolmentId, {
          endDate: ctx.previous.year.end_date,
          exitReason: 'graduated',
          status: 'completed',
        });
        leftOn = ctx.previous.year.end_date;
      } else {
        await enrolments.end(firstEnrolmentId, {
          endDate: ctx.previous.year.end_date,
          exitReason: 'promoted',
          status: 'completed',
        });
        if (!currentGroup) throw new Error(`the demo learner ${person.key} has no class group this year`);
        const promoted = await enrolments.enrol({
          learnerId,
          classGroupId: asId<'class_group'>(currentGroup.id),
          startDate: ctx.current.year.start_date,
          entryReason: 'promoted',
        });
        ctx.count('enrolment');
        currentEnrolmentId = asId<'enrolment'>(promoted.id);
      }
    }

    // A learner whose story ends this year leaves after the term the cast names, if that term has ended.
    const exitTerm = person.leftAfterTerm === undefined ? undefined : ctx.current.terms[person.leftAfterTerm];
    if (
      currentEnrolmentId &&
      exitTerm &&
      exitTerm.end_date < ctx.today &&
      (person.fate === 'transferred_out' || person.fate === 'expelled')
    ) {
      await enrolments.end(currentEnrolmentId, {
        endDate: exitTerm.end_date,
        exitReason: person.fate === 'expelled' ? 'expelled' : 'transferred_out',
        status: 'left',
      });
      leftOn = exitTerm.end_date;
    }

    const entry: RosterLearner = {
      cast: person,
      learnerId,
      guardianIds,
      primaryGuardianId: guardianIds[0] ?? null,
      previousEnrolmentId: previousGroup ? firstEnrolmentId : null,
      currentEnrolmentId,
      previousClassGroupId: previousGroup ? asId<'class_group'>(previousGroup.id) : null,
      currentClassGroupId: currentGroup ? asId<'class_group'>(currentGroup.id) : null,
      leftOn,
    };
    roster.push(entry);
    byKey.set(person.key, entry);
  }

  await seedLogins(ctx, staff, { learners: roster, byKey, guardians: guardianRows });
  return { learners: roster, byKey, guardians: guardianRows };
}

/**
 * Moves the learners who have left to the status their story ends in.
 *
 * It runs last because the billing run bills only learners whose status is `enrolled`: an alumna is
 * `graduated` today, but she was enrolled, and billed, every term of last year.
 */
export async function applyFates(ctx: DemoContext, roster: DemoRoster): Promise<void> {
  ctx.at('departures');
  for (const entry of roster.learners) {
    const { fate } = entry.cast;
    const status =
      fate === 'graduated'
        ? 'graduated'
        : entry.leftOn !== null && fate === 'transferred_out'
          ? 'transferred_out'
          : entry.leftOn !== null && fate === 'expelled'
            ? 'withdrawn'
            : null;
    if (!status) continue;
    const learner = await ctx.repository.get('learner', entry.learnerId);
    if (!learner || learner.status === status) continue;
    await ctx.repository.update(
      'learner',
      learner.id,
      { status },
      { expectedVersion: learner.rowVersion, ...ctx.options }
    );
  }
}

/**
 * The demo logins as canonical users.
 *
 * A page resolves the signed-in login to its canonical `user` row by username. Without those rows the
 * demo teacher has no staff record to act as, and the student portal has no learner to show. The
 * staff record points at its user, and the user's `person_ref` points at the staff, guardian or
 * learner, so every scope resolves.
 */
async function seedLogins(ctx: DemoContext, staff: DemoStaff, roster: DemoRoster): Promise<void> {
  const { repository, institutionId, options } = ctx;
  ctx.at('logins');

  for (const person of STAFF) {
    if (!person.login) continue;
    const member = staff.byKey.get(person.key);
    if (!member) continue;
    const login = await findOrCreate<'user'>(
      repository,
      'user',
      { where: { institution_id: institutionId, username: person.login } },
      () => ({
        institution_id: institutionId,
        username: person.login ?? person.key,
        password_hash: NO_PASSWORD,
        status: 'active',
        person_ref: { type: 'staff', id: asId<'staff'>(member.id) },
        mfa: false,
      }),
      options,
      () => ctx.count('user')
    );
    if (member.user_id !== login.id) {
      await repository.update(
        'staff',
        member.id,
        { user_id: asId<'user'>(login.id) },
        { expectedVersion: member.rowVersion, ...options }
      );
    }
  }

  for (const guardian of GUARDIANS) {
    const row = roster.guardians.get(guardian.key);
    if (!guardian.login || !row) continue;
    await findOrCreate<'user'>(
      repository,
      'user',
      { where: { institution_id: institutionId, username: guardian.login } },
      () => ({
        institution_id: institutionId,
        username: guardian.login ?? guardian.key,
        password_hash: NO_PASSWORD,
        status: 'active',
        person_ref: { type: 'guardian', id: asId<'guardian'>(row.id) },
        mfa: false,
      }),
      options,
      () => ctx.count('user')
    );
  }

  const demoStudent = roster.byKey.get(STUDENT_LOGIN.learnerKey);
  if (demoStudent && !(await findOne(repository, 'user', { where: { institution_id: institutionId, username: STUDENT_LOGIN.username } }))) {
    await repository.create(
      'user',
      {
        institution_id: institutionId,
        username: STUDENT_LOGIN.username,
        password_hash: NO_PASSWORD,
        status: 'active',
        person_ref: { type: 'learner', id: demoStudent.learnerId },
        mfa: false,
      },
      options
    );
    ctx.count('user');
  }
}
