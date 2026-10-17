// ABOUTME: Invoice Generation Page - bills every applicable fee template of a period to active learners.
// ABOUTME: Uses the term billing service via useTermBilling: preview (dry run) first, then generate; re-runs add only what is missing.

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Card from '@/components/ui/Card';

import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import Spinner from '@/components/ui/Spinner';
import { useTermBilling } from '../hooks/useFinanceServices';
import { useAppData } from '@/hooks/useAppData';
import type { GenerateTermInvoicesResult } from '@/domain/finance/billingService';
import { ArrowPathIcon, CheckCircleIcon, DocumentAddIcon, ExclamationCircleIcon, UserGroupIcon } from '@/components/ui/icons';

// Currency formatter for KES
const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(value);

export const InvoiceGenerationPageContent: React.FC = () => {
  const { t } = useTranslation('finance');
  const { generateTermInvoices, isRunning, error: serviceError } = useTermBilling();
  const { schoolPeriods, feeTemplates, classes, loading: appLoading } = useAppData();

  // Form state
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('');
  const [selectedLevelId, setSelectedLevelId] = useState<string>('');

  // Results state
  const [result, setResult] = useState<GenerateTermInvoicesResult | null>(null);

  // Get active school period
  const activePeriod = useMemo(() => {
    return (schoolPeriods || []).find((sp) => sp.is_active) || (schoolPeriods || [])[0];
  }, [schoolPeriods]);

  // Set default period on load
  useEffect(() => {
    if (activePeriod && !selectedPeriodId) {
      setSelectedPeriodId(String(activePeriod.id));
    }
  }, [activePeriod, selectedPeriodId]);

  // Templates billed for the selected period (ids compared as strings)
  const periodTemplates = useMemo(
    () => (feeTemplates || []).filter((template) => String(template.school_period_id) === selectedPeriodId),
    [feeTemplates, selectedPeriodId]
  );

  const run = useCallback(async (dryRun: boolean) => {
    if (!selectedPeriodId) return;
    setResult(null);
    const outcome = await generateTermInvoices({
      periodId: selectedPeriodId,
      levelIds: selectedLevelId ? [selectedLevelId] : undefined,
      dryRun,
    });
    setResult(outcome);
  }, [selectedPeriodId, selectedLevelId, generateTermInvoices]);

  if (appLoading.all) {
    return (
      <div className="flex justify-center items-center py-20">
        <Spinner size="lg" />
        <span className="ml-2">{t('common.loading', 'Loading...')}</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card title={t('invoiceGeneration.title', 'Invoice Generation')}>
        {/* Configuration */}
        <div className="p-4 border-b mb-4 bg-surface-muted rounded-md">
          <p className="text-sm text-surface-muted-fg mb-4">
            {t('invoiceGeneration.description',
              'Bill every fee template of the selected period to the active learners it applies to (by level and student category). Each learner gets one invoice per period; re-running only adds what is missing.')}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Select
              label={t('invoiceGeneration.schoolPeriod', 'School Period')}
              value={selectedPeriodId}
              onChange={(e) => {
                setSelectedPeriodId(e.target.value);
                setResult(null);
              }}
              required
            >
              <option value="">{t('invoiceGeneration.selectPeriod', 'Select Period')}</option>
              {(schoolPeriods || []).map((sp) => (
                <option key={sp.id} value={String(sp.id)}>
                  {sp.name} {sp.is_active ? t('invoiceGeneration.activeSuffix', '(Active)') : ''}
                </option>
              ))}
            </Select>

            <Select
              label={t('invoiceGeneration.level', 'Level')}
              value={selectedLevelId}
              onChange={(e) => {
                setSelectedLevelId(e.target.value);
                setResult(null);
              }}
            >
              <option value="">{t('invoiceGeneration.allLevels', 'All levels')}</option>
              {(classes || []).map((cl) => (
                <option key={cl.id} value={String(cl.id)}>{cl.name}</option>
              ))}
            </Select>

            <div className="flex items-end gap-2">
              <Button variant="secondary" onClick={() => run(true)} disabled={isRunning || !selectedPeriodId} className="w-full">
                {t('invoiceGeneration.preview', 'Preview')}
              </Button>
              <Button
                onClick={() => run(false)}
                disabled={isRunning || !selectedPeriodId}
                className="w-full"
                leftIcon={isRunning ? <Spinner size="sm" /> : <DocumentAddIcon className="w-5 h-5" />}
              >
                {isRunning
                  ? t('invoiceGeneration.generating', 'Generating...')
                  : t('invoiceGeneration.generate', 'Generate Invoices')}
              </Button>
            </div>
          </div>

          {selectedPeriodId && (
            <div className="mt-4 p-3 bg-primary-50 rounded-md text-sm text-primary-700">
              {t('invoiceGeneration.templatesForPeriod', '{{count}} fee template(s) in this period', { count: periodTemplates.length })}
            </div>
          )}
        </div>

        {/* Error Display */}
        {serviceError && (
          <div role="alert" className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <div className="flex items-center gap-2 text-red-800">
              <ExclamationCircleIcon className="w-5 h-5" />
              <span>{serviceError.message}</span>
            </div>
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-4">
            <div className={`p-4 rounded-md border ${result.dryRun ? 'bg-primary-50 border-primary-200' : 'bg-green-50 border-green-200'}`}>
              <div className="flex items-center gap-2 mb-2">
                {!result.dryRun && <CheckCircleIcon className="w-6 h-6 text-green-600" />}
                <span className="text-lg font-medium">
                  {result.dryRun
                    ? t('invoiceGeneration.previewTitle', 'Preview — nothing has been saved yet')
                    : t('invoiceGeneration.success', 'Invoices Generated Successfully')}
                </span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3">
                <div>
                  <div className="text-sm text-surface-muted-fg">{t('invoiceGeneration.invoicesCreated', 'New invoices')}</div>
                  <div className="text-xl font-bold text-green-600">{result.summary.invoicesCreated}</div>
                </div>
                <div>
                  <div className="text-sm text-surface-muted-fg">{t('invoiceGeneration.invoicesUpdated', 'Invoices with added items')}</div>
                  <div className="text-xl font-bold">{result.summary.invoicesUpdated}</div>
                </div>
                <div>
                  <div className="text-sm text-surface-muted-fg">{t('invoiceGeneration.skipped', 'Already billed')}</div>
                  <div className="text-xl font-bold text-yellow-600">{result.alreadyBilledStudentIds.length}</div>
                </div>
                <div>
                  <div className="text-sm text-surface-muted-fg">{t('invoiceGeneration.total', 'Total')}</div>
                  <div className="text-xl font-bold">{formatCurrency(result.summary.amount)}</div>
                </div>
              </div>
              {result.unmatchedStudentIds.length > 0 && (
                <p className="mt-3 text-sm text-yellow-800">
                  {t('invoiceGeneration.unmatched', '{{count}} active learner(s) have no matching fee template for this period.', { count: result.unmatchedStudentIds.length })}
                </p>
              )}
            </div>

            <div className="flex justify-end">
              <Button variant="secondary" onClick={() => setResult(null)} leftIcon={<ArrowPathIcon className="w-4 h-4" />}>
                {t('invoiceGeneration.generateMore', 'Generate More')}
              </Button>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!result && !isRunning && !serviceError && (
          <div className="text-center py-12 text-surface-muted-fg">
            <UserGroupIcon className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <p>{t('invoiceGeneration.configureMessage', 'Choose a period, preview the billing run, then generate the invoices')}</p>
          </div>
        )}
      </Card>
    </div>
  );
};

const InvoiceGenerationPage: React.FC = () => (
  <div className="space-y-6">
    <InvoiceGenerationPageContent />
  </div>
);

export default InvoiceGenerationPage;
