// ABOUTME: Academic domain context — Subjects, Exams, Timetables, Grading, Marks, Results,
// ABOUTME: Academic Years, Terms, Education levels, Class allocations
// ABOUTME: Wraps useAcademicData hook and exposes it via React Context

import React, { createContext, useContext, useMemo, ReactNode } from 'react';
import { useAcademicData } from '@/hooks/data/useAcademicData';

export type AcademicDataContextValue = ReturnType<typeof useAcademicData>;

const AcademicDataContext = createContext<AcademicDataContextValue | undefined>(undefined);

export const AcademicDataProvider: React.FC<{ children: ReactNode; mockData?: any }> = ({
  children,
  mockData,
}) => {
  const data = useAcademicData(mockData);

  const value = useMemo(() => data, [data]);

  return (
    <AcademicDataContext.Provider value={value}>
      {children}
    </AcademicDataContext.Provider>
  );
};

export const useAcademicDataContext = (): AcademicDataContextValue => {
  const context = useContext(AcademicDataContext);
  if (context === undefined) {
    throw new Error('useAcademicDataContext must be used within an AcademicDataProvider');
  }
  return context;
};

export { AcademicDataContext };
