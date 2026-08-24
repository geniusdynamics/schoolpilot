import React, { useState, useCallback, useEffect } from 'react';
import Card from '@/components/ui/Card';

import { useAppData } from '@/hooks/useAppData';
import Spinner from '@/components/ui/Spinner';
import { DataGrid } from '@/components/ui/data';
import Select from '@/components/ui/Select';
import Button from '@/components/ui/Button';
import { InvoiceStatus } from '@/core/types';
import { DownloadIcon, PrinterIcon } from '@/components/ui/icons';


interface FeeCollectionSummaryRow {
  votehead: string;
  expectedAmount: number;
  paidAmount: number;
  arrears: number;
}

export const FeeCollectionSummaryPageContent: React.FC = () => {
  const { 
    schoolPeriods, 
    classes, 
    studentInvoices,
    studentInvoiceItems, 
    invoicePaymentApplications,
    students, 
    classStreams, 
    loading 
  } = useAppData();

  const [selectedSchoolPeriodId, setSelectedSchoolPeriodId] = useState<number | undefined>(
    schoolPeriods.find(sp => sp.is_active)?.id || schoolPeriods[0]?.id
  );
  const [selectedClassId, setSelectedClassId] = useState<number | undefined>();
  
  const [reportData, setReportData] = useState<FeeCollectionSummaryRow[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateReport = useCallback(() => {
    if (!selectedSchoolPeriodId) {
      alert(t('validation.pleaseSelectASchoolPeriod'));
      setReportData([]);
      return;
    }
    setIsGenerating(true);
    
    const invoicesForPeriod = (studentInvoices || []).filter(inv => 
      inv.school_period_id === selectedSchoolPeriodId &&
      inv.status !== InvoiceStatus.VOIDED &&
      (!selectedClassId || (students || []).find(s => s.id === inv.student_id)?.current_class_stream_id && (classStreams || []).find(cs => cs.id === (students || []).find(s => s.id === inv.student_id)?.current_class_stream_id)?.class_id === selectedClassId)
    );

    const summaryMap = new Map<string, { expected: number; paid: number }>();

    (invoicesForPeriod || []).forEach(invoice => {
      (invoice.items || []).forEach(item => {
        const votehead = item.description;
        const current = summaryMap.get(votehead) || { expected: 0, paid: 0 };
        current.expected += item.amount;

        const paymentsForItem = (invoicePaymentApplications || []).filter(ipa => ipa.invoice_item_id === item.id).reduce((sum, ipa) => sum + ipa.amount_applied, 0);
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
  }, [selectedSchoolPeriodId, selectedClassId, studentInvoices, invoicePaymentApplications, students, classStreams]);
  

  // Generate report on initial mount if period is selected
  useEffect(() => {
    if (selectedSchoolPeriodId) handleGenerateReport();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const columns = [
    { header: 'Votehead', key: 'votehead' as keyof FeeCollectionSummaryRow },
    { header: 'Expected Amount (KES)', key: 'expectedAmount' as keyof FeeCollectionSummaryRow, render: (_v: any, item: FeeCollectionSummaryRow) => item.expectedAmount.toFixed(2) },
    { header: 'Paid Amount (KES)', key: 'paidAmount' as keyof FeeCollectionSummaryRow, render: (_v: any, item: FeeCollectionSummaryRow) => item.paidAmount.toFixed(2) },
    { header: 'Arrears (KES)', key: 'arrears' as keyof FeeCollectionSummaryRow, render: (_v: any, item: FeeCollectionSummaryRow) => item.arrears.toFixed(2) },
  ];

  const isLoadingPage = loading.schoolPeriods || loading.classes || loading.studentInvoices || loading.studentPayments || loading.invoicePaymentApplications || loading.feeTemplates;

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    if (reportData.length === 0) {
      alert(t('messages.noDataToExport'));
      return;
    }
    const headers = columns.map(col => col.header).join(',');
    const rows = reportData.map(row => {
      return columns.map(col => {
        // @ts-ignore
        let value = row[col.key as keyof FeeCollectionSummaryRow];
        if (col.render) {
          value = col.render(value, row); // Use rendered value if available
        }
        // Handle potential commas in values by double-quoting
        const stringValue = String(value !== undefined && value !== null ? value : '-');
        return `"${stringValue.replace(/"/g, '""')}"`; // Escape double quotes
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
      <Card title="Fee Collection Summary Report">
         <div className="p-4 border-b mb-4 bg-gray-50 rounded-md filter-section">
            <p className="text-sm text-gray-600 mb-4">
                Aggregated summary of fee collection by votehead for the selected criteria.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <Select label="School Period" value={selectedSchoolPeriodId || ''} onChange={e => setSelectedSchoolPeriodId(Number(e.target.value) || undefined)} required>
                    <option value="">All Periods</option>
                    {(schoolPeriods || []).map(sp => <option key={sp.id} value={sp.id}>{sp.name}</option>)}
                </Select>
                <Select label="Class (Optional)" value={selectedClassId || ''} onChange={e => setSelectedClassId(Number(e.target.value) || undefined)}>
                    <option value="">All Classes</option>
                    {(classes || []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </Select>
                <Button onClick={handleGenerateReport} disabled={isGenerating || isLoadingPage || !selectedSchoolPeriodId} className="h-10 print-hide">
                    {isGenerating ? <Spinner size="sm" /> : 'Generate Summary'}
                </Button>
            </div>
        </div>

        {isLoadingPage && !isGenerating ? (
             <div className="flex justify-center items-center py-10"><Spinner size="lg" /><span className="ml-2">Loading data...</span></div>
        ) : isGenerating ? (
            <div className="flex justify-center items-center py-10"><Spinner /><span className="ml-2">Generating summary...</span></div>
        ) : reportData.length > 0 ? (
            <>
                <div className="flex justify-end space-x-2 mb-4 print-hide">
                    <Button variant="secondary" size="sm" onClick={handlePrint} leftIcon={<PrinterIcon className="w-4 h-4"/>}>Print</Button>
                    <Button variant="secondary" size="sm" onClick={handleExportCSV} leftIcon={<DownloadIcon className="w-4 h-4"/>}>Export CSV</Button>
                </div>
                <DataGrid columns={columns} data={(reportData || [])} loading={isGenerating} emptyState="No fee collection data found for the selected criteria."/>
            </>
        ) : (
            <p className="text-center text-gray-500 py-4">Please select filters and click "Generate Summary".</p>
        )}
      </Card>
    </div>
  );
};
const FeeCollectionSummaryPage: React.FC = () => (
  <div className="space-y-6">
    <FeeCollectionSummaryPageContent />
  </div>
);

export default FeeCollectionSummaryPage;
