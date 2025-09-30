// ABOUTME: Minimal test for BackupSettingsPage to isolate React 19 compatibility issues
// ABOUTME: Tests basic rendering without complex interactions

import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import BackupSettingsPage from '../modules/settings/pages/BackupSettingsPage';

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
    schoolPeriods: []
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

describe('BackupSettingsPage Minimal Test', () => {
  beforeEach(() => {
    // Ensure clean DOM
    document.body.innerHTML = '';
  });

  it('should render without crashing', () => {
    console.log('Starting render test...');
    console.log('Document body:', document.body);
    console.log('Document body innerHTML:', document.body.innerHTML);
    
    try {
      const result = render(
        <TestWrapper>
          <BackupSettingsPage />
        </TestWrapper>
      );
      console.log('Render successful, container:', result.container);
      
      // Just check if it renders without error
      expect(result.container).toBeDefined();
    } catch (error) {
      console.error('Render failed:', error);
      throw error;
    }
  });
});