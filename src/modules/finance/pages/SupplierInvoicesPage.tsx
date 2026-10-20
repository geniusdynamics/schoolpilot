// ABOUTME: Supplier invoices page: records, edits and deletes supplier invoices through useFinance()
// ABOUTME: Invoices link to suppliers by string id; the supplier name is resolved at read time

import React, { useMemo, useState } from 'react';
import { SupplierInvoice, Supplier, SupplierInvoiceStatus } from '@/modules/finance';
import Card from '@/components/ui/Card';
import { DataGrid, DataGridColumn } from '@/components/ui/data';
import Button from '@/components/ui/Button';
import DialogForm from "@/components/ui/forms/DialogForm";
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { PlusIcon, EditIcon, DeleteIcon, ReceiptRefundIcon } from '@/components/ui/icons';
import { useFinance } from '@/modules/finance/hooks/useFinance';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/hooks/useToast';
import { formatDate } from '@/utils/format';

// Record ids are strings (UUIDs) at runtime, so the form keeps the supplier id as the option value.
type SupplierInvoiceFormData = Omit<Partial<SupplierInvoice>, 'id' | 'created_at' | 'updated_at' | 'supplier_name' | 'status' | 'supplier_id'> & {
  supplier_id: string;
  status: SupplierInvoiceStatus;
};

// The finance types still declare numeric ids; the data layer stores whatever string id the option carries.
type SupplierInvoiceInput = Parameters<ReturnType<typeof useFinance>['addSupplierInvoice']>[0];

export const SupplierInvoicesPageContent: React.FC = () => {
  const { 
    supplierInvoices, 
    suppliers,
    addSupplierInvoice,
    updateSupplierInvoice,
    deleteSupplierInvoice
  } = useFinance();

  const invoiceRows = useMemo(() => (supplierInvoices || []).map(invoice => ({
    ...invoice,
    supplier_name: (suppliers || []).find(supplier => String(supplier.id) === String(invoice.supplier_id))?.name ?? invoice.supplier_name ?? null,
  })), [supplierInvoices, suppliers]);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<SupplierInvoice | null>(null);
  
  const initialFormData: SupplierInvoiceFormData = { 
    supplier_id: '',
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
        supplier_id: invoice.supplier_id == null ? '' : String(invoice.supplier_id),
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
    // Only the money fields are numeric; the supplier id stays a string.
    setFormData(prev => ({ ...prev, [name]: (name === 'total_amount' || name === 'amount_paid') ? (value ? Number(value) : undefined) : value }));
  };
  
  const toast = useToast();
  const handleSubmit = async () => {
    if (!formData.supplier_id || !formData.invoice_number || !formData.invoice_date || formData.total_amount === undefined || formData.total_amount <= 0) {
      toast.showWarning("Supplier, Invoice Number, Invoice Date, and a valid Total Amount are required.");
      return;
    }
    const payload = {
      supplier_id: formData.supplier_id,
      invoice_number: formData.invoice_number!,
      invoice_date: formData.invoice_date!,
      due_date: formData.due_date || undefined,
      total_amount: Number(formData.total_amount),
      amount_paid: formData.amount_paid ? Number(formData.amount_paid) : 0,
      status: formData.status,
    } as unknown as SupplierInvoiceInput;

    if (editingInvoice) {
      await updateSupplierInvoice(String(editingInvoice.id), payload);
    } else {
      await addSupplierInvoice(payload);
    }
    closeModal();
  };

  const confirm = useConfirm();
  const handleDelete = async (id: string) => {
    if ((await confirm({ variant: 'danger', message: 'Are you sure you want to delete this supplier invoice?' }))) {
      await deleteSupplierInvoice(id);
    }
  };

  const columns: DataGridColumn<SupplierInvoice>[] = [
    { 
      key: 'invoice_number', 
      header: 'Invoice #', 
      sortable: true, 
      filterable: true, 
      width: 130,
      render: (value) => <span className="font-mono text-sm">{value}</span>
    },
    { 
      key: 'supplier_name', 
      header: 'Supplier', 
      sortable: true, 
      filterable: true, 
      width: 200,
      render: (value) => <span className="font-medium">{value}</span>
    },
    { 
      key: 'invoice_date', 
      header: 'Invoice Date', 
      sortable: true, 
      filterable: true, 
      width: 120,
      render: (_value, row) => <span className="text-primary-600">{formatDate(row.invoice_date)}</span>
    },
    { 
      key: 'due_date', 
      header: 'Due Date', 
      sortable: true, 
      filterable: true, 
      width: 120,
      render: (_value, row) => <span className="text-orange-600">{row.due_date ? formatDate(row.due_date) : '-'}</span>
    },
    { 
      key: 'total_amount', 
      header: 'Total (KES)', 
      sortable: true, 
      filterable: true, 
      width: 120,
      render: (_value, row) => <span className="font-mono text-purple-600">{row.total_amount.toFixed(2)}</span>
    },
    { 
      key: 'amount_paid', 
      header: 'Paid (KES)', 
      sortable: true, 
      filterable: true, 
      width: 120,
      render: (_value, row) => <span className="font-mono text-green-600">{row.amount_paid?.toFixed(2) || '0.00'}</span>
    },
    { 
      key: 'status', 
      header: 'Status', 
      sortable: true, 
      filterable: true, 
      width: 100,
      render: (value, row) => <span className={`px-2 py-1 rounded-full text-xs font-medium ${
        row.status === SupplierInvoiceStatus.PAID ? 'bg-green-100 text-green-800' :
        row.status === SupplierInvoiceStatus.PARTIALLY_PAID ? 'bg-yellow-100 text-yellow-800' :
        'bg-red-100 text-red-800'
      }`}>{value}</span>
    },
    {
      key: 'id',
      header: 'Actions',
      sortable: false,
      filterable: false,
      width: 150,
      sticky: 'right',
      render: (_value, row) => (
        <div className="space-x-1">
          <Button size="sm" variant="ghost" onClick={() => openModal(row)} leftIcon={<EditIcon className="w-4 h-4" />}>Edit</Button>
          <Button size="sm" variant="danger" onClick={() => handleDelete(row.id)} leftIcon={<DeleteIcon className="w-4 h-4" />}>Delete</Button>
        </div>
      ),
    },
  ];
  
  return (
    <div className="space-y-6">
      <Card title="Supplier Invoices Management" actions={
        <Button onClick={() => openModal()} leftIcon={<PlusIcon className="w-5 h-5" />}>
          Add Supplier Invoice
        </Button>
      }>
        <p className="text-sm text-surface-muted-fg mb-4">
          Record and manage invoices received from suppliers.
        </p>
        <DataGrid 
          columns={columns} 
          data={invoiceRows}
          sortable
          filterable
          emptyState={{
            icon: <ReceiptRefundIcon className="w-12 h-12 text-surface-muted-fg" />,
            title: "No supplier invoices found",
            description: "Start tracking your supplier invoices by recording the first invoice. Manage payments, due dates, and maintain accurate financial records.",
            action: {
              label: "Add Supplier Invoice",
              onClick: () => openModal()
            }
          }}
        />
      </Card>

      <DialogForm isOpen={isModalOpen} onClose={closeModal} title={editingInvoice ? 'Edit Supplier Invoice' : 'Add New Supplier Invoice'} size="xl"
        footer={
          <>
            <Button variant="secondary" onClick={closeModal}>Cancel</Button>
            <Button onClick={handleSubmit}>
              {editingInvoice ? 'Save Changes' : 'Add Invoice'}
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select name="supplier_id" label="Supplier" value={formData.supplier_id} onChange={handleInputChange} required>
                <option value="">Select Supplier</option>
                {(suppliers || []).map((supplier: Supplier) => (<option key={supplier.id} value={supplier.id}>{supplier.name}</option>))}
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
      </DialogForm>
    </div>
  );
};
const SupplierInvoicesPage: React.FC = () => (
  <div className="space-y-6">
    <SupplierInvoicesPageContent />
  </div>
);

export default SupplierInvoicesPage;
