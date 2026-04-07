// ABOUTME: Test file for modernized StudentPaymentsPage component
// ABOUTME: Tests DataGrid integration, slideout forms, and toast notifications

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import StudentPaymentsPage from '../pages/StudentPaymentsPage';
import { AppDataContext } from '@/contexts/AppDataContext';
import { StudentPayment, Student } from '@/types';

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

const mockStudentPayments: StudentPayment[] = [
  {
    id: '1',
    student_id: 'student1',
    student_name: 'John Doe',
    receipt_no: 'RCP001',
    total_amount_paid: 5000,
    payment_method: 'Cash',
    transaction_date: '2024-01-15',
    reference_no: 'REF001',
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-01-15T10:00:00Z'
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

const mockContextValue = {
  studentPayments: mockStudentPayments,
  students: mockStudents,
  studentInvoices: [],
  studentInvoiceItems: [],
  invoicePaymentApplications: [],
  loading: {
    studentPayments: false,
    students: false,
    studentInvoices: false,
    studentInvoiceItems: false,
    invoicePaymentApplications: false
  },
  addStudentPayment: jest.fn(),
  updateStudentPayment: jest.fn(),
  deleteStudentPayment: jest.fn(),
  applyPaymentToInvoices: jest.fn()
};

const renderWithContext = (contextValue = mockContextValue) => {
  return render(
    <AppDataContext.Provider value={contextValue as any}>
      <StudentPaymentsPage />
    </AppDataContext.Provider>
  );
};

describe('StudentPaymentsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders student payments page with DataGrid', () => {
    renderWithContext();
    
    expect(screen.getByText('Student Payments')).toBeInTheDocument();
    expect(screen.getByText('Record Payment')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('RCP001')).toBeInTheDocument();
  });

  test('displays payment data in DataGrid format', () => {
    renderWithContext();
    
    // Check for DataGrid specific elements
    expect(screen.getByText('KES 5000.00')).toBeInTheDocument();
    expect(screen.getByText('Cash')).toBeInTheDocument();
  });

  test('shows Record Payment button', () => {
    renderWithContext();
    
    const recordButton = screen.getByText('Record Payment');
    expect(recordButton).toBeInTheDocument();
    expect(recordButton.closest('button')).toBeInTheDocument();
  });

  test('displays action buttons for each payment', () => {
    renderWithContext();
    
    expect(screen.getByText('Edit')).toBeInTheDocument();
    expect(screen.getByText('Apply')).toBeInTheDocument();
    expect(screen.getByText('Delete')).toBeInTheDocument();
  });

  test('handles loading state correctly', () => {
    const loadingContext = {
      ...mockContextValue,
      loading: {
        ...mockContextValue.loading,
        studentPayments: true
      }
    };

    renderWithContext(loadingContext);
    expect(screen.getByText('Loading Student Payments...')).toBeInTheDocument();
  });
});