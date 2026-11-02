// ABOUTME: The blocking screen shown in place of the app when a restore could not be undone, and the
// ABOUTME: call that puts it there. It offers the safety copy for download and nothing else, because the
// ABOUTME: databases may hold the backup, the previous school, or a mix, and the app must not present that.

import React, { useState } from 'react';

import Button from '@/components/ui/Button';
import { ArrowDownTrayIcon, ExclamationTriangleIcon } from '@/components/ui/icons';
import { downloadBytes } from '@/data/backup/browserEnvironment';
import { opfsSafetyCopies } from '@/data/backup/safetyStore';
import { replaceAppWith } from '@/utils/appRoot';
import { logger } from '@/utils/logging';

/** Why the app was stopped. */
export type RestoreRecoveryReason =
  /** The restore failed and its own rollback failed too; the safety copy is the intact data. */
  | 'rollbackFailed'
  /** The app started and found an interrupted restore it could not undo. */
  | 'interruptedRestore';

export interface RestoreRecoveryRequest {
  readonly reason: RestoreRecoveryReason;
  /** The safety copy's file name in this browser's storage, when one is known. */
  readonly safetyCopy: string | null;
  readonly error: string;
}

const TITLES: Record<RestoreRecoveryReason, string> = {
  rollbackFailed: 'SchoolPilot stopped a restore it could not undo',
  interruptedRestore: 'SchoolPilot stopped a restore that did not finish',
};

export const RestoreRecoveryScreen: React.FC<RestoreRecoveryRequest> = ({ reason, safetyCopy, error }) => {
  const [failure, setFailure] = useState<string | null>(null);

  const downloadSafetyCopy = async () => {
    if (!safetyCopy) return;
    try {
      downloadBytes(safetyCopy, await opfsSafetyCopies.read(safetyCopy), 'application/zip');
    } catch (readError) {
      logger.error('The safety copy could not be read:', readError);
      setFailure(readError instanceof Error ? readError.message : String(readError));
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-muted p-6">
      <div
        role="alertdialog"
        aria-labelledby="restore-recovery-title"
        className="w-full max-w-xl rounded-2xl bg-surface-card p-8 shadow-xl ring-1 ring-black/5"
      >
        <div className="flex items-start gap-4">
          <ExclamationTriangleIcon className="h-8 w-8 flex-shrink-0 text-amber-500" />
          <div>
            <h1 id="restore-recovery-title" className="text-xl font-semibold text-surface-foreground">
              {TITLES[reason]}
            </h1>
            <p className="mt-2 text-sm text-surface-muted-fg">
              The school&apos;s data may be incomplete, so the app has not opened it. Download the
              safety copy below and keep it somewhere safe: it holds the data as it was before the
              restore started.
            </p>
          </div>
        </div>

        <p className="mt-4 rounded-lg bg-surface-muted px-3 py-2 font-mono text-xs text-surface-muted-fg">
          {error}
        </p>

        {safetyCopy ? (
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Button
              onClick={() => void downloadSafetyCopy()}
              leftIcon={<ArrowDownTrayIcon className="h-4 w-4" />}
              data-testid="recovery-download"
            >
              Download the safety copy
            </Button>
            <span className="font-mono text-xs text-surface-muted-fg">{safetyCopy}</span>
          </div>
        ) : (
          <p className="mt-6 text-sm text-amber-700">
            No safety copy is recorded. Contact whoever supports this installation before using the app.
          </p>
        )}

        {failure ? <p className="mt-3 text-sm text-red-600">{failure}</p> : null}

        <p className="mt-6 text-xs text-surface-muted-fg">
          Once the safety copy is saved, close this tab. After the installation has been checked, a
          restore can be run again from Settings → System → Backup.
        </p>
      </div>
    </div>
  );
};

/** Replace the whole app with the screen. Everything mounted is unmounted, so no page can act on the data. */
export function showRestoreRecoveryScreen(request: RestoreRecoveryRequest): void {
  replaceAppWith(<RestoreRecoveryScreen {...request} />);
}
