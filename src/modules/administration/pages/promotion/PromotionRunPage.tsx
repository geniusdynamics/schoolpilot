// ABOUTME: The promotion run page of spec 04 section 6: compute suggestions for a year group, review
// ABOUTME: them class by class, override a suggestion with a reason, approve as the head teacher, commit
// ABOUTME: in one transaction and undo until the next year has been billed.
//
// A suggestion is never shown as a decision: a council referral and a blocked transition are marked
// as waiting for a person, and the commit refuses while any learner is still undecided.

import React, { useCallback, useMemo, useState } from 'react';

import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { CanonicalRepositoryProvider } from '@/data/canonicalRepository';
import { useAuth } from '@/contexts/AuthContext';
import { useEntityQuery, useLookup } from '@/data/query';
import { resolveCanonicalActor } from '@/data/sessionActor';
import type { Repository } from '@/data/repository';
import { asId } from '@/domain/ids';
import type { Role } from '@/data/auth';
import {
  PromotionService,
  canApprovePromotion,
  type PromotionConflict,
  type PromotionDecisionAction,
  type PromotionPlan,
  type PromotionRun,
  type PromotionRunRecord,
  type PromotionRules,
} from '@/domain/services';

import { useWritableRepository } from '../../data/useWritableRepository';
import { promotionRulesForPack } from './packPromotionRules';

/** The role gate needs the roles the actor holds; the shell supplies them (spec 02 section 11). */
export interface PromotionApprover {
  readonly actor: string;
  readonly roles: readonly Role[];
}

export interface PromotionRunPageContentProps {
  readonly repository: Repository;
  readonly rules: PromotionRules;
  readonly approver: PromotionApprover;
  readonly now?: () => Date;
}

/** The override draft the dialog edits. */
interface OverrideDraft {
  readonly learnerId: string;
  readonly learnerName: string;
  action: PromotionDecisionAction;
  reason: string;
  error: string | null;
}

/** The label of a suggestion's action, as a reviewer reads it. */
function actionLabel(action: string): string {
  switch (action) {
    case 'promote':
      return 'Promote';
    case 'repeat':
      return 'Repeat';
    case 'graduate':
      return 'Graduate';
    case 'council':
      return 'Refer to the class council';
    case 'blocked':
      return 'Blocked';
    default:
      return action;
  }
}

/** Why a suggestion cannot be committed yet, as the reviewer reads it. */
function pendingLabel(action: string): string | null {
  if (action === 'council') return 'Waiting for the class council';
  if (action === 'blocked') return 'Blocked: a required record is missing';
  return null;
}

/** The message of a thrown value, for the failure banner. */
function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * The canonical roles a signed-in login holds.
 *
 * The platform's own login carries one legacy role name (`super_admin`, `headteacher`, ...) while
 * the domain gates a promotion run on the catalogue of spec 06 section 5.2, so the name is mapped
 * onto the catalogue here. An unrecognised login role holds no canonical role, and the run then
 * refuses the approval rather than granting it.
 */
const LOGIN_ROLE_TO_CANONICAL: Readonly<Record<string, Role>> = {
  super_admin: 'administrator',
  superadmin: 'administrator',
  admin: 'administrator',
  administrator: 'administrator',
  head_teacher: 'head_teacher',
  headteacher: 'head_teacher',
  principal: 'head_teacher',
  registrar: 'registrar',
  class_teacher: 'class_teacher',
  teacher: 'teacher',
  accountant: 'accountant',
  finance_officer: 'accountant',
  bursar: 'accountant',
  nurse: 'nurse',
  auditor: 'auditor',
};

function canonicalRolesFor(loginRole: string | null | undefined): readonly Role[] {
  const key = (loginRole ?? '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  const role = LOGIN_ROLE_TO_CANONICAL[key];
  return role === undefined ? [] : [role];
}

/** The signed-in login; a page rendered outside the app shell has no session. */
function useSessionActor(): { actorId: string; username: string | null; role: string | null } {
  try {
    const auth = useAuth();
    return {
      actorId: auth.user?.id ?? '',
      username: auth.user?.username ?? null,
      role: auth.user?.role ?? null,
    };
  } catch {
    return { actorId: '', username: null, role: null };
  }
}

export const PromotionRunPageContent: React.FC<PromotionRunPageContentProps> = ({
  repository,
  rules,
  approver,
  now,
}) => {
  const years = useEntityQuery(repository, 'academic_year');
  const classGroups = useLookup(repository, 'class_group', {});

  const service = useMemo(
    () => new PromotionService({ repository, actor: approver.actor, ...(now ? { now } : {}) }),
    [repository, approver.actor, now]
  );

  const [closingYearId, setClosingYearId] = useState('');
  const [openingYearId, setOpeningYearId] = useState('');
  const [run, setRun] = useState<PromotionRun | null>(null);
  const [plan, setPlan] = useState<PromotionPlan | null>(null);
  const [record, setRecord] = useState<PromotionRunRecord | null>(null);
  const [classFilter, setClassFilter] = useState('');
  const [draft, setDraft] = useState<OverrideDraft | null>(null);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const canApprove = canApprovePromotion(approver.roles);
  const yearOptions = useMemo(
    () => [...(years.data?.items ?? [])].sort((a, b) => b.start_date.localeCompare(a.start_date)),
    [years.data]
  );

  const conflicts: readonly PromotionConflict[] = plan?.conflicts ?? [];
  const undecided = conflicts.filter((conflict) => conflict.code === 'undecided').length;
  const blocked = conflicts.filter((conflict) => conflict.code !== 'undecided').length;
  const visibleRows = useMemo(
    () => (run ? (classFilter ? run.rows.filter((row) => row.classGroupId === classFilter) : run.rows) : []),
    [run, classFilter]
  );
  const classGroupIds = useMemo(
    () => [...new Set((run?.rows ?? []).map((row) => row.classGroupId))],
    [run]
  );

  const refreshPlan = useCallback(
    async (next: PromotionRun) => {
      setPlan(await service.plan(next));
    },
    [service]
  );

  const handleCompute = async () => {
    if (!closingYearId || !openingYearId) {
      setFailure('Choose the year being closed and the year being opened.');
      return;
    }
    setBusy(true);
    setFailure(null);
    setNotice(null);
    setRecord(null);
    try {
      const computed = await service.compute({
        academicYearId: asId<'academic_year'>(closingYearId),
        nextAcademicYearId: asId<'academic_year'>(openingYearId),
        rules,
      });
      setRun(computed);
      setClassFilter('');
      await refreshPlan(computed);
    } catch (error) {
      setFailure(messageOf(error));
    } finally {
      setBusy(false);
    }
  };

  const openOverride = (learnerId: string, learnerName: string, action: PromotionDecisionAction) => {
    setDraft({ learnerId, learnerName, action, reason: '', error: null });
  };

  const saveOverride = async () => {
    if (!run || !draft) return;
    if (draft.reason.trim().length === 0) {
      setDraft({ ...draft, error: 'An override needs a reason.' });
      return;
    }
    try {
      const next = service.override(run, asId<'learner'>(draft.learnerId), {
        action: draft.action,
        reason: draft.reason,
      });
      setRun(next);
      setDraft(null);
      setNotice(`Override recorded for ${draft.learnerName}.`);
      await refreshPlan(next);
    } catch (error) {
      setDraft({ ...draft, error: messageOf(error) });
    }
  };

  const handleApprove = () => {
    if (!run) return;
    try {
      const approved = service.approve(run, approver);
      setRun(approved);
      setNotice(`Approved by ${approver.actor}.`);
      setFailure(null);
    } catch (error) {
      setFailure(messageOf(error));
    }
  };

  const handleCommit = async () => {
    if (!run) return;
    setBusy(true);
    setFailure(null);
    try {
      const committed = await service.commit(run);
      setRun(committed);
      setRecord(committed.record);
      setNotice(
        committed.record
          ? `Committed: ${committed.record.counts.promoted} promoted, ${committed.record.counts.repeated} repeated, ${committed.record.counts.graduated} graduated.`
          : 'Committed.'
      );
      await refreshPlan(committed);
    } catch (error) {
      setFailure(messageOf(error));
    } finally {
      setBusy(false);
    }
  };

  const handleUndo = async () => {
    if (!run) return;
    setBusy(true);
    setFailure(null);
    try {
      const undone = await service.undo(run);
      setRun(undone);
      setRecord(null);
      setNotice('The promotion run was undone; the previous enrolments and class lists are restored.');
    } catch (error) {
      setFailure(messageOf(error));
    } finally {
      setBusy(false);
    }
  };

  const approved = run?.approvedAt != null;
  const committed = run?.committedAt != null;

  return (
    <div className="space-y-3">
      <Card title="Promotion run">
        <div className="space-y-4">
          <p className="text-sm text-surface-muted-fg">
            Suggestions come from the pack's progression rules. Nothing is applied until a reviewer
            settles every learner, the head teacher approves, and the run is committed.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <label className="block text-sm">
              <span className="block font-medium text-surface-foreground mb-1">Year being closed</span>
              <select
                aria-label="Year being closed"
                className="w-full rounded-lg border border-surface-border px-3 py-2"
                value={closingYearId}
                onChange={(event) => setClosingYearId(event.target.value)}
              >
                <option value="">-- Select a year --</option>
                {yearOptions.map((year) => (
                  <option key={year.id} value={year.id}>
                    {year.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="block font-medium text-surface-foreground mb-1">Year being opened</span>
              <select
                aria-label="Year being opened"
                className="w-full rounded-lg border border-surface-border px-3 py-2"
                value={openingYearId}
                onChange={(event) => setOpeningYearId(event.target.value)}
              >
                <option value="">-- Select a year --</option>
                {yearOptions.map((year) => (
                  <option key={year.id} value={year.id}>
                    {year.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex items-end">
              <Button onClick={() => void handleCompute()} disabled={busy} data-testid="promotion-compute">
                {busy ? 'Computing…' : 'Compute suggestions'}
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {failure ? (
        <div role="alert" data-testid="promotion-failure" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {failure}
        </div>
      ) : null}
      {notice ? (
        <div role="status" data-testid="promotion-notice" className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {notice}
        </div>
      ) : null}

      {run ? (
        <Card title="Review per class group">
          <div className="space-y-4">
            <div className="flex flex-wrap items-end gap-4">
              <label className="block text-sm">
                <span className="block font-medium text-surface-foreground mb-1">Class group</span>
                <select
                  aria-label="Class group"
                  className="rounded-lg border border-surface-border px-3 py-2"
                  value={classFilter}
                  onChange={(event) => setClassFilter(event.target.value)}
                >
                  <option value="">All class groups</option>
                  {classGroupIds.map((id) => (
                    <option key={id} value={id}>
                      {classGroups.label(asId<'class_group'>(id), id)}
                    </option>
                  ))}
                </select>
              </label>
              <p className="text-sm text-surface-muted-fg" role="status">
                {run.rows.length} suggestion(s): {undecided} waiting for a decision, {blocked} with a
                conflict.
              </p>
            </div>

            <div className="overflow-x-auto border rounded-lg">
              <table className="min-w-full divide-y divide-surface-border text-sm">
                <thead className="bg-surface-muted">
                  <tr className="text-left text-xs font-medium text-surface-muted-fg uppercase">
                    <th className="px-3 py-2">Learner</th>
                    <th className="px-3 py-2">Class group</th>
                    <th className="px-3 py-2">Level</th>
                    <th className="px-3 py-2">Rule</th>
                    <th className="px-3 py-2">Suggestion</th>
                    <th className="px-3 py-2">Decision</th>
                    <th className="px-3 py-2">Reason</th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border">
                  {visibleRows.map((row) => {
                    const pending = pendingLabel(row.action);
                    return (
                      <tr key={row.learnerId} data-testid={`promotion-row-${row.learnerId}`}>
                        <td className="px-3 py-2">
                          {row.admissionNumber} · {row.learnerName}
                        </td>
                        <td className="px-3 py-2">{row.classGroupName}</td>
                        <td className="px-3 py-2">{row.levelCode}</td>
                        <td className="px-3 py-2">{row.suggestion.rule?.rule ?? '—'}</td>
                        <td className="px-3 py-2">
                          {actionLabel(row.suggestion.action)}
                          {row.suggestion.council?.suggested
                            ? ` (council suggests ${actionLabel(row.suggestion.council.suggested)})`
                            : ''}
                        </td>
                        <td className="px-3 py-2">
                          <span
                            data-testid={`promotion-decision-${row.learnerId}`}
                            data-overridden={row.override ? 'true' : 'false'}
                          >
                            {actionLabel(row.action)}
                          </span>
                          {row.override ? (
                            <span className="ml-2 text-xs text-amber-700">overridden</span>
                          ) : pending ? (
                            <span className="ml-2 text-xs text-amber-700">{pending}</span>
                          ) : null}
                        </td>
                        <td className="px-3 py-2 text-surface-muted-fg">{row.override?.reason ?? ''}</td>
                        <td className="px-3 py-2 text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            aria-label={`Override ${row.learnerName}`}
                            onClick={() => openOverride(row.learnerId, row.learnerName, defaultOverride(row.action))}
                            disabled={committed}
                          >
                            Override
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {conflicts.length > 0 ? (
              <div data-testid="promotion-conflicts" className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                <p className="font-medium">A human still has to decide:</p>
                <ul className="mt-1 list-disc list-inside">
                  {conflicts.map((conflict) => (
                    <li key={conflict.learnerId}>
                      {conflict.learnerName}: {conflict.detail}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </Card>
      ) : null}

      {run ? (
        <Card title="Approve and commit">
          <div className="space-y-4">
            <p className="text-sm text-surface-muted-fg">
              {approved
                ? `Approved by ${run.approvedBy}.`
                : canApprove
                  ? 'The approval belongs to the head teacher.'
                  : 'Your role cannot approve a promotion run; a head teacher or an administrator has to.'}
            </p>
            <div className="flex flex-wrap gap-3">
              <Button
                onClick={handleApprove}
                disabled={!canApprove || approved || committed || conflicts.length > 0}
                data-testid="promotion-approve"
              >
                Approve run
              </Button>
              <Button
                onClick={() => void handleCommit()}
                disabled={!approved || committed || conflicts.length > 0 || busy}
                data-testid="promotion-commit"
              >
                Commit run
              </Button>
              {committed ? (
                <Button variant="outline" onClick={() => void handleUndo()} disabled={busy} data-testid="promotion-undo">
                  Undo run
                </Button>
              ) : null}
            </div>

            {record ? (
              <div data-testid="promotion-record" className="rounded-lg bg-surface-muted px-4 py-3 text-sm">
                <p className="font-medium">
                  Committed by {record.committedBy} on {record.committedAt}
                </p>
                <p className="mt-1">
                  {record.counts.promoted} promoted · {record.counts.repeated} repeated ·{' '}
                  {record.counts.graduated} graduated · {record.counts.overridden} overridden ·{' '}
                  {record.counts.carried} balance(s) carried
                </p>
                {record.overrides.length > 0 ? (
                  <ul className="mt-2 list-disc list-inside text-surface-muted-fg">
                    {record.overrides.map((override) => (
                      <li key={override.learnerId}>
                        {override.from} → {override.action}: {override.reason} ({override.actor})
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : null}
          </div>
        </Card>
      ) : null}

      {draft ? (
        <div
          role="dialog"
          aria-label="Override suggestion"
          className="rounded-lg border border-surface-border bg-surface-card p-4 space-y-3"
        >
          <h3 className="text-base font-semibold text-surface-foreground">
            Override the suggestion for {draft.learnerName}
          </h3>
          <label className="block text-sm">
            <span className="block font-medium text-surface-foreground mb-1">Decision</span>
            <select
              aria-label="Decision"
              className="w-full rounded-lg border border-surface-border px-3 py-2"
              value={draft.action}
              onChange={(event) =>
                setDraft({ ...draft, action: event.target.value as PromotionDecisionAction })
              }
            >
              <option value="promote">Promote</option>
              <option value="repeat">Repeat</option>
              <option value="graduate">Graduate</option>
            </select>
          </label>
          <label className="block text-sm">
            <span className="block font-medium text-surface-foreground mb-1">Reason</span>
            <textarea
              aria-label="Reason"
              className="w-full rounded-lg border border-surface-border px-3 py-2"
              rows={3}
              value={draft.reason}
              onChange={(event) => setDraft({ ...draft, reason: event.target.value, error: null })}
            />
          </label>
          {draft.error ? (
            <p role="alert" className="text-sm text-red-700">
              {draft.error}
            </p>
          ) : null}
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setDraft(null)}>
              Cancel
            </Button>
            <Button onClick={() => void saveOverride()} data-testid="promotion-override-save">
              Save override
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
};

/** The action a reviewer most likely wants when the suggestion is a referral. */
function defaultOverride(action: string): PromotionDecisionAction {
  if (action === 'repeat' || action === 'blocked') return 'repeat';
  if (action === 'graduate') return 'graduate';
  return 'promote';
}

/** The page as the router mounts it: it resolves the repository, the pack rules and the roles. */
const PromotionRunPageWithRepository: React.FC<{
  readonly rules?: PromotionRules;
  readonly approver?: PromotionApprover;
  readonly now?: () => Date;
}> = ({ rules, approver, now }) => {
  const repository = useWritableRepository();
  const programmes = useEntityQuery(repository, 'programme');
  // The approval is recorded under a canonical identity: a promotion decision names its decider by
  // a canonical `user` reference, and the commit's audit trail names the same actor, so the actor
  // has to be a canonical row rather than the login's own UUIDv4 id.
  const users = useEntityQuery(repository, 'user');
  const session = useSessionActor();
  // The school runs more than one programme (the demo programme, then one per installed pack), and
  // only a pack that ships with the application has rules the page can read. The first programme
  // whose pack is bundled is the one the run is computed with; a programme whose pack is not in the
  // library is skipped rather than making the run impossible.
  const resolvedRules = useMemo(() => {
    if (rules) return rules;
    for (const programme of programmes.data?.items ?? []) {
      const code = programme.curriculum_pack_code;
      if (!code) continue;
      const candidate = promotionRulesForPack(code);
      if (candidate) return candidate;
    }
    return null;
  }, [rules, programmes.data]);

  const resolvedApprover = useMemo<PromotionApprover>(
    () =>
      approver ?? {
        actor: resolveCanonicalActor(users.data?.items ?? [], session)?.id ?? session.actorId,
        roles: canonicalRolesFor(session.role),
      },
    [approver, users.data, session]
  );

  if (!resolvedRules) {
    return (
      <div className="p-6">
        <p role="alert" className="text-sm text-surface-muted-fg">
          The promotion rules of the school's curriculum pack could not be resolved, so the run
          cannot be computed.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <PromotionRunPageContent
        repository={repository}
        rules={resolvedRules}
        approver={resolvedApprover}
        {...(now ? { now } : {})}
      />
    </div>
  );
};

const PromotionRunPage: React.FC<{
  readonly rules?: PromotionRules;
  readonly approver?: PromotionApprover;
  readonly now?: () => Date;
}> = (props) => (
  <CanonicalRepositoryProvider>
    <PromotionRunPageWithRepository {...props} />
  </CanonicalRepositoryProvider>
);

export default PromotionRunPage;
