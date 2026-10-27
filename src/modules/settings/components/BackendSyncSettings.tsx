// ABOUTME: Settings for a school that syncs through a backend: when and how often, how it retries, how conflicts are
// ABOUTME: decided by default, and the runs it has made. Every control writes a setting; none of them is a placeholder.

import React from 'react';

import Card from '@/components/ui/Card';
import type { SyncSettings } from '@/contexts/AppDataContext';
import { useSync } from '@/contexts/SyncContext';
import { useAppData } from '@/hooks/useAppData';

const DEFAULT_SETTINGS: SyncSettings = {
  autoSync: true,
  backgroundSync: true,
  syncInterval: 30000,
  batchSize: 10,
  maxRetries: 3,
  retryDelay: 5000,
  enableConflictResolution: true,
  conflictResolution: 'manual',
};

const SELECT_CLASS = 'text-sm border-surface-border rounded-md focus:ring-primary-500 focus:border-primary-500';
const CHECKBOX_CLASS = 'h-4 w-4 text-primary-600 border-surface-border rounded focus:ring-primary-500';

interface SettingRowProps {
  readonly id: string;
  readonly label: string;
  readonly hint?: string;
  readonly children: React.ReactNode;
}

const SettingRow: React.FC<SettingRowProps> = ({ id, label, hint, children }) => (
  <div className="flex items-center justify-between gap-4">
    <div>
      <label htmlFor={id} className="text-sm font-medium text-surface-foreground">
        {label}
      </label>
      {hint ? <p className="text-xs text-surface-muted-fg">{hint}</p> : null}
    </div>
    {children}
  </div>
);

/** The sync settings of a backend-connected school, and the history of its sync runs. */
export const BackendSyncSettings: React.FC = () => {
  const appData = useAppData();
  const { getSyncHistory } = useSync();

  const settings = appData?.getSyncSettings?.() ?? DEFAULT_SETTINGS;
  const history = getSyncHistory?.() ?? [];
  const reachable = Boolean(appData?.isOnline && appData?.backendAvailable);
  const change = (patch: Partial<SyncSettings>) => appData?.updateSyncSettings?.(patch);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${
            reachable ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}
        >
          {reachable ? 'Online' : 'Offline'}
        </span>
        {appData?.syncStatus?.state === 'syncing' ? (
          <span className="text-sm text-primary-600">Syncing...</span>
        ) : null}
      </div>

      <Card title="Sync settings">
        <div className="space-y-4">
          <SettingRow id="sync-auto" label="Auto sync" hint="Sync changes in the background as they are made">
            <input
              id="sync-auto"
              type="checkbox"
              checked={settings.autoSync}
              onChange={(event) => change({ autoSync: event.target.checked })}
              className={CHECKBOX_CLASS}
            />
          </SettingRow>

          <SettingRow id="sync-background" label="Background sync" hint="Keep syncing while the app is in the background">
            <input
              id="sync-background"
              type="checkbox"
              checked={settings.backgroundSync}
              onChange={(event) => change({ backgroundSync: event.target.checked })}
              className={CHECKBOX_CLASS}
            />
          </SettingRow>

          <SettingRow id="sync-interval" label="Sync interval">
            <select
              id="sync-interval"
              value={settings.syncInterval / 1000}
              onChange={(event) => change({ syncInterval: parseInt(event.target.value, 10) * 1000 })}
              className={SELECT_CLASS}
            >
              <option value={15}>15 seconds</option>
              <option value={30}>30 seconds</option>
              <option value={60}>1 minute</option>
              <option value={300}>5 minutes</option>
              <option value={600}>10 minutes</option>
            </select>
          </SettingRow>

          <SettingRow id="sync-batch" label="Batch size">
            <select
              id="sync-batch"
              value={settings.batchSize}
              onChange={(event) => change({ batchSize: parseInt(event.target.value, 10) })}
              className={SELECT_CLASS}
            >
              <option value={5}>5 items</option>
              <option value={10}>10 items</option>
              <option value={20}>20 items</option>
              <option value={50}>50 items</option>
            </select>
          </SettingRow>

          <SettingRow id="sync-retries" label="Max retries">
            <select
              id="sync-retries"
              value={settings.maxRetries}
              onChange={(event) => change({ maxRetries: parseInt(event.target.value, 10) })}
              className={SELECT_CLASS}
            >
              <option value={1}>1 retry</option>
              <option value={3}>3 retries</option>
              <option value={5}>5 retries</option>
              <option value={10}>10 retries</option>
            </select>
          </SettingRow>

          <SettingRow id="sync-retry-delay" label="Retry delay">
            <select
              id="sync-retry-delay"
              value={settings.retryDelay}
              onChange={(event) => change({ retryDelay: parseInt(event.target.value, 10) })}
              className={SELECT_CLASS}
            >
              <option value={1000}>1 second</option>
              <option value={5000}>5 seconds</option>
              <option value={10000}>10 seconds</option>
              <option value={30000}>30 seconds</option>
            </select>
          </SettingRow>

          <SettingRow
            id="sync-conflicts"
            label="Conflict resolution"
            hint="How a conflict is decided when nobody decides it by hand"
          >
            <select
              id="sync-conflicts"
              value={settings.conflictResolution}
              onChange={(event) => change({ conflictResolution: event.target.value as SyncSettings['conflictResolution'] })}
              className={SELECT_CLASS}
            >
              <option value="manual">Manual review</option>
              <option value="merge">Merge automatically</option>
              <option value="local-wins">Prefer local changes</option>
              <option value="remote-wins">Prefer remote changes</option>
            </select>
          </SettingRow>
        </div>
      </Card>

      <Card title="Sync history">
        {history.length === 0 ? (
          <p className="text-sm text-surface-muted-fg">No sync runs yet in this session.</p>
        ) : (
          <ul className="space-y-2">
            {history.map((entry) => (
              <li key={entry.id} className="flex items-center justify-between border rounded-lg p-3">
                <div>
                  <div className="font-medium text-surface-foreground">{entry.startedAt.toLocaleString()}</div>
                  <div className="text-sm text-surface-muted-fg">finished {entry.completedAt.toLocaleTimeString()}</div>
                </div>
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                    entry.status === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}
                >
                  {entry.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
};

export default BackendSyncSettings;
