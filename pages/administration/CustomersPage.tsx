
import React, { useState } from 'react';
import { Customer } from '../../types';
import Card from '../../components/ui/Card';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import { PlusIcon, EditIcon, DeleteIcon, UsersIcon as CustomersIcon } from '../../components/ui/icons';
import { useAppData } from '../../contexts/AppDataContext'; // Updated
import Spinner from '../../components/ui/Spinner';

type CustomerFormData = Omit<Partial<Customer>, 'id' | 'created_at' | 'updated_at'>;

const CustomersPage: React.FC = () => {
  const { customers, loading, addCustomer, updateCustomer, deleteCustomer } = useAppData(); // Updated
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const initialFormData: CustomerFormData = { name: '', phone: '', email: '' };
  const [formData, setFormData] = useState<CustomerFormData>(initialFormData);

  const openModal = (customer?: Customer) => {
    setEditingCustomer(customer || null);
    setFormData(customer ? { name: customer.name, phone: customer.phone, email: customer.email } : initialFormData);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingCustomer(null);
    setFormData(initialFormData);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    if (!formData.name) {
      alert("Customer name is required.");
      return;
    }
    const payload = {
      name: formData.name!,
      phone: formData.phone || undefined,
      email: formData.email || undefined,
    };

    if (editingCustomer) {
      await updateCustomer({ ...editingCustomer, ...payload });
    } else {
      await addCustomer(payload);
    }
    closeModal();
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this customer?')) {
      await deleteCustomer(id);
    }
  };

  const columns = [
    { header: 'ID', accessor: 'id' as keyof Customer },
    { header: 'Customer Name', accessor: 'name' as keyof Customer },
    { header: 'Phone', accessor: 'phone' as keyof Customer },
    { header: 'Email', accessor: 'email' as keyof Customer },
    {
      header: 'Actions',
      accessor: 'id' as keyof Customer,
      render: (item: Customer) => (
        <div className="space-x-2">
          <Button size="sm" variant="ghost" onClick={() => openModal(item)} leftIcon={<EditIcon className="w-4 h-4" />}>Edit</Button>
          <Button size="sm" variant="danger" onClick={() => handleDelete(item.id)} leftIcon={<DeleteIcon className="w-4 h-4" />}>Delete</Button>
        </div>
      ),
    },
  ];

  if (loading.customers && !isModalOpen) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner size="lg" /> <span className="ml-2">Loading Customers...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card title="External Customers Management" actions={
        <Button onClick={() => openModal()} leftIcon={<PlusIcon className="w-5 h-5" />}>
          Add Customer
        </Button>
      }>
         <p className="text-sm text-gray-600 mb-4">
          Manage non-student/staff customers for services like facility rentals or other sales.
        </p>
        <Table columns={columns} data={customers} isLoading={loading.customers && isModalOpen} />
      </Card>

      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingCustomer ? 'Edit Customer' : 'Add New Customer'} size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={closeModal}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={loading.customers}>
              {loading.customers ? <Spinner size="sm"/> : (editingCustomer ? 'Save Changes' : 'Add Customer')}
            </Button>
          </>
        }
      >
        <Input 
          name="name" 
          label="Customer Name" 
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
      </Modal>
    </div>
  );
};

export default CustomersPage;
