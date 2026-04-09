// ABOUTME: This component renders the dashboard for the Academics module.
// ABOUTME: It displays key statistics and charts related to academic data.

import React from 'react';
import { useTranslation } from 'react-i18next';
import { BeakerIcon, BookOpenIcon, ShieldCheckIcon, ChartPieIcon as ExamIcon } from '@/components/ui/icons';
import { ResponsiveContainer, BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { useAppData } from '@/hooks/useAppData'; 
import Spinner from '@/components/ui/Spinner';
import { BarChartData } from '@/types'; 
import ModuleDashboardShell, { DashboardMetric, DashboardPanel, DashboardNotification } from '@/components/ModuleDashboardShell';

const AcademicsDashboardPage: React.FC = () => {
  const { t } = useTranslation('academics');
  const { 
    loading, 
    subjects = [], 
    subjectPapers = [], 
    examSessions = [], 
    gradingSchemes = [],
    departments = [] 
  } = useAppData(); 

  const pageIsLoading = loading?.all || loading?.subjects || loading?.subjectPapers || loading?.examSessions || loading?.gradingSchemes || loading?.departments;

  if (pageIsLoading) { 
    return <div className="flex justify-center items-center h-screen"><Spinner size="lg" /></div>;
  }

  const academicDepartments = departments?.filter(d => d.is_academic) || [];
  const subjectsPerDepartment: BarChartData[] = academicDepartments.map(dept => ({
    name: dept.name,
    uv: subjects.filter(sub => sub.department_id === dept.id).length, 
  })).filter(d => d.uv && d.uv > 0);


  const metrics: DashboardMetric[] = [
    { key: 'subjects', label: t('dashboard.totalSubjects'), value: subjects.length, icon: <BookOpenIcon className="h-6 w-6 text-blue-700" /> },
    { key: 'papers', label: t('dashboard.totalSubjectPapers'), value: subjectPapers.length, icon: <BookOpenIcon className="h-6 w-6 text-indigo-700" /> },
    { key: 'exam-sessions', label: t('dashboard.examSessions'), value: examSessions.length, icon: <ExamIcon className="h-6 w-6 text-purple-700" /> },
    { key: 'grading-schemes', label: t('dashboard.gradingSchemes'), value: gradingSchemes.length, icon: <ShieldCheckIcon className="h-6 w-6 text-emerald-700" /> },
  ];

  const charts: DashboardPanel[] = subjectsPerDepartment.length > 0 ? [{
    key: 'subjects-by-department',
    title: t('dashboard.subjectsPerDepartment'),
    content: (
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
    ),
  }] : [];

  const notifications: DashboardNotification[] = [
    {
      id: 'academic-departments',
      title: t('dashboard.subjectsPerDepartment'),
      message: academicDepartments.length === 0 ? 'No academic departments are available.' : `${academicDepartments.length} academic departments are active.`,
      severity: academicDepartments.length === 0 ? 'warning' : 'normal',
    },
  ];

  return (
    <ModuleDashboardShell
      title={t('dashboard.title')}
      subtitle={t('dashboard.overviewDescription')}
      heroIcon={<BeakerIcon className="h-8 w-8 text-white" />}
      metrics={metrics}
      charts={charts}
      notifications={notifications}
    />
  );
};

export default AcademicsDashboardPage;
