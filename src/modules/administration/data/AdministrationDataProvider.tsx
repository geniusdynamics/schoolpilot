// ABOUTME: Administration Data Provider
// ABOUTME: Provides module-specific data and CRUD operations for Administration
// ABOUTME: This keeps Administration logic encapsulated within the module

import React, { createContext, useContext, ReactNode, useCallback, useState } from 'react';
import { databaseService } from '@/services/database/databaseService';
import { useToast } from '@/hooks/useToast';
import { useValidation, ValidationSchema } from '@/hooks/useValidation';
import * as types from './types';
import { useConfirm } from '@/components/ui/ConfirmDialog';

interface AdministrationDataContextType {
  // Data collections (read-only, from AppDataContext)
  classes: types.Class[];
  classStreams: types.ClassStream[];
  students: types.Student[];
  staff: types.Staff[];
  departments: types.Department[];
  designations: types.Designation[];
  academicYears: types.AcademicYear[];
  dormitories: types.Dormitory[];
  studentCategories: types.StudentCategory[];
  loading: boolean;
  
  // CRUD Operations - Classes
  addClass: (data: Omit<types.Class, 'id' | 'created_at' | 'updated_at'>) => Promise<types.Class>;
  updateClass: (id: string, data: Partial<types.Class>) => Promise<types.Class>;
  deleteClass: (id: string) => Promise<void>;
  bulkAddClasses: (items: Array<Omit<types.Class, 'id' | 'created_at' | 'updated_at'>>) => Promise<types.Class[]>;
  bulkUpdateClasses: (ids: string[], data: Partial<types.Class>) => Promise<types.Class[]>;
  bulkDeleteClasses: (ids: string[]) => Promise<void>;
  
  // CRUD Operations - Class Streams
  addClassStream: (data: Omit<types.ClassStream, 'id' | 'created_at' | 'updated_at'>) => Promise<types.ClassStream>;
  updateClassStream: (id: string, data: Partial<types.ClassStream>) => Promise<types.ClassStream>;
  deleteClassStream: (id: string) => Promise<void>;
  
  // CRUD Operations - Students
  addStudent: (data: Omit<types.Student, 'id' | 'created_at' | 'updated_at'>) => Promise<types.Student>;
  updateStudent: (id: string, data: Partial<types.Student>) => Promise<types.Student>;
  deleteStudent: (id: string) => Promise<void>;
  
  // CRUD Operations - Staff
  addStaff: (data: Omit<types.Staff, 'id' | 'created_at' | 'updated_at'>) => Promise<types.Staff>;
  updateStaff: (id: string, data: Partial<types.Staff>) => Promise<types.Staff>;
  deleteStaff: (id: string) => Promise<void>;
  
  // CRUD Operations - Departments
  addDepartment: (data: Omit<types.Department, 'id' | 'created_at' | 'updated_at'>) => Promise<types.Department>;
  updateDepartment: (id: string, data: Partial<types.Department>) => Promise<types.Department>;
  deleteDepartment: (id: string) => Promise<void>;
  
  // CRUD Operations - Academic Years
  addAcademicYear: (data: Omit<types.AcademicYear, 'id' | 'created_at' | 'updated_at'>) => Promise<types.AcademicYear>;
  updateAcademicYear: (id: string, data: Partial<types.AcademicYear>) => Promise<types.AcademicYear>;
  deleteAcademicYear: (id: string) => Promise<void>;
  
  // Validation
  validateClass: (data: Partial<types.Class>) => { valid: boolean; errors: Array<{ field: string; message: string }> };
  validateClassStream: (data: Partial<types.ClassStream>) => { valid: boolean; errors: Array<{ field: string; message: string }> };
  validateStudent: (data: Partial<types.Student>) => { valid: boolean; errors: Array<{ field: string; message: string }> };
}

const AdministrationDataContext = createContext<AdministrationDataContextType | undefined>(undefined);

export const useAdministrationDataContext = () => {
  const context = useContext(AdministrationDataContext);
  if (!context) {
    throw new Error('useAdministrationDataContext must be used within AdministrationDataProvider');
  }
  return context;
};

interface Props {
  children: ReactNode;
  // Initial data from AppDataContext
  classes: types.Class[];
  classStreams: types.ClassStream[];
  students: types.Student[];
  staff: types.Staff[];
  departments: types.Department[];
  designations: types.Designation[];
  academicYears: types.AcademicYear[];
  dormitories: types.Dormitory[];
  studentCategories: types.StudentCategory[];
  loading: boolean;
}

export const AdministrationDataProvider: React.FC<Props> = ({
  children,
  classes,
  classStreams,
  students,
  staff,
  departments,
  designations,
  academicYears,
  dormitories,
  studentCategories,
  loading: parentLoading,
}) => {
  const toast = useToast();
  const confirm = useConfirm();
  const [localLoading, setLocalLoading] = useState(false);
  const loading = parentLoading || localLoading;

  const classValidation = useValidation<types.Class>();
  const classStreamValidation = useValidation<types.ClassStream>();
  const studentValidation = useValidation<types.Student>();

  // Validation schemas
  const classSchema: ValidationSchema<types.Class> = [
    { field: 'name', required: true, minLength: 2, maxLength: 100 },
  ];

  const classStreamSchema: ValidationSchema<types.ClassStream> = [
    { field: 'name', required: true, minLength: 1, maxLength: 50 },
    { field: 'class_id', required: true },
  ];

  const studentSchema: ValidationSchema<types.Student> = [
    { field: 'first_name', required: true, minLength: 2 },
    { field: 'last_name', required: true, minLength: 2 },
    { field: 'admission_no', required: true, unique: true },
    { field: 'email', email: true },
  ];

  // ===== CLASS CRUD =====
  const addClass = useCallback(async (data: Omit<types.Class, 'id' | 'created_at' | 'updated_at'>) => {
    // Validate
    const validation = classValidation.validate(data, classSchema, classes);
    if (!validation.valid) {
      toast.showError(validation.errors.map(e => e.message).join(', '));
      throw new Error('Validation failed');
    }

    setLocalLoading(true);
    try {
      const db = await databaseService.getDatabase();
      const newClass: types.Class = {
        ...data,
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      await db.classes?.insert(newClass);
      toast.showSuccess('Class created successfully');
      return newClass;
    } catch (error) {
      toast.showError(`Failed to create class: ${error}`);
      throw error;
    } finally {
      setLocalLoading(false);
    }
  }, [classes, toast, classValidation]);

  const updateClass = useCallback(async (id: string, data: Partial<types.Class>) => {
    setLocalLoading(true);
    try {
      const db = await databaseService.getDatabase();
      const updates = { ...data, updated_at: new Date().toISOString() };
      await db.classes?.update(id, updates);
      toast.showSuccess('Class updated successfully');
      return { ...classes.find(c => c.id === id), ...updates } as types.Class;
    } catch (error) {
      toast.showError(`Failed to update class: ${error}`);
      throw error;
    } finally {
      setLocalLoading(false);
    }
  }, [classes, toast]);

  const deleteClass = useCallback(async (id: string) => {
    const confirmed = await confirm({ variant: 'danger', message: 'Are you sure you want to delete this class?' });
    if (!confirmed) return;

    setLocalLoading(true);
    try {
      const db = await databaseService.getDatabase();
      await db.classes?.remove(id);
      toast.showSuccess('Class deleted successfully');
    } catch (error) {
      toast.showError(`Failed to delete class: ${error}`);
      throw error;
    } finally {
      setLocalLoading(false);
    }
  }, [toast]);

  // ===== BATCH CLASS OPERATIONS =====
  const bulkAddClasses = useCallback(async (
    items: Array<Omit<types.Class, 'id' | 'created_at' | 'updated_at'>>
  ): Promise<types.Class[]> => {
    setLocalLoading(true);
    const created: types.Class[] = [];
    try {
      for (const item of items) {
        const newClass = await addClass(item);
        created.push(newClass);
      }
      toast.showSuccess(`${created.length} classes created successfully`);
      return created;
    } catch (error) {
      toast.showError(`Failed to create some classes: ${error}`);
      throw error;
    } finally {
      setLocalLoading(false);
    }
  }, [addClass, toast]);

  const bulkUpdateClasses = useCallback(async (ids: string[], data: Partial<types.Class>): Promise<types.Class[]> => {
    setLocalLoading(true);
    const updated: types.Class[] = [];
    try {
      for (const id of ids) {
        const result = await updateClass(id, data);
        updated.push(result);
      }
      toast.showSuccess(`${updated.length} classes updated successfully`);
      return updated;
    } catch (error) {
      toast.showError(`Failed to update some classes: ${error}`);
      throw error;
    } finally {
      setLocalLoading(false);
    }
  }, [updateClass, toast]);

  const bulkDeleteClasses = useCallback(async (ids: string[]) => {
    const confirmed = await confirm({ variant: 'danger', message: `Are you sure you want to delete ${ids.length} classes?` });
    if (!confirmed) return;

    setLocalLoading(true);
    try {
      for (const id of ids) {
        await deleteClass(id);
      }
      toast.showSuccess(`${ids.length} classes deleted successfully`);
    } catch (error) {
      toast.showError(`Failed to delete some classes: ${error}`);
      throw error;
    } finally {
      setLocalLoading(false);
    }
  }, [deleteClass, toast]);

  // ===== CLASS STREAM CRUD =====
  const addClassStream = useCallback(async (data: Omit<types.ClassStream, 'id' | 'created_at' | 'updated_at'>) => {
    const validation = classStreamValidation.validate(data, classStreamSchema, classStreams);
    if (!validation.valid) {
      toast.showError(validation.errors.map(e => e.message).join(', '));
      throw new Error('Validation failed');
    }

    setLocalLoading(true);
    try {
      const db = await databaseService.getDatabase();
      const newStream: types.ClassStream = {
        ...data,
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      await db.class_streams?.insert(newStream);
      toast.showSuccess('Class stream created successfully');
      return newStream;
    } catch (error) {
      toast.showError(`Failed to create class stream: ${error}`);
      throw error;
    } finally {
      setLocalLoading(false);
    }
  }, [classStreams, toast, classStreamValidation]);

  const updateClassStream = useCallback(async (id: string, data: Partial<types.ClassStream>) => {
    setLocalLoading(true);
    try {
      const db = await databaseService.getDatabase();
      const updates = { ...data, updated_at: new Date().toISOString() };
      await db.class_streams?.update(id, updates);
      toast.showSuccess('Class stream updated successfully');
      return { ...classStreams.find(s => s.id === id), ...updates } as types.ClassStream;
    } catch (error) {
      toast.showError(`Failed to update class stream: ${error}`);
      throw error;
    } finally {
      setLocalLoading(false);
    }
  }, [classStreams, toast]);

  const deleteClassStream = useCallback(async (id: string) => {
    const confirmed = await confirm({ variant: 'danger', message: 'Are you sure you want to delete this class stream?' });
    if (!confirmed) return;

    setLocalLoading(true);
    try {
      const db = await databaseService.getDatabase();
      await db.class_streams?.remove(id);
      toast.showSuccess('Class stream deleted successfully');
    } catch (error) {
      toast.showError(`Failed to delete class stream: ${error}`);
      throw error;
    } finally {
      setLocalLoading(false);
    }
  }, [toast]);

  // ===== STUDENT CRUD =====
  const addStudent = useCallback(async (data: Omit<types.Student, 'id' | 'created_at' | 'updated_at'>) => {
    const validation = studentValidation.validate(data, studentSchema, students);
    if (!validation.valid) {
      toast.showError(validation.errors.map(e => e.message).join(', '));
      throw new Error('Validation failed');
    }

    setLocalLoading(true);
    try {
      const db = await databaseService.getDatabase();
      const newStudent: types.Student = {
        ...data,
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      await db.students?.insert(newStudent);
      toast.showSuccess('Student created successfully');
      return newStudent;
    } catch (error) {
      toast.showError(`Failed to create student: ${error}`);
      throw error;
    } finally {
      setLocalLoading(false);
    }
  }, [students, toast, studentValidation]);

  const updateStudent = useCallback(async (id: string, data: Partial<types.Student>) => {
    setLocalLoading(true);
    try {
      const db = await databaseService.getDatabase();
      const updates = { ...data, updated_at: new Date().toISOString() };
      await db.students?.update(id, updates);
      toast.showSuccess('Student updated successfully');
      return { ...students.find(s => s.id === id), ...updates } as types.Student;
    } catch (error) {
      toast.showError(`Failed to update student: ${error}`);
      throw error;
    } finally {
      setLocalLoading(false);
    }
  }, [students, toast]);

  const deleteStudent = useCallback(async (id: string) => {
    const confirmed = await confirm({ variant: 'danger', message: 'Are you sure you want to delete this student?' });
    if (!confirmed) return;

    setLocalLoading(true);
    try {
      const db = await databaseService.getDatabase();
      await db.students?.remove(id);
      toast.showSuccess('Student deleted successfully');
    } catch (error) {
      toast.showError(`Failed to delete student: ${error}`);
      throw error;
    } finally {
      setLocalLoading(false);
    }
  }, [toast]);

  // ===== STAFF CRUD =====
  const addStaff = useCallback(async (data: Omit<types.Staff, 'id' | 'created_at' | 'updated_at'>) => {
    setLocalLoading(true);
    try {
      const db = await databaseService.getDatabase();
      const newStaff: types.Staff = {
        ...data,
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      await db.staff?.insert(newStaff);
      toast.showSuccess('Staff member created successfully');
      return newStaff;
    } catch (error) {
      toast.showError(`Failed to create staff: ${error}`);
      throw error;
    } finally {
      setLocalLoading(false);
    }
  }, [toast]);

  const updateStaff = useCallback(async (id: string, data: Partial<types.Staff>) => {
    setLocalLoading(true);
    try {
      const db = await databaseService.getDatabase();
      const updates = { ...data, updated_at: new Date().toISOString() };
      await db.staff?.update(id, updates);
      toast.showSuccess('Staff member updated successfully');
      return { ...staff.find(s => s.id === id), ...updates } as types.Staff;
    } catch (error) {
      toast.showError(`Failed to update staff: ${error}`);
      throw error;
    } finally {
      setLocalLoading(false);
    }
  }, [staff, toast]);

  const deleteStaff = useCallback(async (id: string) => {
    const confirmed = await confirm({ variant: 'danger', message: 'Are you sure you want to delete this staff member?' });
    if (!confirmed) return;

    setLocalLoading(true);
    try {
      const db = await databaseService.getDatabase();
      await db.staff?.remove(id);
      toast.showSuccess('Staff member deleted successfully');
    } catch (error) {
      toast.showError(`Failed to delete staff: ${error}`);
      throw error;
    } finally {
      setLocalLoading(false);
    }
  }, [toast]);

  // ===== DEPARTMENT CRUD =====
  const addDepartment = useCallback(async (data: Omit<types.Department, 'id' | 'created_at' | 'updated_at'>) => {
    setLocalLoading(true);
    try {
      const db = await databaseService.getDatabase();
      const newDept: types.Department = {
        ...data,
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      await db.departments?.insert(newDept);
      toast.showSuccess('Department created successfully');
      return newDept;
    } catch (error) {
      toast.showError(`Failed to create department: ${error}`);
      throw error;
    } finally {
      setLocalLoading(false);
    }
  }, [toast]);

  const updateDepartment = useCallback(async (id: string, data: Partial<types.Department>) => {
    setLocalLoading(true);
    try {
      const db = await databaseService.getDatabase();
      const updates = { ...data, updated_at: new Date().toISOString() };
      await db.departments?.update(id, updates);
      toast.showSuccess('Department updated successfully');
      return { ...departments.find(d => d.id === id), ...updates } as types.Department;
    } catch (error) {
      toast.showError(`Failed to update department: ${error}`);
      throw error;
    } finally {
      setLocalLoading(false);
    }
  }, [departments, toast]);

  const deleteDepartment = useCallback(async (id: string) => {
    const confirmed = await confirm({ variant: 'danger', message: 'Are you sure you want to delete this department?' });
    if (!confirmed) return;

    setLocalLoading(true);
    try {
      const db = await databaseService.getDatabase();
      await db.departments?.remove(id);
      toast.showSuccess('Department deleted successfully');
    } catch (error) {
      toast.showError(`Failed to delete department: ${error}`);
      throw error;
    } finally {
      setLocalLoading(false);
    }
  }, [toast]);

  // ===== ACADEMIC YEAR CRUD =====
  const addAcademicYear = useCallback(async (data: Omit<types.AcademicYear, 'id' | 'created_at' | 'updated_at'>) => {
    setLocalLoading(true);
    try {
      const db = await databaseService.getDatabase();
      const newYear: types.AcademicYear = {
        ...data,
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      await db.academic_years?.insert(newYear);
      toast.showSuccess('Academic year created successfully');
      return newYear;
    } catch (error) {
      toast.showError(`Failed to create academic year: ${error}`);
      throw error;
    } finally {
      setLocalLoading(false);
    }
  }, [toast]);

  const updateAcademicYear = useCallback(async (id: string, data: Partial<types.AcademicYear>) => {
    setLocalLoading(true);
    try {
      const db = await databaseService.getDatabase();
      const updates = { ...data, updated_at: new Date().toISOString() };
      await db.academic_years?.update(id, updates);
      toast.showSuccess('Academic year updated successfully');
      return { ...academicYears.find(y => y.id === id), ...updates } as types.AcademicYear;
    } catch (error) {
      toast.showError(`Failed to update academic year: ${error}`);
      throw error;
    } finally {
      setLocalLoading(false);
    }
  }, [academicYears, toast]);

  const deleteAcademicYear = useCallback(async (id: string) => {
    const confirmed = await confirm({ variant: 'danger', message: 'Are you sure you want to delete this academic year?' });
    if (!confirmed) return;

    setLocalLoading(true);
    try {
      const db = await databaseService.getDatabase();
      await db.academic_years?.remove(id);
      toast.showSuccess('Academic year deleted successfully');
    } catch (error) {
      toast.showError(`Failed to delete academic year: ${error}`);
      throw error;
    } finally {
      setLocalLoading(false);
    }
  }, [toast]);

  // ===== VALIDATION HELPERS =====
  const validateClass = useCallback((data: Partial<types.Class>) => {
    return classValidation.validate(data, classSchema, classes);
  }, [classes, classValidation]);

  const validateClassStream = useCallback((data: Partial<types.ClassStream>) => {
    return classStreamValidation.validate(data, classStreamSchema, classStreams);
  }, [classStreams, classStreamValidation]);

  const validateStudent = useCallback((data: Partial<types.Student>) => {
    return studentValidation.validate(data, studentSchema, students);
  }, [students, studentValidation]);

  const value: AdministrationDataContextType = {
    // Data
    classes,
    classStreams,
    students,
    staff,
    departments,
    designations,
    academicYears,
    dormitories,
    studentCategories,
    loading,
    
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

  return (
    <AdministrationDataContext.Provider value={value}>
      {children}
    </AdministrationDataContext.Provider>
  );
};

export default AdministrationDataProvider;
