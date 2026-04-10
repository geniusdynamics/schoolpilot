import React, { createContext, useContext, useMemo, ReactNode } from 'react';
import { useAppData } from '../AppDataContext';

// Define the Academics Domain State
export interface AcademicsDomainState {
  students: any[];
  classes: any[];
  subjects: any[];
  examSessions: any[];
  studentExamResults: any[];
}

export const AcademicsContext = createContext<AcademicsDomainState | undefined>(undefined);

export const AcademicsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const appData = useAppData();

  const value = useMemo(() => ({
    students: appData.students || [],
    classes: appData.classes || [],
    subjects: appData.subjects || [],
    examSessions: appData.examSessions || [],
    studentExamResults: appData.studentExamResults || []
  }), [
    appData.students,
    appData.classes,
    appData.subjects,
    appData.examSessions,
    appData.studentExamResults
  ]);

  return (
    <AcademicsContext.Provider value={value}>
      {children}
    </AcademicsContext.Provider>
  );
};

export const useAcademicsDomain = () => {
  const context = useContext(AcademicsContext);
  if (!context) {
    throw new Error('useAcademicsDomain must be used within an AcademicsProvider');
  }
  return context;
};
