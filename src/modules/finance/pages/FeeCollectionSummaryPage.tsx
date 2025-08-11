// ABOUTME: This page component displays a summary of fee collections by votehead.
// ABOUTME: It allows filtering by school period and class to generate the report.

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Card from '@/components/ui/Card';
import { CurrencyDollarIcon, PrinterIcon, DownloadIcon } from '@/components/ui/icons'; 
import { useAppData } from '@/hooks/useAppData';
import Spinner from '@/components/ui/Spinner';
import { DataGrid, DataGridColumn } from '@/components/ui';
import Select from '@/components/ui/Select';
import Button from '@/components/ui/Button';
import { SchoolPeriod, Class as SchoolClass } from '@/types'; 
import { FinStudentInvoiceType, FinInvoiceStatusEnum, FinInvoicePaymentApplicationType } from '@/types'; 

interface FeeCollectionSummaryRow {
  votehead: string;
  expectedAmount: number;
  paidAmount: number;
  arrears: number;
}

const FeeCollectionSummaryPage: React.FC = () => {
  const { t } = useTranslation('reports');
  const { 
    schoolPeriods, 
    classes, 
    studentInvoices,
    invoicePaymentApplications,
    students, 
    classStreams, 
    loading 
  } = useAppData();

  const [selectedSchoolPeriodId, setSelectedSchoolPeriodId] = useState<number | undefined>(
    (schoolPeriods || []).find(sp => sp.is_active)?.id || (schoolPeriods || [])[0]?.id
  );
  const [selectedClassId, setSelectedClassId] = useState<number | undefined>();
  
  const [reportData, setReportData] = useState<FeeCollectionSummaryRow[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateReport = useCallback(() => {
    if (!selectedSchoolPeriodId) {
      alert(t('feeCollection.alertSelectPeriod'));
      setReportData([]);
      return;
    }
    setIsGenerating(true);
    
    const invoicesForPeriod = (studentInvoices || []).filter(inv =>
      inv.school_period_id === selectedSchoolPeriodId &&
      inv.status !== FinInvoiceStatusEnum.VOIDED &&
      (!selectedClassId || (students || []).find(s => s.id === inv.student_id)?.current_class_stream_id && (classStreams || []).find(cs => cs.id === (students || []).find(s => s.id === inv.student_id)?.current_class_stream_id)?.class_id === selectedClassId)
    );

    const summaryMap = new Map<string, { expected: number; paid: number }>();

    invoicesForPeriod.forEach(invoice => {
      (invoice.items || []).forEach(item => {
        const votehead = item.description;
        const current = summaryMap.get(votehead) || { expected: 0, paid: 0 };
        current.expected += item.amount;

        const paymentsForItem = (invoicePaymentApplications || [])
          .filter(ipa => ipa.invoice_item_id === item.id)
          .reduce((sum, ipa) => sum + ipa.amount_applied, 0);
        current.paid += paymentsForItem;
        
        summaryMap.set(votehead, current);
      });
    });

    const summaryData: FeeCollectionSummaryRow[] = Array.from(summaryMap.entries()).map(([votehead, data]) => ({
      votehead,
      expectedAmount: data.expected,
      paidAmount: data.paid,
      arrears: data.expected - data.paid,
    }));

    setReportData(summaryData);
    setIsGenerating(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSchoolPeriodId, selectedClassId, studentInvoices, invoicePaymentApplications, students, classStreams, t]);
  

  useEffect(() => {
    if(selectedSchoolPeriodId) handleGenerateReport();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSchoolPeriodId, selectedClassId, handleGenerateReport]); 

  const columns: DataGridColumn<FeeCollectionSummaryRow>[] = [
    { 
      key: 'votehead', 
      header: t('tableHeaders.votehead'), 
      sortable: true, 
      filterable: true, 
      width: 250,
      render: (value, row) => <span className="font-medium">{value}</span>
    },
    { 
      key: 'expectedAmount', 
      header: t('tableHeaders.expectedAmountKES'), 
      sortable: true, 
      filterable: true, 
      width: 150,
      render: (value, row) => <span className="font-mono text-blue-600">{row.expectedAmount.toFixed(2)}</span>
    },
    { 
      key: 'paidAmount', 
      header: t('tableHeaders.paidAmountKES'), 
      sortable: true, 
      filterable: true, 
      width: 150,
      render: (value, row) => <span className="font-mono text-green-600">{row.paidAmount.toFixed(2)}</span>
    },
    { 
      key: 'arrears', 
      header: t('tableHeaders.arrearsKES'), 
      sortable: true, 
      filterable: true, 
      width: 150,
      render: (value, row) => <span className={`font-mono ${
        row.arrears > 0 ? 'text-red-600' : 'text-gray-600'
      }`}>{row.arrears.toFixed(2)}</span>
    },
  ];

  const isLoadingPage = loading.schoolPeriods || loading.classes || loading.studentInvoices || loading.studentPayments || loading.invoicePaymentApplications || loading.feeTemplates;

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    if (reportData.length === 0) {
      alert(t('common:noDataToExport')); 
      return;
    }
    const headers = columns.map(col => col.header).join(',');
    const rows = reportData.map(row => {
      return columns.map(col => {
        let value;
        if (col.render) {
          value = col.render(row); 
        } else if (typeof col.accessor === 'function') {
          value = (col.accessor as (item: FeeCollectionSummaryRow) => React.ReactNode)(row);
        }
         else {
           value = row[col.accessor as keyof FeeCollectionSummaryRow];
        }
        const stringValue = String(value !== undefined && value !== null ? value : '-');
        return `"${stringValue.replace(/"/g, '""')}"`; 
      }).join(',');
    }).join('\n');

    const csvContent = `${headers}\n${rows}`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      const today = new Date().toISOString().split('T')[0];
      link.setAttribute('href', url);
      link.setAttribute('download', `fee_collection_summary_${today}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="space-y-6">
      <Card title={t('feeCollection.title')}>
         <div className="p-4 border-b mb-4 bg-gray-50 rounded-md filter-section">
            <p className="text-sm text-gray-600 mb-4">
                {t('feeCollection.description')}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <Select label={t('feeCollection.schoolPeriod')} value={selectedSchoolPeriodId || ''} onChange={e => setSelectedSchoolPeriodId(Number(e.target.value) || undefined)} required>
                    <option value="">{t('feeCollection.optionAllPeriods')}</option>
                    {(schoolPeriods || []).map(sp => <option key={sp.id} value={sp.id}>{sp.name}</option>)}
                </Select>
                <Select label={t('feeCollection.classOptional')} value={selectedClassId || ''} onChange={e => setSelectedClassId(Number(e.target.value) || undefined)}>
                    <option value="">{t('feeCollection.optionAllClasses')}</option>
                    {(classes || []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </Select>
                <Button onClick={handleGenerateReport} disabled={isGenerating || isLoadingPage || !selectedSchoolPeriodId} className="h-10 print-hide">
                    {isGenerating ? <Spinner size="sm" /> : t('feeCollection.generateSummary')}
                </Button>
            </div>
        </div>

        {isLoadingPage && !isGenerating ? (
             <div className="flex justify-center items-center py-10"><Spinner size="lg" /><span className="ml-2">{t('feeCollection.loadingData')}</span></div>
        ) : isGenerating ? (
            <div className="flex justify-center items-center py-10"><Spinner /><span className="ml-2">{t('feeCollection.generatingSummary')}</span></div>
        ) : reportData.length > 0 ? (
            <>
                <div className="flex justify-end space-x-2 mb-4 print-hide">
                    <Button variant="secondary" size="sm" onClick={handlePrint} leftIcon={<PrinterIcon className="w-4 h-4"/>}>{t('feeCollection.print')}</Button>
                    <Button variant="secondary" size="sm" onClick={handleExportCSV} leftIcon={<DownloadIcon className="w-4 h-4"/>}>{t('feeCollection.exportCSV')}</Button>
                </div>
                <DataGrid 
                  columns={columns} 
                  data={reportData} 
                  isLoading={isGenerating}
                  sortable
                  filterable
                  emptyState={{
                    icon: <CurrencyDollarIcon className="w-12 h-12 text-gray-400" />,
                    title: t('feeCollection.noData'),
                    description: "Adjust your filters and generate the report to view fee collection summary data."
                  }}
                />
            </>
        ) : (
            <p className="text-center text-gray-500 py-4">{t('feeCollection.selectFiltersMessage')}</p>
        )}
      </Card>
    </div>
  );
};

export default FeeCollectionSummaryPage;
