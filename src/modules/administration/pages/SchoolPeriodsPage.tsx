// ABOUTME: Manages school period records and links them to academic years, period definitions, and financial years.
// ABOUTME: Provides a modal form with typed field parsing for select and date inputs.

import React, { useState, useMemo } from 'react';
import { SchoolPeriod, AcademicYear, AcademicPeriodDefinition, FinancialYear } from '@/types';
import Card from '@/components/ui/Card';
import { DataGrid, DataGridColumn } from '@/components/ui/data';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { PlusIcon, EditIcon, DeleteIcon, CalendarDaysIcon } from '@/components/ui/icons';
import { useSchoolPeriodData } from '../data/useSchoolPeriodData';
import { useAcademicYearData } from '../data/useAcademicYearData';
import { useAcademicPeriodDefinitionData } from '../data/useAcademicPeriodDefinitionData';
import { useAppData } from '@/hooks/useAppData';
import Spinner from '@/components/ui/Spinner';
import { useTranslation } from 'react-i18next';
import DialogForm from '@/components/ui/forms/DialogForm';
import FormSection from '@/components/ui/forms/FormSection';
import FormField from '@/components/ui/forms/FormField';
import FormActions from '@/components/ui/forms/FormActions';

type SchoolPeriodFormData = Omit<Partial<SchoolPeriod>, 'id' | 'created_at' | 'updated_at' | 'name' | 'academic_year_name' | 'period_definition_name' | 'financial_year_name' > & {
    period_definition_id?: string;
};

export const SchoolPeriodsContent: React.FC = () => {
  const { t } = useTranslation();
  const { schoolPeriods, addSchoolPeriod, updateSchoolPeriod, deleteSchoolPeriod } = useSchoolPeriodData();
  const { data: academicYears } = useAcademicYearData();
  const { data: academicPeriodDefinitions } = useAcademicPeriodDefinitionData();
  const { financialYears } = useAppData();
  
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

  const academicYearOptions = useMemo(
    () => [
      { value: '', label: 'Select Academic Year' },
      ...(academicYears || []).map((academicYear: AcademicYear) => ({
        value: academicYear.id.toString(),
        label: academicYear.name,
      })),
    ],
    [academicYears]
  );

  const periodDefinitionOptions = useMemo(
    () => [
      { value: '', label: 'Select Period Definition' },
      ...(academicPeriodDefinitions || []).map((periodDefinition: AcademicPeriodDefinition) => ({
        value: periodDefinition.id,
        label: `${periodDefinition.name} (${periodDefinition.structure_name})`,
      })),
    ],
    [academicPeriodDefinitions]
  );

  const financialYearOptions = useMemo(
    () => [
      { value: '', label: 'Select Financial Year' },
      ...(financialYears || []).map((financialYear: FinancialYear) => ({
        value: financialYear.id.toString(),
        label: financialYear.name,
      })),
    ],
    [financialYears]
  );

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
    } else if (name === 'academic_year_id' || name === 'financial_year_id') {
        processedValue = value ? parseInt(value, 10) : undefined;
        if(Number.isNaN(processedValue as number)) processedValue = undefined;
    } else if (name === 'period_definition_id') {
        processedValue = value || undefined;
    }
    
    setFormData(prev => ({ ...prev, [name]: processedValue }));
  };

  const handleSelectChange = (
    name: 'academic_year_id' | 'period_definition_id' | 'financial_year_id',
    value: string
  ) => {
    let processedValue: string | number | undefined = value;

    if (name === 'academic_year_id' || name === 'financial_year_id') {
      processedValue = value ? parseInt(value, 10) : undefined;
      if (Number.isNaN(processedValue as number)) {
        processedValue = undefined;
      }
    } else {
      processedValue = value || undefined;
    }

    setFormData(prev => ({ ...prev, [name]: processedValue }));
  };

  const handleSubmit = async () => {
    if (!formData.academic_year_id || !formData.period_definition_id || !formData.financial_year_id || !formData.start_date || !formData.end_date) {
      alert(t('validation.academicYearPeriodDefinitionFinancialYearStartDateAndEndDateAreRequired'));
      return;
    }
     if (new Date(formData.start_date) >= new Date(formData.end_date)) {
        alert(t('validation.endDateAfterStartDate'));
        return;
    }
    if(formData.mid_break_start && formData.mid_break_end && new Date(formData.mid_break_start) >= new Date(formData.mid_break_end)){
        alert(t('validation.midbreakEndDateMustBeAfterMidbreakStartDate'));
        return;
    }

    const payload = {
        academic_year_id: Number(formData.academic_year_id!),
        period_definition_id: String(formData.period_definition_id!),
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

  const columns: DataGridColumn<SchoolPeriod>[] = [
    { 
      key: 'id',
      header: 'ID', 
      sortable: true,
      filterable: true,
      width: 80,
      render: (value, item) => item.id
    },
    { 
      key: 'name',
      header: 'Name', 
      sortable: true,
      filterable: true,
      width: 200,
      render: (value, item) => item.name || '—'
    },
    { 
      key: 'academic_year_name',
      header: 'Academic Year', 
      sortable: true,
      filterable: true,
      width: 150,
      render: (value, item) => item.academic_year_name || '—'
    },
    { 
      key: 'period_definition_name',
      header: 'Period Definition', 
      sortable: true,
      filterable: true,
      width: 150,
      render: (value, item) => item.period_definition_name || '—'
    },
    { 
      key: 'financial_year_name',
      header: 'Financial Year', 
      sortable: true,
      filterable: true,
      width: 150,
      render: (value, item) => item.financial_year_name || '—'
    },
    { 
      key: 'start_date',
      header: 'Start Date', 
      sortable: true,
      filterable: true,
      width: 120,
      render: (value, item) => new Date(item.start_date).toLocaleDateString()
    },
    { 
      key: 'end_date',
      header: 'End Date', 
      sortable: true,
      filterable: true,
      width: 120,
      render: (value, item) => new Date(item.end_date).toLocaleDateString()
    },
    { 
      key: 'is_active',
      header: 'Active', 
      sortable: true,
      filterable: true,
      width: 80,
      render: (value, item) => item.is_active ? 'Yes' : 'No'
    },
    {
      key: 'actions',
      header: 'Actions',
      sortable: false,
      filterable: false,
      width: 200,
      sticky: 'right',
      render: (value, item) => (
        <div className="space-x-2">
          <Button size="sm" variant="ghost" onClick={() => openModal(item)} leftIcon={<EditIcon className="w-4 h-4" />}>Edit</Button>
          <Button size="sm" variant="danger" onClick={() => handleDelete(item.id)} leftIcon={<DeleteIcon className="w-4 h-4" />}>Delete</Button>
        </div>
      ),
    },
  ];


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
        <DataGrid 
          columns={columns} 
          data={schoolPeriods || []} 
          loading={false}
          sortable={true}
          filterable={true}
          emptyState={
            <div className="text-center py-8">
              <CalendarDaysIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No school periods found. Create your first period to get started.</p>
            </div>
          }
        />
      </Card>

      <DialogForm
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingPeriod ? 'Edit School Period' : 'Add New School Period'}
        size="xl"
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
      >
        <FormSection title="Period Configuration" columns={2}>
          <FormField label="Academic Year" required>
            <Select
              name="academic_year_id"
              value={formData.academic_year_id?.toString() || ''}
              onChange={(value) => handleSelectChange('academic_year_id', typeof value === 'string' ? value : '')}
              options={academicYearOptions}
              required
            />
          </FormField>
          <FormField label="Period Definition" required>
            <Select
              name="period_definition_id"
              value={formData.period_definition_id || ''}
              onChange={(value) => handleSelectChange('period_definition_id', typeof value === 'string' ? value : '')}
              options={periodDefinitionOptions}
              required
            />
          </FormField>
          <FormField label="Financial Year" required>
            <Select
              name="financial_year_id"
              value={formData.financial_year_id?.toString() || ''}
              onChange={(value) => handleSelectChange('financial_year_id', typeof value === 'string' ? value : '')}
              options={financialYearOptions}
              required
            />
          </FormField>
        </FormSection>

        <FormSection title="Dates" columns={2}>
          <FormField label="Start Date" required>
            <Input name="start_date" type="date" value={formData.start_date || ''} onChange={handleInputChange} required />
          </FormField>
          <FormField label="End Date" required>
            <Input name="end_date" type="date" value={formData.end_date || ''} onChange={handleInputChange} required />
          </FormField>
          <FormField label="Mid-Break Start Date (Optional)">
            <Input name="mid_break_start" type="date" value={formData.mid_break_start || ''} onChange={handleInputChange} />
          </FormField>
          <FormField label="Mid-Break End Date (Optional)">
            <Input name="mid_break_end" type="date" value={formData.mid_break_end || ''} onChange={handleInputChange} />
          </FormField>
        </FormSection>

        <FormSection title="Status">
          <div className="flex items-center">
            <input id="is_active" name="is_active" type="checkbox" className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
              checked={formData.is_active || false} onChange={handleInputChange} />
            <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900">Set as Active School Period</label>
          </div>
        </FormSection>

        <FormActions>
          <Button variant="secondary" onClick={closeModal}>Cancel</Button>
          <Button type="submit">
            {editingPeriod ? 'Save Changes' : 'Add Period'}
          </Button>
        </FormActions>
      </DialogForm>
    </div>
  );
};

const SchoolPeriodsPage: React.FC = () => (
  <div className="space-y-6">
    <SchoolPeriodsContent />
  </div>
);

export default SchoolPeriodsPage;
