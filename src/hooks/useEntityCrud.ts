import { useCallback } from 'react';

// ABOUTME: Opinionated entity-CRUD hook — the canonical data layer for list pages.
// ABOUTME: Wraps useCrudFactory (optimistic updates, rollback, toasts) and owns
// ABOUTME: delete-confirmation through the ConfirmDialog flow instead of
// ABOUTME: window.confirm. See docs/contributing/crud.md for the page pattern.

import { useCrudFactory } from './useCrudFactory';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import type { BaseEntity, UseCrudOptions, UseCrudReturn } from '@/core/types/crud';

export interface UseEntityCrudOptions<T extends BaseEntity> extends Omit<UseCrudOptions<T>, 'confirmBeforeDelete'> {
  /** Title used in the delete-confirmation dialog. Defaults to `Delete ${entityName}`. */
  confirmTitle?: string;
  /** Body text for delete confirmation. A sensible default mentions irreversibility. */
  confirmMessage?: string;
}

export interface UseEntityCrudReturn<T extends BaseEntity> extends UseCrudReturn<T> {
  /** Confirm via ConfirmDialog, then remove. Rejects on failure (after rollback+toast). */
  confirmRemove: (id: string) => Promise<void>;
  /** Confirm via ConfirmDialog, then bulk-remove. */
  confirmRemoveMany: (ids: string[]) => Promise<void>;
}

/**
 * Entity-scoped CRUD for list pages:
 *
 *   const subjects = useEntityCrud<Subject>({ collectionName: 'subjects', entityName: 'Subject' });
 *   ...
 *   await subjects.confirmRemove(id);          // ConfirmDialog + optimistic delete + rollback
 *   await subjects.create(values);             // optimistic create + success toast
 */
export function useEntityCrud<T extends BaseEntity>(
  options: UseEntityCrudOptions<T>
): UseEntityCrudReturn<T> {
  const { entityName, confirmTitle, confirmMessage, ...crudOptions } = options;

  // The factory never prompts; this hook does it through ConfirmDialog.
  const crud = useCrudFactory<T>({ ...crudOptions, entityName, confirmBeforeDelete: false });
  const confirm = useConfirm();

  const confirmRemove = useCallback(async (id: string): Promise<void> => {
    const ok = await confirm({
      title: confirmTitle ?? `Delete ${entityName}`,
      message: confirmMessage ?? `Are you sure you want to delete this ${entityName.toLowerCase()}? This action cannot be undone.`,
      variant: 'danger',
    });
    if (!ok) return;
    await crud.remove(id);
  }, [confirm, confirmTitle, confirmMessage, entityName, crud]);

  const confirmRemoveMany = useCallback(async (ids: string[]): Promise<void> => {
    if (ids.length === 0) return;
    const ok = await confirm({
      title: confirmTitle ?? `Delete ${entityName}s`,
      message: confirmMessage ?? `Are you sure you want to delete ${ids.length} ${entityName.toLowerCase()}(s)? This action cannot be undone.`,
      variant: 'danger',
    });
    if (!ok) return;
    await crud.removeMany(ids);
  }, [confirm, confirmTitle, confirmMessage, entityName, crud]);

  return {
    ...crud,
    confirmRemove,
    confirmRemoveMany,
  };
}

export default useEntityCrud;
