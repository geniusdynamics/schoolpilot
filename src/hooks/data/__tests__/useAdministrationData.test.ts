// ABOUTME: Tests for Administration domain data hook - CRUD operations for Students, Staff, Classes, etc.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, waitFor } from '@testing-library/react';
import { useAdministrationData } from '@/modules/administration/data/useAdministrationData';
import { databaseService } from '@/services/database/databaseService';

// Mock the database service.
// `useAdministrationData` reads/writes through `useDatabaseCollection`, which resolves
// the database via `databaseService.getDatabase()` and fetches each collection with
// `db.getCollection(name)`. `insert`/`update` surface the collection's
// InsertResult/UpdateResult (`{ id, doc, ok }`), so mocks follow those shapes.
// `getStudentDetailsById` additionally reads `db.students`/`db.student_guardian_relationships`/
// `db.parents_guardians` directly, so those are exposed on the mock db as well.
vi.mock('@/services/database/databaseService', () => ({
  databaseService: {
    getDatabase: vi.fn(),
    generateId: vi.fn(() => 'mock-id-123'),
  },
}));

type MockCollection = {
  find: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  remove: ReturnType<typeof vi.fn>;
};

// Every collection useDatabaseCollection mounts for useAdministrationData
const COLLECTION_NAMES = [
  'students',
  'staff',
  'classes',
  'class_streams',
  'departments',
  'designations',
  'student_categories',
  'dormitories',
  'parents_guardians',
  'partners',
  'clubs',
  'customers',
  'student_health_records',
  'student_attendance',
  'disciplinary_records',
  'health_incident_reports',
  'student_class_history',
  'student_guardian_relationships',
] as const;

const mockCollections = {} as Record<(typeof COLLECTION_NAMES)[number], MockCollection>;
for (const name of COLLECTION_NAMES) {
  mockCollections[name] = {
    find: vi.fn(async () => []),
    insert: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  };
}

const mockDb = {
  getCollection: vi.fn((name: string) => mockCollections[name as keyof typeof mockCollections] ?? null),
  // Direct-collection access used by getStudentDetailsById
  students: mockCollections.students,
  student_guardian_relationships: mockCollections.student_guardian_relationships,
  parents_guardians: mockCollections.parents_guardians,
};

describe('useAdministrationData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (databaseService.getDatabase as any).mockResolvedValue(mockDb);
  });

  describe('Student CRUD Operations', () => {
    it('should add a student successfully', async () => {
      const mockStudent = { id: 'mock-id-123', first_name: 'John', last_name: 'Doe' };
      mockCollections.students.insert.mockResolvedValue({ id: 'mock-id-123', doc: mockStudent, ok: true });

      const { result } = renderHook(() => useAdministrationData());

      let addedStudent: any;
      await act(async () => {
        addedStudent = await result.current.addStudent({ first_name: 'John', last_name: 'Doe' } as any);
      });

      expect(mockCollections.students.insert).toHaveBeenCalledWith(expect.objectContaining({
        first_name: 'John',
        last_name: 'Doe',
        id: 'mock-id-123',
      }));
      expect(addedStudent).toEqual({ id: 'mock-id-123', doc: mockStudent, ok: true });
    });

    it('should update a student successfully', async () => {
      const mockStudent = { id: 'student-1', first_name: 'Jane', last_name: 'Doe' };
      mockCollections.students.update.mockResolvedValue({ id: 'student-1', doc: mockStudent, ok: true });

      const { result } = renderHook(() => useAdministrationData());

      let updatedStudent: any;
      await act(async () => {
        updatedStudent = await result.current.updateStudent('student-1', { first_name: 'Jane' });
      });

      expect(mockCollections.students.update).toHaveBeenCalledWith('student-1', { first_name: 'Jane' });
      expect(updatedStudent).toEqual({ id: 'student-1', doc: mockStudent, ok: true });
    });

    it('should delete a student successfully', async () => {
      mockCollections.students.remove.mockResolvedValue({ id: 'student-1', ok: true });

      const { result } = renderHook(() => useAdministrationData());

      let deleteResult: any;
      await act(async () => {
        deleteResult = await result.current.deleteStudent('student-1');
      });

      expect(mockCollections.students.remove).toHaveBeenCalledWith('student-1');
      expect(deleteResult).toBe(true);
    });

    it('getStudentDetailsById function should exist', () => {
      const { result } = renderHook(() => useAdministrationData());
      expect(typeof result.current.getStudentDetailsById).toBe('function');
    });
  });

  describe('Staff CRUD Operations', () => {
    it('should add a staff member successfully', async () => {
      const mockStaff = { id: 'mock-id-123', first_name: 'Teacher', last_name: 'One' };
      mockCollections.staff.insert.mockResolvedValue({ id: 'mock-id-123', doc: mockStaff, ok: true });

      const { result } = renderHook(() => useAdministrationData());

      let addedStaff: any;
      await act(async () => {
        addedStaff = await result.current.addStaffMember({ first_name: 'Teacher', last_name: 'One' });
      });

      expect(mockCollections.staff.insert).toHaveBeenCalled();
      expect(addedStaff).toEqual({ id: 'mock-id-123', doc: mockStaff, ok: true });
    });

    it('should update a staff member successfully', async () => {
      const mockStaff = { id: 'staff-1', first_name: 'Updated', last_name: 'Name' };
      mockCollections.staff.update.mockResolvedValue({ id: 'staff-1', doc: mockStaff, ok: true });

      const { result } = renderHook(() => useAdministrationData());

      let updatedStaff: any;
      await act(async () => {
        updatedStaff = await result.current.updateStaffMember('staff-1', { first_name: 'Updated' });
      });

      expect(mockCollections.staff.update).toHaveBeenCalledWith('staff-1', { first_name: 'Updated' });
      expect(updatedStaff).toEqual({ id: 'staff-1', doc: mockStaff, ok: true });
    });

    it('should delete a staff member successfully', async () => {
      mockCollections.staff.remove.mockResolvedValue({ id: 'staff-1', ok: true });

      const { result } = renderHook(() => useAdministrationData());

      let deleteResult: any;
      await act(async () => {
        deleteResult = await result.current.deleteStaffMember('staff-1');
      });

      expect(mockCollections.staff.remove).toHaveBeenCalledWith('staff-1');
      expect(deleteResult).toBe(true);
    });
  });

  describe('Class CRUD Operations', () => {
    it('should add a class successfully', async () => {
      const mockClass = { id: 'mock-id-123', name: 'Form 1', level: 1 };
      mockCollections.classes.insert.mockResolvedValue({ id: 'mock-id-123', doc: mockClass, ok: true });

      const { result } = renderHook(() => useAdministrationData());

      let addedClass: any;
      await act(async () => {
        addedClass = await result.current.addClass({ name: 'Form 1', level: 1 } as any);
      });

      expect(mockCollections.classes.insert).toHaveBeenCalled();
      expect(addedClass).toEqual({ id: 'mock-id-123', doc: mockClass, ok: true });
    });

    it('should update a class successfully', async () => {
      const mockClass = { id: 'class-1', name: 'Updated Form 1', level: 1 };
      mockCollections.classes.update.mockResolvedValue({ id: 'class-1', doc: mockClass, ok: true });

      const { result } = renderHook(() => useAdministrationData());

      let updatedClass: any;
      await act(async () => {
        updatedClass = await result.current.updateClass('class-1', { name: 'Updated Form 1' });
      });

      expect(mockCollections.classes.update).toHaveBeenCalledWith('class-1', { name: 'Updated Form 1' });
      expect(updatedClass).toEqual({ id: 'class-1', doc: mockClass, ok: true });
    });

    it('should delete a class successfully', async () => {
      mockCollections.classes.remove.mockResolvedValue({ id: 'class-1', ok: true });

      const { result } = renderHook(() => useAdministrationData());

      let deleteResult: any;
      await act(async () => {
        deleteResult = await result.current.deleteClass('class-1');
      });

      expect(mockCollections.classes.remove).toHaveBeenCalledWith('class-1');
      expect(deleteResult).toBe(true);
    });
  });

  describe('Class Stream CRUD Operations', () => {
    it('should add a class stream successfully', async () => {
      const mockStream = { id: 'mock-id-123', name: 'A', class_id: 'class-1' };
      mockCollections.class_streams.insert.mockResolvedValue({ id: 'mock-id-123', doc: mockStream, ok: true });

      const { result } = renderHook(() => useAdministrationData());

      let addedStream: any;
      await act(async () => {
        addedStream = await result.current.addClassStream({ name: 'A', class_id: 'class-1' } as any);
      });

      expect(mockCollections.class_streams.insert).toHaveBeenCalled();
      expect(addedStream).toEqual({ id: 'mock-id-123', doc: mockStream, ok: true });
    });

    it('should update a class stream successfully', async () => {
      const mockStream = { id: 'stream-1', name: 'B', class_id: 'class-1' };
      mockCollections.class_streams.update.mockResolvedValue({ id: 'stream-1', doc: mockStream, ok: true });

      const { result } = renderHook(() => useAdministrationData());

      let updatedStream: any;
      await act(async () => {
        updatedStream = await result.current.updateClassStream('stream-1', { name: 'B' });
      });

      expect(mockCollections.class_streams.update).toHaveBeenCalledWith('stream-1', { name: 'B' });
      expect(updatedStream).toEqual({ id: 'stream-1', doc: mockStream, ok: true });
    });
  });

  describe('Department CRUD Operations', () => {
    it('should add a department successfully', async () => {
      const mockDept = { id: 'mock-id-123', name: 'Mathematics' };
      mockCollections.departments.insert.mockResolvedValue({ id: 'mock-id-123', doc: mockDept, ok: true });

      const { result } = renderHook(() => useAdministrationData());

      let addedDept: any;
      await act(async () => {
        addedDept = await result.current.addDepartment({ name: 'Mathematics' } as any);
      });

      expect(mockCollections.departments.insert).toHaveBeenCalled();
      expect(addedDept).toEqual({ id: 'mock-id-123', doc: mockDept, ok: true });
    });

    it('should update a department successfully', async () => {
      const mockDept = { id: 'dept-1', name: 'Science' };
      mockCollections.departments.update.mockResolvedValue({ id: 'dept-1', doc: mockDept, ok: true });

      const { result } = renderHook(() => useAdministrationData());

      let updatedDept: any;
      await act(async () => {
        updatedDept = await result.current.updateDepartment('dept-1', { name: 'Science' });
      });

      expect(mockCollections.departments.update).toHaveBeenCalledWith('dept-1', { name: 'Science' });
      expect(updatedDept).toEqual({ id: 'dept-1', doc: mockDept, ok: true });
    });
  });

  describe('Dormitory CRUD Operations', () => {
    it('should add a dormitory successfully', async () => {
      const mockDorm = { id: 'mock-id-123', name: 'East Wing', capacity: 100 };
      mockCollections.dormitories.insert.mockResolvedValue({ id: 'mock-id-123', doc: mockDorm, ok: true });

      const { result } = renderHook(() => useAdministrationData());

      let addedDorm: any;
      await act(async () => {
        addedDorm = await result.current.addDormitory({ name: 'East Wing', capacity: 100 } as any);
      });

      expect(mockCollections.dormitories.insert).toHaveBeenCalled();
      expect(addedDorm).toEqual({ id: 'mock-id-123', doc: mockDorm, ok: true });
    });

    it('should update a dormitory successfully', async () => {
      const mockDorm = { id: 'dorm-1', name: 'West Wing', capacity: 80 };
      mockCollections.dormitories.update.mockResolvedValue({ id: 'dorm-1', doc: mockDorm, ok: true });

      const { result } = renderHook(() => useAdministrationData());

      let updatedDorm: any;
      await act(async () => {
        updatedDorm = await result.current.updateDormitory('dorm-1', { capacity: 80 });
      });

      expect(mockCollections.dormitories.update).toHaveBeenCalledWith('dorm-1', { capacity: 80 });
      expect(updatedDorm).toEqual({ id: 'dorm-1', doc: mockDorm, ok: true });
    });
  });

  describe('Attendance Operations', () => {
    it('should save student attendance successfully', async () => {
      const mockAttendance = { id: 'mock-id-123', student_id: 'student-1', date: '2024-01-15', status: 'present' };
      mockCollections.student_attendance.insert.mockResolvedValue({ id: 'mock-id-123', doc: mockAttendance, ok: true });

      const { result } = renderHook(() => useAdministrationData());

      let savedAttendance: any;
      await act(async () => {
        savedAttendance = await result.current.saveStudentAttendance({
          student_id: 'student-1',
          date: '2024-01-15',
          status: 'present',
        });
      });

      expect(mockCollections.student_attendance.insert).toHaveBeenCalled();
      expect(savedAttendance).toEqual({ id: 'mock-id-123', doc: mockAttendance, ok: true });
    });

    it('should get student attendance by filters', async () => {
      const mockAttendance = [
        { id: '1', student_id: 'student-1', date: '2024-01-15', status: 'present' },
      ];
      mockCollections.student_attendance.find.mockResolvedValue(mockAttendance);

      const { result } = renderHook(() => useAdministrationData());

      // Wait for the attendance collection to load before filtering
      await waitFor(() => expect(result.current.studentAttendance).toHaveLength(1));

      const attendance = result.current.getStudentAttendanceByFilters({
        selector: { student_id: 'student-1' },
      });

      expect(attendance).toHaveLength(1);
      expect(attendance[0].student_id).toBe('student-1');
    });
  });

  describe('Initial Data State', () => {
    it('should return empty arrays for all data properties initially', async () => {
      const { result } = renderHook(() => useAdministrationData());

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
