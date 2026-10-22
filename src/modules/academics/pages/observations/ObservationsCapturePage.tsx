// ABOUTME: CBC observation capture: pick a class and learning area, record a pack rubric level and
// ABOUTME: evidence for each learner and outcome, apply a bulk level with visible exceptions, and
// ABOUTME: read the term judgement the pack's scale derives from the recorded observations.

import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Spinner from '@/components/ui/Spinner';
import { asId } from '@/domain/ids';
import type { CreateInput } from '@/data/repository';
import { useIsMobile } from '@/hooks/useMediaQuery';

import { personName } from '../../data/useCanonicalAcademics';
import BulkBar, { type BulkPolicy } from './components/BulkBar';
import CaptureMatrix, { type EvidenceRequest } from './components/CaptureMatrix';
import EvidenceEditor, { type EvidenceTarget } from './components/EvidenceEditor';
import JudgementSummary from './components/JudgementSummary';
import LearnerCapture from './components/LearnerCapture';
import {
  emptyDraft,
  draftKeyFor,
  loadDraft,
  saveDraft,
  todayIso,
  type ObservationDraft,
} from './data/draft';
import { cellKeyOf, latestByCell, type ObservationMode } from './data/judgement';
import {
  bulkExceptions,
  pendingChanges,
  type CaptureLearner,
  type CaptureTarget,
  type PendingChange,
} from './data/model';
import { bundledObservationPack, type ObservationPack } from './data/pack';
import { useObservationsData } from './data/useObservationsData';

export interface ObservationsCapturePageProps {
  /** The pack to capture against; the bundled ke-cbe pack by default. */
  readonly pack?: ObservationPack;
  /** The day new observations are recorded against; today by default. */
  readonly today?: string;
}

const fieldClass =
  'w-full min-h-[44px] rounded-md border border-surface-border bg-surface px-3 py-2 text-sm text-surface-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500';

function compareCodes(left: string, right: string): number {
  return left.localeCompare(right, undefined, { numeric: true });
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export const ObservationsCapturePage: React.FC<ObservationsCapturePageProps> = ({ pack, today }) => {
  const { t } = useTranslation('academics');
  const isMobile = useIsMobile();
  const packResult = pack ? { ok: true as const, pack } : bundledObservationPack;
  const observedOn = today ?? todayIso();

  const [classGroupId, setClassGroupId] = useState('');
  const [learningAreaId, setLearningAreaId] = useState('');
  const [draft, setDraft] = useState<ObservationDraft>(() => emptyDraft(observedOn));
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [editing, setEditing] = useState<EvidenceTarget | null>(null);
  const [bulkTargetKey, setBulkTargetKey] = useState('');
  const [bulkLevel, setBulkLevel] = useState('');
  const [bulkPolicy, setBulkPolicy] = useState<BulkPolicy>('skip');
  const [bulkConfirming, setBulkConfirming] = useState(false);
  const [bulkMessage, setBulkMessage] = useState('');
  const [saveMessage, setSaveMessage] = useState('');
  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);
  const data = useObservationsData(learningAreaId);

  const classGroup = data.classGroups.find((row) => row.id === classGroupId) ?? null;
  const classLevel = classGroup ? data.levels.find((row) => row.id === classGroup.level_id) ?? null : null;
  const classProgrammeId = classGroup?.programme_id ?? null;

  const classAreas = useMemo(
    () =>
      data.learningAreas
        .filter(
          (area) =>
            classGroup !== null &&
            area.programme_id === classGroup.programme_id &&
            (area.level_ids.length === 0 || area.level_ids.includes(classGroup.level_id))
        )
        .sort((left, right) => compareCodes(left.code, right.code)),
    [data.learningAreas, classGroup]
  );

  const draftKey = draftKeyFor(data.institutionId, classGroupId, learningAreaId);

  useEffect(() => {
    if (!draftKey) {
      setLoadedKey(null);
      return;
    }
    const stored = loadDraft(draftKey);
    setDraft(stored ?? emptyDraft(observedOn));
    setEditing(null);
    setLoadedKey(draftKey);
  }, [draftKey, observedOn]);

  useEffect(() => {
    if (draftKey && loadedKey === draftKey) saveDraft(draftKey, draft);
  }, [draftKey, loadedKey, draft]);

  const maybePack = packResult.ok ? packResult.pack : null;
  const schemeSupportsLevel =
    maybePack !== null && classLevel !== null ? maybePack.scheme.levels.includes(classLevel.code) : false;

  const outcomeTargets = useMemo<CaptureTarget[]>(
    () =>
      data.outcomes
        .filter(
          (outcome) =>
            classGroup !== null &&
            outcome.learning_area_id === learningAreaId &&
            outcome.level_id === classGroup.level_id
        )
        .sort((left, right) => compareCodes(left.code, right.code))
        .map((outcome) => ({
          key: `outcome:${outcome.id}`,
          id: outcome.id,
          kind: 'outcome',
          code: outcome.code,
          label: outcome.text,
        })),
    [data.outcomes, learningAreaId, classGroup]
  );

  const competencyTargets = useMemo<CaptureTarget[]>(
    () =>
      classProgrammeId === null
        ? []
        : data.competencies
            .filter((competency) => competency.programme_id === classProgrammeId)
            .sort((left, right) => compareCodes(left.code, right.code))
            .map((competency) => ({
              key: `competency:${competency.id}`,
              id: competency.id,
              kind: 'competency',
              code: competency.code,
              label: competency.name,
            })),
    [data.competencies, classProgrammeId]
  );

  const targets = draft.mode === 'outcome' ? outcomeTargets : competencyTargets;

  useEffect(() => {
    if (targets.length === 0) {
      if (bulkTargetKey !== '') setBulkTargetKey('');
      return;
    }
    if (!targets.some((target) => target.key === bulkTargetKey)) {
      setBulkTargetKey(targets[0].key);
    }
  }, [targets, bulkTargetKey]);

  const learners = useMemo<CaptureLearner[]>(() => {
    if (!classGroupId) return [];
    return data.enrolments
      .filter((enrolment) => enrolment.class_group_id === classGroupId && enrolment.status === 'active')
      .map((enrolment) => {
        const learner = data.learnerById.get(enrolment.learner_id);
        return {
          enrolmentId: enrolment.id,
          learnerId: enrolment.learner_id,
          name: learner ? personName(learner) : enrolment.learner_id,
          admissionNumber: learner?.admission_number ?? '',
        };
      })
      .sort((left, right) => compareCodes(left.admissionNumber, right.admissionNumber));
  }, [data.enrolments, data.learnerById, classGroupId]);

  const areaObservations = useMemo(
    () => data.observations.filter((observation) => observation.learning_area_id === learningAreaId),
    [data.observations, learningAreaId]
  );
  const latest = useMemo(
    () => latestByCell(areaObservations, draft.mode),
    [areaObservations, draft.mode]
  );
  const changes = useMemo(
    () => pendingChanges(learners, targets, latest, draft),
    [learners, targets, latest, draft]
  );

  const selectedBulkTarget = targets.find((target) => target.key === bulkTargetKey) ?? null;
  const bulkLearnerExceptions = useMemo(
    () => bulkExceptions(learners, selectedBulkTarget, latest, draft),
    [learners, selectedBulkTarget, latest, draft]
  );

  const exceptionKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const [key, baseline] of Object.entries(draft.bulk)) {
      const level = draft.levels[key] ?? latest.get(key)?.rubric_level ?? '';
      if (level !== baseline) keys.add(key);
    }
    return keys;
  }, [draft.bulk, draft.levels, latest]);

  const existingForBulk = selectedBulkTarget
    ? learners.filter((learner) => {
        const key = cellKeyOf(selectedBulkTarget.key, learner.enrolmentId);
        return latest.has(key) || draft.levels[key] !== undefined;
      }).length
    : 0;

  const recordedCells = learners.reduce(
    (total, learner) =>
      total +
      targets.filter((target) => latest.has(cellKeyOf(target.key, learner.enrolmentId))).length,
    0
  );
  const totalCells = learners.length * targets.length;
  const hasDraftContent =
    Object.keys(draft.levels).length > 0 ||
    Object.keys(draft.evidence).length > 0 ||
    Object.keys(draft.bulk).length > 0;

  const changeClass = (value: string) => {
    setClassGroupId(value);
    setLearningAreaId('');
    setDraft(emptyDraft(observedOn));
    setLoadedKey(null);
    setEditing(null);
    setBulkTargetKey('');
    setBulkLevel('');
    setBulkConfirming(false);
    setBulkMessage('');
    setSaveMessage('');
    setSaveError('');
  };

  const changeLearningArea = (value: string) => {
    setLearningAreaId(value);
    setDraft(emptyDraft(observedOn));
    setLoadedKey(null);
    setEditing(null);
    setBulkTargetKey('');
    setBulkLevel('');
    setBulkConfirming(false);
    setBulkMessage('');
    setSaveMessage('');
    setSaveError('');
  };

  const changeMode = (mode: ObservationMode) => {
    setDraft((current) => ({ ...current, mode }));
    setEditing(null);
    setBulkTargetKey('');
    setBulkLevel('');
    setBulkConfirming(false);
    setBulkMessage('');
  };

  const setLevel = (key: string, level: string) => {
    setDraft((current) => ({ ...current, levels: { ...current.levels, [key]: level } }));
    setSaveMessage('');
    setSaveError('');
  };

  const clearLevel = (key: string) => {
    setDraft((current) => {
      const levels = { ...current.levels };
      delete levels[key];
      return { ...current, levels };
    });
    setSaveMessage('');
  };

  const saveEvidence = (key: string, evidence: string) => {
    setDraft((current) => ({
      ...current,
      evidence: { ...current.evidence, [key]: evidence },
    }));
    setSaveMessage('');
  };

  const openEvidence = (request: EvidenceRequest) => {
    const key = request.cellKey;
    const current = Object.prototype.hasOwnProperty.call(draft.evidence, key)
      ? draft.evidence[key]
      : latest.get(key)?.evidence ?? '';
    setEditing({
      cellKey: key,
      learnerName: request.learner.name,
      targetLabel: `${request.target.code} — ${request.target.label}`,
      originalValue: current,
    });
  };

  const applyBulk = (confirmed: boolean) => {
    if (!selectedBulkTarget || bulkLevel === '') return;
    const existing = learners.filter((learner) => {
      const key = cellKeyOf(selectedBulkTarget.key, learner.enrolmentId);
      return latest.has(key) || draft.levels[key] !== undefined;
    });
    if (!confirmed && bulkPolicy === 'replace' && existing.length > 0) {
      setBulkConfirming(true);
      return;
    }

    const levels = { ...draft.levels };
    const bulk = { ...draft.bulk };
    let applied = 0;
    let skipped = 0;
    for (const learner of learners) {
      const key = cellKeyOf(selectedBulkTarget.key, learner.enrolmentId);
      const has = latest.has(key) || draft.levels[key] !== undefined;
      if (bulkPolicy === 'skip' && has) {
        skipped += 1;
        continue;
      }
      levels[key] = bulkLevel;
      bulk[key] = bulkLevel;
      applied += 1;
    }

    setDraft({ ...draft, levels, bulk });
    setBulkConfirming(false);
    setBulkMessage(
      bulkPolicy === 'skip'
        ? t(
            'observations.bulkAppliedSkip',
            'Applied {{level}} to {{applied}} learner(s); skipped {{skipped}} with an existing observation.',
            { level: bulkLevel, applied, skipped }
          )
        : t(
            'observations.bulkAppliedReplace',
            'Applied {{level}} to {{applied}} learner(s), replacing {{existing}} existing entry/entries.',
            { level: bulkLevel, existing: existing.length, applied }
          )
    );
  };

  const createPayload = (change: PendingChange): CreateInput<'competency_observation'> => ({
    institution_id: data.institutionId ?? '',
    enrolment_id: change.learner.enrolmentId,
    learning_area_id: learningAreaId,
    ...(change.target.kind === 'outcome'
      ? { outcome_id: change.target.id }
      : { competency_id: change.target.id }),
    rubric_level: change.level,
    observed_on: draft.observedOn || observedOn,
    ...(change.evidence === '' ? {} : { evidence: change.evidence }),
  });

  const saveObservations = async () => {
    if (changes.length === 0 || data.institutionId === null) return;
    setSaving(true);
    setSaveError('');
    setSaveMessage('');
    let written = 0;
    try {
      for (const change of changes) {
        if (change.saved && change.level === change.saved.rubric_level) {
          await data.repository.update(
            'competency_observation',
            asId<'competency_observation'>(change.saved.id),
            { evidence: change.evidence },
            { expectedVersion: change.saved.rowVersion ?? 1 }
          );
        } else {
          await data.repository.create('competency_observation', createPayload(change));
        }
        written += 1;
      }
      setDraft((current) => ({ ...current, levels: {}, evidence: {} }));
      setSaveMessage(
        t('observations.savedCount', 'Saved {{count}} observation(s) to the records.', { count: written })
      );
    } catch (error) {
      setSaveError(
        t('observations.saveFailed', 'The observations could not all be saved: {{reason}}', {
          reason: errorText(error),
        })
      );
    } finally {
      setSaving(false);
    }
  };

  if (data.isLoading) {
    return (
      <div className="flex justify-center items-center p-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (data.isError) {
    return (
      <div className="p-6">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {t('observations.loadFailed', 'The observation records could not be read.')}
          {data.error ? <span className="mt-1 block text-xs">{errorText(data.error)}</span> : null}
        </p>
      </div>
    );
  }

  if (!packResult.ok) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-surface-foreground">
          {t('observations.title', 'CBC observations')}
        </h1>
        <p role="alert" className="mt-2 text-sm text-red-600 dark:text-red-400">
          {t('observations.packFailed', 'The curriculum pack cannot drive observation capture: {{reason}}', {
            reason: packResult.error,
          })}
        </p>
      </div>
    );
  }

  const activePack = packResult.pack;
  const initialEvidence = editing
    ? Object.prototype.hasOwnProperty.call(draft.evidence, editing.cellKey)
      ? draft.evidence[editing.cellKey]
      : latest.get(editing.cellKey)?.evidence ?? ''
    : '';
  const selectedLearnerId = draft.learnerId ?? learners[0]?.learnerId ?? null;
  const labelByTarget = (targetKey: string) => {
    const target = [...outcomeTargets, ...competencyTargets].find((entry) => entry.key === targetKey);
    return target ? `${target.code} — ${target.label}` : targetKey;
  };

  return (
    <div className="p-6 space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-surface-foreground">
          {t('observations.title', 'CBC observations')}
        </h1>
        <p className="mt-1 text-sm text-surface-muted-fg">
          {t(
            'observations.subtitle',
            'Record a level and evidence for each learner, then read the term judgement the pack derives. Scheme {{scheme}} · {{scale}}.',
            { scheme: activePack.scheme.code, scale: activePack.scale.code }
          )}
        </p>
      </header>

      <Card>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div>
            <label htmlFor="observations-class" className="block text-sm font-medium text-surface-foreground">
              {t('observations.class', 'Class')}
            </label>
            <select
              id="observations-class"
              className={`mt-1 ${fieldClass}`}
              value={classGroupId}
              onChange={(event) => changeClass(event.target.value)}
            >
              <option value="">{t('observations.chooseClass', '-- Select a class --')}</option>
              {data.classGroups.map((row) => {
                const level = data.levels.find((entry) => entry.id === row.level_id);
                return (
                  <option key={row.id} value={row.id}>
                    {[level?.name, row.name].filter(Boolean).join(' · ')}
                  </option>
                );
              })}
            </select>
          </div>
          <div>
            <label
              htmlFor="observations-area"
              className="block text-sm font-medium text-surface-foreground"
            >
              {t('observations.learningArea', 'Learning area')}
            </label>
            <select
              id="observations-area"
              className={`mt-1 ${fieldClass}`}
              value={learningAreaId}
              onChange={(event) => changeLearningArea(event.target.value)}
              disabled={classGroupId === ''}
            >
              <option value="">{t('observations.chooseArea', '-- Select a learning area --')}</option>
              {classAreas.map((area) => (
                <option key={area.id} value={area.id}>
                  {area.code} — {area.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              htmlFor="observations-date"
              className="block text-sm font-medium text-surface-foreground"
            >
              {t('observations.observedOn', 'Observed on')}
            </label>
            <input
              id="observations-date"
              type="date"
              className={`mt-1 ${fieldClass}`}
              value={draft.observedOn}
              onChange={(event) =>
                setDraft((current) => ({ ...current, observedOn: event.target.value }))
              }
            />
          </div>
          <div>
            <span className="block text-sm font-medium text-surface-foreground">
              {t('observations.capture', 'Capture')}
            </span>
            <div className="mt-1 grid grid-cols-2 gap-1 rounded-md border border-surface-border p-1">
              {(['outcome', 'competency'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  aria-pressed={draft.mode === mode}
                  onClick={() => changeMode(mode)}
                  className={[
                    'min-h-[44px] rounded px-2 text-sm font-medium',
                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
                    draft.mode === mode
                      ? 'bg-primary-600 text-white'
                      : 'bg-transparent text-surface-foreground',
                  ].join(' ')}
                >
                  {mode === 'outcome'
                    ? t('observations.outcomes', 'Outcomes')
                    : t('observations.competencies', 'Competencies')}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {classGroupId === '' || learningAreaId === '' ? (
        <p className="text-sm text-surface-muted-fg">
          {t(
            'observations.choosePrompt',
            'Choose a class and a learning area to capture observations.'
          )}
        </p>
      ) : classLevel !== null && !schemeSupportsLevel ? (
        <p role="alert" className="text-sm text-yellow-700 dark:text-yellow-300">
          {t(
            'observations.levelOutsideScheme',
            'The {{scheme}} scheme covers {{levels}}; this class is {{level}}, so it is captured with a different scheme.',
            {
              scheme: activePack.scheme.code,
              levels: activePack.scheme.levels.join(', '),
              level: classLevel.code,
            }
          )}
        </p>
      ) : learners.length === 0 ? (
        <p className="text-sm text-surface-muted-fg">
          {t('observations.noLearners', 'No active learners in this class.')}
        </p>
      ) : targets.length === 0 ? (
        <p className="text-sm text-surface-muted-fg">
          {draft.mode === 'outcome'
            ? t(
                'observations.noOutcomes',
                'No outcomes are recorded for this learning area and level yet.'
              )
            : t('observations.noCompetencies', 'No competencies are installed for this programme yet.')}
        </p>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-surface-muted-fg">
            <span>
              {t('observations.learnerCount', '{{count}} learner(s)', { count: learners.length })}
            </span>
            <span>{t('observations.targetCount', '{{count}} target(s)', { count: targets.length })}</span>
            <span data-testid="recorded-cells">
              {t('observations.recordedCells', '{{recorded}} of {{total}} recorded', {
                recorded: recordedCells,
                total: totalCells,
              })}
            </span>
            <span data-testid="exception-total">
              {t('observations.exceptionTotal', '{{count}} exception(s)', {
                count: exceptionKeys.size,
              })}
            </span>
            {changes.length > 0 ? (
              <span className="font-medium text-surface-foreground">
                {t('observations.unsavedCount', '{{count}} unsaved', { count: changes.length })}
              </span>
            ) : null}
          </div>

          <BulkBar
            targets={targets}
            targetKey={bulkTargetKey}
            level={bulkLevel}
            policy={bulkPolicy}
            levels={activePack.levels}
            existingCount={existingForBulk}
            exceptionCount={bulkLearnerExceptions.length}
            confirming={bulkConfirming}
            message={bulkMessage}
            disabled={saving}
            onTargetChange={(value) => {
              setBulkTargetKey(value);
              setBulkConfirming(false);
              setBulkMessage('');
            }}
            onLevelChange={setBulkLevel}
            onPolicyChange={(value) => {
              setBulkPolicy(value);
              setBulkConfirming(false);
            }}
            onApply={() => applyBulk(false)}
            onConfirmReplace={() => applyBulk(true)}
            onCancelReplace={() => setBulkConfirming(false)}
          />

          {isMobile ? (
            <LearnerCapture
              learners={learners}
              selectedLearnerId={selectedLearnerId}
              targets={targets}
              levels={activePack.levels}
              latest={latest}
              draft={draft}
              exceptions={exceptionKeys}
              onSelectLearner={(learnerId) =>
                setDraft((current) => ({ ...current, learnerId }))
              }
              onLevel={setLevel}
              onClearLevel={clearLevel}
              onOpenEvidence={openEvidence}
            />
          ) : (
            <CaptureMatrix
              learners={learners}
              targets={targets}
              levels={activePack.levels}
              latest={latest}
              draft={draft}
              exceptions={exceptionKeys}
              onLevel={setLevel}
              onClearLevel={clearLevel}
              onOpenEvidence={openEvidence}
            />
          )}

          {editing ? (
            <EvidenceEditor
              target={editing}
              initialValue={initialEvidence}
              onDraftChange={saveEvidence}
              onSave={saveEvidence}
              onClose={() => setEditing(null)}
            />
          ) : null}

          <div className="flex flex-wrap items-center gap-3">
            <Button
              size="lg"
              onClick={() => void saveObservations()}
              disabled={saving || changes.length === 0 || data.institutionId === null}
              loading={saving}
              loadingText={t('observations.saving', 'Saving…')}
            >
              {t('observations.save', 'Save observations')}
            </Button>
            {hasDraftContent ? (
              <span data-testid="draft-status" className="text-sm text-surface-muted-fg">
                {t(
                  'observations.draftKept',
                  'Draft kept on this device; saving writes the observations to the records.'
                )}
              </span>
            ) : null}
            {saveMessage ? (
              <span role="status" className="text-sm text-green-700 dark:text-green-300">
                {saveMessage}
              </span>
            ) : null}
            {saveError ? (
              <span role="alert" className="text-sm text-red-600 dark:text-red-400">
                {saveError}
              </span>
            ) : null}
          </div>

          <JudgementSummary
            learners={learners}
            targets={targets}
            observations={areaObservations}
            mode={draft.mode}
            pack={activePack}
            labelByTarget={labelByTarget}
          />
        </>
      )}
    </div>
  );
};

export default ObservationsCapturePage;
