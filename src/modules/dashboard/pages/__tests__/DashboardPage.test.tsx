import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import DashboardPage from '../DashboardPage';

const mockNavigate = vi.fn();
const mockHasPermission = vi.fn();
const mockUseAppData = vi.fn();
const mockUseAuth = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    Link: ({ children, ...props }: any) => <a {...props}>{children}</a>,
  };
});

vi.mock('@/hooks/useAppData', () => ({
  useAppData: () => mockUseAppData()
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth()
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallbackOrOptions?: any, interpolation?: Record<string, any>) => {
      const fallback = typeof fallbackOrOptions === 'string' ? fallbackOrOptions : key;
      const values = typeof fallbackOrOptions === 'object' ? fallbackOrOptions : interpolation;
      if (!values) {
        return fallback;
      }
      return fallback.replace(/\{\{(\w+)\}\}/g, (_, token) => String(values[token] ?? ''));
    }
  })
}));

class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

Object.defineProperty(globalThis, 'ResizeObserver', {
  writable: true,
  value: MockResizeObserver
});

const createAppData = (overrides: Record<string, any> = {}) => ({
  students: [
    { id: 's1', createdAt: '2026-01-05T00:00:00.000Z' },
    { id: 's2', createdAt: '2026-02-05T00:00:00.000Z' },
    { id: 's3', createdAt: '2026-03-05T00:00:00.000Z' }
  ],
  staff: [{ id: 't1' }, { id: 't2' }],
  classes: [{ id: 'c1' }],
  studentAttendance: [
    { id: 'a1', status: 'present' },
    { id: 'a2', status: 'present' },
    { id: 'a3', status: 'absent' }
  ],
  schoolPeriods: [
    { id: 1, name: 'Midterm Exams', startDate: '2099-05-01T00:00:00.000Z' },
    { id: 2, name: 'Science Fair', startDate: '2099-06-10T00:00:00.000Z' }
  ],
  campaigns: [
    { id: 1, name: 'Term Newsletter', description: 'New term updates', updatedAt: '2026-03-20T00:00:00.000Z' }
  ],
  templatesComm: [
    { id: 1, name: 'General Notice', content: 'School closes early Friday', updatedAt: '2026-03-21T00:00:00.000Z' }
  ],
  studentExamResults: [
    { id: 1, averageMark: 42 },
    { id: 2, averageMark: 65 },
    { id: 3, averageMark: 78 },
    { id: 4, averageMark: 91 }
  ],
  studentInvoices: [
    { id: 'i1', invoiceDate: '2026-02-10T00:00:00.000Z', total_amount: 4000 },
    { id: 'i2', invoiceDate: '2026-03-10T00:00:00.000Z', total_amount: 6000 }
  ],
  studentPayments: [
    { id: 'p1', paymentDate: '2026-02-12T00:00:00.000Z', amount: 3000 },
    { id: 'p2', paymentDate: '2026-03-12T00:00:00.000Z', amount: 5500 }
  ],
  syncStatus: { state: 'idle' },
  isOnline: true,
  loading: {
    students: false,
    staff: false,
    classes: false,
    studentAttendance: false,
    schoolPeriods: false,
    all: false
  },
  ...overrides
});

describe('DashboardPage', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    mockHasPermission.mockReset();
    mockUseAppData.mockReset();
    mockUseAuth.mockReset();
    mockHasPermission.mockResolvedValue(true);
    mockUseAuth.mockReturnValue({
      user: { id: 'u1', fullName: 'Alex Principal', role: 'super_admin' },
      hasPermission: mockHasPermission
    });
    mockUseAppData.mockReturnValue(createAppData());
  });

  it('shows restricted state when dashboard permission is denied', async () => {
    mockHasPermission.mockResolvedValue(false);
    render(<DashboardPage />);

    expect(await screen.findByText('Dashboard Access Restricted')).toBeInTheDocument();
  });

  it('renders key metrics, sections, and charts for authorized users', async () => {
    render(<DashboardPage />);

    expect(await screen.findByText('Total Students')).toBeInTheDocument();
    expect(screen.getByText('Faculty Count')).toBeInTheDocument();
    expect(screen.getByText('Attendance Rate')).toBeInTheDocument();
    expect(screen.getByText('Navigation Hub')).toBeInTheDocument();
    expect(screen.getByText('Enrollment Trends')).toBeInTheDocument();
    expect(screen.getByText('Performance Analytics')).toBeInTheDocument();
    expect(screen.getByText('Financial Summary')).toBeInTheDocument();
  });

  it('renders teacher-specific quick actions for teacher role', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'u2', fullName: 'Terry Teacher', role: 'teacher' },
      hasPermission: mockHasPermission
    });

    render(<DashboardPage />);

    expect(await screen.findByText('Record Attendance')).toBeInTheDocument();
    expect(screen.getByText('Create Assignment')).toBeInTheDocument();
    expect(screen.getByText('Open Grade Book')).toBeInTheDocument();
  });

  it('shows high-severity notification states when offline and low attendance', async () => {
    mockUseAppData.mockReturnValue(
      createAppData({
        isOnline: false,
        syncStatus: { state: 'error' },
        studentAttendance: [
          { id: 'a1', status: 'present' },
          { id: 'a2', status: 'absent' },
          { id: 'a3', status: 'absent' },
          { id: 'a4', status: 'absent' }
        ]
      })
    );

    render(<DashboardPage />);

    expect(await screen.findByText('Attendance Rate')).toBeInTheDocument();
    expect(screen.getByText('Notifications')).toBeInTheDocument();
    expect(screen.getByText('You are offline. Changes will sync when connection returns.')).toBeInTheDocument();
    expect(screen.getByText('Attendance is below 85%. Review at-risk classes.')).toBeInTheDocument();
  }, 15000);

  it('triggers navigation from quick actions and navigation hub cards', async () => {
    render(<DashboardPage />);

    const addStudentButton = await screen.findByText('Add Student');
    fireEvent.click(addStudentButton);

    const analyticsHubButton = screen.getByText('Analytics');
    fireEvent.click(analyticsHubButton);

    expect(mockNavigate).toHaveBeenCalledWith('/reports');
  }, 15000);
});
