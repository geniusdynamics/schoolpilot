import React from 'react';
import ModuleDashboardShell from '@/components/ModuleDashboardShell';
import { AcademicCapIcon, ArchiveIcon, BeakerIcon, CakeIcon, CircleStackIcon, CogIcon, CurrencyDollarIcon, DocumentReportIcon, LibraryIcon, UserGroupIcon, UsersIcon } from '@/components/ui/icons';

const createModuleStory = (title: string, subtitle: string, heroIcon: React.ReactNode, metricLabel: string) => () => (
  <ModuleDashboardShell
    title={title}
    subtitle={subtitle}
    heroIcon={heroIcon}
    metrics={[
      { key: 'm1', label: metricLabel, value: 128 },
      { key: 'm2', label: 'Attendance Rate', value: '93.4%' },
      { key: 'm3', label: 'Open Tasks', value: 14 },
      { key: 'm4', label: 'Notifications', value: 6 },
    ]}
    quickActions={[
      { key: 'a1', label: 'Open Overview', variant: 'outline' },
      { key: 'a2', label: 'Create Record', variant: 'primary' },
      { key: 'a3', label: 'Generate Report', variant: 'outline' },
    ]}
    notifications={[
      { id: 'n1', title: 'Data Health', message: 'Live data sync is healthy.', severity: 'normal' },
      { id: 'n2', title: 'Attention', message: 'One widget requires review.', severity: 'warning' },
    ]}
  />
);

export default {
  title: 'Dashboards/Module Dashboards',
  component: ModuleDashboardShell,
};

export const AcademicsDashboard = createModuleStory(
  'Academics Dashboard',
  'Curriculum performance, sessions, and grading insights.',
  <BeakerIcon className="h-8 w-8 text-white" />,
  'Subjects'
);

export const AdministrationDashboard = createModuleStory(
  'Administration Dashboard',
  'School operations, profiles, and core setup metrics.',
  <CogIcon className="h-8 w-8 text-white" />,
  'Students'
);

export const AdmissionsDashboard = createModuleStory(
  'Admissions Dashboard',
  'Application pipeline and enrollment readiness.',
  <UsersIcon className="h-8 w-8 text-white" />,
  'Applications'
);

export const FinanceDashboard = createModuleStory(
  'Finance Dashboard',
  'Billing, collections, and liabilities monitoring.',
  <CurrencyDollarIcon className="h-8 w-8 text-white" />,
  'Collected Revenue'
);

export const HrDashboard = createModuleStory(
  'HR Dashboard',
  'Staffing, payroll periods, and compensation tracking.',
  <UserGroupIcon className="h-8 w-8 text-white" />,
  'Staff Members'
);

export const InventoryDashboard = createModuleStory(
  'Inventory Dashboard',
  'Stock levels, requisitions, and procurement health.',
  <ArchiveIcon className="h-8 w-8 text-white" />,
  'Active Requisitions'
);

export const SchoolProcurementDashboard = createModuleStory(
  'School Procurement Dashboard',
  'PO lifecycle, spend controls, and supplier commitments.',
  <ArchiveIcon className="h-8 w-8 text-white" />,
  'Purchase Orders'
);

export const VendorPortalDashboard = createModuleStory(
  'Vendor Portal Dashboard',
  'Opportunities, bids, invoices, and vendor activities.',
  <CircleStackIcon className="h-8 w-8 text-white" />,
  'Vendor RFQs'
);

export const LibraryDashboard = createModuleStory(
  'Library Dashboard',
  'Catalog usage, loan trends, and fine management.',
  <LibraryIcon className="h-8 w-8 text-white" />,
  'Books'
);

export const NutritionDashboard = createModuleStory(
  'Nutrition Dashboard',
  'Meal plans, assignment coverage, and wallet visibility.',
  <CakeIcon className="h-8 w-8 text-white" />,
  'Meal Plans'
);

export const ReportsDashboard = createModuleStory(
  'Reports Dashboard',
  'Operational reporting and leadership analytics.',
  <DocumentReportIcon className="h-8 w-8 text-white" />,
  'Generated Reports'
);

export const SettingsDashboard = createModuleStory(
  'Settings Dashboard',
  'Configuration controls, modules, and permissions.',
  <CogIcon className="h-8 w-8 text-white" />,
  'Configured Modules'
);

export const MainSchoolDashboard = createModuleStory(
  'Main Dashboard',
  'Unified educational operations command center.',
  <AcademicCapIcon className="h-8 w-8 text-white" />,
  'Active Learners'
);
