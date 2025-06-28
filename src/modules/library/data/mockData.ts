// ABOUTME: Provides initial mock data for entities specific to the Library module.
// ABOUTME: This data is used in "demo" mode and for seeding RxDB in "production" mode.

import { LibBookStatusEnum, LibFineStatusEnum, LibBookCategoryType, LibBookType, LibLoanType, LibFineType } from './types';
import { UserType } from '../../../types'; // For Loan.user_type
import { generateId, generateNumericId } from '../../../hooks/useMockData'; // Assuming helpers are made exportable

export const initialMockBookCategories: types.BookCategory[] = [
  { id: 1, name: 'Fiction' },
  { id: 2, name: 'Science' },
  { id: 3, name: 'History' },
  { id: 4, name: 'Reference' },
];

export const initialMockBooks: types.Book[] = [
  { id: generateId(), category_id: 1, title: 'The Great Gatsby', author: 'F. Scott Fitzgerald', accession_no: 'LIB001', status: LibBookStatusEnum.AVAILABLE, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), category_name: 'Fiction' },
  { id: generateId(), category_id: 2, title: 'Cosmos', author: 'Carl Sagan', accession_no: 'LIB002', status: LibBookStatusEnum.ON_LOAN, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), category_name: 'Science' },
  { id: generateId(), category_id: 3, title: 'Sapiens: A Brief History of Humankind', author: 'Yuval Noah Harari', accession_no: 'LIB003', status: LibBookStatusEnum.AVAILABLE, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), category_name: 'History' },
];

export const initialMockLoans: types.Loan[] = [
  { id: generateId(), book_id: initialMockBooks[1].id, user_id: 'S001', user_type: UserType.STUDENT, loan_date: '2023-10-01', due_date: '2023-10-15', book_title: 'Cosmos', user_name: 'Jim Halpert', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
];

export const initialMockFines: types.Fine[] = [
  { id: generateId(), loan_id: initialMockLoans[0].id, amount: 50, status: types.LibFineStatusEnum.PENDING, reason: 'Overdue book', book_title: 'Cosmos', user_name: 'Jim Halpert', loan_due_date: '2023-10-15', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
];
