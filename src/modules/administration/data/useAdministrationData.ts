// ABOUTME: Administration domain hook — Students, Staff, Classes, Departments, Dormitories,
// ABOUTME: Clubs, Partners, Attendance, Guardians, Health Records, Disciplinary records

import { useState, useCallback } from 'react';
import type { AppDataContextType } from '@/types';
import { databaseService } from '@/services/database/databaseService';
import { useToast } from '@/hooks/useToast';
import * as allTypes from './types';

type RawInitialData = AppDataContextType['rawInitialData'];

export function useAdministrationData(mockDataForSeeding: RawInitialData) {
  const [adminData] = useState<{
    students: allTypes.Student[];
    staff: any[];
    classes: allTypes.Class[];
    classStreams: allTypes.ClassStream[];
    departments: allTypes.Department[];
    designations: allTypes.Designation[];
    studentCategories: allTypes.StudentCategory[];
    dormitories: allTypes.Dormitory[];
    parentsGuardians: any[];
    partners: any[];
    clubs: any[];
    customers: any[];
    studentHealthRecords: allTypes.StudentHealthRecord[];
    studentAttendance: any[];
    disciplinaryRecords: any[];
    healthIncidentReports: any[];
    studentClassHistory: any[];
  }>({
    students: [],
    staff: [],
    classes: [],
    classStreams: [],
    departments: [],
    designations: [],
    studentCategories: [],
    dormitories: [],
    parentsGuardians: [],
    partners: [],
    clubs: [],
    customers: [],
    studentHealthRecords: [],
    studentAttendance: [],
    disciplinaryRecords: [],
    healthIncidentReports: [],
    studentClassHistory: [],
  });

  const [localAttendance, setLocalAttendance] = useState<any[]>([]);
  const toast = useToast();

  // ── Helper: cached collections ──────────────────────────────────────────────
  const getCachedCollection = useCallback(<T,>(cached: T[], fallback: T[] | undefined): T[] => {
    if (Array.isArray(cached) && cached.length > 0) return cached;
    return Array.isArray(fallback) ? fallback : cached;
  }, []);

  const getCachedStudents = useCallback(
    () => getCachedCollection(adminData.students, mockDataForSeeding?.students),
    [adminData.students, getCachedCollection, mockDataForSeeding]
  );

  const getCachedStudentAttendance = useCallback(
    () => getCachedCollection([...adminData.studentAttendance, ...localAttendance], mockDataForSeeding?.studentAttendance),
    [adminData.studentAttendance, localAttendance, getCachedCollection, mockDataForSeeding]
  );

  // ── Students ─────────────────────────────────────────────────────────────────
  const getStudentDetailsById = useCallback(async (studentId: string): Promise<allTypes.StudentDetailProfile | null> => {
    try {
      const db = await databaseService.getDatabase();
      const student = await db.students?.findById(studentId);
      if (!student) return null;
      const guardianRelationships = await db.student_guardian_relationships?.find({ selector: { student_id: studentId } }) || [];
      const guardianIds = guardianRelationships.map((rel: any) => rel.guardian_id);
      const guardians = guardianIds.length > 0
        ? await db.parents_guardians?.find({ selector: { id: { $in: guardianIds } } }) || []
        : [];
      return { ...student, guardians } as allTypes.StudentDetailProfile;
    } catch (error) {
      console.error('Error fetching student details:', error);
      return null;
    }
  }, []);

  const addStudent = useCallback(async (studentData: Omit<allTypes.Student, 'id'>) => {
    try {
      const db = await databaseService.getDatabase();
      const studentWithId = { ...studentData, id: crypto.randomUUID() };
      const result = await db.students?.insert(studentWithId);
      toast.showSuccess('Student created successfully');
      return result?.doc || null;
    } catch (error) { 
      console.error('Error adding student:', error); 
      toast.showError(`Failed to create student: ${error}`);
      throw error; 
    }
  }, [toast]);

  const updateStudent = useCallback(async (studentId: string, studentData: Partial<allTypes.Student>) => {
    try {
      const db = await databaseService.getDatabase();
      const result = await db.students?.update(studentId, studentData);
      toast.showSuccess('Student updated successfully');
      return result?.doc || null;
    } catch (error) { 
      console.error('Error updating student:', error); 
      toast.showError(`Failed to update student: ${error}`);
      throw error; 
    }
  }, [toast]);

  const deleteStudent = useCallback(async (studentId: string) => {
    try {
      const db = await databaseService.getDatabase();
      await db.students?.remove(studentId);
      toast.showSuccess('Student deleted successfully');
      return true;
    } catch (error) { 
      console.error('Error deleting student:', error); 
      toast.showError(`Failed to delete student: ${error}`);
      throw error; 
    }
  }, [toast]);

  // ── Staff ─────────────────────────────────────────────────────────────────────
  const addStaffMember = useCallback(async (staffData: Omit<any, 'id'>) => {
    try {
      const db = await databaseService.getDatabase();
      const staffWithId = { ...staffData, id: databaseService.generateId() };
      const result = await db.staff?.insert(staffWithId);
      return result?.doc || null;
    } catch (error) { console.error('Error adding staff member:', error); throw error; }
  }, []);

  const updateStaffMember = useCallback(async (staffId: string, staffData: Partial<any>) => {
    try {
      const db = await databaseService.getDatabase();
      const result = await db.staff?.update(staffId, staffData);
      return result?.doc || null;
    } catch (error) { console.error('Error updating staff member:', error); throw error; }
  }, []);

  const deleteStaffMember = useCallback(async (staffId: string) => {
    try {
      const db = await databaseService.getDatabase();
      await db.staff?.remove(staffId);
      return true;
    } catch (error) { console.error('Error deleting staff member:', error); throw error; }
  }, []);

  // ── Parents / Guardians ───────────────────────────────────────────────────────
  const addParentGuardian = useCallback(async (guardianData: Omit<any, 'id'>) => {
    try {
      const db = await databaseService.getDatabase();
      const d = { ...guardianData, id: databaseService.generateId() };
      const result = await db.parents_guardians?.insert(d);
      return result?.doc || null;
    } catch (error) { console.error('Error adding parent/guardian:', error); throw error; }
  }, []);

  const updateParentGuardian = useCallback(async (guardianId: string, guardianData: Partial<any>) => {
    try {
      const db = await databaseService.getDatabase();
      const result = await db.parents_guardians?.update(guardianId, guardianData);
      return result?.doc || null;
    } catch (error) { console.error('Error updating parent/guardian:', error); throw error; }
  }, []);

  const deleteParentGuardian = useCallback(async (guardianId: string) => {
    try {
      const db = await databaseService.getDatabase();
      await db.parents_guardians?.remove(guardianId);
      return true;
    } catch (error) { console.error('Error deleting parent/guardian:', error); throw error; }
  }, []);

  const addStudentGuardianRelationship = useCallback(async (data: Omit<allTypes.StudentGuardianRelationship, 'id'>) => {
    try {
      const db = await databaseService.getDatabase();
      const d = { ...data, id: databaseService.generateId() };
      const result = await db.student_guardian_relationships?.insert(d);
      return result?.doc || null;
    } catch (error) { console.error('Error adding student-guardian relationship:', error); throw error; }
  }, []);

  const updateStudentGuardianRelationship = useCallback(async (id: string, data: Partial<allTypes.StudentGuardianRelationship>) => {
    try {
      const db = await databaseService.getDatabase();
      const result = await db.student_guardian_relationships?.update(id, data);
      return result?.doc || null;
    } catch (error) { console.error('Error updating student-guardian relationship:', error); throw error; }
  }, []);

  const deleteStudentGuardianRelationship = useCallback(async (id: string) => {
    try {
      const db = await databaseService.getDatabase();
      await db.student_guardian_relationships?.remove(id);
      return true;
    } catch (error) { console.error('Error deleting student-guardian relationship:', error); throw error; }
  }, []);

  // ── Departments / Designations ────────────────────────────────────────────────
  const addDepartment = useCallback(async (data: Omit<allTypes.Department, 'id'>) => {
    try {
      const db = await databaseService.getDatabase();
      const d = { ...data, id: databaseService.generateId() };
      const result = await db.departments?.insert(d);
      return result?.doc || null;
    } catch (error) { console.error('Error adding department:', error); throw error; }
  }, []);

  const updateDepartment = useCallback(async (id: string, data: Partial<allTypes.Department>) => {
    try {
      const db = await databaseService.getDatabase();
      const result = await db.departments?.update(id, data);
      return result?.doc || null;
    } catch (error) { console.error('Error updating department:', error); throw error; }
  }, []);

  const deleteDepartment = useCallback(async (id: string) => {
    try {
      const db = await databaseService.getDatabase();
      await db.departments?.remove(id);
      return true;
    } catch (error) { console.error('Error deleting department:', error); throw error; }
  }, []);

  const addDesignation = useCallback(async (data: Omit<allTypes.Designation, 'id'>) => {
    try {
      const db = await databaseService.getDatabase();
      const d = { ...data, id: databaseService.generateId() };
      const result = await db.designations?.insert(d);
      return result?.doc || null;
    } catch (error) { console.error('Error adding designation:', error); throw error; }
  }, []);

  const updateDesignation = useCallback(async (id: string, data: Partial<allTypes.Designation>) => {
    try {
      const db = await databaseService.getDatabase();
      const result = await db.designations?.update(id, data);
      return result?.doc || null;
    } catch (error) { console.error('Error updating designation:', error); throw error; }
  }, []);

  const deleteDesignation = useCallback(async (id: string) => {
    try {
      const db = await databaseService.getDatabase();
      await db.designations?.remove(id);
      return true;
    } catch (error) { console.error('Error deleting designation:', error); throw error; }
  }, []);

  // ── Student Categories ────────────────────────────────────────────────────────
  const addStudentCategory = useCallback(async (data: Omit<allTypes.StudentCategory, 'id'>) => {
    try {
      const db = await databaseService.getDatabase();
      const d = { ...data, id: databaseService.generateId() };
      const result = await db.student_categories?.insert(d);
      return result?.doc || null;
    } catch (error) { console.error('Error adding student category:', error); throw error; }
  }, []);

  const updateStudentCategory = useCallback(async (id: string, data: Partial<allTypes.StudentCategory>) => {
    try {
      const db = await databaseService.getDatabase();
      const result = await db.student_categories?.update(id, data);
      return result?.doc || null;
    } catch (error) { console.error('Error updating student category:', error); throw error; }
  }, []);

  const deleteStudentCategory = useCallback(async (id: string) => {
    try {
      const db = await databaseService.getDatabase();
      await db.student_categories?.remove(id);
      return true;
    } catch (error) { console.error('Error deleting student category:', error); throw error; }
  }, []);

  // ── Dormitories ───────────────────────────────────────────────────────────────
  const addDormitory = useCallback(async (data: Omit<allTypes.Dormitory, 'id'>) => {
    try {
      const db = await databaseService.getDatabase();
      const d = { ...data, id: databaseService.generateId() };
      const result = await db.dormitories?.insert(d);
      return result?.doc || null;
    } catch (error) { console.error('Error adding dormitory:', error); throw error; }
  }, []);

  const updateDormitory = useCallback(async (id: string, data: Partial<allTypes.Dormitory>) => {
    try {
      const db = await databaseService.getDatabase();
      const result = await db.dormitories?.update(id, data);
      return result?.doc || null;
    } catch (error) { console.error('Error updating dormitory:', error); throw error; }
  }, []);

  const deleteDormitory = useCallback(async (id: string) => {
    try {
      const db = await databaseService.getDatabase();
      await db.dormitories?.remove(id);
      return true;
    } catch (error) { console.error('Error deleting dormitory:', error); throw error; }
  }, []);

  // ── Classes / Streams ─────────────────────────────────────────────────────────
  const addClass = useCallback(async (data: Omit<allTypes.Class, 'id'>) => {
    try {
      const db = await databaseService.getDatabase();
      const d = { ...data, id: databaseService.generateId() };
      const result = await db.classes?.insert(d);
      return result?.doc || null;
    } catch (error) { console.error('Error adding class:', error); throw error; }
  }, []);

  const updateClass = useCallback(async (id: string, data: Partial<allTypes.Class>) => {
    try {
      const db = await databaseService.getDatabase();
      const result = await db.classes?.update(id, data);
      return result?.doc || null;
    } catch (error) { console.error('Error updating class:', error); throw error; }
  }, []);

  const deleteClass = useCallback(async (id: string) => {
    try {
      const db = await databaseService.getDatabase();
      await db.classes?.remove(id);
      return true;
    } catch (error) { console.error('Error deleting class:', error); throw error; }
  }, []);

  const addClassStream = useCallback(async (data: Omit<allTypes.ClassStream, 'id'>) => {
    try {
      const db = await databaseService.getDatabase();
      const d = { ...data, id: databaseService.generateId() };
      const result = await db.class_streams?.insert(d);
      return result?.doc || null;
    } catch (error) { console.error('Error adding class stream:', error); throw error; }
  }, []);

  const updateClassStream = useCallback(async (id: string, data: Partial<allTypes.ClassStream>) => {
    try {
      const db = await databaseService.getDatabase();
      const result = await db.class_streams?.update(id, data);
      return result?.doc || null;
    } catch (error) { console.error('Error updating class stream:', error); throw error; }
  }, []);

  const deleteClassStream = useCallback(async (id: string) => {
    try {
      const db = await databaseService.getDatabase();
      await db.class_streams?.remove(id);
      return true;
    } catch (error) { console.error('Error deleting class stream:', error); throw error; }
  }, []);

  // ── Partners / Clubs / Customers ──────────────────────────────────────────────
  const addPartner = useCallback(async (data: any) => {
    try {
      const db = await databaseService.getDatabase();
      const d = { ...data, id: databaseService.generateId() };
      const result = await db.partners?.insert(d);
      return result?.doc || null;
    } catch (error) { console.error('Error adding Partner:', error); throw error; }
  }, []);
  const updatePartner = useCallback(async (id: string, data: any) => {
    try {
      const db = await databaseService.getDatabase();
      const result = await db.partners?.update(id, data);
      return result?.doc || null;
    } catch (error) { console.error('Error updating Partner:', error); throw error; }
  }, []);
  const deletePartner = useCallback(async (id: string) => {
    try {
      const db = await databaseService.getDatabase();
      await db.partners?.remove(id);
      return true;
    } catch (error) { console.error('Error deleting Partner:', error); throw error; }
  }, []);

  const addClub = useCallback(async (data: any) => {
    try {
      const db = await databaseService.getDatabase();
      const d = { ...data, id: databaseService.generateId() };
      const result = await db.clubs?.insert(d);
      return result?.doc || null;
    } catch (error) { console.error('Error adding Club:', error); throw error; }
  }, []);
  const updateClub = useCallback(async (id: string, data: any) => {
    try {
      const db = await databaseService.getDatabase();
      const result = await db.clubs?.update(id, data);
      return result?.doc || null;
    } catch (error) { console.error('Error updating Club:', error); throw error; }
  }, []);
  const deleteClub = useCallback(async (id: string) => {
    try {
      const db = await databaseService.getDatabase();
      await db.clubs?.remove(id);
      return true;
    } catch (error) { console.error('Error deleting Club:', error); throw error; }
  }, []);

  const addCustomer = useCallback(async (data: any) => {
    try {
      const db = await databaseService.getDatabase();
      const d = { ...data, id: databaseService.generateId() };
      const result = await db.customers?.insert(d);
      return result?.doc || null;
    } catch (error) { console.error('Error adding Customer:', error); throw error; }
  }, []);
  const updateCustomer = useCallback(async (id: string, data: any) => {
    try {
      const db = await databaseService.getDatabase();
      const result = await db.customers?.update(id, data);
      return result?.doc || null;
    } catch (error) { console.error('Error updating Customer:', error); throw error; }
  }, []);
  const deleteCustomer = useCallback(async (id: string) => {
    try {
      const db = await databaseService.getDatabase();
      await db.customers?.remove(id);
      return true;
    } catch (error) { console.error('Error deleting Customer:', error); throw error; }
  }, []);

  // ── Student Health ────────────────────────────────────────────────────────────
  const addStudentHealthRecord = useCallback(async (data: Omit<allTypes.StudentHealthRecord, 'id'>) => {
    try {
      const db = await databaseService.getDatabase();
      const d = { ...data, id: databaseService.generateId() };
      const result = await db.student_health_records?.insert(d);
      return result?.doc || null;
    } catch (error) { console.error('Error adding student health record:', error); throw error; }
  }, []);

  const updateStudentHealthRecord = useCallback(async (id: string, data: Partial<allTypes.StudentHealthRecord>) => {
    try {
      const db = await databaseService.getDatabase();
      const result = await db.student_health_records?.update(id, data);
      return result?.doc || null;
    } catch (error) { console.error('Error updating student health record:', error); throw error; }
  }, []);

  // ── Attendance ────────────────────────────────────────────────────────────────
  const saveStudentAttendance = useCallback(async (attendanceData: any) => {
    try {
      const db = await databaseService.getDatabase();
      const d = { ...attendanceData, id: databaseService.generateId() };
      const result = await db.student_attendance?.insert(d);
      const saved = result?.doc || d;
      setLocalAttendance(prev => [...prev, saved]);
      return saved;
    } catch (error) { console.error('Error saving student attendance:', error); throw error; }
  }, []);

  const getStudentAttendanceByFilters = useCallback(
    (dateOrFilters: string | { selector?: Record<string, unknown> }, classStreamId?: number, periodId?: number) => {
      try {
        const attendanceRecords = getCachedStudentAttendance();
        const students = getCachedStudents();

        if (typeof dateOrFilters === 'string') {
          if (classStreamId === undefined || periodId === undefined) return [];
          const studentIdsInStream = new Set(
            students
              .filter(student => Number(student.current_class_stream_id) === Number(classStreamId))
              .map(student => student.id)
          );
          return attendanceRecords.filter(record =>
            record.date === dateOrFilters &&
            Number(record.period_id) === Number(periodId) &&
            studentIdsInStream.has(record.student_id)
          );
        }

        const selectorEntries = Object.entries(dateOrFilters?.selector || {});
        if (selectorEntries.length === 0) return attendanceRecords;
        return attendanceRecords.filter(record =>
          selectorEntries.every(([field, expectedValue]) => {
            const recordValue = (record as Record<string, unknown>)[field];
            return Array.isArray(expectedValue) ? expectedValue.includes(recordValue) : recordValue === expectedValue;
          })
        );
      } catch (error) {
        console.error('Error getting student attendance by filters:', error);
        return [];
      }
    },
    [getCachedStudentAttendance, getCachedStudents]
  );

  return {
    // Data
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

    // CRUD
    getStudentDetailsById,
    addStudent, updateStudent, deleteStudent,
    addStaffMember, updateStaffMember, deleteStaffMember,
    addParentGuardian, updateParentGuardian, deleteParentGuardian,
    addStudentGuardianRelationship, updateStudentGuardianRelationship, deleteStudentGuardianRelationship,
    addDepartment, updateDepartment, deleteDepartment,
    addDesignation, updateDesignation, deleteDesignation,
    addStudentCategory, updateStudentCategory, deleteStudentCategory,
    addDormitory, updateDormitory, deleteDormitory,
    addClass, updateClass, deleteClass,
    addClassStream, updateClassStream, deleteClassStream,
    addPartner, updatePartner, deletePartner,
    addClub, updateClub, deleteClub,
    addCustomer, updateCustomer, deleteCustomer,
    addStudentHealthRecord, updateStudentHealthRecord,
    saveStudentAttendance, getStudentAttendanceByFilters,
    
    // Aliases for page compatibility
    createStudent: addStudent,
    createStaffMember: addStaffMember,
    createParentGuardian: addParentGuardian,
    createDepartment: addDepartment,
    createDesignation: addDesignation,
    createStudentCategory: addStudentCategory,
    createDormitory: addDormitory,
    createClass: addClass,
    createClassStream: addClassStream,
    createPartner: addPartner,
    createClub: addClub,
    createCustomer: addCustomer,
    createStudentHealthRecord: addStudentHealthRecord,
  };
}
