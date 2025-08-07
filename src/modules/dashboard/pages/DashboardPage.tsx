import React from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell } from 'recharts';
import Card from '@/components/ui/Card';
import { UsersIcon, UserGroupIcon, AcademicCapIcon, BookOpenIcon, IconProps, TicketIcon, ChartPieIcon as ExamIcon } from '@/components/ui/icons';
// import { useMockData } from '@/hooks/useMockData'; // Switch
import { useAppData } from '@/hooks/useAppData'; // Use
import { StudentStatus, PersonGender, ChartData, BarChartData } from '@/types';
import Spinner from '@/components/ui/Spinner';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';

const DashboardPage: React.FC = () => {
  const { students, staff, classes, subjects, loading } = useAppData(); // Use useAppData
  const { t } = useTranslation('dashboard');
  const { user, hasPermission } = useAuth();

  // Check if user has dashboard permission
  const [canViewDashboard, setCanViewDashboard] = React.useState(false);
  const [checkingPermission, setCheckingPermission] = React.useState(true);

  React.useEffect(() => {
    const checkPermission = async () => {
      try {
        const hasAccess = await hasPermission('dashboard.view');
        setCanViewDashboard(hasAccess);
      } catch (error) {
        console.error('Error checking dashboard permission:', error);
        setCanViewDashboard(false);
      } finally {
        setCheckingPermission(false);
      }
    };

    checkPermission();
  }, [hasPermission]);

  if (checkingPermission) {
    return (
      <div className="flex justify-center items-center h-full">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!canViewDashboard) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-16">
        <h2 className="text-2xl font-semibold text-gray-700 mb-2">{t('noDashboardPermissionTitle', 'Dashboard Access Restricted')}</h2>
        <p className="text-gray-500">{t('noDashboardPermissionMessage', 'You do not have permission to view the dashboard. Please contact your administrator if you believe this is an error.')}</p>
      </div>
    );
  }

  if (loading.students || loading.staff || loading.classes || loading.subjects || loading.all) { // Check loading.all as well
    return (
      <div className="flex justify-center items-center h-full">
        <Spinner size="lg" />
      </div>
    );
  }

  const totalStudents = (students || []).length;
  const totalStaff = (staff || []).length;
  const totalClasses = (classes || []).length;
  const totalSubjects = (subjects || []).length;
  const activeFeeStructures = 3; // Mock data
  const analyzedExams = 5; // Mock data

  const studentStatusData: ChartData[] = Object.values(StudentStatus).map(status => ({
    name: status,
    value: (students || []).filter(s => s.status === status).length,
  })).filter(d => d.value > 0);

  const genderData: ChartData[] = Object.values(PersonGender).map(gender => ({
    name: gender,
    value: (students || []).filter(s => s.gender === gender).length,
  })).filter(d => d.value > 0);
  
  const COLORS_GENDER = ['#0088FE', '#00C49F', '#FFBB28'];
  const COLORS_STATUS = ['#FF8042', '#00C49F', '#FFBB28', '#0088FE', '#AF19FF', '#FF4560'];


  const feeCollectionData: BarChartData[] = [
    { name: 'Term 1', uv: 400000, pv: 350000 },
    { name: 'Term 2', uv: 300000, pv: 280000 },
    { name: 'Term 3', uv: 200000, pv: 180000 },
  ];

  const StatCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode; bgColorClass: string, iconColorClass: string }> = 
    ({ title, value, icon, bgColorClass, iconColorClass }) => (
    <Card className="shadow-lg">
      <div className="flex items-center p-4">
        <div className={`p-3 rounded-full ${bgColorClass}`}>
          {React.cloneElement(icon as React.ReactElement<IconProps>, { className: `w-7 h-7 ${iconColorClass}` })}
        </div>
        <div className="ml-4">
          <p className="text-sm font-medium text-gray-500 truncate">{title}</p>
          <p className="text-2xl font-semibold text-gray-900">{value}</p>
        </div>
      </div>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Welcome Message */}
      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Welcome back, {user?.fullName || 'User'}!
        </h1>
        <p className="text-gray-600">
          Here's what's happening in your school today.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
        <StatCard title={t('totalStudents')} value={totalStudents} icon={<UsersIcon />} bgColorClass="bg-indigo-100" iconColorClass="text-indigo-600" />
        <StatCard title={t('totalStaff')} value={totalStaff} icon={<UserGroupIcon />} bgColorClass="bg-green-100" iconColorClass="text-green-600" />
        <StatCard title={t('totalClasses')} value={totalClasses} icon={<AcademicCapIcon />} bgColorClass="bg-yellow-100" iconColorClass="text-yellow-600" />
        <StatCard title={t('totalSubjects')} value={totalSubjects} icon={<BookOpenIcon />} bgColorClass="bg-red-100" iconColorClass="text-red-600" />
        <StatCard title={t('activeFeeStructures')} value={activeFeeStructures} icon={<TicketIcon />} bgColorClass="bg-blue-100" iconColorClass="text-blue-600" />
        <StatCard title={t('analyzedExams')} value={analyzedExams} icon={<ExamIcon />} bgColorClass="bg-purple-100" iconColorClass="text-purple-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title={t('studentGenderDistribution')}>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={genderData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label fill="#8884d8">
                {genderData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS_GENDER[index % COLORS_GENDER.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </Card>
        <Card title={t('studentStatusOverview')}>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={studentStatusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label fill="#82ca9d">
                 {studentStatusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS_STATUS[index % COLORS_STATUS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Card title={t('feeCollectionOverview')}>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={feeCollectionData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="pv" fill="#8884d8" name={t('paidAmount')} />
            <Bar dataKey="uv" fill="#82ca9d" name={t('billedAmount')} />
          </BarChart>
        </ResponsiveContainer>
      </Card>
      
    </div>
  );
};

export default DashboardPage;