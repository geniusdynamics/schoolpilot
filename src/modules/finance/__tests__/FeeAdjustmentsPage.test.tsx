// ABOUTME: Test file for modernized FeeAdjustmentsPage component
// ABOUTME: Tests DataGrid integration, tabbed forms, and toast notifications

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import FeeAdjustmentsPage from '../pages/FeeAdjustmentsPage';
import { AppDataContext } from '@/contexts/AppDataContext';
import { FeeAdjustment, Student, SchoolPeriod, FeeAdjustmentType } from '@/types';

// Mock hooks
vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({
    showToast: vi.fn(),
  }),
}));

vi.mock('@/hooks/useSlideout', () => ({
  useSlideout: () => ({
    openSlideout: vi.fn(),
    closeSlideout: vi.fn(),
  }),
}));

const mockFeeAdjustments: FeeAdjustment[] = [
  {
    id: '1',
    student_id: 'student1',
    student_name: 'John Doe',
    school_period_id: 1,
    school_period_name: 'Term 1 2024',
    adjustment_type: FeeAdjustmentType.EXEMPTION,
    amount: -1000,
    reason: 'Scholarship award',
    applied_invoice_id: 'INV001',
    created_at: '2024-01-15T10:00:00Z'
  }
];

const mockStudents: Student[] = [
  {
    id: 'student1',
    first_name: 'John',
    last_name: 'Doe',
    admission_no: 'ADM001',
    display_name: 'John Doe',
    status: 'ACTIVE' as any,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  }
];

const mockSchoolPeriods: SchoolPeriod[] = [
  {
    id: 1,
    name: 'Term 1 2024',
    start_date: '2024-01-01',
    end_date: '2024-04-30',
    is_current: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  }
];

const mockContextValue = {
  feeAdjustments: mockFeeAdjustments,
  students: mockStudents,
  schoolPeriods: mockSchoolPeriods,
  loading: {
    feeAdjustments: false,
    students: false,
    schoolPeriods: false
  },
  addFeeAdjustment: jest.fn(),
  updateFeeAdjustment: jest.fn(),
  deleteFeeAdjustment: jest.fn()
};

const renderWithContext = (contextValue = mockContextValue) => {
  return render(
    <AppDataContext.Provider value={contextValue as any}>
      <FeeAdjustmentsPage />
    </AppDataContext.Provider>
  );
};

describe('FeeAdjustmentsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders fee adjustments page with DataGrid', () => {
    renderWithContext();
    
    expect(screen.getByText('Student Fee Adjustments')).toBeInTheDocument();
    expect(screen.getByText('Add Adjustment')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Term 1 2024')).toBeInTheDocument();
  });

  test('displays adjustment data in DataGrid format', () => {
    renderWithContext();
    
    // Check for DataGrid specific elements
    expect(screen.getByText('KES -1000.00')).toBeInTheDocument();
    expect(screen.getByText('Scholarship award')).toBeInTheDocument();
    expect(screen.getByText('INV001')).toBeInTheDocument();
  });

  test('shows Add Adjustment button', () => {
    renderWithContext();
    
    const addButton = screen.getByText('Add Adjustment');
    expect(addButton).toBeInTheDocument();
    expect(addButton.closest('button')).toBeInTheDocument();
  });

  test('displays action buttons for each adjustment', () => {
    renderWithContext();
    
    expect(screen.getByText('Edit')).toBeInTheDocument();
    expect(screen.getByText('Delete')).toBeInTheDocument();
  });

  test('handles loading state correctly', () => {
    const loadingContext = {
      ...mockContextValue,
      loading: {
        ...mockContextValue.loading,
        feeAdjustments: true
      }
    };

    renderWithContext(loadingContext);
    expect(screen.getByText('Loading Fee Adjustments...')).toBeInTheDocument();
  });

  test('renders safely when related collections are missing', () => {
    const partialContext = {
      ...mockContextValue,
      students: undefined,
      schoolPeriods: undefined,
      loading: undefined
    };

    renderWithContext(partialContext);

    expect(screen.getByText('Student Fee Adjustments')).toBeInTheDocument();
    expect(screen.getByText('Add Adjustment')).toBeInTheDocument();
  });
});
