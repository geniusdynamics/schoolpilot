// ABOUTME: Test setup configuration for data validation and consistency tests
// ABOUTME: Initializes test environment and mocks for validation system testing

import { beforeAll, afterAll, vi } from 'vitest';

// Mock console methods to reduce noise in tests
beforeAll(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterAll(() => {
  vi.restoreAllMocks();
});

// Mock Date.now for consistent test results
const mockDate = new Date('2024-01-01T00:00:00.000Z');
vi.setSystemTime(mockDate);

// Mock navigator.onLine for network state tests
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true
});

// Global test utilities
export const createMockStudent = (overrides = {}) => ({
  id: 'test-student-1',
  admission_no: 'ADM001',
  first_name: 'John',
  last_name: 'Doe',
  gender: 'Male',
  status: 'Active',
  created_at: mockDate.toISOString(),
  updated_at: mockDate.toISOString(),
  ...overrides
});

export const createMockStaff = (overrides = {}) => ({
  id: 'test-staff-1',
  staff_no: 'STF001',
  first_name: 'Jane',
  last_name: 'Teacher',
  is_active: true,
  created_at: mockDate.toISOString(),
  updated_at: mockDate.toISOString(),
  ...overrides
});

export const createMockFinancialYear = (overrides = {}) => ({
  id: 1,
  name: '2024 Financial Year',
  start_date: '2024-01-01',
  end_date: '2024-12-31',
  status: 'Open',
  created_at: mockDate.toISOString(),
  updated_at: mockDate.toISOString(),
  ...overrides
});

export const createMockInvoice = (overrides = {}) => ({
  id: 'test-invoice-1',
  student_id: 'test-student-1',
  invoice_number: 'INV001',
  school_period_id: 1,
  issue_date: '2024-01-01',
  due_date: '2024-01-31',
  total_amount_billed: 1000,
  amount_paid: 0,
  status: 'Due',
  created_at: mockDate.toISOString(),
  updated_at: mockDate.toISOString(),
  ...overrides
});

export const createMockDataContext = () => ({
  students: [createMockStudent()],
  staff: [createMockStaff()],
  financialYears: [createMockFinancialYear()],
  studentInvoices: [createMockInvoice()],
  classStreams: [
    { id: 1, name: 'Form 1A', class_id: 1 },
    { id: 2, name: 'Form 1B', class_id: 1 }
  ],
  studentCategories: [
    { id: 1, name: 'Day Scholar' },
    { id: 2, name: 'Boarder' }
  ],
  dormitories: [
    { id: 1, name: 'Boys Dormitory' },
    { id: 2, name: 'Girls Dormitory' }
  ],
  departments: [
    { id: 'dept-1', name: 'Mathematics', is_academic: true },
    { id: 'dept-2', name: 'Science', is_academic: true }
  ],
  designations: [
    { id: 1, title: 'Teacher' },
    { id: 2, title: 'Head of Department' }
  ],
  schoolPeriods: [
    { id: 1, name: 'Term 1 2024', academic_year_id: 1, financial_year_id: 1 }
  ]
});