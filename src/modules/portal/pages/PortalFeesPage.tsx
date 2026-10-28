// ABOUTME: The portal fee statement: the balance the finance module computed, and a pay action that
// ABOUTME: asks the configured payment provider, or says plainly that none is configured.

import { withPortalRepository } from '../data/withPortalRepository';

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Spinner from '@/components/ui/Spinner';
import { ExclamationTriangleIcon, CheckCircleIcon } from '@/components/ui/icons';
import { formatMoneyMinor } from '@/modules/finance/data/canonicalFinance';

import { PortalShell } from '../components/PortalShell';
import { usePortalBalance } from '../data/usePortalSession';
import { usePortalPayments } from '../data/portalPayments';
import { payLinkMessage, requestPayLink, type PayLinkOutcome } from '../data/payLink';

const money = (minor: number): string => formatMoneyMinor(minor);

export const PortalFeesContent: React.FC = () => {
  const { t } = useTranslation('portal');
  const { session, balance, loading, error } = usePortalBalance();
  const payments = usePortalPayments();

  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<PayLinkOutcome | null>(null);
  const [refusal, setRefusal] = useState<string | null>(null);

  const outstanding = balance?.balance ?? 0;

  const requestPayment = async () => {
    if (!balance || !session.selectedLearner) return;
    setBusy(true);
    setRefusal(null);
    try {
      const result = await requestPayLink({
        identity: session.identity,
        learnerId: balance.learner.id,
        amountMinor: outstanding,
        accountReference: balance.learner.admissionNumber,
        phone,
        description: `${balance.learner.name} — outstanding fees`,
        callbackUrl: payments.callbackUrl,
        provider: payments.provider,
      });
      setOutcome(result);
    } catch (cause) {
      setRefusal(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  };

  return (
    <PortalShell session={session} title={t('fees.title', 'Fee statement')}>
      {error ? (
        <Card className="border-rose-200 bg-rose-50">
          <p role="alert" className="text-sm text-rose-700">
            {error}
          </p>
        </Card>
      ) : null}

      {loading && !balance ? (
        <div className="flex items-center justify-center py-10" role="status">
          <Spinner />
          <span className="ml-3 text-surface-muted-fg">{t('common.loading', 'Loading…')}</span>
        </div>
      ) : null}

      {balance ? (
        <>
          <Card title={t('fees.balance', 'Balance')} className="border-slate-200 bg-surface-card">
            {balance.summary ? (
              <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
                <div>
                  <dt className="text-surface-muted-fg">{t('fees.totalFees', 'Billed')}</dt>
                  <dd className="font-medium text-surface-foreground">{money(balance.feeAmount)}</dd>
                </div>
                <div>
                  <dt className="text-surface-muted-fg">{t('fees.totalPaid', 'Paid')}</dt>
                  <dd className="font-medium text-emerald-700">{money(balance.amountPaid)}</dd>
                </div>
                <div>
                  <dt className="text-surface-muted-fg">
                    {t('fees.exemptions', 'Exemptions and credit')}
                  </dt>
                  <dd className="font-medium text-surface-foreground">{money(balance.feeExemption)}</dd>
                </div>
                <div>
                  <dt className="text-surface-muted-fg">{t('fees.penalties', 'Fines')}</dt>
                  <dd className="font-medium text-surface-foreground">{money(balance.feePenalty)}</dd>
                </div>
                <div>
                  <dt className="text-surface-muted-fg">{t('fees.outstanding', 'Outstanding')}</dt>
                  <dd
                    className={`text-lg font-semibold ${
                      outstanding > 0 ? 'text-rose-700' : 'text-emerald-700'
                    }`}
                  >
                    {outstanding > 0 ? money(outstanding) : money(balance.overpay)}
                  </dd>
                </div>
                <div>
                  <dt className="text-surface-muted-fg">{t('fees.dueDate', 'Due date')}</dt>
                  <dd className="font-medium text-surface-foreground">
                    {balance.earliestDueDate ?? '—'}
                  </dd>
                </div>
              </dl>
            ) : (
              <p className="text-sm text-surface-muted-fg">
                {t(
                  'fees.noStatement',
                  'The school has not billed this learner yet, so there is no balance to show.'
                )}
              </p>
            )}
          </Card>

          <Card title={t('fees.pay', 'Pay fees')} className="border-slate-200 bg-surface-card">
            {payments.provider ? (
              <div className="space-y-3">
                <p className="text-sm text-surface-muted-fg">
                  {t(
                    'fees.payHelp',
                    'The school will send a payment request to your phone for the outstanding balance.'
                  )}
                </p>
                <Input
                  label={t('fees.phone', 'Phone number')}
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="+254 7xx xxx xxx"
                  inputMode="tel"
                />
                <Button
                  onClick={() => void requestPayment()}
                  loading={busy}
                  disabled={busy || outstanding <= 0 || phone.trim().length === 0}
                >
                  {t('fees.requestPayment', 'Request payment')}
                </Button>
              </div>
            ) : (
              <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
                <ExclamationTriangleIcon className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
                <p className="text-sm text-amber-800" role="status">
                  {t(
                    'fees.noProvider',
                    'No payment provider is configured for this school, so the portal cannot request a payment. Pay at the school office or use the bank details the school gave you.'
                  )}
                </p>
              </div>
            )}

            {outcome?.kind === 'issued' ? (
              <div className="mt-3 flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                <CheckCircleIcon className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-600" />
                <p className="text-sm text-emerald-800" role="status">
                  {outcome.message ??
                    t(
                      'fees.requestSent',
                      'A payment request was sent to {{phone}}.',
                      { phone }
                    )}
                </p>
              </div>
            ) : null}

            {payLinkMessage(outcome) ? (
              <p className="mt-3 text-sm text-rose-700" role="alert">
                {payLinkMessage(outcome)}
              </p>
            ) : null}

            {refusal ? (
              <p className="mt-3 text-sm text-rose-700" role="alert">
                {refusal}
              </p>
            ) : null}
          </Card>

          <p className="text-xs text-surface-muted-fg">
            {t(
              'fees.statementNote',
              'Invoices, receipts and the full statement are kept by the school office. This page shows the balance the bursar sees.'
            )}
          </p>
        </>
      ) : null}
    </PortalShell>
  );
};

const PortalFeesPage: React.FC = withPortalRepository(() => <PortalFeesContent />);

export default PortalFeesPage;
