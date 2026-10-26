// ABOUTME: The Settings overview: what this installation is set up as - who can sign in, what runs, whether the school profile is
// ABOUTME: set, whether the browser keeps the data - from the real thing, what needs attention, and where each setting lives.

import React, { useMemo, useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import Card from '@/components/ui/Card';
import { ClockIcon, CogIcon, IdentificationIcon, ShieldCheckIcon, UsersIcon, ViewColumnsIcon } from '@/components/ui/icons';
import Spinner from '@/components/ui/Spinner';
import ModuleDashboardShell, { type DashboardMetric } from '@/components/ModuleDashboardShell';
import { moduleRegistry } from '@/core/moduleRegistry';
import { useAppData } from '@/hooks/useAppData';
import { getSQLiteStorageStatus, subscribeSQLiteStorageStatus } from '@/services/database/SQLiteWASMProvider';

import { SETTINGS_HUBS, tabAddress, type SettingsHubPath } from '../hubTabs';
import { countModules } from '../data/moduleOverview';
import { factsOf, whatNeedsAttention, type AttentionCode } from '../data/overview';

const HUB_PATHS = Object.keys(SETTINGS_HUBS) as SettingsHubPath[];
const RECENT_ACTIVITY_COUNT = 5;

interface AuditEntry {
  readonly id?: string | number;
  readonly action?: string | null;
  readonly table_name?: string | null;
  readonly changed_at?: string | null;
}

const timeOf = (entry: AuditEntry): number => {
  const time = entry.changed_at ? Date.parse(entry.changed_at) : NaN;
  return Number.isNaN(time) ? 0 : time;
};

export const SettingsDashboardContent: React.FC = () => {
  const { t } = useTranslation('settings');
  const { loading, users, schoolProfile, auditLogs } = useAppData();
  const storage = useSyncExternalStore(subscribeSQLiteStorageStatus, getSQLiteStorageStatus);
  const modules = useMemo(() => countModules(moduleRegistry), []);

  if (loading.all || loading.users) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  const facts = factsOf({ users: users ?? [], schoolProfile, modules, storage });
  const attention = whatNeedsAttention(facts);

  const metrics: DashboardMetric[] = [
    {
      key: 'users',
      label: t('overview.metrics.users', 'Users'),
      value: facts.users.active.toLocaleString(),
      description: t('overview.metrics.usersNote', 'Accounts that can sign in'),
      icon: <UsersIcon className="h-6 w-6" />,
      trend: 'neutral',
      trendValue: t('overview.metrics.usersTotal', '{{count}} accounts', { count: facts.users.total }),
      to: tabAddress('/settings/school', 'users'),
      colorScheme: 'emerald',
    },
    {
      key: 'modules',
      label: t('overview.metrics.modules', 'Modules running'),
      value: t('overview.metrics.modulesValue', '{{running}} of {{total}}', { running: facts.modules.running, total: facts.modules.total }),
      icon: <ViewColumnsIcon className="h-6 w-6" />,
      trend: facts.modules.withProblems > 0 ? 'down' : 'up',
      trendValue:
        facts.modules.withProblems > 0
          ? t('overview.metrics.modulesProblems', '{{count}} with problems', { count: facts.modules.withProblems })
          : t('overview.metrics.modulesFine', 'No problems'),
      to: '/settings/modules',
      colorScheme: 'cyan',
    },
    {
      key: 'profile',
      label: t('overview.metrics.profile', 'School profile'),
      value: facts.profileSet ? t('overview.metrics.profileSet', 'Set') : t('overview.metrics.profileNotSet', 'Not set'),
      icon: <IdentificationIcon className="h-6 w-6" />,
      to: '/settings/school',
      colorScheme: facts.profileSet ? 'violet' : 'rose',
    },
    {
      key: 'storage',
      label: t('overview.metrics.storage', 'Browser storage'),
      value:
        facts.storage === 'durable'
          ? t('overview.metrics.storageDurable', 'Durable')
          : facts.storage === 'at-risk'
            ? t('overview.metrics.storageAtRisk', 'At risk')
            : t('overview.metrics.storageChecking', 'Checking'),
      icon: <ShieldCheckIcon className="h-6 w-6" />,
      to: tabAddress('/settings/system', 'health'),
      colorScheme: facts.storage === 'at-risk' ? 'rose' : 'orange',
    },
  ];

  const attentionText: Record<AttentionCode, { title: string; message: string }> = {
    'no-administrator': {
      title: t('overview.attention.noAdministrator.title', 'No administrator can sign in'),
      message: t('overview.attention.noAdministrator.message', 'Every account that administers the school is inactive. Add or reactivate one.'),
    },
    'storage-at-risk': {
      title: t('overview.attention.storage.title', 'Browser storage is not safe'),
      message: t('overview.attention.storage.message', "The browser may lose the school's data. See System Health for why."),
    },
    'no-profile': {
      title: t('overview.attention.profile.title', 'School profile is not set'),
      message: t('overview.attention.profile.message', "Add the school's name and details."),
    },
    'module-problems': {
      title: t('overview.attention.modules.title', 'Modules with problems'),
      message: t('overview.attention.modules.message', 'Some modules are missing something they need. See Modules for which.'),
    },
  };

  const recent = [...((auditLogs ?? []) as AuditEntry[])]
    .sort((a, b) => timeOf(b) - timeOf(a))
    .slice(0, RECENT_ACTIVITY_COUNT);

  return (
    <ModuleDashboardShell
      title={t('overview.title', 'Settings')}
      subtitle={t('overview.subtitle', "What this installation is set up as, and where to change it.")}
      heroIcon={<CogIcon className="h-8 w-8 text-white" />}
      accentColor="orange"
      metrics={metrics}
    >
      <section aria-label={t('overview.attention.title', 'Needs attention')}>
        <Card title={t('overview.attention.title', 'Needs attention')}>
          {attention.length === 0 ? (
            <p className="text-sm text-green-700">{t('overview.attention.none', 'Nothing needs attention.')}</p>
          ) : (
            <ul className="space-y-2">
              {attention.map((item) => (
                <li key={item.code}>
                  <Link
                    to={item.to}
                    className={`block rounded-lg border p-3 ${
                      item.severity === 'high' ? 'border-rose-200 bg-rose-50' : 'border-amber-200 bg-amber-50'
                    }`}
                  >
                    <span className="block text-sm font-semibold text-surface-foreground">{attentionText[item.code].title}</span>
                    <span className="block text-sm text-surface-muted-fg">{attentionText[item.code].message}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>

      <section aria-label={t('overview.hubs', 'Where settings live')} className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {HUB_PATHS.map((path) => {
          const hub = SETTINGS_HUBS[path];
          return (
            <div key={path} data-testid={`hub-${path}`} className="rounded-xl border border-surface-border bg-surface-card p-4">
              <h2 className="text-base font-semibold text-surface-foreground">
                <Link to={path} className="hover:underline">
                  {t(hub.title.key, hub.title.text)}
                </Link>
              </h2>
              <p className="mt-1 text-sm text-surface-muted-fg">{t(hub.info.key, hub.info.text)}</p>
              <ul className="mt-3 flex flex-wrap gap-2">
                {hub.tabs.map((tab) => (
                  <li key={tab.id}>
                    <Link
                      to={tabAddress(path, tab.id)}
                      className="inline-block rounded-full bg-surface-accent px-3 py-1 text-xs font-medium text-surface-foreground hover:bg-primary-50"
                    >
                      {t(tab.label.key, tab.label.text)}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </section>

      <section aria-label={t('overview.recent.title', 'Recent activity')}>
        <Card title={t('overview.recent.title', 'Recent activity')}>
          {recent.length === 0 ? (
            <p className="text-sm text-surface-muted-fg">{t('overview.recent.none', 'No activity recorded yet.')}</p>
          ) : (
            <ul className="space-y-2">
              {recent.map((entry, index) => (
                <li key={entry.id ?? index} data-testid="recent-activity-entry" className="flex items-start gap-3">
                  <ClockIcon className="mt-0.5 h-4 w-4 shrink-0 text-surface-muted-fg" />
                  <div>
                    <p className="text-sm font-medium text-surface-foreground">
                      {[entry.action, entry.table_name].filter(Boolean).join(' ')}
                    </p>
                    <p className="text-xs text-surface-muted-fg">
                      {entry.changed_at ? new Date(entry.changed_at).toLocaleString() : ''}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <Link to={tabAddress('/settings/school', 'audit')} className="mt-3 inline-block text-sm font-medium text-primary-600 hover:underline">
            {t('overview.recent.all', 'See the audit log')}
          </Link>
        </Card>
      </section>
    </ModuleDashboardShell>
  );
};

const SettingsDashboardPage: React.FC = () => {
  return <SettingsDashboardContent />;
};

export default SettingsDashboardPage;
