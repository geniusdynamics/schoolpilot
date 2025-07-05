import React, { useState, useMemo } from 'react';
import { SchoolPeriod, AcademicYear, AcademicPeriodDefinition, FinancialYear } from '@/types';
import Card from '@/components/ui/Card';
import Table from '@/components/ui/Table';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { PlusIcon, EditIcon, DeleteIcon, CalendarDaysIcon } from '@/components/ui/icons';
import { useAppData } from '@/contexts/AppDataContext'; // Updated
import Spinner from '@/components/ui/Spinner';
import { useTranslation } from 'react-i18next';

type SchoolPeriodFormData = Omit<Partial<SchoolPeriod>, 'id' | 'created_at' | 'updated_at' | 'name' | 'academic_year_name' | 'period_definition_name' | 'financial_year_name' > & {
    period_definition_id?: number; 
};

const SchoolPeriodsPage: React.FC = () => {
  const { 
    schoolPeriods, 
    academicYears,
    academicPeriodDefinitions,
    financialYears,
    loading, 
    addSchoolPeriod, 
    updateSchoolPeriod, 
    deleteSchoolPeriod 
  } = useAppData(); // Updated
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPeriod, setEditingPeriod] = useState<SchoolPeriod | null>(null);
  
  const initialFormData: SchoolPeriodFormData = { 
    academic_year_id: undefined, 
    period_definition_id: undefined,
    financial_year_id: undefined,
    start_date: '', 
    end_date: '',
    is_active: false,
  };
  const [formData, setFormData] = useState<SchoolPeriodFormData>(initialFormData);

  const openModal = (period?: SchoolPeriod) => {
    setEditingPeriod(period || null);
    setFormData(period ? 
      { 
        academic_year_id: period.academic_year_id,
        period_definition_id: period.period_definition_id,
        financial_year_id: period.financial_year_id,
        start_date: period.start_date, 
        end_date: period.end_date,
        mid_break_start: period.mid_break_start,
        mid_break_end: period.mid_break_end,
        is_active: period.is_active,
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
    const { name, value, type } = e.target;
    
    let processedValue: string | number | boolean | undefined = value;

    if (type === 'checkbox' && 'checked' in e.target) {
        processedValue = (e.target as HTMLInputElement).checked;
    } else if (name === 'academic_year_id' || name === 'financial_year_id' || name === 'period_definition_id') {
        processedValue = value ? parseInt(value, 10) : undefined;
        if(Number.isNaN(processedValue as number)) processedValue = undefined;
    }
    
    setFormData(prev => ({ ...prev, [name]: processedValue }));
  };

  const handleSubmit = async () => {
    if (!formData.academic_year_id || !formData.period_definition_id || !formData.financial_year_id || !formData.start_date || !formData.end_date) {
      alert("Academic Year, Period Definition, Financial Year, Start Date, and End Date are required.");
      return;
    }
     if (new Date(formData.start_date) >= new Date(formData.end_date)) {
        alert("End date must be after start date.");
        return;
    }
    if(formData.mid_break_start && formData.mid_break_end && new Date(formData.mid_break_start) >= new Date(formData.mid_break_end)){
        alert("Mid-break end date must be after mid-break start date.");
        return;
    }

    const payload = { 
        academic_year_id: Number(formData.academic_year_id!), 
        period_definition_id: Number(formData.period_definition_id!), 
        financial_year_id: Number(formData.financial_year_id!),
        start_date: formData.start_date!,
        end_date: formData.end_date!,
        mid_break_start: formData.mid_break_start || undefined,
        mid_break_end: formData.mid_break_end || undefined,
        is_active: formData.is_active || false,
    };

    if (editingPeriod) {
      await updateSchoolPeriod({ ...editingPeriod, ...payload });
    } else {
      await addSchoolPeriod(payload);
    }
    closeModal();
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this school period?')) {
      await deleteSchoolPeriod(id);
    }
  };

  const columns = [
    { header: 'ID', accessor: 'id' as keyof SchoolPeriod },
    { header: 'Name', accessor: 'name' as keyof SchoolPeriod },
    { header: 'Academic Year', accessor: 'academic_year_name' as keyof SchoolPeriod },
    { header: 'Period Definition', accessor: 'period_definition_name' as keyof SchoolPeriod },
    { header: 'Financial Year', accessor: 'financial_year_name' as keyof SchoolPeriod },
    { header: 'Start Date', accessor: 'start_date' as keyof SchoolPeriod, render: (item: SchoolPeriod) => new Date(item.start_date).toLocaleDateString() },
    { header: 'End Date', accessor: 'end_date' as keyof SchoolPeriod, render: (item: SchoolPeriod) => new Date(item.end_date).toLocaleDateString() },
    { header: 'Active', accessor: 'is_active' as keyof SchoolPeriod },
    {
      header: 'Actions',
      accessor: 'id' as keyof SchoolPeriod,
      render: (item: SchoolPeriod) => (
        <div className="space-x-2">
          <Button size="sm" variant="ghost" onClick={() => openModal(item)} leftIcon={<EditIcon className="w-4 h-4" />}>Edit</Button>
          <Button size="sm" variant="danger" onClick={() => handleDelete(item.id)} leftIcon={<DeleteIcon className="w-4 h-4" />}>Delete</Button>
        </div>
      ),
    },
  ];

  if ((loading.schoolPeriods || loading.academicYears || loading.academicPeriodDefinitions || loading.financialYears) && !isModalOpen) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner size="lg" /> <span className="ml-2">Loading School Periods...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card title="School Periods (Terms/Semesters)" actions={
        <Button onClick={() => openModal()} leftIcon={<PlusIcon className="w-5 h-5" />}>
          Add School Period
        </Button>
      }>
         <p className="text-sm text-gray-600 mb-4">
          Define specific school terms or semesters within an academic year. Link them to financial years and academic period definitions (e.g., "Term 1").
        </p>
        <Table columns={columns} data={schoolPeriods} isLoading={loading.schoolPeriods && isModalOpen} />
      </Card>

      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingPeriod ? 'Edit School Period' : 'Add New School Period'} size="xl"
        footer={
          <>
            <Button variant="secondary" onClick={closeModal}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={loading.schoolPeriods}>
              {loading.schoolPeriods ? <Spinner size="sm"/> : (editingPeriod ? 'Save Changes' : 'Add Period')}
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select name="academic_year_id" label="Academic Year" value={formData.academic_year_id || ''} onChange={handleInputChange} required>
                <option value="">Select Academic Year</option>
                {academicYears.map((ay: AcademicYear) => (<option key={ay.id} value={ay.id}>{ay.name}</option>))}
            </Select>
            <Select name="period_definition_id" label="Period Definition" value={formData.period_definition_id || ''} onChange={handleInputChange} required>
                <option value="">Select Period Definition</option>
                {academicPeriodDefinitions.map((pd: AcademicPeriodDefinition) => (<option key={pd.id} value={pd.id}>{pd.name} ({pd.structure_name})</option>))}
            </Select>
            <Select name="financial_year_id" label="Financial Year" value={formData.financial_year_id || ''} onChange={handleInputChange} required>
                <option value="">Select Financial Year</option>
                {financialYears.map((fy: FinancialYear) => (<option key={fy.id} value={fy.id}>{fy.name}</option>))}
            </Select>
            <Input name="start_date" label="Start Date" type="date" value={formData.start_date || ''} onChange={handleInputChange} required />
            <Input name="end_date" label="End Date" type="date" value={formData.end_date || ''} onChange={handleInputChange} required />
            <Input name="mid_break_start" label="Mid-Break Start Date (Optional)" type="date" value={formData.mid_break_start || ''} onChange={handleInputChange} />
            <Input name="mid_break_end" label="Mid-Break End Date (Optional)" type="date" value={formData.mid_break_end || ''} onChange={handleInputChange} />
             <div className="flex items-center mt-2 md:col-span-2">
                <input id="is_active" name="is_active" type="checkbox" className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500" 
                    checked={formData.is_active || false} onChange={handleInputChange} />
                <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900">Set as Active School Period</label>
            </div>
        </div>
      </Modal>
    </div>
  );
};

export default SchoolPeriodsPage;
