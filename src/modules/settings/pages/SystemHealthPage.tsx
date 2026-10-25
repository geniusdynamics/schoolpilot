// ABOUTME: The System Health tab: storage persistence, last backup, sync lag per device, the pending
// ABOUTME: outbox and integration status, with the hub's diagnostic bundle for support.

import React, { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';

import { canonicalAdapter } from '@/data/canonicalRepository';
import type { HealthLevel, HealthSignal } from '@/data/health';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import {
  getSQLiteStorageStatus,
  subscribeSQLiteStorageStatus,
} from '@/services/database/SQLiteWASMProvider';

import {
  createHubHealthClient,
  fetchDiagnosticBundle,
  loadSystemHealth,
  type SystemHealthReport,
} from '../data/systemHealth';

const LEVEL_VARIANT: Record<HealthLevel, 'success' | 'warning' | 'secondary' | 'info'> = {
  ok: 'success',
  attention: 'warning',
  unavailable: 'secondary',
  unknown: 'info',
};

const LEVEL_LABEL: Record<HealthLevel, [string, string]> = {
  ok: ['systemHealth.level.ok', 'Healthy'],
  attention: ['systemHealth.level.attention', 'Needs attention'],
  unavailable: ['systemHealth.level.unavailable', 'Not configured'],
  unknown: ['systemHealth.level.unknown', 'Unknown'],
};

/** The hub the page reads: held in the page only, because the app keeps no hub credential. */
interface HubConnection {
  readonly baseUrl: string;
  readonly token: string;
}

function formatBytes(bytes: number | null): string {
  if (bytes === null) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function formatLag(seconds: number | null): string {
  if (seconds === null) return '-';
  if (seconds < 90) return `${Math.round(seconds)} s`;
  if (seconds < 5400) return `${Math.round(seconds / 60)} min`;
  return `${(seconds / 3600).toFixed(1)} h`;
}

/** One signal's heading, level badge and the sentence that says what the level means. */
const SignalCard: React.FC<{
  testId: string;
  title: string;
  signal: HealthSignal<unknown>;
  children?: React.ReactNode;
}> = ({ testId, title, signal, children }) => {
  const { t } = useTranslation('settings');
  const [labelKey, labelDefault] = LEVEL_LABEL[signal.level];

  return (
    <Card
      title={title}
      actions={<Badge variant={LEVEL_VARIANT[signal.level]}>{t(labelKey, labelDefault)}</Badge>}
    >
      <div data-testid={testId} className="space-y-2 text-sm">
        <p className="text-slate-700">{signal.detail}</p>
        {children}
      </div>
    </Card>
  );
};

const Fact: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="flex justify-between gap-4">
    <dt className="text-slate-500">{label}</dt>
    <dd className="text-right text-slate-800">{value}</dd>
  </div>
);

export const SystemHealthContent: React.FC = () => {
  const { t } = useTranslation('settings');
  const storage = useSyncExternalStore(subscribeSQLiteStorageStatus, getSQLiteStorageStatus);

  const [draft, setDraft] = useState({ baseUrl: '', token: '' });
  const [connection, setConnection] = useState<HubConnection | null>(null);
  const [report, setReport] = useState<SystemHealthReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setProblem(null);
    try {
      setReport(
        await loadSystemHealth({
          adapter: canonicalAdapter(),
          storage: { mode: storage.mode, persisted: storage.persisted },
          hub: connection ? createHubHealthClient(connection) : null,
        })
      );
    } catch (error) {
      setProblem(error instanceof Error ? error.message : String(error));
    } finally {
      setLoading(false);
    }
  }, [connection, storage.mode, storage.persisted]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const connect = (event: React.FormEvent) => {
    event.preventDefault();
    const baseUrl = draft.baseUrl.trim();
    if (baseUrl === '' || draft.token.trim() === '') return;
    setConnection({ baseUrl, token: draft.token.trim() });
  };

  const downloadBundle = async () => {
    if (!connection) return;
    setProblem(null);
    try {
      const bundle = await fetchDiagnosticBundle(connection);
      const url = URL.createObjectURL(new Blob([bundle.text], { type: 'application/json' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = bundle.filename;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      setProblem(error instanceof Error ? error.message : String(error));
    }
  };

  return (
    <div data-testid="system-health" className="space-y-4">
      <Card
        title={t('systemHealth.hub.title', 'Hub connection')}
        info={t(
          'systemHealth.hub.info',
          "The hub's backup, sync and integration signals are read over its authenticated API. The address and session are kept on this page only and are forgotten when you leave it."
        )}
        actions={
          <>
            <Button size="sm" variant="outline" onClick={() => void refresh()} disabled={loading}>
              {t('systemHealth.refresh', 'Refresh')}
            </Button>
            <Button size="sm" onClick={() => void downloadBundle()} disabled={!connection}>
              {t('systemHealth.downloadBundle', 'Diagnostic bundle')}
            </Button>
          </>
        }
      >
        {connection ? (
          <div className="flex items-center justify-between gap-4 text-sm">
            <span className="text-slate-700">{connection.baseUrl}</span>
            <Button size="sm" variant="ghost" onClick={() => setConnection(null)}>
              {t('systemHealth.disconnect', 'Disconnect')}
            </Button>
          </div>
        ) : (
          <form onSubmit={connect} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <label className="text-sm text-slate-600">
              {t('systemHealth.hub.address', 'Hub address')}
              <input
                className="mt-1 w-full rounded border border-slate-300 px-2 py-1"
                placeholder="https://hub.school.lan:3000"
                value={draft.baseUrl}
                onChange={(event) => setDraft({ ...draft, baseUrl: event.target.value })}
              />
            </label>
            <label className="text-sm text-slate-600">
              {t('systemHealth.hub.session', 'Session token')}
              <input
                type="password"
                autoComplete="off"
                className="mt-1 w-full rounded border border-slate-300 px-2 py-1"
                value={draft.token}
                onChange={(event) => setDraft({ ...draft, token: event.target.value })}
              />
            </label>
            <Button size="sm" type="submit">
              {t('systemHealth.connect', 'Connect')}
            </Button>
          </form>
        )}
      </Card>

      {problem && (
        <div role="alert" data-testid="system-health-problem" className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {problem}
        </div>
      )}

      {report && (
        <div className="grid gap-4 lg:grid-cols-2">
          <SignalCard
            testId="health-storage"
            title={t('systemHealth.storage.title', 'Storage')}
            signal={report.storage}
          >
            {report.storage.value && (
              <dl className="space-y-1">
                {report.storage.value.device && (
                  <>
                    <Fact
                      label={t('systemHealth.storage.deviceMode', 'This device')}
                      value={report.storage.value.device.mode}
                    />
                    <Fact
                      label={t('systemHealth.storage.persisted', 'Persistent storage granted')}
                      value={
                        report.storage.value.device.persisted === null
                          ? t('systemHealth.unknown', 'Unknown')
                          : report.storage.value.device.persisted
                            ? t('systemHealth.yes', 'Yes')
                            : t('systemHealth.no', 'No')
                      }
                    />
                    <Fact
                      label={t('systemHealth.storage.used', 'Quota in use')}
                      value={`${formatBytes(report.storage.value.device.usageBytes)} / ${formatBytes(report.storage.value.device.quotaBytes)}`}
                    />
                  </>
                )}
                {report.storage.value.hub && (
                  <>
                    <Fact
                      label={t('systemHealth.storage.hubFile', 'Hub database')}
                      value={report.storage.value.hub.databaseFile}
                    />
                    <Fact
                      label={t('systemHealth.storage.hubSize', 'Hub database size')}
                      value={formatBytes(report.storage.value.hub.bytes)}
                    />
                  </>
                )}
              </dl>
            )}
          </SignalCard>

          <SignalCard
            testId="health-backup"
            title={t('systemHealth.backup.title', 'Last backup')}
            signal={report.backup}
          >
            {report.backup.value && (
              <dl className="space-y-1">
                <Fact
                  label={t('systemHealth.backup.last', 'Last backup')}
                  value={report.backup.value.lastBackupAt ?? t('systemHealth.never', 'Never')}
                />
                <Fact
                  label={t('systemHealth.backup.drill', 'Restore drill')}
                  value={report.backup.value.drillReason}
                />
                <Fact
                  label={t('systemHealth.backup.count', 'Archives')}
                  value={`${report.backup.value.count} (${formatBytes(report.backup.value.totalBytes)})`}
                />
                {report.backup.value.lastFailure && (
                  <Fact
                    label={t('systemHealth.backup.failure', 'Last failure')}
                    value={`${report.backup.value.lastFailure.at}: ${report.backup.value.lastFailure.message}`}
                  />
                )}
              </dl>
            )}
          </SignalCard>

          <SignalCard
            testId="health-sync"
            title={t('systemHealth.sync.title', 'Sync lag')}
            signal={report.sync}
          >
            {report.sync.value && (
              <>
                <dl className="space-y-1">
                  <Fact
                    label={t('systemHealth.sync.head', 'Hub change log')}
                    value={report.sync.value.hubHead ?? '-'}
                  />
                  <Fact
                    label={t('systemHealth.sync.cursor', 'This device has pulled')}
                    value={report.sync.value.deviceCursor ?? '-'}
                  />
                  <Fact
                    label={t('systemHealth.sync.lag', 'Changes behind')}
                    value={report.sync.value.lagChanges ?? '-'}
                  />
                </dl>
                {report.sync.value.devices.length > 0 && (
                  <table className="mt-2 w-full text-left text-xs">
                    <thead className="text-slate-500">
                      <tr>
                        <th className="py-1 pr-2">{t('systemHealth.sync.device', 'Device')}</th>
                        <th className="py-1 pr-2">{t('systemHealth.sync.changes', 'Changes')}</th>
                        <th className="py-1">{t('systemHealth.sync.sinceLast', 'Since last push')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.sync.value.devices.map((device) => (
                        <tr key={device.deviceId} className="border-t border-slate-100">
                          <td className="py-1 pr-2">{device.deviceId}</td>
                          <td className="py-1 pr-2">{device.changes}</td>
                          <td className="py-1">{formatLag(device.lagSeconds)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </>
            )}
          </SignalCard>

          <SignalCard
            testId="health-outbox"
            title={t('systemHealth.outbox.title', 'Pending outbox')}
            signal={report.outbox}
          >
            {report.outbox.value && (
              <dl className="space-y-1">
                <Fact
                  label={t('systemHealth.outbox.pending', 'Waiting to reach the hub')}
                  value={report.outbox.value.pending ?? '-'}
                />
                <Fact
                  label={t('systemHealth.outbox.oldest', 'Oldest waiting since')}
                  value={report.outbox.value.oldestPendingAt ?? '-'}
                />
                <Fact
                  label={t('systemHealth.outbox.rejected', 'Refused by the hub')}
                  value={report.outbox.value.rejected ?? '-'}
                />
              </dl>
            )}
          </SignalCard>

          <div className="lg:col-span-2">
            <SignalCard
              testId="health-integrations"
              title={t('systemHealth.integrations.title', 'Integrations')}
              signal={report.integrations}
            >
              {report.integrations.value && report.integrations.value.length > 0 && (
                <ul className="divide-y divide-slate-100">
                  {report.integrations.value.map((integration) => (
                    <li key={integration.id} className="flex items-center justify-between gap-4 py-1">
                      <span>
                        {integration.name}
                        <span className="ml-2 text-xs text-slate-500">{integration.detail}</span>
                      </span>
                      <Badge variant={LEVEL_VARIANT[integration.level]}>
                        {t(LEVEL_LABEL[integration.level][0], LEVEL_LABEL[integration.level][1])}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </SignalCard>
          </div>
        </div>
      )}
    </div>
  );
};

export default SystemHealthContent;
