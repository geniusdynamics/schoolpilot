import React, { useState } from 'react';

import Card from '@/components/ui/Card';
import { DataGrid, DataGridColumn } from '@/components/ui/data';
import Button from '@/components/ui/Button';
import DialogForm from "@/components/ui/forms/DialogForm";
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';

import { useFinance } from '@/modules/finance/hooks/useFinance';
import Spinner from '@/components/ui/Spinner';
import { AccountTemplateType, AccountType } from '@/core/types';
import type { ChartOfAccount, ExpenseCategory } from '@/core/types';
import { BanknotesIcon, DeleteIcon, EditIcon, PlusIcon } from '@/components/ui/icons';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/hooks/useToast';

type ChartOfAccountFormData = Omit<Partial<ChartOfAccount>, 'id' | 'created_at' | 'updated_at' | 'expense_category_name' | 'type' | 'template_type'> & {
    type: AccountType; // Make type required for the form
    template_type: AccountTemplateType; // Make template_type required
};

export const ChartOfAccountsContent: React.FC = () => {
  const { 
    chartOfAccounts, 
    loading, 
    addChartOfAccount, 
    updateChartOfAccount, 
    deleteChartOfAccount
  } = useFinance();

  // Get expense categories with fallback to empty array
  const initialMockExpenseCategories = [] as any[];
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<ChartOfAccount | null>(null);
  
  const initialFormData: ChartOfAccountFormData = { 
    account_code: '', 
    name: '', 
    type: AccountType.ASSET, 
    template_type: AccountTemplateType.CUSTOM,
    is_active: true, 
    expense_category_id: undefined 
  };
  const [formData, setFormData] = useState<ChartOfAccountFormData>(initialFormData);

  const openModal = (account?: ChartOfAccount) => {
    setEditingAccount(account || null);
    setFormData(account ? 
      { 
        account_code: account.account_code, 
        name: account.name, 
        type: account.type, 
        template_type: account.template_type, 
        is_active: account.is_active, 
        expense_category_id: account.expense_category_id 
      } : 
      initialFormData
    );
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingAccount(null);
    setFormData(initialFormData);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    // @ts-ignore
    const val = type === 'checkbox' ? e.target.checked : (name === 'expense_category_id' ? (value ? parseInt(value) : undefined) : value);
    setFormData(prev => ({ ...prev, [name]: val }));
  };

  const toast = useToast();
  const handleSubmit = async () => {
    if (!formData.account_code || !formData.name || !formData.type || !formData.template_type) {
      toast.showWarning("Account Code, Name, Type, and Template Type are required.");
      return;
    }
    const payload = { 
        account_code: formData.account_code!, 
        name: formData.name!,
        type: formData.type!,
        template_type: formData.template_type!,
        is_active: formData.is_active || false,
        expense_category_id: formData.expense_category_id || undefined,
    };

    if (editingAccount) {
      await updateChartOfAccount({ ...editingAccount, ...payload });
    } else {
      await addChartOfAccount(payload);
    }
    closeModal();
  };

  const confirm = useConfirm();
  const handleDelete = async (id: number) => {
    if ((await confirm({ variant: 'danger', message: 'Are you sure you want to delete this account? This might affect linked bank accounts or fee templates.' }))) {
      await deleteChartOfAccount(id);
    }
  };

  const columns: DataGridColumn<ChartOfAccount>[] = [
    {
      key: 'account_code',
      header: 'Code',
      sortable: true,
      filterable: true,
      width: 120,
      sticky: 'left',
      render: (value) => (
        <span className="font-mono font-medium text-gray-900">
          {value}
        </span>
      )
    },
    {
      key: 'name',
      header: 'Account Name',
      sortable: true,
      filterable: true,
      width: 250,
      render: (value) => (
        <span className="font-medium text-gray-900">
          {value}
        </span>
      )
    },
    {
      key: 'type',
      header: 'Type',
      sortable: true,
      filterable: true,
      width: 120,
      render: (value) => (
        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
          value === AccountType.ASSET ? 'bg-green-100 text-green-800' :
          value === AccountType.LIABILITY ? 'bg-red-100 text-red-800' :
          value === AccountType.EQUITY ? 'bg-blue-100 text-blue-800' :
          value === AccountType.REVENUE ? 'bg-purple-100 text-purple-800' :
          value === AccountType.EXPENSE ? 'bg-orange-100 text-orange-800' :
          'bg-gray-100 text-gray-800'
        }`}>
          {value}
        </span>
      )
    },
    {
      key: 'template_type',
      header: 'Template',
      sortable: true,
      filterable: true,
      width: 120,
      render: (value) => (
        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
          value === AccountTemplateType.CORE ? 'bg-indigo-100 text-indigo-800' :
          'bg-gray-100 text-gray-800'
        }`}>
          {value}
        </span>
      )
    },
    {
      key: 'expense_category_name',
      header: 'Expense Category',
      sortable: true,
      filterable: true,
      width: 150,
      render: (value) => (
        <span className="text-sm text-gray-600">
          {value || 'N/A'}
        </span>
      )
    },
    {
      key: 'is_active',
      header: 'Active',
      sortable: true,
      width: 80,
      render: (value) => (
        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
          value ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {value ? 'Yes' : 'No'}
        </span>
      )
    },
    {
      key: 'actions',
      header: 'Actions',
      width: 180,
      render: (_, row) => (
        <div className="flex space-x-1">
          <Button 
            size="sm" 
            variant="ghost" 
            onClick={() => openModal(row)} 
            leftIcon={<EditIcon className="w-4 h-4" />}
          >
            Edit
          </Button>
          <Button 
            size="sm" 
            variant="danger" 
            onClick={() => handleDelete(row.id)} 
            leftIcon={<DeleteIcon className="w-4 h-4" />}
          >
            Delete
          </Button>
        </div>
      )
    }
  ];

  if ((loading.chartOfAccounts || loading.expenseCategories) && !isModalOpen) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner size="lg" /> <span className="ml-2">Loading Chart of Accounts...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card title="Chart of Accounts Management" actions={
        <Button onClick={() => openModal()} leftIcon={<PlusIcon className="w-5 h-5" />}>
          Add Account
        </Button>
      }>
         <p className="text-sm text-gray-600 mb-4">
          Manage the school's chart of accounts. Define accounts for assets, liabilities, equity, revenue, and expenses.
        </p>
        <DataGrid 
          columns={columns} 
          data={chartOfAccounts || []} 
          isLoading={loading.chartOfAccounts && isModalOpen}
          sortable
          filterable
          emptyState={{
            icon: <BanknotesIcon className="w-12 h-12 text-gray-400" />,
            title: "No Chart of Accounts Found",
            description: "Get started by adding your first account to the chart of accounts.",
            action: (
              <Button 
                onClick={() => openModal()} 
                leftIcon={<PlusIcon className="w-5 h-5" />}
              >
                Add Account
              </Button>
            )
          }}
        />
      </Card>

      <DialogForm isOpen={isModalOpen} onClose={closeModal} title={editingAccount ? 'Edit Account' : 'Add New Account'} size="xl"
        footer={
          <>
            <Button variant="secondary" onClick={closeModal}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={loading.chartOfAccounts}>
              {loading.chartOfAccounts ? <Spinner size="sm"/> : (editingAccount ? 'Save Changes' : 'Add Account')}
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input name="account_code" label="Account Code" value={formData.account_code || ''} onChange={handleInputChange} required />
            <Input name="name" label="Account Name" value={formData.name || ''} onChange={handleInputChange} required className="md:col-span-2" />
            
            <Select name="type" label="Account Type" value={formData.type || ''} onChange={handleInputChange} required>
                {Object.values(AccountType).map(type => (<option key={type} value={type}>{type}</option>))}
            </Select>
            <Select name="template_type" label="Template Type" value={formData.template_type || ''} onChange={handleInputChange} required>
                {Object.values(AccountTemplateType).map(type => (<option key={type} value={type}>{type}</option>))}
            </Select>

            {formData.type === AccountType.EXPENSE && (
                 <Select name="expense_category_id" label="Expense Category (for Expense Type)" value={formData.expense_category_id || ''} onChange={handleInputChange}>
                    <option value="">Select Expense Category</option>
                    {initialMockExpenseCategories.map((cat: ExpenseCategory) => (<option key={cat.id} value={cat.id}>{cat.name}</option>))}
                </Select>
            )}
           
            <div className="flex items-center mt-2 md:col-span-2">
                <input id="is_active" name="is_active" type="checkbox" className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500" 
                    checked={formData.is_active || false} onChange={handleInputChange} />
                <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900">Is Active Account</label>
            </div>
        </div>
      </DialogForm>
    </div>
  );
};

const ChartOfAccountsPage: React.FC = () => (
  <div className="space-y-6">
    <ChartOfAccountsContent />
  </div>
);

export default ChartOfAccountsPage;

