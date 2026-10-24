// ABOUTME: Canonical attendance and pastoral schemas from spec 02 §9: registers and their
// ABOUTME: marks, leave-outs, conduct incidents and health visits, with the §9 refinements.

import { z } from 'zod/v4';

import {
  auditShape,
  entityIdShape,
  isoDate,
  isoDateTime,
  shortText,
  tenancyShape,
  uuid,
} from './common';
import { defineEntity } from './defineEntity';

/** The kind of register a session holds (spec 02 §9). */
export const ATTENDANCE_SESSION_KINDS = ['am', 'pm', 'day', 'period_n', 'roll_call'] as const;

/** How a learner was counted in a register (spec 02 §9). */
export const ATTENDANCE_STATUSES = [
  'present',
  'absent',
  'late',
  'excused',
  'medical',
  'exeat',
  'suspended',
] as const;

/**
 * Why a learner was not in the session. Spec 04 §5.1 asks for "reason codes" but lists none;
 * this value list is the deviation recorded in `index.ts`.
 */
export const ATTENDANCE_REASONS = [
  'illness',
  'medical_appointment',
  'family_emergency',
  'transport',
  'religious_holiday',
  'official_business',
  'other',
] as const;

/** The kind of leave-out (exeat) (spec 02 §9). */
export const LEAVE_OUT_KINDS = ['exeat', 'half_term', 'medical', 'disciplinary'] as const;

/**
 * What kind of incident was recorded (spec 02 §9). The spec names the field but not its
 * values, and 04 §5.3 enumerates the ACTIONS taken (counselling, detention, parent meeting,
 * suspension), not categories; this list is the deviation recorded in `index.ts`.
 */
export const CONDUCT_INCIDENT_CATEGORIES = [
  'behaviour',
  'bullying',
  'theft',
  'violence',
  'substance_use',
  'academic_misconduct',
  'property_damage',
  'other',
] as const;

export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];

/** Statuses that mean the learner did not attend; each of them needs a reason. */
export const ATTENDANCE_ABSENCE_STATUSES: readonly AttendanceStatus[] = [
  'absent',
  'excused',
  'medical',
  'exeat',
  'suspended',
];

export const attendanceSessionSchema = z
  .strictObject({
    ...entityIdShape,
    ...tenancyShape,
    // The period a register was taken in. Optional: a register for a date no academic period
    // covers must still be writable (P1-A03a review).
    academic_period_id: uuid().optional(),
    date: isoDate(),
    session: z.enum(ATTENDANCE_SESSION_KINDS),
    // The lesson a per-lesson register belongs to; mirrors timetable_slot.period_number.
    period_number: z.int().min(0).optional(),
    // A register covers one scope: a class group, a teaching group or a residence.
    class_group_id: uuid().optional(),
    teaching_group_id: uuid().optional(),
    residence_id: uuid().optional(),
    taken_by: uuid(),
    taken_at: isoDateTime(),
    locked: z.boolean(),
    ...auditShape,
  })
  .refine(
    (row) =>
      [row.class_group_id, row.teaching_group_id, row.residence_id].filter(
        (scope) => scope !== undefined
      ).length === 1,
    {
      path: ['class_group_id'],
      message: 'exactly one of class_group_id, teaching_group_id or residence_id is required',
    }
  )
  .refine((row) => row.session !== 'period_n' || row.period_number !== undefined, {
    path: ['period_number'],
    message: 'period_number is required for a period_n session',
  });

export type AttendanceSession = z.infer<typeof attendanceSessionSchema>;

export const attendanceSessionEntity = defineEntity({
  name: 'attendance_session',
  schema: attendanceSessionSchema,
  storage: {
    table: 'attendance_session',
    primaryKey: 'id',
    indexes: [
      'institution_id',
      'academic_period_id',
      'date',
      'period_number',
      'class_group_id',
      'teaching_group_id',
      'residence_id',
    ],
    // One register per scope, date, session and lesson. SQLite treats NULLs as distinct, so
    // each scope needs two partial indexes: one for the registers that name a lesson and one
    // for the registers that do not (the trap `mark` hit on its NULL component).
    unique: [
      {
        columns: ['institution_id', 'class_group_id', 'date', 'session', 'period_number'],
        where: 'class_group_id IS NOT NULL AND period_number IS NOT NULL',
      },
      {
        columns: ['institution_id', 'class_group_id', 'date', 'session'],
        where: 'class_group_id IS NOT NULL AND period_number IS NULL',
      },
      {
        columns: ['institution_id', 'teaching_group_id', 'date', 'session', 'period_number'],
        where: 'teaching_group_id IS NOT NULL AND period_number IS NOT NULL',
      },
      {
        columns: ['institution_id', 'teaching_group_id', 'date', 'session'],
        where: 'teaching_group_id IS NOT NULL AND period_number IS NULL',
      },
      {
        columns: ['institution_id', 'residence_id', 'date', 'session', 'period_number'],
        where: 'residence_id IS NOT NULL AND period_number IS NOT NULL',
      },
      {
        columns: ['institution_id', 'residence_id', 'date', 'session'],
        where: 'residence_id IS NOT NULL AND period_number IS NULL',
      },
    ],
    refs: {
      institution_id: 'institution',
      academic_period_id: 'academic_period',
      class_group_id: 'class_group',
      teaching_group_id: 'teaching_group',
      residence_id: 'residence',
      taken_by: 'staff',
    },
    encrypted: [],
  },
  label: (row) => `${row.session} · ${row.date}`,
});

export const attendanceMarkSchema = z
  .strictObject({
    ...entityIdShape,
    ...tenancyShape,
    attendance_session_id: uuid(),
    learner_id: uuid(),
    status: z.enum(ATTENDANCE_STATUSES),
    minutes_late: z.int().min(1).optional(),
    reason: z.enum(ATTENDANCE_REASONS).optional(),
    notified_guardian_at: isoDateTime().nullish(),
    ...auditShape,
  })
  .refine((row) => !ATTENDANCE_ABSENCE_STATUSES.includes(row.status) || row.reason !== undefined, {
    path: ['reason'],
    message: 'reason is required when the learner did not attend the session',
  })
  .refine((row) => row.status !== 'late' || row.minutes_late !== undefined, {
    path: ['minutes_late'],
    message: 'minutes_late is required for a late mark',
  });

export type AttendanceMark = z.infer<typeof attendanceMarkSchema>;

export const attendanceMarkEntity = defineEntity({
  name: 'attendance_mark',
  schema: attendanceMarkSchema,
  storage: {
    table: 'attendance_mark',
    primaryKey: 'id',
    indexes: ['institution_id', 'attendance_session_id', 'learner_id', 'status'],
    unique: [['attendance_session_id', 'learner_id']],
    refs: {
      institution_id: 'institution',
      attendance_session_id: 'attendance_session',
      learner_id: 'learner',
    },
    encrypted: [],
  },
  label: (row) => `${row.status} · ${row.learner_id}`,
});

export const leaveOutSchema = z
  .strictObject({
    ...entityIdShape,
    ...tenancyShape,
    learner_id: uuid(),
    kind: z.enum(LEAVE_OUT_KINDS),
    out_at: isoDateTime(),
    due_back_at: isoDateTime(),
    returned_at: isoDateTime().nullish(),
    authorised_by: uuid(),
    collected_by_guardian_id: uuid().nullish(),
    ...auditShape,
  })
  .refine((row) => row.due_back_at >= row.out_at, {
    path: ['due_back_at'],
    message: 'due_back_at must be on or after out_at',
  })
  .refine((row) => !row.returned_at || row.returned_at >= row.out_at, {
    path: ['returned_at'],
    message: 'returned_at must be on or after out_at',
  });

export type LeaveOut = z.infer<typeof leaveOutSchema>;

export const leaveOutEntity = defineEntity({
  name: 'leave_out',
  schema: leaveOutSchema,
  storage: {
    table: 'leave_out',
    primaryKey: 'id',
    indexes: ['institution_id', 'learner_id', 'kind', 'out_at'],
    unique: [['learner_id', 'out_at']],
    refs: {
      institution_id: 'institution',
      learner_id: 'learner',
      authorised_by: 'staff',
      collected_by_guardian_id: 'guardian',
    },
    encrypted: [],
  },
  label: (row) => `${row.kind} · ${row.learner_id}`,
});

export const conductIncidentSchema = z.strictObject({
  ...entityIdShape,
  ...tenancyShape,
  learner_id: uuid(),
  date: isoDate(),
  category: z.enum(CONDUCT_INCIDENT_CATEGORIES),
  description: shortText(2000),
  action: shortText(1000).optional(),
  points: z.int().optional(),
  guardian_informed_at: isoDateTime().nullish(),
  confidential: z.boolean(),
  ...auditShape,
});

export type ConductIncident = z.infer<typeof conductIncidentSchema>;

export const conductIncidentEntity = defineEntity({
  name: 'conduct_incident',
  schema: conductIncidentSchema,
  storage: {
    table: 'conduct_incident',
    primaryKey: 'id',
    indexes: ['institution_id', 'learner_id', 'date', 'category'],
    // A learner can have several incidents on one day; they are not duplicates.
    unique: [],
    refs: {
      institution_id: 'institution',
      learner_id: 'learner',
    },
    // A conduct incident is a safeguarding record (spec 06 §8.1): its narrative is sealed at rest
    // and access-logged, while the category, the date and the learner stay queryable.
    encrypted: ['description', 'action'],
  },
  label: (row) => `${row.category} · ${row.date}`,
});

export const healthVisitSchema = z.strictObject({
  ...entityIdShape,
  ...tenancyShape,
  learner_id: uuid(),
  date: isoDate(),
  complaint: shortText(2000),
  treatment: shortText(2000).optional(),
  referred: z.boolean(),
  recorded_by: uuid(),
  ...auditShape,
});

export type HealthVisit = z.infer<typeof healthVisitSchema>;

export const healthVisitEntity = defineEntity({
  name: 'health_visit',
  schema: healthVisitSchema,
  storage: {
    table: 'health_visit',
    primaryKey: 'id',
    indexes: ['institution_id', 'learner_id', 'date'],
    unique: [],
    refs: {
      institution_id: 'institution',
      learner_id: 'learner',
      recorded_by: 'staff',
    },
    // Clinical detail is sensitive: keep it encrypted at rest like learner.medical.
    encrypted: ['complaint', 'treatment'],
  },
  label: (row) => `${row.date} · ${row.learner_id}`,
});
