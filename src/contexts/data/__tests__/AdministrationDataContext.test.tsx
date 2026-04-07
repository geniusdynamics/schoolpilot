// ABOUTME: Tests for Administration Data Context - Provider rendering and state management

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  AdministrationDataProvider,
  useAdministrationDataContext,
  AdministrationDataContext,
} from '../AdministrationDataContext';
import { databaseService } from '../../../services/database/databaseService';

// Mock the database service
vi.mock('../../../services/database/databaseService', () => ({
  databaseService: {
    getDatabase: vi.fn(),
    generateId: vi.fn(() => 'mock-id-123'),
  },
}));

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
  student_attendance: {
    insert: vi.fn(),
    find: vi.fn(),
  },
};

// Test component that consumes the context
const TestConsumer: React.FC = () => {
  const context = useAdministrationDataContext();
  return (
    <div data-testid="context-consumer">
      <span data-testid="students-count">{context.students.length}</span>
      <span data-testid="staff-count">{context.staff.length}</span>
      <span data-testid="classes-count">{context.classes.length}</span>
      <span data-testid="has-addStudent">{typeof context.addStudent === 'function' ? 'yes' : 'no'}</span>
      <span data-testid="has-updateStudent">{typeof context.updateStudent === 'function' ? 'yes' : 'no'}</span>
      <span data-testid="has-deleteStudent">{typeof context.deleteStudent === 'function' ? 'yes' : 'no'}</span>
    </div>
  );
};

describe('AdministrationDataContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (databaseService.getDatabase as any).mockResolvedValue(mockDb);
  });

  describe('Provider Rendering', () => {
    it('should render children without crashing', () => {
      render(
        <AdministrationDataProvider>
          <div data-testid="child">Child Content</div>
        </AdministrationDataProvider>
      );

      expect(screen.getByTestId('child')).toBeInTheDocument();
      expect(screen.getByText('Child Content')).toBeInTheDocument();
    });

    it('should provide context values to children', () => {
      render(
        <AdministrationDataProvider>
          <TestConsumer />
        </AdministrationDataProvider>
      );

      expect(screen.getByTestId('context-consumer')).toBeInTheDocument();
      expect(screen.getByTestId('students-count')).toHaveTextContent('0');
      expect(screen.getByTestId('staff-count')).toHaveTextContent('0');
      expect(screen.getByTestId('classes-count')).toHaveTextContent('0');
    });

    it('should provide CRUD functions to children', () => {
      render(
        <AdministrationDataProvider>
          <TestConsumer />
        </AdministrationDataProvider>
      );

      expect(screen.getByTestId('has-addStudent')).toHaveTextContent('yes');
      expect(screen.getByTestId('has-updateStudent')).toHaveTextContent('yes');
      expect(screen.getByTestId('has-deleteStudent')).toHaveTextContent('yes');
    });
  });

  describe('Context Hook', () => {
    it('should throw error when used outside provider', () => {
      // Suppress console.error for this test
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        render(<TestConsumer />);
      }).toThrow('useAdministrationDataContext must be used within an AdministrationDataProvider');

      consoleSpy.mockRestore();
    });

    it('should return context value when used within provider', () => {
      let capturedContext: any;

      const CaptureContext: React.FC = () => {
        capturedContext = useAdministrationDataContext();
        return <div data-testid="captured">Captured</div>;
      };

      render(
        <AdministrationDataProvider>
          <CaptureContext />
        </AdministrationDataProvider>
      );

      expect(capturedContext).toBeDefined();
      expect(Array.isArray(capturedContext.students)).toBe(true);
      expect(Array.isArray(capturedContext.staff)).toBe(true);
      expect(Array.isArray(capturedContext.classes)).toBe(true);
      expect(typeof capturedContext.addStudent).toBe('function');
      expect(typeof capturedContext.updateStudent).toBe('function');
      expect(typeof capturedContext.deleteStudent).toBe('function');
    });
  });

  describe('Context State Management', () => {
    it('should initialize with empty arrays', () => {
      let contextValue: any;

      const CaptureContext: React.FC = () => {
        contextValue = useAdministrationDataContext();
        return <div>Test</div>;
      };

      render(
        <AdministrationDataProvider>
          <CaptureContext />
        </AdministrationDataProvider>
      );

      expect(contextValue.students).toEqual([]);
      expect(contextValue.staff).toEqual([]);
      expect(contextValue.classes).toEqual([]);
      expect(contextValue.classStreams).toEqual([]);
      expect(contextValue.departments).toEqual([]);
      expect(contextValue.designations).toEqual([]);
      expect(contextValue.studentCategories).toEqual([]);
      expect(contextValue.dormitories).toEqual([]);
      expect(contextValue.parentsGuardians).toEqual([]);
      expect(contextValue.partners).toEqual([]);
      expect(contextValue.clubs).toEqual([]);
      expect(contextValue.customers).toEqual([]);
      expect(contextValue.studentHealthRecords).toEqual([]);
      expect(contextValue.studentAttendance).toEqual([]);
    });

    it('should accept mock data for testing', () => {
      const mockData = {
        students: [{ id: '1', name: 'Test Student' }],
        staff: [{ id: '1', name: 'Test Staff' }],
      };

      let contextValue: any;

      const CaptureContext: React.FC = () => {
        contextValue = useAdministrationDataContext();
        return <div>Test</div>;
      };

      render(
        <AdministrationDataProvider mockData={mockData}>
          <CaptureContext />
        </AdministrationDataProvider>
      );

      // The mock data is used by the hook internally for seeding
      // The actual data arrays remain empty until database operations are performed
      expect(contextValue).toBeDefined();
    });
  });

  describe('Direct Context Usage', () => {
    it('should work with direct context consumer', () => {
      const DirectConsumer: React.FC = () => (
        <AdministrationDataContext.Consumer>
          {(value) => (
            <div data-testid="direct-consumer">
              {value ? 'Has Context' : 'No Context'}
            </div>
          )}
        </AdministrationDataContext.Consumer>
      );

      render(
        <AdministrationDataProvider>
          <DirectConsumer />
        </AdministrationDataProvider>
      );

      expect(screen.getByTestId('direct-consumer')).toHaveTextContent('Has Context');
    });
  });
});
