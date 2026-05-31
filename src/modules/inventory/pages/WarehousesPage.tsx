import React, { useState } from 'react';
import { Warehouse } from '@/types';
import Card from '@/components/ui/Card';
import { DataGrid, DataGridColumn } from '@/components/ui';
import Button from '@/components/ui/Button';
import DialogForm from '@/components/ui/forms/DialogForm';
import FormSection from '@/components/ui/forms/FormSection';
import FormField from '@/components/ui/forms/FormField';
import FormActions from '@/components/ui/forms/FormActions';
import Input from '@/components/ui/Input';
import { PlusIcon, EditIcon, DeleteIcon, CubeTransparentIcon } from '@/components/ui/icons';
import { useAppData } from '@/hooks/useAppData'; // Updated
import Spinner from '@/components/ui/Spinner';
import { useTranslation } from 'react-i18next';

type WarehouseFormData = Omit<Partial<Warehouse>, 'id'>;

export const WarehousesPageContent: React.FC = () => {
  const { warehouses, loading, addWarehouse, updateWarehouse, deleteWarehouse } = useAppData(); // Updated
  const { t } = useTranslation('inventory');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(null);
  const initialFormData: WarehouseFormData = { name: '' };
  const [formData, setFormData] = useState<WarehouseFormData>(initialFormData);

  const openModal = (warehouse?: Warehouse) => {
    setEditingWarehouse(warehouse || null);
    setFormData(warehouse ? { name: warehouse.name } : initialFormData);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingWarehouse(null);
    setFormData(initialFormData);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    if (!formData.name) {
      alert(t('validation.warehouseNameIsRequired'));
      return;
    }
    const payload = { name: formData.name! };

    if (editingWarehouse) {
      await updateWarehouse({ ...editingWarehouse, ...payload });
    } else {
      await addWarehouse(payload);
    }
    closeModal();
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this warehouse? This might affect stock levels.')) {
      await deleteWarehouse(id);
    }
  };

  const columns: DataGridColumn<Warehouse>[] = [
    { 
      key: 'id', 
      header: 'ID', 
      sortable: true, 
      filterable: true, 
      width: 80
    },
    { 
      key: 'name', 
      header: 'Warehouse Name', 
      sortable: true, 
      filterable: true, 
      width: 200
    },
    {
      key: 'id',
      header: 'Actions',
      sortable: false,
      filterable: false,
      width: 150,
      sticky: 'right',
      render: (value, row) => (
        <div className="space-x-1">
          <Button size="sm" variant="ghost" onClick={() => openModal(row)} leftIcon={<EditIcon className="w-4 h-4" />}>Edit</Button>
          <Button size="sm" variant="danger" onClick={() => handleDelete(row.id)} leftIcon={<DeleteIcon className="w-4 h-4" />}>Delete</Button>
        </div>
      ),
    },
  ];

  if (loading.warehouses && !isModalOpen) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner size="lg" /> <span className="ml-2">Loading Warehouses...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card title={t('warehouses.title')} actions={
        <Button onClick={() => openModal()} leftIcon={<PlusIcon className="w-5 h-5" />}>
          {t('warehouses.addWarehouse')}
        </Button>
      }>
        <p className="text-sm text-gray-600 mb-4">
          {t('warehouses.description')}
        </p>
        <DataGrid 
          columns={columns} 
          data={warehouses || []} 
          isLoading={loading.warehouses && isModalOpen}
          sortable
          filterable
          emptyState={{
            icon: <CubeTransparentIcon className="w-12 h-12 text-gray-400" />,
            title: "No warehouses found",
            description: "Create warehouses to organize and track your inventory across different locations.",
            action: {
              label: "Add Warehouse",
              onClick: () => openModal()
            }
          }}
        />
      </Card>

      <DialogForm open={isModalOpen} onClose={closeModal} title={editingWarehouse ? t('warehouses.editWarehouse') : t('warehouses.addNewWarehouse')}
        actions={
          <FormActions>
            <Button variant="secondary" onClick={closeModal}>{t('warehouses.cancel')}</Button>
            <Button onClick={handleSubmit} disabled={loading.warehouses}>
              {loading.warehouses ? <Spinner size="sm"/> : (editingWarehouse ? t('warehouses.saveChanges') : t('warehouses.addWarehouse'))}
            </Button>
          </FormActions>
        }
      >
        <FormSection>
          <FormField label={t('warehouses.warehouseName')}>
            <Input 
              name="name" 
              value={formData.name || ''} 
              onChange={handleInputChange} 
              required 
            />
          </FormField>
        </FormSection>
      </DialogForm>
    </div>
  );
};
const WarehousesPage: React.FC = () => (
  <div className="space-y-6">
    <WarehousesPageContent />
  </div>
);

export default WarehousesPage;
