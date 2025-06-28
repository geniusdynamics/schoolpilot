
import React from 'react';
import Card from '../../components/ui/Card';
import { CogIcon, AcademicCapIcon, CalendarDaysIcon, UserGroupIcon, UsersIcon, PuzzlePieceIcon, BriefcaseIcon, BuildingOffice2Icon, ListBulletIcon, PlusIcon } from '../../components/ui/icons';
import { useAppData } from '../../contexts/AppDataContext'; // Updated
import Spinner from '../../components/ui/Spinner';
import { Link } from 'react-router-dom';
import Button from '../../components/ui/Button';
import DonutChart from '../../components/ui/DonutChart';
import { ChartData } from '../../types';


const StatCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode }> = ({ title, value, icon }) => (
  <Card className="shadow-md">
    <div className="flex items-center p-4">
      <div className="p-3 rounded-full bg-indigo-100 text-indigo-600">
        {icon}
      </div>
      <div className="ml-4">
        <p className="text-sm font-medium text-gray-500 truncate">{title}</p>
        <p className="text-2xl font-semibold text-gray-900">{value}</p>
      </div>
    </div>
  </Card>
);


const AdministrationDashboardPage: React.FC = () => {
  const { 
    loading, 
    students, 
    staff, 
    classes, 
    academicYearStructures,
    academicYears,
    schoolPeriods,
    clubs,
    customers,
    departments, // Added
    studentCategories // Added
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

  return (
    <div className="space-y-6">
      <Card title="Administration Dashboard" className="bg-white shadow-xl">
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-6">
            <StatCard title="Total Students" value={students.length} icon={<UsersIcon className="w-7 h-7"/>} />
            <StatCard title="Total Staff" value={staff.length} icon={<UserGroupIcon className="w-7 h-7"/>} />
            <StatCard title="Total Classes" value={classes.length} icon={<AcademicCapIcon className="w-7 h-7"/>} />
            <StatCard title="Total Departments" value={departments.length} icon={<BuildingOffice2Icon className="w-7 h-7"/>} />
            <StatCard title="Student Categories" value={studentCategories.length} icon={<ListBulletIcon className="w-7 h-7"/>} />
            <StatCard title="Academic Structures" value={academicYearStructures.length} icon={<PuzzlePieceIcon className="w-7 h-7"/>} />
            <StatCard title="Academic Years" value={academicYears.length} icon={<CalendarDaysIcon className="w-7 h-7"/>} />
            <StatCard title="School Periods" value={schoolPeriods.length} icon={<CalendarDaysIcon className="w-7 h-7"/>} />
          </div>

          <Card title="Quick Links" className="mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4">
                <Button as={Link} to="/administration/students" variant="outline" leftIcon={<PlusIcon className="w-5 h-5"/>}>
                    Add New Student
                </Button>
                <Button as={Link} to="/administration/staff" variant="outline" leftIcon={<BriefcaseIcon className="w-5 h-5"/>}>
                    Manage Staff
                </Button>
                <Button as={Link} to="/administration/academic-structures" variant="outline" leftIcon={<CalendarDaysIcon className="w-5 h-5"/>}>
                    Manage Academic Calendar
                </Button>
            </div>
          </Card>

          {staffByDepartmentData.length > 0 && (
            <Card title="Staff Distribution by Department" className="mb-6">
                <DonutChart data={staffByDepartmentData} title="" />
            </Card>
          )}

          <div className="text-center py-8">
            <CogIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-gray-700 mb-2">School Administration Overview</h2>
            <p className="text-gray-500 max-w-2xl mx-auto">
              Manage students, staff, classes, departments, academic calendar, and core school setup from this module. 
              Use the sidebar to navigate to specific management areas.
            </p>
            <div className="mt-6">
              <span className="inline-block bg-sky-100 text-sky-700 text-sm font-semibold px-3 py-1 rounded-full">
                Dashboard enhanced with key stats and quick links.
              </span>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default AdministrationDashboardPage;
