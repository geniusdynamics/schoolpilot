// ABOUTME: The interactive step migration M2 depends on: it shows the legacy classes and streams,
// ABOUTME: proposes the level and the academic year of each one, and saves the operator's mapping.

import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';

import type { SqliteAdapter } from '@/data/adapters/sqlite';

import {
  levelMappingKey,
  proposeLevelMapping,
  readLevelMappingSource,
  saveLevelMapping,
  type LegacyStream,
  type LevelMappingEntry,
  type LevelMappingSource,
  type MappingConfidence,
  type MappingYear,
} from '@/data/migrations/002-level-mapping';

export interface LevelMappingStepProps {
  /** The database the legacy classes and the confirmed mapping live in. */
  readonly adapter: SqliteAdapter;
  /** Called with the decisions after they are saved. */
  readonly onConfirmed?: (entries: readonly LevelMappingEntry[]) => void;
  /** The clock; the migration day decides which academic year is proposed. */
  readonly now?: () => Date;
  readonly className?: string;
}

/** One stream as the form holds it. */
interface StreamDraft {
  readonly key: string;
  readonly legacyStreamId: string;
  readonly name: string;
  readonly learnerCount: number;
  academicYearId: string;
  readonly yearConfidence: MappingConfidence;
  readonly yearRule: string;
  yearCorrected: boolean;
}

/** One legacy class as the form holds it: the level it becomes and its streams. */
interface ClassDraft {
  readonly classId: string;
  readonly className: string;
  levelName: string;
  levelCode: string;
  levelOrdinal: string;
  levelIsTerminal: boolean;
  readonly stageCode: string;
  readonly stageName: string;
  readonly stageSequence: number;
  readonly levelConfidence: MappingConfidence;
  readonly levelRule: string;
  levelCorrected: boolean;
  readonly streams: StreamDraft[];
}

/** The note that says how the proposal was made. */
function confidenceLabel(t: TFunction, confidence: MappingConfidence): string {
  if (confidence === 'high') return t('migration.levelMapping.confidenceHigh', 'high');
  if (confidence === 'medium') return t('migration.levelMapping.confidenceMedium', 'medium');
  return t('migration.levelMapping.confidenceLow', 'low');
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** The id-safe suffix of a legacy id, for the form's label targets. */
function fieldId(prefix: string, value: string): string {
  return `${prefix}-${value.replace(/[^a-zA-Z0-9_-]/g, '-')}`;
}

/** Builds the form drafts from the proposals and the decisions the operator already saved. */
function buildDrafts(
  source: LevelMappingSource,
  proposals: readonly LevelMappingEntry[],
  orphanStreams: readonly LegacyStream[]
): { classes: ClassDraft[]; orphanStreams: readonly LegacyStream[]; unconfirmed: boolean } {
  const learnersByStream = new Map<string, number>();
  for (const learner of source.learners) {
    if (learner.streamId === null) continue;
    learnersByStream.set(learner.streamId, (learnersByStream.get(learner.streamId) ?? 0) + 1);
  }

  const confirmed = new Map(
    source.confirmed.map((entry) => [
      levelMappingKey(entry.legacyClassId, entry.legacyStreamId),
      entry,
    ])
  );

  const byClass = new Map<string, LevelMappingEntry[]>();
  for (const entry of proposals) {
    const list = byClass.get(entry.legacyClassId) ?? [];
    list.push(entry);
    byClass.set(entry.legacyClassId, list);
  }

  const classes: ClassDraft[] = [];
  let unconfirmed = false;
  for (const [classId, entries] of byClass) {
    const first = entries[0];
    const confirmedLevel = entries
      .map((entry) => confirmed.get(levelMappingKey(classId, entry.legacyStreamId)))
      .find((entry) => entry !== undefined);
    const levelCorrected = confirmedLevel?.operatorCorrected ?? false;
    classes.push({
      classId,
      className: first.legacyClassName,
      levelName: confirmedLevel?.level.name ?? first.level.name,
      levelCode: confirmedLevel?.level.code ?? first.level.code,
      levelOrdinal: String(confirmedLevel?.level.ordinal ?? first.level.ordinal),
      levelIsTerminal: confirmedLevel?.level.isTerminal ?? first.level.isTerminal,
      stageCode: confirmedLevel?.level.stageCode ?? first.level.stageCode,
      stageName: confirmedLevel?.level.stageName ?? first.level.stageName,
      stageSequence: confirmedLevel?.level.stageSequence ?? first.level.stageSequence,
      levelConfidence: confirmedLevel?.levelConfidence ?? first.levelConfidence,
      levelRule: confirmedLevel?.levelRule ?? first.levelRule,
      levelCorrected,
      streams: entries.map((entry) => {
        const saved = confirmed.get(levelMappingKey(classId, entry.legacyStreamId));
        if (saved === undefined) unconfirmed = true;
        return {
          key: levelMappingKey(classId, entry.legacyStreamId),
          legacyStreamId: entry.legacyStreamId,
          name: entry.legacyStreamName,
          learnerCount:
            entry.legacyStreamId === '' ? 0 : learnersByStream.get(entry.legacyStreamId) ?? 0,
          academicYearId: saved?.academicYearId ?? entry.academicYearId,
          yearConfidence: saved?.yearConfidence ?? entry.yearConfidence,
          yearRule: saved?.yearRule ?? entry.yearRule,
          yearCorrected: saved?.operatorCorrected ?? false,
        };
      }),
    });
  }

  return { classes, orphanStreams, unconfirmed };
}

/** The problems that keep the form from being confirmed. */
function validationProblems(
  classes: readonly ClassDraft[],
  t: TFunction
): string[] {
  const problems: string[] = [];
  for (const entry of classes) {
    if (entry.levelName.trim() === '' || entry.levelCode.trim() === '') {
      problems.push(
        t(
          'migration.levelMapping.problemLevel',
          'The level for {{className}} needs a name and a code.',
          { className: entry.className }
        )
      );
    }
    const ordinal = Number.parseInt(entry.levelOrdinal, 10);
    if (!Number.isInteger(ordinal) || ordinal < 0) {
      problems.push(
        t(
          'migration.levelMapping.problemOrdinal',
          'The level order for {{className}} must be a whole number from 0.',
          { className: entry.className }
        )
      );
    }
    for (const stream of entry.streams) {
      if (stream.academicYearId === '') {
        problems.push(
          t(
            'migration.levelMapping.problemYear',
            'Choose the academic year for {{className}} {{stream}}.',
            {
              className: entry.className,
              stream:
                stream.name === ''
                  ? t('migration.levelMapping.defaultGroup', 'One class group')
                  : stream.name,
            }
          )
        );
      }
    }
  }
  return problems;
}

interface ClassDraftCardProps {
  readonly draft: ClassDraft;
  readonly years: readonly MappingYear[];
  readonly onChange: (classId: string, patch: Partial<ClassDraft>) => void;
  readonly onStreamChange: (classId: string, streamKey: string, yearId: string) => void;
  readonly t: TFunction;
}

/** One legacy class: the level it becomes and the year of each of its streams. */
const ClassDraftCard: React.FC<ClassDraftCardProps> = ({ draft, years, onChange, onStreamChange, t }) => {
  const nameId = fieldId('level-name', draft.classId);
  const codeId = fieldId('level-code', draft.classId);
  const ordinalId = fieldId('level-order', draft.classId);
  const finalId = fieldId('level-final', draft.classId);
  const confidence = confidenceLabel(t, draft.levelConfidence);

  return (
    <fieldset className="mb-4 rounded-lg border border-surface-border p-4">
      <legend className="px-1 font-semibold text-surface-foreground">
        {t('migration.levelMapping.classLegend', '{{className}} becomes {{levelName}}', {
          className: draft.className,
          levelName: draft.levelName,
        })}
      </legend>

      <p className="mb-3 text-xs text-surface-muted-fg">
        {draft.levelCorrected
          ? t('migration.levelMapping.corrected', 'changed by you')
          : t('migration.levelMapping.proposal', 'Suggestion ({{confidence}}): {{rule}}', {
              confidence,
              rule: draft.levelRule,
            })}
      </p>

      <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <label htmlFor={nameId} className="text-sm">
          <span className="mb-1 block text-slate-700">
            {t('migration.levelMapping.levelName', 'Level name')}
          </span>
          <input
            id={nameId}
            className="w-full rounded-md border border-surface-border bg-surface-card px-2 py-1"
            value={draft.levelName}
            onChange={(event) => onChange(draft.classId, { levelName: event.target.value })}
          />
        </label>
        <label htmlFor={codeId} className="text-sm">
          <span className="mb-1 block text-slate-700">
            {t('migration.levelMapping.levelCode', 'Level code')}
          </span>
          <input
            id={codeId}
            className="w-full rounded-md border border-surface-border bg-surface-card px-2 py-1"
            value={draft.levelCode}
            onChange={(event) => onChange(draft.classId, { levelCode: event.target.value })}
          />
        </label>
        <label htmlFor={ordinalId} className="text-sm">
          <span className="mb-1 block text-slate-700">
            {t('migration.levelMapping.levelOrder', 'Order')}
          </span>
          <input
            id={ordinalId}
            type="number"
            min={0}
            className="w-full rounded-md border border-surface-border bg-surface-card px-2 py-1"
            value={draft.levelOrdinal}
            onChange={(event) => onChange(draft.classId, { levelOrdinal: event.target.value })}
          />
        </label>
      </div>

      <label htmlFor={finalId} className="mb-3 flex items-center gap-2 text-sm text-slate-700">
        <input
          id={finalId}
          type="checkbox"
          checked={draft.levelIsTerminal}
          onChange={(event) => onChange(draft.classId, { levelIsTerminal: event.target.checked })}
        />
        {t('migration.levelMapping.levelFinal', 'This is the final level')}
      </label>

      {draft.streams.length === 1 && draft.streams[0].legacyStreamId === '' ? (
        <p className="text-sm text-slate-700">
          {t(
            'migration.levelMapping.noStreams',
            'This class has no streams: it becomes one class group with the class name.'
          )}
        </p>
      ) : null}

      <table className="w-full text-sm">
        <caption className="mb-1 text-left text-xs text-surface-muted-fg">
          {t('migration.levelMapping.streamsCaption', 'The streams and the learners in them')}
        </caption>
        <thead>
          <tr className="text-left text-xs text-surface-muted-fg">
            <th scope="col" className="py-1">
              {t('migration.levelMapping.stream', 'Stream')}
            </th>
            <th scope="col" className="py-1">
              {t('migration.levelMapping.learners', 'Learners')}
            </th>
            <th scope="col" className="py-1">
              {t('migration.levelMapping.year', 'Academic year')}
            </th>
          </tr>
        </thead>
        <tbody>
          {draft.streams.map((stream) => {
            const yearId = fieldId(`year-${draft.classId}`, stream.legacyStreamId || 'default');
            return (
              <tr key={stream.key}>
                <td className="py-1 pr-2">
                  {stream.legacyStreamId === ''
                    ? t('migration.levelMapping.defaultGroup', 'One class group')
                    : stream.name}
                </td>
                <td className="py-1 pr-2 text-surface-muted-fg">{stream.learnerCount}</td>
                <td className="py-1">
                  <label htmlFor={yearId} className="sr-only">
                    {t('migration.levelMapping.yearFor', 'Academic year for {{className}} {{stream}}', {
                      className: draft.className,
                      stream: stream.name === '' ? draft.className : stream.name,
                    })}
                  </label>
                  <select
                    id={yearId}
                    className="w-full rounded-md border border-surface-border bg-surface-card px-2 py-1"
                    value={stream.academicYearId}
                    onChange={(event) =>
                      onStreamChange(draft.classId, stream.key, event.target.value)
                    }
                  >
                    <option value="">
                      {t('migration.levelMapping.chooseYear', 'Choose a year')}
                    </option>
                    {years.map((year) => (
                      <option key={year.id} value={year.id}>
                        {year.name}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {draft.streams.map((stream) =>
        stream.yearCorrected ? (
          <p key={`${stream.key}-corrected`} className="mt-2 text-xs text-surface-muted-fg">
            {t('migration.levelMapping.yearCorrected', 'The year for {{stream}} was changed by you.', {
              stream: stream.name || draft.className,
            })}
          </p>
        ) : (
          <p key={`${stream.key}-rule`} className="mt-2 text-xs text-surface-muted-fg">
            {t('migration.levelMapping.yearRule', 'Year suggestion ({{confidence}}): {{rule}}', {
              confidence: confidenceLabel(t, stream.yearConfidence),
              rule: stream.yearRule,
            })}
          </p>
        )
      )}
    </fieldset>
  );
};

/**
 * The interactive mapping step.
 *
 * The step reads the legacy classes and streams and proposes a level for each class and an
 * academic year for each stream. The operator confirms or corrects every row, and the step
 * saves the decisions in `_legacy_level_mapping`, the table migration M2 reads. A resumed or
 * re-run migration therefore follows the operator's decision, not a fresh guess.
 */
export const LevelMappingStep: React.FC<LevelMappingStepProps> = ({
  adapter,
  onConfirmed,
  now,
  className = '',
}) => {
  const { t } = useTranslation('common');
  const [referenceDate] = useState(() => (now?.() ?? new Date()).toISOString().slice(0, 10));
  const [source, setSource] = useState<LevelMappingSource | null>(null);
  const [drafts, setDrafts] = useState<ClassDraft[]>([]);
  const [orphanStreams, setOrphanStreams] = useState<readonly LegacyStream[]>([]);
  const [unconfirmed, setUnconfirmed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const load = useCallback(async (isCancelled: () => boolean) => {
    setLoading(true);
    setLoadError(null);
    try {
      const loaded = await readLevelMappingSource(adapter);
      if (isCancelled()) return;
      const proposed = proposeLevelMapping(loaded, { referenceDate });
      const built = buildDrafts(loaded, proposed.entries, proposed.orphanStreams);
      setSource(loaded);
      setDrafts(built.classes);
      setOrphanStreams(built.orphanStreams);
      setUnconfirmed(built.unconfirmed);
    } catch (error) {
      if (!isCancelled()) setLoadError(messageOf(error));
    } finally {
      if (!isCancelled()) setLoading(false);
    }
  }, [adapter, referenceDate]);

  useEffect(() => {
    let cancelled = false;
    void load(() => cancelled);
    return () => {
      cancelled = true;
    };
  }, [load]);

  const resetToProposal = useCallback(() => {
    if (source === null) return;
    const proposed = proposeLevelMapping(source, { referenceDate });
    const built = buildDrafts({ ...source, confirmed: [] }, proposed.entries, proposed.orphanStreams);
    setDrafts(built.classes);
    setOrphanStreams(built.orphanStreams);
    setUnconfirmed(true);
    setSaved(false);
    setSaveError(null);
  }, [referenceDate, source]);

  const changeClass = useCallback((classId: string, patch: Partial<ClassDraft>) => {
    setSaved(false);
    setDrafts((current) =>
      current.map((entry) =>
        entry.classId === classId ? { ...entry, ...patch, levelCorrected: true } : entry
      )
    );
  }, []);

  const changeStream = useCallback((classId: string, streamKey: string, yearId: string) => {
    setSaved(false);
    setDrafts((current) =>
      current.map((entry) =>
        entry.classId !== classId
          ? entry
          : {
              ...entry,
              streams: entry.streams.map((stream) =>
                stream.key === streamKey
                  ? { ...stream, academicYearId: yearId, yearCorrected: true }
                  : stream
              ),
            }
      )
    );
  }, []);

  const years = source?.years ?? [];
  const problems = years.length === 0 ? [] : validationProblems(drafts, t);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (problems.length > 0 || busy || years.length === 0) return;
    setBusy(true);
    setSaveError(null);
    try {
      const confirmedAt = (now?.() ?? new Date()).toISOString().replace(/\.\d{3}Z$/, 'Z');
      const entries: LevelMappingEntry[] = drafts.flatMap((entry) => {
        const ordinal = Number.parseInt(entry.levelOrdinal, 10);
        return entry.streams.map((stream) => ({
          legacyClassId: entry.classId,
          legacyStreamId: stream.legacyStreamId,
          legacyClassName: entry.className,
          legacyStreamName: stream.name,
          level: {
            stageCode: entry.stageCode,
            stageName: entry.stageName,
            stageSequence: entry.stageSequence,
            code: entry.levelCode.trim(),
            name: entry.levelName.trim(),
            ordinal,
            isTerminal: entry.levelIsTerminal,
          },
          academicYearId: stream.academicYearId,
          levelConfidence: entry.levelConfidence,
          levelRule: entry.levelRule,
          yearConfidence: stream.yearConfidence,
          yearRule: stream.yearRule,
          operatorCorrected: entry.levelCorrected || stream.yearCorrected,
          confirmedAt,
          confirmedBy: null,
        }));
      });
      await adapter.transaction(async (tx) => {
        await saveLevelMapping(tx, entries);
      });
      setUnconfirmed(false);
      setSaved(true);
      onConfirmed?.(entries);
    } catch (error) {
      setSaveError(messageOf(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className={`rounded-xl border border-surface-border bg-surface-card p-4 ${className}`}>
      <h1 className="mb-2 text-xl font-semibold text-surface-foreground">
        {t('migration.levelMapping.title', 'Match the old classes to levels')}
      </h1>
      <p className="mb-2 text-sm text-slate-700">
        {t(
          'migration.levelMapping.intro',
          'Every old class becomes a level, and every old stream becomes a class group in an academic year. Check each suggestion before the database is changed.'
        )}
      </p>
      <p className="mb-4 text-xs text-surface-muted-fg">
        {t(
          'migration.levelMapping.rule',
          'The suggestion reads the class name (Form 1, Grade 7, Year 8) and takes the academic year that covers today. Correct anything that is wrong; the migration uses your decisions, not the suggestion.'
        )}
      </p>

      {loading && (
        <p role="status" className="text-sm text-slate-700">
          {t('migration.levelMapping.loading', 'Reading the old classes')}
        </p>
      )}

      {loadError !== null && (
        <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {t('migration.levelMapping.loadFailed', 'The old classes could not be read: {{error}}', {
            error: loadError,
          })}
        </p>
      )}

      {!loading && loadError === null && (
        <>
          {years.length === 0 && (
            <p role="alert" className="mb-4 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
              {t(
                'migration.levelMapping.noYears',
                'No academic year is available. Run the calendar migration first, then come back to this step.'
              )}
            </p>
          )}

          {orphanStreams.length > 0 && (
            <div className="mb-4 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
              <p className="font-medium">
                {t(
                  'migration.levelMapping.orphanTitle',
                  'These streams point at a class the old database does not hold and will not be migrated:'
                )}
              </p>
              <ul className="mt-1 list-disc pl-5">
                {orphanStreams.map((stream) => (
                  <li key={stream.id}>
                    {stream.name} ({stream.className ?? t('migration.levelMapping.unknownClass', 'unknown class')})
                  </li>
                ))}
              </ul>
            </div>
          )}

          {unconfirmed && drafts.length > 0 && (
            <p className="mb-4 text-sm text-amber-900">
              {t(
                'migration.levelMapping.unconfirmed',
                'This mapping is a suggestion that has not been confirmed yet. Confirm it to save the decisions the migration uses.'
              )}
            </p>
          )}

          {drafts.length === 0 ? (
            <p className="text-sm text-slate-700">
              {t('migration.levelMapping.empty', 'The old database holds no class to match.')}
            </p>
          ) : (
            <form onSubmit={handleSubmit} noValidate>
              {drafts.map((draft) => (
                <ClassDraftCard
                  key={draft.classId}
                  draft={draft}
                  years={years}
                  onChange={changeClass}
                  onStreamChange={changeStream}
                  t={t}
                />
              ))}

              {problems.length > 0 && (
                <ul role="alert" className="mb-3 list-disc rounded-md border border-red-200 bg-red-50 p-3 pl-8 text-sm text-red-800">
                  {problems.map((problem, index) => (
                    <li key={`${problem}-${index}`}>{problem}</li>
                  ))}
                </ul>
              )}

              {saveError !== null && (
                <p role="alert" className="mb-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                  {t('migration.levelMapping.saveFailed', 'The mapping could not be saved: {{error}}', {
                    error: saveError,
                  })}
                </p>
              )}

              {saved && (
                <p role="status" className="mb-3 text-sm text-green-800">
                  {t(
                    'migration.levelMapping.saved',
                    'The mapping is saved. The migration will use these decisions.'
                  )}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="submit"
                  disabled={busy || problems.length > 0 || years.length === 0}
                  className="rounded-md bg-primary-600 px-4 py-2 font-medium text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {busy
                    ? t('migration.levelMapping.saving', 'Saving the mapping')
                    : t('migration.levelMapping.confirm', 'Confirm the mapping')}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={resetToProposal}
                  className="rounded-md border border-surface-border px-4 py-2 font-medium text-slate-700 hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {t('migration.levelMapping.reset', 'Use the suggested mapping')}
                </button>
              </div>
            </form>
          )}
        </>
      )}
    </section>
  );
};

export default LevelMappingStep;
