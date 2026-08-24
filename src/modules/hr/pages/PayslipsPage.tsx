import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import Card from '@/components/ui/Card';
import { DataGrid } from '@/components/ui/data';
import { PlusIcon, EyeIcon } from '@/components/ui/icons';
import { useAppData } from '@/hooks/useAppData';
import Spinner from '@/components/ui/Spinner';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import DialogForm from '@/components/ui/forms/DialogForm';
import FormSection from '@/components/ui/forms/FormSection';
import FormField from '@/components/ui/forms/FormField';
import FormActions from '@/components/ui/forms/FormActions';
import type { Staff } from '@/core/types';
import type { Payslip, PayrollPeriod } from '@/modules/hr/data/types';
import { logger } from '@/utils/logging';

interface GeneratePayslipFormData {
  staff_id: number | null;
  period_id: number | null;
  payment_date: string;
  notes: string;
}

export const PayslipsPageContent: React.FC = () => {
  const { t } = useTranslation('hr');
  const { payslips, loading: appDataLoading, refreshCollection } = useAppData();
  const { staff } = useAppData();
  const { payrollPeriods } = useAppData();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPayslip, setSelectedPayslip] = useState<Payslip | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [formData, setFormData] = useState<GeneratePayslipFormData>({
    staff_id: null,
    period_id: null,
    payment_date: new Date().toISOString().split('T')[0],
    notes: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const openModal = useCallback(() => {
    setFormData({
      staff_id: null,
      period_id: null,
      payment_date: new Date().toISOString().split('T')[0],
      notes: '',
    });
    setFormErrors({});
    setIsModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setFormData({
      staff_id: null,
      period_id: null,
      payment_date: new Date().toISOString().split('T')[0],
      notes: '',
    });
    setFormErrors({});
  }, []);

  const openViewModal = useCallback((payslip: Payslip) => {
    setSelectedPayslip(payslip);
    setIsViewModalOpen(true);
  }, []);

  const closeViewModal = useCallback(() => {
    setIsViewModalOpen(false);
    setSelectedPayslip(null);
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : 
                name === 'staff_id' || name === 'period_id' ? (value ? parseInt(value) : null) : value;
    setFormData(prev => ({ ...prev, [name]: val }));
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: '' }));
    }
  }, [formErrors]);

  const validateForm = useCallback((): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.staff_id) {
      errors.staff_id = t('payslips.validation.staffRequired') || 'Staff member is required';
    }
    if (!formData.period_id) {
      errors.period_id = t('payslips.validation.periodRequired') || 'Payroll period is required';
    }
    if (!formData.payment_date) {
      errors.payment_date = t('payslips.validation.paymentDateRequired') || 'Payment date is required';
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
      const collection = db.getCollection<Payslip>('payslips');
      
      const timestamp = new Date().toISOString();
      const newId = Date.now();

      // For now, create a basic payslip structure
      await collection?.insert({
        id: newId,
        staff_id: formData.staff_id!,
        period_id: formData.period_id!,
        basic_salary: 0,
        total_earnings: 0,
        total_deductions: 0,
        net_salary: 0,
        payment_date: new Date(formData.payment_date!).toISOString(),
        status: 'generated',
        earnings_details: [],
        deductions_details: [],
        notes: formData.notes,
        created_at: timestamp,
        updated_at: timestamp,
      });

      await refreshCollection('payslips');
      closeModal();
    } catch (error) {
      logger.error('Error generating payslip:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, refreshCollection, closeModal, validateForm]);

  const getStaffName = (staffId: number) => {
    const staffMember = (staff as Staff[] | undefined)?.find(s => s.id === staffId);
    return staffMember?.first_name && staffMember?.last_name 
      ? [staffMember.first_name, staffMember.last_name].filter(Boolean).join(' ')
      : staffMember?.username || `Staff #${staffId}`;
  };

  const getPeriodName = (periodId: number) => {
    const period = (payrollPeriods as PayrollPeriod[] | undefined)?.find(p => p.id === periodId);
    return period?.name || `Period #${periodId}`;
  };

  const columns = [
    { header: t('tableHeaders.id'), key: 'id' as keyof Payslip },
    { 
      header: t('tableHeaders.staff'), 
      key: 'staff_id' as keyof Payslip,
      render: (value: number) => getStaffName(value)
    },
    { 
      header: t('tableHeaders.period'), 
      key: 'period_id' as keyof Payslip,
      render: (value: number) => getPeriodName(value)
    },
    { 
      header: t('tableHeaders.netSalary'), 
      key: 'net_salary' as keyof Payslip,
      render: (value: number) => value?.toLocaleString() || '0'
    },
    { 
      header: t('tableHeaders.paymentDate'), 
      key: 'payment_date' as keyof Payslip,
      render: (value: string) => value ? new Date(value).toLocaleDateString() : '-'
    },
    { header: t('tableHeaders.status'), key: 'status' as keyof Payslip },
    {
      header: t('tableHeaders.actions'),
      key: 'id' as keyof Payslip,
      render: (_: any, item: Payslip) => (
        <Button size="sm" variant="ghost" onClick={() => openViewModal(item)} leftIcon={<EyeIcon className="w-4 h-4" />}>
          {t('common:view')}
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <Card
        title={t('payslips.title')}
        actions={
          <Button onClick={openModal} leftIcon={<PlusIcon className="w-5 h-5" />}>
            {t('payslips.generateButton')}
          </Button>
        }
      >
        <p className="text-sm text-gray-600 mb-4">{t('payslips.description')}</p>
        {appDataLoading.payslips ? (
          <div className="flex justify-center py-8">
            <Spinner />
          </div>
        ) : (
          <DataGrid
            columns={columns}
            data={payslips || []}
            emptyState={t('payslips.noPayslips') || 'No payslips found'}
          />
        )}
      </Card>

      <DialogForm
        isOpen={isModalOpen}
        onClose={closeModal}
        title={t('payslips.generateTitle')}
        onSubmit={handleSubmit}
        loading={isSubmitting}
      >
        <FormSection title={t('payslips.formSection.title')}>
          <FormField label={t('fields.staff')} required error={formErrors.staff_id}>
            <select
              name="staff_id"
              value={formData.staff_id || ''}
              onChange={handleInputChange}
              disabled={isSubmitting}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">{t('fields.selectStaff')}</option>
              {(staff as Staff[] || []).map(s => (
                <option key={s.id} value={s.id}>
                  {s.first_name} {s.last_name} - {s.username}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label={t('fields.payrollPeriod')} required error={formErrors.period_id}>
            <select
              name="period_id"
              value={formData.period_id || ''}
              onChange={handleInputChange}
              disabled={isSubmitting}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">{t('fields.selectPeriod')}</option>
              {(payrollPeriods as PayrollPeriod[] || []).map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </FormField>
          <FormField label={t('fields.paymentDate')} required error={formErrors.payment_date}>
            <Input
              type="date"
              name="payment_date"
              value={formData.payment_date || ''}
              onChange={handleInputChange}
              disabled={isSubmitting}
            />
          </FormField>
          <FormField label={t('fields.notes')}>
            <textarea
              name="notes"
              value={formData.notes || ''}
              onChange={handleInputChange}
              disabled={isSubmitting}
              placeholder={t('fields.notesPlaceholder')}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </FormField>
        </FormSection>
        <FormActions>
          <Button variant="secondary" onClick={closeModal} disabled={isSubmitting}>
            {t('common:cancel')}
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? <Spinner size="sm" /> : t('payslips.generate')}
          </Button>
        </FormActions>
      </DialogForm>

      <DialogForm
        isOpen={isViewModalOpen}
        onClose={closeViewModal}
        title={t('payslips.viewTitle')}
        size="lg"
      >
        {selectedPayslip && (
          <FormSection title={t('payslips.viewSection.details')}>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-sm text-gray-500">{t('fields.staff')}:</span>
                <p className="font-medium">{getStaffName(selectedPayslip.staff_id)}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">{t('fields.payrollPeriod')}:</span>
                <p className="font-medium">{getPeriodName(selectedPayslip.period_id)}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">{t('fields.paymentDate')}:</span>
                <p className="font-medium">
                  {selectedPayslip.payment_date ? new Date(selectedPayslip.payment_date).toLocaleDateString() : '-'}
                </p>
              </div>
              <div>
                <span className="text-sm text-gray-500">{t('fields.status')}:</span>
                <p className="font-medium">{selectedPayslip.status}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">{t('fields.basicSalary')}:</span>
                <p className="font-medium">{selectedPayslip.basic_salary?.toLocaleString() || '0'}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">{t('fields.totalEarnings')}:</span>
                <p className="font-medium text-green-600">{selectedPayslip.total_earnings?.toLocaleString() || '0'}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">{t('fields.totalDeductions')}:</span>
                <p className="font-medium text-red-600">{selectedPayslip.total_deductions?.toLocaleString() || '0'}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">{t('fields.netSalary')}:</span>
                <p className="font-medium text-primary-600">{selectedPayslip.net_salary?.toLocaleString() || '0'}</p>
              </div>
            </div>
            {selectedPayslip.notes && (
              <div className="mt-4">
                <span className="text-sm text-gray-500">{t('fields.notes')}:</span>
                <p className="mt-1">{selectedPayslip.notes}</p>
              </div>
            )}
          </FormSection>
        )}
        <FormActions>
          <Button variant="secondary" onClick={closeViewModal}>
            {t('common:close')}
          </Button>
        </FormActions>
      </DialogForm>
    </div>
  );
};

const PayslipsPage: React.FC = () => (
  <div className="space-y-6">
    <PayslipsPageContent />
  </div>
);

export default PayslipsPage;
