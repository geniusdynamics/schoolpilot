import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Card from '@/components/ui/Card';

import { useAppData } from '@/hooks/useAppData';
import Spinner from '@/components/ui/Spinner';
import { DataGrid } from '@/components/ui/data';
import Select from '@/components/ui/Select';
import Button from '@/components/ui/Button';
import type { StudentInvoice as FinStudentInvoiceType, StudentPayment as FinStudentPaymentType, FeeAdjustment as FinFeeAdjustmentType } from '@/core/types';


interface FinancialSummaryRow {
  studentId: string;
  admissionNo: string;
  studentName: string;
  className?: string;
  totalBilled: number;
  totalPaid: number;
  totalAdjustments: number;
  balance: number;
}

export const StudentFinancialSummaryPageContent: React.FC = () => {
  const { t } = useTranslation(['reports', 'common']);
  const { 
    students, 
    classes, 
    classStreams, 
    schoolPeriods,
    studentInvoices,
    studentPayments,
    feeAdjustments,
    loading 
  } = useAppData();

  const [selectedClassId, setSelectedClassId] = useState<string | undefined>();
  const [selectedStreamId, setSelectedStreamId] = useState<string | undefined>();
  const [selectedSchoolPeriodId, setSelectedSchoolPeriodId] = useState<string | undefined>(() => {
    const period = (schoolPeriods || []).find(sp => sp.is_active) || (schoolPeriods || [])[0];
    return period?.id != null ? String(period.id) : undefined;
  });
  
  const [reportData, setReportData] = useState<FinancialSummaryRow[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const availableStreams = useMemo(() => {
    if (!selectedClassId) return (classStreams || []);
    return (classStreams || []).filter(cs => String(cs.class_id) === selectedClassId);
  }, [selectedClassId, classStreams]);

  const handleGenerateReport = useCallback(() => {
    if (!selectedSchoolPeriodId) {
        alert(t('validation.pleaseSelectASchoolPeriod'));
        setReportData([]);
        return;
    }
    setIsGenerating(true);
    
    let filteredStudents = [...(students || [])];
    if (selectedClassId) {
      const streamsInClass = (classStreams || [])
        .filter(cs => String(cs.class_id) === selectedClassId)
        .map(cs => String(cs.id));
      if (selectedStreamId) {
        filteredStudents = filteredStudents.filter(s => String(s.current_class_stream_id) === selectedStreamId);
      } else {
        filteredStudents = filteredStudents.filter(s => s.current_class_stream_id && streamsInClass.includes(String(s.current_class_stream_id)));
      }
    } else if (selectedStreamId) {
        filteredStudents = filteredStudents.filter(s => String(s.current_class_stream_id) === selectedStreamId);
    }

    const summaryData: FinancialSummaryRow[] = filteredStudents.map(student => {
      const invoicesForStudentAndPeriod = (studentInvoices as FinStudentInvoiceType[]).filter(
        inv => String(inv.student_id) === String(student.id) && String(inv.school_period_id) === selectedSchoolPeriodId && inv.status !== 'Voided'
      );
      const totalBilled = invoicesForStudentAndPeriod.reduce((sum, inv) => sum + inv.total_amount_billed, 0);

      const paymentsForStudent = (studentPayments as FinStudentPaymentType[]).filter(p => p.student_id === student.id);
      const totalPaid = paymentsForStudent.reduce((sum, p) => sum + p.total_amount_paid, 0);

      const adjustmentsForStudentAndPeriod = (feeAdjustments as FinFeeAdjustmentType[]).filter(
        adj => String(adj.student_id) === String(student.id) && String(adj.school_period_id) === selectedSchoolPeriodId
      );
      const totalAdjustments = adjustmentsForStudentAndPeriod.reduce((sum, adj) => sum + adj.amount, 0);

      const balance = totalBilled + totalAdjustments - totalPaid;

      return {
        studentId: student.id,
        admissionNo: student.admission_no,
        studentName: [student.first_name, student.last_name].filter(Boolean).join(' ') || 'Unknown',
        className: student.current_class_name || undefined,
        totalBilled,
        totalPaid,
        totalAdjustments,
        balance,
      };
    });

    setReportData(summaryData);
    setIsGenerating(false);
  }, [students, selectedClassId, selectedStreamId, selectedSchoolPeriodId, studentInvoices, studentPayments, feeAdjustments, classStreams, t]);

  // Generate report on initial mount if period is selected
  useEffect(() => {
    if (selectedSchoolPeriodId) handleGenerateReport();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const columns = [
    { header: 'Adm No', key: 'admissionNo' as keyof FinancialSummaryRow },
    { header: 'Student Name', key: 'studentName' as keyof FinancialSummaryRow },
    { header: 'Class', key: 'className' as keyof FinancialSummaryRow },
    { header: 'Total Billed (KES)', key: 'totalBilled' as keyof FinancialSummaryRow, render: (_v: any, item: FinancialSummaryRow) => item.totalBilled.toFixed(2) },
    { header: 'Total Paid (KES)', key: 'totalPaid' as keyof FinancialSummaryRow, render: (_v: any, item: FinancialSummaryRow) => item.totalPaid.toFixed(2) },
    { header: 'Adjustments (KES)', key: 'totalAdjustments' as keyof FinancialSummaryRow, render: (_v: any, item: FinancialSummaryRow) => item.totalAdjustments.toFixed(2) },
    { header: 'Balance (KES)', key: 'balance' as keyof FinancialSummaryRow, render: (_v: any, item: FinancialSummaryRow) => item.balance.toFixed(2) },
  ];

  const isLoadingPage = loading.students || loading.classes || loading.classStreams || loading.schoolPeriods || loading.studentInvoices || loading.studentPayments || loading.feeAdjustments;

  return (
    <div className="space-y-6">
      <Card title="Student Financial Summary Report">
        <div className="p-4 border-b mb-4 bg-surface-muted rounded-md">
            <p className="text-sm text-surface-muted-fg mb-4">
                Summary of student fee balances for a selected period.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                 <Select label="School Period" value={selectedSchoolPeriodId || ''} onChange={e => setSelectedSchoolPeriodId(e.target.value || undefined)} required>
                    <option value="">All Periods</option>
                    {(schoolPeriods || []).map(sp => <option key={sp.id} value={sp.id}>{sp.name}</option>)}
                </Select>
                <Select label="Class" value={selectedClassId || ''} onChange={e => {setSelectedClassId(e.target.value || undefined); setSelectedStreamId(undefined);}}>
                    <option value="">All Classes</option>
                    {(classes || []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </Select>
                <Select label="Stream" value={selectedStreamId || ''} onChange={e => setSelectedStreamId(e.target.value || undefined)} disabled={!selectedClassId}>
                    <option value="">All Streams</option>
                    {(availableStreams || []).map(cs => <option key={cs.id} value={cs.id}>{cs.name}</option>)}
                </Select>
                <Button onClick={handleGenerateReport} disabled={isGenerating || isLoadingPage || !selectedSchoolPeriodId} className="h-10">
                    {isGenerating ? <Spinner size="sm" /> : 'Generate Report'}
                </Button>
            </div>
        </div>

        {isLoadingPage && !isGenerating ? (
             <div className="flex justify-center items-center py-10"><Spinner size="lg" /><span className="ml-2">Loading data...</span></div>
        ) : isGenerating ? (
            <div className="flex justify-center items-center py-10"><Spinner /><span className="ml-2">Generating report...</span></div>
        ) : (
            <>
                <div className="flex justify-end space-x-2 mb-4">
                    <Button variant="secondary" size="sm" onClick={() => alert(t('messages.printToBeDeveloped'))}>Print</Button>
                    <Button variant="secondary" size="sm" onClick={() => alert(t('messages.exportToBeDeveloped'))}>Export CSV</Button>
                </div>
                <DataGrid columns={columns} data={reportData} loading={isGenerating} emptyState="No financial summary data found for the selected criteria." keyField="studentId"/>
            </>
        )}
      </Card>
    </div>
  );
};
const StudentFinancialSummaryPage: React.FC = () => (
  <div className="space-y-6">
    <StudentFinancialSummaryPageContent />
  </div>
);

export default StudentFinancialSummaryPage;
