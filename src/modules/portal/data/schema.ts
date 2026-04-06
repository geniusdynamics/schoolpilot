// ABOUTME: Defines database-agnostic schemas for the Portal module
// ABOUTME: The Portal module does NOT create new collections - it reads from existing ones
// ABOUTME: This file exports an empty collections object for consistency with other modules

import { createDatabaseSchema, SchemaHelpers } from '../../../utils/databaseAgnosticSchema';

// The Portal module does not define its own collections.
// It reads from existing collections: students, staff, parents_guardians,
// student_attendance, student_exam_results, student_invoices, student_payments, etc.

export const portalCollections = {};
