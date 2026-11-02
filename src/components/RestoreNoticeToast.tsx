// ABOUTME: Shows the message a restore left for the reloaded app exactly once - restored, rolled back,
// ABOUTME: or recovered on start - so a replaced school is never handed over without a word.

import React, { useEffect } from 'react';

import { takeRestoreNotice } from '@/data/backup/restoreNotice';
import { useToastHelpers } from '@/hooks/useToast';

/**
 * Reads the notice and shows it as a toast. Renders nothing itself; it sits inside the ToastProvider
 * and must be mounted once, above the routes, so a reloaded tab says what happened before the user
 * starts working in the school.
 */
export const RestoreNoticeToast: React.FC = () => {
  const toast = useToastHelpers();

  useEffect(() => {
    const notice = takeRestoreNotice();
    if (!notice) return;
    switch (notice.kind) {
      case 'restored':
        toast.showSuccess(
          notice.school
            ? `Backup restored. This browser now holds ${notice.school}.`
            : 'Backup restored. This browser now holds the school from the backup file.'
        );
        return;
      case 'rolledBack':
        toast.showError(`The restore failed and the previous data was put back. ${notice.message}`);
        return;
      case 'recovered':
        toast.showWarning(
          'An interrupted restore was undone when SchoolPilot started, and the previous data is back in place.'
        );
        return;
    }
  }, [toast]);

  return null;
};
