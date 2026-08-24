import React, { useState, useMemo } from 'react';

import Card from '@/components/ui/Card';
import { DataGrid, DataGridColumn } from '@/components/ui/data';
import Button from '@/components/ui/Button';
import DialogForm from "@/components/ui/forms/DialogForm";
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Textarea from '@/components/ui/Textarea';
import { PlusIcon, EditIcon, DeleteIcon, ReceiptRefundIcon } from '@/components/ui/icons';
import { useAppData } from '@/hooks/useAppData';
import Spinner from '@/components/ui/Spinner';
import { AccountType, GeneralPayerType } from '@/core/types';
import type { GeneralPayment } from '@/core/types';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/hooks/useToast';

type GeneralPaymentItemFormData = Omit<GeneralPaymentItem, 'id' | 'general_payment_id' | 'revenue_account_name'>;
type GeneralPaymentFormData = Omit<GeneralPayment, 'id' | 'created_at' | 'updated_at' | 'items' | 'total_amount_paid' | 'payer_name_resolved'> & {
    items: GeneralPaymentItemFormData[];
};

export const GeneralReceiptsPageContent: React.FC = () => {
  const { 
    generalPayments, 
    students, 
    staff, 
    customers, 
    partners, 
    chartOfAccounts,
    loading, 
    addGeneralPayment, 
    updateGeneralPayment,
    deleteGeneralPayment 
  } = useAppData();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<GeneralPayment | null>(null);
  
  const initialItemFormData: GeneralPaymentItemFormData = { description: '', amount: 0, revenue_account_id: 0 }; // Ensure revenue_account_id has a default
  const initialFormData: GeneralPaymentFormData = { 
    payer_type: GeneralPayerType.OTHER, 
    payment_date: new Date().toISOString().split('T')[0], 
    items: [initialItemFormData],
    payment_method: 'Cash',
  };
  const [formData, setFormData] = useState<GeneralPaymentFormData>(initialFormData);

  const revenueAccounts = useMemo(() => chartOfAccounts.filter(coa => coa.type === AccountType.REVENUE && coa.is_active), [chartOfAccounts]);
  const payerList = useMemo(() => {
    switch(formData.payer_type) {
      case GeneralPayerType.STUDENT: return students.map(s => ({ id: s.id, name: [s.first_name, s.last_name].filter(Boolean).join(' ') + (s.admission_no ? ` (Adm: ${s.admission_no})` : '') }));
      case GeneralPayerType.STAFF: return staff.map(st => ({ id: st.id, name: [st.first_name, st.last_name].filter(Boolean).join(' ') + (st.staff_no ? ` (Staff No: ${st.staff_no})` : '') }));
      case GeneralPayerType.CUSTOMER: return customers.map(c => ({ id: String(c.id), name: c.name }));
      case GeneralPayerType.PARTNER: return partners.map(p => ({ id: p.id, name: p.name }));
      default: return [];
    }
  }, [formData.payer_type, students, staff, customers, partners]);

  const totalAmount = useMemo(() => {
    return formData.items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  }, [formData.items]);

  const openModal = (payment?: GeneralPayment) => {
    setEditingPayment(payment || null);
    if (payment) {
        const formItems = payment.items?.map(item => ({
            description: item.description,
            amount: item.amount,
            revenue_account_id: item.revenue_account_id,
        })) || [initialItemFormData];

        setFormData({ 
            payer_type: payment.payer_type, 
            payer_id: payment.payer_id,
            payer_name_external: payment.payer_name_external,
            payment_date: payment.payment_date.split('T')[0], 
            payment_method: payment.payment_method,
            reference_no: payment.reference_no,
            notes: payment.notes,
            items: formItems,
        });
    } else {
        setFormData(initialFormData);
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingPayment(null);
    setFormData(initialFormData);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => {
        const newState = { ...prev, [name]: value };
        if (name === 'payer_type') {
            newState.payer_id = undefined; 
            newState.payer_name_external = undefined;
        }
        return newState;
    });
  };

  const handleItemChange = (index: number, field: keyof GeneralPaymentItemFormData, value: string | number) => {
    setFormData(prev => {
      const newItems = [...prev.items];
      const numValue = (typeof value === 'string' && (field === 'amount' || field === 'revenue_account_id')) ? parseFloat(value) : value;
      newItems[index] = { ...newItems[index], [field]: field === 'amount' || field === 'revenue_account_id' ? (Number.isNaN(numValue as number) ? 0 : numValue) : value };
      return { ...prev, items: newItems };
    });
  };

  const addItem = () => {
    setFormData(prev => ({ ...prev, items: [...prev.items, {...initialItemFormData}] }));
  };

  const removeItem = (index: number) => {
    setFormData(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }));
  };

  const toast = useToast();
  const handleSubmit = async () => {
    if (formData.items.some(item => !item.description || item.amount <= 0 || !item.revenue_account_id)) {
      toast.showError("Each item must have a description, valid amount, and revenue account.");
      return;
    }
    if (formData.payer_type === GeneralPayerType.OTHER && !formData.payer_name_external) {
      toast.showWarning("Payer name is required for 'Other' payer type.");
      return;
    }
    if (formData.payer_type !== GeneralPayerType.OTHER && !formData.payer_id) {
      toast.showWarning("Please select a payer.");
      return;
    }

    const paymentDataForPayload = {
      payer_type: formData.payer_type,
      payer_id: formData.payer_type !== GeneralPayerType.OTHER ? formData.payer_id : undefined,
      payer_name_external: formData.payer_type === GeneralPayerType.OTHER ? formData.payer_name_external : undefined,
      payment_date: formData.payment_date,
      payment_method: formData.payment_method,
      reference_no: formData.reference_no,
      notes: formData.notes,
    };

    const itemsPayload: Omit<GeneralPaymentItem, 'id' | 'general_payment_id' | 'revenue_account_name'>[] = formData.items.map(item => ({
        description: item.description,
        amount: Number(item.amount),
        revenue_account_id: Number(item.revenue_account_id),
    }));
    
    const finalPayload = {
        ...paymentDataForPayload,
        items: itemsPayload
    };
    
    if (editingPayment) {
      const updatedDataForMock: GeneralPayment = {
        ...(editingPayment as GeneralPayment), 
        ...paymentDataForPayload,
        items: formData.items.map((item, idx) => ({ 
          ...item,
          id: editingPayment?.items?.[idx]?.id || `temp-item-${Date.now()}-${idx}`, 
          general_payment_id: editingPayment.id,
          revenue_account_name: chartOfAccounts.find(c => c.id === item.revenue_account_id)?.name,
        })),
        total_amount_paid: totalAmount,
        updated_at: new Date().toISOString(),
      };
      await updateGeneralPayment(updatedDataForMock);
    } else {
      await addGeneralPayment(finalPayload as any); 
    }
    closeModal();
  };

  const confirm = useConfirm();
  const handleDelete = async (id: string) => {
    if ((await confirm({ variant: 'danger', message: "Are you sure you want to delete this receipt?" }))) {
        await deleteGeneralPayment(id);
    }
  };

  const columns: DataGridColumn<GeneralPayment>[] = [
    { 
      key: 'id', 
      header: 'Receipt ID', 
      sortable: true, 
      filterable: true, 
      width: 120,
      render: (value, row) => <span className="font-mono text-sm">{value}</span>
    },
    { 
      key: 'payer_name_resolved', 
      header: 'Payer Name', 
      sortable: true, 
      filterable: true, 
      width: 200,
      render: (value, row) => <span className="font-medium">{value}</span>
    },
    { 
      key: 'payer_type', 
      header: 'Payer Type', 
      sortable: true, 
      filterable: true, 
      width: 120,
      render: (value, row) => <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">{value}</span>
    },
    { 
      key: 'payment_date', 
      header: 'Payment Date', 
      sortable: true, 
      filterable: true, 
      width: 120,
      render: (value, row) => <span className="text-purple-600">{new Date(row.payment_date).toLocaleDateString()}</span>
    },
    { 
      key: 'total_amount_paid', 
      header: 'Total Amount (KES)', 
      sortable: true, 
      filterable: true, 
      width: 150,
      render: (value, row) => <span className="font-mono text-green-600">{row.total_amount_paid.toFixed(2)}</span>
    },
    { 
      key: 'payment_method', 
      header: 'Method', 
      sortable: true, 
      filterable: true, 
      width: 120,
      render: (value, row) => <span className="text-orange-600">{value}</span>
    },
    {
      key: 'id',
      header: 'Actions',
      sortable: false,
      filterable: false,
      width: 180,
      sticky: 'right',
      render: (value, row) => (
        <div className="space-x-1">
          <Button size="sm" variant="ghost" onClick={() => openModal(row)} leftIcon={<EditIcon className="w-4 h-4" />}>View/Edit</Button>
          <Button size="sm" variant="danger" onClick={() => handleDelete(row.id)} leftIcon={<DeleteIcon className="w-4 h-4" />}>Delete</Button>
        </div>
      ),
    },
  ];

  const isLoadingPageData = loading.generalPayments || loading.students || loading.staff || loading.customers || loading.partners || loading.chartOfAccounts;

  if (isLoadingPageData && !isModalOpen) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner size="lg" /> <span className="ml-2">Loading General Receipts...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card title="General Receipts" actions={
        <Button onClick={() => openModal()} leftIcon={<PlusIcon className="w-5 h-5" />}>
          Record Receipt
        </Button>
      }>
        <p className="text-sm text-gray-600 mb-4">
          Record miscellaneous payments received by the school.
        </p>
        <DataGrid 
          columns={columns} 
          data={generalPayments} 
          isLoading={loading.generalPayments && isModalOpen}
          sortable
          filterable
          emptyState={{
            icon: <ReceiptRefundIcon className="w-12 h-12 text-gray-400" />,
            title: "No general receipts found",
            description: "Start recording miscellaneous payments received by the school from various sources like donations, facility rentals, or other services.",
            action: {
              label: "Record Receipt",
              onClick: () => openModal()
            }
          }}
        />
      </Card>

      <DialogForm isOpen={isModalOpen} onClose={closeModal} title={editingPayment ? 'Edit General Receipt' : 'Record New General Receipt'} size="2xl"
        footer={
          <>
            <Button variant="secondary" onClick={closeModal}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={loading.generalPayments}>
              {loading.generalPayments ? <Spinner size="sm"/> : (editingPayment ? 'Save Changes' : 'Record Receipt')}
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3">
            <Select name="payer_type" label="Payer Type" value={formData.payer_type} onChange={handleInputChange} required>
                {Object.values(GeneralPayerType).map(type => (<option key={type} value={type}>{type}</option>))}
            </Select>
            
            {formData.payer_type === GeneralPayerType.OTHER ? (
                <Input name="payer_name_external" label="Payer Name (External)" value={formData.payer_name_external || ''} onChange={handleInputChange} required />
            ) : (
                <Select name="payer_id" label="Select Payer" value={formData.payer_id || ''} onChange={handleInputChange} required>
                    <option value="">-- Select Payer --</option>
                    {payerList.map(p => (<option key={p.id} value={p.id}>{p.name}</option>))}
                </Select>
            )}

            <Input name="payment_date" label="Payment Date" type="date" value={formData.payment_date} onChange={handleInputChange} required />
            <Select name="payment_method" label="Payment Method" value={formData.payment_method || ''} onChange={handleInputChange}>
                <option value="Cash">Cash</option>
                <option value="M-Pesa">M-Pesa</option>
                <option value="Cheque">Cheque</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Card">Card</option>
                <option value="Other">Other</option>
            </Select>
            <Input name="reference_no" label="Reference No. (Optional)" value={formData.reference_no || ''} onChange={handleInputChange} containerClassName="md:col-span-2"/>
            <Textarea name="notes" label="Notes (Optional)" value={formData.notes || ''} onChange={handleInputChange} rows={2} containerClassName="md:col-span-2"/>
        </div>

        <div className="mt-6">
            <h4 className="text-md font-semibold text-gray-700 mb-2">Receipt Items</h4>
            {formData.items.map((item, index) => (
                <div key={index} className="grid grid-cols-12 gap-x-3 gap-y-2 mb-3 p-3 border rounded-md items-end">
                    <Input 
                        label={`Item ${index + 1} Description`} 
                        value={item.description} 
                        onChange={(e) => handleItemChange(index, 'description', e.target.value)} 
                        required 
                        containerClassName="col-span-12 md:col-span-5 mb-0"
                    />
                    <Input 
                        label="Amount (KES)" 
                        type="number" 
                        step="0.01" 
                        value={item.amount || ''} 
                        onChange={(e) => handleItemChange(index, 'amount', e.target.value)} 
                        required 
                        containerClassName="col-span-6 md:col-span-3 mb-0"
                    />
                    <Select 
                        label="Revenue Account" 
                        value={item.revenue_account_id || ''} 
                        onChange={(e) => handleItemChange(index, 'revenue_account_id', e.target.value)} 
                        required
                        containerClassName="col-span-10 md:col-span-3 mb-0"
                    >
                        <option value="">Select Account</option>
                        {revenueAccounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name} ({acc.account_code})</option>)}
                    </Select>
                    <div className="col-span-2 md:col-span-1 flex items-end justify-end pb-1">
                        {formData.items.length > 1 && (
                            <Button type="button" variant="danger" size="sm" onClick={() => removeItem(index)} className="p-1.5">
                                <DeleteIcon className="w-4 h-4"/>
                            </Button>
                        )}
                    </div>
                </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={addItem} leftIcon={<PlusIcon className="w-4 h-4"/>}>
                Add Item
            </Button>
        </div>
        <div className="mt-4 text-right">
            <strong className="text-lg">Total Amount: KES {totalAmount.toFixed(2)}</strong>
        </div>
      </DialogForm>
    </div>
  );
};

const GeneralReceiptsPage: React.FC = () => (
  <div className="space-y-6">
    <GeneralReceiptsPageContent />
  </div>
);

export default GeneralReceiptsPage;
