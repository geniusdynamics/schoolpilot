// ABOUTME: Fee Structures page: bills a period's fee templates to learners scoped by template, level and category.
// ABOUTME: Previews the run (dry run) and then posts it through the term billing service (generateTermInvoices).

import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import Card from '@/components/ui/Card';
import { CogIcon, CheckCircleIcon } from '@/components/ui/icons';
import { useAppData } from '@/hooks/useAppData';
import Spinner from '@/components/ui/Spinner';
import Select from '@/components/ui/Select';
import Button from '@/components/ui/Button';
import { useTermBilling } from '../hooks/useFinanceServices';
import type { GenerateTermInvoicesResult } from '@/domain/finance/billingService';

const formatAmount = (value: number) =>
  new Intl.NumberFormat('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);

export const EffectFeeStructuresPageContent: React.FC = () => {
  const { t } = useTranslation('finance');
  const { feeTemplates, schoolPeriods, studentCategories, classes, loading } = useAppData();
  const { generateTermInvoices, isRunning, error } = useTermBilling();

  const [periodId, setPeriodId] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [levelId, setLevelId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [result, setResult] = useState<GenerateTermInvoicesResult | null>(null);

  const activeSchoolPeriods = useMemo(() => (schoolPeriods || []).filter(sp => sp.is_active), [schoolPeriods]);
  const periodTemplates = useMemo(
    () => (feeTemplates || []).filter(ft => String(ft.school_period_id) === periodId),
    [feeTemplates, periodId]
  );

  const resetResult = () => setResult(null);

  const run = async (dryRun: boolean) => {
    if (!periodId) return;
    const outcome = await generateTermInvoices({
      periodId,
      dryRun,
      templateIds: templateId ? [templateId] : undefined,
      levelIds: levelId ? [levelId] : undefined,
      categoryIds: categoryId ? [categoryId] : undefined,
    });
    setResult(outcome);
  };

  if (loading.all || loading.feeTemplates || loading.schoolPeriods || loading.studentCategories) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner size="lg" />
        <span className="ml-2">{t('feeStructures.loading', 'Loading Fee Structures Data...')}</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card title={t('feeStructures.title', 'Effect Fee Structures (Generate Student Invoices)')}>
        <div className="p-6 space-y-6">
          <p className="text-sm text-surface-muted-fg">
            {t('feeStructures.description', 'Bill the fee templates of a school period to its learners. Templates apply by student category and level; each learner gets one invoice per period and re-running only adds what is missing. Preview first, then generate.')}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Select
              label={t('feeStructures.period', 'School Period')}
              value={periodId}
              onChange={e => { setPeriodId(e.target.value); setTemplateId(''); resetResult(); }}
              required
            >
              <option value="">{t('feeStructures.choosePeriod', '-- Choose School Period --')}</option>
              {activeSchoolPeriods.map(sp => <option key={sp.id} value={String(sp.id)}>{sp.name}</option>)}
            </Select>
            <Select
              label={t('feeStructures.template', 'Fee Template')}
              value={templateId}
              onChange={e => { setTemplateId(e.target.value); resetResult(); }}
              disabled={!periodId}
            >
              <option value="">{t('feeStructures.allTemplates', 'All templates of the period')}</option>
              {periodTemplates.map(ft => <option key={ft.id} value={String(ft.id)}>{ft.name}</option>)}
            </Select>
            <Select
              label={t('feeStructures.level', 'Level (Optional)')}
              value={levelId}
              onChange={e => { setLevelId(e.target.value); resetResult(); }}
            >
              <option value="">{t('feeStructures.allLevels', 'All levels')}</option>
              {(classes || []).map(cl => <option key={cl.id} value={String(cl.id)}>{cl.name}</option>)}
            </Select>
            <Select
              label={t('feeStructures.category', 'Student Category (Optional)')}
              value={categoryId}
              onChange={e => { setCategoryId(e.target.value); resetResult(); }}
            >
              <option value="">{t('feeStructures.allCategories', 'All categories')}</option>
              {(studentCategories || []).map(sc => <option key={sc.id} value={String(sc.id)}>{sc.name}</option>)}
            </Select>
          </div>
          <div className="mt-6 flex justify-center gap-3">
            <Button variant="secondary" onClick={() => run(true)} disabled={isRunning || !periodId}>
              {t('feeStructures.preview', 'Preview')}
            </Button>
            <Button
              onClick={() => run(false)}
              disabled={isRunning || !periodId}
              leftIcon={isRunning ? <Spinner size="sm" /> : <CogIcon className="w-5 h-5" />}
            >
              {isRunning ? t('feeStructures.generating', 'Generating Invoices...') : t('feeStructures.generate', 'Generate Student Invoices')}
            </Button>
          </div>

          {result && (
            <div className={`mt-6 p-4 rounded-md border ${result.dryRun ? 'bg-primary-50 border-primary-200' : 'bg-green-50 border-green-200'}`}>
              {!result.dryRun && <CheckCircleIcon className="w-10 h-10 text-green-500 mx-auto mb-2" />}
              <h3 className="text-lg font-semibold text-center">
                {result.dryRun ? t('feeStructures.previewTitle', 'Billing preview') : t('feeStructures.doneTitle', 'Billing run completed')}
              </h3>
              <p className="text-center text-sm">
                {t('feeStructures.summary', '{{created}} new invoice(s), {{updated}} updated, {{skipped}} already billed, {{unmatched}} without a matching template. Total KES {{amount}}', {
                  created: result.summary.invoicesCreated,
                  updated: result.summary.invoicesUpdated,
                  skipped: result.alreadyBilledStudentIds.length,
                  unmatched: result.unmatchedStudentIds.length,
                  amount: formatAmount(result.summary.amount),
                })}
              </p>
              {result.lines.length > 0 && (
                <table className="mt-4 w-full text-sm">
                  <thead>
                    <tr className="text-left">
                      <th className="py-1">{t('feeStructures.learner', 'Learner')}</th>
                      <th className="py-1">{t('feeStructures.invoice', 'Invoice')}</th>
                      <th className="py-1">{t('feeStructures.items', 'Items')}</th>
                      <th className="py-1 text-right">{t('feeStructures.amount', 'Amount (KES)')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.lines.map(line => (
                      <tr key={line.studentId} className="border-t">
                        <td className="py-1">{line.studentName}</td>
                        <td className="py-1">{line.invoiceNumber}{line.isNewInvoice ? '' : ` (${t('feeStructures.updated', 'updated')})`}</td>
                        <td className="py-1">{line.items.map(item => item.description).join(', ')}</td>
                        <td className="py-1 text-right font-mono">{formatAmount(line.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
          {error && (
            <div role="alert" className="mt-6 p-4 bg-red-50 border border-red-200 rounded-md text-center">
              <p className="text-red-600">{t('feeStructures.failed', 'Failed to generate invoices: {{error}}', { error: error.message })}</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

const EffectFeeStructuresPage: React.FC = () => (
  <div className="space-y-6">
    <EffectFeeStructuresPageContent />
  </div>
);

export default EffectFeeStructuresPage;
