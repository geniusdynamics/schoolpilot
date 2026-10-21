// ABOUTME: Customer invoices page: creates, edits and deletes customer invoices and their line items through useFinance()
// ABOUTME: Customers and revenue accounts are linked by string id; names are resolved at read time
// GAP(P1-E03): the registry models no external customer or customer invoice; the canonical invoice is a learner invoice.

import React, { useState, useMemo } from 'react';

import Card from '@/components/ui/Card';
import { DataGrid, DataGridColumn } from '@/components/ui/data';
import Button from '@/components/ui/Button';
import DialogForm from "@/components/ui/forms/DialogForm";
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Textarea from '@/components/ui/Textarea'; // Assuming Textarea exists
import { PlusIcon, EditIcon, DeleteIcon, ReceiptRefundIcon, ListBulletIcon } from '@/components/ui/icons';
import { useFinance } from '@/modules/finance/hooks/useFinance';
import { AccountType, CustomerInvoiceStatus } from '@/core/types';
import type { CustomerInvoice, CustomerInvoiceItem, Customer } from '@/modules/finance/data/types';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/hooks/useToast';
import { formatDate } from '@/utils/format';

// Record ids are strings (UUIDs) at runtime, so the forms keep customer and revenue account ids as option values.
type CustomerInvoiceFormData = Omit<Partial<CustomerInvoice>, 'id' | 'created_at' | 'updated_at' | 'items' | 'customer_name' | 'status' | 'customer_id'> & {
  customer_id: string;
  status: CustomerInvoiceStatus;
};
type CustomerInvoiceItemFormData = Omit<Partial<CustomerInvoiceItem>, 'id' | 'invoice_id' | 'revenue_account_name' | 'revenue_account_id'> & {
  revenue_account_id: string;
};

// The finance types still declare numeric ids; the data layer stores whatever string id the option carries.
type CustomerInvoiceInput = Parameters<ReturnType<typeof useFinance>['addCustomerInvoice']>[0];
type CustomerInvoicePatch = Parameters<ReturnType<typeof useFinance>['updateCustomerInvoice']>[1];

export const CustomerInvoicesPageContent: React.FC = () => {
  const { 
    customerInvoices, 
    customers,
    chartOfAccounts,
    addCustomerInvoice,
    updateCustomerInvoice,
    deleteCustomerInvoice
  } = useFinance();
  
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  
  const [editingInvoice, setEditingInvoice] = useState<CustomerInvoice | null>(null);
  const [currentInvoiceForItems, setCurrentInvoiceForItems] = useState<CustomerInvoice | null>(null);
  const [editingInvoiceItem, setEditingInvoiceItem] = useState<CustomerInvoiceItem | null>(null);
  
  const initialInvoiceFormData: CustomerInvoiceFormData = { 
    customer_id: '',
    invoice_number: '',
    issue_date: new Date().toISOString().split('T')[0], 
    due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Default 30 days due
    status: CustomerInvoiceStatus.DUE,
  };
  const [invoiceFormData, setInvoiceFormData] = useState<CustomerInvoiceFormData>(initialInvoiceFormData);

  const initialItemFormData: CustomerInvoiceItemFormData = { description: '', amount: 0, revenue_account_id: '' };
  const [itemFormData, setItemFormData] = useState<CustomerInvoiceItemFormData>(initialItemFormData);

  const revenueAccounts = useMemo(() => (chartOfAccounts || []).filter(coa => coa.type === AccountType.REVENUE && coa.is_active), [chartOfAccounts]);

  const invoiceRows = useMemo(() => (customerInvoices || []).map(invoice => ({
    ...invoice,
    customer_name: ((customers || []) as Customer[]).find(customer => String(customer.id) === String(invoice.customer_id))?.name ?? invoice.customer_name ?? null,
  })), [customerInvoices, customers]);

  // Invoice Modal
  const openInvoiceModal = (invoice?: CustomerInvoice) => {
    setEditingInvoice(invoice || null);
    setInvoiceFormData(invoice ? 
      { 
        customer_id: invoice.customer_id == null ? '' : String(invoice.customer_id),
        invoice_number: invoice.invoice_number, 
        issue_date: invoice.issue_date, 
        due_date: invoice.due_date, 
        status: invoice.status || CustomerInvoiceStatus.DUE,
      } : 
      initialInvoiceFormData
    );
    setIsInvoiceModalOpen(true);
  };
  const closeInvoiceModal = () => {
    setIsInvoiceModalOpen(false);
    setEditingInvoice(null);
    setInvoiceFormData(initialInvoiceFormData);
  };

  // Item Modal
  const openItemModal = (invoice: CustomerInvoice, item?: CustomerInvoiceItem) => {
    setCurrentInvoiceForItems(invoice);
    setEditingInvoiceItem(item || null);
    setItemFormData(item ? 
      { description: item.description, amount: item.amount, revenue_account_id: item.revenue_account_id == null ? '' : String(item.revenue_account_id) } :
      initialItemFormData
    );
    setIsItemModalOpen(true);
  };
  const closeItemModal = () => {
    setIsItemModalOpen(false);
    setEditingInvoiceItem(null);
    setItemFormData(initialItemFormData);
  };

  const handleInvoiceInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setInvoiceFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleItemInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    // Only the amount is numeric; the revenue account id stays a string.
    setItemFormData(prev => ({ ...prev, [name]: name === 'amount' ? parseFloat(value) : value }));
  };
  
  const handleInvoiceSubmit = async () => {
    if (!invoiceFormData.customer_id || !invoiceFormData.invoice_number || !invoiceFormData.issue_date) {
      toast.showWarning("Customer, Invoice Number, and Issue Date are required.");
      return;
    }
    const payloadBase = {
      customer_id: invoiceFormData.customer_id,
      invoice_number: invoiceFormData.invoice_number!,
      issue_date: invoiceFormData.issue_date!,
      due_date: invoiceFormData.due_date || undefined,
      status: invoiceFormData.status!,
    };

    if (editingInvoice) {
      await updateCustomerInvoice(String(editingInvoice.id), payloadBase as unknown as CustomerInvoicePatch);
    } else {
      // New invoices start with no items
      await addCustomerInvoice({ ...payloadBase, items: [], total_amount: 0 } as unknown as CustomerInvoiceInput);
    }
    closeInvoiceModal();
  };

  const toast = useToast();
  const handleItemSubmit = async () => {
    if (!currentInvoiceForItems || !itemFormData.description || itemFormData.amount == null || itemFormData.amount <= 0 || !itemFormData.revenue_account_id) {
      toast.showWarning("Description, valid Amount, and Revenue Account are required for an item.");
      return;
    }
    
    let updatedItems: CustomerInvoiceItem[];
    const revenueAccountId = itemFormData.revenue_account_id;
    const revenueAccountName = revenueAccounts.find(ra => String(ra.id) === revenueAccountId)?.name ?? null;

    if (editingInvoiceItem) {
      updatedItems = (currentInvoiceForItems.items || []).map(i =>
        i.id === editingInvoiceItem.id ?
        {
            ...editingInvoiceItem,
            description: itemFormData.description!,
            amount: Number(itemFormData.amount),
            revenue_account_id: revenueAccountId,
            revenue_account_name: revenueAccountName,
        } as unknown as CustomerInvoiceItem : i
      );
    } else {
      // Items are stored on the invoice document, so a new item only needs a local id.
      const newItem = {
        id: `${currentInvoiceForItems.id}-item-${Date.now()}`,
        invoice_id: currentInvoiceForItems.id,
        description: itemFormData.description,
        amount: Number(itemFormData.amount),
        revenue_account_id: revenueAccountId,
        revenue_account_name: revenueAccountName,
      } as unknown as CustomerInvoiceItem;
      updatedItems = [...(currentInvoiceForItems.items || []), newItem];
    }

    const total_amount = updatedItems.reduce((sum, item) => sum + (item.amount || 0), 0);
    const updatedInvoice = { ...currentInvoiceForItems, items: updatedItems, total_amount };

    await updateCustomerInvoice(String(currentInvoiceForItems.id), { items: updatedItems, total_amount });

    setCurrentInvoiceForItems(updatedInvoice); 
    
    setEditingInvoiceItem(null); 
    setItemFormData(initialItemFormData); 
  };
  
  const confirm = useConfirm();
  const handleDeleteInvoice = async (id: string) => {
    if ((await confirm({ variant: 'danger', message: 'Are you sure you want to delete this customer invoice? All its items will also be deleted.' }))) {
      await deleteCustomerInvoice(id);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
      if (!currentInvoiceForItems) return;
      if ((await confirm({ variant: 'danger', message: 'Are you sure you want to delete this invoice item?' }))) {
          const updatedItems = (currentInvoiceForItems.items || []).filter(i => i.id !== itemId);
          const total_amount = updatedItems.reduce((sum, item) => sum + (item.amount || 0), 0);
          const updatedInvoice = { ...currentInvoiceForItems, items: updatedItems, total_amount };
          await updateCustomerInvoice(String(currentInvoiceForItems.id), { items: updatedItems, total_amount });
          setCurrentInvoiceForItems(updatedInvoice); 
      }
  };

  const invoiceColumns: DataGridColumn<CustomerInvoice>[] = [
    {
      key: 'invoice_number',
      header: 'Invoice #',
      sortable: true,
      filterable: true,
      width: 140,
      sticky: 'left',
      render: (value) => (
        <span className="font-mono font-medium text-surface-foreground">
          {value}
        </span>
      )
    },
    {
      key: 'customer_name',
      header: 'Customer',
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
      key: 'issue_date',
      header: 'Issue Date',
      sortable: true,
      width: 120,
      render: (value) => (
        <span className="text-sm text-surface-muted-fg">
          {formatDate(value)}
        </span>
      )
    },
    {
      key: 'due_date',
      header: 'Due Date',
      sortable: true,
      width: 120,
      render: (value) => (
        <span className="text-sm text-surface-muted-fg">
          {value ? formatDate(value) : '-'}
        </span>
      )
    },
    {
      key: 'total_amount',
      header: 'Total (KES)',
      sortable: true,
      width: 120,
      render: (value) => (
        <span className="font-medium text-green-600">
          {value?.toFixed(2) || '0.00'}
        </span>
      )
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      filterable: true,
      width: 100,
      render: (value) => (
        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
          value === CustomerInvoiceStatus.PAID ? 'bg-green-100 text-green-800' :
          value === CustomerInvoiceStatus.DUE ? 'bg-yellow-100 text-yellow-800' :
          value === CustomerInvoiceStatus.VOIDED ? 'bg-red-100 text-red-800' :
          'bg-surface-accent text-surface-foreground'
        }`}>
          {value}
        </span>
      )
    },
    {
      key: 'actions',
      header: 'Actions',
      width: 220,
      render: (_, row) => (
        <div className="flex space-x-1">
          <Button 
            size="sm" 
            variant="ghost" 
            onClick={() => openInvoiceModal(row)} 
            leftIcon={<EditIcon className="w-4 h-4" />}
          >
            Edit
          </Button>
          <Button 
            size="sm" 
            variant="secondary" 
            onClick={() => openItemModal(row)} 
            leftIcon={<ListBulletIcon className="w-4 h-4" />}
          >
            Items
          </Button>
          <Button 
            size="sm" 
            variant="danger" 
            onClick={() => handleDeleteInvoice(row.id)} 
            leftIcon={<DeleteIcon className="w-4 h-4" />}
          >
            Delete
          </Button>
        </div>
      )
    }
  ];

  const itemColumns: DataGridColumn<CustomerInvoiceItem>[] = [
    {
      key: 'description',
      header: 'Description',
      sortable: true,
      filterable: true,
      width: 300,
      render: (value) => (
        <span className="text-sm text-surface-foreground">
          {value}
        </span>
      )
    },
    {
      key: 'amount',
      header: 'Amount (KES)',
      sortable: true,
      width: 120,
      render: (value) => (
        <span className="font-medium text-green-600">
          {value?.toFixed(2) || '0.00'}
        </span>
      )
    },
    {
      key: 'revenue_account_name',
      header: 'Revenue Account',
      sortable: true,
      filterable: true,
      width: 200,
      render: (value) => (
        <span className="text-sm text-surface-muted-fg">
          {value}
        </span>
      )
    },
    {
      key: 'actions',
      header: 'Actions',
      width: 140,
      render: (_, row) => (
        <div className="flex space-x-1">
          <Button 
            size="sm" 
            variant="ghost" 
            onClick={() => openItemModal(currentInvoiceForItems!, row)} 
            leftIcon={<EditIcon className="w-4 h-4" />}
          >
            Edit
          </Button>
          <Button 
            size="sm" 
            variant="danger" 
            onClick={() => handleDeleteItem(row.id)} 
            leftIcon={<DeleteIcon className="w-4 h-4" />}
          >
            Del
          </Button>
        </div>
      )
    }
  ];
  
  return (
    <div className="space-y-6">
      <Card title="Customer Invoices Management" actions={
        <Button onClick={() => openInvoiceModal()} leftIcon={<PlusIcon className="w-5 h-5" />}>
          New Customer Invoice
        </Button>
      }>
        <p className="text-sm text-surface-muted-fg mb-4">
          Manage invoices for services provided to external customers.
        </p>
        <DataGrid 
          columns={invoiceColumns} 
          data={invoiceRows}
          sortable
          filterable
          emptyState={{
            icon: <ReceiptRefundIcon className="w-12 h-12 text-surface-muted-fg" />,
            title: "No Customer Invoices Found",
            description: "Get started by creating your first customer invoice for external services.",
            action: (
              <Button 
                onClick={() => openInvoiceModal()} 
                leftIcon={<PlusIcon className="w-5 h-5" />}
              >
                New Customer Invoice
              </Button>
            )
          }}
        />
      </Card>

      <DialogForm isOpen={isInvoiceModalOpen} onClose={closeInvoiceModal} title={editingInvoice ? 'Edit Customer Invoice' : 'Add New Customer Invoice'} size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={closeInvoiceModal}>Cancel</Button>
            <Button onClick={handleInvoiceSubmit}>
              {editingInvoice ? 'Save Changes' : 'Add Invoice'}
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select name="customer_id" label="Customer" value={invoiceFormData.customer_id} onChange={handleInvoiceInputChange} required>
                <option value="">Select Customer</option>
                {((customers || []) as Customer[]).map((customer) => (<option key={customer.id} value={customer.id}>{customer.name}</option>))}
            </Select>
            <Input name="invoice_number" label="Invoice Number" value={invoiceFormData.invoice_number || ''} onChange={handleInvoiceInputChange} required />
            <Input name="issue_date" label="Issue Date" type="date" value={invoiceFormData.issue_date || ''} onChange={handleInvoiceInputChange} required />
            <Input name="due_date" label="Due Date" type="date" value={invoiceFormData.due_date || ''} onChange={handleInvoiceInputChange} />
            <Select name="status" label="Status" value={invoiceFormData.status} onChange={handleInvoiceInputChange} required>
                {Object.values(CustomerInvoiceStatus).map(s => <option key={s} value={s}>{s}</option>)}
            </Select>
        </div>
      </DialogForm>

      <DialogForm 
        isOpen={isItemModalOpen} 
        onClose={closeItemModal} 
        title={`Manage Items for Invoice: ${currentInvoiceForItems?.invoice_number || ''}`} 
        size="xl"
        footer={<Button variant="secondary" onClick={closeItemModal}>Done</Button>}
      >
        {currentInvoiceForItems && (
          <div className="space-y-4">
            <Card title="Add/Edit Invoice Item">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Textarea name="description" label="Description" value={itemFormData.description || ''} onChange={handleItemInputChange} required rows={2} containerClassName="md:col-span-3"/>
                <Input name="amount" label="Amount (KES)" type="number" step="0.01" value={itemFormData.amount ?? ''} onChange={handleItemInputChange} required />
                <Select name="revenue_account_id" label="Revenue GL Account" value={itemFormData.revenue_account_id} onChange={handleItemInputChange} required className="md:col-span-2">
                    <option value="">Select Revenue Account</option>
                    {(revenueAccounts || []).map(coa => <option key={coa.id} value={coa.id}>{coa.account_code} - {coa.name}</option>)}
                </Select>
              </div>
              <div className="text-right mt-4">
                <Button onClick={handleItemSubmit} size="sm">
                  {editingInvoiceItem ? 'Update Item' : 'Add Item'}
                </Button>
              </div>
            </Card>
            
            <h4 className="text-md font-semibold text-surface-foreground mt-6">Items in this Invoice</h4>
            <DataGrid 
              columns={itemColumns} 
              data={currentInvoiceForItems.items || []} 
              sortable
              filterable
              emptyState={{
                icon: <ListBulletIcon className="w-8 h-8 text-surface-muted-fg" />,
                title: "No Items Added",
                description: "No items have been added to this invoice yet. Add items using the form above.",
                action: null
              }}
            />
          </div>
        )}
      </DialogForm>
    </div>
  );
};
const CustomerInvoicesPage: React.FC = () => (
  <div className="space-y-6">
    <CustomerInvoicesPageContent />
  </div>
);

export default CustomerInvoicesPage;
