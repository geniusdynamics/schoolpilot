// ABOUTME: Invoice Generation Page - UI for bulk invoice generation
// ABOUTME: Uses useInvoiceGeneration hook to create invoices for students

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Card from '@/components/ui/Card';

import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import Spinner from '@/components/ui/Spinner';
import { useInvoiceGeneration } from '../hooks/useFinanceServices';
import { useAppData } from '@/hooks/useAppData';
import type { InvoiceGenerationResult, ActiveStudentRecord } from '../services/InvoiceGenerationService';
import { ArrowPathIcon, CheckCircleIcon, DocumentAddIcon, ExclamationCircleIcon, UserGroupIcon } from '@/components/ui/icons';

// Currency formatter for KES
const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'KES' }).format(value);

interface PreviewStudent extends ActiveStudentRecord {
  totalAmount: number;
  hasExistingInvoice: boolean;
}

export const InvoiceGenerationPageContent: React.FC = () => {
  const { t } = useTranslation('finance');
  const { generateTermlyInvoices, isGenerating, error: serviceError } = useInvoiceGeneration();
  const { schoolPeriods, feeTemplates, feeTemplateItems, loading: appLoading } = useAppData();

  // Form state
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('');
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');

  // Results state
  const [result, setResult] = useState<InvoiceGenerationResult | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

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

  // Get templates for selected period
  const availableTemplates = useMemo(() => {
    if (!selectedPeriodId) return [];
    return (feeTemplates || []).filter(
      (t) => t.school_period_id === parseInt(selectedPeriodId, 10)
    );
  }, [feeTemplates, selectedPeriodId]);

  // Get template items for selected template
  const templateItems = useMemo(() => {
    if (!selectedTemplateId) return [];
    const templateId = parseInt(selectedTemplateId, 10);
    return (feeTemplateItems || []).filter((item) => item.fee_template_id === templateId);
  }, [feeTemplateItems, selectedTemplateId]);

  // Calculate total amount for preview
  const templateTotal = useMemo(() => {
    return templateItems.reduce((sum, item) => sum + (item.amount || 0), 0);
  }, [templateItems]);

  // Handle generation
  const handleGenerate = useCallback(async () => {
    if (!selectedPeriodId) {
      setLocalError(t('invoiceGeneration.selectPeriod') || 'Please select a school period');
      return;
    }

    setLocalError(null);
    setResult(null);

    const periodId = parseInt(selectedPeriodId, 10);
    const generationResult = await generateTermlyInvoices(periodId);

    if (generationResult) {
      setResult(generationResult);
    }
  }, [selectedPeriodId, generateTermlyInvoices, t]);

  // Reset form
  const handleReset = useCallback(() => {
    setResult(null);
    setLocalError(null);
  }, []);

  // DataGrid columns for preview

  const previewColumns: DataGridColumn<PreviewStudent>[] = useMemo(
    () => [
      {
        key: 'first_name',
        header: t('tableHeaders.firstName') || 'First Name',
        width: 150,
        sortable: true,
      },
      {
        key: 'last_name',
        header: t('tableHeaders.lastName') || 'Last Name',
        width: 150,
        sortable: true,
      },
      {
        key: 'totalAmount',
        header: t('tableHeaders.totalAmount') || 'Total Amount',
        width: 130,
        sortable: true,
        render: (value) => (
          <span className="font-mono text-blue-600">{formatCurrency(value as number)}</span>
        ),
      },
      {
        key: 'hasExistingInvoice',
        header: t('tableHeaders.status') || 'Status',
        width: 150,
        render: (value) => (
          <span className={`px-2 py-1 rounded-full text-xs ${
            value ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
          }`}>
            {value ? 'Existing Invoice' : 'New Invoice'}
          </span>
        ),
      },
    ],
    [t]
  );

  const isLoading = appLoading;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Spinner size="lg" />
        <span className="ml-2">{t('common.loading') || 'Loading...'}</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card title={t('invoiceGeneration.title') || 'Invoice Generation'}>
        {/* Configuration */}
        <div className="p-4 border-b mb-4 bg-gray-50 rounded-md">
          <p className="text-sm text-gray-600 mb-4">
            {t('invoiceGeneration.description') || 
              'Generate invoices for all active students for the selected school period and fee template.'}
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Select
              label={t('invoiceGeneration.schoolPeriod') || 'School Period'}
              value={selectedPeriodId}
              onChange={(e) => {
                setSelectedPeriodId(e.target.value);
                setSelectedTemplateId('');
                setResult(null);
              }}
              required
            >
              <option value="">{t('invoiceGeneration.selectPeriod') || 'Select Period'}</option>
              {(schoolPeriods || []).map((sp) => (
                <option key={sp.id} value={sp.id}>
                  {sp.name} {sp.is_active ? '(Active)' : ''}
                </option>
              ))}
            </Select>

            <Select
              label={t('invoiceGeneration.feeTemplate') || 'Fee Template'}
              value={selectedTemplateId}
              onChange={(e) => {
                setSelectedTemplateId(e.target.value);
                setResult(null);
              }}
              required
              disabled={!selectedPeriodId}
            >
              <option value="">{t('invoiceGeneration.selectTemplate') || 'Select Template'}</option>
              {availableTemplates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </Select>

            <div className="flex items-end">
              <Button
                onClick={handleGenerate}
                disabled={isGenerating || !selectedPeriodId || !selectedTemplateId}
                className="w-full"
                leftIcon={isGenerating ? <Spinner size="sm" /> : <DocumentAddIcon className="w-5 h-5" />}
              >
                {isGenerating
                  ? t('invoiceGeneration.generating') || 'Generating...'
                  : t('invoiceGeneration.generate') || 'Generate Invoices'}
              </Button>
            </div>
          </div>

          {/* Template Summary */}
          {selectedTemplateId && templateItems.length > 0 && (
            <div className="mt-4 p-3 bg-blue-50 rounded-md">
              <div className="text-sm font-medium text-blue-800">
                {t('invoiceGeneration.templateSummary') || 'Template Summary'}
              </div>
              <div className="text-sm text-blue-600 mt-1">
                {templateItems.length} {t('invoiceGeneration.items') || 'items'} |{' '}
                {t('invoiceGeneration.total') || 'Total'}: {formatCurrency(templateTotal)}
              </div>
            </div>
          )}
        </div>

        {/* Error Display */}
        {(localError || serviceError) && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <div className="flex items-center gap-2 text-red-800">
              <ExclamationCircleIcon className="w-5 h-5" />
              <span>{localError || serviceError?.message}</span>
            </div>
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-4">
            {/* Result Summary */}
            <div className={`p-4 rounded-md ${
              result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                {result.success ? (
                  <CheckCircleIcon className="w-6 h-6 text-green-600" />
                ) : (
                  <ExclamationCircleIcon className="w-6 h-6 text-red-600" />
                )}
                <span className={`text-lg font-medium ${
                  result.success ? 'text-green-800' : 'text-red-800'
                }`}>
                  {result.success
                    ? t('invoiceGeneration.success') || 'Invoices Generated Successfully'
                    : t('invoiceGeneration.partialSuccess') || 'Partial Success'}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-4 mt-3">
                <div>
                  <div className="text-sm text-gray-600">
                    {t('invoiceGeneration.totalStudents') || 'Total Students'}
                  </div>
                  <div className="text-xl font-bold">{result.totalStudents}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">
                    {t('invoiceGeneration.invoicesCreated') || 'Invoices Created'}
                  </div>
                  <div className="text-xl font-bold text-green-600">{result.invoicesCreated}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">
                    {t('invoiceGeneration.skipped') || 'Skipped'}
                  </div>
                  <div className="text-xl font-bold text-yellow-600">{result.skipped}</div>
                </div>
              </div>
              {result.errors.length > 0 && (
                <div className="mt-3">
                  <div className="text-sm font-medium text-red-800">
                    {t('invoiceGeneration.errors') || 'Errors'}:
                  </div>
                  <ul className="mt-1 text-sm text-red-600 list-disc list-inside">
                    {result.errors.slice(0, 5).map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                    {result.errors.length > 5 && (
                      <li>...and {result.errors.length - 5} more</li>
                    )}
                  </ul>
                </div>
              )}
            </div>

            {/* Reset Button */}
            <div className="flex justify-end">
              <Button
                variant="secondary"
                onClick={handleReset}
                leftIcon={<ArrowPathIcon className="w-4 h-4" />}
              >
                {t('invoiceGeneration.generateMore') || 'Generate More'}
              </Button>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!result && !isGenerating && !localError && !serviceError && (
          <div className="text-center py-12 text-gray-500">
            <UserGroupIcon className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <p>{t('invoiceGeneration.configureMessage') || 'Configure the options above and click Generate to create invoices'}</p>
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
