// ABOUTME: Suppliers page: lists, creates, edits and deletes suppliers through useFinance()
// ABOUTME: Edits call updateSupplier(id, patch) with the supplier's string id

import React, { useState } from 'react';
import { Supplier } from '@/types';
import Card from '@/components/ui/Card';
import { DataGrid, DataGridColumn } from '@/components/ui/data';
import Button from '@/components/ui/Button';
import DialogForm from "@/components/ui/forms/DialogForm";
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import { PlusIcon, EditIcon, DeleteIcon, BuildingStorefrontIcon } from '@/components/ui/icons';
import { useFinance } from '@/modules/finance/hooks/useFinance';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/hooks/useToast';
import { formatDate } from '@/utils/format';

type SupplierFormData = Omit<Partial<Supplier>, 'id' | 'created_at' | 'updated_at'>;
type SupplierInput = Parameters<ReturnType<typeof useFinance>['addSupplier']>[0];

export const SuppliersPageContent: React.FC = () => {
  const { 
    suppliers,
    addSupplier, 
    updateSupplier, 
    deleteSupplier 
  } = useFinance();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const initialFormData: SupplierFormData = { name: '', phone: '', email: '', address: '', contract_expiry_date: undefined };
  const [formData, setFormData] = useState<SupplierFormData>(initialFormData);

  const openModal = (supplier?: Supplier) => {
    setEditingSupplier(supplier || null);
    setFormData(supplier ? 
      { 
        name: supplier.name, 
        phone: supplier.phone, 
        email: supplier.email, 
        address: supplier.address,
        contract_expiry_date: supplier.contract_expiry_date ? new Date(supplier.contract_expiry_date).toISOString().split('T')[0] : undefined,
      } : 
      initialFormData
    );
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingSupplier(null);
    setFormData(initialFormData);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const toast = useToast();
  const handleSubmit = async () => {
    if (!formData.name) {
      toast.showWarning("Supplier name is required.");
      return;
    }
    const payload = {
      name: formData.name!,
      phone: formData.phone || undefined,
      email: formData.email || undefined,
      address: formData.address || undefined,
      contract_expiry_date: formData.contract_expiry_date || undefined,
    } as SupplierInput;

    if (editingSupplier) {
      await updateSupplier(String(editingSupplier.id), payload);
    } else {
      await addSupplier(payload);
    }
    closeModal();
  };

  const confirm = useConfirm();
  const handleDelete = async (id: Supplier['id']) => {
    if ((await confirm({ variant: 'danger', message: 'Are you sure you want to delete this supplier? This may affect related purchase orders or supplier invoices.' }))) {
      await deleteSupplier(String(id));
    }
  };

  const columns: DataGridColumn<Supplier>[] = [
    { 
      key: 'id', 
      header: 'ID', 
      sortable: true, 
      filterable: true, 
      width: 80,
      render: (value) => <span className="font-mono text-sm">{value}</span>
    },
    { 
      key: 'name', 
      header: 'Supplier Name', 
      sortable: true, 
      filterable: true, 
      width: 200,
      render: (value) => <span className="font-medium">{value}</span>
    },
    { 
      key: 'phone', 
      header: 'Phone', 
      sortable: true, 
      filterable: true, 
      width: 130,
      render: (_value, row) => <span className="text-primary-600">{row.phone || '-'}</span>
    },
    { 
      key: 'email', 
      header: 'Email', 
      sortable: true, 
      filterable: true, 
      width: 180,
      render: (_value, row) => <span className="text-purple-600">{row.email || '-'}</span>
    },
    { 
      key: 'address', 
      header: 'Address', 
      sortable: true, 
      filterable: true, 
      width: 200,
      render: (_value, row) => <span className="text-surface-foreground">{row.address || '-'}</span>
    },
    { 
      key: 'contract_expiry_date', 
      header: 'Contract Expiry', 
      sortable: true, 
      filterable: true, 
      width: 130,
      render: (_value, row) => <span className="text-orange-600">{row.contract_expiry_date ? formatDate(row.contract_expiry_date) : '-'}</span>
    },
    {
      key: 'id',
      header: 'Actions',
      sortable: false,
      filterable: false,
      width: 150,
      sticky: 'right',
      render: (_value, row) => (
        <div className="space-x-2">
          <Button size="sm" variant="ghost" onClick={() => openModal(row)} leftIcon={<EditIcon className="w-4 h-4" />}>Edit</Button>
          <Button size="sm" variant="danger" onClick={() => handleDelete(row.id)} leftIcon={<DeleteIcon className="w-4 h-4" />}>Delete</Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <Card title="Supplier Management" actions={
        <Button onClick={() => openModal()} leftIcon={<PlusIcon className="w-5 h-5" />}>
          Add Supplier
        </Button>
      }>
        <p className="text-sm text-surface-muted-fg mb-4">
          Maintain a database of school suppliers for inventory, services, and other procurement needs.
        </p>
        <DataGrid 
            columns={columns} 
            data={suppliers || []}
            sortable
            filterable
            emptyState={{
              icon: <BuildingStorefrontIcon className="w-12 h-12 text-surface-muted-fg" />,
              title: "No suppliers found",
              description: "Start building your supplier database by adding your first supplier. Track contact information, contracts, and manage procurement relationships.",
              action: {
                label: "Add Supplier",
                onClick: () => openModal()
              }
            }}
        />
      </Card>

      <DialogForm 
        isOpen={isModalOpen} 
        onClose={closeModal} 
        title={editingSupplier ? 'Edit Supplier' : 'Add New Supplier'} 
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={closeModal}>Cancel</Button>
            <Button onClick={handleSubmit}>
              {editingSupplier ? 'Save Changes' : 'Add Supplier'}
            </Button>
          </>
        }
      >
        <Input 
          name="name" 
          label="Supplier Name" 
          value={formData.name || ''} 
          onChange={handleInputChange} 
          required 
        />
        <Input 
          name="phone" 
          label="Phone Number" 
          value={formData.phone || ''} 
          onChange={handleInputChange} 
        />
        <Input 
          name="email" 
          label="Email Address" 
          type="email"
          value={formData.email || ''} 
          onChange={handleInputChange} 
        />
        <Textarea
            name="address"
            label="Address"
            value={formData.address || ''}
            onChange={handleInputChange}
            rows={3}
        />
        <Input
          name="contract_expiry_date"
          label="Contract Expiry Date (Optional)"
          type="date"
          value={formData.contract_expiry_date || ''}
          onChange={handleInputChange}
        />
      </DialogForm>
    </div>
  );
};
const SuppliersPage: React.FC = () => (
  <div className="space-y-6">
    <SuppliersPageContent />
  </div>
);

export default SuppliersPage;
