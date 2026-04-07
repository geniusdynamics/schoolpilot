// ABOUTME: Test to isolate the act wrapper issue with React 19
// ABOUTME: Compares render with and without act wrapper

import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import BackupSettingsPage from '@/modules/settings/pages/BackupSettingsPage';

// Mock the hooks
vi.mock('../hooks/useAppData', () => ({
  useAppData: () => ({
    students: [],
    staff: [],
    financialYears: [],
    studentInvoices: [],
    classStreams: [],
    studentCategories: [],
    dormitories: [],
    departments: [],
    designations: [],
    schoolPeriods: [],
    initializationError: null
  })
}));

vi.mock('../hooks/useUnifiedConfig', () => ({
  useUnifiedConfig: () => ({
    config: {
      database: {
        initialized: true
      }
    }
  })
}));

function TestWrapper({ children }: { children: React.ReactNode }) {
  return <BrowserRouter>{children}</BrowserRouter>;
}

describe('Act Wrapper Test', () => {
  beforeEach(() => {
    // Ensure clean DOM
    document.body.innerHTML = '';
  });

  it('should render without act wrapper (working)', () => {
    console.log('Testing without act wrapper...');
    
    const result = render(
      <TestWrapper>
        <BackupSettingsPage />
      </TestWrapper>
    );
    
    expect(result.container).toBeDefined();
    expect(screen.getByText('Database Backup')).toBeInTheDocument();
  });

  it('should render with act wrapper (potentially failing)', async () => {
    console.log('Testing with act wrapper...');
    
    await act(async () => {
      render(
        <TestWrapper>
          <BackupSettingsPage />
        </TestWrapper>
      );
    });
    
    expect(screen.getByText('Database Backup')).toBeInTheDocument();
  });
});