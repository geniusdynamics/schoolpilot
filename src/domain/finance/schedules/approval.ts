// ABOUTME: The maker-checker approval of a fee-schedule version, bound to the workflow engine's
// ABOUTME: `finance.fee_schedule_approval` definition: the engine owns the states, the roles and
// ABOUTME: permissions, the reasoned rejection and the audit trail; this gateway adds the one rule
// ABOUTME: the engine's guard cannot carry — a maker may not approve their own submission.

import type { Repository } from '@/data/repository';
import type { Id } from '@/domain/ids';
import {
  FEE_SCHEDULE_APPROVAL_KEY,
  WorkflowError,
  availableMoves,
  createRepositoryWorkflowStore,
  feeScheduleApproval,
  type WorkflowActor,
  type WorkflowAvailableMove,
  type WorkflowTransitionEntry,
} from '@/domain/workflows';

import { ScheduleError } from './errors';
import type { ScheduleApprovalGateway, ScheduleApprovalRequest } from './types';

/** The key of the workflow that governs a fee schedule's approval. */
export const FEE_SCHEDULE_WORKFLOW_KEY = FEE_SCHEDULE_APPROVAL_KEY;

/** The engine transition that moves a version into `submitted`; the maker-checker rule keys off it. */
const SUBMIT_STATE = 'submitted';

/** What the gateway is built with. */
export interface WorkflowApprovalGatewayOptions {
  /** The clock a transition is stamped with. Defaults to the system clock. */
  readonly now?: () => string;
}

/**
 * Builds the approval gateway over a canonical repository.
 *
 * A version's state is the `status` column of its own `fee_schedule` row, and the transition trail
 * is the repository's own audit trail: nothing parallel is invented to hold either. The move is
 * guarded by the engine, so the roles, the permissions and the reason a rejection needs are the
 * definition's, not a second check written here.
 */
export function createWorkflowApprovalGateway(
  repository: Repository,
  options: WorkflowApprovalGatewayOptions = {}
): ScheduleApprovalGateway {
  const now = options.now ?? (() => new Date().toISOString());
  const store = createRepositoryWorkflowStore(
    repository,
    { entity: 'fee_schedule', state_field: 'status', workflow_key: FEE_SCHEDULE_APPROVAL_KEY },
    feeScheduleApproval
  );

  const requireRow = async (feeScheduleId: Id<'fee_schedule'>) => {
    const row = await repository.get('fee_schedule', feeScheduleId);
    if (!row) {
      throw new ScheduleError('not_found', `No fee schedule answers to ${feeScheduleId}.`, {
        feeScheduleId,
      });
    }
    return row;
  };

  const apply = async (
    to: string,
    request: ScheduleApprovalRequest
  ): Promise<void> => {
    await requireRow(request.feeScheduleId);
    try {
      await store.apply(feeScheduleApproval, {
        recordKey: request.feeScheduleId,
        to,
        actor: request.actor,
        reason: request.reason ?? null,
        at: now(),
      });
    } catch (error) {
      if (error instanceof WorkflowError) {
        throw new ScheduleError('approval_denied', error.message, {
          feeScheduleId: request.feeScheduleId,
          cause: error,
        });
      }
      throw error;
    }
  };

  return {
    async stateOf(feeScheduleId) {
      return (await requireRow(feeScheduleId)).status;
    },

    async available(feeScheduleId, actor: WorkflowActor): Promise<readonly WorkflowAvailableMove[]> {
      const row = await requireRow(feeScheduleId);
      const moves = availableMoves(feeScheduleApproval, { from: row.status, actor });
      // The guard cannot know who submitted; the maker-checker rule does, so the maker is not
      // offered the move they may not make.
      const maker = lastMakerOf(await store.readAudit(feeScheduleId));
      if (maker !== null && maker === actor.id) {
        return moves.filter((move) => move.transition.key !== 'approve');
      }
      return moves;
    },

    submit: (request) => apply('submitted', request),

    async approve(request) {
      const history = await store.readAudit(request.feeScheduleId);
      const maker = lastMakerOf(history);
      if (maker !== null && maker === request.actor.id) {
        throw new ScheduleError(
          'maker_cannot_approve',
          'A fee schedule is approved by someone other than the person who submitted it.',
          { feeScheduleId: request.feeScheduleId }
        );
      }
      await apply('approved', request);
    },

    reject: (request) => apply('draft', request),
    publish: (request) => apply('published', request),
    archive: (request) => apply('archived', request),

    history: (feeScheduleId) => store.readAudit(feeScheduleId),
  };
}

/** The actor of the newest submission of a record, or null when it was never submitted. */
export function lastMakerOf(history: readonly WorkflowTransitionEntry[]): string | null {
  for (let index = history.length - 1; index >= 0; index -= 1) {
    const entry = history[index];
    if (entry.to === SUBMIT_STATE) return entry.actor_id;
  }
  return null;
}
