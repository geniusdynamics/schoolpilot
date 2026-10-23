// GAP(P1-E02): the registry models a timetable slot per day, not a period definition, so the legacy collection stays.
import React, { useState } from 'react';
import { TimetablePeriodDef } from '@/core/types'; // Use core type (shared across modules)
import Card from '@/components/ui/Card';
import { DataGrid, DataGridColumn } from '@/components/ui/data';
import Button from '@/components/ui/Button';
import DialogForm from '@/components/ui/forms/DialogForm';
import FormSection from '@/components/ui/forms/FormSection';
import FormField from '@/components/ui/forms/FormField';
import FormActions from '@/components/ui/forms/FormActions';
import Input from '@/components/ui/Input';

import { useDatabaseCollection } from '@/hooks/useDatabaseCollection'; // Real database collection
import { useTranslation } from 'react-i18next';
import { DeleteIcon, EditIcon, PlusIcon } from '@/components/ui/icons';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/hooks/useToast';

type TimetablePeriodFormData = Omit<Partial<TimetablePeriodDef>, 'id'>;

export const TimetablePeriodsContent: React.FC = () => {
  const { t } = useTranslation('academics');
  const {
    data: timetablePeriodDefs,
    insert,
    update,
    remove
  } = useDatabaseCollection<TimetablePeriodDef>('timetable_period_definitions');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPeriod, setEditingPeriod] = useState<TimetablePeriodDef | null>(null);
  const initialFormData: TimetablePeriodFormData = { period_name: '', start_time: '08:00', end_time: '09:00' };
  const [formData, setFormData] = useState<TimetablePeriodFormData>(initialFormData);

  const openModal = (period?: TimetablePeriodDef) => {
    setEditingPeriod(period || null);
    setFormData(period ? 
      { period_name: period.period_name, start_time: period.start_time, end_time: period.end_time } : 
      initialFormData
    );
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingPeriod(null);
    setFormData(initialFormData);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const toast = useToast();
  const handleSubmit = async () => {
    if (!formData.period_name || !formData.start_time || !formData.end_time) {
      toast.showWarning(t('validation.allFieldsAreRequired'));
      return;
    }
    if (formData.start_time >= formData.end_time) {
        toast.showError(t('validation.endTimeMustBeAfterStartTime'));
        return;
    }

    const payload = {
      period_name: formData.period_name!,
      start_time: formData.start_time!,
      end_time: formData.end_time!,
    };

    try {
      if (editingPeriod) {
        await update(String(editingPeriod.id), payload);
        toast.showSuccess('Timetable period updated.');
      } else {
        await insert(payload);
        toast.showSuccess('Timetable period added.');
      }
    } catch {
      toast.showError('Failed to save timetable period.');
    }
    closeModal();
  };

  const confirm = useConfirm();
  const handleDelete = async (id: number) => {
    if ((await confirm({ variant: 'danger', message: 'Are you sure you want to delete this timetable period?' }))) {
      try {
        await remove(String(id));
        toast.showSuccess('Timetable period deleted.');
      } catch {
        toast.showError('Failed to delete timetable period.');
      }
    }
  };

  const columns: DataGridColumn<TimetablePeriodDef>[] = [
    { key: 'id', header: 'ID' },
    { key: 'period_name', header: 'Period Name' },
    { key: 'start_time', header: 'Start Time' },
    { key: 'end_time', header: 'End Time' },
    {
      key: 'actions',
      header: 'Actions',
      render: (_value: any, item: TimetablePeriodDef) => (
        <div className="space-x-2">
          <Button size="sm" variant="ghost" onClick={() => openModal(item)} leftIcon={<EditIcon className="w-4 h-4" />}>Edit</Button>
          <Button size="sm" variant="danger" onClick={() => handleDelete(item.id)} leftIcon={<DeleteIcon className="w-4 h-4" />}>Delete</Button>
        </div>
      ),
    },
  ];

  // Data and loading state come from the timetable_period_definitions collection

  return (
    <div className="space-y-3">
      <Card title="Timetable Periods Definition" info="Define standard lesson periods for the school day (e.g., Lesson 1, Break) along with their start and end times." actions={
        <Button onClick={() => openModal()} leftIcon={<PlusIcon className="w-5 h-5" />}>
          Add Period
        </Button>
      }>
        <DataGrid columns={columns} data={timetablePeriodDefs} />
      </Card>

      <DialogForm
        open={isModalOpen}
        onClose={closeModal}
        title={editingPeriod ? 'Edit Timetable Period' : 'Add New Timetable Period'}
        actions={
          <FormActions>
            <Button variant="secondary" onClick={closeModal}>Cancel</Button>
            <Button onClick={handleSubmit}>
              {editingPeriod ? 'Save Changes' : 'Add Period'}
            </Button>
          </FormActions>
        }
      >
        <FormSection>
          <FormField label="Period Name">
            <Input 
              name="period_name" 
              value={formData.period_name || ''} 
              onChange={handleInputChange} 
              required 
            />
          </FormField>
          <FormField label="Start Time">
            <Input 
              name="start_time" 
              type="time"
              value={formData.start_time || ''} 
              onChange={handleInputChange} 
              required 
            />
          </FormField>
          <FormField label="End Time">
            <Input 
              name="end_time" 
              type="time"
              value={formData.end_time || ''} 
              onChange={handleInputChange} 
              required 
            />
          </FormField>
        </FormSection>
      </DialogForm>
    </div>
  );
};

const TimetablePeriodsPage: React.FC = () => {
  return <TimetablePeriodsContent />;
};

export default TimetablePeriodsPage;
