import React, { useState, useMemo } from 'react';
import { FinCustomerInvoiceType as CustomerInvoice, FinCustomerInvoiceItemType as CustomerInvoiceItem, Customer, FinChartOfAccountType as ChartOfAccount, FinAccountTypeEnum, FinCustomerInvoiceStatusEnum } from '@/types';
import Card from '@/components/ui/Card';
import { DataGrid, DataGridColumn } from '@/components/ui/data';
import Button from '@/components/ui/Button';
import DialogForm from "../../../components/ui/forms/DialogForm";
import FormSection from "../../../components/ui/forms/FormSection";
import FormField from "../../../components/ui/forms/FormField";
import FormActions from "../../../components/ui/forms/FormActions";
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Textarea from '@/components/ui/Textarea'; // Assuming Textarea exists
import { PlusIcon, EditIcon, DeleteIcon, ReceiptRefundIcon, ListBulletIcon } from '@/components/ui/icons';
import { useAppData } from '@/hooks/useAppData';
import Spinner from '@/components/ui/Spinner';
import { useTranslation } from 'react-i18next';

type CustomerInvoiceFormData = Omit<Partial<CustomerInvoice>, 'id' | 'created_at' | 'updated_at' | 'items' | 'customer_name' | 'status'> & {
    status: FinCustomerInvoiceStatusEnum;
};
type CustomerInvoiceItemFormData = Omit<Partial<CustomerInvoiceItem>, 'id' | 'invoice_id' | 'revenue_account_name'>;

const CustomerInvoicesPage: React.FC = () => {
  const { 
    customerInvoices, 
    customers, // from adm.customers
    chartOfAccounts,
    loading, 
    addCustomerInvoice, 
    updateCustomerInvoice, 
    deleteCustomerInvoice 
  } = useAppData();
  
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  
  const [editingInvoice, setEditingInvoice] = useState<CustomerInvoice | null>(null);
  const [currentInvoiceForItems, setCurrentInvoiceForItems] = useState<CustomerInvoice | null>(null);
  const [editingInvoiceItem, setEditingInvoiceItem] = useState<CustomerInvoiceItem | null>(null);
  
  const initialInvoiceFormData: CustomerInvoiceFormData = { 
    customer_id: undefined, 
    invoice_number: '', 
    issue_date: new Date().toISOString().split('T')[0], 
    due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Default 30 days due
    status: FinCustomerInvoiceStatusEnum.DUE,
  };
  const [invoiceFormData, setInvoiceFormData] = useState<CustomerInvoiceFormData>(initialInvoiceFormData);

  const initialItemFormData: CustomerInvoiceItemFormData = { description: '', amount: 0, revenue_account_id: undefined };
  const [itemFormData, setItemFormData] = useState<CustomerInvoiceItemFormData>(initialItemFormData);

  const revenueAccounts = useMemo(() => (chartOfAccounts || []).filter(coa => coa.type === FinAccountTypeEnum.REVENUE && coa.is_active), [chartOfAccounts]);

  // Invoice Modal
  const openInvoiceModal = (invoice?: CustomerInvoice) => {
    setEditingInvoice(invoice || null);
    setInvoiceFormData(invoice ? 
      { 
        customer_id: invoice.customer_id, 
        invoice_number: invoice.invoice_number, 
        issue_date: invoice.issue_date, 
        due_date: invoice.due_date, 
        status: invoice.status || FinCustomerInvoiceStatusEnum.DUE,
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
      { description: item.description, amount: item.amount, revenue_account_id: item.revenue_account_id } : 
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
    setInvoiceFormData(prev => ({ ...prev, [name]: name === 'customer_id' ? (value ? parseInt(value) : undefined) : value }));
  };

  const handleItemInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setItemFormData(prev => ({ ...prev, [name]: name === 'revenue_account_id' ? (value ? parseInt(value) : undefined) : (name === 'amount' ? parseFloat(value) : value) }));
  };
  
  const handleInvoiceSubmit = async () => {
    if (!invoiceFormData.customer_id || !invoiceFormData.invoice_number || !invoiceFormData.issue_date) {
      alert("Customer, Invoice Number, and Issue Date are required.");
      return;
    }
    const payloadBase = {
      customer_id: Number(invoiceFormData.customer_id!),
      invoice_number: invoiceFormData.invoice_number!,
      issue_date: invoiceFormData.issue_date!,
      due_date: invoiceFormData.due_date || undefined,
      status: invoiceFormData.status!,
    };

    if (editingInvoice) {
      await updateCustomerInvoice({ ...editingInvoice, ...payloadBase, items: editingInvoice.items || [] });
    } else {
      await addCustomerInvoice({ ...payloadBase, items: [] }); // New invoices start with no items
    }
    closeInvoiceModal();
  };

  const handleItemSubmit = async () => {
    if (!currentInvoiceForItems || !itemFormData.description || itemFormData.amount === undefined || itemFormData.amount <= 0 || !itemFormData.revenue_account_id) {
      alert("Description, valid Amount, and Revenue Account are required for an item.");
      return;
    }
    
    let updatedItems: CustomerInvoiceItem[];
    const now = new Date().toISOString(); 

    if (editingInvoiceItem) {
      updatedItems = (currentInvoiceForItems.items || []).map(i =>
        i.id === editingInvoiceItem.id ?
        {
            ...editingInvoiceItem,
            description: itemFormData.description!,
            amount: Number(itemFormData.amount!),
            revenue_account_id: Number(itemFormData.revenue_account_id!),
            revenue_account_name: (revenueAccounts || []).find(ra => ra.id === Number(itemFormData.revenue_account_id!))?.name,
        } : i
      );
    } else {
      const newItemData: Omit<CustomerInvoiceItem, 'id'|'invoice_id'|'revenue_account_name'> = {
        description: itemFormData.description!,
        amount: Number(itemFormData.amount!),
        revenue_account_id: Number(itemFormData.revenue_account_id!),
      };
      // In mock, addCustomerInvoice's second arg expects this shape for new items when called through update.
      // This is a bit of a workaround for mock. A real API might handle nested adds differently.
      // For now, we'll call updateCustomerInvoice which handles item additions/updates.
      const newItemForUpdate = { ...newItemData, id: `tempCIITM-${Date.now()}`, invoice_id: currentInvoiceForItems.id };
      updatedItems = [...(currentInvoiceForItems.items || []), newItemForUpdate as CustomerInvoiceItem];
    }
    
    const updatedInvoice = { ...currentInvoiceForItems, items: updatedItems, updated_at: now };
    updatedInvoice.total_amount = updatedItems.reduce((sum, item) => sum + (item.amount || 0), 0);
    
    await updateCustomerInvoice(updatedInvoice);
    
    setCurrentInvoiceForItems(updatedInvoice); 
    
    setEditingInvoiceItem(null); 
    setItemFormData(initialItemFormData); 
  };
  
  const handleDeleteInvoice = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this customer invoice? All its items will also be deleted.')) {
      await deleteCustomerInvoice(id);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
      if (!currentInvoiceForItems) return;
      if (window.confirm('Are you sure you want to delete this invoice item?')) {
          const updatedItems = (currentInvoiceForItems.items || []).filter(i => i.id !== itemId);
          const updatedInvoice = { ...currentInvoiceForItems, items: updatedItems, updated_at: new Date().toISOString() };
          updatedInvoice.total_amount = updatedItems.reduce((sum, item) => sum + (item.amount || 0), 0);
          await updateCustomerInvoice(updatedInvoice);
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
        <span className="font-mono font-medium text-gray-900">
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
        <span className="font-medium text-gray-900">
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
        <span className="text-sm text-gray-600">
          {new Date(value).toLocaleDateString()}
        </span>
      )
    },
    {
      key: 'due_date',
      header: 'Due Date',
      sortable: true,
      width: 120,
      render: (value) => (
        <span className="text-sm text-gray-600">
          {value ? new Date(value).toLocaleDateString() : '-'}
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
          value === FinCustomerInvoiceStatusEnum.PAID ? 'bg-green-100 text-green-800' :
          value === FinCustomerInvoiceStatusEnum.DUE ? 'bg-yellow-100 text-yellow-800' :
          value === FinCustomerInvoiceStatusEnum.OVERDUE ? 'bg-red-100 text-red-800' :
          'bg-gray-100 text-gray-800'
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
        <span className="text-sm text-gray-900">
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
        <span className="text-sm text-gray-600">
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
  
  const isLoadingData = loading.customerInvoices || loading.customers || loading.chartOfAccounts;

  if (isLoadingData && !isInvoiceModalOpen && !isItemModalOpen) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner size="lg" /> <span className="ml-2">Loading Customer Invoices...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card title="Customer Invoices Management" actions={
        <Button onClick={() => openInvoiceModal()} leftIcon={<PlusIcon className="w-5 h-5" />}>
          New Customer Invoice
        </Button>
      }>
        <p className="text-sm text-gray-600 mb-4">
          Manage invoices for services provided to external customers.
        </p>
        <DataGrid 
          columns={invoiceColumns} 
          data={customerInvoices || []} 
          isLoading={loading.customerInvoices && (isInvoiceModalOpen || isItemModalOpen)}
          sortable
          filterable
          emptyState={{
            icon: <ReceiptRefundIcon className="w-12 h-12 text-gray-400" />,
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
            <Button onClick={handleInvoiceSubmit} disabled={loading.customerInvoices}>
              {loading.customerInvoices ? <Spinner size="sm"/> : (editingInvoice ? 'Save Changes' : 'Add Invoice')}
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select name="customer_id" label="Customer" value={invoiceFormData.customer_id || ''} onChange={handleInvoiceInputChange} required>
                <option value="">Select Customer</option>
                {(customers || []).map((customer: Customer) => (<option key={customer.id} value={customer.id}>{customer.name}</option>))}
            </Select>
            <Input name="invoice_number" label="Invoice Number" value={invoiceFormData.invoice_number || ''} onChange={handleInvoiceInputChange} required />
            <Input name="issue_date" label="Issue Date" type="date" value={invoiceFormData.issue_date || ''} onChange={handleInvoiceInputChange} required />
            <Input name="due_date" label="Due Date" type="date" value={invoiceFormData.due_date || ''} onChange={handleInvoiceInputChange} />
            <Select name="status" label="Status" value={invoiceFormData.status} onChange={handleInvoiceInputChange} required>
                {Object.values(FinCustomerInvoiceStatusEnum).map(s => <option key={s} value={s}>{s}</option>)}
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
                <Select name="revenue_account_id" label="Revenue GL Account" value={itemFormData.revenue_account_id || ''} onChange={handleItemInputChange} required className="md:col-span-2">
                    <option value="">Select Revenue Account</option>
                    {(revenueAccounts || []).map(coa => <option key={coa.id} value={coa.id}>{coa.account_code} - {coa.name}</option>)}
                </Select>
              </div>
              <div className="text-right mt-4">
                <Button onClick={handleItemSubmit} size="sm" disabled={loading.customerInvoices}>
                  {loading.customerInvoices ? <Spinner size="sm"/> : (editingInvoiceItem ? 'Update Item' : 'Add Item')}
                </Button>
              </div>
            </Card>
            
            <h4 className="text-md font-semibold text-gray-700 mt-6">Items in this Invoice</h4>
            <DataGrid 
              columns={itemColumns} 
              data={currentInvoiceForItems.items || []} 
              isLoading={loading.customerInvoices && isItemModalOpen}
              sortable
              filterable
              emptyState={{
                icon: <ListBulletIcon className="w-8 h-8 text-gray-400" />,
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

export default CustomerInvoicesPage;
