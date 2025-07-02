import React, { useState, useMemo } from 'react';
import { FinSupplierInvoiceType as SupplierInvoice, FinSupplierType as Supplier, FinSupplierInvoiceStatusEnum as SupplierInvoiceStatus } from '../../types';
import Card from '../../components/ui/Card';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import { PlusIcon, EditIcon, DeleteIcon, ReceiptRefundIcon } from '../../components/ui/icons';
import { useAppData } from '@/contexts/AppDataContext';
import Spinner from '../../components/ui/Spinner';
import { useTranslation } from 'react-i18next';

type SupplierInvoiceFormData = Omit<Partial<SupplierInvoice>, 'id' | 'created_at' | 'updated_at' | 'supplier_name' | 'status'> & {
    status: SupplierInvoiceStatus; // Ensure this is required
};

const SupplierInvoicesPage: React.FC = () => {
  const { 
    supplierInvoices, 
    suppliers,
    loading, 
    addSupplierInvoice, 
    updateSupplierInvoice, 
    deleteSupplierInvoice 
  } = useAppData();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<SupplierInvoice | null>(null);
  
  const initialFormData: SupplierInvoiceFormData = { 
    supplier_id: undefined, 
    invoice_number: '', 
    invoice_date: new Date().toISOString().split('T')[0], 
    due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    total_amount: 0, 
    amount_paid: 0,
    status: SupplierInvoiceStatus.UNPAID,
  };
  const [formData, setFormData] = useState<SupplierInvoiceFormData>(initialFormData);

  const openModal = (invoice?: SupplierInvoice) => {
    setEditingInvoice(invoice || null);
    setFormData(invoice ? 
      { 
        supplier_id: invoice.supplier_id, 
        invoice_number: invoice.invoice_number, 
        invoice_date: invoice.invoice_date, 
        due_date: invoice.due_date, 
        total_amount: invoice.total_amount,
        amount_paid: invoice.amount_paid,
        status: invoice.status || SupplierInvoiceStatus.UNPAID,
      } : 
      initialFormData
    );
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingInvoice(null);
    setFormData(initialFormData);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: (name === 'supplier_id' || name === 'total_amount' || name === 'amount_paid') ? (value ? Number(value) : undefined) : value }));
  };
  
  const handleSubmit = async () => {
    if (!formData.supplier_id || !formData.invoice_number || !formData.invoice_date || formData.total_amount === undefined || formData.total_amount <= 0) {
      alert("Supplier, Invoice Number, Invoice Date, and a valid Total Amount are required.");
      return;
    }
    const payload: Omit<SupplierInvoice, 'id'|'created_at'|'updated_at'|'supplier_name'> = {
      supplier_id: Number(formData.supplier_id!),
      invoice_number: formData.invoice_number!,
      invoice_date: formData.invoice_date!,
      due_date: formData.due_date || undefined,
      total_amount: Number(formData.total_amount),
      amount_paid: formData.amount_paid ? Number(formData.amount_paid) : 0,
      status: formData.status!,
    };

    if (editingInvoice) {
      await updateSupplierInvoice({ ...editingInvoice, ...payload });
    } else {
      await addSupplierInvoice(payload);
    }
    closeModal();
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this supplier invoice?')) {
      await deleteSupplierInvoice(id);
    }
  };

  const columns = [
    { header: 'Invoice #', accessor: 'invoice_number' as keyof SupplierInvoice },
    { header: 'Supplier', accessor: 'supplier_name' as keyof SupplierInvoice },
    { header: 'Invoice Date', accessor: 'invoice_date' as keyof SupplierInvoice, render: (item: SupplierInvoice) => new Date(item.invoice_date).toLocaleDateString() },
    { header: 'Due Date', accessor: 'due_date' as keyof SupplierInvoice, render: (item: SupplierInvoice) => item.due_date ? new Date(item.due_date).toLocaleDateString() : '-' },
    { header: 'Total (KES)', accessor: 'total_amount' as keyof SupplierInvoice, render: (item: SupplierInvoice) => item.total_amount.toFixed(2) },
    { header: 'Paid (KES)', accessor: 'amount_paid' as keyof SupplierInvoice, render: (item: SupplierInvoice) => item.amount_paid?.toFixed(2) || '0.00' },
    { header: 'Status', accessor: 'status' as keyof SupplierInvoice },
    {
      header: 'Actions',
      accessor: 'id' as keyof SupplierInvoice,
      render: (item: SupplierInvoice) => (
        <div className="space-x-1">
          <Button size="sm" variant="ghost" onClick={() => openModal(item)} leftIcon={<EditIcon className="w-4 h-4" />}>Edit</Button>
          <Button size="sm" variant="danger" onClick={() => handleDelete(item.id)} leftIcon={<DeleteIcon className="w-4 h-4" />}>Delete</Button>
        </div>
      ),
    },
  ];
  
  const isLoadingData = loading.supplierInvoices || loading.suppliers;

  if (isLoadingData && !isModalOpen) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner size="lg" /> <span className="ml-2">Loading Supplier Invoices...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card title="Supplier Invoices Management" actions={
        <Button onClick={() => openModal()} leftIcon={<PlusIcon className="w-5 h-5" />}>
          Add Supplier Invoice
        </Button>
      }>
        <p className="text-sm text-gray-600 mb-4">
          Record and manage invoices received from suppliers.
        </p>
        <Table columns={columns} data={supplierInvoices} isLoading={loading.supplierInvoices && isModalOpen} />
      </Card>

      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingInvoice ? 'Edit Supplier Invoice' : 'Add New Supplier Invoice'} size="xl"
        footer={
          <>
            <Button variant="secondary" onClick={closeModal}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={loading.supplierInvoices}>
              {loading.supplierInvoices ? <Spinner size="sm"/> : (editingInvoice ? 'Save Changes' : 'Add Invoice')}
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select name="supplier_id" label="Supplier" value={formData.supplier_id || ''} onChange={handleInputChange} required>
                <option value="">Select Supplier</option>
                {suppliers.map((supplier: Supplier) => (<option key={supplier.id} value={supplier.id}>{supplier.name}</option>))}
            </Select>
            <Input name="invoice_number" label="Invoice Number" value={formData.invoice_number || ''} onChange={handleInputChange} required />
            <Input name="invoice_date" label="Invoice Date" type="date" value={formData.invoice_date || ''} onChange={handleInputChange} required />
            <Input name="due_date" label="Due Date" type="date" value={formData.due_date || ''} onChange={handleInputChange} />
            <Input name="total_amount" label="Total Amount (KES)" type="number" step="0.01" value={formData.total_amount || ''} onChange={handleInputChange} required />
            <Input name="amount_paid" label="Amount Paid (KES)" type="number" step="0.01" value={formData.amount_paid || ''} onChange={handleInputChange} />
            <Select name="status" label="Status" value={formData.status || ''} onChange={handleInputChange} required className="md:col-span-2">
                {Object.values(SupplierInvoiceStatus).map(s => <option key={s} value={s}>{s}</option>)}
            </Select>
        </div>
      </Modal>
    </div>
  );
};

export default SupplierInvoicesPage;
