// ABOUTME: Test setup configuration for data validation and consistency tests
// ABOUTME: Initializes test environment and mocks for validation system testing

import React from 'react';
import { beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { cleanup, configure, render, renderHook, screen, fireEvent, waitFor, within, act as domAct } from '@testing-library/react';
import { act } from 'react';
import * as UseToastModule from '@/hooks/useToast';
import * as FullWidthModule from '@/contexts/FullWidthContext';

declare global {
  // Jest compatibility alias for legacy tests while running under Vitest.
  // This keeps jest.fn/jest.spyOn typed and executable without enabling @types/jest globals.
  var jest: typeof vi;
}

globalThis.jest = vi;

// ─────────────────────────────────────────────────────────────────────────────
// Global provider wrapper
//
// Many hooks/components in the app call `useToast()` / `useFullWidth()` which
// throw when their provider is missing. In production App.tsx mounts
// ToastProvider around the whole tree. Tests that render app code without
// explicit providers therefore fail with "must be used within a ...Provider".
//
// We auto-wrap the *global* `render` / `renderHook` helpers (the ones tests use
// without importing) with the minimum providers needed. Files that import
// `render` directly from '@testing-library/react' still get the bare version —
// that is the escape hatch for tests asserting provider-less behavior (e.g.
// "throws when used outside ToastProvider").
//
// The wrapper degrades gracefully: if a future change removes one of these
// providers from the app, the wrapper simply skips it instead of crashing.
// ─────────────────────────────────────────────────────────────────────────────
const ToastProviderForTests = UseToastModule.ToastProvider;
const FullWidthProviderForTests = FullWidthModule.FullWidthProvider;

export const TestProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  let content: React.ReactNode = children;
  if (FullWidthProviderForTests) {
    content = React.createElement(FullWidthProviderForTests, null, content);
  }
  if (ToastProviderForTests) {
    content = React.createElement(ToastProviderForTests, null, content);
  }
  return React.createElement(React.Fragment, null, content);
};

const withTestProviders = (ui: React.ReactElement, options?: Parameters<typeof render>[1]) =>
  options?.wrapper
    ? render(ui, options)
    : render(ui, { ...options, wrapper: TestProviders });

const renderHookWithProviders = (callback: Parameters<typeof renderHook>[0], options?: Parameters<typeof renderHook>[1]) =>
  options?.wrapper
    ? renderHook(callback, options)
    : renderHook(callback, { ...options, wrapper: TestProviders });

// Expose React Testing Library helpers as globals (vitest `globals: true`).
// The suite was authored against a harness that provides these globally; this
// restores that contract so tests compile and run without per-file imports.
globalThis.render = withTestProviders as typeof render;
globalThis.renderHook = renderHookWithProviders as typeof renderHook;
globalThis.cleanup = cleanup;
// `screen` collides with the DOM lib's built-in `Screen` global type, which cannot be
// re-typed; assign at runtime (overriding window.screen) via cast so tests get RTL's screen.
(globalThis as unknown as { screen: typeof screen }).screen = screen;
globalThis.fireEvent = fireEvent;
globalThis.waitFor = waitFor;
globalThis.within = within;
globalThis.domAct = domAct;

// Configure React Testing Library for React 19
configure({ 
  testIdAttribute: 'data-testid',
  asyncUtilTimeout: 5000,
  // Enable React 19 compatibility
  reactStrictMode: true
});

// Global act function for React 19 compatibility
globalThis.act = act;

// Set up matchMedia mock immediately before any other imports.
// NOTE: deliberately a plain function, NOT `vi.fn()`. Test files call
// `vi.restoreAllMocks()` in afterEach/afterAll hooks which would reset a
// `vi.fn()` mock's implementation back to `undefined`, breaking every
// subsequent `window.matchMedia(...).matches` access for the rest of the
// worker run (see Toast component theme detection).
const matchMediaMock = (query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: vi.fn(), // deprecated
  removeListener: vi.fn(), // deprecated
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
});

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn(matchMediaMock),
});

// Ensure matchMedia is available globally
if (typeof global !== 'undefined') {
  global.matchMedia = window.matchMedia;
}

// Mock localStorage for tests
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
    get length() { return Object.keys(store).length; },
    key: vi.fn((index: number) => Object.keys(store)[index] ?? null),
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
  configurable: true,
});

// Mock indexedDB for tests
const indexedDBMock = {
  open: vi.fn().mockReturnValue({
    result: null,
    error: null,
    onerror: null,
    onsuccess: null,
    onupgradeneeded: null,
  }),
  deleteDatabase: vi.fn(),
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  cmp: vi.fn((_a: unknown, _b: unknown) => 0),
   
  databases: vi.fn(async () => []),
};

Object.defineProperty(window, 'indexedDB', {
  value: indexedDBMock,
  writable: true,
  configurable: true,
});

// Mock console methods to reduce noise in tests
beforeAll(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterAll(() => {
  vi.restoreAllMocks();
});

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Ensure DOM is clean before each test
beforeEach(() => {
  if (typeof document !== 'undefined') {
    document.body.innerHTML = '';
    // Ensure document.body exists and is properly initialized
    if (!document.body) {
      document.documentElement.appendChild(document.createElement('body'));
    }
  }
});

// NOTE: Do NOT use `vi.setSystemTime()` here. It permanently mocks the date in
// the worker, which makes any test file that calls `vi.useFakeTimers()` throw
// ("setSystemTime was called already and date was mocked") — and an unhandled
// beforeEach error there can cascade. The `mockDate` constant below is still
// used for deterministic fixture timestamps via the createMock* helpers.
const mockDate = new Date('2024-01-01T00:00:00.000Z');

// Mock navigator.onLine for network state tests
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true
});

// matchMedia mock is now set up at the top of this file

// Mock URL APIs for file download tests
Object.defineProperty(URL, 'createObjectURL', {
  writable: true,
  value: vi.fn().mockReturnValue('blob:test-url')
});

Object.defineProperty(URL, 'revokeObjectURL', {
  writable: true,
  value: vi.fn()
});

// Remove createElement mocking to avoid interference with React Testing Library
// The download functionality will use real anchor elements
// URL.createObjectURL and URL.revokeObjectURL are already mocked above

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
