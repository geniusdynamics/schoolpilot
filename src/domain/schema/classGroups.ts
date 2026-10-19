// ABOUTME: Canonical class-group and teaching schemas from spec 02 §5: year-scoped class groups,
// ABOUTME: teaching groups, membership, assignments and the timetable slot/entry model.

import { z } from 'zod/v4';

import {
  auditShape,
  entityIdShape,
  isoDate,
  isoTime,
  shortText,
  tenancyShape,
  uuid,
} from './common';
import { defineEntity } from './defineEntity';

export const TEACHING_GROUP_KINDS = ['whole_class', 'set', 'elective', 'combination'] as const;
export const TEACHING_ROLES = ['main', 'assistant'] as const;
export const WEEKDAYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const;

// `display_name` ("Grade 7 Blue", spec 02 §5) is resolved by the lookup layer, never stored (spec 02 §1.3).
export const classGroupSchema = z.strictObject({
  ...entityIdShape,
  ...tenancyShape,
  campus_id: uuid(),
  academic_year_id: uuid(),
  programme_id: uuid(),
  level_id: uuid(),
  name: shortText(100),
  capacity: z.int().min(0).optional(),
  room: z.string().max(100).optional(),
  homeroom_teacher_ids: z.array(uuid()),
  ...auditShape,
});

export type ClassGroup = z.infer<typeof classGroupSchema>;

export const classGroupEntity = defineEntity({
  name: 'class_group',
  schema: classGroupSchema,
  storage: {
    table: 'class_group',
    primaryKey: 'id',
    indexes: ['institution_id', 'campus_id', 'academic_year_id', 'programme_id', 'level_id'],
    unique: [
      ['institution_id', 'campus_id', 'academic_year_id', 'programme_id', 'level_id', 'name'],
    ],
    refs: {
      institution_id: 'institution',
      campus_id: 'campus',
      academic_year_id: 'academic_year',
      programme_id: 'programme',
      level_id: 'level',
    },
    encrypted: [],
  },
  label: (row) => row.name,
});

export const teachingGroupSchema = z.strictObject({
  ...entityIdShape,
  ...tenancyShape,
  campus_id: uuid(),
  academic_year_id: uuid(),
  learning_area_id: uuid(),
  name: shortText(200),
  level_ids: z.array(uuid()),
  class_group_ids: z.array(uuid()),
  teacher_ids: z.array(uuid()),
  kind: z.enum(TEACHING_GROUP_KINDS),
  ...auditShape,
});

export type TeachingGroup = z.infer<typeof teachingGroupSchema>;

export const teachingGroupEntity = defineEntity({
  name: 'teaching_group',
  schema: teachingGroupSchema,
  storage: {
    table: 'teaching_group',
    primaryKey: 'id',
    indexes: [
      'institution_id',
      'campus_id',
      'academic_year_id',
      'learning_area_id',
      'kind',
    ],
    unique: [
      ['institution_id', 'campus_id', 'academic_year_id', 'learning_area_id', 'name'],
    ],
    refs: {
      institution_id: 'institution',
      campus_id: 'campus',
      academic_year_id: 'academic_year',
      learning_area_id: 'learning_area',
    },
    encrypted: [],
  },
  label: (row) => row.name,
});

export const teachingGroupMemberSchema = z
  .strictObject({
    ...entityIdShape,
    ...tenancyShape,
    teaching_group_id: uuid(),
    enrolment_id: uuid(),
    valid_from: isoDate(),
    valid_to: isoDate().nullish(),
    ...auditShape,
  })
  .refine((row) => !row.valid_to || row.valid_to >= row.valid_from, {
    path: ['valid_to'],
    message: 'valid_to must be on or after valid_from',
  });

export type TeachingGroupMember = z.infer<typeof teachingGroupMemberSchema>;

export const teachingGroupMemberEntity = defineEntity({
  name: 'teaching_group_member',
  schema: teachingGroupMemberSchema,
  storage: {
    table: 'teaching_group_member',
    primaryKey: 'id',
    indexes: ['institution_id', 'teaching_group_id', 'enrolment_id', 'valid_to'],
    unique: [['teaching_group_id', 'enrolment_id', 'valid_from']],
    refs: {
      institution_id: 'institution',
      teaching_group_id: 'teaching_group',
      enrolment_id: 'enrolment',
    },
    encrypted: [],
  },
  label: (row) => `${row.teaching_group_id} / ${row.enrolment_id}`,
});

export const teachingAssignmentSchema = z
  .strictObject({
    ...entityIdShape,
    ...tenancyShape,
    staff_id: uuid(),
    teaching_group_id: uuid(),
    role: z.enum(TEACHING_ROLES),
    valid_from: isoDate(),
    valid_to: isoDate().nullish(),
    ...auditShape,
  })
  .refine((row) => !row.valid_to || row.valid_to >= row.valid_from, {
    path: ['valid_to'],
    message: 'valid_to must be on or after valid_from',
  });

export type TeachingAssignment = z.infer<typeof teachingAssignmentSchema>;

export const teachingAssignmentEntity = defineEntity({
  name: 'teaching_assignment',
  schema: teachingAssignmentSchema,
  storage: {
    table: 'teaching_assignment',
    primaryKey: 'id',
    indexes: ['institution_id', 'staff_id', 'teaching_group_id', 'valid_to'],
    unique: [['staff_id', 'teaching_group_id', 'valid_from']],
    refs: {
      institution_id: 'institution',
      staff_id: 'staff',
      teaching_group_id: 'teaching_group',
    },
    encrypted: [],
  },
  label: (row) => `${row.staff_id} / ${row.teaching_group_id}`,
});

export const timetableSlotSchema = z
  .strictObject({
    ...entityIdShape,
    ...tenancyShape,
    day_of_week: z.enum(WEEKDAYS),
    period_number: z.int().min(0).optional(),
    start_time: isoTime(),
    end_time: isoTime(),
    ...auditShape,
  })
  .refine((row) => row.end_time > row.start_time, {
    path: ['end_time'],
    message: 'end_time must be after start_time',
  });

export type TimetableSlot = z.infer<typeof timetableSlotSchema>;

export const timetableSlotEntity = defineEntity({
  name: 'timetable_slot',
  schema: timetableSlotSchema,
  storage: {
    table: 'timetable_slot',
    primaryKey: 'id',
    indexes: ['institution_id', 'day_of_week', 'period_number'],
    unique: [['institution_id', 'day_of_week', 'start_time']],
    refs: { institution_id: 'institution' },
    encrypted: [],
  },
  label: (row) => `${row.day_of_week} ${row.start_time}`,
});

export const timetableEntrySchema = z.strictObject({
  ...entityIdShape,
  ...tenancyShape,
  slot_id: uuid(),
  teaching_group_id: uuid(),
  room: z.string().max(100).optional(),
  ...auditShape,
});

export type TimetableEntry = z.infer<typeof timetableEntrySchema>;

export const timetableEntryEntity = defineEntity({
  name: 'timetable_entry',
  schema: timetableEntrySchema,
  storage: {
    table: 'timetable_entry',
    primaryKey: 'id',
    indexes: ['institution_id', 'slot_id', 'teaching_group_id'],
    unique: [['slot_id', 'teaching_group_id']],
    refs: {
      institution_id: 'institution',
      slot_id: 'timetable_slot',
      teaching_group_id: 'teaching_group',
    },
    encrypted: [],
  },
  label: (row) => `${row.slot_id} ${row.room ?? ''}`.trim(),
});
