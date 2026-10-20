// ABOUTME: The migration progress screen: shows which migration runs, how many are done and
// ABOUTME: what to do about a failure, while the application is otherwise blocked.

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { MigrationRunner, MigrationStatus } from '@/data/migrations';

export interface MigrationScreenProps {
  /** Where the runner stands. */
  readonly status: MigrationStatus;
  /** Called by the retry button. */
  readonly onRetry?: () => void;
  /** Called with the version the database should be rolled back to. */
  readonly onRollback?: (version: number) => void;
  /** Disables the actions while a run is in flight. */
  readonly busy?: boolean;
  readonly className?: string;
}

const ROLLBACK_NONE = '';

/** The controls the focus is trapped in while the overlay is up. */
const FOCUSABLE =
  'button:not([disabled]), select:not([disabled]), input:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';

/**
 * The migration progress screen.
 *
 * The screen is a blocking overlay: the database is in the middle of a change, so the rest
 * of the application must not pretend to work. It carries the progress semantics, announces
 * the state for a screen reader, keeps the focus inside the overlay while it is up, and
 * keeps the retry and rollback actions reachable by keyboard.
 */
export const MigrationScreen: React.FC<MigrationScreenProps> = ({
  status,
  onRetry,
  onRollback,
  busy = false,
  className = '',
}) => {
  const { t } = useTranslation('common');
  const [rollbackVersion, setRollbackVersion] = useState(ROLLBACK_NONE);
  const dialogRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  const total = status.total;
  const completed = status.completed;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  // Rolling back to the highest applied version would undo nothing, so it is not offered.
  const rollbackTargets = useMemo(
    () =>
      status.applied
        .slice(0, Math.max(0, status.applied.length - 1))
        .map((entry) => entry.version)
        .sort((left, right) => right - left),
    [status.applied]
  );

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  const failed = status.phase === 'failed';
  const headline = failed
    ? t('migration.failedTitle', 'The database update failed')
    : t('migration.title', 'Updating the database');

  const announcement = (() => {
    if (failed && status.failed) {
      return t(
        'migration.failedAnnouncement',
        'Migration {{version}} ({{name}}) failed: {{error}}',
        { version: status.failed.version, name: status.failed.name, error: status.failed.error }
      );
    }
    if (status.current) {
      return t(
        'migration.current',
        'Applying migration {{version}} of {{total}}: {{name}}',
        {
          version: status.current.version,
          total,
          name: status.current.name,
        }
      );
    }
    if (status.phase === 'completed') {
      return t('migration.completed', 'The database is up to date');
    }
    return t('migration.preparing', 'Preparing the database update');
  })();

  const handleRollback = () => {
    const version = Number.parseInt(rollbackVersion, 10);
    if (!Number.isFinite(version)) return;
    onRollback?.(version);
  };

  /** Keeps the focus inside the overlay while it is up. */
  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Tab') return;
    const controls = dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE);
    if (!controls || controls.length === 0) {
      event.preventDefault();
      headingRef.current?.focus();
      return;
    }
    const first = controls[0];
    const last = controls[controls.length - 1];
    const active = document.activeElement;
    if (event.shiftKey && (active === first || active === headingRef.current)) {
      event.preventDefault();
      last.focus();
      return;
    }
    if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="migration-screen-title"
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-50 p-4"
    >
      <div
        ref={dialogRef}
        onKeyDown={handleKeyDown}
        className={`w-full max-w-lg rounded-xl border border-surface-border bg-surface-card p-6 shadow-lg ${className}`}
      >
        <h1
          id="migration-screen-title"
          ref={headingRef}
          tabIndex={-1}
          className={`mb-3 text-xl font-semibold ${failed ? 'text-red-700' : 'text-surface-foreground'}`}
        >
          {headline}
        </h1>

        <p role="status" aria-live="polite" className="mb-4 text-sm text-slate-700">
          {announcement}
        </p>

        {total > 0 && (
          <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={total}
            aria-valuenow={completed}
            aria-valuetext={t('migration.progressText', '{{completed}} of {{total}} migrations applied', {
              completed,
              total,
            })}
            aria-label={t('migration.progressLabel', 'Database migration progress')}
            className="mb-2 h-2 w-full overflow-hidden rounded-full bg-surface-muted"
          >
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                failed ? 'bg-red-600' : 'bg-primary-600'
              }`}
              style={{ width: `${percent}%` }}
            />
          </div>
        )}

        <p className="mb-4 text-xs text-surface-muted-fg">
          {t('migration.counts', '{{completed}} of {{total}} applied · {{pending}} remaining', {
            completed,
            total,
            pending: status.pending,
          })}
        </p>

        {status.interrupted.length > 0 && (
          <p className="mb-4 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
            {t(
              'migration.interrupted',
              'The previous run was interrupted at migration {{name}}. It will be run again.',
              { name: status.interrupted[0].name }
            )}
          </p>
        )}

        {failed && status.error && (
          <div role="alert" className="mb-4 rounded-md border border-red-200 bg-red-50 p-3">
            <p className="text-sm font-medium text-red-800">
              {status.failed
                ? t('migration.failedMigration', 'Migration {{name}} failed', {
                    name: status.failed.name,
                  })
                : t('migration.failed', 'The migration failed')}
            </p>
            <p className="mt-1 break-words text-sm text-red-700">{status.error}</p>
          </div>
        )}

        {status.backup && (
          <p className="mb-4 text-xs text-surface-muted-fg">
            {t('migration.backup', 'A backup was taken at {{location}}', {
              location: status.backup.location,
            })}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-3">
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              disabled={busy}
              className="rounded-md bg-primary-600 px-4 py-2 font-medium text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {t('migration.retry', 'Try again')}
            </button>
          )}

          {onRollback && rollbackTargets.length > 0 && (
            <div className="flex items-center gap-2">
              <label htmlFor="migration-rollback-target" className="text-sm text-slate-700">
                {t('migration.rollbackTo', 'Roll back to version')}
              </label>
              <select
                id="migration-rollback-target"
                value={rollbackVersion}
                disabled={busy}
                onChange={(event) => setRollbackVersion(event.target.value)}
                className="rounded-md border border-surface-border bg-surface-card px-2 py-1 text-sm"
              >
                <option value={ROLLBACK_NONE}>
                  {t('migration.rollbackChoose', 'Choose a version')}
                </option>
                {rollbackTargets.map((version) => (
                  <option key={version} value={String(version)}>
                    {version}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleRollback}
                disabled={busy || rollbackVersion === ROLLBACK_NONE}
                className="rounded-md border border-red-300 px-4 py-2 font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {t('migration.rollback', 'Roll back')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * Follows a migration runner.
 *
 * The hook reads the runner's live status and refreshes it whenever the runner reports
 * progress, so a screen bound to it re-renders as the migrations run.
 */
export function useMigrationStatus(runner: MigrationRunner): MigrationStatus {
  const [status, setStatus] = useState<MigrationStatus>(() => runner.current);

  useEffect(() => {
    let active = true;
    const refresh = () => {
      if (active) setStatus(runner.current);
    };
    const unsubscribe = runner.subscribe(refresh);
    void runner.status().then(refresh).catch(() => undefined);
    return () => {
      active = false;
      unsubscribe();
    };
  }, [runner]);

  return status;
}

export default MigrationScreen;
