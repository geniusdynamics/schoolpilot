// ABOUTME: Suppliers management page for the inventory module.
// ABOUTME: Provides comprehensive supplier management with CRUD operations, search, and filtering.

import React, { useState, useEffect } from 'react';
import { PageHeaderWithTabs } from '@/components/ui/PageHeaderWithTabs';
import { DataGrid, DataGridColumn } from '@/components/ui/data';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Modal from '@/components/ui/Modal';
import Badge from '@/components/ui/Badge';
import { useToast } from '@/hooks/useToast';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { EditIcon, DeleteIcon, PlusIcon, StarIcon } from '@/components/ui/icons';
import { useSupplierData } from '../data/useSupplierData';
import { InvSupplierType, InvSupplierStatusEnum } from '../data/types';
import { useTranslation } from 'react-i18next';

const StarRating: React.FC<{ value: number; onChange?: (value: number) => void; readOnly?: boolean }> = ({
  value,
  onChange,
  readOnly = false
}) => (
  <div className="flex items-center gap-1">
    {[1, 2, 3, 4, 5].map((star) => (
      <button
        key={star}
        type="button"
        disabled={readOnly}
        onClick={() => onChange?.(star)}
        aria-label={`${star} star${star > 1 ? 's' : ''}`}
        className={readOnly ? 'cursor-default' : 'hover:scale-110 transition-transform'}
      >
        <StarIcon
          className={`h-4 w-4 ${star <= value ? 'text-yellow-400' : 'text-gray-300'}`}
        />
      </button>
    ))}
  </div>
);

export const SuppliersPageContent: React.FC = () => {
  const { t } = useTranslation();
  const toast = useToast();
  const confirm = useConfirm();
  const {
    suppliers,
    loading,
    error,
    create,
    update,
    remove
  } = useSupplierData();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<InvSupplierType | null>(null);
  const [formData, setFormData] = useState<Partial<InvSupplierType>>({
    name: '',
    contact_person: '',
    email: '',
    phone: '',
    address: '',
    tax_id: '',
    registration_number: '',
    status: InvSupplierStatusEnum.ACTIVE,
    payment_terms: '',
    credit_limit: 0,
    performance_rating: 5
  });

  const [filteredSuppliers, setFilteredSuppliers] = useState<InvSupplierType[]>([]);

  useEffect(() => {
    let filtered = suppliers || [];

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(supplier =>
        (supplier.name?.toLowerCase() ?? '').includes(searchTerm.toLowerCase()) ||
        supplier.contact_person?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        supplier.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply status filter
    if (statusFilter !== 'ALL') {
      filtered = filtered.filter(supplier => supplier.status === statusFilter);
    }

    setFilteredSuppliers(filtered);
  }, [suppliers, searchTerm, statusFilter]);

  const handleOpenDialog = (supplier?: InvSupplierType) => {
    if (supplier) {
      setEditingSupplier(supplier);
      setFormData(supplier);
    } else {
      setEditingSupplier(null);
      setFormData({
        name: '',
        contact_person: '',
        email: '',
        phone: '',
        address: '',
        tax_id: '',
        registration_number: '',
        status: InvSupplierStatusEnum.ACTIVE,
        payment_terms: '',
        credit_limit: 0,
        performance_rating: 5
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingSupplier(null);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editingSupplier) {
        await update(editingSupplier.id, {
          ...formData,
          updated_at: new Date().toISOString()
        } as InvSupplierType);
        toast.showSuccess(t('inventory.suppliers.updated'));
      } else {
        const now = new Date().toISOString();
        await create({
          ...formData,
          id: Date.now(), // Simple ID generation for demo
          created_at: now,
          updated_at: now
        } as InvSupplierType);
        toast.showSuccess(t('inventory.suppliers.created'));
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
        toast.showSuccess(t('inventory.suppliers.deleted'));
      } catch {
        toast.showError(t('common.error'));
      }
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case InvSupplierStatusEnum.ACTIVE:
        return 'success';
      case InvSupplierStatusEnum.INACTIVE:
        return 'secondary';
      case InvSupplierStatusEnum.BLACKLISTED:
        return 'danger';
      case InvSupplierStatusEnum.PENDING_APPROVAL:
        return 'warning';
      default:
        return 'secondary';
    }
  };

  const columns: DataGridColumn<InvSupplierType>[] = [
    {
      key: 'name',
      header: t('inventory.suppliers.name'),
      minWidth: 200,
      render: (_v, supplier) => (
        <span className="font-medium text-surface-foreground">{supplier.name}</span>
      )
    },
    {
      key: 'contact_person',
      header: t('inventory.suppliers.contactPerson'),
      minWidth: 150
    },
    {
      key: 'email',
      header: t('inventory.suppliers.email'),
      minWidth: 200
    },
    {
      key: 'phone',
      header: t('inventory.suppliers.phone'),
      minWidth: 150
    },
    {
      key: 'status',
      header: t('inventory.suppliers.status'),
      width: 160,
      render: (_v, supplier) => (
        <Badge variant={getStatusVariant(supplier.status) as any}>
          {supplier.status}
        </Badge>
      )
    },
    {
      key: 'performance_rating',
      header: t('inventory.suppliers.rating'),
      width: 150,
      sortable: false,
      render: (_v, supplier) => (
        <StarRating value={supplier.performance_rating || 0} readOnly />
      )
    },
    {
      key: 'actions',
      header: t('common.actions'),
      width: 120,
      sortable: false,
      filterable: false,
      render: (_v, supplier) => (
        <div className="flex items-center gap-1">
          <Button size="sm" variant="ghost" onClick={() => handleOpenDialog(supplier)} leftIcon={<EditIcon className="w-4 h-4" />}>
            {t('common.edit')}
          </Button>
          <Button size="sm" variant="danger" onClick={() => handleDelete(supplier.id)} leftIcon={<DeleteIcon className="w-4 h-4" />}>
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
    <div className="p-6 space-y-3">
      <PageHeaderWithTabs
        title={t('inventory.suppliers.title')}
        action={
          <Button onClick={() => handleOpenDialog()} leftIcon={<PlusIcon className="w-4 h-4" />}>
            {t('inventory.suppliers.add')}
          </Button>
        }
      />

      {/* Filters */}
      <div className="bg-surface-card border border-surface-border rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            placeholder={t('inventory.suppliers.search')}
            value={searchTerm}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
          />
          <Select
            label={t('inventory.suppliers.status')}
            value={statusFilter}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setStatusFilter(e.target.value)}
            options={[
              { value: 'ALL', label: t('common.all') },
              ...Object.values(InvSupplierStatusEnum).map((status) => ({
                value: status,
                label: status
              }))
            ]}
          />
        </div>
      </div>

      {/* Data Grid */}
      <DataGrid
        columns={columns}
        data={filteredSuppliers}
        loading={loading}
        pagination={{ pageSize: 25 }}
        emptyState={{
          title: t('inventory.suppliers.title'),
          description: t('common.noData')
        }}
      />

      {/* Add/Edit Dialog */}
      <Modal
        isOpen={dialogOpen}
        onClose={handleCloseDialog}
        title={editingSupplier ? t('inventory.suppliers.edit') : t('inventory.suppliers.add')}
        size="lg"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleCloseDialog}>{t('common.cancel')}</Button>
            <Button onClick={handleSave} disabled={saving || !formData.name}>
              {editingSupplier ? t('common.update') : t('common.create')}
            </Button>
          </div>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label={t('inventory.suppliers.name')}
            value={formData.name || ''}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, name: e.target.value })}
            required
          />
          <Input
            label={t('inventory.suppliers.contactPerson')}
            value={formData.contact_person || ''}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, contact_person: e.target.value })}
          />
          <Input
            label={t('inventory.suppliers.email')}
            type="email"
            value={formData.email || ''}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, email: e.target.value })}
          />
          <Input
            label={t('inventory.suppliers.phone')}
            value={formData.phone || ''}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, phone: e.target.value })}
          />
          <div className="md:col-span-2">
            <Input
              label={t('inventory.suppliers.address')}
              value={formData.address || ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, address: e.target.value })}
            />
          </div>
          <Input
            label={t('inventory.suppliers.taxId')}
            value={formData.tax_id || ''}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, tax_id: e.target.value })}
          />
          <Input
            label={t('inventory.suppliers.registrationNumber')}
            value={formData.registration_number || ''}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, registration_number: e.target.value })}
          />
          <Select
            label={t('inventory.suppliers.status')}
            value={formData.status || InvSupplierStatusEnum.ACTIVE}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData({ ...formData, status: e.target.value as InvSupplierStatusEnum })}
            options={Object.values(InvSupplierStatusEnum).map((status) => ({
              value: status,
              label: status
            }))}
          />
          <Input
            label={t('inventory.suppliers.paymentTerms')}
            value={formData.payment_terms || ''}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, payment_terms: e.target.value })}
            placeholder="e.g., Net 30, COD"
          />
          <Input
            label={t('inventory.suppliers.creditLimit')}
            type="number"
            value={formData.credit_limit || 0}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, credit_limit: parseFloat(e.target.value) || 0 })}
          />
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-surface-foreground">{t('inventory.suppliers.rating')}</span>
            <StarRating
              value={formData.performance_rating || 5}
              onChange={(newValue) => setFormData({ ...formData, performance_rating: newValue || 5 })}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
};
const SuppliersPage: React.FC = () => (
  <div className="space-y-3">
    <SuppliersPageContent />
  </div>
);

export default SuppliersPage;
