// ABOUTME: Defines RxDB JSON schemas for entities specific to the Library module.
// ABOUTME: These schemas are used by rxdbService.ts to create collections.

import { RxJsonSchema } from 'rxdb';
import * as types from './types';
import { createEntitySchema } from '../../../services/rxdbService';
import { UserType } from '../../../types'; // For Loan.user_type

export const bookCategorySchema: RxJsonSchema<types.LibBookCategoryType> = createEntitySchema<types.LibBookCategoryType>(
    'book_category',
    {
        id: { type: 'number' },
        name: { type: 'string', maxLength: 100 },
    },
    { key: 'id', type: 'number' },
    ['id', 'name'],
    ['name']
);

export const bookSchema: RxJsonSchema<types.LibBookType> = createEntitySchema<types.LibBookType>(
    'book',
    {
        id: { type: 'string', maxLength: 100, final: true },
        category_id: { type: ['number', 'null'], ref: 'book_categories' },
        title: { type: 'string', maxLength: 255 },
        author: { type: ['string', 'null'] },
        publisher: { type: ['string', 'null'] },
        isbn: { type: ['string', 'null'], maxLength: 20 },
        accession_no: { type: 'string', maxLength: 50, final: true }, // Often unique
        publication_year: { type: ['number', 'null'] },
        edition: { type: ['string', 'null'] },
        purchase_cost: { type: ['number', 'null'] },
        status: { type: 'string', enum: Object.values(types.LibBookStatusEnum) },
        location_shelf: { type: ['string', 'null'] },
        created_at: { type: 'string', format: 'date-time' },
        updated_at: { type: 'string', format: 'date-time' },
        deleted_at: { type: ['string', 'null'], format: 'date-time' },
        category_name: { type: ['string', 'null'] },
    },
    { key: 'id', type: 'string' },
    ['id', 'title', 'accession_no', 'status', 'created_at', 'updated_at'],
    ['title', 'author', 'isbn', 'accession_no', 'status', 'category_id']
);

export const loanSchema: RxJsonSchema<types.LibLoanType> = createEntitySchema<types.LibLoanType>(
    'loan',
    {
        id: { type: 'string', maxLength: 100, final: true },
        book_id: { type: 'string', ref: 'books' },
        user_id: { type: 'string', ref: 'users' }, // Refers to core User table
        user_type: { type: 'string', enum: Object.values(UserType) },
        loan_date: { type: 'string', format: 'date' },
        due_date: { type: 'string', format: 'date' },
        return_date: { type: ['string', 'null'], format: 'date' },
        extended_due_date: { type: ['string', 'null'], format: 'date' },
        created_at: { type: 'string', format: 'date-time' },
        updated_at: { type: 'string', format: 'date-time' },
        book_title: { type: ['string', 'null'] },
        user_name: { type: ['string', 'null'] },
    },
    { key: 'id', type: 'string' },
    ['id', 'book_id', 'user_id', 'loan_date', 'due_date', 'created_at', 'updated_at'],
    ['book_id', 'user_id', 'due_date', 'return_date']
);

export const fineSchema: RxJsonSchema<types.LibFineType> = createEntitySchema<types.LibFineType>(
    'fine',
    {
        id: { type: 'string', maxLength: 100, final: true },
        loan_id: { type: 'string', ref: 'loans' },
        amount: { type: 'number' },
        status: { type: 'string', enum: Object.values(types.LibFineStatusEnum) },
        reason: { type: ['string', 'null'] },
        fee_adjustment_id: { type: ['string', 'null'] /* ref: 'fee_adjustments' */ }, // If linking to finance
        paid_date: { type: ['string', 'null'], format: 'date' },
        payment_reference: { type: ['string', 'null'] },
        created_at: { type: 'string', format: 'date-time' },
        updated_at: { type: 'string', format: 'date-time' },
        book_title: { type: ['string', 'null'] },
        user_name: { type: ['string', 'null'] },
        loan_due_date: { type: ['string', 'null'], format: 'date' },
    },
    { key: 'id', type: 'string' },
    ['id', 'loan_id', 'amount', 'status', 'created_at', 'updated_at'],
    ['loan_id', 'status']
);
