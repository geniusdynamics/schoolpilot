// ABOUTME: Defines the RxDB collection configurations for the Library module.
// ABOUTME: This structure is imported by the central rxdbService to add module-specific collections.

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
