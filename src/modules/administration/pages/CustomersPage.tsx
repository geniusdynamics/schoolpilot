import React, { useState } from 'react';
import { useCustomerData, type CustomerRecord as Customer } from '@/modules/administration/data/useCustomerData';
import Card from '@/components/ui/Card';
import { DataGrid, DataGridColumn } from '@/components/ui/data';
import Button from '@/components/ui/Button';

import Input from '@/components/ui/Input';
import { PlusIcon, EditIcon, DeleteIcon, UsersIcon as CustomersIcon } from '@/components/ui/icons';
import { useTranslation } from 'react-i18next';
import DialogForm from '@/components/ui/forms/DialogForm';
import FormSection from '@/components/ui/forms/FormSection';
import FormField from '@/components/ui/forms/FormField';
import FormActions from '@/components/ui/forms/FormActions';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/hooks/useToast';

type CustomerFormData = Omit<Partial<Customer>, 'id' | 'created_at' | 'updated_at'>;

const CustomersPage: React.FC = () => {
  const { customers, addCustomer, updateCustomer, deleteCustomer } = useCustomerData();
  const { t } = useTranslation('administration');
  
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

  const toast = useToast();
  const handleSubmit = async () => {
    if (!formData.name) {
      toast.showWarning(t('validation.customerNameIsRequired'));
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

  const confirm = useConfirm();
  const handleDelete = async (id: string) => {
    if ((await confirm({ variant: 'danger', message: 'Are you sure you want to delete this customer?' }))) {
      await deleteCustomer(id);
    }
  };

  const columns: DataGridColumn<Customer>[] = [
    { 
      key: 'id', 
      header: 'ID', 
      sortable: true, 
      filterable: true, 
      width: 80,
      render: (value) => value
    },
    { 
      key: 'name', 
      header: 'Customer Name', 
      sortable: true, 
      filterable: true, 
      width: 200,
      render: (value) => value
    },
    { 
      key: 'phone', 
      header: 'Phone', 
      sortable: true, 
      filterable: true, 
      width: 150,
      render: (value) => value || '-'
    },
    { 
      key: 'email', 
      header: 'Email', 
      sortable: true, 
      filterable: true, 
      width: 200,
      render: (value) => value || '-'
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

  return (
    <div className="space-y-6">
      <Card title={t('customers.managementTitle')} actions={
        <Button onClick={() => openModal()} leftIcon={<PlusIcon className="w-5 h-5" />}>
          {t('customers.addCustomer')}
        </Button>
      }>
         <p className="text-sm text-surface-muted-fg mb-4">
          {t('customers.managementDescription')}
        </p>
        <DataGrid 
          columns={columns} 
          data={customers} 
          sortable 
          filterable 
          emptyState={{
            icon: <CustomersIcon className="h-12 w-12 text-surface-muted-fg" />,
            title: 'No customers found',
            description: 'Get started by adding your first customer.',
          }}
        />
      </Card>

      <DialogForm
        isOpen={isModalOpen}
        onClose={closeModal}
        title={t(editingCustomer ? 'customers.editCustomer' : 'customers.addNewCustomer')}
        size="lg"
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
      >
        <FormSection>
          <FormField label={t('customers.customerName')} required>
            <Input
              name="name"
              value={formData.name || ''}
              onChange={handleInputChange}
              required
            />
          </FormField>
          <FormField label={t('customers.phoneNumber')}>
            <Input
              name="phone"
              value={formData.phone || ''}
              onChange={handleInputChange}
            />
          </FormField>
          <FormField label={t('customers.emailAddress')}>
            <Input
              name="email"
              type="email"
              value={formData.email || ''}
              onChange={handleInputChange}
            />
          </FormField>
        </FormSection>
        <FormActions>
          <Button variant="secondary" onClick={closeModal}>{t('customers.cancel')}</Button>
          <Button type="submit">
            {editingCustomer ? t('customers.saveChanges') : t('customers.addCustomer')}
          </Button>
        </FormActions>
      </DialogForm>
    </div>
  );
};

export default CustomersPage;
