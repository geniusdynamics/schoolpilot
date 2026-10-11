// ABOUTME: Tests for the main DashboardPage — permissions, navigation, and that every
// ABOUTME: figure is computed from live data (empty school shows zeros / empty states).
import { fireEvent, render as rtlRender, screen, within } from '@testing-library/react';
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

// SO-29 / P0-G06: the dashboard must never show demo figures to a real school.
const emptySchool = () =>
  createAppData({
    students: [],
    staff: [],
    classes: [],
    classStreams: [],
    studentAttendance: [],
    schoolPeriods: [],
    campaigns: [],
    templatesComm: [],
    studentExamResults: [],
    studentInvoices: [],
    studentPayments: [],
    applications: [],
    studentSubjectEnrollments: [],
    studentTransportAssignments: [],
    schoolDetails: null,
  });

const daysAgo = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
};

describe('DashboardPage live data (P0-G06)', () => {
  beforeEach(() => {
    mockHasPermission.mockReset();
    mockUseAppData.mockReset();
    mockUseAuth.mockReset();
    mockHasPermission.mockResolvedValue(true);
    mockUseAuth.mockReturnValue({
      user: { id: 'u1', fullName: 'Alex Principal', role: 'super_admin' },
      hasPermission: mockHasPermission,
    });
  });

  it('shows zeros and empty states for an empty production school', async () => {
    mockUseAppData.mockReturnValue(emptySchool());
    render(<DashboardPage />);

    expect(await screen.findByText('Total Students')).toBeInTheDocument();
    const text = document.body.textContent ?? '';

    // Demo figures named in the audit must be gone.
    const demoFigures = [
      '4.8904', '46.3%', 'Intake: Dec 2024', 'Form 1', 'Form 4', '440', '240 Male',
      '342', '700', 'Suspended: 45', 'Academic Year 2024', '12%', '8.5%',
    ];
    for (const demo of demoFigures) {
      expect(text).not.toContain(demo);
    }
    // Hard-coded alert counters (15 / 5 / 14) are gone; every counter reads zero.
    const alertSection = screen.getByText('Pending Tasks').closest('section') as HTMLElement;
    for (const demoCount of ['15', '5', '14']) {
      expect(within(alertSection).queryByText(demoCount)).not.toBeInTheDocument();
    }
    expect(within(alertSection).getAllByText('0')).toHaveLength(4);

    // No dollar currency; the default institution currency is KES.
    expect(text).not.toContain('$');
    expect(text).toMatch(/KES\s0/);

    // Empty states instead of charts with fake data.
    expect(screen.getByText('No exam results recorded yet.')).toBeInTheDocument();
    expect(screen.getByText('No applications received yet.')).toBeInTheDocument();
    expect(screen.getByText('No students assigned to classes yet.')).toBeInTheDocument();
    expect(screen.getByText('No disciplinary cases recorded.')).toBeInTheDocument();
  });

  it('shows figures computed from seeded data in the institution currency', async () => {
    mockUseAppData.mockReturnValue(
      createAppData({
        schoolDetails: { id: 1, name: 'Greenfields', currency: 'UGX' },
        classStreams: [
          { id: 10, class_id: 'c1', name: 'East', class_name: 'Grade 7' },
          { id: 20, class_id: 'c2', name: 'West', class_name: 'Grade 8' },
        ],
        students: [
          { id: 's1', gender: 'Male', status: 'Active', current_class_stream_id: 10, createdAt: daysAgo(10) },
          { id: 's2', gender: 'Female', status: 'Active', current_class_stream_id: 10, createdAt: daysAgo(10) },
          { id: 's3', gender: 'Male', status: 'Suspended', current_class_stream_id: 20, createdAt: daysAgo(10) },
        ],
        studentAttendance: [
          { id: 'a1', status: 'present' },
          { id: 'a2', status: 'late' },
          { id: 'a3', status: 'absent' },
        ],
        studentExamResults: [
          { id: 'r1', student_id: 's1', averageMark: 60 },
          { id: 'r2', student_id: 's2', averageMark: 80 },
          { id: 'r3', student_id: 's3', averageMark: 55 },
        ],
        applications: [
          { id: 'ap1', gender: 'Male', status: 'Submitted' },
          { id: 'ap2', gender: 'Male', status: 'Under Review' },
          { id: 'ap3', gender: 'Female', status: 'Enrolled' },
        ],
        studentSubjectEnrollments: [
          { id: 'e1', student_id: 's1' },
          { id: 'e2', student_id: 's1' },
          { id: 'e3', student_id: 's2' },
        ],
        studentTransportAssignments: [
          { id: 't1', student_id: 's1', route_id: 1, status: 'Active' },
          { id: 't2', student_id: 's2', route_id: 1, status: 'Active' },
        ],
        studentInvoices: [{ id: 'i1', invoiceDate: daysAgo(5), total_amount: 12000 }],
        studentPayments: [{ id: 'p1', paymentDate: daysAgo(3), amount: 8500 }],
      })
    );
    render(<DashboardPage />);

    expect(await screen.findByText('Total Students')).toBeInTheDocument();
    const text = document.body.textContent ?? '';

    // Currency comes from institution settings.
    expect(text).not.toContain('$');
    expect(text).toMatch(/UGX\s8,500/);
    expect(text).toMatch(/UGX\s3,500/);

    // Class performance from exam results, grouped by the resolved class name.
    expect(screen.getByText('Grade 7')).toBeInTheDocument();
    expect(screen.getByText('70.0%')).toBeInTheDocument();
    expect(screen.getByText('55.0%')).toBeInTheDocument();

    expect(screen.getByTestId('applicants-total')).toHaveTextContent('3');
    expect(screen.getByTestId('alert-approvals')).toHaveTextContent('2');
    expect(screen.getByTestId('cumulative-active')).toHaveTextContent('2');
    expect(screen.getByTestId('cumulative-suspended')).toHaveTextContent('1');
    expect(screen.getByTestId('subject-registered')).toHaveTextContent('2');
    expect(screen.getByTestId('subject-not-registered')).toHaveTextContent('1');
    expect(screen.getByTestId('attendance-late')).toHaveTextContent('1');
    expect(screen.getByTestId('attendance-absent')).toHaveTextContent('1');
    expect(screen.getByTestId('transport-students')).toHaveTextContent('2');
    expect(screen.getByTestId('transport-routes')).toHaveTextContent('1');
  });
});
