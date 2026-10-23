// ABOUTME: Staff Salary Settings page — per-staff earnings and deductions in the 'staff_salary_components' collection.
// ABOUTME: Ids and staff_id stay strings (UUIDs); edits use update(id, patch) and deletes confirm in a dialog.

import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import Card from '@/components/ui/Card';
import { DataGrid } from '@/components/ui/data';
import { PlusIcon, EditIcon, DeleteIcon } from '@/components/ui/icons';
import { useDatabaseCollection } from '@/hooks/useDatabaseCollection';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import Spinner from '@/components/ui/Spinner';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import DialogForm from '@/components/ui/forms/DialogForm';
import FormSection from '@/components/ui/forms/FormSection';
import FormField from '@/components/ui/forms/FormField';
import FormActions from '@/components/ui/forms/FormActions';
import { EntityPicker } from '@/components/ui/EntityPicker';
import { asId, type Id } from '@/domain/ids';
import { logger } from '@/utils/logging';
import { CanonicalRepositoryProvider } from '../data/canonicalRepository';
import { useCanonicalStaff } from '../data/useCanonicalStaff';

import { formatDate } from '@/utils/format';
import { formatMoney } from '@/domain/money';

export const STAFF_SALARY_COMPONENTS_COLLECTION = 'staff_salary_components';

/** A stored salary component; ids are strings at runtime. */
interface StaffSalaryComponent {
  id: string;
  staff_id: string;
  component_name: string;
  component_type: 'earning' | 'deduction';
  amount: number;
  is_active?: boolean;
  effective_from?: string;
  effective_to?: string | null;
  created_at?: string;
  updated_at?: string;
}

interface SalaryComponentFormData {
  staff_id: Id<'staff'> | null;
  component_name: string;
  component_type: 'earning' | 'deduction';
  amount: number | null;
  is_active: boolean;
  effective_from: string;
  effective_to: string;
}

export const StaffSalarySettingsPageContent: React.FC = () => {
  const { t } = useTranslation('hr');
  const confirm = useConfirm();
  // The staff member a component belongs to is canonical.
  const { staff, staffLookup } = useCanonicalStaff();
  // GAP(P1-E05): the registry models no salary component, so the components stay on
  // their own legacy collection until a registry change adds the entity.
  const {
    data: salaryComponents,
    loading,
    insert,
    update,
    remove,
  } = useDatabaseCollection<StaffSalaryComponent>(STAFF_SALARY_COMPONENTS_COLLECTION);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingComponent, setEditingComponent] = useState<StaffSalaryComponent | null>(null);
  const [formData, setFormData] = useState<SalaryComponentFormData>({
    staff_id: null,
    component_name: '',
    component_type: 'earning',
    amount: null,
    is_active: true,
    effective_from: new Date().toISOString().split('T')[0],
    effective_to: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const openModal = useCallback((component?: StaffSalaryComponent) => {
    if (component) {
      setEditingComponent(component);
      setFormData({
        staff_id: component.staff_id == null ? null : asId<'staff'>(component.staff_id),
        component_name: component.component_name,
        component_type: component.component_type,
        amount: component.amount,
        is_active: component.is_active ?? true,
        effective_from: component.effective_from ? component.effective_from.split('T')[0] : '',
        effective_to: component.effective_to ? component.effective_to.split('T')[0] : '',
      });
    } else {
      setEditingComponent(null);
      setFormData({
        staff_id: null,
        component_name: '',
        component_type: 'earning',
        amount: null,
        is_active: true,
        effective_from: new Date().toISOString().split('T')[0],
        effective_to: '',
      });
    }
    setFormErrors({});
    setIsModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setEditingComponent(null);
    setFormData({
      staff_id: null,
      component_name: '',
      component_type: 'earning',
      amount: null,
      is_active: true,
      effective_from: new Date().toISOString().split('T')[0],
      effective_to: '',
    });
    setFormErrors({});
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : 
                type === 'number' ? (value ? parseFloat(value) : null) : 
                name === 'staff_id' ? (value || null) : value;
    setFormData(prev => ({ ...prev, [name]: val }));
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: '' }));
    }
  }, [formErrors]);

  const validateForm = useCallback((): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.staff_id) {
      errors.staff_id = t('salarySettings.validation.staffRequired') || 'Staff member is required';
    }
    if (!formData.component_name?.trim()) {
      errors.component_name = t('salarySettings.validation.nameRequired') || 'Component name is required';
    }
    if (formData.amount === null || formData.amount <= 0) {
      errors.amount = t('salarySettings.validation.amountRequired') || 'Amount must be greater than 0';
    }
    if (!formData.effective_from) {
      errors.effective_from = t('salarySettings.validation.effectiveFromRequired') || 'Effective from date is required';
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
      const timestamp = new Date().toISOString();
      const fields = {
        staff_id: formData.staff_id!,
        component_name: formData.component_name.trim(),
        component_type: formData.component_type,
        amount: formData.amount!,
        is_active: formData.is_active,
        effective_from: new Date(formData.effective_from).toISOString(),
        effective_to: formData.effective_to ? new Date(formData.effective_to).toISOString() : null,
        updated_at: timestamp,
      };

      if (editingComponent) {
        await update(String(editingComponent.id), fields);
      } else {
        await insert({ ...fields, created_at: timestamp });
      }

      closeModal();
    } catch (error) {
      logger.error('Error saving salary component:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [editingComponent, formData, insert, update, closeModal, validateForm]);

  const handleDelete = useCallback(async (component: StaffSalaryComponent) => {
    const confirmed = await confirm({
      variant: 'danger',
      message: t('salarySettings.confirmDelete') || 'Are you sure you want to delete this component?',
    });
    if (!confirmed) return;

    try {
      await remove(String(component.id));
    } catch (error) {
      logger.error('Error deleting salary component:', error);
    }
  }, [confirm, remove, t]);

  const getStaffName = (staffId: string) => {
    const staffMember = staff.find(s => s.id === staffId);
    return staffMember?.display_name || `Staff #${staffId}`;
  };

  const columns = [
    { header: t('tableHeaders.id'), key: 'id' as keyof StaffSalaryComponent },
    { 
      header: t('tableHeaders.staff'), 
      key: 'staff_id' as keyof StaffSalaryComponent,
      render: (value: string) => getStaffName(value)
    },
    { header: t('tableHeaders.componentName'), key: 'component_name' as keyof StaffSalaryComponent },
    { header: t('tableHeaders.type'), key: 'component_type' as keyof StaffSalaryComponent },
    { 
      header: t('tableHeaders.amount'), 
      key: 'amount' as keyof StaffSalaryComponent,
      render: (value: number) => formatMoney(value, 'KES')
    },
    { 
      header: t('tableHeaders.effectiveFrom'), 
      key: 'effective_from' as keyof StaffSalaryComponent,
      render: (value: string) => value ? formatDate(value) : '-'
    },
    { header: t('tableHeaders.status'), key: 'is_active' as keyof StaffSalaryComponent, render: (value: boolean) => (
      <span className={`px-2 py-1 text-xs rounded-full ${value ? 'bg-green-100 text-green-800' : 'bg-surface-accent text-surface-foreground'}`}>
        {value ? t('common:active') : t('common:inactive')}
      </span>
    )},
    {
      header: t('tableHeaders.actions'),
      key: 'id' as keyof StaffSalaryComponent,
      render: (_: unknown, item: StaffSalaryComponent) => (
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={() => openModal(item)} leftIcon={<EditIcon className="w-4 h-4" />}>
            {t('common:edit')}
          </Button>
          <Button size="sm" variant="danger" onClick={() => handleDelete(item)} leftIcon={<DeleteIcon className="w-4 h-4" />}>
            {t('common:delete')}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <Card
        title={t('salarySettings.title')}
        info={t('salarySettings.description')}
        actions={
          <Button onClick={() => openModal()} leftIcon={<PlusIcon className="w-5 h-5" />}>
            {t('salarySettings.addButton')}
          </Button>
        }
      >
        {loading ? (
          <div className="flex justify-center py-8">
            <Spinner />
          </div>
        ) : (
          <DataGrid
            columns={columns}
            data={salaryComponents}
            emptyState={t('salarySettings.noComponents') || 'No salary components found'}
          />
        )}
      </Card>

      <DialogForm
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingComponent ? t('salarySettings.modalEditTitle') : t('salarySettings.modalAddTitle')}
        onSubmit={handleSubmit}
        loading={isSubmitting}
      >
        <FormSection title={t('salarySettings.formSection.title')}>
          <FormField label={t('fields.staff')} required error={formErrors.staff_id}>
            <EntityPicker
              value={formData.staff_id}
              onChange={(id) => {
                setFormData(prev => ({ ...prev, staff_id: id }));
                if (formErrors.staff_id) setFormErrors(prev => ({ ...prev, staff_id: '' }));
              }}
              lookup={staffLookup}
              label={t('fields.staff')}
              placeholder={t('fields.selectStaff')}
              disabled={isSubmitting}
              data-testid="salary-component-staff-picker"
            />
          </FormField>
          <FormField label={t('fields.componentName')} required error={formErrors.component_name}>
            <Input
              name="component_name"
              value={formData.component_name || ''}
              onChange={handleInputChange}
              disabled={isSubmitting}
              placeholder={t('fields.componentNamePlaceholder')}
            />
          </FormField>
          <FormField label={t('fields.componentType')} required>
            <select
              name="component_type"
              value={formData.component_type || 'earning'}
              onChange={handleInputChange}
              disabled={isSubmitting}
              className="w-full px-3 py-2 border border-surface-border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="earning">{t('fields.typeEarning')}</option>
              <option value="deduction">{t('fields.typeDeduction')}</option>
            </select>
          </FormField>
          <FormField label={t('fields.amount')} required error={formErrors.amount}>
            <Input
              type="number"
              name="amount"
              value={formData.amount?.toString() || ''}
              onChange={handleInputChange}
              disabled={isSubmitting}
              placeholder="0.00"
              min="0"
              step="0.01"
            />
          </FormField>
          <FormField label={t('fields.effectiveFrom')} required error={formErrors.effective_from}>
            <Input
              type="date"
              name="effective_from"
              value={formData.effective_from || ''}
              onChange={handleInputChange}
              disabled={isSubmitting}
            />
          </FormField>
          <FormField label={t('fields.effectiveTo')}>
            <Input
              type="date"
              name="effective_to"
              value={formData.effective_to || ''}
              onChange={handleInputChange}
              disabled={isSubmitting}
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
            {editingComponent ? t('common:save') : t('common:create')}
          </Button>
        </FormActions>
      </DialogForm>
    </div>
  );
};

const StaffSalarySettingsPage: React.FC = () => (
  <CanonicalRepositoryProvider>
    <div className="space-y-3">
      <StaffSalarySettingsPageContent />
    </div>
  </CanonicalRepositoryProvider>
);

export default StaffSalarySettingsPage;
