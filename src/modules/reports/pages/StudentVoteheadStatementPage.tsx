import React, { useState, useMemo, useCallback } from 'react';
import Card from '@/components/ui/Card';
import { CurrencyDollarIcon, PrinterIcon, DownloadIcon } from '@/components/ui/icons';
import { useAppData } from '@/contexts/AppDataContext';
import Spinner from '@/components/ui/Spinner';
import Table from '@/components/ui/Table';
import Select from '@/components/ui/Select';
import Button from '@/components/ui/Button';
import { Student, SchoolPeriod, StudentInvoice, StudentPayment, InvoicePaymentApplication, StudentInvoiceItem, InvoiceStatus } from '@/types';
import { useTranslation } from 'react-i18next';

interface StatementRow {
  date: string;
  description: string;
  invoiceNo?: string;
  paymentRef?: string;
  debit: number;
  credit: number;
  balance: number;
}

const StudentVoteheadStatementPage: React.FC = () => {
  const { 
    students, 
    schoolPeriods,
    studentInvoices,
    studentInvoiceItems,
    studentPayments,
    invoicePaymentApplications,
    loading 
  } = useAppData();

  const [selectedStudentId, setSelectedStudentId] = useState<string | undefined>();
  const [selectedSchoolPeriodId, setSelectedSchoolPeriodId] = useState<number | undefined>(
    schoolPeriods.find(sp => sp.is_active)?.id || schoolPeriods[0]?.id
  );
  
  const [reportData, setReportData] = useState<StatementRow[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [openingBalance, setOpeningBalance] = useState(0); // For simplicity, can enhance later

  const handleGenerateReport = useCallback(() => {
    if (!selectedStudentId || !selectedSchoolPeriodId) {
      alert(t('validation.pleaseSelectAStudentAndASchoolPeriod'));
      setReportData([]);
      return;
    }
    setIsGenerating(true);
    
    const student = (students || []).find(s => s.id === selectedStudentId);
    if (!student) {
        setIsGenerating(false);
        return;
    }

    // For simplicity, opening balance is mock. Real OB would come from StudentOpeningBalance or prior period's closing.
    const mockOB = (studentOpeningBalances || []).find(ob => ob.student_id === selectedStudentId)?.amount || 0;
    setOpeningBalance(mockOB);

    let runningBalance = mockOB;
    const statementEntries: StatementRow[] = [];

    if(mockOB !== 0) {
        statementEntries.push({
            date: schoolPeriods.find(p => p.id === selectedSchoolPeriodId)?.start_date || new Date().toISOString(), // Approx.
            description: 'Opening Balance',
            debit: mockOB > 0 ? mockOB : 0,
            credit: mockOB < 0 ? -mockOB : 0,
            balance: runningBalance
        });
    }

    const invoicesForStudentAndPeriod = (studentInvoices || []).filter(
      inv => inv.student_id === selectedStudentId && inv.school_period_id === selectedSchoolPeriodId && inv.status !== InvoiceStatus.VOIDED
    );
    
    (invoicesForStudentAndPeriod || []).forEach(invoice => {
      (invoice.items || []).forEach(item => {
        runningBalance += item.amount;
        statementEntries.push({
          date: invoice.issue_date,
          description: item.description,
          invoiceNo: invoice.invoice_number,
          debit: item.amount,
          credit: 0,
          balance: runningBalance,
        });
      });
    });

    const paymentsForStudent = (studentPayments || []).filter(p => p.student_id === selectedStudentId);
    // Filter payments that fall within the selected school period (approximate for now)
    // And apply applications for these payments
    paymentsForStudent.forEach(payment => {
        // Consider only payments applied to invoices of the selected period for more accuracy
        // This requires checking invoicePaymentApplications
        const applicationsForThisPayment = (invoicePaymentApplications || []).filter(ipa => ipa.payment_id === payment.id);
        let paymentAppliedToThisPeriod = false;
        
        for(const app of applicationsForThisPayment) {
            const invItem = (studentInvoiceItems || []).find(sii => sii.id === app.invoice_item_id);
            if(invItem) {
                const parentInvoice = (studentInvoices || []).find(si => si.id === invItem.invoice_id);
                if(parentInvoice && parentInvoice.school_period_id === selectedSchoolPeriodId) {
                    paymentAppliedToThisPeriod = true;
                    break;
                }
            }
        }
        
        if(paymentAppliedToThisPeriod) { // Or a simpler date check if needed
            runningBalance -= payment.total_amount_paid;
            statementEntries.push({
                date: payment.transaction_date,
                description: `Payment Received (${payment.payment_method || 'N/A'})`,
                paymentRef: payment.receipt_no,
                debit: 0,
                credit: payment.total_amount_paid,
                balance: runningBalance,
            });
        }
    });

    (statementEntries || []).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    // Re-calculate running balance after sorting
    let currentBal = mockOB;
    const finalStatement = (statementEntries || []).map(entry => {
        if (entry.description === 'Opening Balance') {
           // OB balance is already set correctly if it was the first entry
           // If it's not (e.g. manual OB entered mid-statement), this logic needs adjustment
           return entry;
        }
        currentBal += entry.debit - entry.credit;
        return {...entry, balance: currentBal };
    });


    setReportData(finalStatement);
    setIsGenerating(false);
  }, [selectedStudentId, selectedSchoolPeriodId, students, studentInvoices, studentInvoiceItems, studentPayments, invoicePaymentApplications, schoolPeriods]);
  
  // Mock studentOpeningBalances as it's not part of the report's primary data fetching from useAppData for this page directly.
  const studentOpeningBalances = useMemo(() => [
      {student_id: "S001", amount: 500}, 
      {student_id: "S002", amount: -200},
    ], []);


  const columns = [
    { header: 'Date', accessor: 'date' as keyof StatementRow, render: (item: StatementRow) => new Date(item.date).toLocaleDateString() },
    { header: 'Description', accessor: 'description' as keyof StatementRow },
    { header: 'Invoice/Receipt No', accessor: (item: StatementRow) => item.invoiceNo || item.paymentRef || '-' },
    { header: 'Debit (KES)', accessor: 'debit' as keyof StatementRow, render: (item: StatementRow) => item.debit > 0 ? item.debit.toFixed(2) : '-' },
    { header: 'Credit (KES)', accessor: 'credit' as keyof StatementRow, render: (item: StatementRow) => item.credit > 0 ? item.credit.toFixed(2) : '-' },
    { header: 'Balance (KES)', accessor: 'balance' as keyof StatementRow, render: (item: StatementRow) => item.balance.toFixed(2) },
  ];

  const isLoadingPage = loading.students || loading.schoolPeriods || loading.studentInvoices || loading.studentInvoiceItems || loading.studentPayments || loading.invoicePaymentApplications;

  const handlePrintAndExportPDF = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      <Card title="Student Votehead Statement Report">
        <div className="p-4 border-b mb-4 bg-gray-50 rounded-md filter-section">
            <p className="text-sm text-gray-600 mb-4">
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
            <Table columns={columns} data={reportData} isLoading={isGenerating} emptyStateMessage="No transactions found for the selected criteria."/>
            <div className="mt-4 text-right text-lg font-bold">
                Closing Balance: KES {reportData.length > 0 ? reportData[reportData.length-1].balance.toFixed(2) : openingBalance.toFixed(2)}
            </div>
          </>
        ) : (
            <p className="text-center text-gray-500 py-4">Please select filters and click "Generate Statement".</p>
        )}
      </Card>
    </div>
  );
};

export default StudentVoteheadStatementPage;