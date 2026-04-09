// ABOUTME: Library domain context — Books, BookCategories, Loans, Fines
// ABOUTME: Wraps useLibraryData hook and exposes it via React Context

import React, { createContext, useContext, useMemo, ReactNode } from 'react';
import { useLibraryData } from './useLibraryData';

export type LibraryDataContextValue = ReturnType<typeof useLibraryData>;

const LibraryDataContext = createContext<LibraryDataContextValue | undefined>(undefined);

export const LibraryDataProvider: React.FC<{ children: ReactNode; mockData?: any }> = ({
  children,
  mockData,
}) => {
  const data = useLibraryData(mockData);

  const value = useMemo(() => data, [data]);

  return (
    <LibraryDataContext.Provider value={value}>
      {children}
    </LibraryDataContext.Provider>
  );
};

export const useLibraryDataContext = (): LibraryDataContextValue => {
  const context = useContext(LibraryDataContext);
  if (context === undefined) {
    throw new Error('useLibraryDataContext must be used within a LibraryDataProvider');
  }
  return context;
};

export { LibraryDataContext };
