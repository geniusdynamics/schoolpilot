
import React, { useState, useMemo } from 'react';
import { Payslip, PayrollPeriod, PayslipStatus, PayslipItem, AcademicYear } from '../../types';
import Card from '../../components/ui/Card';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Select from '../../components/ui/Select';
import { ScaleIcon, EyeIcon, ListBulletIcon, CalendarDaysIcon } from '../../components/ui/icons';
import { useAppData } from '../../contexts/AppDataContext'; // Updated
import Spinner from '../../components/ui/Spinner';

const PayslipsPage: React.FC = () => {
  const { 
    payslips, 
    payrollPeriods, 
    academicYears,
    loading, 
    generatePayslipsForPeriod 
  } = useAppData(); // Updated
  
  const [selectedAcademicYearId, setSelectedAcademicYearId] = useState<number | undefined>(academicYears[0]?.id);
  const [selectedPayrollPeriodId, setSelectedPayrollPeriodId] = useState<number | undefined>();
  const [viewingPayslip, setViewingPayslip] = useState<Payslip | null>(null);

  const filteredPayrollPeriods = useMemo(() => {
    if (!selectedAcademicYearId) return payrollPeriods;
    // This assumes payrollPeriods are linked to financial years which might loosely map to academic years.
    // For a more direct link, PayrollPeriod would need academic_year_id or a way to filter by AY's date range.
    // For now, let's assume a simpler filter or all periods if no direct link.
    // This logic might need refinement based on actual data relations.
    const ay = academicYears.find(a => a.id === selectedAcademicYearId);
    if (!ay) return payrollPeriods;
    return payrollPeriods.filter(pp => {
        // A simple check if payroll period overlaps with academic year dates
        const ppStart = new Date(pp.start_date);
        const ppEnd = new Date(pp.end_date);
        const ayStart = new Date(ay.start_date);
        const ayEnd = new Date(ay.end_date);
        return (ppStart >= ayStart && ppStart <= ayEnd) || (ppEnd >= ayStart && ppEnd <= ayEnd);
    });
  }, [selectedAcademicYearId, academicYears, payrollPeriods]);

  const payslipsForSelectedPeriod = useMemo(() => {
    if (!selectedPayrollPeriodId) return [];
    return payslips.filter(p => p.payroll_period_id === selectedPayrollPeriodId);
  }, [selectedPayrollPeriodId, payslips]);

  const handleGeneratePayslips = async () => {
    if (!selectedPayrollPeriodId) {
      alert("Please select a payroll period to generate payslips.");
      return;
    }
    await generatePayslipsForPeriod(selectedPayrollPeriodId);
  };

  const openPayslipDetailsModal = (payslip: Payslip) => {
    setViewingPayslip(payslip);
  };

  const closePayslipDetailsModal = () => {
    setViewingPayslip(null);
  };

  const payslipColumns = [
    { header: 'Payslip ID', accessor: 'id' as keyof Payslip },
    { header: 'Staff Name', accessor: 'staff_name' as keyof Payslip },
    { header: 'Payroll Period', accessor: 'payroll_period_name' as keyof Payslip },
    { header: 'Gross Salary', accessor: 'gross_salary' as keyof Payslip, render: (item: Payslip) => `Ksh ${item.gross_salary?.toFixed(2) || '0.00'}`},
    { header: 'Total Deductions', accessor: 'total_deductions' as keyof Payslip, render: (item: Payslip) => `Ksh ${item.total_deductions?.toFixed(2) || '0.00'}`},
    { header: 'Net Salary', accessor: 'net_salary' as keyof Payslip, render: (item: Payslip) => `Ksh ${item.net_salary?.toFixed(2) || '0.00'}`},
    { header: 'Status', accessor: 'status' as keyof Payslip, 
      render: (item: Payslip) => (
        <span className={`px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${
            item.status === PayslipStatus.PAID ? 'bg-green-100 text-green-800' :
            item.status === PayslipStatus.PROCESSED ? 'bg-blue-100 text-blue-800' :
            'bg-yellow-100 text-yellow-800' // Draft
        }`}>{item.status}</span>
      )
    },
    {
      header: 'Actions',
      accessor: 'id' as keyof Payslip,
      render: (item: Payslip) => (
        <Button size="sm" variant="ghost" onClick={() => openPayslipDetailsModal(item)} leftIcon={<EyeIcon className="w-4 h-4" />}>
          View Details
        </Button>
      ),
    },
  ];

  const payslipItemColumns = [
    { header: 'Description', accessor: 'item_type_name' as keyof PayslipItem },
    { header: 'Category', accessor: 'item_category' as keyof PayslipItem },
    { header: 'Amount (KES)', accessor: 'amount' as keyof PayslipItem, render: (item: PayslipItem) => item.amount?.toFixed(2) || '0.00' },
  ];

  const isLoadingPage = loading.payslips || loading.payrollPeriods || loading.academicYears;

  if (isLoadingPage && !viewingPayslip) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner size="lg" /> <span className="ml-2">Loading Payslips Data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card title="Payslips Management" icon={<ScaleIcon className="w-6 h-6 text-green-600"/>}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 p-4 border rounded-md bg-gray-50">
           <Select 
                label="Academic Year (for period filter)" 
                value={selectedAcademicYearId || ''} 
                onChange={e => setSelectedAcademicYearId(Number(e.target.value) || undefined)}
            >
                <option value="">Select Academic Year</option>
                {academicYears.map(ay => <option key={ay.id} value={ay.id}>{ay.name}</option>)}
            </Select>
            <Select 
                name="payroll_period_id" 
                label="Select Payroll Period" 
                value={selectedPayrollPeriodId || ''} 
                onChange={e => setSelectedPayrollPeriodId(Number(e.target.value) || undefined)}
                disabled={!selectedAcademicYearId && academicYears.length > 0} 
                required
            >
                <option value="">-- Select Payroll Period --</option>
                {filteredPayrollPeriods.map((period: PayrollPeriod) => (
                    <option key={period.id} value={period.id}>{period.name}</option>
                ))}
            </Select>
            <div className="md:pt-6"> {/* Align button with inputs */}
              <Button 
                onClick={handleGeneratePayslips} 
                disabled={!selectedPayrollPeriodId || loading.payslips}
                leftIcon={loading.payslips && selectedPayrollPeriodId ? <Spinner size="sm"/> : <CalendarDaysIcon className="w-5 h-5"/>}
              >
                {loading.payslips && selectedPayrollPeriodId ? 'Generating...' : 'Generate Payslips for Period'}
              </Button>
            </div>
        </div>
        
        {selectedPayrollPeriodId ? (
             payslipsForSelectedPeriod.length > 0 ? (
                 <Table columns={payslipColumns} data={payslipsForSelectedPeriod} isLoading={loading.payslips && !!selectedPayrollPeriodId} />
             ) : (
                 <p className="text-center text-gray-500 py-4">No payslips generated for the selected period yet, or no staff salary settings found for active staff.</p>
             )
        ) : (
            <p className="text-center text-gray-500 py-4">Please select a payroll period to view or generate payslips.</p>
        )}
      </Card>

      {/* Payslip Details Modal */}
      <Modal 
        isOpen={!!viewingPayslip} 
        onClose={closePayslipDetailsModal} 
        title={`Payslip Details for ${viewingPayslip?.staff_name} (${viewingPayslip?.payroll_period_name})`} 
        size="xl"
        footer={<Button variant="secondary" onClick={closePayslipDetailsModal}>Close</Button>}
      >
        {viewingPayslip && (
            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 p-4 border rounded-md bg-indigo-50">
                    <div><strong className="text-gray-700">Gross Salary:</strong> <span className="font-semibold text-indigo-700">Ksh {viewingPayslip.gross_salary?.toFixed(2)}</span></div>
                    <div><strong className="text-gray-700">Total Deductions:</strong> <span className="font-semibold text-indigo-700">Ksh {viewingPayslip.total_deductions?.toFixed(2)}</span></div>
                    <div className="col-span-2 text-lg"><strong className="text-gray-700">Net Salary:</strong> <span className="font-bold text-green-600">Ksh {viewingPayslip.net_salary?.toFixed(2)}</span></div>
                </div>
                <h4 className="text-md font-semibold text-gray-700 mt-2">Payslip Items:</h4>
                <Table columns={payslipItemColumns} data={viewingPayslip.items || []} />
            </div>
        )}
      </Modal>
    </div>
  );
};

export default PayslipsPage;
