// ABOUTME: Chart of accounts page: lists, creates, edits and deletes GL accounts through useFinance()
// ABOUTME: Expense accounts link to an expense category by its string id; the category name is resolved at read time

import React, { useMemo, useState } from 'react';

import Card from '@/components/ui/Card';
import { DataGrid, DataGridColumn } from '@/components/ui/data';
import Button from '@/components/ui/Button';
import DialogForm from "@/components/ui/forms/DialogForm";
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';

import { useFinance } from '@/modules/finance/hooks/useFinance';
import { AccountTemplateType, AccountType } from '@/core/types';
import type { ChartOfAccount, ExpenseCategory } from '@/core/types';
import { BanknotesIcon, DeleteIcon, EditIcon, PlusIcon } from '@/components/ui/icons';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/hooks/useToast';

// Record ids are strings (UUIDs) at runtime, so the form keeps the expense category id as the option value.
interface ChartOfAccountFormData {
  account_code: string;
  name: string;
  type: AccountType;
  template_type: AccountTemplateType;
  is_active: boolean;
  expense_category_id: string;
}

// The finance types still declare numeric ids; the data layer stores whatever string id the option carries.
type ChartOfAccountInput = Parameters<ReturnType<typeof useFinance>['addChartOfAccount']>[0];

export const ChartOfAccountsContent: React.FC = () => {
  const {
    chartOfAccounts,
    expenseCategories,
    addChartOfAccount,
    updateChartOfAccount,
    deleteChartOfAccount
  } = useFinance();

  const accountRows = useMemo(() => (chartOfAccounts || []).map(account => ({
    ...account,
    expense_category_name: account.expense_category_id == null
      ? account.expense_category_name ?? null
      : (expenseCategories || []).find(cat => String(cat.id) === String(account.expense_category_id))?.name ?? account.expense_category_name ?? null,
  })), [chartOfAccounts, expenseCategories]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<ChartOfAccount | null>(null);
  
  const initialFormData: ChartOfAccountFormData = { 
    account_code: '', 
    name: '', 
    type: AccountType.ASSET, 
    template_type: AccountTemplateType.CUSTOM,
    is_active: true,
    expense_category_id: '',
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
        expense_category_id: account.expense_category_id == null ? '' : String(account.expense_category_id),
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
    const val = type === 'checkbox' && e.target instanceof HTMLInputElement ? e.target.checked : value;
    setFormData(prev => ({ ...prev, [name]: val }));
  };

  const toast = useToast();
  const handleSubmit = async () => {
    if (!formData.account_code || !formData.name || !formData.type || !formData.template_type) {
      toast.showWarning("Account Code, Name, Type, and Template Type are required.");
      return;
    }
    const payload = {
      account_code: formData.account_code,
      name: formData.name,
      type: formData.type,
      template_type: formData.template_type,
      is_active: formData.is_active,
      expense_category_id: formData.type === AccountType.EXPENSE && formData.expense_category_id ? formData.expense_category_id : null,
    } as unknown as ChartOfAccountInput;

    if (editingAccount) {
      await updateChartOfAccount(String(editingAccount.id), payload);
    } else {
      await addChartOfAccount(payload);
    }
    closeModal();
  };

  const confirm = useConfirm();
  const handleDelete = async (id: ChartOfAccount['id']) => {
    if ((await confirm({ variant: 'danger', message: 'Are you sure you want to delete this account? This might affect linked bank accounts or fee templates.' }))) {
      await deleteChartOfAccount(String(id));
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
        <span className="font-mono font-medium text-surface-foreground">
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
        <span className="font-medium text-surface-foreground">
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
          value === AccountType.EQUITY ? 'bg-primary-100 text-primary-800' :
          value === AccountType.REVENUE ? 'bg-purple-100 text-purple-800' :
          value === AccountType.EXPENSE ? 'bg-orange-100 text-orange-800' :
          'bg-surface-accent text-surface-foreground'
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
          'bg-surface-accent text-surface-foreground'
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
        <span className="text-sm text-surface-muted-fg">
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

  return (
    <div className="space-y-6">
      <Card title="Chart of Accounts Management" actions={
        <Button onClick={() => openModal()} leftIcon={<PlusIcon className="w-5 h-5" />}>
          Add Account
        </Button>
      }>
         <p className="text-sm text-surface-muted-fg mb-4">
          Manage the school's chart of accounts. Define accounts for assets, liabilities, equity, revenue, and expenses.
        </p>
        <DataGrid 
          columns={columns} 
          data={accountRows}
          sortable
          filterable
          emptyState={{
            icon: <BanknotesIcon className="w-12 h-12 text-surface-muted-fg" />,
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
            <Button onClick={handleSubmit}>
              {editingAccount ? 'Save Changes' : 'Add Account'}
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
                 <Select name="expense_category_id" label="Expense Category (for Expense Type)" value={formData.expense_category_id} onChange={handleInputChange}>
                    <option value="">Select Expense Category</option>
                    {(expenseCategories || []).map((cat: ExpenseCategory) => (<option key={cat.id} value={cat.id}>{cat.name}</option>))}
                </Select>
            )}
           
            <div className="flex items-center mt-2 md:col-span-2">
                <input id="is_active" name="is_active" type="checkbox" className="h-4 w-4 text-indigo-600 border-surface-border rounded focus:ring-indigo-500" 
                    checked={formData.is_active} onChange={handleInputChange} />
                <label htmlFor="is_active" className="ml-2 block text-sm text-surface-foreground">Is Active Account</label>
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

