// ABOUTME: This component renders the dashboard for the Reports module.
// ABOUTME: It displays key statistics and quick links to various report categories.

import React from 'react';
import Card from '@/components/ui/Card';
import { DocumentReportIcon, ChartBarIcon, DocumentTextIcon, CurrencyDollarIcon, UsersIcon, IconProps } from '@/components/ui/icons';
import { useAppData } from '@/hooks/useAppData';
import Spinner from '@/components/ui/Spinner';
import Button from '@/components/ui/Button';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const StatCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode, iconBgColor?: string, iconColor?: string }> = 
    ({ title, value, icon, iconBgColor = 'bg-blue-100', iconColor = 'text-blue-600' }) => (
  <Card className="shadow-md">
    <div className="flex items-center p-4">
      <div className={`p-3 rounded-full ${iconBgColor} ${iconColor}`}>
        {React.cloneElement(icon as React.ReactElement<IconProps>, {className: "w-7 h-7"})}
      </div>
      <div className="ml-4">
        <p className="text-sm font-medium text-gray-500 truncate">{title}</p>
        <p className="text-2xl font-semibold text-gray-900">{value}</p>
      </div>
    </div>
  </Card>
);

const ReportsDashboardPage: React.FC = () => {
  const { 
    loading, 
    students,
    staff,
    classes,
    subjects
  } = useAppData();

  const { t } = useTranslation('reports');

  const pageIsLoading = loading.all || loading.students || loading.staff || loading.classes || loading.subjects;

  if (pageIsLoading) { 
    return <div className="flex justify-center items-center h-screen"><Spinner size="lg" /></div>;
  }
  
  // Calculate some basic stats for the dashboard
  const totalStudents = students?.length || 0;
  const totalStaff = staff?.length || 0;
  const totalClasses = classes?.length || 0;
  const totalSubjects = subjects?.length || 0;

  return (
    <div className="space-y-6">
      <Card title="Reports Dashboard" className="bg-white shadow-xl">
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <StatCard title="Total Students" value={totalStudents} icon={<UsersIcon />} iconBgColor="bg-green-100" iconColor="text-green-600"/>
            <StatCard title="Total Staff" value={totalStaff} icon={<UsersIcon />} iconBgColor="bg-blue-100" iconColor="text-blue-600"/>
            <StatCard title="Total Classes" value={totalClasses} icon={<DocumentTextIcon />} iconBgColor="bg-purple-100" iconColor="text-purple-600"/>
            <StatCard title="Total Subjects" value={totalSubjects} icon={<ChartBarIcon />} iconBgColor="bg-orange-100" iconColor="text-orange-600"/>
          </div>

          <Card title="Report Categories" className="mb-6">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4">
                <Button as={Link} to="/reports/student-masterlist" variant="outline" leftIcon={<UsersIcon className="w-5 h-5"/>}>
                    Student Reports
                </Button>
                <Button as={Link} to="/reports/exam-results-horizontal" variant="outline" leftIcon={<ChartBarIcon className="w-5 h-5"/>}>
                    Exam Results
                </Button>
                <Button as={Link} to="/reports/student-financial-summary" variant="outline" leftIcon={<CurrencyDollarIcon className="w-5 h-5"/>}>
                    Financial Reports
                </Button>
                <Button as={Link} to="/reports/teacher-assignments" variant="outline" leftIcon={<DocumentTextIcon className="w-5 h-5"/>}>
                    Teacher Reports
                </Button>
                <Button as={Link} to="/reports/account-ledger" variant="outline" leftIcon={<DocumentReportIcon className="w-5 h-5"/>}>
                    Account Ledger
                </Button>
                <Button as={Link} to="/reports/fee-collection-summary" variant="outline" leftIcon={<CurrencyDollarIcon className="w-5 h-5"/>}>
                    Fee Collection
                </Button>
            </div>
          </Card>
          
          <div className="text-center py-8 mt-6">
            <DocumentReportIcon className="w-16 h-16 text-blue-500 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-gray-700 mb-2">Reports &amp; Analytics Hub</h2>
            <p className="text-gray-500 max-w-2xl mx-auto">
              Access comprehensive reports for students, staff, finances, and academic performance. 
              Generate insights and track key metrics across all school operations.
            </p>
             <div className="mt-6">
              <span className="inline-block bg-sky-100 text-sky-700 text-sm font-semibold px-3 py-1 rounded-full">
                Dashboard provides quick access to all report categories and key statistics.
              </span>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default ReportsDashboardPage;