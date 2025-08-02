// ABOUTME: Defines RxDB JSON schemas for entities specific to the Library module.
// ABOUTME: These schemas are used by rxdbService.ts to create collections.

import { RxJsonSchema } from 'rxdb';
import * as types from './types';
import { createEntitySchema } from '../../../utils/schemaUtils';

export const bookCategorySchema: RxJsonSchema<types.LibBookCategoryType> = createEntitySchema<types.LibBookCategoryType>(
    'book_category',
    {
        id: { type: 'string' },
        name: { type: 'string', maxLength: 100 },
    },
    { key: 'id', type: 'string' },
    ['id', 'name'],
    ['name']
);

export const bookSchema: RxJsonSchema<types.LibBookType> = createEntitySchema<types.LibBookType>(
    'book',
    {
        id: { type: 'string', maxLength: 100, final: true },
        category_id: { type: ['string', 'null'], ref: 'book_categories' },
        title: { type: 'string', maxLength: 255 },
        author: { type: ['string', 'null'], maxLength: 200 },
        publisher: { type: ['string', 'null'], maxLength: 200 },
        isbn: { type: ['string', 'null'], maxLength: 20 },
        accession_no: { type: 'string', maxLength: 50, final: true }, // Often unique
        publication_year: { type: ['number', 'null'], multipleOf: 1, minimum: 1000, maximum: 9999 },
        edition: { type: ['string', 'null'], maxLength: 50 },
        purchase_cost: { type: ['number', 'null'], multipleOf: 0.01, minimum: 0, maximum: 999999.99 },
        status: { type: 'string', enum: Object.values(types.LibBookStatusEnum), maxLength: 50 },
        location_shelf: { type: ['string', 'null'], maxLength: 100 },
        is_digital: { type: 'boolean', default: false }, // New field for digital resources
        digital_access_url: { type: ['string', 'null'], maxLength: 500 }, // New field for digital resources
        digital_format: { type: ['string', 'null'], maxLength: 20 }, // New field for digital resources (e.g., 'PDF', 'EPUB')
        availability_status: { type: 'string', enum: Object.values(types.LibBookAvailabilityStatusEnum), default: 'available', maxLength: 50 }, // New field for advanced search (e.g., 'available', 'on-loan', 'reserved')
        damaged_status: { type: 'boolean', default: false }, // New field for damaged books
        lost_status: { type: 'boolean', default: false }, // New field for lost books
        branch_id: { type: ['string', 'null'], maxLength: 100 }, // New field for branch association
        created_at: { type: 'string', format: 'date-time', maxLength: 50 },
        updated_at: { type: 'string', format: 'date-time', maxLength: 50 },
        deleted_at: { type: ['string', 'null'], format: 'date-time', maxLength: 50 },
        category_name: { type: ['string', 'null'], maxLength: 100 },
    },
    { key: 'id', type: 'string' },
    ['id', 'title', 'accession_no', 'status', 'created_at', 'updated_at'],
        ['title', 'author', 'isbn', 'accession_no', 'status', 'category_id', 'branch_id', 'damaged_status', 'lost_status', 'is_digital']
);

export const loanSchema: RxJsonSchema<types.LibLoanType> = createEntitySchema<types.LibLoanType>(
    'loan',
    {
        id: { type: 'string', maxLength: 100, final: true },
        book_id: { type: 'string', ref: 'books', maxLength: 100 },
        user_id: { type: 'string', ref: 'users', maxLength: 100 }, // Refers to core User table
        userType: { type: 'string', enum: ['Staff', 'Student', 'Parent', 'Supplier'], maxLength: 50 },
        loan_date: { type: 'string', format: 'date', maxLength: 20 },
        due_date: { type: 'string', format: 'date', maxLength: 20 },
        return_date: { type: ['string', 'null'], format: 'date', maxLength: 20 },
        extended_due_date: { type: ['string', 'null'], format: 'date', maxLength: 20 },
        branch_id: { type: ['string', 'null'], maxLength: 100 }, // New field for branch association
        created_at: { type: 'string', format: 'date-time', maxLength: 50 },
        updated_at: { type: 'string', format: 'date-time', maxLength: 50 },
        book_title: { type: ['string', 'null'], maxLength: 255 },
        user_name: { type: ['string', 'null'], maxLength: 200 },
    },
    { key: 'id', type: 'string' },
    ['id', 'book_id', 'user_id', 'loan_date', 'due_date', 'created_at', 'updated_at'],
        ['book_id', 'user_id', 'due_date', 'return_date', 'branch_id']
);

export const fineSchema: RxJsonSchema<types.LibFineType> = createEntitySchema<types.LibFineType>(
    'fine',
    {
        id: { type: 'string', maxLength: 100, final: true },
        loan_id: { type: 'string', ref: 'loans', maxLength: 100 },
        amount: { type: 'number', multipleOf: 0.01, minimum: 0, maximum: 999999.99 },
        status: { type: 'string', enum: Object.values(types.LibFineStatusEnum), maxLength: 50 },
        reason: { type: ['string', 'null'], maxLength: 500 },
        fee_adjustment_id: { type: ['string', 'null'], maxLength: 100 /* ref: 'fee_adjustments' */ }, // If linking to finance
        paid_date: { type: ['string', 'null'], format: 'date', maxLength: 20 },
        payment_reference: { type: ['string', 'null'], maxLength: 100 },
        created_at: { type: 'string', format: 'date-time', maxLength: 50 },
        updated_at: { type: 'string', format: 'date-time', maxLength: 50 },
        book_title: { type: ['string', 'null'], maxLength: 255 },
        user_name: { type: ['string', 'null'], maxLength: 200 },
        loan_due_date: { type: ['string', 'null'], format: 'date', maxLength: 20 },
    },
    { key: 'id', type: 'string' },
    ['id', 'loan_id', 'amount', 'status', 'created_at', 'updated_at'],
    ['loan_id', 'status']
);
