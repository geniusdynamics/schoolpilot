// ABOUTME: Tests for Administration domain data hook - CRUD operations for Students, Staff, Classes, etc.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAdministrationData } from '../useAdministrationData';
import { databaseService } from '@/services/database/databaseService';

// Mock the database service
vi.mock('@/services/database/databaseService', () => ({
  databaseService: {
    getDatabase: vi.fn(),
    generateId: vi.fn(() => 'mock-id-123'),
  },
}));

describe('useAdministrationData', () => {
  const mockDb = {
    students: {
      findById: vi.fn(),
      insert: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
    },
    staff: {
      insert: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
    },
    classes: {
      insert: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
    },
    class_streams: {
      insert: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
    },
    departments: {
      insert: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
    },
    designations: {
      insert: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
    },
    student_categories: {
      insert: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
    },
    dormitories: {
      insert: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
    },
    parents_guardians: {
      find: vi.fn(),
      insert: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
    },
    student_guardian_relationships: {
      find: vi.fn(),
      insert: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
    },
    partners: {
      insert: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
    },
    clubs: {
      insert: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
    },
    customers: {
      insert: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
    },
    student_health_records: {
      insert: vi.fn(),
      update: vi.fn(),
    },
    student_attendance: {
      insert: vi.fn(),
      find: vi.fn(),
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (databaseService.getDatabase as any).mockResolvedValue(mockDb);
  });

  describe('Student CRUD Operations', () => {
    it('should add a student successfully', async () => {
      const mockStudent = { id: 'mock-id-123', first_name: 'John', last_name: 'Doe' };
      mockDb.students.insert.mockResolvedValue({ doc: mockStudent });

      const { result } = renderHook(() => useAdministrationData({}));

      let addedStudent: any;
      await act(async () => {
        addedStudent = await result.current.addStudent({ first_name: 'John', last_name: 'Doe' } as any);
      });

      expect(mockDb.students.insert).toHaveBeenCalledWith(expect.objectContaining({
        first_name: 'John',
        last_name: 'Doe',
        id: 'mock-id-123',
      }));
      expect(addedStudent).toEqual(mockStudent);
    });

    it('should update a student successfully', async () => {
      const mockStudent = { id: 'student-1', first_name: 'Jane', last_name: 'Doe' };
      mockDb.students.update.mockResolvedValue({ doc: mockStudent });

      const { result } = renderHook(() => useAdministrationData({}));

      let updatedStudent: any;
      await act(async () => {
        updatedStudent = await result.current.updateStudent('student-1', { first_name: 'Jane' });
      });

      expect(mockDb.students.update).toHaveBeenCalledWith('student-1', { first_name: 'Jane' });
      expect(updatedStudent).toEqual(mockStudent);
    });

    it('should delete a student successfully', async () => {
      mockDb.students.remove.mockResolvedValue(undefined);

      const { result } = renderHook(() => useAdministrationData({}));

      let deleteResult: any;
      await act(async () => {
        deleteResult = await result.current.deleteStudent('student-1');
      });

      expect(mockDb.students.remove).toHaveBeenCalledWith('student-1');
      expect(deleteResult).toBe(true);
    });

    it('getStudentDetailsById function should exist', () => {
      const { result } = renderHook(() => useAdministrationData({}));
      expect(typeof result.current.getStudentDetailsById).toBe('function');
    });
  });

  describe('Staff CRUD Operations', () => {
    it('should add a staff member successfully', async () => {
      const mockStaff = { id: 'mock-id-123', first_name: 'Teacher', last_name: 'One' };
      mockDb.staff.insert.mockResolvedValue({ doc: mockStaff });

      const { result } = renderHook(() => useAdministrationData({}));

      let addedStaff: any;
      await act(async () => {
        addedStaff = await result.current.addStaffMember({ first_name: 'Teacher', last_name: 'One' });
      });

      expect(mockDb.staff.insert).toHaveBeenCalled();
      expect(addedStaff).toEqual(mockStaff);
    });

    it('should update a staff member successfully', async () => {
      const mockStaff = { id: 'staff-1', first_name: 'Updated', last_name: 'Name' };
      mockDb.staff.update.mockResolvedValue({ doc: mockStaff });

      const { result } = renderHook(() => useAdministrationData({}));

      let updatedStaff: any;
      await act(async () => {
        updatedStaff = await result.current.updateStaffMember('staff-1', { first_name: 'Updated' });
      });

      expect(mockDb.staff.update).toHaveBeenCalledWith('staff-1', { first_name: 'Updated' });
      expect(updatedStaff).toEqual(mockStaff);
    });

    it('should delete a staff member successfully', async () => {
      mockDb.staff.remove.mockResolvedValue(undefined);

      const { result } = renderHook(() => useAdministrationData({}));

      let deleteResult: any;
      await act(async () => {
        deleteResult = await result.current.deleteStaffMember('staff-1');
      });

      expect(mockDb.staff.remove).toHaveBeenCalledWith('staff-1');
      expect(deleteResult).toBe(true);
    });
  });

  describe('Class CRUD Operations', () => {
    it('should add a class successfully', async () => {
      const mockClass = { id: 'mock-id-123', name: 'Form 1', level: 1 };
      mockDb.classes.insert.mockResolvedValue({ doc: mockClass });

      const { result } = renderHook(() => useAdministrationData({}));

      let addedClass: any;
      await act(async () => {
        addedClass = await result.current.addClass({ name: 'Form 1', level: 1 } as any);
      });

      expect(mockDb.classes.insert).toHaveBeenCalled();
      expect(addedClass).toEqual(mockClass);
    });

    it('should update a class successfully', async () => {
      const mockClass = { id: 'class-1', name: 'Updated Form 1', level: 1 };
      mockDb.classes.update.mockResolvedValue({ doc: mockClass });

      const { result } = renderHook(() => useAdministrationData({}));

      let updatedClass: any;
      await act(async () => {
        updatedClass = await result.current.updateClass('class-1', { name: 'Updated Form 1' });
      });

      expect(mockDb.classes.update).toHaveBeenCalledWith('class-1', { name: 'Updated Form 1' });
      expect(updatedClass).toEqual(mockClass);
    });

    it('should delete a class successfully', async () => {
      mockDb.classes.remove.mockResolvedValue(undefined);

      const { result } = renderHook(() => useAdministrationData({}));

      let deleteResult: any;
      await act(async () => {
        deleteResult = await result.current.deleteClass('class-1');
      });

      expect(mockDb.classes.remove).toHaveBeenCalledWith('class-1');
      expect(deleteResult).toBe(true);
    });
  });

  describe('Class Stream CRUD Operations', () => {
    it('should add a class stream successfully', async () => {
      const mockStream = { id: 'mock-id-123', name: 'A', class_id: 'class-1' };
      mockDb.class_streams.insert.mockResolvedValue({ doc: mockStream });

      const { result } = renderHook(() => useAdministrationData({}));

      let addedStream: any;
      await act(async () => {
        addedStream = await result.current.addClassStream({ name: 'A', class_id: 'class-1' } as any);
      });

      expect(mockDb.class_streams.insert).toHaveBeenCalled();
      expect(addedStream).toEqual(mockStream);
    });

    it('should update a class stream successfully', async () => {
      const mockStream = { id: 'stream-1', name: 'B', class_id: 'class-1' };
      mockDb.class_streams.update.mockResolvedValue({ doc: mockStream });

      const { result } = renderHook(() => useAdministrationData({}));

      let updatedStream: any;
      await act(async () => {
        updatedStream = await result.current.updateClassStream('stream-1', { name: 'B' });
      });

      expect(mockDb.class_streams.update).toHaveBeenCalledWith('stream-1', { name: 'B' });
      expect(updatedStream).toEqual(mockStream);
    });
  });

  describe('Department CRUD Operations', () => {
    it('should add a department successfully', async () => {
      const mockDept = { id: 'mock-id-123', name: 'Mathematics' };
      mockDb.departments.insert.mockResolvedValue({ doc: mockDept });

      const { result } = renderHook(() => useAdministrationData({}));

      let addedDept: any;
      await act(async () => {
        addedDept = await result.current.addDepartment({ name: 'Mathematics' } as any);
      });

      expect(mockDb.departments.insert).toHaveBeenCalled();
      expect(addedDept).toEqual(mockDept);
    });

    it('should update a department successfully', async () => {
      const mockDept = { id: 'dept-1', name: 'Science' };
      mockDb.departments.update.mockResolvedValue({ doc: mockDept });

      const { result } = renderHook(() => useAdministrationData({}));

      let updatedDept: any;
      await act(async () => {
        updatedDept = await result.current.updateDepartment('dept-1', { name: 'Science' });
      });

      expect(mockDb.departments.update).toHaveBeenCalledWith('dept-1', { name: 'Science' });
      expect(updatedDept).toEqual(mockDept);
    });
  });

  describe('Dormitory CRUD Operations', () => {
    it('should add a dormitory successfully', async () => {
      const mockDorm = { id: 'mock-id-123', name: 'East Wing', capacity: 100 };
      mockDb.dormitories.insert.mockResolvedValue({ doc: mockDorm });

      const { result } = renderHook(() => useAdministrationData({}));

      let addedDorm: any;
      await act(async () => {
        addedDorm = await result.current.addDormitory({ name: 'East Wing', capacity: 100 } as any);
      });

      expect(mockDb.dormitories.insert).toHaveBeenCalled();
      expect(addedDorm).toEqual(mockDorm);
    });

    it('should update a dormitory successfully', async () => {
      const mockDorm = { id: 'dorm-1', name: 'West Wing', capacity: 80 };
      mockDb.dormitories.update.mockResolvedValue({ doc: mockDorm });

      const { result } = renderHook(() => useAdministrationData({}));

      let updatedDorm: any;
      await act(async () => {
        updatedDorm = await result.current.updateDormitory('dorm-1', { capacity: 80 });
      });

      expect(mockDb.dormitories.update).toHaveBeenCalledWith('dorm-1', { capacity: 80 });
      expect(updatedDorm).toEqual(mockDorm);
    });
  });

  describe('Attendance Operations', () => {
    it('should save student attendance successfully', async () => {
      const mockAttendance = { id: 'mock-id-123', student_id: 'student-1', date: '2024-01-15', status: 'present' };
      mockDb.student_attendance.insert.mockResolvedValue({ doc: mockAttendance });

      const { result } = renderHook(() => useAdministrationData({}));

      let savedAttendance: any;
      await act(async () => {
        savedAttendance = await result.current.saveStudentAttendance({
          student_id: 'student-1',
          date: '2024-01-15',
          status: 'present',
        });
      });

      expect(mockDb.student_attendance.insert).toHaveBeenCalled();
      expect(savedAttendance).toEqual(mockAttendance);
    });

    it('should get student attendance by filters', async () => {
      const mockAttendance = [
        { id: '1', student_id: 'student-1', date: '2024-01-15', status: 'present' },
      ];

      const { result } = renderHook(() => useAdministrationData({
        studentAttendance: mockAttendance,
      }));

      const attendance = result.current.getStudentAttendanceByFilters({
        selector: { student_id: 'student-1' },
      });

      expect(attendance).toHaveLength(1);
      expect(attendance[0].student_id).toBe('student-1');
    });
  });

  describe('Initial Data State', () => {
    it('should return empty arrays for all data properties initially', () => {
      const { result } = renderHook(() => useAdministrationData({}));

      expect(result.current.students).toEqual([]);
      expect(result.current.staff).toEqual([]);
      expect(result.current.classes).toEqual([]);
      expect(result.current.classStreams).toEqual([]);
      expect(result.current.departments).toEqual([]);
      expect(result.current.designations).toEqual([]);
      expect(result.current.studentCategories).toEqual([]);
      expect(result.current.dormitories).toEqual([]);
      expect(result.current.parentsGuardians).toEqual([]);
      expect(result.current.partners).toEqual([]);
      expect(result.current.clubs).toEqual([]);
      expect(result.current.customers).toEqual([]);
      expect(result.current.studentHealthRecords).toEqual([]);
      expect(result.current.studentAttendance).toEqual([]);
    });
  });
});
