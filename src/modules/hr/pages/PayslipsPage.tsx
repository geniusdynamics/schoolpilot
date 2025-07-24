import React, { useState, useMemo } from 'react';
import { Payslip, PayrollPeriod, PayslipStatus, PayslipItem, AcademicYear } from '@/types';
import Card from '@/components/ui/Card';
import { DataGrid, DataGridColumn } from '@/components/ui';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Select from '@/components/ui/Select';
import { ScaleIcon, EyeIcon, ListBulletIcon, CalendarDaysIcon } from '@/components/ui/icons';
import { useAppData } from '@/contexts/AppDataContext'; // Updated
import Spinner from '@/components/ui/Spinner';
import { useTranslation } from 'react-i18next';

const PayslipsPage: React.FC = () => {
  const { 
    payslips, 
    payrollPeriods, 
    academicYears,
    loading, 
    generatePayslipsForPeriod 
  } = useAppData(); // Updated
  
  const [selectedAcademicYearId, setSelectedAcademicYearId] = useState<number | undefined>((academicYears || [])[0]?.id);
  const [selectedPayrollPeriodId, setSelectedPayrollPeriodId] = useState<number | undefined>();
  const [viewingPayslip, setViewingPayslip] = useState<Payslip | null>(null);

  const filteredPayrollPeriods = useMemo(() => {
    if (!selectedAcademicYearId) return (payrollPeriods || []);
    // This assumes payrollPeriods are linked to financial years which might loosely map to academic years.
    // For a more direct link, PayrollPeriod would need academic_year_id or a way to filter by AY's date range.
    // For now, let's assume a simpler filter or all periods if no direct link.
    // This logic might need refinement based on actual data relations.
    const ay = (academicYears || []).find(a => a.id === selectedAcademicYearId);
    if (!ay) return (payrollPeriods || []);
    return (payrollPeriods || []).filter(pp => {
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
    return (payslips || []).filter(p => p.payroll_period_id === selectedPayrollPeriodId);
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

  const payslipColumns: DataGridColumn<Payslip>[] = [
    { 
      key: 'id', 
      header: 'Payslip ID', 
      sortable: true, 
      filterable: true, 
      width: 100
    },
    { 
      key: 'staff_name', 
      header: 'Staff Name', 
      sortable: true, 
      filterable: true, 
      width: 200
    },
    { 
      key: 'payroll_period_name', 
      header: 'Payroll Period', 
      sortable: true, 
      filterable: true, 
      width: 150
    },
    { 
      key: 'gross_salary', 
      header: 'Gross Salary', 
      sortable: true, 
      filterable: false, 
      width: 120,
      render: (value, row) => `Ksh ${row.gross_salary?.toFixed(2) || '0.00'}`
    },
    { 
      key: 'total_deductions', 
      header: 'Total Deductions', 
      sortable: true, 
      filterable: false, 
      width: 140,
      render: (value, row) => `Ksh ${row.total_deductions?.toFixed(2) || '0.00'}`
    },
    { 
      key: 'net_salary', 
      header: 'Net Salary', 
      sortable: true, 
      filterable: false, 
      width: 120,
      render: (value, row) => `Ksh ${row.net_salary?.toFixed(2) || '0.00'}`
    },
    { 
      key: 'status', 
      header: 'Status', 
      sortable: true, 
      filterable: true, 
      width: 120,
      render: (value, row) => (
        <span className={`px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${
            row.status === PayslipStatus.PAID ? 'bg-green-100 text-green-800' :
            row.status === PayslipStatus.PROCESSED ? 'bg-blue-100 text-blue-800' :
            'bg-yellow-100 text-yellow-800' // Draft
        }`}>{row.status}</span>
      )
    },
    {
      key: 'id',
      header: 'Actions',
      sortable: false,
      filterable: false,
      width: 120,
      sticky: 'right',
      render: (value, row) => (
        <Button size="sm" variant="ghost" onClick={() => openPayslipDetailsModal(row)} leftIcon={<EyeIcon className="w-4 h-4" />}>
          View Details
        </Button>
      ),
    },
  ];

  const payslipItemColumns: DataGridColumn<PayslipItem>[] = [
    { 
      key: 'item_type_name', 
      header: 'Description', 
      sortable: true, 
      filterable: true, 
      width: 200
    },
    { 
      key: 'item_category', 
      header: 'Category', 
      sortable: true, 
      filterable: true, 
      width: 150
    },
    { 
      key: 'amount', 
      header: 'Amount (KES)', 
      sortable: true, 
      filterable: false, 
      width: 150,
      render: (value, row) => row.amount?.toFixed(2) || '0.00'
    },
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
                {(academicYears || []).map(ay => <option key={ay.id} value={ay.id}>{ay.name}</option>)}
            </Select>
            <Select 
                name="payroll_period_id" 
                label="Select Payroll Period" 
                value={selectedPayrollPeriodId || ''} 
                onChange={e => setSelectedPayrollPeriodId(Number(e.target.value) || undefined)}
                disabled={!selectedAcademicYearId && (academicYears || []).length > 0} 
                required
            >
                <option value="">-- Select Payroll Period --</option>
                {(filteredPayrollPeriods || []).map((period: PayrollPeriod) => (
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
                 <DataGrid 
                   columns={payslipColumns} 
                   data={payslipsForSelectedPeriod || []} 
                   isLoading={loading.payslips && !!selectedPayrollPeriodId}
                   sortable
                   filterable
                   emptyState={{
                     icon: <ScaleIcon className="w-12 h-12 text-gray-400" />,
                     title: "No payslips found",
                     description: "No payslips generated for the selected period yet, or no staff salary settings found for active staff."
                   }}
                 />
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
                <DataGrid 
                  columns={payslipItemColumns} 
                  data={viewingPayslip?.items || []}
                  sortable
                  filterable
                  emptyState={{
                    icon: <ListBulletIcon className="w-8 h-8 text-gray-400" />,
                    title: "No payslip items",
                    description: "No items found for this payslip."
                  }}
                />
            </div>
        )}
      </Modal>
    </div>
  );
};

export default PayslipsPage;
