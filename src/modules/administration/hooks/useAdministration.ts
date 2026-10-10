// ABOUTME: Main hook for Administration module pages
// ABOUTME: Uses useAdministrationData for all data and CRUD operations
// ABOUTME: This is the ONLY hook Administration pages should use

import { useCallback } from 'react';
import { useAdministrationData } from '../data/useAdministrationData';

export const useAdministration = () => {
  // Get all data and CRUD operations from useAdministrationData
  const adminData = useAdministrationData();
  const { addClass, updateClass, deleteClass } = adminData;

  // ── Bulk Operations ─────────────────────────────────────────────────────────────
  const bulkAddClasses = useCallback(async (items: { name: string; streams?: any[] }[]) => {
    return Promise.all(items.map(item => addClass(item as any)));
  }, [addClass]);

  const bulkUpdateClasses = useCallback(async (items: { id: string; name?: string; streams?: any[] }[]) => {
    return Promise.all(items.map(item => updateClass(String(item.id), item as any)));
  }, [updateClass]);

  const bulkDeleteClasses = useCallback(async (ids: (string | number)[]) => {
    return Promise.all(ids.map(id => deleteClass(String(id))));
  }, [deleteClass]);

  // ── Validation Functions ───────────────────────────────────────────────────────
  const validateClass = useCallback((classData: { name?: string; academicYearId?: string }): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];
    if (!classData.name || classData.name.trim() === '') {
      errors.push('Class name is required');
    }
    if (!classData.academicYearId) {
      errors.push('Academic year is required');
    }
    return { isValid: errors.length === 0, errors };
  }, []);

  const validateClassStream = useCallback((streamData: { name?: string; classId?: string }): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];
    if (!streamData.name || streamData.name.trim() === '') {
      errors.push('Stream name is required');
    }
    if (!streamData.classId) {
      errors.push('Class is required');
    }
    return { isValid: errors.length === 0, errors };
  }, []);

  const validateStudent = useCallback((studentData: { first_name?: string; last_name?: string }): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];
    if (!studentData.first_name || studentData.first_name.trim() === '') {
      errors.push('First name is required');
    }
    if (!studentData.last_name || studentData.last_name.trim() === '') {
      errors.push('Last name is required');
    }
    return { isValid: errors.length === 0, errors };
  }, []);

  // ── Staff CRUD Aliases ───────────────────────────────────────────────────────
  // useAdministrationData exports addStaffMember/updateStaffMember/deleteStaffMember
  // but the facade hook exports addStaff/updateStaff/deleteStaff
  const addStaff = adminData.addStaffMember;
  const updateStaff = adminData.updateStaffMember;
  const deleteStaff = adminData.deleteStaffMember;

  return {
    // Every provider record and mutator (create(data) / update(id, patch) / delete(id)),
    // including staff members, school details, class history and transfer certificates
    ...adminData,

    // Data (from useAdministrationData)
    students: adminData.students,
    staff: adminData.staff,
    classes: adminData.classes,
    classStreams: adminData.classStreams,
    departments: adminData.departments,
    designations: adminData.designations,
    studentCategories: adminData.studentCategories,
    dormitories: adminData.dormitories,
    parentsGuardians: adminData.parentsGuardians,
    partners: adminData.partners,
    clubs: adminData.clubs,
    customers: adminData.customers,
    studentHealthRecords: adminData.studentHealthRecords,
    studentAttendance: adminData.studentAttendance,
    disciplinaryRecords: adminData.disciplinaryRecords,
    healthIncidentReports: adminData.healthIncidentReports,
    studentClassHistory: adminData.studentClassHistory,
    loading: false,

    // Class CRUD
    addClass: adminData.addClass,
    updateClass: adminData.updateClass,
    deleteClass: adminData.deleteClass,
    bulkAddClasses,
    bulkUpdateClasses,
    bulkDeleteClasses,

    // Class Stream CRUD
    addClassStream: adminData.addClassStream,
    updateClassStream: adminData.updateClassStream,
    deleteClassStream: adminData.deleteClassStream,

    // Student CRUD
    addStudent: adminData.addStudent,
    updateStudent: adminData.updateStudent,
    deleteStudent: adminData.deleteStudent,
    getStudentDetailsById: adminData.getStudentDetailsById,

    // Staff CRUD (with aliases)
    addStaff,
    updateStaff,
    deleteStaff,

    // Department CRUD
    addDepartment: adminData.addDepartment,
    updateDepartment: adminData.updateDepartment,
    deleteDepartment: adminData.deleteDepartment,

    // Designation CRUD
    addDesignation: adminData.addDesignation,
    updateDesignation: adminData.updateDesignation,
    deleteDesignation: adminData.deleteDesignation,

    // Student Category CRUD
    addStudentCategory: adminData.addStudentCategory,
    updateStudentCategory: adminData.updateStudentCategory,
    deleteStudentCategory: adminData.deleteStudentCategory,

    // Dormitory CRUD
    addDormitory: adminData.addDormitory,
    updateDormitory: adminData.updateDormitory,
    deleteDormitory: adminData.deleteDormitory,

    // Parent/Guardian CRUD
    addParentGuardian: adminData.addParentGuardian,
    updateParentGuardian: adminData.updateParentGuardian,
    deleteParentGuardian: adminData.deleteParentGuardian,
    addStudentGuardianRelationship: adminData.addStudentGuardianRelationship,
    updateStudentGuardianRelationship: adminData.updateStudentGuardianRelationship,
    deleteStudentGuardianRelationship: adminData.deleteStudentGuardianRelationship,

    // Partner CRUD
    addPartner: adminData.addPartner,
    updatePartner: adminData.updatePartner,
    deletePartner: adminData.deletePartner,

    // Club CRUD
    addClub: adminData.addClub,
    updateClub: adminData.updateClub,
    deleteClub: adminData.deleteClub,

    // Customer CRUD
    addCustomer: adminData.addCustomer,
    updateCustomer: adminData.updateCustomer,
    deleteCustomer: adminData.deleteCustomer,

    // Health Records CRUD
    addStudentHealthRecord: adminData.addStudentHealthRecord,
    updateStudentHealthRecord: adminData.updateStudentHealthRecord,

    // Attendance
    saveStudentAttendance: adminData.saveStudentAttendance,
    getStudentAttendanceByFilters: adminData.getStudentAttendanceByFilters,

    // Validation
    validateClass,
    validateClassStream,
    validateStudent,

    // Aliases (create* methods)
    createStudent: adminData.createStudent,
    createStaffMember: adminData.createStaffMember,
    createParentGuardian: adminData.createParentGuardian,
    createDepartment: adminData.createDepartment,
    createDesignation: adminData.createDesignation,
    createStudentCategory: adminData.createStudentCategory,
    createDormitory: adminData.createDormitory,
    createClass: adminData.createClass,
    createClassStream: adminData.createClassStream,
    createPartner: adminData.createPartner,
    createClub: adminData.createClub,
    createCustomer: adminData.createCustomer,
    createStudentHealthRecord: adminData.createStudentHealthRecord,
  };
};

export default useAdministration;