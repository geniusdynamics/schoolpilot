// ABOUTME: Library Module Collection Configuration
import type { ModuleCollectionsConfig } from '@/core/types/moduleCollections';

export const libraryModuleCollections: ModuleCollectionsConfig = {
  moduleName: 'library',
  aliases: {
    book_categories: 'bookCategories',
    books: 'books',
    book_loans: 'bookLoans',
    library_members: 'libraryMembers',
    fines: 'fines',
  },
};

export default libraryModuleCollections;
