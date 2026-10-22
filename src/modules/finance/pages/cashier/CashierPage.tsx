// ABOUTME: The cashier screen of spec 05 §5.2: a payment taken with the keyboard alone - search the
// ABOUTME: learner, amount, channel, reference, Enter, print - inside an open cashier session, with
// ABOUTME: the flow's own elapsed time measured and shown against the spec's twenty-second budget.

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { parseMoneyInput } from '@/components/ui/forms/MoneyField';
import { asId } from '@/domain/ids';
import {
  CASHIER_FLOW_BUDGET_MS,
  CHANNEL_LABELS,
  PAYMENT_CHANNEL_VALUES,
  applyCashierFlowAction,
  canSubmitCashierFlow,
  elapsedMs,
  elapsedSeconds,
  initialCashierFlow,
  isCashChannel,
  isPositiveAmountText,
  type CashierFlowAction,
  type CashierFlowContext,
  type CashierFlowState,
  type ReceiptView,
  type ZReport,
} from '@/domain/finance/payments';

import { CanonicalRepositoryProvider } from '../../data/canonicalRepository';
import {
  FINANCE_CURRENCY,
  currencyDigits,
  formatMoney,
  useCanonicalFinance,
} from '../../data/canonicalFinance';
import { useCashierRuntimePort, type CashierPaymentsPort } from './runtime';

const errorText = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

export interface CashierPageContentProps {
  /** The payments the screen writes through. Defaults to the canonical runtime. */
  readonly port?: CashierPaymentsPort;
  /**
   * The cashier's name, for the receipt and the session.
   *
   * The app's sign-in reads the legacy `users` collection, whose ids are not canonical `user` rows,
   * so the shell supplies the name rather than the screen resolving it. Without one the receipt's
   * cashier line is blank and the session is owned by the placeholder id.
   */
  readonly cashierName?: string;
  /** The cashier's id, for the session. Never written to `payment.cashier_user_id`, which is a
   *  foreign key to the canonical `user`. */
  readonly cashierUserId?: string;
}

/**
 * The cashier's screen.
 *
 * The flow is the pure reducer of the payments core, so the screen holds no flow logic of its own:
 * every keystroke is an action, and the model has no pointer action at all. The screen records the
 * wall clock from the first keystroke to the saved receipt and renders it, so the spec's
 * twenty-second budget is a measured number rather than a claim.
 */
export const CashierPageContent: React.FC<CashierPageContentProps> = ({
  port: injected,
  cashierName = '',
  cashierUserId = 'cashier',
}) => {
  const finance = useCanonicalFinance();
  const runtimePort = useCashierRuntimePort();
  const port = injected ?? runtimePort;

  const [flow, setFlow] = useState<CashierFlowState>(() => initialCashierFlow());
  const [session, setSession] = useState<CashierSessionState>(null);
  const [floatText, setFloatText] = useState('');
  const [countedText, setCountedText] = useState('');
  const [receipt, setReceipt] = useState<ReceiptView | null>(null);
  const [report, setReport] = useState<ZReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [elapsed, setElapsed] = useState<number | null>(null);

  const flowRef = useRef(flow);
  flowRef.current = flow;
  const startedAtRef = useRef<number | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const amountRef = useRef<HTMLInputElement>(null);
  const channelRef = useRef<HTMLDivElement>(null);
  const referenceRef = useRef<HTMLInputElement>(null);
  const printRef = useRef<HTMLButtonElement>(null);

  const matches = useMemo(() => {
    const query = flow.learnerQuery.trim().toLowerCase();
    const rows = finance.learnerRows.filter((learner) => {
      if (query === '') return true;
      return (
        learner.name.toLowerCase().includes(query) ||
        learner.admissionNumber.toLowerCase().includes(query)
      );
    });
    return rows.slice(0, 8).map((learner) => ({
      id: learner.id,
      label: `${learner.name} · ${learner.admissionNumber}`,
    }));
  }, [finance.learnerRows, flow.learnerQuery]);

  const context = useMemo<CashierFlowContext>(
    () => ({ matches, channels: PAYMENT_CHANNEL_VALUES }),
    [matches]
  );
  const contextRef = useRef(context);
  contextRef.current = context;

  const dispatch = useCallback((action: CashierFlowAction) => {
    setFlow((current) => applyCashierFlowAction(current, action, contextRef.current));
  }, []);

  // The keyboard flow starts on the learner search and returns there for the next payment.
  useEffect(() => {
    if (flow.step === 'learner') searchRef.current?.focus();
    else if (flow.step === 'amount') amountRef.current?.focus();
    else if (flow.step === 'channel') channelRef.current?.focus();
    else if (flow.step === 'reference') referenceRef.current?.focus();
    else if (flow.step === 'print') printRef.current?.focus();
  }, [flow.step]);

  const recordElapsed = useCallback(() => {
    if (startedAtRef.current === null) return;
    setElapsed(elapsedMs({ startedAt: startedAtRef.current, finishedAt: performance.now() }));
    startedAtRef.current = null;
  }, []);

  const save = useCallback(async () => {
    const state = flowRef.current;
    if (!port) {
      setError('The payments service is not ready yet.');
      return;
    }
    if (!state.learnerId || !isPositiveAmountText(state.amountText)) {
      setError('Choose the learner and enter an amount greater than zero.');
      return;
    }
    const parsed = parseMoneyInput(state.amountText, {
      minorUnitDigits: currencyDigits(FINANCE_CURRENCY),
      allowNegative: false,
    });
    if (!parsed.ok) {
      setError('Enter a valid amount.');
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const recorded = await port.recordPayment({
        learnerId: asId<'learner'>(state.learnerId),
        amount: { amount_minor: parsed.amountMinor, currency: FINANCE_CURRENCY },
        channel: state.channel,
        ...(state.reference.trim() ? { reference: state.reference.trim() } : {}),
        ...(cashierName ? { cashierName } : {}),
        ...(session ? { sessionId: session.id } : {}),
      });
      recordElapsed();
      setReceipt(recorded.receiptView);
      dispatch({ type: 'submit' });
    } catch (failure) {
      setError(errorText(failure));
    } finally {
      setBusy(false);
    }
  }, [port, cashierName, session, dispatch, recordElapsed]);

  const completePrint = useCallback(() => {
    dispatch({ type: 'print' });
    setFlow(initialCashierFlow(flowRef.current.channel));
  }, [dispatch]);

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (startedAtRef.current === null) startedAtRef.current = performance.now();
    const state = flowRef.current;

    if (state.step === 'learner' && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
      event.preventDefault();
      dispatch({ type: 'move', delta: event.key === 'ArrowDown' ? 1 : -1 });
      return;
    }
    if (state.step === 'channel' && /^[1-6]$/.test(event.key)) {
      event.preventDefault();
      const channel = PAYMENT_CHANNEL_VALUES[Number(event.key) - 1];
      if (channel) dispatch({ type: 'channel', channel });
      return;
    }
    if (event.key !== 'Enter') return;
    event.preventDefault();
    if (state.step === 'learner' || state.step === 'amount') {
      dispatch({ type: 'accept' });
      return;
    }
    if (state.step === 'reference' || state.step === 'save') {
      void save();
      return;
    }
    if (state.step === 'print') completePrint();
  };

  const openSession = async () => {
    if (!port) return;
    const parsed = parseMoneyInput(floatText === '' ? '0' : floatText, {
      minorUnitDigits: currencyDigits(FINANCE_CURRENCY),
      allowNegative: false,
    });
    if (!parsed.ok) {
      setError('Enter a valid opening float.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const opened = await port.openSession({
        institutionId: asId<'institution'>(finance.learners[0]?.institution_id ?? ''),
        cashierUserId: cashierUserId || 'cashier',
        ...(cashierName ? { cashierName } : {}),
        openingFloat: { amount_minor: parsed.amountMinor, currency: FINANCE_CURRENCY },
      });
      setSession(opened);
      setReport(null);
      // The next payment starts at the search, without a pointer.
      searchRef.current?.focus();
    } catch (failure) {
      setError(errorText(failure));
    } finally {
      setBusy(false);
    }
  };

  const closeSession = async () => {
    if (!port || !session) return;
    const parsed = parseMoneyInput(countedText === '' ? '0' : countedText, {
      minorUnitDigits: currencyDigits(FINANCE_CURRENCY),
      allowNegative: false,
    });
    if (!parsed.ok) {
      setError('Enter a valid counted cash.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const closed = await port.closeSession({
        sessionId: session.id,
        countedCash: { amount_minor: parsed.amountMinor, currency: FINANCE_CURRENCY },
      });
      setSession(closed.session);
      setReport(closed.report);
      searchRef.current?.focus();
    } catch (failure) {
      setError(errorText(failure));
    } finally {
      setBusy(false);
    }
  };

  const selectedLearner = matches.find((match) => match.id === flow.learnerId) ?? null;
  const withinBudget = elapsed !== null && elapsed <= CASHIER_FLOW_BUDGET_MS;

  return (
    <div className="space-y-4" data-testid="cashier-page">
      <Card
        title="Cashier"
        subtitle="Take a payment with the keyboard alone: search the learner, the amount, the channel, the reference, Enter, print."
        actions={
          <span className="text-sm text-surface-muted-fg">
            {port ? 'Ready' : 'Opening the payments service…'}
          </span>
        }
      >
        <div className="flex flex-wrap items-center gap-3" data-testid="cashier-session">
          {session && session.status === 'open' ? (
            <>
              <span className="text-sm text-surface-foreground">
                Session open · float {formatMoney(session.openingFloat)}
              </span>
              <label className="text-sm text-surface-muted-fg" htmlFor="cashier-counted">
                Counted cash
              </label>
              <input
                id="cashier-counted"
                data-testid="cashier-counted"
                className="h-9 w-32 rounded-lg border border-surface-input bg-surface-card px-2 text-sm"
                value={countedText}
                onChange={(event) => setCountedText(event.target.value)}
                inputMode="decimal"
                placeholder="0.00"
              />
              <Button
                size="sm"
                variant="secondary"
                data-testid="cashier-close-session"
                onClick={() => void closeSession()}
                disabled={busy}
              >
                Close session
              </Button>
            </>
          ) : (
            <>
              <span className="text-sm text-surface-foreground">
                {session
                  ? `Session closed · variance ${formatMoney(session.variance ?? session.openingFloat)}`
                  : 'No open session'}
              </span>
              <label className="text-sm text-surface-muted-fg" htmlFor="cashier-float">
                Opening float
              </label>
              <input
                id="cashier-float"
                data-testid="cashier-float"
                className="h-9 w-32 rounded-lg border border-surface-input bg-surface-card px-2 text-sm"
                value={floatText}
                onChange={(event) => setFloatText(event.target.value)}
                inputMode="decimal"
                placeholder="0.00"
              />
              <Button
                size="sm"
                variant="secondary"
                data-testid="cashier-open-session"
                onClick={() => void openSession()}
                disabled={busy || !port}
              >
                Open session
              </Button>
            </>
          )}
        </div>
      </Card>

      <Card title="Take a payment">
        {/* One keydown handler for the whole form: every field's keystrokes are the flow's actions. */}
        <div className="space-y-4" onKeyDown={onKeyDown}>
          <div className="flex flex-wrap items-center gap-4 text-xs text-surface-muted-fg">
            <span data-testid="cashier-flow-step" data-step={flow.step}>
              Step: {flow.step}
            </span>
            <span data-testid="cashier-flow-keystrokes">{flow.keystrokes} keystrokes</span>
            <span
              data-testid="cashier-flow-elapsed"
              data-elapsed-ms={elapsed ?? ''}
              data-within-budget={elapsed === null ? '' : String(withinBudget)}
            >
              {elapsed === null
                ? `Last payment: — (budget ${elapsedSeconds({ startedAt: 0, finishedAt: CASHIER_FLOW_BUDGET_MS })} s)`
                : `Last payment: ${(elapsed / 1000).toFixed(2)} s`}
            </span>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium" htmlFor="cashier-learner">
              Learner (admission number, name)
            </label>
            <input
              id="cashier-learner"
              ref={searchRef}
              data-testid="cashier-learner-search"
              className="h-10 w-full rounded-lg border border-surface-input bg-surface-card px-3 text-sm"
              value={flow.learnerQuery}
              onChange={(event) => dispatch({ type: 'setText', value: event.target.value })}
              autoComplete="off"
              placeholder="ADM/2027/001"
              aria-autocomplete="list"
              aria-controls="cashier-learner-matches"
            />
            {flow.step === 'learner' ? (
              <ul
                id="cashier-learner-matches"
                role="listbox"
                className="mt-1 max-h-56 overflow-y-auto rounded-lg border border-surface-border"
              >
                {matches.map((match, index) => (
                  <li
                    key={match.id}
                    role="option"
                    aria-selected={index === flow.highlighted}
                    data-testid={`cashier-learner-option-${index}`}
                    className={`cursor-pointer px-3 py-1.5 text-sm ${
                      index === flow.highlighted ? 'bg-primary-50 dark:bg-primary-900/30' : ''
                    }`}
                    onClick={() => dispatch({ type: 'select', learnerId: match.id })}
                  >
                    {match.label}
                  </li>
                ))}
                {matches.length === 0 ? (
                  <li className="px-3 py-1.5 text-sm text-surface-muted-fg">No learner matches.</li>
                ) : null}
              </ul>
            ) : (
              <p className="mt-1 text-sm text-surface-foreground">
                {selectedLearner?.label ?? '—'}
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium" htmlFor="cashier-amount">
                Amount
              </label>
              <input
                id="cashier-amount"
                ref={amountRef}
                data-testid="cashier-amount"
                className="h-10 w-40 rounded-lg border border-surface-input bg-surface-card px-3 text-sm"
                value={flow.amountText}
                onChange={(event) => dispatch({ type: 'setText', value: event.target.value })}
                inputMode="decimal"
                autoComplete="off"
                placeholder="0.00"
              />
            </div>
            <div>
              <span className="mb-1.5 block text-sm font-medium">Channel</span>
              <div
                ref={channelRef}
                tabIndex={0}
                role="radiogroup"
                aria-label="Payment channel"
                className="flex flex-wrap gap-1 rounded-lg border border-surface-border p-1 focus:outline-none focus:ring-2 focus:ring-primary-500/40"
              >
                {PAYMENT_CHANNEL_VALUES.map((channel, index) => (
                  <button
                    key={channel}
                    type="button"
                    role="radio"
                    aria-checked={channel === flow.channel}
                    data-testid={`cashier-channel-${channel}`}
                    className={`rounded-md px-2 py-1 text-xs ${
                      channel === flow.channel
                        ? 'bg-primary-600 text-white'
                        : 'bg-surface-muted text-surface-foreground'
                    }`}
                    onClick={() => dispatch({ type: 'channel', channel })}
                  >
                    {index + 1} {CHANNEL_LABELS[channel]}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium" htmlFor="cashier-reference">
                Reference
              </label>
              <input
                id="cashier-reference"
                ref={referenceRef}
                data-testid="cashier-reference"
                className="h-10 w-48 rounded-lg border border-surface-input bg-surface-card px-3 text-sm"
                value={flow.reference}
                onChange={(event) => dispatch({ type: 'setText', value: event.target.value })}
                autoComplete="off"
                placeholder={isCashChannel(flow.channel) ? 'optional' : 'required'}
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              data-testid="cashier-save"
              onClick={() => void save()}
              disabled={busy || !port || !canSubmitCashierFlow(flow)}
            >
              Save (Enter)
            </Button>
            <span className="text-xs text-surface-muted-fg">
              Digits 1–6 choose the channel; Enter moves on.
            </span>
          </div>

          {error ? (
            <p role="alert" data-testid="cashier-error" className="text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          ) : null}
        </div>
      </Card>

      {receipt ? (
        <Card
          title={`Receipt ${receipt.number}`}
          actions={
            <Button
              ref={printRef}
              data-testid="cashier-print"
              size="sm"
              onClick={completePrint}
              onKeyDown={(event: React.KeyboardEvent<HTMLButtonElement>) => {
                // The card's header sits outside the form's keydown wrapper, so Enter is handled here.
                if (event.key !== 'Enter') return;
                event.preventDefault();
                completePrint();
              }}
            >
              Print receipt (Enter)
            </Button>
          }
        >
          <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm" data-testid="cashier-receipt">
            <dt className="text-surface-muted-fg">Payer</dt>
            <dd>{receipt.payer || '—'}</dd>
            <dt className="text-surface-muted-fg">Learner</dt>
            <dd>{receipt.learners.join(', ') || '—'}</dd>
            <dt className="text-surface-muted-fg">Amount</dt>
            <dd className="font-mono">{formatMoney(receipt.amount)}</dd>
            <dt className="text-surface-muted-fg">In words</dt>
            <dd>{receipt.amountInWords}</dd>
            <dt className="text-surface-muted-fg">Channel</dt>
            <dd>{receipt.channelLabel}</dd>
            <dt className="text-surface-muted-fg">Reference</dt>
            <dd>{receipt.reference ?? '—'}</dd>
            <dt className="text-surface-muted-fg">Allocated</dt>
            <dd>
              {receipt.allocationByVoteHead.length === 0
                ? 'Unallocated (learner credit)'
                : receipt.allocationByVoteHead
                    .map((line) => `${line.label} ${formatMoney(line.amount)}`)
                    .join(', ')}
            </dd>
            <dt className="text-surface-muted-fg">Balance after</dt>
            <dd className="font-mono">{formatMoney(receipt.balanceAfter)}</dd>
            <dt className="text-surface-muted-fg">Cashier</dt>
            <dd>{receipt.cashier || '—'}</dd>
          </dl>
        </Card>
      ) : null}

      {report ? (
        <Card title={`Z-report · ${report.session.id.slice(0, 8)}`} data-testid="cashier-zreport">
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
                <tr key={line.channel} data-testid={`cashier-zreport-${line.channel}`}>
                  <td className="py-1">{line.label}</td>
                  <td className="py-1 text-right">{line.count}</td>
                  <td className="py-1 text-right font-mono">{formatMoney(line.amount)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td className="pt-2 font-medium">Total</td>
                <td className="pt-2 text-right">{report.paymentCount}</td>
                <td className="pt-2 text-right font-mono">{formatMoney(report.total)}</td>
              </tr>
              <tr>
                <td className="font-medium">Expected cash</td>
                <td />
                <td className="text-right font-mono">{formatMoney(report.expectedCash)}</td>
              </tr>
              <tr>
                <td className="font-medium">Counted cash</td>
                <td />
                <td className="text-right font-mono">
                  {report.countedCash ? formatMoney(report.countedCash) : '—'}
                </td>
              </tr>
              <tr>
                <td className="font-medium">Variance</td>
                <td />
                <td className="text-right font-mono" data-testid="cashier-zreport-variance">
                  {report.variance ? formatMoney(report.variance) : '—'}
                </td>
              </tr>
            </tfoot>
          </table>
        </Card>
      ) : null}
    </div>
  );
};

/** The session the screen holds, or null before one is opened. */
type CashierSessionState = Awaited<ReturnType<CashierPaymentsPort['openSession']>> | null;

const CashierPage: React.FC = () => (
  <CanonicalRepositoryProvider>
    <CashierPageContent />
  </CanonicalRepositoryProvider>
);

export default CashierPage;
