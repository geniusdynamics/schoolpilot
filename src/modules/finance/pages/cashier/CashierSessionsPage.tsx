// ABOUTME: The cashier session view of spec 05 §5.1: the sessions a cashier held, and the Z-report
// ABOUTME: of one of them - its figures by channel, the expected cash, the counted cash and the
// ABOUTME: difference between them, stated rather than hidden.

import React, { useCallback, useEffect, useState } from 'react';

import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import type { CashierSession, ZReport } from '@/domain/finance/payments';

import { CanonicalRepositoryProvider } from '../../data/canonicalRepository';
import { formatMoney, useCanonicalFinance } from '../../data/canonicalFinance';
import { useCashierRuntimePort, type CashierPaymentsPort } from './runtime';

const errorText = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

export interface CashierSessionsPageContentProps {
  /** The payments the view reads through. Defaults to the canonical runtime. */
  readonly port?: CashierPaymentsPort;
}

/** The sessions a cashier held, with the Z-report of the one selected. */
export const CashierSessionsPageContent: React.FC<CashierSessionsPageContentProps> = ({
  port: injected,
}) => {
  const finance = useCanonicalFinance();
  const runtimePort = useCashierRuntimePort();
  const port = injected ?? runtimePort;

  const [sessions, setSessions] = useState<readonly CashierSession[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [report, setReport] = useState<ZReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  const institutionId = finance.learners[0]?.institution_id;

  const load = useCallback(async () => {
    if (!port) return;
    try {
      setSessions(await port.listSessions(institutionId ? { institutionId } : {}));
    } catch (failure) {
      setError(errorText(failure));
    }
  }, [port, institutionId]);

  useEffect(() => {
    void load();
  }, [load]);

  const openReport = async (sessionId: string) => {
    if (!port) return;
    setSelected(sessionId);
    setError(null);
    try {
      setReport(await port.zReport(sessionId));
    } catch (failure) {
      setError(errorText(failure));
    }
  };

  return (
    <div className="space-y-4" data-testid="cashier-sessions-page">
      <Card
        title="Cashier sessions"
        info="A session closes once. Its Z-report states the expected cash, the counted cash and the difference."
        actions={
          <Button size="sm" variant="secondary" onClick={() => void load()} disabled={!port}>
            Refresh
          </Button>
        }
      >
        {error ? (
          <p role="alert" className="mb-2 text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        ) : null}
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-surface-muted-fg">
              <th className="py-1">Opened</th>
              <th className="py-1">Cashier</th>
              <th className="py-1">Float</th>
              <th className="py-1">Status</th>
              <th className="py-1 text-right">Expected</th>
              <th className="py-1 text-right">Counted</th>
              <th className="py-1 text-right">Variance</th>
              <th className="py-1" />
            </tr>
          </thead>
          <tbody>
            {sessions.map((session) => (
              <tr
                key={session.id}
                data-testid={`cashier-session-row-${session.id}`}
                className={selected === session.id ? 'bg-primary-50 dark:bg-primary-900/30' : ''}
              >
                <td className="py-1">{session.openedAt.slice(0, 19).replace('T', ' ')}</td>
                <td className="py-1">{session.cashierName}</td>
                <td className="py-1 font-mono">{formatMoney(session.openingFloat)}</td>
                <td className="py-1">{session.status}</td>
                <td className="py-1 text-right font-mono">
                  {session.expectedCash ? formatMoney(session.expectedCash) : '—'}
                </td>
                <td className="py-1 text-right font-mono">
                  {session.countedCash ? formatMoney(session.countedCash) : '—'}
                </td>
                <td className="py-1 text-right font-mono">
                  {session.variance ? formatMoney(session.variance) : '—'}
                </td>
                <td className="py-1 text-right">
                  <Button
                    size="xs"
                    variant="ghost"
                    data-testid={`cashier-session-report-${session.id}`}
                    onClick={() => void openReport(session.id)}
                  >
                    Z-report
                  </Button>
                </td>
              </tr>
            ))}
            {sessions.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-2 text-surface-muted-fg">
                  No sessions yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </Card>

      {report ? (
        <Card title={`Z-report · ${report.session.id.slice(0, 8)}`} data-testid="cashier-session-report">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-surface-muted-fg">
                <th className="py-1">Channel</th>
                <th className="py-1 text-right">Count</th>
                <th className="py-1 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {report.lines.map((line) => (
                <tr key={line.channel}>
                  <td className="py-1">
                    {line.label}
                    {line.isCash ? ' (drawer)' : ''}
                  </td>
                  <td className="py-1 text-right">{line.count}</td>
                  <td className="py-1 text-right font-mono">{formatMoney(line.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
            <dt className="text-surface-muted-fg">Payments</dt>
            <dd>{report.paymentCount}</dd>
            <dt className="text-surface-muted-fg">Total taken</dt>
            <dd className="font-mono">{formatMoney(report.total)}</dd>
            <dt className="text-surface-muted-fg">Cash in the drawer</dt>
            <dd className="font-mono">{formatMoney(report.cashTotal)}</dd>
            <dt className="text-surface-muted-fg">Opening float</dt>
            <dd className="font-mono">{formatMoney(report.session.openingFloat)}</dd>
            <dt className="text-surface-muted-fg">Expected cash</dt>
            <dd className="font-mono">{formatMoney(report.expectedCash)}</dd>
            <dt className="text-surface-muted-fg">Counted cash</dt>
            <dd className="font-mono">
              {report.countedCash ? formatMoney(report.countedCash) : '—'}
            </dd>
            <dt className="text-surface-muted-fg">Variance</dt>
            <dd className="font-mono" data-testid="cashier-session-report-variance">
              {report.variance ? formatMoney(report.variance) : '—'}
            </dd>
            <dt className="text-surface-muted-fg">Generated</dt>
            <dd>{report.generatedAt.slice(0, 19).replace('T', ' ')}</dd>
          </dl>
        </Card>
      ) : null}
    </div>
  );
};

const CashierSessionsPage: React.FC = () => (
  <CanonicalRepositoryProvider>
    <CashierSessionsPageContent />
  </CanonicalRepositoryProvider>
);

export default CashierSessionsPage;
