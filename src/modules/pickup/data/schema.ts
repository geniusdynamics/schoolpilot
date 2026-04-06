// ABOUTME: Defines database-agnostic schemas for the Pickup module

import {
  createDatabaseSchema,
  SchemaHelpers,
  type DatabaseSchema,
} from '../../../utils/databaseAgnosticSchema';
import { PickupCodeStatus } from './types';

export const pickupCodeSchema: DatabaseSchema = createDatabaseSchema({
  title: 'pickup_code',
  primaryKey: 'id',
  properties: {
    id: SchemaHelpers.string({ description: 'Unique identifier', maxLength: 100 }),
    student_id: SchemaHelpers.ref('students', { description: 'Reference to student', maxLength: 100 }),
    code: SchemaHelpers.string({ description: 'Pickup code', maxLength: 20 }),
    qr_data: SchemaHelpers.string({ description: 'QR code data', maxLength: 500 }),
    status: SchemaHelpers.string({ description: 'Code status', enum: Object.values(PickupCodeStatus), maxLength: 20 }),
    generated_at: SchemaHelpers.timestamp({ description: 'Generation timestamp' }),
    expires_at: SchemaHelpers.timestamp({ description: 'Expiration timestamp' }),
    used_at: SchemaHelpers.timestamp({ description: 'Usage timestamp' }),
    used_by: SchemaHelpers.string({ description: 'Person who picked up', maxLength: 200 }),
    verified_by: SchemaHelpers.ref('staff', { description: 'Verifier ID', maxLength: 100 }),
    created_at: SchemaHelpers.timestamp({ description: 'Creation timestamp' }),
    updated_at: SchemaHelpers.timestamp({ description: 'Last update timestamp' }),
    student_name: SchemaHelpers.string({ description: 'Student name (computed)', maxLength: 200 }),
    class_stream_name: SchemaHelpers.string({ description: 'Class stream name (computed)', maxLength: 150 }),
    verified_by_name: SchemaHelpers.string({ description: 'Verifier name (computed)', maxLength: 200 }),
  },
  required: ['id', 'student_id', 'code', 'status', 'generated_at', 'expires_at', 'created_at', 'updated_at'],
  indexes: ['student_id', 'code', 'status', 'expires_at'],
});

export const authorizedPersonSchema: DatabaseSchema = createDatabaseSchema({
  title: 'authorized_person',
  primaryKey: 'id',
  properties: {
    id: SchemaHelpers.string({ description: 'Unique identifier', maxLength: 100 }),
    student_id: SchemaHelpers.ref('students', { description: 'Reference to student', maxLength: 100 }),
    first_name: SchemaHelpers.string({ description: 'First name', maxLength: 100 }),
    last_name: SchemaHelpers.string({ description: 'Last name', maxLength: 100 }),
    relationship: SchemaHelpers.string({ description: 'Relationship to student', maxLength: 50 }),
    phone: SchemaHelpers.string({ description: 'Phone number', maxLength: 30 }),
    email: SchemaHelpers.string({ description: 'Email address', maxLength: 255 }),
    photo_url: SchemaHelpers.string({ description: 'Photo URL', maxLength: 500 }),
    id_document_type: SchemaHelpers.string({ description: 'ID document type', maxLength: 50 }),
    id_document_number: SchemaHelpers.string({ description: 'ID document number', maxLength: 50 }),
    is_primary: SchemaHelpers.boolean({ description: 'Is primary contact', default: false }),
    is_active: SchemaHelpers.boolean({ description: 'Is active', default: true }),
    created_at: SchemaHelpers.timestamp({ description: 'Creation timestamp' }),
    updated_at: SchemaHelpers.timestamp({ description: 'Last update timestamp' }),
    student_name: SchemaHelpers.string({ description: 'Student name (computed)', maxLength: 200 }),
  },
  required: ['id', 'student_id', 'first_name', 'last_name', 'relationship', 'phone', 'is_primary', 'is_active', 'created_at', 'updated_at'],
  indexes: ['student_id', 'phone', 'is_active'],
});

export const studentAuthorizationSchema: DatabaseSchema = createDatabaseSchema({
  title: 'student_authorization',
  primaryKey: 'id',
  properties: {
    id: SchemaHelpers.string({ description: 'Unique identifier', maxLength: 100 }),
    student_id: SchemaHelpers.ref('students', { description: 'Reference to student', maxLength: 100 }),
    authorized_person_ids: SchemaHelpers.array(SchemaHelpers.string({ maxLength: 100 }), { description: 'References to authorized persons', default: [] }),
    special_instructions: SchemaHelpers.string({ description: 'Special pickup instructions', maxLength: 1000 }),
    restrictions: SchemaHelpers.string({ description: 'Pickup restrictions', maxLength: 500 }),
    created_by: SchemaHelpers.ref('users', { description: 'Creator ID', maxLength: 100 }),
    created_at: SchemaHelpers.timestamp({ description: 'Creation timestamp' }),
    updated_at: SchemaHelpers.timestamp({ description: 'Last update timestamp' }),
    student_name: SchemaHelpers.string({ description: 'Student name (computed)', maxLength: 200 }),
    class_stream_name: SchemaHelpers.string({ description: 'Class stream name (computed)', maxLength: 150 }),
    created_by_name: SchemaHelpers.string({ description: 'Creator name (computed)', maxLength: 200 }),
  },
  required: ['id', 'student_id', 'authorized_person_ids', 'created_by', 'created_at', 'updated_at'],
  indexes: ['student_id', 'created_by'],
});

export const pickupLogSchema: DatabaseSchema = createDatabaseSchema({
  title: 'pickup_log',
  primaryKey: 'id',
  properties: {
    id: SchemaHelpers.string({ description: 'Unique identifier', maxLength: 100 }),
    student_id: SchemaHelpers.ref('students', { description: 'Reference to student', maxLength: 100 }),
    pickup_code_id: SchemaHelpers.ref('pickup_codes', { description: 'Reference to pickup code', maxLength: 100 }),
    authorized_person_id: SchemaHelpers.string({ description: 'Authorized person ID', maxLength: 100 }),
    authorized_person_name: SchemaHelpers.string({ description: 'Authorized person name', maxLength: 200 }),
    relationship: SchemaHelpers.string({ description: 'Relationship to student', maxLength: 50 }),
    pickup_time: SchemaHelpers.timestamp({ description: 'Pickup time' }),
    pickup_date: SchemaHelpers.timestamp({ description: 'Pickup date' }),
    verified_by: SchemaHelpers.ref('staff', { description: 'Verifier ID', maxLength: 100 }),
    method: SchemaHelpers.string({ description: 'Verification method', enum: ['qr_scan', 'code_entry', 'manual'], maxLength: 20 }),
    notes: SchemaHelpers.string({ description: 'Additional notes', maxLength: 500 }),
    created_at: SchemaHelpers.timestamp({ description: 'Creation timestamp' }),
    student_name: SchemaHelpers.string({ description: 'Student name (computed)', maxLength: 200 }),
    class_stream_name: SchemaHelpers.string({ description: 'Class stream name (computed)', maxLength: 150 }),
    verified_by_name: SchemaHelpers.string({ description: 'Verifier name (computed)', maxLength: 200 }),
  },
  required: ['id', 'student_id', 'authorized_person_id', 'authorized_person_name', 'relationship', 'pickup_time', 'pickup_date', 'verified_by', 'method', 'created_at'],
  indexes: ['student_id', 'pickup_date', 'authorized_person_id', 'verified_by'],
});
