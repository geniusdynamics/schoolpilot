
import { fireEvent, render as rtlRender, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import DashboardPage from '../DashboardPage';
import { FullWidthProvider } from '@/contexts/FullWidthContext';

// This file imports RTL's render directly, bypassing the global provider
// wrapper in setup.ts. The page's PageContainer calls useFullWidth(), so wrap
// every render here (single-point wrapper pattern).
const render = (ui: React.ReactElement, options?: Parameters<typeof rtlRender>[1]) =>
  rtlRender(<FullWidthProvider>{ui}</FullWidthProvider>, options);

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
    { id: 's1', createdAt: '2026-01-05T00:00:00.000Z', gender: 'male' },
    { id: 's2', createdAt: '2026-02-05T00:00:00.000Z', gender: 'female' },
    { id: 's3', createdAt: '2026-03-05T00:00:00.000Z', gender: 'male' }
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

    // Key statistics
    expect(await screen.findByText('Total Students')).toBeInTheDocument();
    expect(screen.getByText('Faculty Count')).toBeInTheDocument();
    expect(screen.getByText('Attendance Rate')).toBeInTheDocument();
    expect(screen.getByText('Fee Collection')).toBeInTheDocument();

    // Alert banners
    expect(screen.getByText('New Messages')).toBeInTheDocument();
    expect(screen.getByText('Pending Tasks')).toBeInTheDocument();
    expect(screen.getByText('Overdue Tasks')).toBeInTheDocument();
    expect(screen.getByText('Approvals Pending')).toBeInTheDocument();

    // Charts
    expect(screen.getByText('Students Management')).toBeInTheDocument();
    expect(screen.getByText('Enrollment Trends')).toBeInTheDocument();
    expect(screen.getByText('Reported Students')).toBeInTheDocument();
    expect(screen.getByText('Financial Summary')).toBeInTheDocument();

    // Quick navigation
    expect(screen.getByText('Quick Navigation')).toBeInTheDocument();
  });

  it('shows offline status when connection is lost', async () => {
    mockUseAppData.mockReturnValue(
      createAppData({
        isOnline: false,
        syncStatus: { state: 'error' },
      })
    );

    render(<DashboardPage />);

    expect(await screen.findByText('Total Students')).toBeInTheDocument();
    // Check for offline indicator
    expect(screen.getByText('Offline')).toBeInTheDocument();
  }, 15000);

  it('triggers navigation from quick actions and alert banners', async () => {
    render(<DashboardPage />);

    // Click on an alert banner
    const newMessagesBanner = await screen.findByText('New Messages');
    fireEvent.click(newMessagesBanner);

    // Click on Add Student button
    const addStudentButton = screen.getByText('Add Student');
    fireEvent.click(addStudentButton);

    expect(mockNavigate).toHaveBeenCalledWith('/administration/students/add');
  }, 15000);

  it('renders navigation hub cards', async () => {
    render(<DashboardPage />);

    expect(await screen.findByText('Quick Navigation')).toBeInTheDocument();
    
    // Check for navigation items
    expect(screen.getByText('Student Management')).toBeInTheDocument();
    expect(screen.getByText('Attendance Tracking')).toBeInTheDocument();
    expect(screen.getByText('Grade Books')).toBeInTheDocument();
    expect(screen.getByText('Scheduling')).toBeInTheDocument();
    expect(screen.getByText('Finance')).toBeInTheDocument();
    expect(screen.getByText('Analytics')).toBeInTheDocument();
  });

  it('navigates when clicking on navigation hub cards', async () => {
    render(<DashboardPage />);

    expect(await screen.findByText('Quick Navigation')).toBeInTheDocument();

    // Click on Analytics card
    const analyticsCard = screen.getByText('Analytics');
    fireEvent.click(analyticsCard);

    expect(mockNavigate).toHaveBeenCalledWith('/reports');
  });
});
