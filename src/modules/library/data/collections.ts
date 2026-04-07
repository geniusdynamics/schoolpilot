// ABOUTME: Defines the RxDB collection configurations for the Library module.
// ABOUTME: Module collection definitions - used by UnifiedDatabaseManager

import * as schemas from './schema';

export const libraryCollections = {
  book_categories: {
    schema: schemas.bookCategorySchema,
  },
  books: {
    schema: schemas.bookSchema,
  },
  loans: {
    schema: schemas.loanSchema,
  },
  fines: {
    schema: schemas.fineSchema,
  },
};

// Type helper for consumers of this module's collections (optional)
export type LibraryCollections = typeof libraryCollections;
