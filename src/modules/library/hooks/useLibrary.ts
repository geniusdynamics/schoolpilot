// ABOUTME: Main hook for Library module pages
// ABOUTME: Uses useLibraryData() for database-backed data and CRUD
// ABOUTME: This is the ONLY hook Library pages should use

import { useLibraryData } from '../data/useLibraryData';

export const useLibrary = () => {
  const libraryData = useLibraryData();

  return {
    // Data
    books: libraryData.books,
    bookLoans: libraryData.bookLoans,
    libraryMembers: libraryData.libraryMembers,
    bookCategories: libraryData.bookCategories,
    fines: libraryData.fines,
    loading: false,

    // Book CRUD
    addBook: libraryData.addBook,
    updateBook: libraryData.updateBook,
    deleteBook: libraryData.deleteBook,

    // Book Loan CRUD
    addBookLoan: libraryData.addBookLoan,
    updateBookLoan: libraryData.updateBookLoan,
    deleteBookLoan: libraryData.deleteBookLoan,
    returnBook: libraryData.returnBook,

    // Book Category CRUD
    addBookCategory: libraryData.addBookCategory,
    updateBookCategory: libraryData.updateBookCategory,
    deleteBookCategory: libraryData.deleteBookCategory,

    // Fine CRUD
    addFine: libraryData.addFine,
    updateFineStatus: libraryData.updateFineStatus,
  };
};

export default useLibrary;