// ABOUTME: Mark entry v2: pick a period and one of your teaching groups, then mark the whole group
// ABOUTME: across the scheme's assessment slots. Keyboard, paste, per-cell status, autosave that
// ABOUTME: survives being offline, and a submit/moderate/lock workflow that demands a reason.

import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { EntityPicker } from '@/components/ui/EntityPicker';
import Modal from '@/components/ui/Modal';
import Spinner from '@/components/ui/Spinner';
import Textarea from '@/components/ui/Textarea';
import { useLookup } from '@/data/query';
import { useCanonicalSessionActor } from '@/data/useCanonicalSessionActor';
import type { Id } from '@/domain/ids';

import { CanonicalRepositoryProvider, useWritableRepository } from '../../data/canonicalRepository';
import { MarkEntryGrid } from './MarkEntryGrid';
import { useMarkEntry } from './useMarkEntry';
import type { CellStatusCode, WorkflowState } from './types';

/** The state a transition moves to, and the label of the button that makes it. */
const FORWARD: Readonly<Record<WorkflowState, WorkflowState | null>> = {
  open: 'submitted',
  submitted: 'moderated',
  moderated: 'locked',
  locked: 'published',
  published: null,
};

const ACTION_LABEL: Readonly<Record<WorkflowState, string>> = {
  open: 'Submit marks',
  submitted: 'Moderate marks',
  moderated: 'Lock marks',
  locked: 'Publish marks',
  published: 'Published',
};

/** The counts the summary line shows, in the order a teacher cares about them. */
const SUMMARY_CODES: readonly { readonly code: CellStatusCode; readonly label: string }[] = [
  { code: 'valid', label: 'Valid' },
  { code: 'missing', label: 'Missing' },
  { code: 'out_of_range', label: 'Out of range' },
  { code: 'invalid', label: 'Not a number' },
  { code: 'incomplete_scheme', label: 'Scheme incomplete' },
  { code: 'locked', label: 'Locked' },
  { code: 'moderated', label: 'Moderated' },
];

export interface MarkEntryV2PageContentProps {
  /** Overrides the session, so a page test can act as a named teacher. */
  readonly actorId?: string;
  readonly role?: string | null;
  readonly debounceMs?: number;
  /** Whether the connection is up; injected so a page test can take the screen offline. */
  readonly isOnline?: () => boolean;
}

const MarkEntryV2Inner: React.FC<MarkEntryV2PageContentProps> = ({
  actorId: givenActorId,
  role: givenRole,
  debounceMs,
  isOnline,
}) => {
  const { t } = useTranslation('academics');
  // The teaching scope resolves a teacher's groups through the canonical `user` their staff record is
  // linked to, so the session's canonical identity is what the page acts as, not the login's own id.
  const session = useCanonicalSessionActor();
  const actorId = givenActorId ?? session.actorId;
  const role = givenRole === undefined ? session.role : givenRole;

  const repository = useWritableRepository();
  const periodLookup = useLookup(repository, 'academic_period', { label: (row) => row.name });
  const groupLookup = useLookup(repository, 'teaching_group', { label: (row) => row.name });

  const [periodId, setPeriodId] = useState<Id<'academic_period'> | null>(null);
  const [groupId, setGroupId] = useState<Id<'teaching_group'> | null>(null);
  const [reasonDialog, setReasonDialog] = useState<'override' | 'reopen' | null>(null);
  const [reasonText, setReasonText] = useState('');

  const entry = useMarkEntry({ groupId, periodId, actorId, role, debounceMs, ...(isOnline === undefined ? {} : { isOnline }) });

  // The period the calendar marks current is the one a teacher almost always wants.
  useEffect(() => {
    if (periodId !== null) return;
    const current =
      periodLookup.options.find((row) => row.status === 'current') ?? periodLookup.options[0];
    if (current) setPeriodId(current.id);
  }, [periodId, periodLookup.options]);

  useEffect(() => {
    if (groupId !== null) return;
    const first = groupLookup.options.find((row) => entry.scope.groupIds.has(row.id));
    if (first) setGroupId(first.id);
  }, [groupId, groupLookup.options, entry.scope.groupIds]);

  const chooseReason = useCallback(() => {
    const reason = reasonText.trim();
    if (reason === '') return;
    if (reasonDialog === 'override' && entry.focusedAssessmentId !== null) {
      entry.beginOverride(entry.focusedAssessmentId, reason);
    }
    if (reasonDialog === 'reopen') entry.advance('open', reason);
    setReasonDialog(null);
    setReasonText('');
  }, [reasonDialog, reasonText, entry]);

  const nextState = entry.workflowState ? FORWARD[entry.workflowState] : null;

  return (
    <div className="space-y-3">
      <Card
        title={t('marksEntry.grid.title', 'Mark entry')}
        info={t(
          'marksEntry.grid.intro',
          'Learners down, the scheme’s assessment slots across. Arrow keys, Tab and Enter move between cells; paste a range from a spreadsheet and every pasted cell is checked before it is saved.'
        )}
      >
        <div className="grid grid-cols-1 gap-4 rounded-md border bg-surface-muted p-4 md:grid-cols-2">
          <EntityPicker
            label={t('marksEntry.grid.period', 'Period')}
            value={periodId}
            onChange={setPeriodId}
            lookup={periodLookup}
            placeholder="Select a period"
            allowClear
          />
          <EntityPicker
            label={t('marksEntry.grid.group', 'Teaching group')}
            value={groupId}
            onChange={setGroupId}
            lookup={groupLookup}
            filter={(row) => entry.scope.groupIds.has(row.id)}
            placeholder="Select a teaching group"
            allowClear
            helperText={entry.scope.reason}
          />
        </div>

        {entry.isLoading ? (
          <div className="flex justify-center py-10">
            <Spinner size="lg" />
          </div>
        ) : entry.rows.length === 0 ? (
          <p className="py-6 text-center text-surface-muted-fg">
            {groupId === null
              ? entry.scope.groupIds.size === 0
                ? entry.scope.reason
                : 'Choose a teaching group to enter marks.'
              : 'This teaching group has no members on this date. Add memberships on the teaching groups screen first.'}
          </p>
        ) : (
          <div className="mt-6 space-y-4">
            {entry.workflowState !== null ? (
              <div
                className="flex flex-wrap items-center gap-3 rounded-md border border-surface-border bg-surface-card px-3 py-2 text-sm"
                data-testid="workflow-bar"
              >
                <span className="font-medium">
                  {t('marksEntry.grid.workflow', 'Workflow')}: {entry.workflowState}
                </span>

                {entry.columns.length > 1 ? (
                  <label className="flex items-center gap-2 text-xs text-surface-muted-fg">
                    Assessment
                    <select
                      className="rounded-md border border-surface-border bg-surface-card px-2 py-1 text-xs text-surface-foreground"
                      aria-label="Assessment whose workflow is shown"
                      value={entry.focusedAssessmentId ?? ''}
                      onChange={(event) => entry.setFocusedAssessmentId(event.target.value)}
                    >
                      {entry.columns
                        .filter((column) => column.assessmentId !== null)
                        .map((column) => (
                          <option key={column.key} value={column.assessmentId ?? ''}>
                            {column.label}
                          </option>
                        ))}
                    </select>
                  </label>
                ) : null}

                {entry.override !== null ? (
                  <Badge variant="info" size="sm">
                    Override in force: {entry.override.reason}
                  </Badge>
                ) : null}

                <span className="ml-auto flex flex-wrap items-center gap-2">
                  {entry.override !== null ? (
                    <Button variant="outline" size="sm" onClick={entry.endOverride}>
                      End override
                    </Button>
                  ) : null}
                  {entry.needsOverrideReason && entry.scope.canWrite && entry.override === null ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setReasonText('');
                        setReasonDialog('override');
                      }}
                    >
                      Override with a reason
                    </Button>
                  ) : null}
                  {entry.workflowState !== 'open' && entry.scope.canWrite ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setReasonText('');
                        setReasonDialog('reopen');
                      }}
                    >
                      Reopen with a reason
                    </Button>
                  ) : null}
                  {nextState !== null && entry.scope.canWrite ? (
                    <Button size="sm" onClick={() => entry.advance(nextState)}>
                      {ACTION_LABEL[entry.workflowState]}
                    </Button>
                  ) : null}
                </span>
              </div>
            ) : null}

            <div className="flex flex-wrap items-center gap-2 text-sm" aria-live="polite">
              <span className="text-surface-muted-fg">
                {entry.schemeSource === 'programme'
                  ? `Scheme: ${entry.schemeCode}`
                  : 'Scheme: derived from this period’s assessments'}
              </span>
              {SUMMARY_CODES.map((item) =>
                entry.summary[item.code] > 0 ? (
                  <Badge
                    key={item.code}
                    size="sm"
                    variant={
                      item.code === 'valid'
                        ? 'success'
                        : item.code === 'missing' ||
                            item.code === 'locked' ||
                            item.code === 'moderated'
                          ? 'warning'
                          : 'danger'
                    }
                  >
                    {item.label}: {entry.summary[item.code]}
                  </Badge>
                ) : null
              )}
              {entry.offline ? (
                <Badge variant="info" size="sm">
                  Offline: edits are kept and sent when the connection returns.
                </Badge>
              ) : null}
              {entry.pendingCount > 0 ? (
                <Badge variant="warning" size="sm">
                  {entry.pendingCount} unsaved {entry.pendingCount === 1 ? 'edit' : 'edits'}
                </Badge>
              ) : null}
              {entry.saving ? <span className="text-xs text-surface-muted-fg">Saving…</span> : null}
              <Button
                variant="outline"
                size="sm"
                className="ml-auto"
                onClick={() => void entry.flushNow()}
                disabled={entry.pendingCount === 0}
              >
                Save now
              </Button>
            </div>

            {entry.refusal !== null ? (
              <p
                role="alert"
                className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800"
              >
                {entry.refusal}
              </p>
            ) : null}
            {entry.pasteMessage !== null ? (
              <p
                role="status"
                className="rounded-md border border-surface-border bg-surface-muted p-3 text-sm"
              >
                {entry.pasteMessage}
              </p>
            ) : null}
            {entry.conflicts.map((conflict) => (
              <p
                key={conflict}
                role="status"
                className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900"
              >
                {conflict}
              </p>
            ))}

            <MarkEntryGrid
              columns={entry.columns}
              rows={entry.rows}
              page={entry.page}
              pageSize={entry.pageSize}
              onPageChange={entry.setPage}
              entryOf={entry.entryOf}
              statusOf={entry.statusOf}
              originalOf={entry.originalOf}
              editableColumns={entry.editableColumns}
              columnStates={entry.columnStates}
              canWrite={entry.scope.canWrite}
              onScore={entry.setScore}
              onStatus={entry.setStatus}
              onPaste={entry.paste}
              emptyMessage="This group has no assessment in this period."
            />
          </div>
        )}
      </Card>

      <Modal
        isOpen={reasonDialog !== null}
        onClose={() => setReasonDialog(null)}
        title={reasonDialog === 'reopen' ? 'Reopen these marks' : 'Override a locked mark'}
        subtitle="The reason is recorded with your name, the time and the value before and after."
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setReasonDialog(null)}>
              Cancel
            </Button>
            <Button onClick={chooseReason} disabled={reasonText.trim() === ''}>
              {reasonDialog === 'reopen' ? 'Reopen' : 'Override'}
            </Button>
          </div>
        }
      >
        <label
          className="block text-sm font-medium text-surface-foreground"
          htmlFor="mark-entry-reason"
        >
          Reason (required)
        </label>
        <Textarea
          id="mark-entry-reason"
          className="mt-1"
          rows={3}
          value={reasonText}
          onChange={(event) => setReasonText(event.target.value)}
          placeholder="For example: examinations office correction after remarking script 14."
        />
      </Modal>
    </div>
  );
};

export const MarkEntryV2PageContent: React.FC<MarkEntryV2PageContentProps> = (props) => (
  <CanonicalRepositoryProvider>
    <MarkEntryV2Inner {...props} />
  </CanonicalRepositoryProvider>
);

export default MarkEntryV2PageContent;
