import React, { useState, useMemo } from 'react';
import { AcademicYear, AcademicYearStructure } from '@/types';
import Card from '@/components/ui/Card';
import { DataGrid, DataGridColumn } from '@/components/ui/data';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { PlusIcon, EditIcon, DeleteIcon, CalendarDaysIcon } from '@/components/ui/icons';
import { useAppData } from '@/hooks/useAppData'; // Updated
import Spinner from '@/components/ui/Spinner';
import { useTranslation } from 'react-i18next';
import DialogForm from '@/components/ui/forms/DialogForm';
import FormSection from '@/components/ui/forms/FormSection';
import FormField from '@/components/ui/forms/FormField';
import FormActions from '@/components/ui/forms/FormActions';

type AcademicYearFormData = Omit<Partial<AcademicYear>, 'id' | 'created_at' | 'updated_at' | 'structure_name'> & {
    structure_id?: number; 
};

export const AcademicYearsContent: React.FC = () => {
  const appData = useAppData();
  const academicYears = appData.academicYears || [];
  const academicYearStructures = appData.academicYearStructures || [];
  const loading = appData.loading || {};
  const addAcademicYear = appData.addAcademicYear;
  const updateAcademicYear = appData.updateAcademicYear;
  const deleteAcademicYear = appData.deleteAcademicYear;
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingYear, setEditingYear] = useState<AcademicYear | null>(null);
  const initialFormData: AcademicYearFormData = { name: '', structure_id: undefined, start_date: '', end_date: '' };
  const [formData, setFormData] = useState<AcademicYearFormData>(initialFormData);

  const openModal = (year?: AcademicYear) => {
    setEditingYear(year || null);
    setFormData(year ? 
      { name: year.name, structure_id: year.structure_id, start_date: year.start_date, end_date: year.end_date } : 
      initialFormData
    );
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingYear(null);
    setFormData(initialFormData);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    let processedValue: string | number | undefined = value;
    if (name === 'structure_id') {
        processedValue = value ? parseInt(value, 10) : undefined;
        if (Number.isNaN(processedValue as number)) processedValue = undefined;
    }
    setFormData(prev => ({ ...prev, [name]: processedValue })); 
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.structure_id || !formData.start_date || !formData.end_date) {
      alert(t('validation.allFieldsRequired'));
      return;
    }
    if (new Date(formData.start_date) >= new Date(formData.end_date)) {
        alert(t('validation.endDateAfterStartDate'));
        return;
    }
    const payload = { 
        name: formData.name!, 
        structure_id: formData.structure_id!, 
        start_date: formData.start_date!,
        end_date: formData.end_date!,
    };

    if (editingYear) {
      await updateAcademicYear({ ...editingYear, ...payload });
    } else {
      await addAcademicYear(payload);
    }
    closeModal();
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this academic year? This might affect related school periods and other academic data.')) {
      await deleteAcademicYear(id);
    }
  };

  const columns: DataGridColumn<AcademicYear>[] = [
    { 
      key: 'id', 
      header: 'ID', 
      sortable: true, 
      filterable: true, 
      width: 80,
      render: (value, item) => <span className="font-mono text-sm">{value}</span>
    },
    { 
      key: 'name', 
      header: 'Year Name', 
      sortable: true, 
      filterable: true, 
      width: 150,
      render: (value, item) => <span className="font-medium">{value}</span>
    },
    { 
      key: 'structure_name', 
      header: 'Structure', 
      sortable: true, 
      filterable: true, 
      width: 150,
      render: (value, item) => <span className="text-blue-600">{value || '—'}</span>
    },
    { 
      key: 'start_date', 
      header: 'Start Date', 
      sortable: true, 
      filterable: true, 
      width: 120,
      render: (value, item) => (
        <span className="text-green-600 font-medium">
          {new Date(value).toLocaleDateString()}
        </span>
      )
    },
    { 
      key: 'end_date', 
      header: 'End Date', 
      sortable: true, 
      filterable: true, 
      width: 120,
      render: (value, item) => (
        <span className="text-red-600 font-medium">
          {new Date(value).toLocaleDateString()}
        </span>
      )
    },
    {
      key: 'id',
      header: 'Actions',
      sortable: false,
      filterable: false,
      width: 150,
      sticky: 'right',
      render: (value, item) => (
        <div className="space-x-2">
          <Button size="sm" variant="ghost" onClick={() => openModal(item)} leftIcon={<EditIcon className="w-4 h-4" />}>Edit</Button>
          <Button size="sm" variant="danger" onClick={() => handleDelete(item.id)} leftIcon={<DeleteIcon className="w-4 h-4" />}>Delete</Button>
        </div>
      ),
    },
  ];

  if ((loading.academicYears || loading.academicYearStructures) && !isModalOpen) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner size="lg" /> <span className="ml-2">Loading Academic Years...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card title="Academic Years Management" actions={
        <Button onClick={() => openModal()} leftIcon={<PlusIcon className="w-5 h-5" />}>
          Add Academic Year
        </Button>
      }>
        <p className="text-sm text-gray-600 mb-4">
          Define academic years (e.g., "AY 2023/2024"), link them to an Academic Year Structure, and set their start and end dates.
        </p>
        <DataGrid 
          columns={columns} 
          data={academicYears || []} 
          loading={loading.academicYears}
          sortable={true}
          filterable={true}
          emptyState={
            <div className="text-center py-8">
              <CalendarDaysIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No academic years found. Create your first academic year to get started.</p>
            </div>
          }
        />
      </Card>

      <DialogForm
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingYear ? 'Edit Academic Year' : 'Add New Academic Year'}
        size="lg"
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
      >
        <FormSection title="Academic Year Details">
          <FormField label="Academic Year Name" required>
            <Input
              name="name"
              placeholder="e.g., AY 2024/2025"
              value={formData.name || ''}
              onChange={handleInputChange}
              required
            />
          </FormField>
          <FormField label="Academic Year Structure" required>
            <Select
              name="structure_id"
              value={formData.structure_id || ''}
              onChange={handleInputChange}
              required
            >
              <option value="">Select Structure</option>
              {academicYearStructures.map((structure: AcademicYearStructure) => (
                <option key={structure.id} value={structure.id}>
                  {structure.name}
                </option>
              ))}
            </Select>
          </FormField>
        </FormSection>

        <FormSection title="Duration" columns={2}>
          <FormField label="Start Date" required>
            <Input
              name="start_date"
              type="date"
              value={formData.start_date || ''}
              onChange={handleInputChange}
              required
            />
          </FormField>
          <FormField label="End Date" required>
            <Input
              name="end_date"
              type="date"
              value={formData.end_date || ''}
              onChange={handleInputChange}
              required
            />
          </FormField>
        </FormSection>

        <FormActions>
          <Button variant="secondary" onClick={closeModal}>Cancel</Button>
          <Button type="submit" disabled={loading.academicYears}>
            {loading.academicYears ? <Spinner size="sm"/> : (editingYear ? 'Save Changes' : 'Add Year')}
          </Button>
        </FormActions>
      </DialogForm>
    </div>
  );
};

const AcademicYearsPage: React.FC = () => (
  <div className="space-y-6">
    <AcademicYearsContent />
  </div>
);

export default AcademicYearsPage;
