// ABOUTME: The School & People hub: who the school is and who works in it - profile, users and roles,
// ABOUTME: workflows and the audit log - on one row of tabs, each with its own body and no tab strip inside it.

import React from 'react';
import { useTranslation } from 'react-i18next';

import { ArrowsRightLeftIcon, ClockIcon, IdentificationIcon, UsersIcon } from '@/components/ui/icons';

import { SettingsHub, type SettingsHubTab } from '../components/SettingsHub';
import { SETTINGS_HUBS, type SettingsTabId } from '../hubTabs';
import { AuditLogContent } from './AuditLogPage';
import { SettingsSchoolProfileContent } from './SettingsSchoolProfilePage';
import { SettingsUsersContent } from './SettingsUsersPage';
import { SettingsWorkflowsContent } from './SettingsWorkflowsPage';

const HUB = SETTINGS_HUBS['/settings/school'];

/** Old `?tab=` values of the School Operations hub whose page lives somewhere else now. */
const MOVED_TABS: Readonly<Record<string, string>> = {
  // The Settings dashboard used to be a tab of this hub; it is the module's overview page now.
  dashboard: '/settings',
  // Conflicts belong with the rest of sync.
  'sync-conflicts': '/settings/system?tab=sync',
  // An empty placeholder: its component no longer exists. The hub opens on its first tab.
  tabs: '/settings/school',
};

const SchoolAndPeoplePage: React.FC = () => {
  const { t } = useTranslation('settings');

  // Keyed by the shared tab list, so a tab added to or removed from it fails to compile here.
  const bodies: Record<SettingsTabId<'/settings/school'>, Omit<SettingsHubTab, 'id'>> = {
    'school-profile': {
      label: t('schoolPeople.tabs.profile', 'School Profile'),
      icon: <IdentificationIcon className="w-4 h-4" />,
      render: () => <SettingsSchoolProfileContent />,
    },
    users: {
      label: t('schoolPeople.tabs.users', 'Users & Roles'),
      icon: <UsersIcon className="w-4 h-4" />,
      render: () => <SettingsUsersContent />,
    },
    workflows: {
      label: t('schoolPeople.tabs.workflows', 'Workflows'),
      icon: <ArrowsRightLeftIcon className="w-4 h-4" />,
      render: () => <SettingsWorkflowsContent />,
    },
    audit: {
      label: t('schoolPeople.tabs.audit', 'Audit Log'),
      icon: <ClockIcon className="w-4 h-4" />,
      render: () => <AuditLogContent />,
    },
  };

  return (
    <SettingsHub
      title={t('schoolPeople.title', 'School & People')}
      info={t('schoolPeople.subtitle', 'The school profile, the people who sign in and what they may do, the approval workflows, and who changed what')}
      tabs={HUB.tabs.map((id) => ({ id, ...bodies[id] }))}
      defaultTab={HUB.defaultTab}
      movedTabs={MOVED_TABS}
      colorScheme="emerald"
    />
  );
};

export default SchoolAndPeoplePage;
