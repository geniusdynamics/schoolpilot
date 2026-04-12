import React, { useState, useMemo, useCallback, useEffect } from 'react';
import Card from '@/components/ui/Card';
import { CurrencyDollarIcon } from '@/components/ui/icons';
import { useAppData } from '@/hooks/useAppData';
import Spinner from '@/components/ui/Spinner';
import Table from '@/components/ui/Table';
import Select from '@/components/ui/Select';
import Button from '@/components/ui/Button';
import { FinStudentInvoiceType, FinStudentPaymentType, FinFeeAdjustmentType } from '@/modules/finance/data/types';
import { Student, Class as SchoolClass, ClassStream, SchoolPeriod, InvoiceStatus } from '@/types';
import { useTranslation } from 'react-i18next';

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

const StudentFinancialSummaryPage: React.FC = () => {
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

  const [selectedClassId, setSelectedClassId] = useState<number | undefined>();
  const [selectedStreamId, setSelectedStreamId] = useState<number | undefined>();
  const [selectedSchoolPeriodId, setSelectedSchoolPeriodId] = useState<number | undefined>(
    (schoolPeriods || []).find(sp => sp.is_active)?.id || (schoolPeriods || [])[0]?.id
  );
  
  const [reportData, setReportData] = useState<FinancialSummaryRow[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const availableStreams = useMemo(() => {
    if (!selectedClassId) return (classStreams || []);
    return (classStreams || []).filter(cs => cs.class_id === selectedClassId);
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
      const streamsInClass = (classStreams || []).filter(cs => cs.class_id === selectedClassId).map(cs => cs.id);
      if (selectedStreamId) {
        filteredStudents = filteredStudents.filter(s => s.current_class_stream_id === selectedStreamId);
      } else {
        filteredStudents = filteredStudents.filter(s => s.current_class_stream_id && streamsInClass.includes(s.current_class_stream_id));
      }
    } else if (selectedStreamId) {
        filteredStudents = filteredStudents.filter(s => s.current_class_stream_id === selectedStreamId);
    }

    const summaryData: FinancialSummaryRow[] = filteredStudents.map(student => {
      const invoicesForStudentAndPeriod = (studentInvoices as FinStudentInvoiceType[]).filter(
        inv => inv.student_id === student.id && inv.school_period_id === selectedSchoolPeriodId && inv.status !== 'Voided'
      );
      const totalBilled = invoicesForStudentAndPeriod.reduce((sum, inv) => sum + inv.total_amount_billed, 0);

      const paymentsForStudent = (studentPayments as FinStudentPaymentType[]).filter(p => p.student_id === student.id);
      const totalPaid = paymentsForStudent.reduce((sum, p) => sum + p.total_amount_paid, 0);

      const adjustmentsForStudentAndPeriod = (feeAdjustments as FinFeeAdjustmentType[]).filter(
        adj => adj.student_id === student.id && adj.school_period_id === selectedSchoolPeriodId
      );
      const totalAdjustments = adjustmentsForStudentAndPeriod.reduce((sum, adj) => sum + adj.amount, 0);

      const balance = totalBilled + totalAdjustments - totalPaid;

      return {
        studentId: student.id,
        admissionNo: student.admission_no,
        studentName: `${student.first_name} ${student.last_name}`,
        className: student.current_class_name || undefined,
        totalBilled,
        totalPaid,
        totalAdjustments,
        balance,
      };
    });

    setReportData(summaryData);
    setIsGenerating(false);
  }, [students, selectedClassId, selectedStreamId, selectedSchoolPeriodId, studentInvoices, studentPayments, feeAdjustments, classStreams]);

  // Generate report on initial mount if period is selected
  useEffect(() => {
    if (selectedSchoolPeriodId) handleGenerateReport();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps


  const columns = [
    { header: 'Adm No', accessor: 'admissionNo' as keyof FinancialSummaryRow },
    { header: 'Student Name', accessor: 'studentName' as keyof FinancialSummaryRow },
    { header: 'Class', accessor: 'className' as keyof FinancialSummaryRow },
    { header: 'Total Billed (KES)', accessor: 'totalBilled' as keyof FinancialSummaryRow, render: (item: FinancialSummaryRow) => item.totalBilled.toFixed(2) },
    { header: 'Total Paid (KES)', accessor: 'totalPaid' as keyof FinancialSummaryRow, render: (item: FinancialSummaryRow) => item.totalPaid.toFixed(2) },
    { header: 'Adjustments (KES)', accessor: 'totalAdjustments' as keyof FinancialSummaryRow, render: (item: FinancialSummaryRow) => item.totalAdjustments.toFixed(2) },
    { header: 'Balance (KES)', accessor: 'balance' as keyof FinancialSummaryRow, render: (item: FinancialSummaryRow) => item.balance.toFixed(2) },
  ];

  const isLoadingPage = loading.students || loading.classes || loading.classStreams || loading.schoolPeriods || loading.studentInvoices || loading.studentPayments || loading.feeAdjustments;

  return (
    <div className="space-y-6">
      <Card title="Student Financial Summary Report">
        <div className="p-4 border-b mb-4 bg-gray-50 rounded-md">
            <p className="text-sm text-gray-600 mb-4">
                Summary of student fee balances for a selected period.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                 <Select label="School Period" value={selectedSchoolPeriodId || ''} onChange={e => setSelectedSchoolPeriodId(Number(e.target.value) || undefined)} required>
                    <option value="">All Periods</option>
                    {(schoolPeriods || []).map(sp => <option key={sp.id} value={sp.id}>{sp.name}</option>)}
                </Select>
                <Select label="Class" value={selectedClassId || ''} onChange={e => {setSelectedClassId(Number(e.target.value) || undefined); setSelectedStreamId(undefined);}}>
                    <option value="">All Classes</option>
                    {(classes || []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </Select>
                <Select label="Stream" value={selectedStreamId || ''} onChange={e => setSelectedStreamId(Number(e.target.value) || undefined)} disabled={!selectedClassId}>
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
                <Table columns={columns} data={reportData} isLoading={isGenerating} emptyStateMessage="No financial summary data found for the selected criteria."/>
            </>
        )}
      </Card>
    </div>
  );
};

export default StudentFinancialSummaryPage;