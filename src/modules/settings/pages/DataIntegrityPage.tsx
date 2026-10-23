// ABOUTME: Settings page that runs the integrity checks over the canonical tables, groups the
// ABOUTME: findings by kind, shows what each proposed fix would do and applies only the fixes
// ABOUTME: the user consents to.

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { PageHeaderWithTabs } from '@/components/ui/PageHeaderWithTabs';
import {
  AlertTriangleIcon,
  CheckCircleIcon,
  InformationCircleIcon,
  RefreshCwIcon,
  ShieldCheckIcon,
} from '@/components/ui/icons';
import type { SqliteAdapter } from '@/data/adapters/sqlite';
import {
  applyIntegrityFixes,
  findingsByKind,
  runIntegrityReport,
  type IntegrityFinding,
  type IntegrityFindingKind,
  type IntegrityOption,
  type IntegrityReport,
  type RepairResult,
} from '@/domain/repair';

export interface DataIntegrityPageProps {
  /** The storage the checks run against. */
  readonly adapter?: SqliteAdapter;
  /** The acting user, recorded on every change. */
  readonly actor?: string;
}

/** The kinds of finding, in the order the report groups them. */
const KINDS: readonly { readonly kind: IntegrityFindingKind; readonly label: string }[] = [
  { kind: 'orphan_reference', label: 'Orphan references' },
  { kind: 'malformed_reference', label: 'Malformed references' },
  { kind: 'null_stream', label: 'Missing class groups' },
  { kind: 'duplicate_id', label: 'Duplicate ids' },
];

/** A DOM-safe id for a finding, so a label can point at its control. */
function domId(findingId: string): string {
  return `integrity-${findingId.replace(/[^a-zA-Z0-9_-]/g, '-')}`;
}

/** How many unavailable choices the page lists before it counts the rest. */
const UNAVAILABLE_LIMIT = 10;

/** The choices of a finding that cannot be made, with the reason. */
function unavailableOptions(finding: IntegrityFinding): readonly IntegrityOption[] {
  return (finding.fix?.options ?? []).filter((option) => !option.selectable);
}

/** The message of a failure, without the stack. */
function messageOf(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

/**
 * The data integrity page.
 *
 * The page reports first and repairs second: the checks only read, and a fix runs only for
 * a finding the user ticked. A dry run says what would change without touching anything.
 */
export const DataIntegrityContent: React.FC<DataIntegrityPageProps> = ({ adapter, actor }) => {
  const { t } = useTranslation('common');
  const confirm = useConfirm();

  const [report, setReport] = useState<IntegrityReport | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [consented, setConsented] = useState<readonly string[]>([]);
  const [decisions, setDecisions] = useState<Readonly<Record<string, string>>>({});
  const [preview, setPreview] = useState<RepairResult | null>(null);
  const [result, setResult] = useState<RepairResult | null>(null);
  const [busy, setBusy] = useState(false);
  const outcomeRef = useRef<HTMLDivElement>(null);

  const runChecks = useCallback(async () => {
    if (!adapter) return;
    setRunning(true);
    setError(null);
    try {
      const next = await runIntegrityReport(adapter);
      setReport(next);
      // The findings are new, so the old consent does not answer for them.
      setConsented([]);
      setDecisions({});
      setPreview(null);
    } catch (failure) {
      setError(messageOf(failure));
    } finally {
      setRunning(false);
    }
  }, [adapter]);

  useEffect(() => {
    void runChecks();
  }, [runChecks]);

  const grouped = useMemo(() => (report ? findingsByKind(report) : null), [report]);
  const total = report?.findings.length ?? 0;

  const toggle = (finding: IntegrityFinding) => {
    setConsented((current) =>
      current.includes(finding.id)
        ? current.filter((id) => id !== finding.id)
        : [...current, finding.id]
    );
  };

  const decide = (findingId: string, value: string) => {
    setDecisions((current) => ({ ...current, [findingId]: value }));
  };

  const previewChanges = async () => {
    if (!adapter || !report) return;
    const planned = await applyIntegrityFixes({
      adapter,
      report,
      consent: { findingIds: consented, decisions },
      dryRun: true,
    });
    setPreview(planned);
  };

  const applyChanges = async () => {
    if (!adapter || !report || consented.length === 0) return;
    const confirmed = await confirm({
      title: t('integrity.applyTitle', 'Apply the fixes'),
      message: t(
        'integrity.applyMessage',
        '{{count}} changes will be written to the database. Every change is recorded in the audit trail.',
        { count: consented.length }
      ),
      confirmLabel: t('integrity.confirmApply', 'Yes, apply them'),
      variant: 'warning',
    });
    if (!confirmed) return;

    setBusy(true);
    try {
      const applied = await applyIntegrityFixes({
        adapter,
        report,
        consent: { findingIds: consented, decisions },
        actor,
      });
      setResult(applied);
      setPreview(null);
      await runChecks();
      outcomeRef.current?.focus();
    } catch (failure) {
      setError(messageOf(failure));
    } finally {
      setBusy(false);
    }
  };

  if (!adapter) {
    return (
      <div className="space-y-3">
        <PageHeaderWithTabs title={t('integrity.title', 'Data integrity')} />
        <Card title={t('integrity.notConnectedTitle', 'The data layer is not connected')}>
          <p className="text-sm text-surface-muted-fg">
            {t(
              'integrity.notConnected',
              'The checks read the canonical tables of the new data layer, which is not connected to this page yet.'
            )}
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <PageHeaderWithTabs
        title={t('integrity.title', 'Data integrity')}
        info={t(
          'integrity.subtitle',
          'The checks look for references that point at a row that is not there, references that do not hold an id, learners without a class group and ids that are used twice. Nothing is changed until you agree to a fix.'
        )}
        action={
          <Button
            onClick={() => void runChecks()}
            variant="outline"
            loading={running}
            leftIcon={<RefreshCwIcon className="h-4 w-4" />}
          >
            {t('integrity.checkAgain', 'Check again')}
          </Button>
        }
      />

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {t('integrity.failed', 'The checks could not run: {{error}}', { error })}
        </div>
      )}

      {running && !report && (
        <div className="flex items-center justify-center py-10 text-surface-muted-fg">
          <RefreshCwIcon className="mr-2 h-5 w-5 animate-spin" aria-hidden="true" />
          {t('integrity.running', 'Checking the database…')}
        </div>
      )}

      {report && (
        <>
          <Card title={t('integrity.summary', 'Summary')}>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
              <div>
                <div className="text-xs uppercase tracking-wide text-surface-muted-fg">
                  {t('integrity.total', 'Findings')}
                </div>
                <div className="mt-1 text-2xl font-semibold">{total}</div>
              </div>
              {KINDS.map(({ kind, label }) => (
                <div key={kind}>
                  <div className="text-xs uppercase tracking-wide text-surface-muted-fg">
                    {t(`integrity.kinds.${kind}`, label)}
                  </div>
                  <div className="mt-1 text-2xl font-semibold">{grouped?.[kind].length ?? 0}</div>
                </div>
              ))}
            </div>
          </Card>

          <div
            ref={outcomeRef}
            tabIndex={-1}
            aria-live="polite"
            className="space-y-4 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            {result && (
              <Card title={t('integrity.outcome', 'What was changed')} data-testid="integrity-outcome">
                {result.changes.length === 0 ? (
                  <p className="text-sm text-surface-muted-fg">
                    {t('integrity.outcomeNone', 'Nothing was changed.')}
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {result.changes.map((change) => (
                      <li key={change.findingId} className="flex items-start gap-2 text-sm">
                        <CheckCircleIcon
                          className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600"
                          aria-hidden="true"
                        />
                        <span>
                          {change.description}
                          <span className="block text-xs text-surface-muted-fg">
                            {change.entity} · {change.table}.{change.column}
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                {result.skipped.length > 0 && (
                  <div className="mt-4 border-t border-surface-border pt-3">
                    <h3 className="text-sm font-semibold">
                      {t('integrity.skipped', 'What was not changed')}
                    </h3>
                    <ul className="mt-2 space-y-1">
                      {result.skipped.map((skip) => (
                        <li key={skip.findingId} className="flex items-start gap-2 text-sm">
                          <AlertTriangleIcon
                            className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600"
                            aria-hidden="true"
                          />
                          <span>{skip.reason}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </Card>
            )}

            {preview && (
              <Card title={t('integrity.preview', 'What would change')} data-testid="integrity-preview">
                {preview.changes.length === 0 ? (
                  <p className="text-sm text-surface-muted-fg">
                    {t('integrity.previewNone', 'Nothing would change.')}
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {preview.changes.map((change) => (
                      <li key={change.findingId} className="flex items-start gap-2 text-sm">
                        <InformationCircleIcon
                          className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary-600"
                          aria-hidden="true"
                        />
                        <span>{change.description}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            )}
          </div>

          {total === 0 ? (
            <Card>
              <div className="flex items-center gap-3">
                <ShieldCheckIcon className="h-6 w-6 text-green-600" aria-hidden="true" />
                <p className="text-sm text-surface-foreground">
                  {t(
                    'integrity.clean',
                    'The checks found nothing. Every reference of the canonical tables resolves.'
                  )}
                </p>
              </div>
            </Card>
          ) : (
            <>
              {KINDS.map(({ kind, label }) => {
                const findings = grouped?.[kind] ?? [];
                if (findings.length === 0) return null;
                return (
                  <Card key={kind} title={`${t(`integrity.kinds.${kind}`, label)} (${findings.length})`}>
                    <ul className="space-y-4">
                      {findings.map((finding) => (
                        <li
                          key={finding.id}
                          className="rounded-lg border border-surface-border p-4"
                        >
                          <div className="flex items-start gap-3">
                            <input
                              id={domId(finding.id)}
                              type="checkbox"
                              className="mt-1 h-4 w-4 rounded border-surface-border text-primary-600"
                              checked={consented.includes(finding.id)}
                              disabled={!finding.fix}
                              onChange={() => toggle(finding)}
                              aria-describedby={`${domId(finding.id)}-details`}
                            />
                            <div className="min-w-0 flex-1">
                              <label
                                htmlFor={domId(finding.id)}
                                className="block text-sm font-medium text-surface-foreground"
                              >
                                {finding.message}
                              </label>

                              <dl
                                id={`${domId(finding.id)}-details`}
                                className="mt-2 grid grid-cols-1 gap-x-6 gap-y-1 text-xs text-surface-muted-fg sm:grid-cols-2"
                              >
                                <div>
                                  <dt className="inline font-medium">Entity:</dt>{' '}
                                  <dd className="inline">{finding.entity}</dd>
                                </div>
                                <div>
                                  <dt className="inline font-medium">Column:</dt>{' '}
                                  <dd className="inline">{finding.column}</dd>
                                </div>
                                <div>
                                  <dt className="inline font-medium">Value:</dt>{' '}
                                  <dd className="inline font-mono">
                                    {finding.value ?? t('integrity.empty', '(empty)')}
                                  </dd>
                                </div>
                                <div>
                                  <dt className="inline font-medium">Row:</dt>{' '}
                                  <dd className="inline font-mono break-all">{finding.rowId}</dd>
                                </div>
                              </dl>

                              {finding.fix && (
                                <p className="mt-2 text-sm text-surface-muted-fg">
                                  <span className="font-medium text-surface-foreground">
                                    {t('integrity.proposedFix', 'Proposed fix:')}
                                  </span>{' '}
                                  {finding.fix.description}
                                </p>
                              )}

                              {finding.needs && (
                                <p className="mt-1 text-sm text-amber-700">
                                  {t('integrity.needs', 'The tool needs {{what}}.', {
                                    what: finding.needs,
                                  })}
                                </p>
                              )}

                              {finding.fix && finding.fix.options.length > 0 && (
                                <div className="mt-3">
                                  <label
                                    htmlFor={`${domId(finding.id)}-decision`}
                                    className="block text-sm font-medium text-surface-foreground"
                                  >
                                    {finding.fix.needs}
                                  </label>
                                  <select
                                    id={`${domId(finding.id)}-decision`}
                                    className="mt-1 w-full rounded-lg border border-surface-border px-3 py-2 text-sm sm:max-w-md"
                                    value={decisions[finding.id] ?? ''}
                                    onChange={(event) => decide(finding.id, event.target.value)}
                                  >
                                    <option value="">
                                      {t('integrity.choose', 'Choose…')}
                                    </option>
                                    {finding.fix.options.map((option) => (
                                      <option
                                        key={option.id}
                                        value={option.id}
                                        disabled={!option.selectable}
                                        title={option.reason ?? undefined}
                                      >
                                        {option.label}
                                        {option.selectable
                                          ? ''
                                          : ` — ${t('integrity.notAvailable', 'not available')}`}
                                      </option>
                                    ))}
                                  </select>
                                  {unavailableOptions(finding).length > 0 && (
                                    <details className="mt-2 text-xs text-surface-muted-fg">
                                      <summary className="cursor-pointer">
                                        {t(
                                          'integrity.unavailableCount',
                                          '{{count}} choices are not available',
                                          { count: unavailableOptions(finding).length }
                                        )}
                                      </summary>
                                      <ul className="mt-1 list-disc space-y-1 pl-5">
                                        {unavailableOptions(finding)
                                          .slice(0, UNAVAILABLE_LIMIT)
                                          .map((option) => (
                                            <li key={option.id}>
                                              {option.label} — {option.reason}
                                            </li>
                                          ))}
                                        {unavailableOptions(finding).length > UNAVAILABLE_LIMIT && (
                                          <li>
                                            {t(
                                              'integrity.unavailableMore',
                                              'and {{count}} more',
                                              { count: unavailableOptions(finding).length - UNAVAILABLE_LIMIT }
                                            )}
                                          </li>
                                        )}
                                      </ul>
                                    </details>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </Card>
                );
              })}

              <Card title={t('integrity.consent', 'The fixes you agreed to')}>
                <p className="text-sm text-surface-muted-fg">
                  {t('integrity.selected', '{{count}} selected', { count: consented.length })}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    onClick={() => void previewChanges()}
                    disabled={consented.length === 0 || busy}
                  >
                    {t('integrity.previewButton', 'Preview the changes')}
                  </Button>
                  <Button
                    onClick={() => void applyChanges()}
                    disabled={consented.length === 0 || busy}
                    loading={busy}
                  >
                    {t('integrity.apply', 'Apply the fixes')}
                  </Button>
                </div>
                {consented.length > 0 && (
                  <ul className="mt-4 space-y-1">
                    {consented.map((id) => {
                      const finding = report.findings.find((entry) => entry.id === id);
                      if (!finding) return null;
                      return (
                        <li key={id} className="flex items-center gap-2 text-sm">
                          <Badge variant="secondary">
                            {t(`integrity.kinds.${finding.kind}`, finding.kind)}
                          </Badge>
                          <span className="text-surface-muted-fg">{finding.message}</span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </Card>
            </>
          )}
        </>
      )}
    </div>
  );
};

const DataIntegrityPage: React.FC<DataIntegrityPageProps> = (props) => {
  return <DataIntegrityContent {...props} />;
};

export default DataIntegrityPage;
