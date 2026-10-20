// ABOUTME: Supplier contracts management page for the inventory module.
// ABOUTME: Provides comprehensive contract management with CRUD operations, search, and filtering.

import React, { useState, useEffect } from 'react';
import { DataGrid, DataGridColumn } from '@/components/ui/data';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Modal from '@/components/ui/Modal';
import Badge from '@/components/ui/Badge';
import { useToast } from '@/hooks/useToast';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { EditIcon, DeleteIcon, PlusIcon, ExclamationTriangleIcon } from '@/components/ui/icons';
import { useSupplierContractData } from '../data/useSupplierContractData';
import { useSupplierData } from '../data/useSupplierData';
import { InvSupplierContractType, InvContractStatusEnum } from '../data/types';
import { useTranslation } from 'react-i18next';
import { format, differenceInDays, parseISO } from 'date-fns';

/** Contract form state; supplier ids are strings (UUIDs) at runtime and are never coerced. */
type ContractFormData = Omit<Partial<InvSupplierContractType>, 'supplier_id'> & { supplier_id?: string | number };

export const SupplierContractsPageContent: React.FC = () => {
  const { t } = useTranslation();
  const toast = useToast();
  const confirm = useConfirm();
  const {
    contracts,
    loading,
    error,
    create,
    update,
    remove
  } = useSupplierContractData();

  const { suppliers } = useSupplierData();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [supplierFilter, setSupplierFilter] = useState<string>('ALL');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingContract, setEditingContract] = useState<InvSupplierContractType | null>(null);
  const [formData, setFormData] = useState<ContractFormData>({
    supplier_id: '',
    contract_number: '',
    title: '',
    description: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    contract_value: 0,
    currency: 'USD',
    status: InvContractStatusEnum.DRAFT,
    terms_and_conditions: '',
    payment_terms: '',
    delivery_terms: ''
  });

  const [filteredContracts, setFilteredContracts] = useState<InvSupplierContractType[]>([]);

  useEffect(() => {
    let filtered = contracts || [];

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(contract =>
        (contract.contract_number?.toLowerCase() ?? '').includes(searchTerm.toLowerCase()) ||
        (contract.title?.toLowerCase() ?? '').includes(searchTerm.toLowerCase()) ||
        contract.supplier_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply status filter
    if (statusFilter !== 'ALL') {
      filtered = filtered.filter(contract => contract.status === statusFilter);
    }

    // Apply supplier filter
    if (supplierFilter !== 'ALL') {
      filtered = filtered.filter(contract => contract.supplier_id?.toString() === supplierFilter);
    }

    setFilteredContracts(filtered);
  }, [contracts, searchTerm, statusFilter, supplierFilter]);

  const handleOpenDialog = (contract?: InvSupplierContractType) => {
    if (contract) {
      setEditingContract(contract);
      setFormData(contract);
    } else {
      setEditingContract(null);
      setFormData({
        supplier_id: '',
        contract_number: '',
        title: '',
        description: '',
        start_date: new Date().toISOString().split('T')[0],
        end_date: '',
        contract_value: 0,
        currency: 'USD',
        status: InvContractStatusEnum.DRAFT,
        terms_and_conditions: '',
        payment_terms: '',
        delivery_terms: ''
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingContract(null);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editingContract) {
        await update(editingContract.id, {
          ...formData,
          updated_at: new Date().toISOString()
        } as InvSupplierContractType);
        toast.showSuccess(t('inventory.contracts.updated'));
      } else {
        const now = new Date().toISOString();
        const supplier = suppliers?.find(s => String(s.id) === String(formData.supplier_id));
        await create({
          ...formData,
          supplier_name: supplier?.name || '',
          created_at: now,
          updated_at: now
        } as InvSupplierContractType);
        toast.showSuccess(t('inventory.contracts.created'));
      }
      handleCloseDialog();
    } catch {
      toast.showError(t('common.error'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (await confirm({ title: t('common.delete'), message: t('common.confirmDelete'), variant: 'danger' })) {
      try {
        await remove(id);
        toast.showSuccess(t('inventory.contracts.deleted'));
      } catch {
        toast.showError(t('common.error'));
      }
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case InvContractStatusEnum.ACTIVE:
        return 'success';
      case InvContractStatusEnum.DRAFT:
        return 'secondary';
      case InvContractStatusEnum.EXPIRED:
        return 'danger';
      case InvContractStatusEnum.TERMINATED:
        return 'danger';
      case InvContractStatusEnum.PENDING_APPROVAL:
        return 'warning';
      default:
        return 'secondary';
    }
  };

  const getDaysUntilExpiry = (endDate: string) => {
    if (!endDate) return null;
    return differenceInDays(parseISO(endDate), new Date());
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD'
    }).format(amount);
  };

  const columns: DataGridColumn<InvSupplierContractType>[] = [
    {
      key: 'contract_number',
      header: t('inventory.contracts.contractNumber'),
      minWidth: 150,
      render: (_v, contract) => (
        <span className="font-medium text-surface-foreground">{contract.contract_number}</span>
      )
    },
    {
      key: 'title',
      header: t('inventory.contracts.title'),
      minWidth: 200
    },
    {
      key: 'supplier_name',
      header: t('inventory.contracts.supplier'),
      minWidth: 150
    },
    {
      key: 'contract_value',
      header: t('inventory.contracts.value'),
      width: 140,
      render: (_v, contract) => formatCurrency(contract.contract_value, contract.currency)
    },
    {
      key: 'start_date',
      header: t('inventory.contracts.startDate'),
      width: 130,
      render: (_v, contract) => contract.start_date ? format(parseISO(contract.start_date), 'MMM dd, yyyy') : ''
    },
    {
      key: 'end_date',
      header: t('inventory.contracts.endDate'),
      width: 150,
      render: (_v, contract) => {
        if (!contract.end_date) return '';
        const daysUntilExpiry = getDaysUntilExpiry(contract.end_date);
        const isExpiringSoon = daysUntilExpiry !== null && daysUntilExpiry <= 30 && daysUntilExpiry >= 0;

        return (
          <span className={`inline-flex items-center gap-1 ${isExpiringSoon ? 'text-amber-600' : ''}`}>
            {isExpiringSoon && (
              <ExclamationTriangleIcon
                className="w-4 h-4 text-amber-500"
                aria-label={t('inventory.contracts.expiringSoon')}
              />
            )}
            {format(parseISO(contract.end_date), 'MMM dd, yyyy')}
          </span>
        );
      }
    },
    {
      key: 'status',
      header: t('inventory.contracts.status'),
      width: 170,
      render: (_v, contract) => (
        <Badge variant={getStatusVariant(contract.status) as any}>
          {contract.status}
        </Badge>
      )
    },
    {
      key: 'actions',
      header: t('common.actions'),
      width: 120,
      sortable: false,
      filterable: false,
      render: (_v, contract) => (
        <div className="flex items-center gap-1">
          <Button size="sm" variant="ghost" onClick={() => handleOpenDialog(contract)} leftIcon={<EditIcon className="w-4 h-4" />}>
            {t('common.edit')}
          </Button>
          <Button size="sm" variant="danger" onClick={() => handleDelete(contract.id)} leftIcon={<DeleteIcon className="w-4 h-4" />}>
            {t('common.delete')}
          </Button>
        </div>
      )
    }
  ];

  if (error) {
    return (
      <div className="p-4 rounded-md bg-red-50 border border-red-200 text-red-700">
        {t('common.errorLoading')}: {error.message}
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-surface-foreground">
          {t('inventory.contracts.title')}
        </h1>
        <Button onClick={() => handleOpenDialog()} leftIcon={<PlusIcon className="w-4 h-4" />}>
          {t('inventory.contracts.add')}
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-surface-card border border-surface-border rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Input
            placeholder={t('inventory.contracts.search')}
            value={searchTerm}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
          />
          <Select
            label={t('inventory.contracts.status')}
            value={statusFilter}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setStatusFilter(e.target.value)}
            options={[
              { value: 'ALL', label: t('common.all') },
              ...Object.values(InvContractStatusEnum).map((status) => ({
                value: status,
                label: status
              }))
            ]}
          />
          <Select
            label={t('inventory.contracts.supplier')}
            value={supplierFilter}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSupplierFilter(e.target.value)}
            options={[
              { value: 'ALL', label: t('common.all') },
              ...(suppliers || []).map((supplier) => ({
                value: supplier.id.toString(),
                label: supplier.name
              }))
            ]}
          />
        </div>
      </div>

      {/* Data Grid */}
      <DataGrid
        columns={columns}
        data={filteredContracts}
        loading={loading}
        pagination={{ pageSize: 25 }}
        emptyState={{
          title: t('inventory.contracts.title'),
          description: t('common.noData')
        }}
      />

      {/* Add/Edit Dialog */}
      <Modal
        isOpen={dialogOpen}
        onClose={handleCloseDialog}
        title={editingContract ? t('inventory.contracts.edit') : t('inventory.contracts.add')}
        size="lg"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleCloseDialog}>{t('common.cancel')}</Button>
            <Button onClick={handleSave} disabled={saving || !formData.contract_number || !formData.title}>
              {editingContract ? t('common.update') : t('common.create')}
            </Button>
          </div>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label={t('inventory.contracts.contractNumber')}
            value={formData.contract_number || ''}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, contract_number: e.target.value })}
            required
          />
          <Select
            label={t('inventory.contracts.supplier')}
            value={formData.supplier_id ? String(formData.supplier_id) : ''}
            onValueChange={(value) => setFormData({ ...formData, supplier_id: String(value) })}
            required
            options={(suppliers || []).map((supplier) => ({
              value: supplier.id,
              label: supplier.name
            }))}
          />
          <div className="md:col-span-2">
            <Input
              label={t('inventory.contracts.title')}
              value={formData.title || ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>
          <div className="md:col-span-2">
            <Input
              label={t('inventory.contracts.description')}
              value={formData.description || ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>
          <Input
            label={t('inventory.contracts.startDate')}
            type="date"
            value={formData.start_date || ''}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, start_date: e.target.value })}
            required
          />
          <Input
            label={t('inventory.contracts.endDate')}
            type="date"
            value={formData.end_date || ''}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, end_date: e.target.value })}
          />
          <Select
            label={t('inventory.contracts.status')}
            value={formData.status || InvContractStatusEnum.DRAFT}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData({ ...formData, status: e.target.value as InvContractStatusEnum })}
            options={Object.values(InvContractStatusEnum).map((status) => ({
              value: status,
              label: status
            }))}
          />
          <Input
            label={t('inventory.contracts.value')}
            type="number"
            value={formData.contract_value || 0}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, contract_value: parseFloat(e.target.value) || 0 })}
          />
          <Input
            label={t('inventory.contracts.currency')}
            value={formData.currency || 'USD'}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, currency: e.target.value })}
            placeholder="USD, EUR, GBP"
          />
          <Input
            label={t('inventory.contracts.paymentTerms')}
            value={formData.payment_terms || ''}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, payment_terms: e.target.value })}
            placeholder="e.g., Net 30, COD"
          />
          <Input
            label={t('inventory.contracts.deliveryTerms')}
            value={formData.delivery_terms || ''}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, delivery_terms: e.target.value })}
            placeholder="e.g., FOB, CIF"
          />
          <div className="md:col-span-2">
            <Input
              label={t('inventory.contracts.termsAndConditions')}
              value={formData.terms_and_conditions || ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, terms_and_conditions: e.target.value })}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
};
const SupplierContractsPage: React.FC = () => (
  <div className="space-y-6">
    <SupplierContractsPageContent />
  </div>
);

export default SupplierContractsPage;
