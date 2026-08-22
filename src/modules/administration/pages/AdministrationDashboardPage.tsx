import React from 'react';
import { CogIcon, AcademicCapIcon, CalendarDaysIcon, UserGroupIcon, UsersIcon, BriefcaseIcon, BuildingOffice2Icon, ListBulletIcon, PlusIcon, ClipboardDocumentListIcon, CheckCircleIcon, ArrowRightIcon, ClockIcon } from '@/components/ui/icons';
import { useAppData } from '@/hooks/useAppData';
import Spinner from '@/components/ui/Spinner';
import DonutChart from '@/components/ui/DonutChart';
import Card from '@/components/ui/Card';
import { ChartData } from '@/types';
import ModuleDashboardShell, {
  DashboardMetric,
  DashboardNotification,
  DashboardPanel,
  DashboardQuickAction,
  DashboardAlertBanner,
} from '@/components/ModuleDashboardShell';

const AdministrationDashboardPage: React.FC = () => {
  const {
    loading,
    students = [],
    staff = [],
    classes = [],
    academicYearStructures = [],
    academicYears = [],
    schoolPeriods = [],
    departments = [],
    studentCategories = [],
    applications = [],
  } = useAppData();

  if (loading.all || loading.students || loading.staff || loading.classes || loading.departments || loading.studentCategories) {
    return <div className="flex justify-center items-center h-screen"><Spinner size="lg" /></div>;
  }

  // Chart data computations
  const staffByDepartmentData: ChartData[] = departments
    .map(dept => ({
      name: dept.name,
      value: staff.filter(s => s.department_id === dept.id).length,
    }))
    .filter(d => d.value > 0);

  const studentsByCategoryData: ChartData[] = studentCategories
    .map(cat => ({
      name: cat.name,
      value: students.filter(s => s.student_category_id === cat.id).length,
    }))
    .filter(d => d.value > 0);

  // Alert calculations
  const pendingApplications = applications.filter((a: any) => a.status === 'pending' || a.status === 'submitted').length;
  const staffWithoutDept = staff.filter(s => !s.department_id).length;
  const incompleteRecords = students.filter((s: any) => !s.admission_number || !s.date_of_birth).length;

  // Enhanced metrics with trends and navigation
  const metrics: DashboardMetric[] = [
    {
      key: 'students',
      label: 'Total Students',
      value: students.length.toLocaleString(),
      icon: <UsersIcon className="h-6 w-6" />,
      trend: 'up',
      trendValue: '+12%',
      to: '/administration/students',
      colorScheme: 'blue',
      description: 'Active enrollment',
    },
    {
      key: 'staff',
      label: 'Total Staff',
      value: staff.length.toLocaleString(),
      icon: <UserGroupIcon className="h-6 w-6" />,
      trend: 'neutral',
      trendValue: '0%',
      to: '/administration/staff',
      colorScheme: 'emerald',
      description: 'Teaching & support staff',
    },
    {
      key: 'classes',
      label: 'Total Classes',
      value: classes.length.toLocaleString(),
      icon: <AcademicCapIcon className="h-6 w-6" />,
      trend: 'up',
      trendValue: '+2',
      to: '/administration/classes',
      colorScheme: 'indigo',
      description: 'Active classes this year',
    },
    {
      key: 'departments',
      label: 'Departments',
      value: departments.length.toLocaleString(),
      icon: <BuildingOffice2Icon className="h-6 w-6" />,
      trend: 'neutral',
      trendValue: '0%',
      to: '/administration/departments',
      colorScheme: 'cyan',
      description: 'Academic & admin departments',
    },
  ];

  // Alert banners configuration
  const alertBanners: DashboardAlertBanner[] = [
    {
      type: 'approval',
      count: pendingApplications,
      label: 'Pending Admissions',
      description: 'Applications awaiting review',
      to: '/administration/applications',
    },
    {
      type: 'task',
      count: staffWithoutDept,
      label: 'Staff Without Dept',
      description: 'Staff members need department assignment',
      to: '/administration/staff',
    },
    {
      type: 'overdue',
      count: incompleteRecords,
      label: 'Incomplete Records',
      description: 'Students with missing information',
      to: '/administration/students',
    },
    {
      type: 'message',
      count: studentCategories.length,
      label: 'Categories',
      description: 'Student categories configured',
      to: '/administration/student-categories',
    },
  ];

  // Enhanced quick actions with descriptions
  const quickActions: DashboardQuickAction[] = [
    {
      key: 'add-student',
      label: 'Add New Student',
      description: 'Register a new student with full profile',
      to: '/administration/students/add',
      icon: <PlusIcon className="h-5 w-5" />,
      colorScheme: 'emerald',
    },
    {
      key: 'manage-staff',
      label: 'Manage Staff',
      description: 'View and edit staff records, assignments',
      to: '/administration/staff',
      icon: <BriefcaseIcon className="h-5 w-5" />,
      colorScheme: 'blue',
    },
    {
      key: 'academic-calendar',
      label: 'Academic Calendar',
      description: 'Manage terms, holidays, and events',
      to: '/administration/academic-structures',
      icon: <CalendarDaysIcon className="h-5 w-5" />,
      colorScheme: 'amber',
    },
    {
      key: 'departments',
      label: 'Departments',
      description: 'Configure academic departments',
      to: '/administration/departments',
      icon: <BuildingOffice2Icon className="h-5 w-5" />,
      colorScheme: 'cyan',
    },
    {
      key: 'student-categories',
      label: 'Student Categories',
      description: 'Manage admission categories',
      to: '/administration/student-categories',
      icon: <ListBulletIcon className="h-5 w-5" />,
      colorScheme: 'violet',
    },
    {
      key: 'applications',
      label: 'Applications',
      description: 'Review pending admissions',
      to: '/administration/applications',
      icon: <ClipboardDocumentListIcon className="h-5 w-5" />,
      colorScheme: 'rose',
    },
  ];

  // Enhanced charts
  const charts: DashboardPanel[] = [
    ...(staffByDepartmentData.length > 0 ? [{
      key: 'staff-by-department',
      title: 'Staff by Department',
      content: <DonutChart data={staffByDepartmentData} title="" />,
    }] : []),
    ...(studentsByCategoryData.length > 0 ? [{
      key: 'students-by-category',
      title: 'Students by Category',
      content: <DonutChart data={studentsByCategoryData} title="" />,
    }] : []),
  ];

  const notifications: DashboardNotification[] = [
    {
      id: 'departments-alert',
      title: 'Department Coverage',
      message: departments.length === 0 ? 'No departments configured yet.' : `${departments.length} departments configured.`,
      severity: departments.length === 0 ? 'high' : 'normal',
    },
    {
      id: 'student-categories-alert',
      title: 'Student Categories',
      message: studentCategories.length === 0 ? 'Student categories are missing.' : `${studentCategories.length} categories available.`,
      severity: studentCategories.length === 0 ? 'warning' : 'normal',
    },
  ];

  // Recent activity data (mock for demo - can be connected to real audit logs)
  const recentActivity = [
    { action: 'New student registered', time: '2 hours ago', type: 'student' },
    { action: 'Staff department updated', time: '4 hours ago', type: 'staff' },
    { action: 'Academic year created', time: '1 day ago', type: 'academic' },
    { action: 'Application approved', time: '2 days ago', type: 'application' },
  ];

  return (
    <ModuleDashboardShell
      title="Administration Dashboard"
      subtitle="Manage students, staff, classes, departments, and school setup from a single operational view."
      heroIcon={<CogIcon className="h-8 w-8 text-white" />}
      accentColor="emerald"
      metrics={metrics}
      alertBanners={alertBanners}
      quickActions={quickActions}
      quickNavCards={true}
      charts={charts}
      notifications={notifications}
    >
      {/* Additional Info Panels */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Academic Structure Summary */}
        <Card title="Academic Structure" className="border-slate-200 bg-white shadow-sm">
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-sm text-gray-600">Academic Years</span>
              <span className="font-semibold text-gray-900">{academicYears.length}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-sm text-gray-600">Year Structures</span>
              <span className="font-semibold text-gray-900">{academicYearStructures.length}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-sm text-gray-600">School Periods</span>
              <span className="font-semibold text-gray-900">{schoolPeriods.length}</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-gray-600">Total Classes</span>
              <span className="font-semibold text-emerald-600">{classes.length}</span>
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
                  ${activity.type === 'student' ? 'bg-blue-100 text-blue-600' :
                    activity.type === 'staff' ? 'bg-emerald-100 text-emerald-600' :
                    activity.type === 'academic' ? 'bg-amber-100 text-amber-600' :
                    'bg-violet-100 text-violet-600'}
                `}>
                  {activity.type === 'student' ? <UsersIcon className="h-4 w-4" /> :
                   activity.type === 'staff' ? <BriefcaseIcon className="h-4 w-4" /> :
                   activity.type === 'academic' ? <AcademicCapIcon className="h-4 w-4" /> :
                   <CheckCircleIcon className="h-4 w-4" />}
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

        {/* Quick Stats */}
        <Card title="Quick Overview" className="border-slate-200 bg-white shadow-sm">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-blue-50 p-3 text-center">
                <p className="text-2xl font-bold text-blue-700">{students.filter((s: any) => s.gender?.toLowerCase() === 'male').length}</p>
                <p className="text-xs text-blue-600">Male Students</p>
              </div>
              <div className="rounded-lg bg-pink-50 p-3 text-center">
                <p className="text-2xl font-bold text-pink-700">{students.filter((s: any) => s.gender?.toLowerCase() === 'female').length}</p>
                <p className="text-xs text-pink-600">Female Students</p>
              </div>
            </div>
            <div className="rounded-lg bg-emerald-50 p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-emerald-700">Staff per Student Ratio</span>
                <span className="font-bold text-emerald-700">
                  {students.length > 0 ? `1:${Math.round(students.length / Math.max(staff.length, 1))}` : 'N/A'}
                </span>
              </div>
            </div>
            <button
              onClick={() => window.location.hash = '#/administration/students'}
              className="w-full py-2 px-4 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium text-gray-700 transition-colors flex items-center justify-center gap-2"
            >
              View Full Report <ArrowRightIcon className="h-4 w-4" />
            </button>
          </div>
        </Card>
      </section>
    </ModuleDashboardShell>
  );
};

export default AdministrationDashboardPage;
