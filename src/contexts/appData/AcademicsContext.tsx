// ABOUTME: DEPRECATED - Use @/modules/academics/data/AcademicDataContext instead
// ABOUTME: This is a legacy context wrapper from pre-modular architecture
// TODO: Remove after migrating all consumers to module-specific data hooks

import React, { createContext, useContext, useMemo, ReactNode } from 'react';
import { useAppData } from '../AppDataContext';

/** @deprecated Use @/modules/academics/data/AcademicDataContext instead */
export interface AcademicsDomainState {
  students: any[];
  classes: any[];
  subjects: any[];
  examSessions: any[];
  studentExamResults: any[];
}

/** @deprecated Use @/modules/academics/data/AcademicDataContext instead */
export const AcademicsContext = createContext<AcademicsDomainState | undefined>(undefined);

/** @deprecated Use @/modules/academics/data/AcademicDataProvider instead */
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

/** @deprecated Use @/modules/academics/data/hooks instead */
export const useAcademicsDomain = () => {
  const context = useContext(AcademicsContext);
  if (!context) {
    throw new Error('useAcademicsDomain must be used within an AcademicsProvider');
  }
  return context;
};
