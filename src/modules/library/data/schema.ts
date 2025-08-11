// ABOUTME: Defines database-agnostic schemas for entities specific to the Library module.
// ABOUTME: These schemas are used by database services to create collections.

import * as types from './types';
import {
  createDatabaseSchema,
  SchemaHelpers,
  type DatabaseSchema,
} from '../../../utils/databaseAgnosticSchema';

export const bookCategorySchema: DatabaseSchema = createDatabaseSchema({
    title: 'book_category',
    version: 0,
    primaryKey: 'id',
    type: 'object',
    properties: {
        id: SchemaHelpers.id({ description: 'Unique identifier for the book category' }),
        name: SchemaHelpers.string({ description: 'Category name', maxLength: 100 }),
    },
    required: ['id', 'name'],
    indexes: ['name']
});

export const bookSchema: DatabaseSchema = createDatabaseSchema({
    title: 'book',
    version: 0,
    primaryKey: 'id',
    type: 'object',
    properties: {
        id: SchemaHelpers.id({ description: 'Unique identifier for the book' }),
        category_id: SchemaHelpers.ref('book_categories', { description: 'Reference to book category' }),
        title: SchemaHelpers.string({ description: 'Book title', maxLength: 255 }),
        author: SchemaHelpers.string({ description: 'Book author', maxLength: 200 }),
        publisher: SchemaHelpers.string({ description: 'Book publisher', maxLength: 200 }),
        isbn: SchemaHelpers.string({ description: 'ISBN number', maxLength: 20 }),
        accession_no: SchemaHelpers.string({ description: 'Accession number (often unique)', maxLength: 50 }),
        publication_year: SchemaHelpers.number({ description: 'Publication year', minimum: 1000, maximum: 9999 }),
        edition: SchemaHelpers.string({ description: 'Book edition', maxLength: 50 }),
        purchase_cost: SchemaHelpers.number({ description: 'Purchase cost', minimum: 0, maximum: 999999.99 }),
        status: SchemaHelpers.string({ description: 'Book status', enum: Object.values(types.LibBookStatusEnum), maxLength: 50 }),
        location_shelf: SchemaHelpers.string({ description: 'Shelf location', maxLength: 100 }),
        is_digital: SchemaHelpers.boolean({ description: 'Whether book is digital' }),
        digital_access_url: SchemaHelpers.string({ description: 'Digital access URL', maxLength: 500 }),
        digital_format: SchemaHelpers.string({ description: 'Digital format (e.g., PDF, EPUB)', maxLength: 20 }),
        availability_status: SchemaHelpers.string({ description: 'Availability status', enum: Object.values(types.LibBookAvailabilityStatusEnum), maxLength: 50 }),
        damaged_status: SchemaHelpers.boolean({ description: 'Whether book is damaged' }),
        lost_status: SchemaHelpers.boolean({ description: 'Whether book is lost' }),
        branch_id: SchemaHelpers.string({ description: 'Branch association', maxLength: 100 }),
        created_at: SchemaHelpers.timestamp({ description: 'Record creation timestamp' }),
        updated_at: SchemaHelpers.timestamp({ description: 'Record last update timestamp' }),
        deleted_at: SchemaHelpers.timestamp({ description: 'Record deletion timestamp' }),
        category_name: SchemaHelpers.string({ description: 'Category name (denormalized)', maxLength: 100 }),
    },
    required: ['id', 'title', 'accession_no', 'status', 'created_at', 'updated_at'],
    indexes: ['title', 'author', 'isbn', 'accession_no', 'status', 'category_id', 'branch_id', 'damaged_status', 'lost_status', 'is_digital']
});

export const loanSchema: DatabaseSchema = createDatabaseSchema({
    title: 'loan',
    version: 0,
    primaryKey: 'id',
    type: 'object',
    properties: {
        id: SchemaHelpers.id({ description: 'Unique identifier for the loan' }),
        book_id: SchemaHelpers.ref('books', { description: 'Reference to the book' }),
        user_id: SchemaHelpers.ref('users', { description: 'Reference to the user' }),
        userType: SchemaHelpers.string({ description: 'Type of user', enum: ['Staff', 'Student', 'Parent', 'Supplier'], maxLength: 50 }),
        loan_date: SchemaHelpers.date({ description: 'Date when book was loaned' }),
        due_date: SchemaHelpers.date({ description: 'Date when book is due' }),
        return_date: SchemaHelpers.date({ description: 'Date when book was returned' }),
        extended_due_date: SchemaHelpers.date({ description: 'Extended due date if applicable' }),
        branch_id: SchemaHelpers.string({ description: 'Branch association', maxLength: 100 }),
        created_at: SchemaHelpers.timestamp({ description: 'Record creation timestamp' }),
        updated_at: SchemaHelpers.timestamp({ description: 'Record last update timestamp' }),
        book_title: SchemaHelpers.string({ description: 'Book title (denormalized)', maxLength: 255 }),
        user_name: SchemaHelpers.string({ description: 'User name (denormalized)', maxLength: 200 }),
    },
    required: ['id', 'book_id', 'user_id', 'loan_date', 'due_date', 'created_at', 'updated_at'],
    indexes: ['book_id', 'user_id', 'due_date', 'return_date', 'branch_id']
});

export const fineSchema: DatabaseSchema = createDatabaseSchema({
    title: 'fine',
    version: 0,
    primaryKey: 'id',
    type: 'object',
    properties: {
        id: SchemaHelpers.id({ description: 'Unique identifier for the fine' }),
        loan_id: SchemaHelpers.ref('loans', { description: 'Reference to the loan' }),
        user_id: SchemaHelpers.ref('users', { description: 'Reference to the user' }),
        fine_amount: SchemaHelpers.number({ description: 'Fine amount', minimum: 0, maximum: 999999.99 }),
        paid_amount: SchemaHelpers.number({ description: 'Amount paid', minimum: 0, maximum: 999999.99 }),
        status: SchemaHelpers.string({ description: 'Fine status', enum: Object.values(types.LibFineStatusEnum), maxLength: 50 }),
        reason: SchemaHelpers.string({ description: 'Reason for fine', maxLength: 255 }),
        fine_date: SchemaHelpers.date({ description: 'Date when fine was issued' }),
        paid_date: SchemaHelpers.date({ description: 'Date when fine was paid' }),
        waived_date: SchemaHelpers.date({ description: 'Date when fine was waived' }),
        waived_by: SchemaHelpers.string({ description: 'Who waived the fine', maxLength: 100 }),
        notes: SchemaHelpers.string({ description: 'Additional notes', maxLength: 500 }),
        branch_id: SchemaHelpers.string({ description: 'Branch association', maxLength: 100 }),
        created_at: SchemaHelpers.timestamp({ description: 'Record creation timestamp' }),
        updated_at: SchemaHelpers.timestamp({ description: 'Record last update timestamp' }),
        user_name: SchemaHelpers.string({ description: 'User name (denormalized)', maxLength: 200 }),
        book_title: SchemaHelpers.string({ description: 'Book title (denormalized)', maxLength: 255 }),
    },
    required: ['id', 'loan_id', 'user_id', 'fine_amount', 'status', 'fine_date', 'created_at', 'updated_at'],
    indexes: ['loan_id', 'user_id', 'status', 'fine_date', 'paid_date', 'branch_id']
});
