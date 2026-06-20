import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { PageHeaderWithTabs, Tab } from '@/components/ui/PageHeaderWithTabs';
import { UserGroupIcon, GiftIcon, CalendarDaysIcon } from '@/components/ui/icons';
import { AlumniDirectoryContent } from './AlumniDirectoryPage';

const AlumniEngagementContent: React.FC = () => {
  return (
    <div className="p-6">
      <div className="bg-white rounded-lg shadow-sm p-8 text-center">
        <GiftIcon className="w-16 h-16 text-purple-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-700 mb-2">Alumni Engagement</h3>
        <p className="text-gray-500 max-w-md mx-auto">
          Track engagement activities, donations, mentorship programs, and event participation
          for alumni. Full engagement tracking coming soon.
        </p>
      </div>
    </div>
  );
};

const AlumniEventsContent: React.FC = () => {
  return (
    <div className="p-6">
      <div className="bg-white rounded-lg shadow-sm p-8 text-center">
        <CalendarDaysIcon className="w-16 h-16 text-blue-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-700 mb-2">Alumni Events</h3>
        <p className="text-gray-500 max-w-md mx-auto">
          Plan and manage alumni reunions, fundraisers, networking events, and other activities.
          Event management features coming soon.
        </p>
      </div>
    </div>
  );
};

const tabConfig = [
  { id: 'directory', label: 'Directory', icon: <UserGroupIcon className="w-4 h-4" />, component: AlumniDirectoryContent },
  { id: 'engagement', label: 'Engagement', icon: <GiftIcon className="w-4 h-4" />, component: AlumniEngagementContent },
  { id: 'events', label: 'Events', icon: <CalendarDaysIcon className="w-4 h-4" />, component: AlumniEventsContent },
];

const AlumniManagementPage: React.FC = () => {
  const { t } = useTranslation('administration');
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'directory');

  const handleTabChange = useCallback((tabId: string) => {
    setActiveTab(tabId);
    if (tabId === 'directory') {
      setSearchParams({}, { replace: true });
    } else {
      setSearchParams({ tab: tabId }, { replace: true });
    }
  }, [setSearchParams]);

  const tabs: Tab[] = tabConfig.map(t => ({ id: t.id, label: t.label, icon: t.icon }));
  const activeComponent = tabConfig.find(t => t.id === activeTab)?.component || tabConfig[0].component;

  return (
    <div className="space-y-4">
      <PageHeaderWithTabs
        title="Alumni Management"
        subtitle="Manage alumni records, track engagement, and coordinate events"
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        variant="compact"
        colorScheme="indigo"
      />
      <div className="mt-4">
        {React.createElement(activeComponent)}
      </div>
    </div>
  );
};

export default AlumniManagementPage;

export const AlumniManagementContent = AlumniManagementPage;
