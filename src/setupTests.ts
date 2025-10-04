// ABOUTME: Jest setup file for testing configuration
// ABOUTME: Configures testing environment and global mocks

import '@testing-library/jest-dom';

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock as any;

// Mock sessionStorage
const sessionStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.sessionStorage = sessionStorageMock as any;

// Mock URL
global.URL = {
  createObjectURL: jest.fn(),
  revokeObjectURL: jest.fn(),
} as any;

// Mock Blob
global.Blob = jest.fn().mockImplementation((content, options) => ({
  content,
  options,
})) as any;

// Mock fetch
global.fetch = jest.fn();

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Mock window.confirm
global.confirm = jest.fn(() => true);

// Mock window.alert
global.alert = jest.fn();

// Mock navigator
Object.defineProperty(window, 'navigator', {
  value: {
    onLine: true,
    userAgent: 'test',
  },
  writable: true,
});

// Mock process.env
process.env = {
  ...process.env,
  NODE_ENV: 'test',
  REACT_APP_DATABASE_PROVIDER: 'sqlite-wasm',
};