// ABOUTME: The Modules tab of Settings: the modules this installation runs - running or not, what each needs and what needs it -
// ABOUTME: and the problems the dependency check finds. It changes nothing: no control here claims to turn a module on or off.

import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import Badge from '@/components/ui/Badge';
import Card from '@/components/ui/Card';
import { moduleRegistry, type ModuleRegistry } from '@/core/moduleRegistry';
import { ModuleDependencyValidator } from '@/core/services/ModuleDependencyValidator';

import { describeModules } from '../data/moduleOverview';

export interface ModulesTabProps {
  /** The registry to read: the application's own unless a test hands one in. */
  readonly registry?: Pick<ModuleRegistry, 'getAllMetadata' | 'getEnabledModules' | 'getMetadata'>;
}

/** A module's id as a label, for when its name has no translation: `finance-core` becomes `Finance core`. */
const humanise = (id: string): string => {
  const words = id.split('-').join(' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
};

interface StatProps {
  readonly testId: string;
  readonly label: string;
  readonly value: number;
  readonly alert?: boolean;
}

const Stat: React.FC<StatProps> = ({ testId, label, value, alert = false }) => (
  <div className="rounded-lg border border-surface-border bg-surface-card p-4 text-center">
    <div data-testid={testId} className={`text-3xl font-bold ${alert ? 'text-red-600' : 'text-surface-foreground'}`}>
      {value}
    </div>
    <div className="text-sm text-surface-muted-fg">{label}</div>
  </div>
);

export const ModulesTab: React.FC<ModulesTabProps> = ({ registry = moduleRegistry }) => {
  const { t } = useTranslation(['settings', 'navigation']);

  const { rows, report } = useMemo(
    () => ({
      rows: describeModules(registry),
      report: ModuleDependencyValidator.generateCompatibilityReport(registry),
    }),
    [registry]
  );

  const nameKeyOf = useMemo(() => new Map(rows.map((row) => [row.id, row.name])), [rows]);

  const labelOf = (id: string): string => {
    const registered = nameKeyOf.get(id);
    const key = registered?.includes(':') ? registered : `navigation:${id}.title`;
    const translated = t(key);
    return translated && translated !== key ? translated : humanise(id);
  };

  const running = rows.filter((row) => row.running).length;
  const issueLabels: Record<string, string> = {
    missing: t('modules.problems.missing', 'Missing'),
    version: t('modules.problems.version', 'Version'),
    circular: t('modules.problems.circular', 'Circular'),
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-surface-muted-fg">
        {t(
          'modules.intro',
          'The modules this installation runs. Turning a module on or off for a school is not available yet.'
        )}
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Stat testId="count-modules" label={t('modules.stats.modules', 'Modules')} value={rows.length} />
        <Stat testId="count-running" label={t('modules.stats.running', 'Running')} value={running} />
        <Stat
          testId="count-problems"
          label={t('modules.stats.problems', 'With problems')}
          value={report.modulesWithIssues}
          alert={report.modulesWithIssues > 0}
        />
      </div>

      {report.issues.length > 0 ? (
        <Card title={t('modules.problems.title', 'Dependency problems')}>
          <ul data-testid="dependency-problems" className="space-y-3">
            {report.issues.map((issue, index) => (
              <li
                key={`${issue.moduleId}-${issue.type}-${index}`}
                className="flex items-start justify-between gap-3 rounded-lg border border-surface-border p-3"
              >
                <div>
                  <div className="font-medium text-surface-foreground">{labelOf(issue.moduleId)}</div>
                  <p className="text-sm text-surface-muted-fg">{issue.details}</p>
                </div>
                <Badge variant={issue.type === 'missing' ? 'danger' : issue.type === 'version' ? 'warning' : 'secondary'}>
                  {issueLabels[issue.type] ?? issue.type}
                </Badge>
              </li>
            ))}
          </ul>
        </Card>
      ) : (
        <p className="text-sm text-green-700">{t('modules.problems.none', 'Every module has what it needs.')}</p>
      )}

      <Card title={t('modules.list.title', 'Modules')}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-border text-left text-surface-muted-fg">
                <th className="py-2 pe-4 font-medium">{t('modules.list.module', 'Module')}</th>
                <th className="py-2 pe-4 font-medium">{t('modules.list.version', 'Version')}</th>
                <th className="py-2 pe-4 font-medium">{t('modules.list.status', 'Status')}</th>
                <th className="py-2 pe-4 font-medium">{t('modules.list.needs', 'Needs')}</th>
                <th className="py-2 font-medium">{t('modules.list.usedBy', 'Used by')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const needs = [
                  ...row.requires.map(labelOf),
                  ...row.optional.map((id) => `${labelOf(id)} (${t('modules.list.optional', 'optional')})`),
                ];
                return (
                  <tr key={row.id} data-testid={`module-${row.id}`} className="border-b border-surface-border last:border-0">
                    <td className="py-2 pe-4">
                      <div className="font-medium text-surface-foreground">{labelOf(row.id)}</div>
                      <div className="text-xs text-surface-muted-fg">{row.id}</div>
                    </td>
                    <td className="py-2 pe-4 text-surface-muted-fg">v{row.version}</td>
                    <td className="py-2 pe-4">
                      <Badge variant={row.running ? 'success' : 'secondary'}>
                        {row.running ? t('modules.list.running', 'Running') : t('modules.list.notRunning', 'Not running')}
                      </Badge>
                    </td>
                    <td data-testid="needs" className="py-2 pe-4 text-surface-muted-fg">
                      {needs.length > 0 ? needs.join(', ') : '-'}
                    </td>
                    <td data-testid="used-by" className="py-2 text-surface-muted-fg">
                      {row.usedBy.length > 0 ? row.usedBy.map(labelOf).join(', ') : '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default ModulesTab;
