import React, { useState } from 'react';
import { PayrollItemType, PayrollItemCategory, PayrollTaxImplication } from '../../types';
import Card from '../../components/ui/Card';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import { PlusIcon, EditIcon, DeleteIcon, ListBulletIcon } from '../../components/ui/icons';
import { useAppData } from '@/contexts/AppDataContext'; // Updated
import Spinner from '../../components/ui/Spinner';
import { useTranslation } from 'react-i18next';

type PayrollItemTypeFormData = Omit<Partial<PayrollItemType>, 'id' | 'created_at' | 'updated_at' | 'category' | 'tax_implication'> & {
    category: PayrollItemCategory; 
    tax_implication: PayrollTaxImplication;
};

const PayrollItemTypesPage: React.FC = () => {
  const { 
    payrollItemTypes, 
    loading, 
    addPayrollItemType, 
    updatePayrollItemType, 
    deletePayrollItemType 
  } = useAppData(); // Updated
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItemType, setEditingItemType] = useState<PayrollItemType | null>(null);
  const initialFormData: PayrollItemTypeFormData = { 
    name: '', 
    category: PayrollItemCategory.EARNING, 
    tax_implication: PayrollTaxImplication.TAXABLE 
  };
  const [formData, setFormData] = useState<PayrollItemTypeFormData>(initialFormData);

  const openModal = (itemType?: PayrollItemType) => {
    setEditingItemType(itemType || null);
    setFormData(itemType ? 
      { 
        name: itemType.name, 
        category: itemType.category, 
        tax_implication: itemType.tax_implication 
      } : 
      initialFormData
    );
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingItemType(null);
    setFormData(initialFormData);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.category || !formData.tax_implication) {
      alert("Name, Category, and Tax Implication are required.");
      return;
    }
    const payload: Omit<PayrollItemType, 'id' | 'created_at' | 'updated_at'> = {
      name: formData.name!,
      category: formData.category,
      tax_implication: formData.tax_implication,
    };

    if (editingItemType) {
      await updatePayrollItemType({ ...editingItemType, ...payload });
    } else {
      await addPayrollItemType(payload);
    }
    closeModal();
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this payroll item type? This might affect staff salary settings and payslips.')) {
      await deletePayrollItemType(id);
    }
  };

  const columns = [
    { header: 'ID', accessor: 'id' as keyof PayrollItemType },
    { header: 'Item Name', accessor: 'name' as keyof PayrollItemType },
    { header: 'Category', accessor: 'category' as keyof PayrollItemType },
    { header: 'Tax Implication', accessor: 'tax_implication' as keyof PayrollItemType },
    {
      header: 'Actions',
      accessor: 'id' as keyof PayrollItemType,
      render: (item: PayrollItemType) => (
        <div className="space-x-2">
          <Button size="sm" variant="ghost" onClick={() => openModal(item)} leftIcon={<EditIcon className="w-4 h-4" />}>Edit</Button>
          <Button size="sm" variant="danger" onClick={() => handleDelete(item.id)} leftIcon={<DeleteIcon className="w-4 h-4" />}>Delete</Button>
        </div>
      ),
    },
  ];

  if (loading.payrollItemTypes && !isModalOpen) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner size="lg" /> <span className="ml-2">Loading Payroll Item Types...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card title="Payroll Item Types Management" actions={
        <Button onClick={() => openModal()} leftIcon={<PlusIcon className="w-5 h-5" />}>
          Add Item Type
        </Button>
      }>
        <React.Fragment>
          <p className="text-sm text-gray-600 mb-4">
            Define various types of payroll items such as earnings, deductions, and contributions.
          </p>
          <Table columns={columns} data={payrollItemTypes} isLoading={loading.payrollItemTypes && isModalOpen} />
        </React.Fragment>
      </Card>

      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingItemType ? 'Edit Payroll Item Type' : 'Add New Payroll Item Type'} size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={closeModal}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={loading.payrollItemTypes}>
              {loading.payrollItemTypes ? <Spinner size="sm"/> : (editingItemType ? 'Save Changes' : 'Add Item Type')}
            </Button>
          </>
        }
      >
        <Input 
          name="name" 
          label="Item Name" 
          value={formData.name || ''} 
          onChange={handleInputChange} 
          required 
        />
        <Select 
          name="category" 
          label="Category" 
          value={formData.category} 
          onChange={handleInputChange}
          required
        >
          {Object.values(PayrollItemCategory).map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </Select>
        <Select 
          name="tax_implication" 
          label="Tax Implication" 
          value={formData.tax_implication} 
          onChange={handleInputChange}
          required
        >
          {Object.values(PayrollTaxImplication).map((taxImp) => (
            <option key={taxImp} value={taxImp}>{taxImp}</option>
          ))}
        </Select>
      </Modal>
    </div>
  );
};

export default PayrollItemTypesPage;
