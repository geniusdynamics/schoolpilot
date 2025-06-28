
import React, { useState } from 'react';
import { PayrollPeriod, FinancialYear, SchoolPeriod, PayrollPeriodStatus } from '../../types';
import Card from '../../components/ui/Card';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import { PlusIcon, EditIcon, DeleteIcon, CalendarDaysIcon } from '../../components/ui/icons';
import { useAppData } from '../../contexts/AppDataContext'; // Updated
import Spinner from '../../components/ui/Spinner';

type PayrollPeriodFormData = Omit<Partial<PayrollPeriod>, 'id' | 'financial_year_name' | 'school_period_name' | 'status'> & {
    status: PayrollPeriodStatus; // Make status required for form
};

const PayrollPeriodsPage: React.FC = () => {
  const { 
    payrollPeriods, 
    financialYears,
    schoolPeriods,
    loading, 
    addPayrollPeriod, 
    updatePayrollPeriod, 
    deletePayrollPeriod 
  } = useAppData(); // Updated
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPeriod, setEditingPeriod] = useState<PayrollPeriod | null>(null);
  const initialFormData: PayrollPeriodFormData = { 
    name: '', 
    start_date: '', 
    end_date: '', 
    financial_year_id: undefined, 
    school_period_id: undefined, 
    status: PayrollPeriodStatus.OPEN 
  };
  const [formData, setFormData] = useState<PayrollPeriodFormData>(initialFormData);

  const openModal = (period?: PayrollPeriod) => {
    setEditingPeriod(period || null);
    setFormData(period ? 
      { 
        name: period.name, 
        start_date: period.start_date, 
        end_date: period.end_date, 
        financial_year_id: period.financial_year_id, 
        school_period_id: period.school_period_id, 
        status: period.status || PayrollPeriodStatus.OPEN
      } : 
      initialFormData
    );
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingPeriod(null);
    setFormData(initialFormData);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    let processedValue: string | number | undefined = value;
    if (name === 'financial_year_id' || name === 'school_period_id') {
        processedValue = value ? parseInt(value) : undefined;
    }
    setFormData(prev => ({ ...prev, [name]: processedValue }));
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.start_date || !formData.end_date || !formData.financial_year_id || !formData.status) {
      alert("Name, Start Date, End Date, Financial Year, and Status are required.");
      return;
    }
    if (new Date(formData.start_date) >= new Date(formData.end_date)) {
        alert("End date must be after start date.");
        return;
    }

    const payload: Omit<PayrollPeriod, 'id' | 'financial_year_name' | 'school_period_name'> = {
      name: formData.name!,
      start_date: formData.start_date!,
      end_date: formData.end_date!,
      financial_year_id: Number(formData.financial_year_id!),
      school_period_id: formData.school_period_id ? Number(formData.school_period_id) : undefined,
      status: formData.status!,
    };

    if (editingPeriod) {
      await updatePayrollPeriod({ ...editingPeriod, ...payload });
    } else {
      await addPayrollPeriod(payload);
    }
    closeModal();
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this payroll period? This might affect existing payslips.')) {
      await deletePayrollPeriod(id);
    }
  };

  const columns = [
    { header: 'ID', accessor: 'id' as keyof PayrollPeriod },
    { header: 'Period Name', accessor: 'name' as keyof PayrollPeriod },
    { header: 'Start Date', accessor: 'start_date' as keyof PayrollPeriod, render: (item: PayrollPeriod) => new Date(item.start_date).toLocaleDateString() },
    { header: 'End Date', accessor: 'end_date' as keyof PayrollPeriod, render: (item: PayrollPeriod) => new Date(item.end_date).toLocaleDateString() },
    { header: 'Financial Year', accessor: 'financial_year_name' as keyof PayrollPeriod },
    { header: 'School Period (Optional)', accessor: 'school_period_name' as keyof PayrollPeriod },
    { header: 'Status', accessor: 'status' as keyof PayrollPeriod, 
      render: (item: PayrollPeriod) => (
        <span className={`px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${item.status === PayrollPeriodStatus.OPEN ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {item.status}
        </span>
      )
    },
    {
      header: 'Actions',
      accessor: 'id' as keyof PayrollPeriod,
      render: (item: PayrollPeriod) => (
        <div className="space-x-2">
          <Button size="sm" variant="ghost" onClick={() => openModal(item)} leftIcon={<EditIcon className="w-4 h-4" />}>Edit</Button>
          <Button size="sm" variant="danger" onClick={() => handleDelete(item.id)} leftIcon={<DeleteIcon className="w-4 h-4" />}>Delete</Button>
        </div>
      ),
    },
  ];

  const isLoadingPageData = loading.payrollPeriods || loading.financialYears || loading.schoolPeriods;

  if (isLoadingPageData && !isModalOpen) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner size="lg" /> <span className="ml-2">Loading Payroll Periods...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card title="Payroll Periods Management" actions={
        <Button onClick={() => openModal()} leftIcon={<PlusIcon className="w-5 h-5" />}>
          Add Payroll Period
        </Button>
      }>
        <p className="text-sm text-gray-600 mb-4">
          Define payroll periods for processing staff salaries. Link them to financial years and optionally to school periods.
        </p>
        <Table columns={columns} data={payrollPeriods} isLoading={loading.payrollPeriods && isModalOpen} />
      </Card>

      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingPeriod ? 'Edit Payroll Period' : 'Add New Payroll Period'} size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={closeModal}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={loading.payrollPeriods}>
              {loading.payrollPeriods ? <Spinner size="sm"/> : (editingPeriod ? 'Save Changes' : 'Add Period')}
            </Button>
          </>
        }
      >
        <Input 
          name="name" 
          label="Period Name" 
          placeholder="e.g., July 2024 Payroll"
          value={formData.name || ''} 
          onChange={handleInputChange} 
          required 
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input 
            name="start_date" 
            label="Start Date" 
            type="date"
            value={formData.start_date || ''} 
            onChange={handleInputChange} 
            required 
            />
            <Input 
            name="end_date" 
            label="End Date" 
            type="date"
            value={formData.end_date || ''} 
            onChange={handleInputChange} 
            required 
            />
        </div>
        <Select 
          name="financial_year_id" 
          label="Financial Year" 
          value={formData.financial_year_id || ''} 
          onChange={handleInputChange}
          required
        >
          <option value="">Select Financial Year</option>
          {financialYears.map((fy: FinancialYear) => (
            <option key={fy.id} value={fy.id}>{fy.name}</option>
          ))}
        </Select>
        <Select 
          name="school_period_id" 
          label="School Period (Optional)" 
          value={formData.school_period_id || ''} 
          onChange={handleInputChange}
        >
          <option value="">None</option>
          {schoolPeriods.map((sp: SchoolPeriod) => (
            <option key={sp.id} value={sp.id}>{sp.name}</option>
          ))}
        </Select>
         <Select 
          name="status" 
          label="Status" 
          value={formData.status} 
          onChange={handleInputChange}
          required
        >
          {Object.values(PayrollPeriodStatus).map((status) => (
            <option key={status} value={status}>{status}</option>
          ))}
        </Select>
      </Modal>
    </div>
  );
};

export default PayrollPeriodsPage;
