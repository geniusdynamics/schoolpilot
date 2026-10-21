import { logger } from '@/utils/logging';

// ABOUTME: Administration domain hook — Students, Staff, Classes, Departments, Dormitories,
// ABOUTME: Clubs, Partners, Attendance, Guardians, Health Records, Disciplinary records
// ABOUTME: Uses real database-backed hooks for persistent data

import { useCallback, useMemo } from 'react';
import { databaseService } from '@/services/database/databaseService';
import { useToastHelpers } from '@/hooks/useToast';
import { useDatabaseCollection } from '@/hooks/useDatabaseCollection';
import * as allTypes from './types';
import type { StudentDetailProfile } from '@/core/types';
import { StudentStatus } from '@/core/types';

export function useAdministrationData() {
  const studentsCollection = useDatabaseCollection<allTypes.Student>('students');
  const staffCollection = useDatabaseCollection<any>('staff');
  const classesCollection = useDatabaseCollection<allTypes.Class>('classes');
  const classStreamsCollection = useDatabaseCollection<allTypes.ClassStream>('class_streams');
  const departmentsCollection = useDatabaseCollection<allTypes.Department>('departments');
  const designationsCollection = useDatabaseCollection<allTypes.Designation>('designations');
  const studentCategoriesCollection = useDatabaseCollection<allTypes.StudentCategory>('student_categories');
  const dormitoriesCollection = useDatabaseCollection<allTypes.Dormitory>('dormitories');
  const parentsGuardiansCollection = useDatabaseCollection<any>('parents_guardians');
  const partnersCollection = useDatabaseCollection<any>('partners');
  const clubsCollection = useDatabaseCollection<any>('clubs');
  const customersCollection = useDatabaseCollection<any>('customers');
  const studentHealthRecordsCollection = useDatabaseCollection<allTypes.StudentHealthRecord>('student_health_records');
  const studentAttendanceCollection = useDatabaseCollection<any>('student_attendance');
  const disciplinaryRecordsCollection = useDatabaseCollection<any>('disciplinary_records');
  const healthIncidentReportsCollection = useDatabaseCollection<any>('health_incident_reports');
  const studentClassHistoryCollection = useDatabaseCollection<any>('student_class_history');
  const studentGuardianRelationshipsCollection = useDatabaseCollection<allTypes.StudentGuardianRelationship>('student_guardian_relationships');
  const schoolDetailsCollection = useDatabaseCollection<any>('school_details');

  const toast = useToastHelpers();

  // ── Students ─────────────────────────────────────────────────────────────────
  const getStudentDetailsById = useCallback(async (studentId: string): Promise<StudentDetailProfile | null> => {
    try {
      const db = await databaseService.getDatabase();
      const student = await db.students?.findById(studentId);
      if (!student) return null;
      const guardianRelationships = await db.student_guardian_relationships?.find({ selector: { student_id: studentId } }) || [];
      const guardianIds = guardianRelationships.map((rel: any) => rel.guardian_id);
      const guardians = guardianIds.length > 0
        ? await db.parents_guardians?.find({ selector: { id: { $in: guardianIds } } }) || []
        : [];
      return { ...student, guardians } as StudentDetailProfile;
    } catch (error) {
      logger.error('Error fetching student details:', error);
      return null;
    }
  }, []);

  const addStudent = useCallback(async (studentData: Omit<allTypes.Student, 'id'>) => {
    try {
      const result = await studentsCollection.insert(studentData);
      toast.showSuccess('Student created successfully');
      return result;
    } catch (error) {
      logger.error('Error adding student:', error);
      toast.showError(`Failed to create student: ${error}`);
      throw error;
    }
  }, [studentsCollection, toast]);

  const updateStudent = useCallback(async (studentId: string, studentData: Partial<allTypes.Student>) => {
    try {
      const result = await studentsCollection.update(studentId, studentData);
      toast.showSuccess('Student updated successfully');
      return result;
    } catch (error) {
      logger.error('Error updating student:', error);
      toast.showError(`Failed to update student: ${error}`);
      throw error;
    }
  }, [studentsCollection, toast]);

  const deleteStudent = useCallback(async (studentId: string) => {
    try {
      await studentsCollection.remove(studentId);
      toast.showSuccess('Student deleted successfully');
      return true;
    } catch (error) {
      logger.error('Error deleting student:', error);
      toast.showError(`Failed to delete student: ${error}`);
      throw error;
    }
  }, [studentsCollection, toast]);

  // ── Staff ─────────────────────────────────────────────────────────────────────
  const addStaffMember = useCallback(async (staffData: Omit<any, 'id'>) => {
    return staffCollection.insert(staffData);
  }, [staffCollection]);

  const updateStaffMember = useCallback(async (staffId: string, staffData: Partial<any>) => {
    return staffCollection.update(staffId, staffData);
  }, [staffCollection]);

  const deleteStaffMember = useCallback(async (staffId: string) => {
    return staffCollection.remove(staffId);
  }, [staffCollection]);

  // ── Parents / Guardians ───────────────────────────────────────────────────────
  const addParentGuardian = useCallback(async (guardianData: Omit<any, 'id'>) => {
    return parentsGuardiansCollection.insert(guardianData);
  }, [parentsGuardiansCollection]);

  const updateParentGuardian = useCallback(async (guardianId: string, guardianData: Partial<any>) => {
    return parentsGuardiansCollection.update(guardianId, guardianData);
  }, [parentsGuardiansCollection]);

  const deleteParentGuardian = useCallback(async (guardianId: string) => {
    return parentsGuardiansCollection.remove(guardianId);
  }, [parentsGuardiansCollection]);

  const addStudentGuardianRelationship = useCallback(async (data: Omit<allTypes.StudentGuardianRelationship, 'id'>) => {
    return studentGuardianRelationshipsCollection.insert(data);
  }, [studentGuardianRelationshipsCollection]);

  const updateStudentGuardianRelationship = useCallback(async (id: string, data: Partial<allTypes.StudentGuardianRelationship>) => {
    return studentGuardianRelationshipsCollection.update(id, data);
  }, [studentGuardianRelationshipsCollection]);

  const deleteStudentGuardianRelationship = useCallback(async (id: string) => {
    return studentGuardianRelationshipsCollection.remove(id);
  }, [studentGuardianRelationshipsCollection]);

  // ── Departments / Designations ────────────────────────────────────────────────
  const addDepartment = useCallback(async (data: Omit<allTypes.Department, 'id'>) => {
    return departmentsCollection.insert(data);
  }, [departmentsCollection]);

  const updateDepartment = useCallback(async (id: string, data: Partial<allTypes.Department>) => {
    return departmentsCollection.update(id, data);
  }, [departmentsCollection]);

  const deleteDepartment = useCallback(async (id: string) => {
    return departmentsCollection.remove(id);
  }, [departmentsCollection]);

  const addDesignation = useCallback(async (data: Omit<allTypes.Designation, 'id'>) => {
    return designationsCollection.insert(data);
  }, [designationsCollection]);

  const updateDesignation = useCallback(async (id: string, data: Partial<allTypes.Designation>) => {
    return designationsCollection.update(id, data);
  }, [designationsCollection]);

  const deleteDesignation = useCallback(async (id: string) => {
    return designationsCollection.remove(id);
  }, [designationsCollection]);

  // ── Student Categories ────────────────────────────────────────────────────────
  const addStudentCategory = useCallback(async (data: Omit<allTypes.StudentCategory, 'id'>) => {
    return studentCategoriesCollection.insert(data);
  }, [studentCategoriesCollection]);

  const updateStudentCategory = useCallback(async (id: string, data: Partial<allTypes.StudentCategory>) => {
    return studentCategoriesCollection.update(id, data);
  }, [studentCategoriesCollection]);

  const deleteStudentCategory = useCallback(async (id: string) => {
    return studentCategoriesCollection.remove(id);
  }, [studentCategoriesCollection]);

  // ── Dormitories ───────────────────────────────────────────────────────────────
  const addDormitory = useCallback(async (data: Omit<allTypes.Dormitory, 'id'>) => {
    return dormitoriesCollection.insert(data);
  }, [dormitoriesCollection]);

  const updateDormitory = useCallback(async (id: string, data: Partial<allTypes.Dormitory>) => {
    return dormitoriesCollection.update(id, data);
  }, [dormitoriesCollection]);

  const deleteDormitory = useCallback(async (id: string) => {
    return dormitoriesCollection.remove(id);
  }, [dormitoriesCollection]);

  // ── Classes / Streams ─────────────────────────────────────────────────────────
  const addClass = useCallback(async (data: Omit<allTypes.Class, 'id'>) => {
    return classesCollection.insert(data);
  }, [classesCollection]);

  const updateClass = useCallback(async (id: string, data: Partial<allTypes.Class>) => {
    return classesCollection.update(id, data);
  }, [classesCollection]);

  const deleteClass = useCallback(async (id: string) => {
    return classesCollection.remove(id);
  }, [classesCollection]);

  const addClassStream = useCallback(async (data: Omit<allTypes.ClassStream, 'id'>) => {
    return classStreamsCollection.insert(data);
  }, [classStreamsCollection]);

  const updateClassStream = useCallback(async (id: string, data: Partial<allTypes.ClassStream>) => {
    return classStreamsCollection.update(id, data);
  }, [classStreamsCollection]);

  const deleteClassStream = useCallback(async (id: string) => {
    return classStreamsCollection.remove(id);
  }, [classStreamsCollection]);

  // ── Partners / Clubs / Customers ──────────────────────────────────────────────
  const addPartner = useCallback(async (data: any) => {
    return partnersCollection.insert(data);
  }, [partnersCollection]);

  const updatePartner = useCallback(async (id: string, data: any) => {
    return partnersCollection.update(id, data);
  }, [partnersCollection]);

  const deletePartner = useCallback(async (id: string) => {
    return partnersCollection.remove(id);
  }, [partnersCollection]);

  const addClub = useCallback(async (data: any) => {
    return clubsCollection.insert(data);
  }, [clubsCollection]);

  const updateClub = useCallback(async (id: string, data: any) => {
    return clubsCollection.update(id, data);
  }, [clubsCollection]);

  const deleteClub = useCallback(async (id: string) => {
    return clubsCollection.remove(id);
  }, [clubsCollection]);

  const addCustomer = useCallback(async (data: any) => {
    return customersCollection.insert(data);
  }, [customersCollection]);

  const updateCustomer = useCallback(async (id: string, data: any) => {
    return customersCollection.update(id, data);
  }, [customersCollection]);

  const deleteCustomer = useCallback(async (id: string) => {
    return customersCollection.remove(id);
  }, [customersCollection]);

  // ── Student Health ────────────────────────────────────────────────────────────
  const addStudentHealthRecord = useCallback(async (data: Omit<allTypes.StudentHealthRecord, 'id'>) => {
    return studentHealthRecordsCollection.insert(data);
  }, [studentHealthRecordsCollection]);

  const updateStudentHealthRecord = useCallback(async (id: string, data: Partial<allTypes.StudentHealthRecord>) => {
    return studentHealthRecordsCollection.update(id, data);
  }, [studentHealthRecordsCollection]);

  const deleteStudentHealthRecord = useCallback(async (id: string) => {
    return studentHealthRecordsCollection.remove(id);
  }, [studentHealthRecordsCollection]);

  // ── School Details (single profile record) ────────────────────────────────────
  const updateSchoolDetails = useCallback(async (id: string, patch: Record<string, unknown>) => {
    const db = await databaseService.getDatabase();
    const existing = await db.getCollection('school_details')?.findById(id);
    const now = new Date().toISOString();
    if (existing) return schoolDetailsCollection.update(id, { ...patch, updated_at: now });
    return schoolDetailsCollection.insert({ created_at: now, ...patch, id, updated_at: now });
  }, [schoolDetailsCollection]);

  // ── Student Class History ─────────────────────────────────────────────────────
  const addStudentClassHistory = useCallback(async (data: Record<string, unknown>) => {
    return studentClassHistoryCollection.insert({ created_at: new Date().toISOString(), ...data });
  }, [studentClassHistoryCollection]);

  const updateStudentClassHistory = useCallback(async (id: string, data: Record<string, unknown>) => {
    return studentClassHistoryCollection.update(id, data);
  }, [studentClassHistoryCollection]);

  const deleteStudentClassHistory = useCallback(async (id: string) => {
    return studentClassHistoryCollection.remove(id);
  }, [studentClassHistoryCollection]);

  const getStudentClassHistory = useCallback((studentId: string) => {
    return studentClassHistoryCollection.data
      .filter((entry: any) => String(entry.student_id) === String(studentId))
      .sort((a: any, b: any) => String(a.start_date ?? '').localeCompare(String(b.start_date ?? '')));
  }, [studentClassHistoryCollection.data]);

  // ── Transfer Certificates ─────────────────────────────────────────────────────
  const transferCertificateStudents = useMemo<allTypes.TransferCertificateStudent[]>(() =>
    studentsCollection.data
      .filter((student) => student.status === StudentStatus.TRANSFERRED)
      .map((student: any) => ({
        id: student.id,
        student_id: student.admission_no ?? '',
        name: [student.first_name, student.middle_name, student.last_name].filter(Boolean).join(' '),
        class_name: student.current_class_name ?? '',
        section: student.current_class_stream_name ?? '',
        roll_number: student.admission_no ?? '',
        admission_date: student.admission_date ?? '',
        father_name: student.father_name ?? '',
        mother_name: student.mother_name ?? '',
        date_of_birth: student.date_of_birth ?? '',
        address: student.address ?? '',
      })), [studentsCollection.data]);

  // ── Attendance ────────────────────────────────────────────────────────────────
  const saveStudentAttendance = useCallback(async (attendanceData: any) => {
    return studentAttendanceCollection.insert(attendanceData);
  }, [studentAttendanceCollection]);

  const getStudentAttendanceByFilters = useCallback(
    (dateOrFilters: string | { selector?: Record<string, unknown> }, classStreamId?: number, periodId?: number) => {
      try {
        const attendanceRecords = studentAttendanceCollection.data;
        const students = studentsCollection.data;

        if (typeof dateOrFilters === 'string') {
          if (classStreamId === undefined || periodId === undefined) return [];
          const studentIdsInStream = new Set(
            students
              .filter(student => String(student.current_class_stream_id) === String(classStreamId))
              .map(student => student.id)
          );
          return attendanceRecords.filter(record =>
            record.date === dateOrFilters &&
            String(record.period_id) === String(periodId) &&
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
        logger.error('Error getting student attendance by filters:', error);
        return [];
      }
    },
    [studentAttendanceCollection.data, studentsCollection.data]
  );

  return {
    // Data
    students: studentsCollection.data,
    staff: staffCollection.data,
    classes: classesCollection.data,
    classStreams: classStreamsCollection.data,
    departments: departmentsCollection.data,
    designations: designationsCollection.data,
    studentCategories: studentCategoriesCollection.data,
    dormitories: dormitoriesCollection.data,
    parentsGuardians: parentsGuardiansCollection.data,
    partners: partnersCollection.data,
    clubs: clubsCollection.data,
    customers: customersCollection.data,
    studentHealthRecords: studentHealthRecordsCollection.data,
    studentAttendance: studentAttendanceCollection.data,
    disciplinaryRecords: disciplinaryRecordsCollection.data,
    healthIncidentReports: healthIncidentReportsCollection.data,
    studentClassHistory: studentClassHistoryCollection.data,
    schoolDetails: schoolDetailsCollection.data[0] ?? null,
    transferCertificateStudents,

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
    addStudentHealthRecord, updateStudentHealthRecord, deleteStudentHealthRecord,
    updateSchoolDetails,
    addStudentClassHistory, updateStudentClassHistory, deleteStudentClassHistory, getStudentClassHistory,
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
    createStudentClassHistory: addStudentClassHistory,
  };
}
