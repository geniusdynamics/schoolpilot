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
} from '@/core/types';

export const initialMockBookCategories: BookCategory[] = [
  { id: 1, name: 'Fiction' },
  { id: 2, name: 'Science' },
  { id: 3, name: 'History' },
  { id: 4, name: 'Reference' },
  { id: 5, name: 'Computer Science' },
];

export const initialMockBooks: Book[] = [
  { id: 'BOOK001', category_id: 1, title: 'The Great Gatsby', author: 'F. Scott Fitzgerald', accession_no: 'LIB001', status: BookStatus.AVAILABLE, is_digital: true, digital_access_url: 'https://example.com/library/great-gatsby.pdf', digital_format: 'PDF', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), category_name: 'Fiction' },
  { id: 'BOOK002', category_id: 2, title: 'Cosmos', author: 'Carl Sagan', accession_no: 'LIB002', status: BookStatus.ON_LOAN, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), category_name: 'Science' },
  { id: 'BOOK003', category_id: 3, title: 'Sapiens: A Brief History of Humankind', author: 'Yuval Noah Harari', accession_no: 'LIB003', status: BookStatus.AVAILABLE, is_digital: true, digital_access_url: 'https://example.com/library/sapiens.epub', digital_format: 'EPUB', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), category_name: 'History' },
  { id: 'BOOK004', category_id: 5, title: 'Clean Code', author: 'Robert C. Martin', accession_no: 'LIB004', status: BookStatus.LOST, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), category_name: 'Computer Science' },
];

export const initialMockLoans: Loan[] = [
  { id: 'LOAN001', book_id: 'BOOK002', user_id: 'STU003', loan_date: '2024-06-10', due_date: '2024-06-24', return_date: null, book_title: 'Cosmos', user_name: 'Jim Halpert', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'LOAN002', book_id: 'BOOK004', user_id: 'STF001', loan_date: '2024-05-01', due_date: '2024-05-15', return_date: null, book_title: 'Clean Code', user_name: 'Michael Scott', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
];

export const initialMockFines: Fine[] = [
  { id: 'FINE001', loan_id: 'LOAN001', amount: 50, status: FineStatus.PENDING, reason: 'Overdue book', book_title: 'Cosmos', user_name: 'Jim Halpert', loan_due_date: '2024-06-24', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'FINE002', loan_id: 'LOAN002', amount: 2500, status: FineStatus.BILLED, reason: 'Lost book', book_title: 'Clean Code', user_name: 'Michael Scott', loan_due_date: '2024-05-15', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'FINE003', loan_id: 'LOAN003', amount: 75, status: FineStatus.PENDING, reason: 'Overdue book - 5 days late', book_title: 'To Kill a Mockingbird', user_name: 'Pam Beesly', loan_due_date: '2024-07-15', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'FINE004', loan_id: 'LOAN004', amount: 100, status: FineStatus.PAID, reason: 'Damaged book cover', book_title: 'The Catcher in the Rye', user_name: 'Stanley Hudson', loan_due_date: '2024-07-10', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
];

// Additional comprehensive library mock data
export const initialMockExtendedBookCategories: BookCategory[] = [
  ...initialMockBookCategories,
  { id: 6, name: 'Mathematics' },
  { id: 7, name: 'Languages & Literature' },
  { id: 8, name: 'Social Sciences' },
  { id: 9, name: 'Arts & Music' },
  { id: 10, name: 'Biography' },
  { id: 11, name: 'Philosophy' },
  { id: 12, name: 'Religion' },
  { id: 13, name: 'Geography' },
  { id: 14, name: 'Chemistry' },
  { id: 15, name: 'Physics' },
  { id: 16, name: 'Biology' },
  { id: 17, name: 'Economics' },
  { id: 18, name: 'Business Studies' },
  { id: 19, name: 'Agriculture' },
  { id: 20, name: 'Health & Medicine' }
];

export const initialMockExtendedBooks: Book[] = [
  ...initialMockBooks,
  // Fiction
  { id: 'BOOK005', category_id: 1, title: 'To Kill a Mockingbird', author: 'Harper Lee', accession_no: 'LIB005', status: BookStatus.ON_LOAN, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), category_name: 'Fiction' },
  { id: 'BOOK006', category_id: 1, title: 'Pride and Prejudice', author: 'Jane Austen', accession_no: 'LIB006', status: BookStatus.AVAILABLE, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), category_name: 'Fiction' },
  { id: 'BOOK007', category_id: 1, title: 'The Catcher in the Rye', author: 'J.D. Salinger', accession_no: 'LIB007', status: BookStatus.AVAILABLE, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), category_name: 'Fiction' },
  { id: 'BOOK008', category_id: 1, title: '1984', author: 'George Orwell', accession_no: 'LIB008', status: BookStatus.ON_LOAN, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), category_name: 'Fiction' },
  
  // Science
  { id: 'BOOK009', category_id: 2, title: 'A Brief History of Time', author: 'Stephen Hawking', accession_no: 'LIB009', status: BookStatus.AVAILABLE, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), category_name: 'Science' },
  { id: 'BOOK010', category_id: 15, title: 'Fundamentals of Physics', author: 'David Halliday', accession_no: 'LIB010', status: BookStatus.AVAILABLE, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), category_name: 'Physics' },
  { id: 'BOOK011', category_id: 14, title: 'Organic Chemistry', author: 'Paula Bruice', accession_no: 'LIB011', status: BookStatus.ON_LOAN, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), category_name: 'Chemistry' },
  { id: 'BOOK012', category_id: 16, title: 'Campbell Biology', author: 'Neil A. Campbell', accession_no: 'LIB012', status: BookStatus.AVAILABLE, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), category_name: 'Biology' },
  
  // Mathematics
  { id: 'BOOK013', category_id: 6, title: 'Calculus: Early Transcendentals', author: 'James Stewart', accession_no: 'LIB013', status: BookStatus.AVAILABLE, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), category_name: 'Mathematics' },
  { id: 'BOOK014', category_id: 6, title: 'Linear Algebra and Its Applications', author: 'David C. Lay', accession_no: 'LIB014', status: BookStatus.ON_LOAN, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), category_name: 'Mathematics' },
  
  // Languages & Literature
  { id: 'BOOK015', category_id: 7, title: 'Romeo and Juliet', author: 'William Shakespeare', accession_no: 'LIB015', status: BookStatus.AVAILABLE, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), category_name: 'Languages & Literature' },
  { id: 'BOOK016', category_id: 7, title: 'Macbeth', author: 'William Shakespeare', accession_no: 'LIB016', status: BookStatus.AVAILABLE, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), category_name: 'Languages & Literature' },
  { id: 'BOOK017', category_id: 7, title: 'Things Fall Apart', author: 'Chinua Achebe', accession_no: 'LIB017', status: BookStatus.ON_LOAN, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), category_name: 'Languages & Literature' },
  
  // History
  { id: 'BOOK018', category_id: 3, title: 'The Guns of August', author: 'Barbara Tuchman', accession_no: 'LIB018', status: BookStatus.AVAILABLE, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), category_name: 'History' },
  { id: 'BOOK019', category_id: 3, title: 'A People\'s History of the World', author: 'Chris Harman', accession_no: 'LIB019', status: BookStatus.AVAILABLE, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), category_name: 'History' },
  
  // Computer Science
  { id: 'BOOK020', category_id: 5, title: 'Introduction to Algorithms', author: 'Thomas H. Cormen', accession_no: 'LIB020', status: BookStatus.AVAILABLE, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), category_name: 'Computer Science' },
  { id: 'BOOK021', category_id: 5, title: 'Design Patterns', author: 'Gang of Four', accession_no: 'LIB021', status: BookStatus.ON_LOAN, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), category_name: 'Computer Science' },
  
  // Reference
  { id: 'BOOK022', category_id: 4, title: 'Oxford English Dictionary', author: 'Oxford University Press', accession_no: 'LIB022', status: BookStatus.AVAILABLE, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), category_name: 'Reference' },
  { id: 'BOOK023', category_id: 4, title: 'Encyclopedia Britannica Volume 1', author: 'Encyclopedia Britannica Inc.', accession_no: 'LIB023', status: BookStatus.AVAILABLE, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), category_name: 'Reference' },
  
  // Economics & Business
  { id: 'BOOK024', category_id: 17, title: 'Principles of Economics', author: 'N. Gregory Mankiw', accession_no: 'LIB024', status: BookStatus.AVAILABLE, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), category_name: 'Economics' },
  { id: 'BOOK025', category_id: 18, title: 'Good to Great', author: 'Jim Collins', accession_no: 'LIB025', status: BookStatus.ON_LOAN, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), category_name: 'Business Studies' },
];

export const initialMockExtendedLoans: Loan[] = [
  ...initialMockLoans,
  { id: 'LOAN003', book_id: 'BOOK005', user_id: 'STU004', loan_date: '2024-07-10', due_date: '2024-07-24', return_date: null, book_title: 'To Kill a Mockingbird', user_name: 'Pam Beesly', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'LOAN004', book_id: 'BOOK007', user_id: 'STU005', loan_date: '2024-06-25', due_date: '2024-07-09', return_date: '2024-07-12', book_title: 'The Catcher in the Rye', user_name: 'Stanley Hudson', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'LOAN005', book_id: 'BOOK008', user_id: 'STU006', loan_date: '2024-07-20', due_date: '2024-08-03', return_date: null, book_title: '1984', user_name: 'Kevin Malone', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'LOAN006', book_id: 'BOOK011', user_id: 'STF002', loan_date: '2024-07-15', due_date: '2024-08-15', return_date: null, book_title: 'Organic Chemistry', user_name: 'Dwight Schrute', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'LOAN007', book_id: 'BOOK014', user_id: 'STU007', loan_date: '2024-07-18', due_date: '2024-08-01', return_date: null, book_title: 'Linear Algebra and Its Applications', user_name: 'Angela Martin', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'LOAN008', book_id: 'BOOK017', user_id: 'STU008', loan_date: '2024-07-22', due_date: '2024-08-05', return_date: null, book_title: 'Things Fall Apart', user_name: 'Oscar Martinez', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'LOAN009', book_id: 'BOOK021', user_id: 'STF003', loan_date: '2024-07-12', due_date: '2024-08-12', return_date: null, book_title: 'Design Patterns', user_name: 'Jim Halpert', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'LOAN010', book_id: 'BOOK025', user_id: 'STF004', loan_date: '2024-07-08', due_date: '2024-08-08', return_date: null, book_title: 'Good to Great', user_name: 'Toby Flenderson', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
];

// Library statistics and reports data
export const initialMockLibraryStats = {
  total_books: 25,
  books_available: 15,
  books_on_loan: 10,
  books_lost: 1,
  total_active_loans: 8,
  overdue_loans: 2,
  total_fines_pending: 4,
  total_fine_amount: 325,
  popular_categories: [
    { category: 'Fiction', loan_count: 4 },
    { category: 'Computer Science', loan_count: 3 },
    { category: 'Mathematics', loan_count: 2 },
    { category: 'Languages & Literature', loan_count: 2 },
    { category: 'Science', loan_count: 1 }
  ],
  monthly_circulation: [
    { month: 'January', loans: 45, returns: 42 },
    { month: 'February', loans: 38, returns: 40 },
    { month: 'March', loans: 52, returns: 48 },
    { month: 'April', loans: 41, returns: 45 },
    { month: 'May', loans: 47, returns: 44 },
    { month: 'June', loans: 39, returns: 41 },
    { month: 'July', loans: 33, returns: 28 }
  ]
};

export const initialMockLibrarySettings = {
  max_loan_period_days: 14,
  max_renewals: 2,
  fine_per_day: 15,
  max_books_per_student: 3,
  max_books_per_staff: 5,
  library_hours: {
    monday_friday: '08:00 - 17:00',
    saturday: '09:00 - 13:00',
    sunday: 'Closed'
  },
  reservation_hold_days: 3,
  overdue_notice_days: [7, 14, 21]
};

// Ensure all AppDataType keys for library are exported
export const bookCategories = initialMockBookCategories;
export const books = initialMockBooks;
export const loans = initialMockLoans;
export const fines = initialMockFines;
