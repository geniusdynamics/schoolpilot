import React, { useState } from 'react';
import { Dormitory, Staff } from '@/types';
import Card from '@/components/ui/Card';
import { DataGrid, DataGridColumn } from '@/components/ui/data';
import Button from '@/components/ui/Button';

import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { PlusIcon, EditIcon, DeleteIcon, BuildingLibraryIcon } from '@/components/ui/icons';
import { useAppData } from '@/hooks/useAppData'; 
import Spinner from '@/components/ui/Spinner';
import { useTranslation } from 'react-i18next';
import DialogForm from '@/components/ui/forms/DialogForm';
import FormSection from '@/components/ui/forms/FormSection';
import FormField from '@/components/ui/forms/FormField';
import FormActions from '@/components/ui/forms/FormActions';

type DormitoryFormData = Omit<Partial<Dormitory>, 'id' | 'created_at' | 'updated_at' | 'master_name'>;

const DormitoriesPage: React.FC = () => {
  const { dormitories, staff, loading, addDormitory, updateDormitory, deleteDormitory } = useAppData();
  const { t } = useTranslation('administration');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDormitory, setEditingDormitory] = useState<Dormitory | null>(null);
  const initialFormData: DormitoryFormData = { name: '', master_id: undefined, capacity: undefined };
  const [formData, setFormData] = useState<DormitoryFormData>(initialFormData);

  const openModal = (dorm?: Dormitory) => {
    setEditingDormitory(dorm || null);
    setFormData(dorm ? { name: dorm.name, master_id: dorm.master_id, capacity: dorm.capacity } : initialFormData);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingDormitory(null);
    setFormData(initialFormData);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value === '' && name === 'master_id' ? undefined : (name === 'capacity' ? (value ? parseInt(value) : undefined) : value) }));
  };

  const handleSubmit = async () => {
    if (!formData.name) {
      alert(t('validation.dormitoryNameIsRequired'));
      return;
    }
    const payload = {
      name: formData.name!,
      master_id: formData.master_id || undefined,
      capacity: formData.capacity || undefined,
    };

    if (editingDormitory) {
      await updateDormitory({ ...editingDormitory, ...payload });
    } else {
      await addDormitory(payload);
    }
    closeModal();
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this dormitory?')) {
      await deleteDormitory(id);
    }
  };

  const columns: DataGridColumn<Dormitory>[] = [
    { 
      key: 'id', 
      header: 'ID', 
      sortable: true, 
      filterable: true, 
      width: 80,
      render: (value, item) => value
    },
    { 
      key: 'name', 
      header: 'Dormitory Name', 
      sortable: true, 
      filterable: true, 
      width: 200,
      render: (value, item) => value
    },
    { 
      key: 'master_name', 
      header: 'Master/Mistress', 
      sortable: true, 
      filterable: true, 
      width: 180,
      render: (value, item) => value || '-'
    },
    { 
      key: 'capacity', 
      header: 'Capacity', 
      sortable: true, 
      filterable: true, 
      width: 120,
      render: (value, item) => value || '-'
    },
    {
      key: 'actions',
      header: 'Actions',
      sortable: false,
      filterable: false,
      width: 160,
      sticky: 'right',
      render: (value, item) => (
        <div className="space-x-2">
          <Button size="sm" variant="ghost" onClick={() => openModal(item)} leftIcon={<EditIcon className="w-4 h-4" />}>Edit</Button>
          <Button size="sm" variant="danger" onClick={() => handleDelete(item.id)} leftIcon={<DeleteIcon className="w-4 h-4" />}>Delete</Button>
        </div>
      ),
    },
  ];
  
  if ((loading.dormitories || loading.staff) && !isModalOpen) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner size="lg" /> <span className="ml-2">Loading Dormitories...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card title={t('dormitories.management')} actions={
        <Button onClick={() => openModal()} leftIcon={<PlusIcon className="w-5 h-5" />}>
          {t('dormitories.addDormitory')}
        </Button>
      }>
        <DataGrid 
          columns={columns} 
          data={dormitories} 
          loading={loading.dormitories && isModalOpen}
          sortable 
          filterable 
          emptyState={
            <div className="text-center py-12">
              <BuildingLibraryIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No dormitories found</h3>
              <p className="mt-1 text-sm text-gray-500">Get started by adding your first dormitory.</p>
            </div>
          }
        />
      </Card>

      <DialogForm
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingDormitory ? t('dormitories.editDormitory') : t('dormitories.addNewDormitory')}
        size="lg"
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
      >
        <FormSection>
          <FormField label={t('dormitories.dormitoryName')} required>
            <Input
              name="name"
              value={formData.name || ''}
              onChange={handleInputChange}
              required
            />
          </FormField>
          <FormField label={t('dormitories.capacity')}>
            <Input
              name="capacity"
              type="number"
              value={formData.capacity || ''}
              onChange={handleInputChange}
            />
          </FormField>
          <FormField label={t('dormitories.dormitoryMasterMistress')}>
            <Select
              name="master_id"
              value={formData.master_id || ''}
              onChange={handleInputChange}
            >
              <option value="">{t('dormitories.selectStaffMember')}</option>
              {staff.filter(s => s.is_active).map((staffMember: Staff) => (
                <option key={staffMember.id} value={staffMember.id}>
                  {staffMember.first_name} {staffMember.last_name} ({staffMember.designation_title || 'N/A'})
                </option>
              ))}
            </Select>
          </FormField>
        </FormSection>
        <FormActions>
          <Button variant="secondary" onClick={closeModal}>{t('dormitories.cancel')}</Button>
          <Button type="submit" disabled={loading.dormitories}>
            {loading.dormitories ? <Spinner size="sm"/> : (editingDormitory ? t('dormitories.saveChanges') : t('dormitories.addDormitory'))}
          </Button>
        </FormActions>
      </DialogForm>
    </div>
  );
};

export default DormitoriesPage;
