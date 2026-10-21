import React, { useMemo } from 'react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Spinner from '@/components/ui/Spinner';
import {
  AcademicCapIcon,
  BookOpenIcon,
  ChartBarIcon,
  CheckCircleIcon,
  ClockIcon,
  UserGroupIcon,
  XCircleIcon,
} from '@/components/ui/icons';

import { CanonicalRepositoryProvider } from '../data/canonicalRepository';
import { useCanonicalAcademics } from '../data/useCanonicalAcademics';

interface ModuleSection {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  pages: Array<{
    name: string;
    path: string;
    implemented: boolean;
    priority: 'high' | 'medium' | 'low';
  }>;
}

const AcademicModuleStatus: React.FC = () => {
  const {
    isLoading,
    learningAreas,
    components,
    assessments,
    gradingScales,
    teachingGroups,
    teachingAssignments,
    teachingGroupMembers,
    timetableEntries,
  } = useCanonicalAcademics();

  const dataStatus = useMemo(
    () => ({
      learningAreas: learningAreas.length,
      components: components.length,
      assessments: assessments.length,
      gradingScales: gradingScales.length,
      teachingGroups: teachingGroups.length,
      teachingAssignments: teachingAssignments.length,
      teachingGroupMembers: teachingGroupMembers.length,
      timetableEntries: timetableEntries.length,
    }),
    [
      learningAreas,
      components,
      assessments,
      gradingScales,
      teachingGroups,
      teachingAssignments,
      teachingGroupMembers,
      timetableEntries,
    ]
  );

  const sections: ModuleSection[] = [
    {
      id: 'curriculum',
      name: 'Curriculum Management',
      description: 'Learning areas, their components, and teaching groups',
      icon: <BookOpenIcon className="w-6 h-6" />,
      pages: [
        { name: 'Learning areas', path: '/academics/subjects', implemented: true, priority: 'high' },
        { name: 'Assessment components', path: '/academics/subject-papers', implemented: true, priority: 'high' },
        { name: 'Teaching groups', path: '/academics/class-subject-allocations', implemented: true, priority: 'high' },
      ],
    },
    {
      id: 'staffing',
      name: 'Academic Staffing',
      description: 'Teaching assignments and group membership',
      icon: <UserGroupIcon className="w-6 h-6" />,
      pages: [
        { name: 'Teaching assignments', path: '/academics/teacher-subject-assignments', implemented: true, priority: 'high' },
        { name: 'Group membership', path: '/academics/student-subject-enrollment', implemented: true, priority: 'medium' },
      ],
    },
    {
      id: 'scheduling',
      name: 'Scheduling & Timetables',
      description: 'Timetable management and period definitions',
      icon: <ClockIcon className="w-6 h-6" />,
      pages: [
        { name: 'Timetable Periods', path: '/academics/timetable-periods', implemented: true, priority: 'high' },
        { name: 'Timetable Entries', path: '/academics/timetable-entries', implemented: true, priority: 'high' },
        { name: 'Exam Scheduling', path: '/academics/exam-scheduling', implemented: true, priority: 'medium' },
      ],
    },
    {
      id: 'assessment',
      name: 'Examinations & Assessment',
      description: 'Assessments, marks and results',
      icon: <AcademicCapIcon className="w-6 h-6" />,
      pages: [
        { name: 'Assessments', path: '/academics/exam-sessions', implemented: true, priority: 'high' },
        { name: 'Grading scales', path: '/academics/grading-schemes', implemented: true, priority: 'high' },
        { name: 'Marks entry', path: '/academics/marks-entry', implemented: true, priority: 'high' },
        { name: 'Exam Analysis', path: '/academics/exam-analysis', implemented: true, priority: 'medium' },
      ],
    },
    {
      id: 'system',
      name: 'System Configuration',
      description: 'Education system setup and advanced configurations',
      icon: <ChartBarIcon className="w-6 h-6" />,
      pages: [
        { name: 'Education Systems', path: '/academics/education-systems', implemented: true, priority: 'low' },
        { name: 'Education System Config', path: '/academics/education-system-config', implemented: true, priority: 'low' },
      ],
    },
  ];

  const getStatusIcon = (implemented: boolean) =>
    implemented ? (
      <CheckCircleIcon className="w-5 h-5 text-green-500" />
    ) : (
      <XCircleIcon className="w-5 h-5 text-red-500" />
    );

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-surface-accent text-surface-foreground';
    }
  };

  const totalPages = sections.reduce((sum, section) => sum + section.pages.length, 0);
  const implementedPages = sections.reduce(
    (sum, section) => sum + section.pages.filter((page) => page.implemented).length,
    0
  );

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card title="Academic Module Implementation Status" className="bg-gradient-to-r from-primary-50 to-indigo-50">
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-primary-600">{implementedPages}/{totalPages}</div>
              <div className="text-sm text-surface-muted-fg">Pages Implemented</div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div
                  className="bg-primary-600 h-2 rounded-full"
                  style={{ width: `${(implementedPages / totalPages) * 100}%` }}
                />
              </div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">{Object.keys(dataStatus).length}</div>
              <div className="text-sm text-surface-muted-fg">Data Categories</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600">
                {Object.values(dataStatus).reduce((sum, count) => sum + count, 0)}
              </div>
              <div className="text-sm text-surface-muted-fg">Total Records</div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {Object.entries(dataStatus).map(([key, count]) => (
              <div key={key} className="bg-surface-card p-3 rounded-lg shadow-sm border">
                <div className="text-lg font-semibold text-surface-foreground">{count}</div>
                <div className="text-xs text-surface-muted-fg capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {sections.map((section) => (
        <Card key={section.id} title={section.name} className="shadow-md">
          <div className="p-6">
            <div className="flex items-center mb-4">
              <div className="p-2 bg-primary-100 rounded-lg mr-3">{section.icon}</div>
              <div>
                <h3 className="text-lg font-semibold text-surface-foreground">{section.name}</h3>
                <p className="text-sm text-surface-muted-fg">{section.description}</p>
              </div>
            </div>

            <div className="space-y-2">
              {section.pages.map((page) => (
                <div key={page.path} className="flex items-center justify-between p-3 bg-surface-muted rounded-lg">
                  <div className="flex items-center">
                    {getStatusIcon(page.implemented)}
                    <span className="ml-3 font-medium text-surface-foreground">{page.name}</span>
                    <span className={`ml-2 px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(page.priority)}`}>
                      {page.priority}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant={page.implemented ? 'primary' : 'secondary'}
                    onClick={() => {
                      window.location.hash = `#${page.path}`;
                    }}
                  >
                    {page.implemented ? 'Open' : 'Pending'}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};

const AcademicModuleStatusPage: React.FC = () => (
  <CanonicalRepositoryProvider>
    <AcademicModuleStatus />
  </CanonicalRepositoryProvider>
);

export default AcademicModuleStatusPage;
