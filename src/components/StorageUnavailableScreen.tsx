// ABOUTME: Blocking screen shown when SQLite cannot open persistent browser storage, so no write can silently be lost.
// ABOUTME: Also exports TemporaryDataBadge, the red header badge shown while VITE_DB_ALLOW_MEMORY runs a throwaway database.

import React, { useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';
import { getSQLiteStorageStatus, subscribeSQLiteStorageStatus } from '@/services/database/SQLiteWASMProvider';

interface StorageUnavailableScreenProps {
  /** The initialisation error; defaults to the error reported by the SQLite provider. */
  error?: unknown;
  /** Called by the retry button; reloads the page by default. */
  onRetry?: () => void;
}

export const StorageUnavailableScreen: React.FC<StorageUnavailableScreenProps> = ({ error, onRetry }) => {
  const { t } = useTranslation('common');
  const detail = error instanceof Error ? error.message : error ? String(error) : getSQLiteStorageStatus().error;

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="storage-unavailable-title"
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-50 p-4"
    >
      <div className="w-full max-w-lg rounded-xl border border-red-200 bg-white p-6 shadow-lg">
        <h1 id="storage-unavailable-title" className="mb-3 text-xl font-semibold text-red-700">
          {t('storage.unavailable.title', 'This browser cannot store data offline')}
        </h1>
        <p className="mb-2 text-slate-700">
          {t('storage.unavailable.action', 'Use Chrome or Edge 109 or newer, or connect to the school server.')}
        </p>
        <p className="mb-2 text-slate-700">
          {t('storage.unavailable.otherTab', 'If SchoolPilot is already open in another tab, close that tab and try again.')}
        </p>
        <p className="mb-4 text-sm text-slate-500">
          {t('storage.unavailable.noWrites', 'Nothing can be saved until persistent storage is available.')}
        </p>
        {detail && (
          <details className="mb-4 text-sm text-slate-600">
            <summary className="cursor-pointer">{t('storage.unavailable.details', 'Technical details')}</summary>
            <code className="mt-2 block whitespace-pre-wrap break-words rounded bg-slate-100 p-2">{detail}</code>
          </details>
        )}
        <button
          type="button"
          onClick={onRetry ?? (() => window.location.reload())}
          className="rounded-md bg-red-600 px-4 py-2 font-medium text-white hover:bg-red-700"
        >
          {t('storage.unavailable.retry', 'Try again')}
        </button>
      </div>
    </div>
  );
};

/** Red badge warning that data lives only in memory and disappears on reload. */
export const TemporaryDataBadge: React.FC = () => {
  const { t } = useTranslation('common');
  const status = useSyncExternalStore(subscribeSQLiteStorageStatus, getSQLiteStorageStatus);
  if (status.mode !== 'memory') return null;

  return (
    <span
      role="status"
      title={t('storage.temporaryData.hint', 'Data is kept in memory only and is erased when the page reloads.')}
      className="inline-flex items-center rounded bg-red-600 px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-white"
    >
      {t('storage.temporaryData.label', 'TEMPORARY DATA')}
    </span>
  );
};

export default StorageUnavailableScreen;
