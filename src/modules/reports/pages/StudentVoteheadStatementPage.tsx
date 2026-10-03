// ABOUTME: Renders the student votehead statement page for period-based charges and allocations.
// ABOUTME: Delegates statement math to a pure builder so balances stay consistent with finance data.

import React, { useState, useCallback } from 'react';
import Card from '@/components/ui/Card';

import { useAppData } from '@/hooks/useAppData';
import Spinner from '@/components/ui/Spinner';
import { DataGrid } from '@/components/ui/data';
import Select from '@/components/ui/Select';
import Button from '@/components/ui/Button';
import { useTranslation } from 'react-i18next';
import { DownloadIcon, PrinterIcon } from '@/components/ui/icons';
import {
  buildStudentVoteheadStatement,
  StatementRow
} from '@/modules/reports/utils/studentVoteheadStatement';

type StatementGridRow = StatementRow & { id: string };

export const StudentVoteheadStatementPageContent: React.FC = () => {
  const { t } = useTranslation();
  const { 
    students, 
    schoolPeriods,
    studentInvoices,
    studentInvoiceItems,
    studentPayments,
    invoicePaymentApplications,
    studentOpeningBalances,
    loading 
  } = useAppData();

  const [selectedStudentId, setSelectedStudentId] = useState<string | undefined>();
  const [selectedSchoolPeriodId, setSelectedSchoolPeriodId] = useState<number | undefined>(
    schoolPeriods.find(sp => sp.is_active)?.id || schoolPeriods[0]?.id
  );
  
  const [reportData, setReportData] = useState<StatementGridRow[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [openingBalance, setOpeningBalance] = useState(0);

  const handleGenerateReport = useCallback(() => {
    if (!selectedStudentId || !selectedSchoolPeriodId) {
      alert(t('validation.pleaseSelectAStudentAndASchoolPeriod', 'Please select a student and a school period.'));
      setReportData([]);
      return;
    }

    setIsGenerating(true);
    const student = (students || []).find(s => s.id === selectedStudentId);

    if (!student) {
      setIsGenerating(false);
      return;
    }

    const statement = buildStudentVoteheadStatement({
      selectedStudentId,
      selectedSchoolPeriodId,
      schoolPeriods: schoolPeriods || [],
      studentInvoices: studentInvoices || [],
      studentInvoiceItems: studentInvoiceItems || [],
      studentPayments: studentPayments || [],
      invoicePaymentApplications: invoicePaymentApplications || [],
      studentOpeningBalances: studentOpeningBalances || []
    });

    setOpeningBalance(statement.openingBalance);
    setReportData(statement.rows.map((row, index) => ({
      ...row,
      id: `${row.date}-${row.description}-${index}`
    })));
    setIsGenerating(false);
  }, [
    invoicePaymentApplications,
    schoolPeriods,
    selectedSchoolPeriodId,
    selectedStudentId,
    studentInvoices,
    studentInvoiceItems,
    studentOpeningBalances,
    studentPayments,
    students,
    t
  ]);

  const columns = [
    { header: 'Date', key: 'date' as keyof StatementRow, render: (_v: any, item: StatementRow) => new Date(item.date).toLocaleDateString() },
    { header: 'Description', key: 'description' as keyof StatementRow },
    { header: 'Invoice/Receipt No', key: 'reference_no', render: (_v: any, item: StatementRow) => item.invoiceNo || item.paymentRef || '-' },
    { header: 'Debit (KES)', key: 'debit' as keyof StatementRow, render: (_v: any, item: StatementRow) => item.debit > 0 ? item.debit.toFixed(2) : '-' },
    { header: 'Credit (KES)', key: 'credit' as keyof StatementRow, render: (_v: any, item: StatementRow) => item.credit > 0 ? item.credit.toFixed(2) : '-' },
    { header: 'Balance (KES)', key: 'balance' as keyof StatementRow, render: (_v: any, item: StatementRow) => item.balance.toFixed(2) },
  ];

  const isLoadingPage = loading.students || loading.schoolPeriods || loading.studentInvoices || loading.studentInvoiceItems || loading.studentPayments || loading.invoicePaymentApplications || loading.studentOpeningBalances;

  const handlePrintAndExportPDF = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      <Card title="Student Votehead Statement Report">
        <div className="p-4 border-b mb-4 bg-surface-muted rounded-md filter-section">
            <p className="text-sm text-surface-muted-fg mb-4">
                Detailed statement of charges and payments for a selected student and period.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <Select label="Select Student" value={selectedStudentId || ''} onChange={e => setSelectedStudentId(e.target.value || undefined)} required>
                    <option value="">-- Student --</option>
                    {(students || []).map(s => <option key={s.id} value={s.id}>{s.first_name} {s.last_name} ({s.admission_no})</option>)}
                </Select>
                <Select label="School Period" value={selectedSchoolPeriodId || ''} onChange={e => setSelectedSchoolPeriodId(Number(e.target.value) || undefined)} required>
                    <option value="">-- Period --</option>
                    {(schoolPeriods || []).map(sp => <option key={sp.id} value={sp.id}>{sp.name}</option>)}
                </Select>
                <Button onClick={handleGenerateReport} disabled={isGenerating || isLoadingPage || !selectedStudentId || !selectedSchoolPeriodId} className="h-10 print-hide">
                    {isGenerating ? <Spinner size="sm" /> : 'Generate Statement'}
                </Button>
            </div>
        </div>

        {isLoadingPage && !isGenerating ? (
             <div className="flex justify-center items-center py-10"><Spinner size="lg" /><span className="ml-2">Loading data...</span></div>
        ) : isGenerating ? (
            <div className="flex justify-center items-center py-10"><Spinner /><span className="ml-2">Generating statement...</span></div>
        ) : reportData.length > 0 ? (
          <>
            <div className="mb-4 p-3 bg-indigo-50 rounded-md">
                <h3 className="text-md font-semibold">Student: {students.find(s => s.id === selectedStudentId)?.display_name}</h3>
                <p className="text-sm">Period: {schoolPeriods.find(p => p.id === selectedSchoolPeriodId)?.name}</p>
                <p className="text-sm">Opening Balance (for period): KES {openingBalance.toFixed(2)}</p>
            </div>
            <div className="flex justify-end space-x-2 mb-4 print-hide">
                <Button variant="secondary" size="sm" onClick={handlePrintAndExportPDF} leftIcon={<PrinterIcon className="w-4 h-4"/>}>Print</Button>
                <Button variant="secondary" size="sm" onClick={handlePrintAndExportPDF} leftIcon={<DownloadIcon className="w-4 h-4"/>}>Export PDF</Button>
            </div>
            <DataGrid columns={columns} data={reportData} loading={isGenerating} emptyState="No transactions found for the selected criteria."/>
            <div className="mt-4 text-right text-lg font-bold">
                Closing Balance: KES {reportData.length > 0 ? reportData[reportData.length-1].balance.toFixed(2) : openingBalance.toFixed(2)}
            </div>
          </>
        ) : (
            <p className="text-center text-surface-muted-fg py-4">Please select filters and click "Generate Statement".</p>
        )}
      </Card>
    </div>
  );
};
const StudentVoteheadStatementPage: React.FC = () => (
  <div className="space-y-6">
    <StudentVoteheadStatementPageContent />
  </div>
);

export default StudentVoteheadStatementPage;
