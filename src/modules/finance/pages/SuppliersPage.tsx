import React, { useState, useMemo } from 'react';
import { Supplier } from '@/types';
import Card from '@/components/ui/Card';
import { DataGrid, DataGridColumn } from '@/components/ui';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import { PlusIcon, EditIcon, DeleteIcon, BuildingStorefrontIcon } from '@/components/ui/icons';
import { useAppData } from '@/contexts/AppDataContext';
import Spinner from '@/components/ui/Spinner';

type SupplierFormData = Omit<Partial<Supplier>, 'id' | 'created_at' | 'updated_at'>;

const SuppliersPage: React.FC = () => {
  const { 
    suppliers, 
    loading, 
    addSupplier, 
    updateSupplier, 
    deleteSupplier 
  } = useAppData();
  
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

  const handleSubmit = async () => {
    if (!formData.name) {
      alert("Supplier name is required.");
      return;
    }
    const payload: Omit<Supplier, 'id' | 'created_at' | 'updated_at'> = {
      name: formData.name!,
      phone: formData.phone || undefined,
      email: formData.email || undefined,
      address: formData.address || undefined,
      contract_expiry_date: formData.contract_expiry_date || undefined,
    };

    if (editingSupplier) {
      await updateSupplier({ ...editingSupplier, ...payload });
    } else {
      await addSupplier(payload);
    }
    closeModal();
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this supplier? This may affect related purchase orders or supplier invoices.')) {
      await deleteSupplier(id);
    }
  };

  const columns: DataGridColumn<Supplier>[] = [
    { 
      key: 'id', 
      header: 'ID', 
      sortable: true, 
      filterable: true, 
      width: 80,
      render: (value, row) => <span className="font-mono text-sm">{value}</span>
    },
    { 
      key: 'name', 
      header: 'Supplier Name', 
      sortable: true, 
      filterable: true, 
      width: 200,
      render: (value, row) => <span className="font-medium">{value}</span>
    },
    { 
      key: 'phone', 
      header: 'Phone', 
      sortable: true, 
      filterable: true, 
      width: 130,
      render: (value, row) => <span className="text-blue-600">{row.phone || '-'}</span>
    },
    { 
      key: 'email', 
      header: 'Email', 
      sortable: true, 
      filterable: true, 
      width: 180,
      render: (value, row) => <span className="text-purple-600">{row.email || '-'}</span>
    },
    { 
      key: 'address', 
      header: 'Address', 
      sortable: true, 
      filterable: true, 
      width: 200,
      render: (value, row) => <span className="text-gray-700">{row.address || '-'}</span>
    },
    { 
      key: 'contract_expiry_date', 
      header: 'Contract Expiry', 
      sortable: true, 
      filterable: true, 
      width: 130,
      render: (value, row) => <span className="text-orange-600">{row.contract_expiry_date ? new Date(row.contract_expiry_date).toLocaleDateString() : '-'}</span>
    },
    {
      key: 'id',
      header: 'Actions',
      sortable: false,
      filterable: false,
      width: 150,
      sticky: 'right',
      render: (value, row) => (
        <div className="space-x-2">
          <Button size="sm" variant="ghost" onClick={() => openModal(row)} leftIcon={<EditIcon className="w-4 h-4" />}>Edit</Button>
          <Button size="sm" variant="danger" onClick={() => handleDelete(row.id)} leftIcon={<DeleteIcon className="w-4 h-4" />}>Delete</Button>
        </div>
      ),
    },
  ];

  const pageIsLoading = loading.suppliers || loading.all;

  if (pageIsLoading && !isModalOpen) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner size="lg" /> <span className="ml-2">Loading Suppliers...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card title="Supplier Management" actions={
        <Button onClick={() => openModal()} leftIcon={<PlusIcon className="w-5 h-5" />}>
          Add Supplier
        </Button>
      }>
        <p className="text-sm text-gray-600 mb-4">
          Maintain a database of school suppliers for inventory, services, and other procurement needs.
        </p>
        <DataGrid 
            columns={columns} 
            data={suppliers} 
            isLoading={loading.suppliers && !isModalOpen}
            sortable
            filterable
            emptyState={{
              icon: <BuildingStorefrontIcon className="w-12 h-12 text-gray-400" />,
              title: "No suppliers found",
              description: "Start building your supplier database by adding your first supplier. Track contact information, contracts, and manage procurement relationships.",
              action: {
                label: "Add Supplier",
                onClick: () => openModal()
              }
            }}
        />
      </Card>

      <Modal 
        isOpen={isModalOpen} 
        onClose={closeModal} 
        title={editingSupplier ? 'Edit Supplier' : 'Add New Supplier'} 
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={closeModal}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={loading.suppliers}>
              {loading.suppliers && isModalOpen ? <Spinner size="sm"/> : (editingSupplier ? 'Save Changes' : 'Add Supplier')}
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
      </Modal>
    </div>
  );
};

export default SuppliersPage;