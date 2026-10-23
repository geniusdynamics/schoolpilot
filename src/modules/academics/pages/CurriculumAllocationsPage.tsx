import React, { useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PageHeaderWithTabs } from '@/components/ui/PageHeaderWithTabs';
import {
  PuzzlePieceIcon,
  UsersIcon,
  UserGroupIcon,
} from '@/components/ui/icons';
import { ClassSubjectAllocationsContent } from './ClassSubjectAllocationsPage';
import { TeacherSubjectAssignmentPageContent } from './TeacherSubjectAssignmentPage';
import { StudentSubjectEnrollmentPageContent } from './StudentSubjectEnrollmentPage';

interface HubTab {
  id: string;
  label: string;
  icon: React.ReactNode;
  component: React.ReactNode;
}

const CurriculumAllocationsPage: React.FC = () => {
  const { t } = useTranslation('academics');
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const tabs: HubTab[] = [
    {
      id: 'class-allocations',
      label: t('classSubjectAllocations.title', 'Class Allocations'),
      icon: <PuzzlePieceIcon className="w-4 h-4" />,
      component: <ClassSubjectAllocationsContent />,
    },
    {
      id: 'teacher-assignments',
      label: t('teacherSubjectAssignments.title', 'Teacher Assignments'),
      icon: <UsersIcon className="w-4 h-4" />,
      component: <TeacherSubjectAssignmentPageContent />,
    },
    {
      id: 'student-enrollment',
      label: t('studentSubjectEnrollment.title', 'Student Enrollment'),
      icon: <UserGroupIcon className="w-4 h-4" />,
      component: <StudentSubjectEnrollmentPageContent />,
    },
  ];

  const activeTabFromUrl = searchParams.get('tab') || 'class-allocations';
  const [activeTab, setActiveTab] = useState(activeTabFromUrl);

  const handleTabChange = useCallback(
    (tabId: string) => {
      setActiveTab(tabId);
      if (tabId === 'class-allocations') {
        navigate('/academics/allocations', { replace: true });
      } else {
        setSearchParams({ tab: tabId }, { replace: true });
      }
    },
    [navigate, setSearchParams]
  );

  const activeTabData = tabs.find((t) => t.id === activeTab) || tabs[0];

  return (
    <div className="space-y-4">
      <PageHeaderWithTabs
        title={t('curriculumAllocations.title', 'Curriculum Allocations')}
        info={t(
          'curriculumAllocations.subtitle',
          'Manage class subject allocations, teacher assignments, and student enrollment'
        )}
        tabs={tabs.map((tab) => ({
          id: tab.id,
          label: tab.label,
          icon: tab.icon,
        }))}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        variant="compact"
        colorScheme="blue"
      >
        {activeTabData.component}
      </PageHeaderWithTabs>
    </div>
  );
};

export default CurriculumAllocationsPage;
