// ABOUTME: Provides initial mock data for entities specific to the Library module.
// ABOUTME: This data is used in "demo" mode and for seeding RxDB in "production" mode.

import {
    BookCategory,
    Book,
    Loan,
    Fine,
    BookStatus,
    FineStatus,
    UserType
} from '../../../core/types';

export const initialMockBookCategories: BookCategory[] = [
  { id: 1, name: 'Fiction' },
  { id: 2, name: 'Science' },
  { id: 3, name: 'History' },
  { id: 4, name: 'Reference' },
  { id: 5, name: 'Computer Science' },
];

export const initialMockBooks: Book[] = [
  { id: 'BOOK001', category_id: 1, title: 'The Great Gatsby', author: 'F. Scott Fitzgerald', accession_no: 'LIB001', status: BookStatus.AVAILABLE, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), category_name: 'Fiction' },
  { id: 'BOOK002', category_id: 2, title: 'Cosmos', author: 'Carl Sagan', accession_no: 'LIB002', status: BookStatus.ON_LOAN, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), category_name: 'Science' },
  { id: 'BOOK003', category_id: 3, title: 'Sapiens: A Brief History of Humankind', author: 'Yuval Noah Harari', accession_no: 'LIB003', status: BookStatus.AVAILABLE, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), category_name: 'History' },
  { id: 'BOOK004', category_id: 5, title: 'Clean Code', author: 'Robert C. Martin', accession_no: 'LIB004', status: BookStatus.LOST, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), category_name: 'Computer Science' },
];

export const initialMockLoans: Loan[] = [
  { id: 'LOAN001', book_id: 'BOOK002', user_id: 'STU003', user_type: UserType.STUDENT, loan_date: '2024-06-10', due_date: '2024-06-24', return_date: null, book_title: 'Cosmos', user_name: 'Jim Halpert', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'LOAN002', book_id: 'BOOK004', user_id: 'STF001', user_type: UserType.STAFF, loan_date: '2024-05-01', due_date: '2024-05-15', return_date: null, book_title: 'Clean Code', user_name: 'Michael Scott', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
];

export const initialMockFines: Fine[] = [
  { id: 'FINE001', loan_id: 'LOAN001', amount: 50, status: FineStatus.PENDING, reason: 'Overdue book', book_title: 'Cosmos', user_name: 'Jim Halpert', loan_due_date: '2024-06-24', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'FINE002', loan_id: 'LOAN002', amount: 2500, status: FineStatus.BILLED, reason: 'Lost book', book_title: 'Clean Code', user_name: 'Michael Scott', loan_due_date: '2024-05-15', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
];
