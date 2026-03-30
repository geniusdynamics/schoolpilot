import React from 'react';
import { CogIcon, AcademicCapIcon, CalendarDaysIcon, UserGroupIcon, UsersIcon, PuzzlePieceIcon, BriefcaseIcon, BuildingOffice2Icon, ListBulletIcon, PlusIcon } from '@/components/ui/icons';
import { useAppData } from '@/hooks/useAppData';
import Spinner from '@/components/ui/Spinner';
import DonutChart from '@/components/ui/DonutChart';
import { ChartData } from '@/types';
import ModuleDashboardShell, { DashboardMetric, DashboardNotification, DashboardPanel, DashboardQuickAction } from '@/components/ModuleDashboardShell';


const AdministrationDashboardPage: React.FC = () => {
  const {
    loading,
    students = [],
    staff = [],
    classes = [],
    academicYearStructures = [],
    academicYears = [],
    schoolPeriods = [],
    departments = [], // Added with default
    studentCategories = [] // Added with default
  } = useAppData();

  if (loading.all || loading.students || loading.staff || loading.classes || loading.departments || loading.studentCategories) {
    return <div className="flex justify-center items-center h-screen"><Spinner size="lg" /></div>;
  }

  const staffByDepartmentData: ChartData[] = departments
    .map(dept => ({
      name: dept.name,
      value: staff.filter(s => s.department_id === dept.id).length,
    }))
    .filter(d => d.value > 0);

  const metrics: DashboardMetric[] = [
    { key: 'students', label: 'Total Students', value: students.length, icon: <UsersIcon className="h-6 w-6 text-blue-700" /> },
    { key: 'staff', label: 'Total Staff', value: staff.length, icon: <UserGroupIcon className="h-6 w-6 text-emerald-700" /> },
    { key: 'classes', label: 'Total Classes', value: classes.length, icon: <AcademicCapIcon className="h-6 w-6 text-indigo-700" /> },
    { key: 'departments', label: 'Total Departments', value: departments.length, icon: <BuildingOffice2Icon className="h-6 w-6 text-cyan-700" /> },
    { key: 'student-categories', label: 'Student Categories', value: studentCategories.length, icon: <ListBulletIcon className="h-6 w-6 text-violet-700" /> },
    { key: 'structures', label: 'Academic Structures', value: academicYearStructures.length, icon: <PuzzlePieceIcon className="h-6 w-6 text-amber-700" /> },
    { key: 'years', label: 'Academic Years', value: academicYears.length, icon: <CalendarDaysIcon className="h-6 w-6 text-sky-700" /> },
    { key: 'periods', label: 'School Periods', value: schoolPeriods.length, icon: <CalendarDaysIcon className="h-6 w-6 text-rose-700" /> },
  ];

  const quickActions: DashboardQuickAction[] = [
    { key: 'add-student', label: 'Add New Student', to: '/administration/students', icon: <PlusIcon className="h-5 w-5" /> },
    { key: 'manage-staff', label: 'Manage Staff', to: '/administration/staff', icon: <BriefcaseIcon className="h-5 w-5" /> },
    { key: 'academic-calendar', label: 'Manage Academic Calendar', to: '/administration/academic-structures', icon: <CalendarDaysIcon className="h-5 w-5" /> },
  ];

  const charts: DashboardPanel[] = staffByDepartmentData.length > 0
    ? [{ key: 'staff-by-department', title: 'Staff Distribution by Department', content: <DonutChart data={staffByDepartmentData} title="" /> }]
    : [];

  const notifications: DashboardNotification[] = [
    {
      id: 'departments-alert',
      title: 'Department Coverage',
      message: departments.length === 0 ? 'No departments are configured yet.' : `${departments.length} departments are configured.`,
      severity: departments.length === 0 ? 'high' : 'normal',
    },
    {
      id: 'student-categories-alert',
      title: 'Student Categories',
      message: studentCategories.length === 0 ? 'Student categories are missing.' : `${studentCategories.length} categories available for admissions.`,
      severity: studentCategories.length === 0 ? 'warning' : 'normal',
    },
  ];

  return (
    <ModuleDashboardShell
      title="Administration Dashboard"
      subtitle="Manage students, staff, classes, departments, and school setup from a single operational view."
      heroIcon={<CogIcon className="h-8 w-8 text-white" />}
      metrics={metrics}
      quickActions={quickActions}
      charts={charts}
      notifications={notifications}
    />
  );
};

export default AdministrationDashboardPage;
