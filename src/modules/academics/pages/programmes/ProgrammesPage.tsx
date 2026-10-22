// ABOUTME: Programme management: the programmes a school runs, the pack each is pinned to with its
// ABOUTME: verification status, an upgrade preview that must be safe before it can be applied, and the
// ABOUTME: school's pack overrides with the actor and instant that recorded them.

import React, { useCallback, useMemo, useState } from 'react';

import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import { useCanonicalRepository, CanonicalRepositoryProvider } from '@/data/canonicalRepository';
import { useEntityQuery } from '@/data/query';
import type { Repository } from '@/data/repository';
import { generateUuidv7 } from '@/domain/ids';
import {
  createPackRegistry,
  isPackRegistryError,
  type PackRegistry,
  type UpgradePreview,
} from '@/domain/curriculum/registry';
// `PackOverrideRecord` is part of the registry's public model but is not re-exported by the
// barrel; the type is imported from its own module until the barrel names it.
import type { PackOverrideRecord } from '@/domain/curriculum/registry/types';

import { packSourceFor, listAvailablePacks, type AvailablePack } from '@/components/setup/packs/packLibrary';

import { useProgrammes, type ProgrammeView } from './useProgrammes';

/** A refusal or failure, reduced to something a user can read. */
export function describeError(error: unknown): string {
  if (isPackRegistryError(error)) {
    if (error.code === 'upgrade_unsafe') {
      return 'This upgrade is refused: it would break state the school already has.';
    }
    return error.message;
  }
  return error instanceof Error ? error.message : String(error);
}

export interface ProgrammesPageContentProps {
  readonly repository: Repository;
  /** The packs the installation ships; the registry's candidates. */
  readonly packs: readonly AvailablePack[];
  /** The acting user the writes are audited under. */
  readonly actor?: string;
  readonly now?: () => Date;
}

const VERIFICATION_VARIANT: Readonly<Record<string, 'success' | 'info' | 'warning'>> = {
  verified: 'success',
  reviewed: 'info',
  draft: 'warning',
};

/** The verification badge for a programme's pack, or an honest "not in the library" note. */
const VerificationBadge: React.FC<{ readonly view: ProgrammeView }> = ({ view }) => {
  if (!view.verification) {
    return (
      <span className="text-xs text-surface-muted-fg" data-testid={`programme-verification-${view.programme.id}`}>
        Pack version not in the installed library
      </span>
    );
  }
  const { status, verified_by: verifiedBy } = view.verification;
  return (
    <span data-testid={`programme-verification-${view.programme.id}`}>
      <Badge variant={VERIFICATION_VARIANT[status] ?? 'info'}>{status}</Badge>
      {status === 'draft' && (
        <span className="ml-2 text-xs text-amber-700 dark:text-amber-400">
          Not reviewed by a curriculum officer.
        </span>
      )}
      {status !== 'draft' && verifiedBy.length > 0 && (
        <span className="ml-2 text-xs text-surface-muted-fg">by {verifiedBy.join(', ')}</span>
      )}
    </span>
  );
};

export const ProgrammesPageContent: React.FC<ProgrammesPageContentProps> = ({
  repository,
  packs,
  actor: givenActor,
  now,
}) => {
  const state = useProgrammes(repository, packs);
  // The platform user model is not modelled canonically yet (P1-B03), so a signed-in login has no
  // canonical id. The actor the writes are audited under is the canonical user when one exists and
  // a UUIDv7 otherwise, which the audit trail can still name.
  const fallbackActor = useMemo(() => generateUuidv7(), []);
  const actor = givenActor ?? fallbackActor;
  const [candidate, setCandidate] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState<{ readonly programmeId: string; readonly preview: UpgradePreview } | null>(null);
  const [overrides, setOverrides] = useState<Record<string, readonly PackOverrideRecord[]>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [overrideTarget, setOverrideTarget] = useState<string | null>(null);
  const [overridePath, setOverridePath] = useState('');
  const [overrideValue, setOverrideValue] = useState('');
  const [overrideReason, setOverrideReason] = useState('');

  const registry: PackRegistry = useMemo(
    () =>
      createPackRegistry({
        repository,
        actor,
        source: packSourceFor(packs),
        ...(now === undefined ? {} : { now }),
      }),
    [repository, packs, actor, now]
  );

  const run = useCallback(async (work: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await work();
    } catch (failure) {
      setError(describeError(failure));
    } finally {
      setBusy(false);
    }
  }, []);

  const candidateFor = (view: ProgrammeView): AvailablePack | null => {
    const ref = candidate[view.programme.id];
    return view.otherVersions.find((pack) => pack.ref === ref) ?? null;
  };

  const previewUpgrade = (view: ProgrammeView) =>
    run(async () => {
      const pack = candidateFor(view);
      if (!pack) throw new Error('Choose a version to preview first.');
      const result = await registry.previewUpgrade(view.programme.id, pack.document);
      setPreview({ programmeId: view.programme.id, preview: result });
      setNotice(null);
    });

  const applyUpgrade = (view: ProgrammeView) =>
    run(async () => {
      const pack = candidateFor(view);
      if (!pack) throw new Error('Choose a version to apply first.');
      // The registry previews again and refuses an unsafe upgrade; the page never forces it.
      const result = await registry.upgrade(view.programme.id, pack.document);
      setPreview({ programmeId: view.programme.id, preview: result.preview });
      setNotice(`Upgraded ${view.programme.name} to ${result.installation.pack.ref}.`);
      await loadOverrides(view);
    });

  const loadOverrides = useCallback(
    async (view: ProgrammeView) => {
      const list = await registry.listOverrides(view.programme.id);
      setOverrides((current) => ({ ...current, [view.programme.id]: list }));
    },
    [registry]
  );

  const saveOverride = (view: ProgrammeView) =>
    run(async () => {
      const path = overridePath.trim();
      if (!path) throw new Error('Enter the pack path the override applies to.');
      let value: unknown;
      try {
        value = JSON.parse(overrideValue);
      } catch {
        throw new Error('The override value must be valid JSON.');
      }
      await registry.applyOverride(view.programme.id, path, value, {
        reason: overrideReason.trim() || undefined,
      });
      await loadOverrides(view);
      setOverrideTarget(null);
      setOverridePath('');
      setOverrideValue('');
      setOverrideReason('');
      setNotice(`Recorded the override on ${path}.`);
    });

  const revertOverride = (view: ProgrammeView, path: string) =>
    run(async () => {
      await registry.revertOverride(view.programme.id, path, { reason: overrideReason.trim() || undefined });
      await loadOverrides(view);
      setNotice(`Removed the override on ${path}.`);
    });

  if (state.error) {
    return (
      <p role="alert" className="text-sm text-red-600 dark:text-red-400">
        The programmes could not be read: {String(state.error)}
      </p>
    );
  }
  if (state.loading) {
    return (
      <p className="text-sm text-surface-muted-fg" role="status">
        Loading programmes…
      </p>
    );
  }

  const activeCount = state.rows.filter((view) => view.programme.status === 'active').length;

  return (
    <div className="space-y-4">
      <Card
        title="Programmes"
        subtitle={`${state.rows.length} programme${state.rows.length === 1 ? '' : 's'}, ${activeCount} active. Each programme runs on the curriculum pack it is pinned to.`}
      >
        {state.rows.length === 0 ? (
          <p className="text-sm text-surface-muted-fg">This school has no programme yet.</p>
        ) : (
          <div className="space-y-3" data-testid="programmes-table">
            {state.rows.map((view) => {
              const chosen = candidateFor(view);
              const shown = preview?.programmeId === view.programme.id ? preview.preview : null;
              const overrideList = overrides[view.programme.id] ?? [];
              return (
                <div
                  key={view.programme.id}
                  data-testid={`programme-row-${view.programme.id}`}
                  className="rounded-lg border border-surface-border p-4 space-y-3"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-surface-foreground">{view.programme.name}</span>
                    <Badge variant={view.programme.status === 'active' ? 'success' : 'secondary'}>
                      {view.programme.status}
                    </Badge>
                    <span className="text-sm text-surface-muted-fg" data-testid={`programme-pack-${view.programme.id}`}>
                      {view.installed
                        ? `${view.programme.curriculum_pack_code}@${view.programme.pack_version}`
                        : `${view.programme.curriculum_pack_code}@${view.programme.pack_version} (no pack installed)`}
                    </span>
                    <VerificationBadge view={view} />
                  </div>

                  <p className="text-xs text-surface-muted-fg">
                    {view.levelCount} level{view.levelCount === 1 ? '' : 's'} · {view.learningAreaCount} learning
                    area{view.learningAreaCount === 1 ? '' : 's'} · {view.gradingScaleCount} grading scale
                    {view.gradingScaleCount === 1 ? '' : 's'} · {view.assessmentSchemeCount} scheme
                    {view.assessmentSchemeCount === 1 ? '' : 's'} · {view.reportCount} report template
                    {view.reportCount === 1 ? '' : 's'}
                  </p>

                  {view.otherVersions.length === 0 ? (
                    <p className="text-xs text-surface-muted-fg" data-testid={`no-upgrade-${view.programme.id}`}>
                      No other version of this pack is in the installed library.
                    </p>
                  ) : (
                    <div className="flex flex-wrap items-end gap-2">
                      <label className="text-xs text-surface-muted-fg">
                        Upgrade to
                        <select
                          data-testid={`upgrade-candidate-${view.programme.id}`}
                          className="ml-2 rounded-md border border-surface-border bg-surface px-2 py-1 text-sm"
                          value={candidate[view.programme.id] ?? ''}
                          onChange={(event) =>
                            setCandidate((current) => ({ ...current, [view.programme.id]: event.target.value }))
                          }
                        >
                          <option value="">Choose a version…</option>
                          {view.otherVersions.map((pack) => (
                            <option key={pack.ref} value={pack.ref}>
                              {pack.version} ({pack.verification.status})
                            </option>
                          ))}
                        </select>
                      </label>
                      <Button
                        size="sm"
                        variant="secondary"
                        data-testid={`preview-upgrade-${view.programme.id}`}
                        disabled={busy || !chosen}
                        onClick={() => void previewUpgrade(view)}
                      >
                        Preview upgrade
                      </Button>
                      <Button
                        size="sm"
                        data-testid={`apply-upgrade-${view.programme.id}`}
                        disabled={busy || !chosen || !shown?.safe}
                        onClick={() => void applyUpgrade(view)}
                      >
                        Apply upgrade
                      </Button>
                    </div>
                  )}

                  {shown && (
                    <div className="rounded-md bg-surface-muted p-3 text-sm" data-testid="upgrade-preview">
                      <p data-testid="upgrade-safety">
                        {shown.safe
                          ? `Safe to apply: ${shown.changes.length} change${shown.changes.length === 1 ? '' : 's'}.`
                          : `Refused: ${shown.breaks.length} reference${shown.breaks.length === 1 ? '' : 's'} would break.`}
                      </p>
                      {shown.breaks.length > 0 && (
                        <ul className="mt-1 list-disc pl-5 text-xs text-red-700 dark:text-red-400" data-testid="upgrade-breaks">
                          {shown.breaks.map((entry) => (
                            <li key={`${entry.code}-${entry.subject}`}>{entry.detail}</li>
                          ))}
                        </ul>
                      )}
                      {shown.changes.length > 0 && (
                        <ul className="mt-1 list-disc pl-5 text-xs text-surface-muted-fg">
                          {shown.changes.slice(0, 20).map((change) => (
                            <li key={`${change.section}-${change.kind}-${change.code}`}>
                              {change.kind} {change.section} {change.code}
                              {change.fields.length > 0 ? ` (${change.fields.join(', ')})` : ''}
                            </li>
                          ))}
                        </ul>
                      )}
                      {shown.warnings.length > 0 && (
                        <ul className="mt-1 list-disc pl-5 text-xs text-amber-700 dark:text-amber-400">
                          {shown.warnings.map((warning) => (
                            <li key={`${warning.code}-${warning.detail}`}>{warning.detail}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}

                  <div className="border-t border-surface-border pt-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium text-surface-foreground">Overrides</span>
                      <Button
                        size="xs"
                        variant="ghost"
                        data-testid={`load-overrides-${view.programme.id}`}
                        disabled={busy || !view.installed}
                        onClick={() => void run(() => loadOverrides(view))}
                      >
                        Show overrides
                      </Button>
                      <Button
                        size="xs"
                        variant="ghost"
                        data-testid={`add-override-${view.programme.id}`}
                        disabled={busy || !view.installed}
                        onClick={() => setOverrideTarget(view.programme.id)}
                      >
                        Add override
                      </Button>
                    </div>

                    {overrideList.length > 0 && (
                      <ul className="mt-2 space-y-1 text-xs" data-testid={`overrides-${view.programme.id}`}>
                        {overrideList.map((entry) => (
                          <li key={entry.path} data-testid={`override-${entry.path}`}>
                            <code>{entry.path}</code> — recorded by {entry.actor ?? 'an unknown actor'}
                            {entry.at ? ` at ${entry.at}` : ''}
                            <Button
                              size="xs"
                              variant="ghost"
                              data-testid={`revert-override-${entry.path}`}
                              disabled={busy}
                              onClick={() => void revertOverride(view, entry.path)}
                            >
                              Revert
                            </Button>
                          </li>
                        ))}
                      </ul>
                    )}

                    {overrideTarget === view.programme.id && (
                      <div className="mt-2 space-y-2" data-testid={`override-form-${view.programme.id}`}>
                        <Input
                          aria-label="Override path"
                          placeholder="e.g. grading_scales.kcse_subject.bands"
                          value={overridePath}
                          onChange={(event) => setOverridePath(event.target.value)}
                        />
                        <textarea
                          aria-label="Override value (JSON)"
                          className="w-full rounded-md border border-surface-border bg-surface px-3 py-2 font-mono text-xs"
                          rows={3}
                          placeholder='[{"code":"A","label":"A","min":80,"max":100}]'
                          value={overrideValue}
                          onChange={(event) => setOverrideValue(event.target.value)}
                        />
                        <Input
                          aria-label="Override reason"
                          placeholder="Why this override (recorded with the actor and time)"
                          value={overrideReason}
                          onChange={(event) => setOverrideReason(event.target.value)}
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            data-testid={`save-override-${view.programme.id}`}
                            disabled={busy}
                            onClick={() => void saveOverride(view)}
                          >
                            Record override
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setOverrideTarget(null)}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {error && (
          <p role="alert" className="mt-3 text-sm text-red-600 dark:text-red-400" data-testid="programmes-error">
            {error}
          </p>
        )}
        {notice && (
          <p className="mt-3 text-sm text-green-700 dark:text-green-400" data-testid="programmes-notice">
            {notice}
          </p>
        )}
      </Card>
    </div>
  );
};

/**
 * The route entry: wraps itself in the canonical provider (the module hub does not hand one down),
 * reads the programmes and the packs the installation ships, and renders the content.
 */
const ProgrammesInner: React.FC = () => {
  const repository = useCanonicalRepository();
  const packs = useMemo(() => listAvailablePacks(), []);
  const users = useEntityQuery(repository, 'user', { limit: 1 });
  const generated = useMemo(() => generateUuidv7(), []);
  const actor = users.data?.items[0]?.id ?? generated;

  if (typeof (repository as { readonly transaction?: unknown }).transaction !== 'function') {
    return (
      <p role="alert" className="text-sm text-red-600 dark:text-red-400">
        The canonical repository does not support writes, so programmes cannot be managed here.
      </p>
    );
  }
  return (
    <ProgrammesPageContent repository={repository as unknown as Repository} packs={packs} actor={actor} />
  );
};

const ProgrammesPage: React.FC = () => (
  <CanonicalRepositoryProvider>
    <ProgrammesInner />
  </CanonicalRepositoryProvider>
);

export default ProgrammesPage;
