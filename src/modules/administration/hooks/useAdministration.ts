// ABOUTME: Main hook for Administration module pages
// ABOUTME: Combines data from AppDataContext with CRUD from AdministrationDataProvider
// ABOUTME: This is the ONLY hook Administration pages should use

import { useAppData } from '@/hooks/useAppData';
import { useAdministrationDataContext } from '../data/AdministrationDataProvider';

export const useAdministration = () => {
  // Get read-only data from AppDataContext
  const {
    classes: appClasses,
    classStreams: appClassStreams,
    students: appStudents,
    staff: appStaff,
    departments: appDepartments,
    designations: appDesignations,
    academicYears: appAcademicYears,
    dormitories: appDormitories,
    studentCategories: appStudentCategories,
    loading: appLoading,
  } = useAppData();

  // Get CRUD operations from AdministrationDataProvider
  const {
    // Class CRUD
    addClass,
    updateClass,
    deleteClass,
    bulkAddClasses,
    bulkUpdateClasses,
    bulkDeleteClasses,
    
    // Class Stream CRUD
    addClassStream,
    updateClassStream,
    deleteClassStream,
    
    // Student CRUD
    addStudent,
    updateStudent,
    deleteStudent,
    
    // Staff CRUD
    addStaff,
    updateStaff,
    deleteStaff,
    
    // Department CRUD
    addDepartment,
    updateDepartment,
    deleteDepartment,
    
    // Academic Year CRUD
    addAcademicYear,
    updateAcademicYear,
    deleteAcademicYear,
    
    // Validation
    validateClass,
    validateClassStream,
    validateStudent,
  } = useAdministrationDataContext();

  return {
    // Data (from AppDataContext)
    classes: appClasses,
    classStreams: appClassStreams,
    students: appStudents,
    staff: appStaff,
    departments: appDepartments,
    designations: appDesignations,
    academicYears: appAcademicYears,
    dormitories: appDormitories,
    studentCategories: appStudentCategories,
    loading: appLoading,
    
    // Class CRUD
    addClass,
    updateClass,
    deleteClass,
    bulkAddClasses,
    bulkUpdateClasses,
    bulkDeleteClasses,
    
    // Class Stream CRUD
    addClassStream,
    updateClassStream,
    deleteClassStream,
    
    // Student CRUD
    addStudent,
    updateStudent,
    deleteStudent,
    
    // Staff CRUD
    addStaff,
    updateStaff,
    deleteStaff,
    
    // Department CRUD
    addDepartment,
    updateDepartment,
    deleteDepartment,
    
    // Academic Year CRUD
    addAcademicYear,
    updateAcademicYear,
    deleteAcademicYear,
    
    // Validation
    validateClass,
    validateClassStream,
    validateStudent,
  };
};

export default useAdministration;
