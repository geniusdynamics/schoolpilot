// ABOUTME: General Receipts page - records miscellaneous payments (donations, hire, sales) with revenue-coded items.
// ABOUTME: The learner and staff payers are canonical and chosen through EntityPicker; the receipt itself
// ABOUTME: stays on the general_payments collection because the registry models no general receipt
// ABOUTME: (GAP(P1-E03): general_payment, customer and partner are not canonical entities).

import React, { useState, useMemo } from 'react';

import Card from '@/components/ui/Card';
import { DataGrid, DataGridColumn } from '@/components/ui/data';
import Button from '@/components/ui/Button';
import { EntityPicker } from '@/components/ui/EntityPicker';
import DialogForm from "@/components/ui/forms/DialogForm";
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Textarea from '@/components/ui/Textarea';
import { Alert } from '@/components/ui/Alert';
import { PlusIcon, EditIcon, DeleteIcon, ReceiptRefundIcon } from '@/components/ui/icons';
import { useFinance } from '@/modules/finance/hooks/useFinance';
import { AccountType, GeneralPayerType } from '@/core/types';
import type { GeneralPayment } from '@/core/types';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/hooks/useToast';
import { useTranslation } from 'react-i18next';
import { databaseService } from '@/services/database/databaseService';
import { formatDate } from '@/utils/format';
import { asId } from '@/domain/ids';
import { useCanonicalFinance } from '../data/canonicalFinance';
import { CanonicalRepositoryProvider } from '../data/canonicalRepository';

interface NamedOption { id: string | number; name?: string }

interface ReceiptItemForm {
  id?: string;
  description: string;
  amount?: number;
  revenue_account_id: string;
}

interface ReceiptFormData {
  payer_type: GeneralPayerType;
  payer_id: string;
  payer_name_external: string;
  payment_date: string;
  payment_method: string;
  reference_no: string;
  notes: string;
  items: ReceiptItemForm[];
}

/** A receipt as shown in the grid; ids are strings and the payer name is resolved at read time. */
type ReceiptRow = GeneralPayment & { payer_name_resolved: string | null };

const errorMessage = (error: unknown): string => (error instanceof Error ? error.message : String(error));
const idOf = (value: unknown): string => (value == null ? '' : String(value));

export const GeneralReceiptsPageContent: React.FC = () => {
  const { t } = useTranslation('finance');
  const {
    generalPayments,
    customers,
    chartOfAccounts,
    addGeneralPayment,
    updateGeneralPayment,
    deleteGeneralPayment
  } = useFinance();
  const finance = useCanonicalFinance();
  const { showSuccess, showError } = useToast();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<ReceiptRow | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const blankItem = (): ReceiptItemForm => ({ description: '', amount: 0, revenue_account_id: '' });
  const initialFormData: ReceiptFormData = {
    payer_type: GeneralPayerType.OTHER,
    payer_id: '',
    payer_name_external: '',
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: 'Cash',
    reference_no: '',
    notes: '',
    items: [blankItem()],
  };
  const [formData, setFormData] = useState<ReceiptFormData>(initialFormData);

  const revenueAccounts = useMemo(() => chartOfAccounts.filter(coa => coa.type === AccountType.REVENUE && coa.is_active), [chartOfAccounts]);

  const payersByType = useMemo<Record<GeneralPayerType, { id: string; name: string; label: string }[]>>(() => ({
    [GeneralPayerType.STUDENT]: finance.lookups.learner.options.map((learner) => ({
      id: learner.id,
      name: finance.lookups.learner.label(asId<'learner'>(learner.id), ''),
      label: finance.lookups.learner.label(asId<'learner'>(learner.id), ''),
    })),
    [GeneralPayerType.STAFF]: finance.lookups.staff.options.map((member) => ({
      id: member.id,
      name: finance.lookups.staff.label(asId<'staff'>(member.id), ''),
      label: finance.lookups.staff.label(asId<'staff'>(member.id), ''),
    })),
    [GeneralPayerType.CUSTOMER]: (customers as NamedOption[]).map(c => ({ id: idOf(c.id), name: c.name ?? '', label: c.name ?? '' })),
    [GeneralPayerType.PARTNER]: [],
    [GeneralPayerType.OTHER]: [],
  }), [finance.lookups.learner, finance.lookups.staff, customers]);
  const payerList = payersByType[formData.payer_type] ?? [];

  const rows = useMemo<ReceiptRow[]>(() => generalPayments.map(payment => {
    const payer = (payersByType[payment.payer_type] ?? []).find(p => p.id === idOf(payment.payer_id));
    const items = payment.items ?? [];
    return {
      ...payment,
      id: idOf(payment.id),
      total_amount_paid: Number(payment.total_amount_paid ?? items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0)),
      payer_name_resolved: payment.payer_type === GeneralPayerType.OTHER
        ? payment.payer_name_external ?? null
        : payer?.name ?? payment.payer_name_resolved ?? null,
    };
  }), [generalPayments, payersByType]);

  const totalAmount = useMemo(() => formData.items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0), [formData.items]);

  const openModal = (payment?: ReceiptRow) => {
    setEditingPayment(payment || null);
    setFormError(null);
    if (payment) {
      const items = payment.items?.length ? payment.items.map(item => ({
        id: idOf(item.id),
        description: item.description,
        amount: item.amount,
        revenue_account_id: idOf(item.revenue_account_id),
      })) : [blankItem()];
      setFormData({
        payer_type: payment.payer_type,
        payer_id: idOf(payment.payer_id),
        payer_name_external: payment.payer_name_external ?? '',
        payment_date: (payment.payment_date ?? '').split('T')[0],
        payment_method: payment.payment_method ?? 'Cash',
        reference_no: payment.reference_no ?? '',
        notes: payment.notes ?? '',
        items,
      });
    } else {
      setFormData(initialFormData);
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingPayment(null);
    setFormError(null);
    setFormData(initialFormData);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormError(null);
    setFormData(prev => {
      const next = { ...prev, [name]: value };
      if (name === 'payer_type') {
        next.payer_id = '';
        next.payer_name_external = '';
      }
      return next;
    });
  };

  const handleItemChange = (index: number, field: keyof ReceiptItemForm, value: string) => {
    setFormError(null);
    setFormData(prev => {
      const items = [...prev.items];
      items[index] = { ...items[index], [field]: field === 'amount' ? (value === '' ? undefined : parseFloat(value)) : value };
      return { ...prev, items };
    });
  };

  const addItem = () => setFormData(prev => ({ ...prev, items: [...prev.items, blankItem()] }));
  const removeItem = (index: number) => setFormData(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }));

  const validate = (): string | null => {
    if (formData.items.some(item => !item.description.trim() || !(Number(item.amount) > 0) || !item.revenue_account_id)) {
      return t('generalReceipts.itemsRequired', 'Each item must have a description, valid amount, and revenue account.');
    }
    if (formData.payer_type === GeneralPayerType.OTHER && !formData.payer_name_external.trim()) {
      return t('generalReceipts.payerNameRequired', "Payer name is required for 'Other' payer type.");
    }
    if (formData.payer_type !== GeneralPayerType.OTHER && !formData.payer_id) {
      return t('generalReceipts.payerRequired', 'Please select a payer.');
    }
    return null;
  };

  const handleSubmit = async () => {
    if (saving) return;
    const problem = validate();
    if (problem) {
      setFormError(problem);
      return;
    }

    // New receipts get their id up front so each item can carry general_payment_id.
    const paymentId = editingPayment?.id ?? databaseService.generateId();
    const isOther = formData.payer_type === GeneralPayerType.OTHER;
    const payload = {
      payer_type: formData.payer_type,
      payer_id: isOther ? null : formData.payer_id,
      payer_name_external: isOther ? formData.payer_name_external.trim() : null,
      payment_date: formData.payment_date,
      payment_method: formData.payment_method,
      reference_no: formData.reference_no || null,
      notes: formData.notes || null,
      total_amount_paid: totalAmount,
      items: formData.items.map(item => {
        const account = chartOfAccounts.find(coa => idOf(coa.id) === item.revenue_account_id);
        return {
          id: item.id || databaseService.generateId(),
          general_payment_id: paymentId,
          description: item.description.trim(),
          amount: Number(item.amount),
          revenue_account_id: item.revenue_account_id,
          revenue_account_name: account?.name ?? null,
        };
      }),
    };

    setSaving(true);
    try {
      if (editingPayment) {
        await updateGeneralPayment(paymentId, payload);
      } else {
        await addGeneralPayment({ ...payload, id: paymentId });
      }
      showSuccess(t('generalReceipts.saved', 'Receipt saved.'));
      closeModal();
    } catch (error) {
      setFormError(`${t('generalReceipts.saveFailed', 'Failed to save receipt:')} ${errorMessage(error)}`);
    } finally {
      setSaving(false);
    }
  };

  const confirm = useConfirm();
  const handleDelete = async (id: string) => {
    if (!(await confirm({ variant: 'danger', message: "Are you sure you want to delete this receipt?" }))) return;
    try {
      await deleteGeneralPayment(id);
      showSuccess(t('generalReceipts.deleted', 'Receipt deleted.'));
    } catch (error) {
      showError(`${t('generalReceipts.deleteFailed', 'Failed to delete receipt:')} ${errorMessage(error)}`);
    }
  };

  const columns: DataGridColumn<ReceiptRow>[] = [
    {
      key: 'id',
      header: 'Receipt ID',
      sortable: true,
      filterable: true,
      width: 120,
      render: (value) => <span className="font-mono text-sm">{value}</span>
    },
    {
      key: 'payer_name_resolved',
      header: 'Payer Name',
      sortable: true,
      filterable: true,
      width: 200,
      render: (value) => <span className="font-medium">{value}</span>
    },
    {
      key: 'payer_type',
      header: 'Payer Type',
      sortable: true,
      filterable: true,
      width: 120,
      render: (value) => <span className="px-2 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-800">{value}</span>
    },
    {
      key: 'payment_date',
      header: 'Payment Date',
      sortable: true,
      filterable: true,
      width: 120,
      render: (_value, row) => <span className="text-purple-600">{formatDate(row.payment_date)}</span>
    },
    {
      key: 'total_amount_paid',
      header: 'Total Amount (KES)',
      sortable: true,
      filterable: true,
      width: 150,
      render: (_value, row) => <span className="font-mono text-green-600">{row.total_amount_paid.toFixed(2)}</span>
    },
    {
      key: 'payment_method',
      header: 'Method',
      sortable: true,
      filterable: true,
      width: 120,
      render: (value) => <span className="text-orange-600">{value}</span>
    },
    {
      key: 'actions',
      header: 'Actions',
      sortable: false,
      filterable: false,
      width: 180,
      sticky: 'right',
      render: (_value, row) => (
        <div className="space-x-1">
          <Button size="sm" variant="ghost" onClick={() => openModal(row)} leftIcon={<EditIcon className="w-4 h-4" />}>View/Edit</Button>
          <Button size="sm" variant="danger" onClick={() => handleDelete(row.id)} leftIcon={<DeleteIcon className="w-4 h-4" />}>Delete</Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <Card title="General Receipts" actions={
        <Button onClick={() => openModal()} leftIcon={<PlusIcon className="w-5 h-5" />}>
          Record Receipt
        </Button>
      }>
        <p className="text-sm text-surface-muted-fg mb-4">
          Record miscellaneous payments received by the school.
        </p>
        <DataGrid
          columns={columns}
          data={rows}
          sortable
          filterable
          emptyState={{
            icon: <ReceiptRefundIcon className="w-12 h-12 text-surface-muted-fg" />,
            title: "No general receipts found",
            description: "Start recording miscellaneous payments received by the school from various sources like donations, facility rentals, or other services.",
          }}
        />
      </Card>

      <DialogForm isOpen={isModalOpen} onClose={closeModal} title={editingPayment ? 'Edit General Receipt' : 'Record New General Receipt'} size="xl"
        footer={
          <>
            <Button variant="secondary" onClick={closeModal}>Cancel</Button>
            <Button onClick={handleSubmit} loading={saving}>
              {editingPayment ? 'Save Changes' : 'Record Receipt'}
            </Button>
          </>
        }
      >
        {formError && <Alert variant="destructive" className="mb-4">{formError}</Alert>}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3">
            <Select name="payer_type" label="Payer Type" value={formData.payer_type} onChange={handleInputChange} required>
                {Object.values(GeneralPayerType).map(type => (<option key={type} value={type}>{type}</option>))}
            </Select>

            {formData.payer_type === GeneralPayerType.OTHER ? (
                <Input name="payer_name_external" label="Payer Name (External)" value={formData.payer_name_external} onChange={handleInputChange} required />
            ) : formData.payer_type === GeneralPayerType.STUDENT ? (
                <EntityPicker
                    value={formData.payer_id ? asId<'learner'>(formData.payer_id) : null}
                    onChange={(id) => {
                        setFormError(null);
                        setFormData(prev => ({ ...prev, payer_id: id ?? '' }));
                    }}
                    lookup={finance.lookups.learner}
                    label="Select Payer"
                    placeholder="Select learner"
                    data-testid="general-receipt-learner-picker"
                />
            ) : formData.payer_type === GeneralPayerType.STAFF ? (
                <EntityPicker
                    value={formData.payer_id ? asId<'staff'>(formData.payer_id) : null}
                    onChange={(id) => {
                        setFormError(null);
                        setFormData(prev => ({ ...prev, payer_id: id ?? '' }));
                    }}
                    lookup={finance.lookups.staff}
                    label="Select Payer"
                    placeholder="Select staff member"
                    data-testid="general-receipt-staff-picker"
                />
            ) : (
                <Select name="payer_id" label="Select Payer" value={formData.payer_id} onChange={handleInputChange} required>
                    <option value="">-- Select Payer --</option>
                    {payerList.map(p => (<option key={p.id} value={p.id}>{p.label}</option>))}
                </Select>
            )}

            <Input name="payment_date" label="Payment Date" type="date" value={formData.payment_date} onChange={handleInputChange} required />
            <Select name="payment_method" label="Payment Method" value={formData.payment_method} onChange={handleInputChange}>
                <option value="Cash">Cash</option>
                <option value="M-Pesa">M-Pesa</option>
                <option value="Cheque">Cheque</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Card">Card</option>
                <option value="Other">Other</option>
            </Select>
            <Input name="reference_no" label="Reference No. (Optional)" value={formData.reference_no} onChange={handleInputChange} containerClassName="md:col-span-2"/>
            <Textarea name="notes" label="Notes (Optional)" value={formData.notes} onChange={handleInputChange} rows={2} containerClassName="md:col-span-2"/>
        </div>

        <div className="mt-6">
            <h4 className="text-md font-semibold text-surface-foreground mb-2">Receipt Items</h4>
            {formData.items.map((item, index) => (
                <div key={index} className="grid grid-cols-12 gap-x-3 gap-y-2 mb-3 p-3 border rounded-md items-end">
                    <Input
                        name={`item_description_${index}`}
                        label={`Item ${index + 1} Description`}
                        value={item.description}
                        onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                        required
                        containerClassName="col-span-12 md:col-span-5 mb-0"
                    />
                    <Input
                        name={`item_amount_${index}`}
                        label="Amount (KES)"
                        type="number"
                        step="0.01"
                        value={item.amount ?? ''}
                        onChange={(e) => handleItemChange(index, 'amount', e.target.value)}
                        required
                        containerClassName="col-span-6 md:col-span-3 mb-0"
                    />
                    <Select
                        name={`item_revenue_account_id_${index}`}
                        label="Revenue Account"
                        value={item.revenue_account_id}
                        onChange={(e) => handleItemChange(index, 'revenue_account_id', e.target.value)}
                        required
                        containerClassName="col-span-10 md:col-span-3 mb-0"
                    >
                        <option value="">Select Account</option>
                        {revenueAccounts.map(acc => <option key={acc.id} value={idOf(acc.id)}>{acc.name} ({acc.account_code})</option>)}
                    </Select>
                    <div className="col-span-2 md:col-span-1 flex items-end justify-end pb-1">
                        {formData.items.length > 1 && (
                            <Button type="button" variant="danger" size="sm" onClick={() => removeItem(index)} className="p-1.5" aria-label={`Remove item ${index + 1}`}>
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
  <CanonicalRepositoryProvider>
    <div className="space-y-6">
      <GeneralReceiptsPageContent />
    </div>
  </CanonicalRepositoryProvider>
);

export default GeneralReceiptsPage;
