import React, { useState } from 'react';
import { Department } from '@/types'; // Department is a core type
import Card from '@/components/ui/Card';
import { DataGrid, DataGridColumn } from '@/components/ui/data';
import Button from '@/components/ui/Button';

import Input from '@/components/ui/Input';
import { PlusIcon, EditIcon, DeleteIcon } from '@/components/ui/icons';
import { useDepartmentData } from '../data/useDepartmentData';
import { useTranslation } from 'react-i18next';
import DialogForm from '../../../components/ui/forms/DialogForm';
import FormSection from '../../../components/ui/forms/FormSection';
import FormField from '../../../components/ui/forms/FormField';
import FormActions from '../../../components/ui/forms/FormActions';
import { useConfirm } from '@/components/ui/ConfirmDialog';

type DepartmentFormData = Omit<Partial<Department>, 'id' | 'created_at' | 'updated_at'>;

const DepartmentsPage: React.FC = () => {
  const { departments, addDepartment, updateDepartment, deleteDepartment } = useDepartmentData();
  const { t } = useTranslation('administration');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const initialFormData: DepartmentFormData = { name: '', is_academic: false };
  const [formData, setFormData] = useState<DepartmentFormData>(initialFormData);

  const openModal = (dept?: Department) => {
    setEditingDepartment(dept || null);
    setFormData(dept ? { ...dept } : initialFormData);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setEditingDepartment(null);
    setFormData(initialFormData);
    setIsModalOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = async () => {
    if (!formData.name) {
      alert(t('validation.departmentNameIsRequired'));
      return;
    }
    const payload = {
      name: formData.name!,
      is_academic: formData.is_academic || false,
    };

    if (editingDepartment) {
      await updateDepartment({ ...editingDepartment, ...payload });
    } else {
      await addDepartment(payload);
    }
    closeModal();
  };

  const confirm = useConfirm();
  const handleDelete = async (id: string) => {
    if ((await confirm({ variant: 'danger', message: 'Are you sure you want to delete this department?' }))) {
      await deleteDepartment(id);
    }
  };

  const columns: DataGridColumn<Department>[] = [
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
      header: 'Department Name', 
      sortable: true, 
      filterable: true, 
      width: 200,
      render: (value, item) => <span className="font-medium">{value}</span>
    },
    { 
      key: 'is_academic', 
      header: 'Is Academic', 
      sortable: true, 
      filterable: true, 
      width: 120,
      render: (value, item) => (
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
          value ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
        }`}>
          {value ? 'Yes' : 'No'}
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

  return (
    <div className="space-y-6">
      <Card title={t('departments.management')} actions={
        <Button onClick={() => openModal()} leftIcon={<PlusIcon className="w-5 h-5" />}>
          {t('departments.addDepartment')}
        </Button>
      }>
        <DataGrid 
          columns={columns} 
          data={departments || []} 
          loading={false}
          sortable={true}
          filterable={true}
          emptyState={
            <div className="text-center py-8">
              <PlusIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No departments found. Create your first department to get started.</p>
            </div>
          }
        />
      </Card>

      <DialogForm
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingDepartment ? t('departments.editDepartment') : t('departments.addNewDepartment')}
        size="lg"
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
      >
        <FormSection>
          <FormField label={t('departments.departmentName')} required>
            <Input
              name="name"
              value={formData.name || ''}
              onChange={handleInputChange}
              required
            />
          </FormField>
          <div className="flex items-center">
            <input
              id="is_academic"
              name="is_academic"
              type="checkbox"
              checked={formData.is_academic || false}
              onChange={handleInputChange}
              className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
            />
            <label htmlFor="is_academic" className="ml-2 block text-sm text-gray-900">
              {t('departments.isAcademicDepartment')}
            </label>
          </div>
        </FormSection>
        <FormActions>
          <Button variant="secondary" onClick={closeModal}>{t('departments.cancel')}</Button>
          <Button type="submit" disabled={isModalOpen}>
            {editingDepartment ? t('departments.saveChanges') : t('departments.addDepartment')}
          </Button>
        </FormActions>
      </DialogForm>
    </div>
  );
};

export default DepartmentsPage;

export const DepartmentsContent = DepartmentsPage;
