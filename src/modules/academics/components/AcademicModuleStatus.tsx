import React from 'react';
import { useTranslation } from 'react-i18next';
import { useAppData } from '@/hooks/useAppData';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { 
  CheckCircleIcon, 
  XCircleIcon, 
  ClockIcon,
  BookOpenIcon,
  UserGroupIcon,
  ChartBarIcon,
  AcademicCapIcon
} from '@/components/ui/icons';

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
  const { t } = useTranslation('academics');
  const { 
    subjects, 
    examSessions, 
    gradingSchemes,
    classSubjectAllocations,
    teacherSubjectAssignments,
    studentSubjectEnrollments,
    timetableEntries,
    loading 
  } = useAppData();

  const sections: ModuleSection[] = [
    {
      id: 'curriculum',
      name: 'Curriculum Management',
      description: 'Subject setup, papers, and curriculum structure',
      icon: <BookOpenIcon className="w-6 h-6" />,
      pages: [
        { name: 'Subjects', path: '/academics/subjects', implemented: true, priority: 'high' },
        { name: 'Subject Papers', path: '/academics/subject-papers', implemented: true, priority: 'high' },
        { name: 'Class Subject Allocations', path: '/academics/class-subject-allocations', implemented: true, priority: 'high' },
      ]
    },
    {
      id: 'staffing',
      name: 'Academic Staffing',
      description: 'Teacher assignments and subject allocations',
      icon: <UserGroupIcon className="w-6 h-6" />,
      pages: [
        { name: 'Teacher Subject Assignments', path: '/academics/teacher-subject-assignments', implemented: true, priority: 'high' },
        { name: 'Student Subject Enrollment', path: '/academics/student-subject-enrollment', implemented: true, priority: 'medium' },
      ]
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
      ]
    },
    {
      id: 'assessment',
      name: 'Examinations & Assessment',
      description: 'Exam management, results, and analysis',
      icon: <AcademicCapIcon className="w-6 h-6" />,
      pages: [
        { name: 'Exam Sessions', path: '/academics/exam-sessions', implemented: true, priority: 'high' },
        { name: 'Grading Schemes', path: '/academics/grading-schemes', implemented: true, priority: 'high' },
        { name: 'Student Exam Results Entry', path: '/academics/student-exam-results-entry', implemented: true, priority: 'high' },
        { name: 'Exam Analysis', path: '/academics/exam-analysis', implemented: true, priority: 'medium' },
      ]
    },
    {
      id: 'system',
      name: 'System Configuration',
      description: 'Education system setup and advanced configurations',
      icon: <ChartBarIcon className="w-6 h-6" />,
      pages: [
        { name: 'Education Systems', path: '/academics/education-systems', implemented: true, priority: 'low' },
        { name: 'Education System Config', path: '/academics/education-system-config', implemented: true, priority: 'low' },
      ]
    }
  ];

  const getStatusIcon = (implemented: boolean) => {
    return implemented ? (
      <CheckCircleIcon className="w-5 h-5 text-green-500" />
    ) : (
      <XCircleIcon className="w-5 h-5 text-red-500" />
    );
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getDataStatus = () => {
    return {
      subjects: subjects?.length || 0,
      examSessions: examSessions?.length || 0,
      gradingSchemes: gradingSchemes?.length || 0,
      classSubjectAllocations: classSubjectAllocations?.length || 0,
      teacherSubjectAssignments: teacherSubjectAssignments?.length || 0,
      studentSubjectEnrollments: studentSubjectEnrollments?.length || 0,
      timetableEntries: timetableEntries?.length || 0,
    };
  };

  const dataStatus = getDataStatus();
  const totalPages = sections.reduce((sum, section) => sum + section.pages.length, 0);
  const implementedPages = sections.reduce(
    (sum, section) => sum + section.pages.filter(page => page.implemented).length, 
    0
  );

  return (
    <div className="space-y-6">
      {/* Overall Status Card */}
      <Card title="Academic Module Implementation Status" className="bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">{implementedPages}/{totalPages}</div>
              <div className="text-sm text-gray-600">Pages Implemented</div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full" 
                  style={{ width: `${(implementedPages / totalPages) * 100}%` }}
                ></div>
              </div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">{Object.keys(dataStatus).length}</div>
              <div className="text-sm text-gray-600">Data Categories</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600">
                {Object.values(dataStatus).reduce((sum, count) => sum + count, 0)}
              </div>
              <div className="text-sm text-gray-600">Total Records</div>
            </div>
          </div>

          {/* Data Status Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {Object.entries(dataStatus).map(([key, count]) => (
              <div key={key} className="bg-white p-3 rounded-lg shadow-sm border">
                <div className="text-lg font-semibold text-gray-700">{count}</div>
                <div className="text-xs text-gray-500 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Section Status Cards */}
      {sections.map((section) => (
        <Card key={section.id} title={section.name} className="shadow-md">
          <div className="p-6">
            <div className="flex items-center mb-4">
              <div className="p-2 bg-blue-100 rounded-lg mr-3">
                {section.icon}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-800">{section.name}</h3>
                <p className="text-sm text-gray-600">{section.description}</p>
              </div>
            </div>

            <div className="space-y-2">
              {section.pages.map((page, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    {getStatusIcon(page.implemented)}
                    <span className="ml-3 font-medium text-gray-700">{page.name}</span>
                    <span className={`ml-2 px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(page.priority)}`}>
                      {page.priority}
                    </span>
                  </div>
                  <Button 
                    size="sm" 
                    variant={page.implemented ? "primary" : "secondary"}
                    onClick={() => window.location.href = page.path}
                  >
                    {page.implemented ? "Open" : "Pending"}
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

export default AcademicModuleStatus;
