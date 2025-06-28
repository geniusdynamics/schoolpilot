
import React, { useState, useMemo } from 'react';
import { CustomerInvoice, CustomerInvoiceItem, Customer, ChartOfAccount, AccountType, CustomerInvoiceStatus } from '../../types';
import Card from '../../components/ui/Card';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Textarea from '../../components/ui/Textarea'; // Assuming Textarea exists
import { PlusIcon, EditIcon, DeleteIcon, ReceiptRefundIcon, ListBulletIcon } from '../../components/ui/icons';
import { useAppData } from '../../contexts/AppDataContext';
import Spinner from '../../components/ui/Spinner';

type CustomerInvoiceFormData = Omit<Partial<CustomerInvoice>, 'id' | 'created_at' | 'updated_at' | 'items' | 'customer_name' | 'status'> & {
    status: CustomerInvoiceStatus;
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
    status: CustomerInvoiceStatus.DUE,
  };
  const [invoiceFormData, setInvoiceFormData] = useState<CustomerInvoiceFormData>(initialInvoiceFormData);

  const initialItemFormData: CustomerInvoiceItemFormData = { description: '', amount: 0, revenue_account_id: undefined };
  const [itemFormData, setItemFormData] = useState<CustomerInvoiceItemFormData>(initialItemFormData);

  const revenueAccounts = useMemo(() => chartOfAccounts.filter(coa => coa.type === AccountType.REVENUE && coa.is_active), [chartOfAccounts]);

  // Invoice Modal
  const openInvoiceModal = (invoice?: CustomerInvoice) => {
    setEditingInvoice(invoice || null);
    setInvoiceFormData(invoice ? 
      { 
        customer_id: invoice.customer_id, 
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
            revenue_account_name: revenueAccounts.find(ra => ra.id === Number(itemFormData.revenue_account_id!))?.name,
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

  const invoiceColumns = [
    { header: 'Invoice #', accessor: 'invoice_number' as keyof CustomerInvoice },
    { header: 'Customer', accessor: 'customer_name' as keyof CustomerInvoice },
    { header: 'Issue Date', accessor: 'issue_date' as keyof CustomerInvoice, render: (item: CustomerInvoice) => new Date(item.issue_date).toLocaleDateString() },
    { header: 'Due Date', accessor: 'due_date' as keyof CustomerInvoice, render: (item: CustomerInvoice) => item.due_date ? new Date(item.due_date).toLocaleDateString() : '-' },
    { header: 'Total (KES)', accessor: 'total_amount' as keyof CustomerInvoice, render: (item: CustomerInvoice) => item.total_amount?.toFixed(2) || '0.00' },
    { header: 'Status', accessor: 'status' as keyof CustomerInvoice },
    {
      header: 'Actions',
      accessor: 'id' as keyof CustomerInvoice,
      render: (item: CustomerInvoice) => (
        <div className="space-x-1">
          <Button size="sm" variant="ghost" onClick={() => openInvoiceModal(item)} leftIcon={<EditIcon className="w-4 h-4" />}>Edit</Button>
          <Button size="sm" variant="secondary" onClick={() => openItemModal(item)} leftIcon={<ListBulletIcon className="w-4 h-4" />}>Items</Button>
          <Button size="sm" variant="danger" onClick={() => handleDeleteInvoice(item.id)} leftIcon={<DeleteIcon className="w-4 h-4" />}>Delete</Button>
        </div>
      ),
    },
  ];

  const itemColumns = [
    { header: 'Description', accessor: 'description' as keyof CustomerInvoiceItem },
    { header: 'Amount (KES)', accessor: 'amount' as keyof CustomerInvoiceItem, render: (item: CustomerInvoiceItem) => item.amount?.toFixed(2) || '0.00' },
    { header: 'Revenue Account', accessor: 'revenue_account_name' as keyof CustomerInvoiceItem },
    {
      header: 'Actions',
      accessor: 'id' as keyof CustomerInvoiceItem,
      render: (item: CustomerInvoiceItem) => (
        <div className="space-x-1">
          <Button size="sm" variant="ghost" onClick={() => openItemModal(currentInvoiceForItems!, item)} leftIcon={<EditIcon className="w-4 h-4" />}>Edit</Button>
          <Button size="sm" variant="danger" onClick={() => handleDeleteItem(item.id)} leftIcon={<DeleteIcon className="w-4 h-4" />}>Del</Button>
        </div>
      ),
    },
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
        <Table columns={invoiceColumns} data={customerInvoices} isLoading={loading.customerInvoices && (isInvoiceModalOpen || isItemModalOpen)} />
      </Card>

      <Modal isOpen={isInvoiceModalOpen} onClose={closeInvoiceModal} title={editingInvoice ? 'Edit Customer Invoice' : 'Add New Customer Invoice'} size="lg"
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
                {customers.map((customer: Customer) => (<option key={customer.id} value={customer.id}>{customer.name}</option>))}
            </Select>
            <Input name="invoice_number" label="Invoice Number" value={invoiceFormData.invoice_number || ''} onChange={handleInvoiceInputChange} required />
            <Input name="issue_date" label="Issue Date" type="date" value={invoiceFormData.issue_date || ''} onChange={handleInvoiceInputChange} required />
            <Input name="due_date" label="Due Date" type="date" value={invoiceFormData.due_date || ''} onChange={handleInvoiceInputChange} />
            <Select name="status" label="Status" value={invoiceFormData.status} onChange={handleInvoiceInputChange} required>
                {Object.values(CustomerInvoiceStatus).map(s => <option key={s} value={s}>{s}</option>)}
            </Select>
        </div>
      </Modal>

      <Modal 
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
                    {revenueAccounts.map(coa => <option key={coa.id} value={coa.id}>{coa.account_code} - {coa.name}</option>)}
                </Select>
              </div>
              <div className="text-right mt-4">
                <Button onClick={handleItemSubmit} size="sm" disabled={loading.customerInvoices}>
                  {loading.customerInvoices ? <Spinner size="sm"/> : (editingInvoiceItem ? 'Update Item' : 'Add Item')}
                </Button>
              </div>
            </Card>
            
            <h4 className="text-md font-semibold text-gray-700 mt-6">Items in this Invoice</h4>
            <Table 
              columns={itemColumns} 
              data={currentInvoiceForItems.items || []} 
              isLoading={loading.customerInvoices && isItemModalOpen}
              emptyStateMessage="No items added to this invoice yet."
            />
          </div>
        )}
      </Modal>
    </div>
  );
};

export default CustomerInvoicesPage;
