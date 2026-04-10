// ABOUTME: Serves as the main CSL entry point for the Library module's data definitions.
// ABOUTME: It re-exports types, mock data, schemas, and collection configurations.

export * from './types';
export * from './mockData';
export * from './schema';
export * from './collections';

export { isGlobalProvider as isBookCategoryGlobalProvider, useBookCategoryData } from './useBookCategoryData';
export { isGlobalProvider as isBookGlobalProvider, useBookData } from './useBookData';
export { isGlobalProvider as isLoanGlobalProvider, useLoanData } from './useLoanData';
export { isGlobalProvider as isFineGlobalProvider, useFineData } from './useFineData';
