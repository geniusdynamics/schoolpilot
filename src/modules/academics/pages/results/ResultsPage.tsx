// ABOUTME: Results: each learner's grade per learning area and their aggregate, computed by the
// ABOUTME: assessment and aggregation engines, with a "Why this grade" drill-down, moderation with a
// ABOUTME: reason, and empty states that say what is missing.

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { EntityPicker } from '@/components/ui/EntityPicker';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import Spinner from '@/components/ui/Spinner';
import Textarea from '@/components/ui/Textarea';
import { useAuth } from '@/contexts/AuthContext';
import { useLookup } from '@/data/query';
import type { AggregationDefinition } from '@/domain/assessment/aggregation';
import type { GradingScaleDefinition } from '@/domain/assessment/scales';
import type { Id } from '@/domain/ids';

import { CanonicalRepositoryProvider, useWritableRepository } from '../../data/canonicalRepository';
import { MarkEntryError } from '../marks/types';
import type { WorkflowStore } from '../marks/workflow';
import { defaultAggregation, describeAggregation } from './aggregation';
import { displayNumber, displayPercent } from './format';
import { useResults } from './useResults';
import type { AreaOutcome, GradeExplanation, LearnerResultRow } from './types';

/** The login the page acts for; a page rendered outside the app shell has no session. */
function useSessionActor(): { actorId: string; role: string | null } {
  try {
    const auth = useAuth();
    return { actorId: auth.user?.id ?? '', role: auth.user?.role ?? null };
  } catch {
    return { actorId: '', role: null };
  }
}

export interface ResultsPageContentProps {
  /** Overrides the session, so a page test can act as a named teacher. */
  readonly actorId?: string;
  readonly role?: string | null;
  /** The pack's aggregation for this programme; defaults to the mean of the percentages. */
  readonly aggregation?: AggregationDefinition;
  /** The pack's grading scales, merged over the programme's stored ones by code. */
  readonly scales?: readonly GradingScaleDefinition[];
  /** Injected so a test reads the exact workflow record the page wrote. */
  readonly workflowStore?: WorkflowStore;
  /** Injected clock, so a moderation carries a time the test can name. */
  readonly now?: () => string;
}

/** One learning area's cell: a grade when it is complete, otherwise what is missing. */
const AreaCell: React.FC<{ readonly outcome: AreaOutcome | undefined }> = ({ outcome }) => {
  if (outcome === undefined) return <span className="text-surface-muted-fg">—</span>;
  if (outcome.status === 'complete' && outcome.percent !== null) {
    return (
      <>
        <span className="font-medium">{outcome.grade?.code ?? displayNumber(outcome.percent)}</span>
        <span className="mt-0.5 block text-xs text-surface-muted-fg">
          {displayPercent(outcome.percent)}
          {outcome.grade === null ? '' : ` · ${outcome.grade.label}`}
        </span>
      </>
    );
  }
  if (outcome.status === 'exempt') {
    return (
      <Badge variant="info" size="sm">
        Exempt
      </Badge>
    );
  }
  return (
    <>
      <Badge variant={outcome.status === 'unevaluable' ? 'danger' : 'warning'} size="sm">
        {outcome.status === 'unevaluable' ? 'Scheme incomplete' : 'Incomplete'}
      </Badge>
      <span className="mt-1 block text-xs text-surface-muted-fg">{outcome.reason}</span>
    </>
  );
};

/** A step-by-step explanation, grouped by the trace's own steps. */
const Explanation: React.FC<{ readonly explanation: GradeExplanation; readonly reason: string | null }> = ({
  explanation,
  reason,
}) => (
  <div className="space-y-5">
    <p className="text-base font-medium text-surface-foreground" data-testid="why-headline">
      {explanation.headline}
    </p>
    {reason === null ? null : (
      <p className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">{reason}</p>
    )}
    {explanation.steps.map((step, index) => (
      <section
        key={`${step.kind}-${index}`}
        aria-label={step.title}
        data-testid={`why-step-${index}`}
        data-step-kind={step.kind}
        className="rounded-md border border-surface-border bg-surface-muted p-3"
      >
        <h4 className="text-sm font-semibold text-surface-foreground">{step.title}</h4>
        {step.summary === null ? null : (
          <p className="mt-1 text-sm text-surface-muted-fg">{step.summary}</p>
        )}
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-surface-foreground">
          {step.lines.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        {step.table === null ? null : (
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-xs">
              <caption className="pb-1 text-left text-surface-muted-fg">{step.table.caption}</caption>
              <thead>
                <tr>
                  {step.table.headers.map((header) => (
                    <th key={header} scope="col" className="px-2 py-1 text-left font-semibold">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {step.table.rows.map((row) => (
                  <tr key={row.join('|')} className="border-t border-surface-border">
                    {row.map((cell, cellIndex) => (
                      <td key={`${cellIndex}-${cell}`} className="px-2 py-1">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    ))}
  </div>
);

const ResultsInner: React.FC<ResultsPageContentProps> = ({
  actorId: givenActorId,
  role: givenRole,
  aggregation: givenAggregation,
  scales: givenScales,
  workflowStore,
  now,
}) => {
  const { t } = useTranslation('academics');
  const session = useSessionActor();
  const actorId = givenActorId ?? session.actorId;
  const role = givenRole === undefined ? session.role : givenRole;

  const repository = useWritableRepository();
  const periodLookup = useLookup(repository, 'academic_period', { label: (row) => row.name });
  const classLookup = useLookup(repository, 'class_group', {
    label: (row) => row.name,
  });

  const [periodId, setPeriodId] = useState<Id<'academic_period'> | null>(null);
  const [classGroupId, setClassGroupId] = useState<Id<'class_group'> | null>(null);

  const aggregation = useMemo(() => givenAggregation ?? defaultAggregation(), [givenAggregation]);
  const results = useResults({
    actorId,
    role,
    periodId,
    classGroupId,
    aggregation,
    ...(givenScales === undefined ? {} : { extraScales: givenScales }),
    ...(workflowStore === undefined ? {} : { workflowStore }),
    ...(now === undefined ? {} : { now }),
  });

  const [explainRow, setExplainRow] = useState<LearnerResultRow | null>(null);
  const [moderateRow, setModerateRow] = useState<LearnerResultRow | null>(null);
  const [moderationValue, setModerationValue] = useState('');
  const [moderationReason, setModerationReason] = useState('');
  const [moderationError, setModerationError] = useState<string | null>(null);

  // The period the calendar marks current is the one a teacher almost always wants.
  useEffect(() => {
    if (periodId !== null) return;
    const current = periodLookup.options.find((row) => row.status === 'current') ?? periodLookup.options[0];
    if (current) setPeriodId(current.id);
  }, [periodId, periodLookup.options]);

  useEffect(() => {
    if (classGroupId !== null) return;
    const first = classLookup.options.find((row) => results.reachableClassIds.has(row.id));
    if (first) setClassGroupId(first.id);
  }, [classGroupId, classLookup.options, results.reachableClassIds]);

  const overrideOf = results.overrideOf;

  const openModeration = useCallback(
    (row: LearnerResultRow) => {
      const existing = overrideOf(row.enrolmentId);
      setModerationValue(existing?.value ?? row.aggregate.grade?.code ?? row.aggregate.value ?? '');
      setModerationReason('');
      setModerationError(null);
      setModerateRow(row);
    },
    [overrideOf]
  );

  const saveModeration = useCallback(() => {
    if (moderateRow === null) return;
    try {
      results.overrideGrade({
        enrolmentId: moderateRow.enrolmentId,
        computed: moderateRow.aggregate.grade?.code ?? moderateRow.aggregate.value ?? '',
        value: moderationValue,
        reason: moderationReason,
      });
      setModerateRow(null);
    } catch (error) {
      setModerationError(error instanceof MarkEntryError ? error.message : 'The override could not be saved.');
    }
  }, [moderateRow, results, moderationValue, moderationReason]);

  const removeModeration = useCallback(() => {
    if (moderateRow === null) return;
    const existing = overrideOf(moderateRow.enrolmentId);
    if (existing === null) return;
    try {
      results.releaseGrade({
        enrolmentId: moderateRow.enrolmentId,
        current: existing,
        reason: moderationReason,
      });
      setModerateRow(null);
    } catch (error) {
      setModerationError(error instanceof MarkEntryError ? error.message : 'The override could not be removed.');
    }
  }, [moderateRow, overrideOf, results, moderationReason]);

  const openModerationRecord = moderateRow === null ? null : overrideOf(moderateRow.enrolmentId);

  const stateNotice = (title: string, body: string) => (
    <div className="py-8 text-center" role="status">
      <p className="font-medium text-surface-foreground">{title}</p>
      <p className="mx-auto mt-1 max-w-xl text-sm text-surface-muted-fg">{body}</p>
    </div>
  );

  return (
    <div className="space-y-3">
      <Card
        title={t('results.title', 'Results')}
        info={t(
          'results.subtitle',
          'Grades computed from the scheme and the aggregation the programme declares — never typed in here.'
        )}
      >
        <div className="grid grid-cols-1 gap-4 rounded-md border border-surface-border bg-surface-muted p-4 md:grid-cols-2">
          <EntityPicker
            label={t('results.period', 'Period')}
            value={periodId}
            onChange={setPeriodId}
            lookup={periodLookup}
            placeholder="Select a period"
            allowClear
          />
          <EntityPicker
            label={t('results.classGroup', 'Class group')}
            value={classGroupId}
            onChange={setClassGroupId}
            lookup={classLookup}
            filter={(row) => results.reachableClassIds.has(row.id)}
            placeholder="Select a class group"
            allowClear
            helperText={results.scope.reason}
          />
        </div>

        {results.state === 'loading' ? (
          <div className="flex justify-center py-10">
            <Spinner size="lg" />
          </div>
        ) : results.state === 'error' ? (
          <p role="alert" className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800">
            The school’s records could not be read, so results cannot be computed. Reload the page, and tell the
            administrator if it keeps happening.
          </p>
        ) : results.state === 'no-scope' ? (
          stateNotice('No results to show', results.scope.reason)
        ) : periodId === null || classGroupId === null ? (
          stateNotice('Choose a period and a class group', 'Results are computed per class group and period.')
        ) : results.state === 'outside-scope' ? (
          stateNotice(
            'This class group is outside your scope',
            `${results.scope.reason} Choose one of the class groups your teaching groups reach.`
          )
        ) : results.state === 'no-areas' ? (
          stateNotice(
            'No learning area is marked for this class yet',
            'A teaching group for this class and period, with an assessment attached, is needed before results can be computed. Set the groups up on the teaching groups screen first.'
          )
        ) : results.state === 'no-learners' ? (
          stateNotice(
            'No learners are enrolled in this class yet',
            'Add learners to the class group before results can be computed for them.'
          )
        ) : (
          <div className="mt-6 space-y-4">
            <div className="flex flex-wrap items-center gap-2 text-sm" aria-live="polite">
              <span className="text-surface-muted-fg" data-testid="aggregation-note">
                Aggregate: {describeAggregation(aggregation)}
              </span>
              <Badge variant="secondary" size="sm">
                {results.areas.length} learning area{results.areas.length === 1 ? '' : 's'}
              </Badge>
              {results.scope.canWrite ? (
                <Badge variant="success" size="sm">
                  You may moderate these results
                </Badge>
              ) : (
                <Badge variant="info" size="sm">
                  Read-only: {results.scope.reason}
                </Badge>
              )}
            </div>

            {results.hasMarks ? null : (
              <p
                role="status"
                className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900"
              >
                No marks have been entered for this class in this period yet, so every result below is
                incomplete. Enter marks on the marks screen; the grades here follow automatically.
              </p>
            )}

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm" data-testid="results-table">
                <caption className="pb-2 text-left text-surface-muted-fg">
                  {results.classGroupName ?? 'This class'} — {results.periodName ?? 'this period'}. Each learning
                  area&rsquo;s grade comes from its own scheme; the aggregate comes from the declared aggregation.
                </caption>
                <thead>
                  <tr className="border-b border-surface-border">
                    <th scope="col" className="px-2 py-2 text-left font-semibold">
                      Learner
                    </th>
                    {results.areas.map((area) => (
                      <th key={area.learningAreaId} scope="col" className="px-2 py-2 text-left font-semibold">
                        {area.name}
                        <span className="block text-xs font-normal text-surface-muted-fg">{area.code}</span>
                      </th>
                    ))}
                    <th scope="col" className="px-2 py-2 text-left font-semibold">
                      Aggregate
                    </th>
                    <th scope="col" className="px-2 py-2 text-right font-semibold">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {results.rows.map((row) => {
                    const override = overrideOf(row.enrolmentId);
                    const aggregate = row.aggregate;
                    const canModerate = results.scope.canWrite && aggregate.status === 'complete';
                    return (
                      <tr key={row.enrolmentId} className="border-b border-surface-border align-top">
                        <th scope="row" className="px-2 py-3 text-left font-medium">
                          {row.learnerName}
                          {row.admissionNumber === null ? null : (
                            <span className="block text-xs font-normal text-surface-muted-fg">
                              {row.admissionNumber}
                            </span>
                          )}
                        </th>
                        {results.areas.map((area, index) => (
                          <td
                            key={area.learningAreaId}
                            className="px-2 py-3"
                            data-testid={`area-${row.enrolmentId}-${area.code}`}
                          >
                            <AreaCell outcome={row.areas[index]} />
                          </td>
                        ))}
                        <td className="px-2 py-3" data-testid={`aggregate-${row.enrolmentId}`}>
                          {aggregate.status === 'complete' ? (
                            <>
                              <span className="font-medium" data-testid={`aggregate-grade-${row.enrolmentId}`}>
                                {aggregate.grade?.code ?? displayNumber(aggregate.value ?? '')}
                              </span>
                              <span className="mt-0.5 block text-xs text-surface-muted-fg">
                                {displayNumber(aggregate.value ?? '')}
                                {aggregate.grade === null ? '' : ` · ${aggregate.grade.label}`}
                              </span>
                            </>
                          ) : (
                            <>
                              <Badge
                                variant={aggregate.status === 'unavailable' ? 'danger' : 'warning'}
                                size="sm"
                              >
                                {aggregate.status === 'unavailable'
                                  ? 'Cannot compute'
                                  : aggregate.status === 'empty'
                                    ? 'No result'
                                    : 'Incomplete'}
                              </Badge>
                              <span className="mt-1 block text-xs text-surface-muted-fg">{aggregate.reason}</span>
                            </>
                          )}
                          {override === null ? null : (
                            <span className="mt-2 block" data-testid={`aggregate-override-${row.enrolmentId}`}>
                              <Badge variant="info" size="sm">
                                Moderated: {override.value}
                              </Badge>
                              <span className="mt-0.5 block text-xs text-surface-muted-fg">
                                The engine still says {aggregate.grade?.code ?? displayNumber(aggregate.value ?? '')}.
                              </span>
                            </span>
                          )}
                        </td>
                        <td className="px-2 py-3 text-right">
                          <span className="inline-flex flex-wrap justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setExplainRow(row)}
                              aria-label={`Why this grade for ${row.learnerName}`}
                            >
                              Why this grade
                            </Button>
                            {canModerate ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openModeration(row)}
                                aria-label={`Moderate ${row.learnerName}`}
                              >
                                Moderate
                              </Button>
                            ) : null}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Card>

      <Modal
        isOpen={explainRow !== null}
        onClose={() => setExplainRow(null)}
        title={explainRow === null ? 'Why this grade' : `Why this grade: ${explainRow.learnerName}`}
        subtitle="Every number below is the number the engine recorded, in the order it computed it."
        size="lg"
      >
        {explainRow === null || explainRow.aggregate.explanation === null ? (
          <p className="text-sm text-surface-muted-fg">
            {explainRow?.aggregate.reason ?? 'This result has no trace to show.'}
          </p>
        ) : (
          <Explanation explanation={explainRow.aggregate.explanation} reason={explainRow.aggregate.reason} />
        )}
      </Modal>

      <Modal
        isOpen={moderateRow !== null}
        onClose={() => setModerateRow(null)}
        title={moderateRow === null ? 'Moderate a grade' : `Moderate ${moderateRow.learnerName}`}
        subtitle="The engine’s grade stays on the record. An override is kept beside it with your reason, your name and the time."
        size="sm"
        footer={
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="outline" onClick={() => setModerateRow(null)}>
              Cancel
            </Button>
            {openModerationRecord === null ? null : (
              <Button variant="outline" onClick={removeModeration}>
                Remove override
              </Button>
            )}
            <Button onClick={saveModeration}>Save override</Button>
          </div>
        }
      >
        {moderateRow === null ? null : (
          <div className="space-y-4">
            <p className="text-sm text-surface-foreground">
              The engine computed{' '}
              <strong data-testid="moderation-computed">
                {moderateRow.aggregate.grade?.code ?? displayNumber(moderateRow.aggregate.value ?? '')}
              </strong>
              {moderateRow.aggregate.grade === null
                ? ''
                : ` (${moderateRow.aggregate.grade.label}, ${displayNumber(moderateRow.aggregate.value ?? '')})`}
              .
            </p>

            {openModerationRecord === null ? null : (
              <div className="rounded-md border border-surface-border bg-surface-muted p-3 text-sm">
                <p className="font-medium">Override in force</p>
                <p className="mt-1" data-testid="moderation-record">
                  {openModerationRecord.original} → {openModerationRecord.value}
                </p>
                <p className="mt-1 text-surface-muted-fg">
                  {openModerationRecord.reason} — {openModerationRecord.actorId}, {openModerationRecord.at}
                </p>
              </div>
            )}

            <label className="block text-sm font-medium text-surface-foreground" htmlFor="results-grade">
              Grade to award
            </label>
            <Input
              id="results-grade"
              className="mt-1"
              value={moderationValue}
              onChange={(event) => setModerationValue(event.target.value)}
            />

            <label className="block text-sm font-medium text-surface-foreground" htmlFor="results-reason">
              Reason (required)
            </label>
            <Textarea
              id="results-reason"
              className="mt-1"
              rows={3}
              value={moderationReason}
              onChange={(event) => setModerationReason(event.target.value)}
              placeholder="For example: examinations office correction after remarking script 14."
            />

            {moderationError === null ? null : (
              <p role="alert" className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800">
                {moderationError}
              </p>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export const ResultsPageContent: React.FC<ResultsPageContentProps> = (props) => (
  <CanonicalRepositoryProvider>
    <ResultsInner {...props} />
  </CanonicalRepositoryProvider>
);

export default ResultsPageContent;
