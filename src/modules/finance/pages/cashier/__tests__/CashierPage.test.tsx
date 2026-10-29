// ABOUTME: The cashier screen against a repository double and an injected payments port: the flow
// ABOUTME: is driven by keystrokes alone, the elapsed time is measured and shown, a refusal keeps
// ABOUTME: the form, and a session is opened and closed from the same screen.

import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CanonicalRepositoryProvider } from '@/modules/finance/data/canonicalRepository';
import { createFinanceRepositoryDouble } from '@/modules/finance/data/__tests__/canonicalRepositoryDouble';
import type {
  CashierSession,
  RecordedPayment,
  ReceiptView,
  SessionClose,
  ZReport,
} from '@/domain/finance/payments';

import { CashierPageContent } from '../CashierPage';
import type { CashierPaymentsPort } from '../runtime';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => (typeof fallback === 'string' ? fallback : key),
  }),
}));

const INSTITUTION = '00000000-0000-7000-8000-000000000001';
const LEARNER = '00000000-0000-7000-8000-00000000001b';

const RECEIPT_VIEW: ReceiptView = {
  number: 'RCT/2027/000001',
  issuedAt: '2027-02-10T09:00:00.000Z',
  status: 'issued',
  payer: 'Amina Wanjiku',
  learners: ['Amina Wanjiku'],
  amount: { amount_minor: 150_000, currency: 'KES' },
  amountInWords: 'one thousand five hundred shillings',
  channel: 'cash',
  channelLabel: 'Cash',
  reference: null,
  allocationByVoteHead: [{ label: 'TUITION Tuition', amount: { amount_minor: 150_000, currency: 'KES' } }],
  balanceAfter: { amount_minor: 0, currency: 'KES' },
  cashier: 'Grace the cashier',
};

const OPEN_SESSION: CashierSession = {
  id: 'session-1',
  institutionId: INSTITUTION,
  cashierUserId: 'cashier-1',
  cashierName: 'Grace the cashier',
  currency: 'KES',
  openingFloat: { amount_minor: 50_000, currency: 'KES' },
  status: 'open',
  openedAt: '2027-02-10T08:00:00.000Z',
  closedAt: null,
  countedCash: null,
  expectedCash: null,
  variance: null,
  closeReason: null,
};

const CLOSED_SESSION: CashierSession = {
  ...OPEN_SESSION,
  status: 'closed',
  closedAt: '2027-02-10T17:00:00.000Z',
  countedCash: { amount_minor: 199_500, currency: 'KES' },
  expectedCash: { amount_minor: 200_000, currency: 'KES' },
  variance: { amount_minor: -500, currency: 'KES' },
};

const REPORT: ZReport = {
  session: CLOSED_SESSION,
  generatedAt: '2027-02-10T17:00:00.000Z',
  lines: [
    { channel: 'cash', label: 'Cash', count: 1, amount: { amount_minor: 150_000, currency: 'KES' }, isCash: true },
  ],
  total: { amount_minor: 150_000, currency: 'KES' },
  cashTotal: { amount_minor: 150_000, currency: 'KES' },
  paymentCount: 1,
  expectedCash: { amount_minor: 200_000, currency: 'KES' },
  countedCash: { amount_minor: 199_500, currency: 'KES' },
  variance: { amount_minor: -500, currency: 'KES' },
};

const RECORDED: RecordedPayment = {
  payment: { id: 'payment-1' } as never,
  receipt: { id: 'receipt-1', number: 'RCT/2027/000001' } as never,
  plan: { allocated: { amount_minor: 150_000, currency: 'KES' } } as never,
  receiptView: RECEIPT_VIEW,
  entry: null,
};

function port(overrides: Partial<CashierPaymentsPort> = {}): CashierPaymentsPort {
  return {
    recordPayment: vi.fn(async () => RECORDED),
    openSession: vi.fn(async () => OPEN_SESSION),
    closeSession: vi.fn(async (): Promise<SessionClose> => ({
      session: CLOSED_SESSION,
      reconciliation: {
        sessionId: CLOSED_SESSION.id,
        currency: 'KES',
        openingFloat: CLOSED_SESSION.openingFloat,
        cashTaken: { amount_minor: 150_000, currency: 'KES' },
        expectedCash: { amount_minor: 200_000, currency: 'KES' },
        countedCash: { amount_minor: 199_500, currency: 'KES' },
        variance: { amount_minor: -500, currency: 'KES' },
        balanced: false,
      },
      report: REPORT,
    })),
    nextReceiptNumber: vi.fn(async () => 'RCT/2027/000001'),
    session: vi.fn(async () => OPEN_SESSION),
    openSessionFor: vi.fn(async () => null),
    zReport: vi.fn(async () => REPORT),
    listSessions: vi.fn(async () => [OPEN_SESSION, CLOSED_SESSION]),
    ...overrides,
  };
}

const repository = () =>
  createFinanceRepositoryDouble({
    learner: [
      {
        id: LEARNER,
        institution_id: INSTITUTION,
        admission_number: 'ADM/2027/001',
        given_name: 'Amina',
        family_name: 'Wanjiku',
        name_order: 'given_first',
        gender: 'female',
        status: 'enrolled',
        residence_status: 'day',
      },
    ],
  });

const renderPage = (payments: CashierPaymentsPort) =>
  render(
    <MemoryRouter>
      <CanonicalRepositoryProvider repository={repository()}>
        <CashierPageContent port={payments} />
      </CanonicalRepositoryProvider>
    </MemoryRouter>
  );

let now = 0;
beforeEach(() => {
  now = 0;
  vi.spyOn(performance, 'now').mockImplementation(() => now);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

describe('the cashier screen', () => {
  it('takes a payment with keystrokes alone, and shows the receipt', async () => {
    const payments = port();
    renderPage(payments);

    const search = await screen.findByTestId('cashier-learner-search');
    // The first keystroke starts the clock; the flow itself is driven by the keyboard only.
    now = 1000;
    fireEvent.keyDown(search, { key: 'A' });
    fireEvent.change(search, { target: { value: 'ADM' } });
    expect(await screen.findByTestId('cashier-learner-option-0')).toHaveTextContent('Amina Wanjiku');

    fireEvent.keyDown(search, { key: 'Enter' });
    expect(screen.getByTestId('cashier-flow-step')).toHaveAttribute('data-step', 'amount');

    const amount = screen.getByTestId('cashier-amount');
    fireEvent.change(amount, { target: { value: '1500' } });
    fireEvent.keyDown(amount, { key: 'Enter' });
    expect(screen.getByTestId('cashier-flow-step')).toHaveAttribute('data-step', 'channel');

    const channels = screen.getByTestId('cashier-channel-cash');
    fireEvent.keyDown(channels, { key: '1' });
    expect(screen.getByTestId('cashier-flow-step')).toHaveAttribute('data-step', 'reference');

    now = 3400;
    fireEvent.keyDown(screen.getByTestId('cashier-reference'), { key: 'Enter' });

    await waitFor(() => expect(payments.recordPayment).toHaveBeenCalledTimes(1));
    expect(payments.recordPayment).toHaveBeenCalledWith(
      expect.objectContaining({
        learnerId: LEARNER,
        amount: { amount_minor: 150_000, currency: 'KES' },
        channel: 'cash',
      })
    );

    // The elapsed time is measured from the first keystroke, not asserted.
    const elapsed = await screen.findByTestId('cashier-flow-elapsed');
    expect(elapsed).toHaveAttribute('data-elapsed-ms', '2400');
    expect(elapsed).toHaveAttribute('data-within-budget', 'true');
    expect(elapsed).toHaveTextContent('Last payment: 2.40 s');

    const receipt = await screen.findByTestId('cashier-receipt');
    expect(screen.getByText(/RCT\/2027\/000001/)).toBeInTheDocument();
    expect(receipt).toHaveTextContent('one thousand five hundred shillings');
    expect(receipt).toHaveTextContent('KES 1,500.00');
    expect(screen.getByTestId('cashier-flow-step')).toHaveAttribute('data-step', 'print');

    // Enter on the print step finishes the flow and returns to the learner search.
    fireEvent.keyDown(screen.getByTestId('cashier-print'), { key: 'Enter' });
    expect(screen.getByTestId('cashier-flow-step')).toHaveAttribute('data-step', 'learner');
  });

  it('carries a reference for a channel that needs one', async () => {
    const payments = port();
    renderPage(payments);
    const search = await screen.findByTestId('cashier-learner-search');

    fireEvent.change(search, { target: { value: 'ADM' } });
    fireEvent.keyDown(search, { key: 'Enter' });
    fireEvent.change(screen.getByTestId('cashier-amount'), { target: { value: '1500' } });
    fireEvent.keyDown(screen.getByTestId('cashier-amount'), { key: 'Enter' });
    fireEvent.keyDown(screen.getByTestId('cashier-channel-mobile_money'), { key: '4' });

    const reference = screen.getByTestId('cashier-reference');
    fireEvent.change(reference, { target: { value: 'MPESA-XYZ' } });
    fireEvent.keyDown(reference, { key: 'Enter' });

    await waitFor(() => expect(payments.recordPayment).toHaveBeenCalledTimes(1));
    expect(payments.recordPayment).toHaveBeenCalledWith(
      expect.objectContaining({ channel: 'mobile_money', reference: 'MPESA-XYZ' })
    );
  });

  it('will not save without a learner, and shows the service refusal', async () => {
    const payments = port({
      recordPayment: vi.fn(async () => {
        throw new Error('The receipt number could not be issued.');
      }),
    });
    renderPage(payments);
    const search = await screen.findByTestId('cashier-learner-search');

    // With nothing entered the save is disabled; it stays disabled until an amount is in.
    expect(screen.getByTestId('cashier-save')).toBeDisabled();
    fireEvent.keyDown(search, { key: 'Enter' });
    expect(screen.getByTestId('cashier-flow-step')).toHaveAttribute('data-step', 'amount');
    expect(screen.getByTestId('cashier-save')).toBeDisabled();
    expect(payments.recordPayment).not.toHaveBeenCalled();

    // The happy path, with a service that refuses: the error is shown and the form stays.
    fireEvent.change(screen.getByTestId('cashier-amount'), { target: { value: '1500' } });
    fireEvent.keyDown(screen.getByTestId('cashier-amount'), { key: 'Enter' });
    fireEvent.keyDown(screen.getByTestId('cashier-channel-cash'), { key: '1' });
    fireEvent.keyDown(screen.getByTestId('cashier-reference'), { key: 'Enter' });

    await waitFor(() => expect(payments.recordPayment).toHaveBeenCalledTimes(1));
    expect(await screen.findByTestId('cashier-error')).toHaveTextContent(/could not be issued/);
    expect(screen.getByTestId('cashier-amount')).toBeInTheDocument();
  });

  it('opens a session with its float and closes it with the difference stated', async () => {
    const payments = port();
    renderPage(payments);

    const open = await screen.findByTestId('cashier-open-session');
    fireEvent.change(screen.getByTestId('cashier-float'), { target: { value: '500' } });
    fireEvent.click(open);

    await waitFor(() => expect(payments.openSession).toHaveBeenCalledTimes(1));
    expect(payments.openSession).toHaveBeenCalledWith(
      expect.objectContaining({
        openingFloat: { amount_minor: 50_000, currency: 'KES' },
        cashierUserId: expect.any(String),
      })
    );

    // The session bar moves to the close controls.
    expect(await screen.findByTestId('cashier-close-session')).toBeInTheDocument();
    fireEvent.change(screen.getByTestId('cashier-counted'), { target: { value: '1995' } });
    fireEvent.click(screen.getByTestId('cashier-close-session'));

    await waitFor(() => expect(payments.closeSession).toHaveBeenCalledTimes(1));
    expect(payments.closeSession).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: 'session-1',
        countedCash: { amount_minor: 199_500, currency: 'KES' },
      })
    );

    // The Z-report states the difference rather than hiding it.
    const report = await screen.findByTestId('cashier-zreport');
    expect(report).toHaveTextContent('Cash');
    expect(report).toHaveTextContent('KES 2,000.00');
    expect(screen.getByTestId('cashier-zreport-variance')).toHaveTextContent('KES -5.00');
  });
});
