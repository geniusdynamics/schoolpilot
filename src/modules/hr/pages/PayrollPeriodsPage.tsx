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
import type { PayrollPeriod } from '@/modules/hr/data/types';
import { logger } from '@/utils/logging';

import { formatKES, formatDate } from '@/utils/format';
type PayrollPeriodFormData = Omit<Partial<PayrollPeriod>, 'id' | 'created_at' | 'updated_at'>;

export const PayrollPeriodsPageContent: React.FC = () => {
  const { t } = useTranslation('hr');
  const { payrollPeriods, loading: appDataLoading, refreshCollection } = useAppData();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPeriod, setEditingPeriod] = useState<PayrollPeriod | null>(null);
  const [formData, setFormData] = useState<PayrollPeriodFormData>({
    name: '',
    period_type: 'monthly',
    start_date: '',
    end_date: '',
    status: 'draft',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const openModal = useCallback((period?: PayrollPeriod) => {
    if (period) {
      setEditingPeriod(period);
      setFormData({
        name: period.name,
        period_type: period.period_type,
        start_date: period.start_date ? period.start_date.split('T')[0] : '',
        end_date: period.end_date ? period.end_date.split('T')[0] : '',
        status: period.status,
      });
    } else {
      setEditingPeriod(null);
      setFormData({
        name: '',
        period_type: 'monthly',
        start_date: '',
        end_date: '',
        status: 'draft',
      });
    }
    setFormErrors({});
    setIsModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setEditingPeriod(null);
    setFormData({
      name: '',
      period_type: 'monthly',
      start_date: '',
      end_date: '',
      status: 'draft',
    });
    setFormErrors({});
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: '' }));
    }
  }, [formErrors]);

  const validateForm = useCallback((): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.name?.trim()) {
      errors.name = t('payrollPeriods.validation.nameRequired') || 'Name is required';
    }
    if (!formData.period_type) {
      errors.period_type = t('payrollPeriods.validation.typeRequired') || 'Period type is required';
    }
    if (!formData.start_date) {
      errors.start_date = t('payrollPeriods.validation.startDateRequired') || 'Start date is required';
    }
    if (!formData.end_date) {
      errors.end_date = t('payrollPeriods.validation.endDateRequired') || 'End date is required';
    }
    if (formData.start_date && formData.end_date && formData.start_date >= formData.end_date) {
      errors.end_date = t('payrollPeriods.validation.endDateAfterStart') || 'End date must be after start date';
    }
    if (!formData.status) {
      errors.status = t('payrollPeriods.validation.statusRequired') || 'Status is required';
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
      const collection = db.getCollection<PayrollPeriod>('payroll_periods');
      
      const timestamp = new Date().toISOString();

      if (editingPeriod) {
        await collection?.update(editingPeriod.id.toString(), {
          name: formData.name,
          period_type: formData.period_type as 'weekly' | 'monthly' | 'quarterly' | 'yearly',
          start_date: new Date(formData.start_date!).toISOString(),
          end_date: new Date(formData.end_date!).toISOString(),
          status: formData.status as 'draft' | 'open' | 'closed',
          updated_at: timestamp,
        });
      } else {
        const newId = Date.now();
        await collection?.insert({
          id: newId,
          name: formData.name!,
          period_type: formData.period_type as 'weekly' | 'monthly' | 'quarterly' | 'yearly',
          start_date: new Date(formData.start_date!).toISOString(),
          end_date: new Date(formData.end_date!).toISOString(),
          status: formData.status as 'draft' | 'open' | 'closed',
          created_at: timestamp,
          updated_at: timestamp,
        });
      }

      await refreshCollection('payrollPeriods');
      closeModal();
    } catch (error) {
      logger.error('Error saving payroll period:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [editingPeriod, formData, refreshCollection, closeModal, validateForm]);

  const handleDelete = useCallback(async (period: PayrollPeriod) => {
    if (period.status === 'closed') {
      alert(t('payrollPeriods.cannotDeleteClosed') || 'Cannot delete closed periods');
      return;
    }

    if (!confirm(t('payrollPeriods.confirmDelete') || 'Are you sure you want to delete this period?')) {
      return;
    }

    try {
      const dbManager = await import('@/services/database/UnifiedDatabaseManager').then(m => m.UnifiedDatabaseManager);
      const db = dbManager.getInstance();
      const collection = db.getCollection<PayrollPeriod>('payroll_periods');
      await collection?.remove(period.id.toString());
      await refreshCollection('payrollPeriods');
    } catch (error) {
      logger.error('Error deleting payroll period:', error);
    }
  }, [refreshCollection, t]);

  const getStatusBadge = (status: string) => {
    const statusClasses: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-800',
      open: 'bg-green-100 text-green-800',
      closed: 'bg-blue-100 text-blue-800',
    };
    return (
      <span className={`px-2 py-1 text-xs rounded-full ${statusClasses[status] || 'bg-gray-100 text-gray-800'}`}>
        {t(`payrollPeriods.status.${status}`) || status}
      </span>
    );
  };

  const columns = [
    { header: t('tableHeaders.id'), key: 'id' as keyof PayrollPeriod },
    { header: t('tableHeaders.name'), key: 'name' as keyof PayrollPeriod },
    { header: t('tableHeaders.type'), key: 'period_type' as keyof PayrollPeriod },
    { 
      header: t('tableHeaders.startDate'), 
      key: 'start_date' as keyof PayrollPeriod,
      render: (value: string) => value ? formatDate(value) : '-'
    },
    { 
      header: t('tableHeaders.endDate'), 
      key: 'end_date' as keyof PayrollPeriod,
      render: (value: string) => value ? formatDate(value) : '-'
    },
    { header: t('tableHeaders.status'), key: 'status' as keyof PayrollPeriod, render: (value: string) => getStatusBadge(value) },
    {
      header: t('tableHeaders.actions'),
      key: 'id' as keyof PayrollPeriod,
      render: (_: any, item: PayrollPeriod) => (
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={() => openModal(item)} leftIcon={<EditIcon className="w-4 h-4" />}>
            {t('common:edit')}
          </Button>
          {item.status !== 'closed' && (
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
        title={t('payrollPeriods.title')}
        actions={
          <Button onClick={() => openModal()} leftIcon={<PlusIcon className="w-5 h-5" />}>
            {t('payrollPeriods.addButton')}
          </Button>
        }
      >
        <p className="text-sm text-gray-600 mb-4">{t('payrollPeriods.description')}</p>
        {appDataLoading.payrollPeriods ? (
          <div className="flex justify-center py-8">
            <Spinner />
          </div>
        ) : (
          <DataGrid
            columns={columns}
            data={payrollPeriods || []}
            emptyState={t('payrollPeriods.noPeriods') || 'No payroll periods found'}
          />
        )}
      </Card>

      <DialogForm
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingPeriod ? t('payrollPeriods.modalEditTitle') : t('payrollPeriods.modalAddTitle')}
        onSubmit={handleSubmit}
        loading={isSubmitting}
      >
        <FormSection title={t('payrollPeriods.formSection.title')}>
          <FormField label={t('fields.name')} required error={formErrors.name}>
            <Input
              name="name"
              value={formData.name || ''}
              onChange={handleInputChange}
              disabled={isSubmitting}
              placeholder={t('fields.namePlaceholder')}
            />
          </FormField>
          <FormField label={t('fields.periodType')} required error={formErrors.period_type}>
            <select
              name="period_type"
              value={formData.period_type || ''}
              onChange={handleInputChange}
              disabled={isSubmitting}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="weekly">{t('payrollPeriods.periodType.weekly')}</option>
              <option value="monthly">{t('payrollPeriods.periodType.monthly')}</option>
              <option value="quarterly">{t('payrollPeriods.periodType.quarterly')}</option>
              <option value="yearly">{t('payrollPeriods.periodType.yearly')}</option>
            </select>
          </FormField>
          <FormField label={t('fields.startDate')} required error={formErrors.start_date}>
            <Input
              type="date"
              name="start_date"
              value={formData.start_date || ''}
              onChange={handleInputChange}
              disabled={isSubmitting}
            />
          </FormField>
          <FormField label={t('fields.endDate')} required error={formErrors.end_date}>
            <Input
              type="date"
              name="end_date"
              value={formData.end_date || ''}
              onChange={handleInputChange}
              disabled={isSubmitting}
            />
          </FormField>
          <FormField label={t('fields.status')} required error={formErrors.status}>
            <select
              name="status"
              value={formData.status || ''}
              onChange={handleInputChange}
              disabled={isSubmitting}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="draft">{t('payrollPeriods.status.draft')}</option>
              <option value="open">{t('payrollPeriods.status.open')}</option>
              <option value="closed">{t('payrollPeriods.status.closed')}</option>
            </select>
          </FormField>
        </FormSection>
        <FormActions>
          <Button variant="secondary" onClick={closeModal} disabled={isSubmitting}>
            {t('common:cancel')}
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? <Spinner size="sm" /> : (editingPeriod ? t('common:save') : t('common:create'))}
          </Button>
        </FormActions>
      </DialogForm>
    </div>
  );
};

const PayrollPeriodsPage: React.FC = () => (
  <div className="space-y-6">
    <PayrollPeriodsPageContent />
  </div>
);

export default PayrollPeriodsPage;
