import { useAppData } from '../../../contexts/AppDataContext';

export const useBookData = () => {
  const { books, addBook, updateBook, deleteBook } = useAppData();
  
  return {
    data: books,
    create: addBook,
    update: updateBook,
    remove: deleteBook
  };
};
