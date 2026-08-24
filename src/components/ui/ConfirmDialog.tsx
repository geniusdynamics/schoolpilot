// ABOUTME: ConfirmDialog — accessible confirmation dialog replacing window.confirm.
// ABOUTME: Use via the useConfirm() hook which returns a promise-compatible
// ABOUTME: boolean, keeping `if (await confirm({...}))` call-sites close to the
// ABOUTME: original `if (window.confirm(...))` flow. See docs/contributing/forms.md.

import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import Modal from './Modal';
import Button from './Button';
import { useTranslation } from 'react-i18next';

export interface ConfirmOptions {
  /** Heading. Defaults to "Are you sure?". */
  title?: string;
  /** Body text describing the consequence. */
  message: string;
  /** Confirm button label. Default "Confirm" (or "Delete" for danger). */
  confirmLabel?: string;
  /** Cancel button label. Default "Cancel". */
  cancelLabel?: string;
  /** danger = red confirm button + warning icon. */
  variant?: 'default' | 'danger' | 'warning';
}

interface PendingConfirm {
  options: ConfirmOptions;
  resolve: (confirmed: boolean) => void;
}

interface ConfirmContextValue {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextValue | undefined>(undefined);

/**
 * Imperative, awaitable confirmation dialog.
 *
 * Falls back to window.confirm when no ConfirmProvider is mounted (isolated
 * component tests); the real app always renders the provider.
 *
 * @example
 * const confirm = useConfirm();
 * const handleDelete = async (id: number) => {
 *   if (await confirm({ title: 'Delete subject', message: 'This cannot be undone.', variant: 'danger' })) {
 *     await deleteSubject(id);
 *   }
 * };
 */
export const useConfirm = (): ((options: ConfirmOptions) => Promise<boolean>) => {
  const context = useContext(ConfirmContext);
  if (!context) {
    return (options: ConfirmOptions) => Promise.resolve(window.confirm(options.message));
  }
  return context.confirm;
};

export const ConfirmProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { t } = useTranslation(['common']);
  const [pending, setPending] = useState<PendingConfirm | null>(null);
  // Keep latest pending resolve reachable from stable callbacks
  const pendingRef = useRef<PendingConfirm | null>(null);
  pendingRef.current = pending;

  const settle = useCallback((confirmed: boolean) => {
    const current = pendingRef.current;
    if (current) {
      current.resolve(confirmed);
      setPending(null);
    }
  }, []);

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setPending({ options, resolve });
    });
  }, []);

  const value = useMemo(() => ({ confirm }), [confirm]);

  const isOpen = pending !== null;
  const options = pending?.options ?? ({} as ConfirmOptions);
  const isDanger = (options.variant ?? 'default') === 'danger';
  const confirmLabel =
    options.confirmLabel ??
    (isDanger ? t('common:delete', 'Delete') : t('common:confirm', 'Confirm'));
  const cancelLabel = options.cancelLabel ?? t('common:cancel', 'Cancel');

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      <Modal
        isOpen={isOpen}
        onClose={() => settle(false)}
        title={options.title ?? t('common:areYouSure', 'Are you sure?')}
        size="sm"
        preventClose={false}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => settle(false)}>
              {cancelLabel}
            </Button>
            <Button
              variant={isDanger ? 'danger' : 'primary'}
              onClick={() => settle(true)}
              autoFocus
            >
              {confirmLabel}
            </Button>
          </div>
        }
      >
        <div className="flex items-start gap-3">
          {(isDanger || options.variant === 'warning') && (
            <ExclamationTriangleIcon
              className={`h-6 w-6 flex-shrink-0 ${isDanger ? 'text-red-500' : 'text-yellow-500'}`}
              aria-hidden="true"
            />
          )}
          <p className="text-sm text-gray-600">{options.message}</p>
        </div>
      </Modal>
    </ConfirmContext.Provider>
  );
};

export default ConfirmProvider;
