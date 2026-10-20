// ABOUTME: Bank accounts page: lists, creates, edits and deletes banks through useFinance()
// ABOUTME: Each bank links to an asset GL account by its string id; the GL name is resolved at read time
// GAP(P1-E03): the registry models no bank or bank account; both land with the P3 ledger.

import React, { useMemo, useState } from 'react';
import { Bank, ChartOfAccount, AccountType } from '@/modules/finance';
import Card from '@/components/ui/Card';
import { DataGrid, DataGridColumn } from '@/components/ui/data';
import Button from '@/components/ui/Button';
import DialogForm from "@/components/ui/forms/DialogForm";
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { PlusIcon, EditIcon, DeleteIcon, BanknotesIcon } from '@/components/ui/icons';
import { useFinance } from '@/modules/finance/hooks/useFinance';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/hooks/useToast';

// Record ids are strings (UUIDs) at runtime, so the form keeps the GL account id as the option value.
interface BankFormData {
  name: string;
  account_no: string;
  gl_account_id: string;
}

// The finance types still declare numeric ids; the data layer stores whatever string id the option carries.
type BankInput = Parameters<ReturnType<typeof useFinance>['addBank']>[0];

export const BanksPageContent: React.FC = () => {
  const { 
    banks, 
    chartOfAccounts,
    addBank, 
    updateBank, 
    deleteBank 
  } = useFinance();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBank, setEditingBank] = useState<Bank | null>(null);
  const initialFormData: BankFormData = { name: '', account_no: '', gl_account_id: '' };
  const [formData, setFormData] = useState<BankFormData>(initialFormData);

  const assetAccounts = (chartOfAccounts || []).filter(coa => coa.type === AccountType.ASSET && coa.is_active);
  const bankRows = useMemo(() => (banks || []).map(bank => ({
    ...bank,
    gl_account_name: (chartOfAccounts || []).find(coa => String(coa.id) === String(bank.gl_account_id))?.name ?? bank.gl_account_name ?? null,
  })), [banks, chartOfAccounts]);

  const openModal = (bank?: Bank) => {
    setEditingBank(bank || null);
    setFormData(bank ? 
      { name: bank.name, account_no: bank.account_no ?? '', gl_account_id: bank.gl_account_id == null ? '' : String(bank.gl_account_id) } :
      initialFormData
    );
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingBank(null);
    setFormData(initialFormData);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const toast = useToast();
  const handleSubmit = async () => {
    if (!formData.name || !formData.gl_account_id) {
      toast.showWarning("Bank name and GL Account are required.");
      return;
    }
    const payload = {
      name: formData.name,
      account_no: formData.account_no || null,
      gl_account_id: formData.gl_account_id,
    } as unknown as BankInput;

    if (editingBank) {
      await updateBank(String(editingBank.id), payload);
    } else {
      await addBank(payload);
    }
    closeModal();
  };

  const confirm = useConfirm();
  const handleDelete = async (id: Bank['id']) => {
    if ((await confirm({ variant: 'danger', message: 'Are you sure you want to delete this bank account?' }))) {
      await deleteBank(String(id));
    }
  };

  const columns: DataGridColumn<Bank>[] = [
    {
      key: 'id',
      header: 'ID',
      sortable: true,
      width: 80,
      sticky: 'left'
    },
    {
      key: 'name',
      header: 'Bank Name',
      sortable: true,
      filterable: true,
      width: 200,
      render: (value) => (
        <span className="font-medium text-surface-foreground">
          {value}
        </span>
      )
    },
    {
      key: 'account_no',
      header: 'Account No.',
      sortable: true,
      filterable: true,
      width: 150,
      render: (value) => (
        <span className="font-mono text-sm">
          {value || 'N/A'}
        </span>
      )
    },
    {
      key: 'gl_account_name',
      header: 'GL Account',
      sortable: true,
      filterable: true,
      width: 250,
      render: (value) => (
        <span className="text-sm text-surface-muted-fg">
          {value || 'Not linked'}
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
      <Card title="Bank Accounts Management" actions={
        <Button onClick={() => openModal()} leftIcon={<PlusIcon className="w-5 h-5" />}>
          Add Bank Account
        </Button>
      }>
         <p className="text-sm text-surface-muted-fg mb-4">
          Manage the school's bank accounts. Each bank account must be linked to an Asset account in the Chart of Accounts.
        </p>
        <DataGrid 
          columns={columns} 
          data={bankRows}
          sortable 
          filterable 
          emptyState={
            <div className="text-center py-12">
              <BanknotesIcon className="mx-auto h-12 w-12 text-surface-muted-fg" />
              <h3 className="mt-2 text-sm font-medium text-surface-foreground">No bank accounts found</h3>
              <p className="mt-1 text-sm text-surface-muted-fg">Get started by adding your first bank account.</p>
              <div className="mt-6">
                <Button onClick={() => openModal()} leftIcon={<PlusIcon className="w-5 h-5" />}>
                  Add Bank Account
                </Button>
              </div>
            </div>
          }
        />
      </Card>

      <DialogForm isOpen={isModalOpen} onClose={closeModal} title={editingBank ? 'Edit Bank Account' : 'Add New Bank Account'} size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={closeModal}>Cancel</Button>
            <Button onClick={handleSubmit}>
              {editingBank ? 'Save Changes' : 'Add Bank'}
            </Button>
          </>
        }
      >
        <Input 
          name="name" 
          label="Bank Name" 
          value={formData.name || ''} 
          onChange={handleInputChange} 
          required 
        />
        <Input 
          name="account_no" 
          label="Account Number" 
          value={formData.account_no || ''} 
          onChange={handleInputChange} 
        />
        <Select 
          name="gl_account_id" 
          label="Link to GL Asset Account" 
          value={formData.gl_account_id}
          onChange={handleInputChange}
          required
        >
          <option value="">Select GL Asset Account</option>
          {(assetAccounts || []).map((coa: ChartOfAccount) => (
            <option key={coa.id} value={coa.id}>
              {coa.account_code} - {coa.name}
            </option>
          ))}
        </Select>
      </DialogForm>
    </div>
  );
};
const BanksPage: React.FC = () => (
  <div className="space-y-6">
    <BanksPageContent />
  </div>
);

export default BanksPage;
