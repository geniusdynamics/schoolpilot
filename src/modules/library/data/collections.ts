// ABOUTME: Defines the RxDB collection configurations for the Library module.
// ABOUTME: Module collection definitions - used by UnifiedDatabaseManager

import * as schemas from './schema';
import { createDatabaseSchema, type DatabaseSchema } from '@/utils/databaseAgnosticSchema';

// Borrowers registered with the library: a learner or a staff member.
const libraryMemberSchema: DatabaseSchema = createDatabaseSchema({
  title: 'library_member',
  properties: {
    id: { type: 'string', maxLength: 100 },
    member_type: { type: 'string', enum: ['student', 'staff'] },
    student_id: { type: 'ref', ref: 'students', nullable: true, maxLength: 100 },
    staff_id: { type: 'ref', ref: 'staff', nullable: true, maxLength: 100 },
    membership_no: { type: 'string', maxLength: 50 },
    status: { type: 'string', enum: ['active', 'suspended', 'expired'] },
    max_loans: { type: 'integer', minimum: 0, maximum: 999 },
    joined_on: { type: 'string', maxLength: 50 },
    expires_on: { type: 'string', nullable: true, maxLength: 50 },
    created_at: { type: 'string', format: 'date-time' },
    updated_at: { type: 'string', format: 'date-time' }
  },
  primaryKey: 'id',
  required: ['id', 'member_type', 'membership_no', 'status', 'created_at', 'updated_at'],
  indexes: ['member_type', 'student_id', 'staff_id', 'membership_no']
});

export const libraryCollections = {
  book_categories: {
    schema: schemas.bookCategorySchema,
  },
  books: {
    schema: schemas.bookSchema,
  },
  loans: {
    schema: schemas.loanSchema,
  },
  // Alias of `loans` (same schema) for call sites still using the old name; remove once they read `loans` (P0-B05).
  book_loans: {
    schema: schemas.loanSchema,
  },
  library_members: {
    schema: libraryMemberSchema,
  },
  fines: {
    schema: schemas.fineSchema,
  },
};

// Type helper for consumers of this module's collections (optional)
export type LibraryCollections = typeof libraryCollections;
