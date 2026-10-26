// ABOUTME: A warning for the top of the Data & System hub, shown only when the browser is not keeping the school's data
// ABOUTME: durably. The details of the storage are on the System Health tab; this says only that they need a look.

import React, { useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { ExclamationTriangleIcon } from '@/components/ui/icons';
import { getSQLiteStorageStatus, subscribeSQLiteStorageStatus } from '@/services/database/SQLiteWASMProvider';

import { judgeStorage } from '../data/overview';

/** Why the browser's storage is not safe, or null when it is (or has not been opened yet, which is a moment). */
function useStorageProblem(): string | null {
  const { t } = useTranslation('settings');
  const status = useSyncExternalStore(subscribeSQLiteStorageStatus, getSQLiteStorageStatus);

  if (judgeStorage(status) !== 'at-risk') return null;

  if (status.mode === 'memory') {
    return t(
      'dataSystem.storage.memory',
      "This browser is holding the school's data in temporary memory: it will be lost when the tab is closed."
    );
  }
  if (status.mode === 'unavailable') {
    return t('dataSystem.storage.unavailable', "This browser could not open storage for the school's data, so nothing can be saved.");
  }
  return t(
    'dataSystem.storage.notPersisted',
    "This browser has not granted persistent storage, so it may clear the school's data when space runs low."
  );
}

export const StorageWarning: React.FC = () => {
  const { t } = useTranslation('settings');
  const problem = useStorageProblem();

  if (!problem) return null;

  return (
    <div role="alert" className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
      <ExclamationTriangleIcon className="h-5 w-5 shrink-0" aria-hidden="true" />
      <p>
        {problem}{' '}
        <Link to="/settings/system?tab=health" className="font-medium underline">
          {t('dataSystem.storage.details', 'See System Health for the details.')}
        </Link>
      </p>
    </div>
  );
};

export default StorageWarning;
