// ABOUTME: This component renders the dashboard for the Reports module.
// ABOUTME: It displays key statistics and quick links to various report categories.

import React from 'react';
import { DocumentReportIcon, ChartBarIcon, DocumentTextIcon, CurrencyDollarIcon, UsersIcon } from '@/components/ui/icons';
import { useAppData } from '@/hooks/useAppData';
import Spinner from '@/components/ui/Spinner';
import ModuleDashboardShell, { DashboardMetric, DashboardNotification, DashboardQuickAction } from '@/components/ModuleDashboardShell';

const ReportsDashboardPage: React.FC = () => {
  const { 
    loading, 
    students,
    staff,
    classes,
    subjects
  } = useAppData();

  const pageIsLoading = loading.all || loading.students || loading.staff || loading.classes || loading.subjects;

  if (pageIsLoading) { 
    return <div className="flex justify-center items-center h-screen"><Spinner size="lg" /></div>;
  }
  
  // Calculate some basic stats for the dashboard
  const totalStudents = students?.length || 0;
  const totalStaff = staff?.length || 0;
  const totalClasses = classes?.length || 0;
  const totalSubjects = subjects?.length || 0;

  const metrics: DashboardMetric[] = [
    { key: 'students', label: 'Total Students', value: totalStudents, icon: <UsersIcon className="h-6 w-6 text-emerald-700" /> },
    { key: 'staff', label: 'Total Staff', value: totalStaff, icon: <UsersIcon className="h-6 w-6 text-blue-700" /> },
    { key: 'classes', label: 'Total Classes', value: totalClasses, icon: <DocumentTextIcon className="h-6 w-6 text-violet-700" /> },
    { key: 'subjects', label: 'Total Subjects', value: totalSubjects, icon: <ChartBarIcon className="h-6 w-6 text-orange-700" /> },
  ];

  const quickActions: DashboardQuickAction[] = [
    { key: 'student-reports', label: 'Student Reports', to: '/reports/student-masterlist', icon: <UsersIcon className="h-5 w-5" /> },
    { key: 'exam-results', label: 'Exam Results', to: '/reports/exam-results-horizontal', icon: <ChartBarIcon className="h-5 w-5" /> },
    { key: 'financial-reports', label: 'Financial Reports', to: '/reports/student-financial-summary', icon: <CurrencyDollarIcon className="h-5 w-5" /> },
    { key: 'teacher-reports', label: 'Teacher Reports', to: '/reports/teacher-assignments', icon: <DocumentTextIcon className="h-5 w-5" /> },
    { key: 'account-ledger', label: 'Account Ledger', to: '/reports/account-ledger', icon: <DocumentReportIcon className="h-5 w-5" /> },
    { key: 'fee-collection', label: 'Fee Collection', to: '/reports/fee-collection-summary', icon: <CurrencyDollarIcon className="h-5 w-5" /> },
  ];

  const notifications: DashboardNotification[] = [
    {
      id: 'reports-health',
      title: 'Report Data Coverage',
      message: totalStudents > 0 && totalClasses > 0 ? 'Core report datasets are populated and ready.' : 'Some report datasets are empty and may reduce report depth.',
      severity: totalStudents > 0 && totalClasses > 0 ? 'normal' : 'warning',
    },
  ];

  return (
    <ModuleDashboardShell
      title="Reports Dashboard"
      subtitle="Access student, academic, staffing, and finance reports with a unified analytics entry point."
      heroIcon={<DocumentReportIcon className="h-8 w-8 text-white" />}
      metrics={metrics}
      quickActions={quickActions}
      notifications={notifications}
    />
  );
};

export default ReportsDashboardPage;
