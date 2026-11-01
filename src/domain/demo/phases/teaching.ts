// ABOUTME: What the demo school teaches and who teaches it: learning areas with their split papers,
// ABOUTME: grading scales, a teaching group for every area at every level, electives and the clubs.

import type { RepositoryRow } from '@/data/repository';
import { asId, type Id } from '@/domain/ids';

import { ACTIVITIES, LEARNING_AREAS, PATRONS, SPLIT_PAPERS, TEACHES } from '../cast';
import type { DemoContext } from './context';
import { findOne, findOrCreate } from './helpers';
import type { DemoRoster } from './people';
import type { DemoStaff } from './staff';

export interface DemoGroup {
  readonly id: Id<'teaching_group'>;
  readonly areaCode: string;
  readonly learningAreaId: Id<'learning_area'>;
  readonly levelId: Id<'level'>;
  readonly classGroupIds: readonly string[];
}

export interface DemoTeaching {
  readonly areas: ReadonlyMap<string, RepositoryRow<'learning_area'>>;
  /** The competency-band scale of the junior school, and the letter scale of the older style. */
  readonly numericScale: RepositoryRow<'grading_scale'>;
  readonly letterScale: RepositoryRow<'grading_scale'>;
  /** The teaching groups of the core areas, one per area and level. */
  readonly coreGroups: readonly DemoGroup[];
  /** The member of staff who teaches each learning area, by area code. */
  readonly teacherOf: ReadonlyMap<string, RepositoryRow<'staff'>>;
}

/** The staff key that teaches an area, from the cast's table. */
function teacherKeyOf(areaCode: string): string | undefined {
  return Object.entries(TEACHES).find(([, codes]) => codes.includes(areaCode))?.[0];
}

export async function seedTeaching(
  ctx: DemoContext,
  staff: DemoStaff,
  roster: DemoRoster
): Promise<DemoTeaching> {
  const { repository, institutionId, programmeId, options } = ctx;
  ctx.at('curriculum');

  const levelIds = ctx.levels.map((level) => level.id);

  // The two ways a school grades: the competency bands of the junior school, and letters A to E.
  // The bands tile the range exactly and are read half-open (min inclusive, max exclusive): a gap
  // between 79 and 80 would leave a score with no band, and the engine refuses that.
  const numericScale = await findOrCreate<'grading_scale'>(
    repository,
    'grading_scale',
    { where: { programme_id: programmeId, code: 'demo_numeric' } },
    () => ({
      institution_id: institutionId,
      programme_id: programmeId,
      code: 'demo_numeric',
      kind: 'numeric_bands',
      bands: [
        { code: 'EE', label: 'Exceeding expectations', min: 80, max: 100 },
        { code: 'ME', label: 'Meeting expectations', min: 60, max: 80 },
        { code: 'AEP', label: 'Approaching expectations', min: 40, max: 60 },
        { code: 'BE', label: 'Below expectations', min: 0, max: 40 },
      ],
      version: '1',
    }),
    options,
    () => ctx.count('grading_scale')
  );
  const letterScale = await findOrCreate<'grading_scale'>(
    repository,
    'grading_scale',
    { where: { programme_id: programmeId, code: 'demo_letter' } },
    () => ({
      institution_id: institutionId,
      programme_id: programmeId,
      code: 'demo_letter',
      kind: 'letter',
      bands: [
        { code: 'A', label: 'Excellent', min: 80, max: 100, points: 12 },
        { code: 'B', label: 'Good', min: 65, max: 80, points: 9 },
        { code: 'C', label: 'Average', min: 50, max: 65, points: 6 },
        { code: 'D', label: 'Below average', min: 35, max: 50, points: 3 },
        { code: 'E', label: 'Poor', min: 0, max: 35, points: 1 },
      ],
      version: '1',
    }),
    options,
    () => ctx.count('grading_scale')
  );

  const areas = new Map<string, RepositoryRow<'learning_area'>>();
  for (const area of LEARNING_AREAS) {
    const row = await findOrCreate<'learning_area'>(
      repository,
      'learning_area',
      { where: { programme_id: programmeId, code: area.code } },
      () => ({
        institution_id: institutionId,
        programme_id: programmeId,
        code: area.code,
        name: area.name,
        short_name: area.short,
        group: area.group,
        kind: area.kind,
        level_ids: levelIds.map((id) => asId<'level'>(id)),
        pathway_ids: [],
      }),
      options,
      () => ctx.count('learning_area')
    );
    areas.set(area.code, row);
  }
  for (const activity of ACTIVITIES) {
    const row = await findOrCreate<'learning_area'>(
      repository,
      'learning_area',
      { where: { programme_id: programmeId, code: activity.code } },
      () => ({
        institution_id: institutionId,
        programme_id: programmeId,
        code: activity.code,
        name: activity.name,
        group: activity.kind === 'sport' ? 'sports' : 'clubs',
        kind: 'co_curricular',
        level_ids: levelIds.map((id) => asId<'level'>(id)),
        pathway_ids: [],
      }),
      options,
      () => ctx.count('learning_area')
    );
    areas.set(activity.code, row);
  }

  // A learning area split into papers keeps a component for each, with the weight the paper carries.
  for (const [areaCode, papers] of Object.entries(SPLIT_PAPERS)) {
    const area = areas.get(areaCode);
    if (!area) continue;
    for (const paper of papers) {
      await findOrCreate<'component'>(
        repository,
        'component',
        { where: { learning_area_id: area.id, code: paper.code } },
        () => ({
          institution_id: institutionId,
          learning_area_id: asId<'learning_area'>(area.id),
          code: paper.code,
          name: paper.name,
          kind: paper.kind,
          weight: paper.weight,
          max_score: 100,
        }),
        options,
        () => ctx.count('component')
      );
    }
  }

  ctx.at('teaching');
  const teacherOf = new Map<string, RepositoryRow<'staff'>>();
  const staffKeyOf = (areaCode: string): string =>
    teacherKeyOf(areaCode) ?? PATRONS[areaCode] ?? 'deputy';
  for (const area of [...LEARNING_AREAS.map((entry) => entry.code), ...ACTIVITIES.map((entry) => entry.code)]) {
    const teacher = staff.byKey.get(staffKeyOf(area));
    if (teacher) teacherOf.set(area, teacher);
  }

  // What each teacher is able to teach, so the pickers offer the right people.
  for (const [key, codes] of Object.entries(TEACHES)) {
    const listed = staff.byKey.get(key);
    // The row held since the staff were written is stale once a login was linked to it.
    const member = listed ? await repository.get('staff', asId<'staff'>(listed.id)) : null;
    if (!member) continue;
    await repository.update(
      'staff',
      member.id,
      {
        teaching_competences: codes
          .map((code) => areas.get(code))
          .filter((area): area is RepositoryRow<'learning_area'> => Boolean(area))
          .map((area) => ({
            learning_area_id: asId<'learning_area'>(area.id),
            level_ids: levelIds.map((id) => asId<'level'>(id)),
          })),
      },
      { expectedVersion: member.rowVersion, ...options }
    );
  }

  const ensureAssignment = async (
    teacher: RepositoryRow<'staff'> | undefined,
    groupId: Id<'teaching_group'>
  ): Promise<void> => {
    if (!teacher) return;
    const existing = await findOne(repository, 'teaching_assignment', {
      where: { staff_id: teacher.id, teaching_group_id: groupId },
    });
    if (existing) return;
    await repository.create(
      'teaching_assignment',
      {
        institution_id: institutionId,
        staff_id: asId<'staff'>(teacher.id),
        teaching_group_id: groupId,
        role: 'main',
        valid_from: ctx.current.year.start_date,
      },
      options
    );
    ctx.count('teaching_assignment');
  };

  const ensureMember = async (
    groupId: Id<'teaching_group'>,
    enrolmentId: Id<'enrolment'>,
    validTo: string | null
  ): Promise<void> => {
    const member = await findOne(repository, 'teaching_group_member', {
      where: { teaching_group_id: groupId, enrolment_id: enrolmentId },
    });
    if (member) return;
    await repository.create(
      'teaching_group_member',
      {
        institution_id: institutionId,
        teaching_group_id: groupId,
        enrolment_id: enrolmentId,
        valid_from: ctx.current.year.start_date,
        ...(validTo ? { valid_to: validTo } : {}),
      },
      options
    );
    ctx.count('teaching_group_member');
  };

  // Everyone enrolled this year, with the day they left if they have.
  const enrolled = roster.learners.flatMap((entry) =>
    entry.currentEnrolmentId && entry.currentClassGroupId
      ? [{ entry, enrolmentId: entry.currentEnrolmentId, classGroupId: entry.currentClassGroupId }]
      : []
  );

  // A group for every core area at every level; the streams of a level share it, so the class
  // marks grid finds every learner of the level in one group.
  const coreGroups: DemoGroup[] = [];
  for (const area of LEARNING_AREAS.filter((entry) => entry.kind === 'core')) {
    const areaRow = areas.get(area.code);
    const teacher = teacherOf.get(area.code);
    if (!areaRow) continue;
    for (const level of ctx.levels) {
      const classGroups = ctx.current.classGroups.filter((group) => group.level_id === level.id);
      const name = `${level.name} ${area.name}`;
      const group = await findOrCreate<'teaching_group'>(
        repository,
        'teaching_group',
        { where: { academic_year_id: ctx.current.year.id, learning_area_id: areaRow.id, name } },
        () => ({
          institution_id: institutionId,
          campus_id: ctx.campusId,
          academic_year_id: asId<'academic_year'>(ctx.current.year.id),
          learning_area_id: asId<'learning_area'>(areaRow.id),
          name,
          level_ids: [asId<'level'>(level.id)],
          class_group_ids: classGroups.map((entry) => asId<'class_group'>(entry.id)),
          teacher_ids: teacher ? [asId<'staff'>(teacher.id)] : [],
          kind: 'whole_class',
        }),
        options,
        () => ctx.count('teaching_group')
      );
      const groupId = asId<'teaching_group'>(group.id);
      await ensureAssignment(teacher, groupId);
      for (const member of enrolled) {
        if (!classGroups.some((entry) => entry.id === member.classGroupId)) continue;
        await ensureMember(groupId, member.enrolmentId, member.entry.leftOn);
      }
      coreGroups.push({
        id: groupId,
        areaCode: area.code,
        learningAreaId: asId<'learning_area'>(areaRow.id),
        levelId: asId<'level'>(level.id),
        classGroupIds: classGroups.map((entry) => entry.id),
      });
    }
  }

  // Electives and the clubs are one group each across the school, with the members that chose them.
  //
  // They name no class group: the results page takes an area from every teaching group that names the
  // class and counts it against every learner of it, so a group of volunteers on a class would make the
  // whole class "incomplete" for a subject most of it does not take. Who is in them is what a membership
  // says, and what a learner takes is the learning-area enrolment.
  const optional: Array<{ code: string; name: string; chosen: (entry: (typeof enrolled)[number]) => boolean }> = [
    ...LEARNING_AREAS.filter((entry) => entry.kind === 'elective').map((entry) => ({
      code: entry.code,
      name: entry.name,
      chosen: (member: (typeof enrolled)[number]) => member.entry.cast.electives?.includes(entry.code) ?? false,
    })),
    ...ACTIVITIES.map((entry) => ({
      code: entry.code,
      name: entry.name,
      chosen: (member: (typeof enrolled)[number]) => member.entry.cast.activities?.includes(entry.code) ?? false,
    })),
  ];
  for (const item of optional) {
    const areaRow = areas.get(item.code);
    if (!areaRow) continue;
    const teacher = teacherOf.get(item.code);
    const group = await findOrCreate<'teaching_group'>(
      repository,
      'teaching_group',
      { where: { academic_year_id: ctx.current.year.id, learning_area_id: areaRow.id, name: item.name } },
      () => ({
        institution_id: institutionId,
        campus_id: ctx.campusId,
        academic_year_id: asId<'academic_year'>(ctx.current.year.id),
        learning_area_id: asId<'learning_area'>(areaRow.id),
        name: item.name,
        level_ids: levelIds.map((id) => asId<'level'>(id)),
        class_group_ids: [],
        teacher_ids: teacher ? [asId<'staff'>(teacher.id)] : [],
        kind: 'elective',
      }),
      options,
      () => ctx.count('teaching_group')
    );
    const groupId = asId<'teaching_group'>(group.id);
    await ensureAssignment(teacher, groupId);
    const isElective = areaRow.kind === 'elective';
    for (const member of enrolled.filter(item.chosen)) {
      await ensureMember(groupId, member.enrolmentId, member.entry.leftOn);
      if (!isElective) continue;
      const taking = await findOne(repository, 'learning_area_enrolment', {
        where: { enrolment_id: member.enrolmentId, learning_area_id: areaRow.id },
      });
      if (taking) continue;
      await repository.create(
        'learning_area_enrolment',
        {
          institution_id: institutionId,
          enrolment_id: member.enrolmentId,
          learning_area_id: asId<'learning_area'>(areaRow.id),
          teaching_group_id: groupId,
          status: 'taking',
          valid_from: ctx.current.year.start_date,
        },
        options
      );
      ctx.count('learning_area_enrolment');
    }
  }

  return { areas, numericScale, letterScale, coreGroups, teacherOf };
}
