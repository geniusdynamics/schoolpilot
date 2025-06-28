// ABOUTME: This component renders the dashboard for the Academics module.
// ABOUTME: It displays key statistics and charts related to academic data.

import React from 'react';
import { useTranslation } from 'react-i18next';
import Card from '../../components/ui/Card';
import { BeakerIcon, BookOpenIcon, ShieldCheckIcon, ChartPieIcon as ExamIcon, IconProps } from '../../components/ui/icons';
import { ResponsiveContainer, BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { useAppData } from '@/contexts/AppDataContext'; 
import Spinner from '../../components/ui/Spinner';
import { Department, BarChartData, AcademicsSubjectType as Subject } from '../../types'; 

const StatCard: React.FC<{ titleKey: string; value: string | number; icon: React.ReactNode }> = ({ titleKey, value, icon }) => {
  const { t } = useTranslation('academics'); // Use academics namespace
  return (
    <Card className="shadow-md">
      <div className="flex items-center p-4">
        <div className="p-3 rounded-full bg-purple-100 text-purple-600">
          {React.cloneElement(icon as React.ReactElement<IconProps>, {className: "w-7 h-7"})}
        </div>
        <div className="ml-4">
          <p className="text-sm font-medium text-gray-500 truncate">{t(titleKey)}</p>
          <p className="text-2xl font-semibold text-gray-900">{value}</p>
        </div>
      </div>
    </Card>
  );
};

const AcademicsDashboardPage: React.FC = () => {
  const { t } = useTranslation('academics');
  const { 
    loading, 
    subjects, 
    subjectPapers, 
    examSessions, 
    gradingSchemes,
    departments 
  } = useAppData(); 

  const pageIsLoading = loading.all || loading.subjects || loading.subjectPapers || loading.examSessions || loading.gradingSchemes || loading.departments;

  if (pageIsLoading) { 
    return <div className="flex justify-center items-center h-screen"><Spinner size="lg" /></div>;
  }

  const academicDepartments = departments.filter(d => d.is_academic);
  const subjectsPerDepartment: BarChartData[] = academicDepartments.map(dept => ({
    name: dept.name,
    uv: subjects.filter(sub => sub.department_id === dept.id).length, 
  })).filter(d => d.uv && d.uv > 0);


  return (
    <div className="space-y-6">
      <Card title={t('dashboard.title')} className="bg-white shadow-xl">
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <StatCard titleKey="dashboard.totalSubjects" value={subjects.length} icon={<BookOpenIcon />} />
            <StatCard titleKey="dashboard.totalSubjectPapers" value={subjectPapers.length} icon={<BookOpenIcon />} />
            <StatCard titleKey="dashboard.examSessions" value={examSessions.length} icon={<ExamIcon />} />
            <StatCard titleKey="dashboard.gradingSchemes" value={gradingSchemes.length} icon={<ShieldCheckIcon />} />
          </div>

          {subjectsPerDepartment.length > 0 && (
            <Card title={t('dashboard.subjectsPerDepartment')} className="mt-6">
              <ResponsiveContainer width="100%" height={300}>
                <RechartsBarChart data={subjectsPerDepartment} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-30} textAnchor="end" height={70} interval={0} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="uv" fill="#8884d8" name={t('dashboard.subjectsCountLabel')} />
                </RechartsBarChart>
              </ResponsiveContainer>
            </Card>
          )}

          <div className="text-center py-8 mt-6">
            <BeakerIcon className="w-16 h-16 text-purple-500 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-gray-700 mb-2">{t('dashboard.overviewTitle')}</h2>
            <p className="text-gray-500 max-w-2xl mx-auto">
              {t('dashboard.overviewDescription')}
            </p>
            <div className="mt-6">
              <span className="inline-block bg-sky-100 text-sky-700 text-sm font-semibold px-3 py-1 rounded-full">
                {t('dashboard.enhancementNote')}
              </span>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default AcademicsDashboardPage;
