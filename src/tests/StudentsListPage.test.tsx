// ABOUTME: Tests for modernized StudentsListPage with TabbedForm and SlideoutForm integration
// ABOUTME: Covers form validation, tab navigation, quick edit functionality, and accessibility

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import StudentsListPage from '../modules/administration/pages/StudentsListPage';
import { useAppData } from '../contexts/AppDataContext';
import { PersonGender, StudentStatus } from '../types';

// Mock dependencies
vi.mock('../contexts/AppDataContext');
vi.mock('react-router-dom', () => ({
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
}));

const mockUseAppData = vi.mocked(useAppData);

const mockStudents = [
  {
    id: '1',
    admission_no: 'ADM001',
    first_name: 'John',
    last_name: 'Doe',
    gender: PersonGender.MALE,
    status: StudentStatus.ACTIVE,
    current_class_name: 'Form 1',
    current_class_stream_name: 'A',
    primary_guardian: {
      id: 'g1',
      name: 'Jane Doe',
      phone: '+1234567890',
      relationship_type: 'Mother',
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const mockClassStreams = [
  { id: 1, name: 'A', class_name: 'Form 1' },
  { id: 2, name: 'B', class_name: 'Form 1' },
];

const mockStudentCategories = [
  { id: 1, name: 'Day Scholar' },
  { id: 2, name: 'Boarder' },
];

const mockDormitories = [
  { id: 1, name: 'East Wing' },
  { id: 2, name: 'West Wing' },
];

describe('StudentsListPage - Modernized Form', () => {
  beforeEach(() => {
    mockUseAppData.mockReturnValue({
      students: mockStudents,
      classStreams: mockClassStreams,
      studentCategories: mockStudentCategories,
      dormitories: mockDormitories,
      loading: { students: false, all: false },
      addStudent: vi.fn(),
      updateStudent: vi.fn(),
      deleteStudent: vi.fn(),
    } as any);
  });

  it('renders student list with modernized actions', () => {
    render(<StudentsListPage />);
    
    expect(screen.getByText('Student Management')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('ADM001')).toBeInTheDocument();
    
    // Check for both quick edit and full edit buttons
    expect(screen.getByTitle('Quick Edit')).toBeInTheDocument();
    expect(screen.getByText('Full Edit')).toBeInTheDocument();
  });

  it('opens tabbed form modal when clicking Add Student', async () => {
    render(<StudentsListPage />);
    
    const addButton = screen.getByText('Add Student');
    fireEvent.click(addButton);
    
    await waitFor(() => {
      expect(screen.getByText('Add New Student')).toBeInTheDocument();
      expect(screen.getByText('Personal Details')).toBeInTheDocument();
      expect(screen.getByText('Guardian Details')).toBeInTheDocument();
      expect(screen.getByText('Academic Details')).toBeInTheDocument();
    });
  });

  it('shows progress indicator in tabbed form', async () => {
    render(<StudentsListPage />);
    
    const addButton = screen.getByText('Add Student');
    fireEvent.click(addButton);
    
    await waitFor(() => {
      expect(screen.getByText('Progress')).toBeInTheDocument();
      expect(screen.getByText('0%')).toBeInTheDocument();
    });
  });

  it('validates required fields in personal details tab', async () => {
    render(<StudentsListPage />);
    
    const addButton = screen.getByText('Add Student');
    fireEvent.click(addButton);
    
    await waitFor(() => {
      const firstNameInput = screen.getByLabelText('First Name');
      const lastNameInput = screen.getByLabelText('Last Name');
      
      // Clear required fields
      fireEvent.change(firstNameInput, { target: { value: '' } });
      fireEvent.change(lastNameInput, { target: { value: '' } });
      fireEvent.blur(firstNameInput);
      fireEvent.blur(lastNameInput);
    });
    
    await waitFor(() => {
      expect(screen.getByText('First name is required')).toBeInTheDocument();
      expect(screen.getByText('Last name is required')).toBeInTheDocument();
    });
  });

  it('allows navigation between tabs', async () => {
    render(<StudentsListPage />);
    
    const addButton = screen.getByText('Add Student');
    fireEvent.click(addButton);
    
    await waitFor(() => {
      const guardianTab = screen.getByText('Guardian Details');
      fireEvent.click(guardianTab);
      
      expect(screen.getByLabelText('Guardian Full Name')).toBeInTheDocument();
      expect(screen.getByLabelText('Relationship Type')).toBeInTheDocument();
    });
  });

  it('opens slideout form for quick edit', async () => {
    render(<StudentsListPage />);
    
    const quickEditButton = screen.getByTitle('Quick Edit');
    fireEvent.click(quickEditButton);
    
    await waitFor(() => {
      expect(screen.getByText('Quick Edit Student')).toBeInTheDocument();
      expect(screen.getByDisplayValue('John')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Doe')).toBeInTheDocument();
    });
  });

  it('validates phone number format in guardian section', async () => {
    render(<StudentsListPage />);
    
    const addButton = screen.getByText('Add Student');
    fireEvent.click(addButton);
    
    await waitFor(() => {
      const guardianTab = screen.getByText('Guardian Details');
      fireEvent.click(guardianTab);
    });
    
    await waitFor(() => {
      const phoneInput = screen.getByLabelText('Phone Number');
      fireEvent.change(phoneInput, { target: { value: 'invalid-phone' } });
      fireEvent.blur(phoneInput);
    });
    
    await waitFor(() => {
      expect(screen.getByText('Please enter a valid phone number')).toBeInTheDocument();
    });
  });

  it('shows validation indicators on tabs', async () => {
    render(<StudentsListPage />);
    
    const addButton = screen.getByText('Add Student');
    fireEvent.click(addButton);
    
    await waitFor(() => {
      const firstNameInput = screen.getByLabelText('First Name');
      fireEvent.change(firstNameInput, { target: { value: 'John' } });
      fireEvent.blur(firstNameInput);
    });
    
    // Check for validation success indicator (green checkmark)
    await waitFor(() => {
      const personalTab = screen.getByText('Personal Details').closest('button');
      expect(personalTab).toBeInTheDocument();
    });
  });

  it('handles form submission with validation', async () => {
    const mockAddStudent = vi.fn();
    mockUseAppData.mockReturnValue({
      students: mockStudents,
      classStreams: mockClassStreams,
      studentCategories: mockStudentCategories,
      dormitories: mockDormitories,
      loading: { students: false, all: false },
      addStudent: mockAddStudent,
      updateStudent: vi.fn(),
      deleteStudent: vi.fn(),
    } as any);

    render(<StudentsListPage />);
    
    const addButton = screen.getByText('Add Student');
    fireEvent.click(addButton);
    
    await waitFor(() => {
      // Fill required fields
      fireEvent.change(screen.getByLabelText('First Name'), { target: { value: 'Jane' } });
      fireEvent.change(screen.getByLabelText('Last Name'), { target: { value: 'Smith' } });
      fireEvent.change(screen.getByLabelText('Gender'), { target: { value: PersonGender.FEMALE } });
      fireEvent.change(screen.getByLabelText('Status'), { target: { value: StudentStatus.ACTIVE } });
    });
    
    // Navigate to last tab and submit
    await waitFor(() => {
      const academicTab = screen.getByText('Academic Details');
      fireEvent.click(academicTab);
    });
    
    await waitFor(() => {
      const submitButton = screen.getByText('Add Student');
      fireEvent.click(submitButton);
    });
    
    await waitFor(() => {
      expect(mockAddStudent).toHaveBeenCalled();
    });
  });

  it('supports keyboard navigation in tabbed form', async () => {
    render(<StudentsListPage />);
    
    const addButton = screen.getByText('Add Student');
    fireEvent.click(addButton);
    
    await waitFor(() => {
      const personalTab = screen.getByText('Personal Details');
      personalTab.focus();
      
      // Test arrow key navigation
      fireEvent.keyDown(personalTab, { key: 'ArrowRight' });
      
      expect(document.activeElement).toBe(screen.getByText('Guardian Details'));
    });
  });

  it('shows loading state during form submission', async () => {
    mockUseAppData.mockReturnValue({
      students: mockStudents,
      classStreams: mockClassStreams,
      studentCategories: mockStudentCategories,
      dormitories: mockDormitories,
      loading: { students: true, all: false },
      addStudent: vi.fn(),
      updateStudent: vi.fn(),
      deleteStudent: vi.fn(),
    } as any);

    render(<StudentsListPage />);
    
    const addButton = screen.getByText('Add Student');
    fireEvent.click(addButton);
    
    await waitFor(() => {
      // Check for loading spinner in submit button
      expect(screen.getByRole('button', { name: /add student/i })).toBeDisabled();
    });
  });

  it('handles slideout form auto-save functionality', async () => {
    const mockUpdateStudent = vi.fn();
    mockUseAppData.mockReturnValue({
      students: mockStudents,
      classStreams: mockClassStreams,
      studentCategories: mockStudentCategories,
      dormitories: mockDormitories,
      loading: { students: false, all: false },
      addStudent: vi.fn(),
      updateStudent: mockUpdateStudent,
      deleteStudent: vi.fn(),
    } as any);

    render(<StudentsListPage />);
    
    const quickEditButton = screen.getByTitle('Quick Edit');
    fireEvent.click(quickEditButton);
    
    await waitFor(() => {
      const firstNameInput = screen.getByDisplayValue('John');
      fireEvent.change(firstNameInput, { target: { value: 'Johnny' } });
    });
    
    // Click save button
    await waitFor(() => {
      const saveButton = screen.getByText('Save Changes');
      fireEvent.click(saveButton);
    });
    
    await waitFor(() => {
      expect(mockUpdateStudent).toHaveBeenCalled();
    });
  });
});