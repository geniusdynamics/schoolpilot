import { useAppData } from '@/hooks/useAppData';
import { useLibraryDataContext } from '../data/LibraryDataProvider';

export const useLibrary = () => {
  const appData = useAppData();
  const ctx = useLibraryDataContext();
  return {
    books: appData.books,
    bookLoans: appData.bookLoans,
    libraryMembers: appData.libraryMembers,
    loading: appData.loading,
    addBook: ctx.addBook,
    updateBook: ctx.updateBook,
    deleteBook: ctx.deleteBook,
    addBookLoan: ctx.addBookLoan,
    updateBookLoan: ctx.updateBookLoan,
    deleteBookLoan: ctx.deleteBookLoan,
    returnBook: ctx.returnBook,
  };
};
export default useLibrary;
