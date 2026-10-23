import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import Card from '@/components/ui/Card';
import { DataGrid } from '@/components/ui/data';
import { PlusIcon, EditIcon, DeleteIcon } from '@/components/ui/icons';
import { useAppData } from '@/hooks/useAppData';
import Spinner from '@/components/ui/Spinner';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import DialogForm from '@/components/ui/forms/DialogForm';
import FormSection from '@/components/ui/forms/FormSection';
import FormField from '@/components/ui/forms/FormField';
import FormActions from '@/components/ui/forms/FormActions';
import type { PayrollItemType } from '@/modules/hr/data/types';
import { logger } from '@/utils/logging';

type PayrollItemTypeFormData = Omit<Partial<PayrollItemType>, 'id' | 'created_at' | 'updated_at'>;

export const PayrollItemTypesPageContent: React.FC = () => {
  const { t } = useTranslation('hr');
  // GAP(P1-E05): the canonical registry models no payroll item type, so the item types
  // stay on the legacy collection until a registry change adds the entity.
  const { payrollItemTypes, loading: appDataLoading, refreshCollection } = useAppData();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PayrollItemType | null>(null);
  const [formData, setFormData] = useState<PayrollItemTypeFormData>({
    name: '',
    code: '',
    type: 'earning',
    description: '',
    is_active: true,
    is_system_defined: false,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const openModal = useCallback((item?: PayrollItemType) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        name: item.name,
        code: item.code,
        type: item.type,
        description: item.description || '',
        is_active: item.is_active,
        is_system_defined: item.is_system_defined || false,
      });
    } else {
      setEditingItem(null);
      setFormData({
        name: '',
        code: '',
        type: 'earning',
        description: '',
        is_active: true,
        is_system_defined: false,
      });
    }
    setFormErrors({});
    setIsModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setEditingItem(null);
    setFormData({
      name: '',
      code: '',
      type: 'earning',
      description: '',
      is_active: true,
      is_system_defined: false,
    });
    setFormErrors({});
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    setFormData(prev => ({ ...prev, [name]: val }));
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: '' }));
    }
  }, [formErrors]);

  const validateForm = useCallback((): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.name?.trim()) {
      errors.name = t('payrollItemTypes.validation.nameRequired') || 'Name is required';
    }
    if (!formData.code?.trim()) {
      errors.code = t('payrollItemTypes.validation.codeRequired') || 'Code is required';
    }
    if (!formData.type) {
      errors.type = t('payrollItemTypes.validation.typeRequired') || 'Type is required';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }, [formData, t]);

  const handleSubmit = useCallback(async () => {
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const dbManager = await import('@/services/database/UnifiedDatabaseManager').then(m => m.UnifiedDatabaseManager);
      const db = dbManager.getInstance();
      const collection = db.getCollection<PayrollItemType>('payroll_item_types');
      
      const timestamp = new Date().toISOString();

      if (editingItem) {
        await collection?.update(editingItem.id.toString(), {
          name: formData.name,
          code: formData.code,
          type: formData.type as 'earning' | 'deduction',
          description: formData.description,
          is_active: formData.is_active,
          updated_at: timestamp,
        });
      } else {
        const newId = Date.now();
        await collection?.insert({
          id: newId,
          name: formData.name!,
          code: formData.code!,
          type: formData.type as 'earning' | 'deduction',
          description: formData.description,
          is_active: formData.is_active ?? true,
          is_system_defined: false,
          created_at: timestamp,
          updated_at: timestamp,
        });
      }

      await refreshCollection('payrollItemTypes');
      closeModal();
    } catch (error) {
      logger.error('Error saving payroll item type:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [editingItem, formData, refreshCollection, closeModal, validateForm]);

  const handleDelete = useCallback(async (item: PayrollItemType) => {
    if (item.is_system_defined) {
      alert(t('payrollItemTypes.cannotDeleteSystem') || 'Cannot delete system-defined items');
      return;
    }

    if (!confirm(t('payrollItemTypes.confirmDelete') || 'Are you sure you want to delete this item?')) {
      return;
    }

    try {
      const dbManager = await import('@/services/database/UnifiedDatabaseManager').then(m => m.UnifiedDatabaseManager);
      const db = dbManager.getInstance();
      const collection = db.getCollection<PayrollItemType>('payroll_item_types');
      await collection?.remove(item.id.toString());
      await refreshCollection('payrollItemTypes');
    } catch (error) {
      logger.error('Error deleting payroll item type:', error);
    }
  }, [refreshCollection, t]);

  const columns = [
    { header: t('tableHeaders.id'), key: 'id' as keyof PayrollItemType },
    { header: t('tableHeaders.name'), key: 'name' as keyof PayrollItemType },
    { header: t('tableHeaders.code'), key: 'code' as keyof PayrollItemType },
    { header: t('tableHeaders.type'), key: 'type' as keyof PayrollItemType },
    { header: t('tableHeaders.status'), key: 'is_active' as keyof PayrollItemType },
    {
      header: t('tableHeaders.actions'),
      key: 'actions',
      render: (_v: any, item: PayrollItemType) => (
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={() => openModal(item)} leftIcon={<EditIcon className="w-4 h-4" />}>
            {t('common:edit')}
          </Button>
          {!item.is_system_defined && (
            <Button size="sm" variant="danger" onClick={() => handleDelete(item)} leftIcon={<DeleteIcon className="w-4 h-4" />}>
              {t('common:delete')}
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <Card
        title={t('payrollItemTypes.title')}
        info={t('payrollItemTypes.description')}
        actions={
          <Button onClick={() => openModal()} leftIcon={<PlusIcon className="w-5 h-5" />}>
            {t('payrollItemTypes.addButton')}
          </Button>
        }
      >
        {appDataLoading.payrollItemTypes ? (
          <div className="flex justify-center py-8">
            <Spinner />
          </div>
        ) : (
          <DataGrid
            columns={columns}
            data={payrollItemTypes || []}
            emptyState={t('payrollItemTypes.noItems') || 'No payroll item types found'}
          />
        )}
      </Card>

      <DialogForm
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingItem ? t('payrollItemTypes.modalEditTitle') : t('payrollItemTypes.modalAddTitle')}
        onSubmit={handleSubmit}
        loading={isSubmitting}
      >
        <FormSection title={t('payrollItemTypes.formSection.title')}>
          <FormField label={t('fields.name')} required error={formErrors.name}>
            <Input
              name="name"
              value={formData.name || ''}
              onChange={handleInputChange}
              disabled={isSubmitting}
              placeholder={t('fields.namePlaceholder')}
            />
          </FormField>
          <FormField label={t('fields.code')} required error={formErrors.code}>
            <Input
              name="code"
              value={formData.code || ''}
              onChange={handleInputChange}
              disabled={isSubmitting || editingItem?.is_system_defined}
              placeholder={t('fields.codePlaceholder')}
            />
          </FormField>
          <FormField label={t('fields.type')} required error={formErrors.type}>
            <select
              name="type"
              value={formData.type || ''}
              onChange={handleInputChange}
              disabled={isSubmitting || editingItem?.is_system_defined}
              className="w-full px-3 py-2 border border-surface-border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="earning">{t('fields.typeEarning')}</option>
              <option value="deduction">{t('fields.typeDeduction')}</option>
            </select>
          </FormField>
          <FormField label={t('fields.description')}>
            <textarea
              name="description"
              value={formData.description || ''}
              onChange={handleInputChange}
              disabled={isSubmitting}
              placeholder={t('fields.descriptionPlaceholder')}
              rows={3}
              className="w-full px-3 py-2 border border-surface-border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </FormField>
          <FormField>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                name="is_active"
                checked={formData.is_active ?? true}
                onChange={handleInputChange}
                disabled={isSubmitting}
                className="w-4 h-4 text-primary-600 border-surface-border rounded focus:ring-primary-500"
              />
              <span className="text-sm text-surface-foreground">{t('fields.isActive')}</span>
            </label>
          </FormField>
        </FormSection>
        <FormActions>
          <Button variant="secondary" onClick={closeModal} disabled={isSubmitting}>
            {t('common:cancel')}
          </Button>
          <Button type="submit" loading={isSubmitting}>
            {editingItem ? t('common:save') : t('common:create')}
          </Button>
        </FormActions>
      </DialogForm>
    </div>
  );
};

const PayrollItemTypesPage: React.FC = () => (
  <div className="space-y-3">
    <PayrollItemTypesPageContent />
  </div>
);

export default PayrollItemTypesPage;
