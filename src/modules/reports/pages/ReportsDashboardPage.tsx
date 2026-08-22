// ABOUTME: This component renders the dashboard for the Reports module.
// ABOUTME: It displays key statistics and quick links to various report categories.

import React from 'react';
import { DocumentReportIcon, ChartBarIcon, DocumentTextIcon, CurrencyDollarIcon, UsersIcon, ArrowRightIcon, ClockIcon, AcademicCapIcon, BriefcaseIcon, BuildingLibraryIcon, ReceiptRefundIcon, TableCellsIcon } from '@/components/ui/icons';
import { useAppData } from '@/hooks/useAppData';
import Spinner from '@/components/ui/Spinner';
import Card from '@/components/ui/Card';
import ModuleDashboardShell, {
  DashboardMetric,
  DashboardNotification,
  DashboardQuickAction,
  DashboardAlertBanner,
} from '@/components/ModuleDashboardShell';

export const ReportsDashboardPageContent: React.FC = () => {
  const {
    loading,
    students,
    staff,
    classes,
    subjects,
    feeStructures,
    invoices,
    payments,
    exams,
    departments,
  } = useAppData();

  const pageIsLoading = loading.all || loading.students || loading.staff || loading.classes || loading.subjects;

  if (pageIsLoading) {
    return <div className="flex justify-center items-center h-screen"><Spinner size="lg" /></div>;
  }

  // Calculate stats for the dashboard
  const totalStudents = (students || []).length;
  const totalStaff = (staff || []).length;
  const totalClasses = (classes || []).length;
  const totalSubjects = (subjects || []).length;
  const totalDepartments = (departments || []).length;
  const totalExams = (exams || []).length;
  const totalFeeStructures = (feeStructures || []).length;
  const unpaidInvoices = (invoices || []).filter((inv: any) => inv.status === 'unpaid' || inv.status === 'pending').length;
  const totalPayments = (payments || []).length;

  // Report readiness calculations
  const hasStudentData = totalStudents > 0;
  const hasStaffData = totalStaff > 0;
  const hasAcademicData = totalClasses > 0 && totalSubjects > 0;
  const hasFinancialData = totalFeeStructures > 0;

  // Enhanced metrics with trends and color schemes
  const metrics: DashboardMetric[] = [
    {
      key: 'students',
      label: 'Total Students',
      value: totalStudents.toLocaleString(),
      icon: <UsersIcon className="h-6 w-6" />,
      trend: hasStudentData ? 'up' : 'down',
      trendValue: hasStudentData ? 'Data available' : 'No data',
      to: '/reports/student-masterlist',
      colorScheme: 'emerald',
      description: 'Student records ready',
    },
    {
      key: 'staff',
      label: 'Total Staff',
      value: totalStaff.toLocaleString(),
      icon: <BriefcaseIcon className="h-6 w-6" />,
      trend: hasStaffData ? 'up' : 'down',
      trendValue: hasStaffData ? 'Data available' : 'No data',
      to: '/reports/teacher-assignments',
      colorScheme: 'blue',
      description: 'Staff records ready',
    },
    {
      key: 'classes',
      label: 'Total Classes',
      value: totalClasses,
      icon: <BuildingLibraryIcon className="h-6 w-6" />,
      trend: totalClasses > 0 ? 'up' : 'down',
      trendValue: totalClasses > 0 ? `${totalDepartments} depts` : 'No data',
      to: '/reports/exam-results-horizontal',
      colorScheme: 'violet',
      description: 'Academic structure ready',
    },
    {
      key: 'subjects',
      label: 'Total Subjects',
      value: totalSubjects,
      icon: <AcademicCapIcon className="h-6 w-6" />,
      trend: hasAcademicData ? 'up' : 'down',
      trendValue: hasAcademicData ? `${totalExams} exams` : 'No data',
      to: '/reports/exam-results-horizontal',
      colorScheme: 'orange',
      description: 'Curriculum data ready',
    },
  ];

  // Alert banners for report readiness
  const alertBanners: DashboardAlertBanner[] = [
    {
      type: 'message',
      count: totalStudents,
      label: 'Student Records',
      description: 'Available for reports',
      to: '/reports/student-masterlist',
    },
    {
      type: 'approval',
      count: totalExams,
      label: 'Exam Records',
      description: 'Ready for results',
      to: '/reports/exam-results-horizontal',
    },
    {
      type: 'fees',
      count: unpaidInvoices,
      label: 'Unpaid Invoices',
      description: 'Financial reports',
      to: '/reports/student-financial-summary',
    },
    {
      type: 'task',
      count: totalPayments,
      label: 'Payment Records',
      description: 'Collection reports',
      to: '/reports/fee-collection-summary',
    },
  ];

  // Enhanced quick actions with descriptions
  const quickActions: DashboardQuickAction[] = [
    {
      key: 'student-reports',
      label: 'Student Reports',
      description: 'Student masterlist & info',
      to: '/reports/student-masterlist',
      icon: <UsersIcon className="h-5 w-5" />,
      colorScheme: 'emerald',
    },
    {
      key: 'exam-results',
      label: 'Exam Results',
      description: 'Academic performance',
      to: '/reports/exam-results-horizontal',
      icon: <ChartBarIcon className="h-5 w-5" />,
      colorScheme: 'violet',
    },
    {
      key: 'financial-reports',
      label: 'Financial Reports',
      description: 'Student financial summary',
      to: '/reports/student-financial-summary',
      icon: <CurrencyDollarIcon className="h-5 w-5" />,
      colorScheme: 'blue',
    },
    {
      key: 'teacher-reports',
      label: 'Teacher Reports',
      description: 'Assignments & workload',
      to: '/reports/teacher-assignments',
      icon: <BriefcaseIcon className="h-5 w-5" />,
      colorScheme: 'cyan',
    },
    {
      key: 'account-ledger',
      label: 'Account Ledger',
      description: 'Detailed transactions',
      to: '/reports/account-ledger',
      icon: <TableCellsIcon className="h-5 w-5" />,
      colorScheme: 'indigo',
    },
    {
      key: 'fee-collection',
      label: 'Fee Collection',
      description: 'Collection summary',
      to: '/reports/fee-collection-summary',
      icon: <ReceiptRefundIcon className="h-5 w-5" />,
      colorScheme: 'amber',
    },
  ];

  const notifications: DashboardNotification[] = [
    {
      id: 'reports-health',
      title: 'Report Data Coverage',
      message: totalStudents > 0 && totalClasses > 0
        ? `All core datasets ready: ${totalStudents} students, ${totalStaff} staff, ${totalClasses} classes.`
        : `Limited data available. Students: ${totalStudents}, Classes: ${totalClasses}, Staff: ${totalStaff}`,
      severity: totalStudents > 0 && totalClasses > 0 ? 'normal' : 'warning',
    },
    {
      id: 'financial-reports',
      title: 'Financial Reporting',
      message: hasFinancialData
        ? `${totalFeeStructures} fee structures, ${unpaidInvoices} unpaid invoices ready for reporting.`
        : 'Financial data limited. Configure fee structures for comprehensive reports.',
      severity: hasFinancialData ? 'normal' : 'warning',
    },
    {
      id: 'academic-reports',
      title: 'Academic Reporting',
      message: totalExams > 0
        ? `${totalExams} exam records available for results reporting.`
        : 'No exam records found. Create exams to generate results reports.',
      severity: totalExams > 0 ? 'normal' : 'warning',
    },
  ];

  // Recent report activity
  const recentActivity = [
    { action: 'Student masterlist exported', time: '2 hours ago', type: 'export' },
    { action: 'Exam results generated', time: '1 day ago', type: 'exam' },
    { action: 'Fee collection report viewed', time: '2 days ago', type: 'finance' },
    { action: 'Teacher assignments updated', time: '3 days ago', type: 'teacher' },
  ];

  return (
    <ModuleDashboardShell
      title="Reports Dashboard"
      subtitle="Access student, academic, staffing, and finance reports with a unified analytics entry point."
      heroIcon={<DocumentReportIcon className="h-8 w-8 text-white" />}
      accentColor="slate"
      metrics={metrics}
      alertBanners={alertBanners}
      quickActions={quickActions}
      quickNavCards={true}
      notifications={notifications}
    >
      {/* Additional Reports Info Panels */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Data Readiness */}
        <Card title="Data Readiness" className="border-slate-200 bg-white shadow-sm">
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-sm text-gray-600">Student Data</span>
              <span className={`font-semibold ${hasStudentData ? 'text-emerald-600' : 'text-rose-600'}`}>
                {hasStudentData ? 'Ready' : 'Missing'}
              </span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-sm text-gray-600">Staff Data</span>
              <span className={`font-semibold ${hasStaffData ? 'text-emerald-600' : 'text-rose-600'}`}>
                {hasStaffData ? 'Ready' : 'Missing'}
              </span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-sm text-gray-600">Academic Data</span>
              <span className={`font-semibold ${hasAcademicData ? 'text-emerald-600' : 'text-rose-600'}`}>
                {hasAcademicData ? 'Ready' : 'Missing'}
              </span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-gray-600">Financial Data</span>
              <span className={`font-semibold ${hasFinancialData ? 'text-emerald-600' : 'text-rose-600'}`}>
                {hasFinancialData ? 'Ready' : 'Missing'}
              </span>
            </div>
          </div>
        </Card>

        {/* Recent Activity */}
        <Card title="Recent Activity" className="border-slate-200 bg-white shadow-sm">
          <div className="space-y-3">
            {recentActivity.map((activity, index) => (
              <div key={index} className="flex items-start gap-3 py-2">
                <div className={`
                  flex h-8 w-8 items-center justify-center rounded-full flex-shrink-0
                  ${activity.type === 'export' ? 'bg-emerald-100 text-emerald-600' :
                    activity.type === 'exam' ? 'bg-violet-100 text-violet-600' :
                    activity.type === 'finance' ? 'bg-blue-100 text-blue-600' :
                    'bg-cyan-100 text-cyan-600'}
                `}>
                  {activity.type === 'export' ? <DocumentTextIcon className="h-4 w-4" /> :
                   activity.type === 'exam' ? <ChartBarIcon className="h-4 w-4" /> :
                   activity.type === 'finance' ? <CurrencyDollarIcon className="h-4 w-4" /> :
                   <BriefcaseIcon className="h-4 w-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{activity.action}</p>
                  <p className="text-xs text-gray-500 flex items-center gap-1">
                    <ClockIcon className="h-3 w-3" />
                    {activity.time}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Quick Overview */}
        <Card title="Quick Overview" className="border-slate-200 bg-white shadow-sm">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-emerald-50 p-3 text-center">
                <p className="text-2xl font-bold text-emerald-700">{totalStudents}</p>
                <p className="text-xs text-emerald-600">Students</p>
              </div>
              <div className="rounded-lg bg-blue-50 p-3 text-center">
                <p className="text-2xl font-bold text-blue-700">{totalStaff}</p>
                <p className="text-xs text-blue-600">Staff</p>
              </div>
            </div>
            <div className="rounded-lg bg-violet-50 p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-violet-700">Classes</span>
                <span className="font-bold text-violet-700">{totalClasses}</span>
              </div>
            </div>
            <div className="rounded-lg bg-orange-50 p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-orange-700">Exams Recorded</span>
                <span className="font-bold text-orange-700">{totalExams}</span>
              </div>
            </div>
            <div className="rounded-lg bg-amber-50 p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-amber-700">Unpaid Invoices</span>
                <span className="font-bold text-amber-700">{unpaidInvoices}</span>
              </div>
            </div>
            <button
              onClick={() => window.location.hash = '#/reports/student-masterlist'}
              className="w-full py-2 px-4 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium text-gray-700 transition-colors flex items-center justify-center gap-2"
            >
              View Student Masterlist <ArrowRightIcon className="h-4 w-4" />
            </button>
          </div>
        </Card>
      </section>
    </ModuleDashboardShell>
  );
};
const ReportsDashboardPage: React.FC = () => (
  <div className="space-y-6">
    <ReportsDashboardPageContent />
  </div>
);

export default ReportsDashboardPage;
