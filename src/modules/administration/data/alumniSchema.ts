// ABOUTME: Defines database-agnostic schemas for alumni management entities
// ABOUTME: These schemas extend the student management system with alumni tracking

import * as alumniTypes from './alumniTypes';
import {
  createDatabaseSchema,
  SchemaHelpers,
  type DatabaseSchema,
} from '../../../utils/databaseAgnosticSchema';

export const alumniRecordSchema: DatabaseSchema = createDatabaseSchema({
  title: 'alumni_record',
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: SchemaHelpers.id({ description: 'Unique identifier for the alumni record' }),
    student_id: SchemaHelpers.string({ description: 'Reference to the original student record', maxLength: 50 }),
    admission_number: SchemaHelpers.string({ description: 'Student admission number', maxLength: 50 }),
    first_name: SchemaHelpers.string({ description: 'Alumni first name', maxLength: 100 }),
    last_name: SchemaHelpers.string({ description: 'Alumni last name', maxLength: 100 }),
    other_names: SchemaHelpers.string({ description: 'Other names', maxLength: 200 }),
    gender: SchemaHelpers.string({ description: 'Gender', maxLength: 10 }),
    graduation_year: SchemaHelpers.string({ description: 'Year of graduation', maxLength: 10 }),
    graduation_class_name: SchemaHelpers.string({ description: 'Graduation class name', maxLength: 100 }),
    graduation_stream_name: SchemaHelpers.string({ description: 'Graduation stream name', maxLength: 100 }),
    phone: SchemaHelpers.string({ description: 'Contact phone number', maxLength: 20 }),
    email: SchemaHelpers.string({ description: 'Primary email address', maxLength: 100 }),
    alternative_email: SchemaHelpers.string({ description: 'Alternative email address', maxLength: 100 }),
    current_occupation: SchemaHelpers.string({ description: 'Current job or occupation', maxLength: 200 }),
    employer: SchemaHelpers.string({ description: 'Current employer name', maxLength: 200 }),
    current_city: SchemaHelpers.string({ description: 'Current city of residence', maxLength: 100 }),
    current_country: SchemaHelpers.string({ description: 'Current country of residence', maxLength: 100 }),
    postal_address: SchemaHelpers.string({ description: 'Postal address', maxLength: 500 }),
    engagement_status: SchemaHelpers.string({
      description: 'Current engagement status with the school',
      enum: Object.values(alumniTypes.AlumniEngagementStatus),
      maxLength: 50,
    }),
    alumni_category: SchemaHelpers.string({
      description: 'Alumni classification category',
      enum: Object.values(alumniTypes.AlumniCategory),
      maxLength: 50,
    }),
    is_newsletter_subscribed: SchemaHelpers.boolean({ description: 'Whether subscribed to alumni newsletter' }),
    last_contact_date: SchemaHelpers.string({ description: 'Date of last contact', maxLength: 30 }),
    notes: SchemaHelpers.string({ description: 'Internal notes about the alumni', maxLength: 2000 }),
    created_at: SchemaHelpers.timestamp({ description: 'Record creation timestamp' }),
    updated_at: SchemaHelpers.timestamp({ description: 'Record last update timestamp' }),
  },
  required: ['id', 'student_id', 'first_name', 'last_name', 'graduation_year', 'engagement_status', 'alumni_category', 'created_at', 'updated_at'],
  indexes: ['student_id', 'admission_number', 'graduation_year', 'engagement_status', 'alumni_category', 'last_name', 'email'],
});

export const alumniEngagementSchema: DatabaseSchema = createDatabaseSchema({
  title: 'alumni_engagement',
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: SchemaHelpers.id({ description: 'Unique identifier for the engagement record' }),
    alumni_id: SchemaHelpers.string({ description: 'Reference to the alumni record', maxLength: 50 }),
    engagement_type: SchemaHelpers.string({ description: 'Type of engagement', maxLength: 100 }),
    engagement_date: SchemaHelpers.string({ description: 'Date of engagement', maxLength: 30 }),
    description: SchemaHelpers.string({ description: 'Description of the engagement', maxLength: 2000 }),
    amount: SchemaHelpers.number({ description: 'Monetary amount if applicable' }),
    created_by: SchemaHelpers.string({ description: 'User who created the record', maxLength: 50 }),
    created_at: SchemaHelpers.timestamp({ description: 'Record creation timestamp' }),
  },
  required: ['id', 'alumni_id', 'engagement_type', 'engagement_date', 'created_at'],
  indexes: ['alumni_id', 'engagement_type', 'engagement_date'],
});

export const alumniDonationSchema: DatabaseSchema = createDatabaseSchema({
  title: 'alumni_donation',
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: SchemaHelpers.id({ description: 'Unique identifier for the donation record' }),
    alumni_id: SchemaHelpers.string({ description: 'Reference to the alumni record', maxLength: 50 }),
    alumni_name: SchemaHelpers.string({ description: 'Denormalized alumni name', maxLength: 200 }),
    amount: SchemaHelpers.number({ description: 'Donation amount' }),
    currency: SchemaHelpers.string({ description: 'Currency code', maxLength: 10 }),
    donation_date: SchemaHelpers.string({ description: 'Date of donation', maxLength: 30 }),
    donation_type: SchemaHelpers.string({ description: 'Type of donation', maxLength: 50 }),
    purpose: SchemaHelpers.string({ description: 'Purpose of the donation', maxLength: 500 }),
    receipt_number: SchemaHelpers.string({ description: 'Receipt reference number', maxLength: 100 }),
    is_anonymous: SchemaHelpers.boolean({ description: 'Whether the donation is anonymous' }),
    notes: SchemaHelpers.string({ description: 'Additional notes', maxLength: 2000 }),
    created_at: SchemaHelpers.timestamp({ description: 'Record creation timestamp' }),
  },
  required: ['id', 'alumni_id', 'amount', 'currency', 'donation_date', 'donation_type', 'created_at'],
  indexes: ['alumni_id', 'donation_date', 'donation_type'],
});

export const alumniEventSchema: DatabaseSchema = createDatabaseSchema({
  title: 'alumni_event',
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: SchemaHelpers.id({ description: 'Unique identifier for the event' }),
    title: SchemaHelpers.string({ description: 'Event title', maxLength: 200 }),
    event_type: SchemaHelpers.string({ description: 'Category of event', maxLength: 100 }),
    description: SchemaHelpers.string({ description: 'Event description', maxLength: 3000 }),
    event_date: SchemaHelpers.string({ description: 'Date of the event', maxLength: 30 }),
    venue: SchemaHelpers.string({ description: 'Event venue or location', maxLength: 300 }),
    expected_attendees: SchemaHelpers.number({ description: 'Expected number of attendees' }),
    actual_attendees: SchemaHelpers.number({ description: 'Actual number of attendees' }),
    is_online: SchemaHelpers.boolean({ description: 'Whether the event is online' }),
    registration_deadline: SchemaHelpers.string({ description: 'Registration deadline date', maxLength: 30 }),
    status: SchemaHelpers.string({
      description: 'Event status',
      enum: ['Planned', 'Ongoing', 'Completed', 'Cancelled'],
      maxLength: 20,
    }),
    created_at: SchemaHelpers.timestamp({ description: 'Record creation timestamp' }),
    updated_at: SchemaHelpers.timestamp({ description: 'Record last update timestamp' }),
  },
  required: ['id', 'title', 'event_type', 'event_date', 'status', 'created_at', 'updated_at'],
  indexes: ['event_type', 'event_date', 'status'],
});
