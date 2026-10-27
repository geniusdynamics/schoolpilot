import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AcademicsDashboardPage from '@/modules/academics/pages/AcademicsDashboardPage';
import AdministrationDashboardPage from '@/modules/administration/pages/AdministrationDashboardPage';
import AdmissionsDashboardPage from '@/modules/admissions/pages/AdmissionsDashboardPage';
import FinanceDashboardPage from '@/modules/finance/pages/FinanceDashboardPage';
import HRDashboardPage from '@/modules/hr/pages/HRDashboardPage';
import InventoryDashboardPage from '@/modules/inventory/pages/InventoryDashboardPage';
import SchoolProcurementDashboardPage from '@/modules/inventory/pages/SchoolProcurementDashboardPage';
import VendorPortalDashboardPage from '@/modules/inventory/pages/VendorPortalDashboardPage';
import LibraryDashboardPage from '@/modules/library/pages/LibraryDashboardPage';
import NutritionDashboardPage from '@/modules/nutrition/pages/NutritionDashboardPage';
import ReportsDashboardPage from '@/modules/reports/pages/ReportsDashboardPage';
import SettingsDashboardPage from '@/modules/settings/pages/SettingsDashboardPage';

const mockUseAppData = vi.fn();
const mockUseAdmissionsData = vi.fn();
const mockHasPermission = vi.fn();

vi.mock('@/hooks/useAppData', () => ({
  useAppData: () => mockUseAppData(),
}));

vi.mock('@/modules/admissions/data/useAdmissionsData', () => ({
  useAdmissionsData: () => mockUseAdmissionsData(),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'u1', role: 'super_admin', fullName: 'Mr Dashboard' },
    hasPermission: mockHasPermission,
  }),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallbackOrOptions?: any) => {
      if (typeof fallbackOrOptions === 'string') {
        return fallbackOrOptions;
      }
      return key;
    },
  }),
}));

class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

Object.defineProperty(globalThis, 'ResizeObserver', {
  writable: true,
  value: MockResizeObserver,
});

const buildLoadingState = () => ({
  all: false,
  students: false,
  staff: false,
  classes: false,
  subjects: false,
  studentAttendance: false,
  schoolPeriods: false,
  campaigns: false,
  templatesComm: false,
  studentExamResults: false,
  studentInvoices: false,
  studentPayments: false,
  generalPayments: false,
  supplierInvoices: false,
  examSessions: false,
  subjectPapers: false,
  gradingSchemes: false,
  departments: false,
  academicYearStructures: false,
  academicYears: false,
  clubs: false,
  customers: false,
  studentCategories: false,
  banks: false,
  feeTemplates: false,
  payrollPeriods: false,
  payrollItemTypes: false,
  staffSalarySettings: false,
  requisitions: false,
  purchaseOrders: false,
  suppliers: false,
  books: false,
  loans: false,
  fines: false,
  bookCategories: false,
  mealPlans: false,
  studentMealPlans: false,
  menus: false,
  merchants: false,
  studentWallets: false,
  users: false,
  schoolDetails: false,
});

const appDataFixture = () => ({
  loading: buildLoadingState(),
  syncStatus: { state: 'idle' },
  isOnline: true,
  users: [{ id: 'u1', username: 'admin', email: 'admin@example.com', userType: 'System', role: 'Admin', isActive: true }],
  schoolDetails: { name: 'SchoolPilot Academy', school_code: 'SPA' },
  isDatabaseModeActive: true,
  students: [
    { id: 's1', createdAt: '2026-01-04', status: 'active', gender: 'Male' },
    { id: 's2', createdAt: '2026-02-10', status: 'active', gender: 'Female' },
  ],
  staff: [
    { id: 'st1', is_academic: true, employment_type: 'full_time', department_id: 'd1' },
    { id: 'st2', is_academic: true, employment_type: 'contract', department_id: 'd2' },
  ],
  classes: [{ id: 'c1' }],
  subjects: [{ id: 'sub1', department_id: 'd1' }],
  subjectPapers: [{ id: 'sp1' }],
  examSessions: [{ id: 'es1' }],
  gradingSchemes: [{ id: 'gs1' }],
  departments: [{ id: 'd1', name: 'Science', is_academic: true }, { id: 'd2', name: 'Languages', is_academic: true }],
  academicYearStructures: [{ id: 'ays1' }],
  academicYears: [{ id: 'ay1' }],
  schoolPeriods: [{ id: 'p1', name: 'Open Day', startDate: '2099-05-12' }],
  clubs: [{ id: 'cl1' }],
  customers: [{ id: 'cu1' }],
  studentCategories: [{ id: 'cat1', name: 'Boarding' }],
  campaigns: [{ id: 'cg1', name: 'Parent Notice', description: 'Reminder', updatedAt: '2026-03-01' }],
  templatesComm: [{ id: 'tc1', name: 'General', content: 'Announcement', updatedAt: '2026-03-02' }],
  studentAttendance: [{ id: 'a1', status: 'present' }, { id: 'a2', status: 'absent' }],
  studentExamResults: [{ id: 'r1', averageMark: 76 }],
  studentInvoices: [{ id: 'inv1', status: 'Due', invoiceDate: '2026-03-02', total_amount: 2000 }],
  studentPayments: [{ id: 'pay1', amount: 1200, payment_date: '2026-03-10' }],
  generalPayments: [{ id: 'g1', amount: 800, payment_date: '2026-03-15' }],
  supplierInvoices: [{ id: 'si1', status: 'Approved', total_amount: 700, invoice_date: '2026-03-11' }],
  feeTemplates: [{ id: 'ft1' }],
  banks: [{ id: 'b1' }],
  payrollPeriods: [{ id: 'pp1' }],
  payrollItemTypes: [{ id: 'pit1' }],
  staffSalarySettings: [{ id: 'sss1' }],
  requisitions: [{ id: 'rq1', status: 'Pending Approval', total_requested_value: 1000 }],
  purchaseOrders: [{ id: 'po1', status: 'Approved', supplier_id: 1, supplier_name: 'Alpha Supplies', total_value: 2000, order_date: '2026-03-03' }],
  stockLevels: [{ id: 'sl1', quantity: 5, reorder_level: 10 }],
  itemsInv: [{ id: 'it1', quantity_in_stock: 5, reorder_level: 10, name: 'Marker Pens' }],
  suppliers: [{ id: 1, name: 'Alpha Supplies', contract_expiry_date: '2099-09-09', email: 'a@supplies.com', phone: '123', address: 'City' }],
  updateRequisitionStatus: vi.fn(),
  rfqs: [{ id: 'rfq1', status: 'Open', title: 'Books', closing_date: '2099-07-01' }],
  books: [{ id: 'bk1', title: 'Math', status: 'AVAILABLE', category_id: 'bc1', damaged_status: false, lost_status: false }],
  loans: [{ id: 'ln1', book_id: 'bk1', due_date: '2099-08-01' }],
  fines: [{ id: 'f1', status: 'Pending' }],
  bookCategories: [{ id: 'bc1', name: 'Textbooks' }],
  mealPlans: [{ id: 'mp1' }],
  studentMealPlans: [{ id: 'smp1', status: 'active' }],
  menus: [{ id: 'mn1' }],
  merchants: [{ id: 'm1' }],
  studentWallets: [{ id: 'w1', balance: 1200 }],
});

const renderWithRouter = (node: React.ReactNode) => render(<MemoryRouter>{node}</MemoryRouter>);

describe('Module dashboard modernization', () => {
  beforeEach(() => {
    mockHasPermission.mockReset();
    mockUseAppData.mockReset();
    mockUseAdmissionsData.mockReset();
    mockHasPermission.mockResolvedValue(true);
    mockUseAppData.mockReturnValue(appDataFixture());
    mockUseAdmissionsData.mockReturnValue({
      loading: false,
      statistics: {
        totalApplications: 10,
        pendingReview: 3,
        approved: 4,
        rejected: 1,
        deferred: 0,
        waitlisted: 1,
        enrolled: 2,
        thisMonth: 5,
        thisWeek: 2,
        today: 1,
        pipeline: { contacts: 8, enquired: 6, applied: 10, admitted: 4, enrolled: 2 },
        byStatus: [{ status: 'Pending', count: 3 }],
        byClass: [{ className: 'Grade 7', count: 4 }],
        monthlyData: [
          { month: 'Jan', enquiries: 2, applications: 3, enrolled: 1 },
          { month: 'Feb', enquiries: 3, applications: 4, enrolled: 2 },
        ],
        funnel: [],
        postAdmissions: { declined: 0, enrolled: 2, total: 2 },
        trends: {
          enquiries: { direction: 'neutral', value: '0%' },
          applications: { direction: 'neutral', value: '0%' },
          enrollment: { direction: 'neutral', value: '0%' },
          conversionRate: { direction: 'neutral', value: '0%' },
        },
      },
    });
  });

  it('renders all modernized module dashboards', async () => {
    const pages = [
      <AcademicsDashboardPage key="academics" />,
      <AdministrationDashboardPage key="admin" />,
      <AdmissionsDashboardPage key="admissions" />,
      <FinanceDashboardPage key="finance" />,
      <HRDashboardPage key="hr" />,
      <InventoryDashboardPage key="inventory" />,
      <SchoolProcurementDashboardPage key="procurement" />,
      <VendorPortalDashboardPage key="vendor" />,
      <LibraryDashboardPage key="library" />,
      <NutritionDashboardPage key="nutrition" />,
      <ReportsDashboardPage key="reports" />,
      <SettingsDashboardPage key="settings-dashboard" />,
    ];

    for (const page of pages) {
      const { unmount } = renderWithRouter(page);
      await waitFor(() => {
        expect(document.body.textContent?.length).toBeGreaterThan(50);
      });
      unmount();
    }
  }, 60000);

  it('renders quick action buttons across modernized module dashboards', async () => {
    renderWithRouter(<FinanceDashboardPage />);
    expect(await screen.findByText('Record Payment')).toBeInTheDocument();
    // "General Receipts" appears both as a quick action link and in the Quick
    // Overview stats card; assert the quick action itself.
    // Finance renders quick actions as QuickNavCard buttons whose accessible
    // name includes the label plus description text
    expect(screen.getByRole('button', { name: /General Receipts/ })).toBeInTheDocument();
  });

  it('renders admissions analytical widgets and application stats', async () => {
    renderWithRouter(<AdmissionsDashboardPage />);
    expect(await screen.findByText('Welcome, Sharon')).toBeInTheDocument();
    // Metric labels can also appear inside chart legends — assert at least one of each
    expect(screen.getAllByText('Enquiries').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Applicants').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Enrollment').length).toBeGreaterThan(0);
  });
});
