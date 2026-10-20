// ABOUTME: Canonical calendar schemas from spec 02 §3: calendars, academic years and periods,
// ABOUTME: calendar events and independent financial years, with date-order refinements.

import { z } from 'zod/v4';

import { auditShape, entityIdShape, isoDate, shortText, tenancyShape, uuid } from './common';
import { defineEntity } from './defineEntity';

export const CALENDAR_YEAR_STATUSES = ['planned', 'current', 'closed'] as const;
export const ACADEMIC_PERIOD_KINDS = [
  'term',
  'semester',
  'trimester',
  'half_term',
  'quarter',
] as const;
export const CALENDAR_EVENT_KINDS = [
  'holiday',
  'mid_term_break',
  'exam_window',
  'opening_day',
  'closing_day',
  'staff_day',
  'event',
] as const;

export const calendarSchema = z.strictObject({
  ...entityIdShape,
  ...tenancyShape,
  name: shortText(200),
  programme_ids: z.array(uuid()),
  ...auditShape,
});

export type Calendar = z.infer<typeof calendarSchema>;

export const calendarEntity = defineEntity({
  name: 'calendar',
  schema: calendarSchema,
  storage: {
    table: 'calendar',
    primaryKey: 'id',
    indexes: ['institution_id', 'name'],
    unique: [['institution_id', 'name']],
    refs: { institution_id: 'institution' },
    encrypted: [],
  },
  label: (row) => row.name,
});

export const academicYearSchema = z
  .strictObject({
    ...entityIdShape,
    ...tenancyShape,
    calendar_id: uuid(),
    name: shortText(50),
    start_date: isoDate(),
    end_date: isoDate(),
    status: z.enum(CALENDAR_YEAR_STATUSES),
    financial_year_id: uuid().optional(),
    ...auditShape,
  })
  .refine((row) => row.end_date >= row.start_date, {
    path: ['end_date'],
    message: 'end_date must be on or after start_date',
  });

export type AcademicYear = z.infer<typeof academicYearSchema>;

export const academicYearEntity = defineEntity({
  name: 'academic_year',
  schema: academicYearSchema,
  storage: {
    table: 'academic_year',
    primaryKey: 'id',
    indexes: ['institution_id', 'calendar_id', 'status', 'financial_year_id'],
    unique: [['calendar_id', 'name']],
    refs: {
      institution_id: 'institution',
      calendar_id: 'calendar',
      financial_year_id: 'financial_year',
    },
    encrypted: [],
  },
  label: (row) => row.name,
});

export const academicPeriodSchema = z
  .strictObject({
    ...entityIdShape,
    ...tenancyShape,
    academic_year_id: uuid(),
    kind: z.enum(ACADEMIC_PERIOD_KINDS),
    sequence: z.int().min(0),
    name: shortText(100),
    start_date: isoDate(),
    end_date: isoDate(),
    parent_period_id: uuid().optional(),
    is_reporting: z.boolean(),
    is_billing: z.boolean(),
    status: z.enum(CALENDAR_YEAR_STATUSES),
    ...auditShape,
  })
  .refine((row) => row.end_date >= row.start_date, {
    path: ['end_date'],
    message: 'end_date must be on or after start_date',
  });

export type AcademicPeriod = z.infer<typeof academicPeriodSchema>;

export const academicPeriodEntity = defineEntity({
  name: 'academic_period',
  schema: academicPeriodSchema,
  storage: {
    table: 'academic_period',
    primaryKey: 'id',
    indexes: ['institution_id', 'academic_year_id', 'parent_period_id', 'status'],
    unique: [['academic_year_id', 'kind', 'sequence']],
    refs: {
      institution_id: 'institution',
      academic_year_id: 'academic_year',
      parent_period_id: 'academic_period',
    },
    encrypted: [],
  },
  label: (row) => row.name,
});

export const calendarEventSchema = z
  .strictObject({
    ...entityIdShape,
    ...tenancyShape,
    calendar_id: uuid(),
    kind: z.enum(CALENDAR_EVENT_KINDS),
    start_date: isoDate(),
    end_date: isoDate(),
    affects_attendance: z.boolean(),
    ...auditShape,
  })
  .refine((row) => row.end_date >= row.start_date, {
    path: ['end_date'],
    message: 'end_date must be on or after start_date',
  });

export type CalendarEvent = z.infer<typeof calendarEventSchema>;

export const calendarEventEntity = defineEntity({
  name: 'calendar_event',
  schema: calendarEventSchema,
  storage: {
    table: 'calendar_event',
    primaryKey: 'id',
    indexes: ['institution_id', 'calendar_id', 'kind', 'start_date'],
    unique: [],
    refs: { institution_id: 'institution', calendar_id: 'calendar' },
    encrypted: [],
  },
  label: (row) => `${row.kind} ${row.start_date}`,
});

export const financialYearSchema = z
  .strictObject({
    ...entityIdShape,
    ...tenancyShape,
    name: shortText(50),
    start_date: isoDate(),
    end_date: isoDate(),
    status: z.enum(CALENDAR_YEAR_STATUSES),
    ...auditShape,
  })
  .refine((row) => row.end_date >= row.start_date, {
    path: ['end_date'],
    message: 'end_date must be on or after start_date',
  });

export type FinancialYear = z.infer<typeof financialYearSchema>;

export const financialYearEntity = defineEntity({
  name: 'financial_year',
  schema: financialYearSchema,
  storage: {
    table: 'financial_year',
    primaryKey: 'id',
    indexes: ['institution_id', 'status'],
    unique: [['institution_id', 'name']],
    refs: { institution_id: 'institution' },
    encrypted: [],
  },
  label: (row) => row.name,
});
