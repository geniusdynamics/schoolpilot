import React, { useState } from 'react';
import { TimetablePeriodDef } from '@/core/types'; // Use core type (shared across modules)
import Card from '@/components/ui/Card';
import Table from '@/components/ui/Table';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import { PlusIcon, EditIcon, DeleteIcon, ClockIcon } from '@/components/ui/icons';
import { useTimetablePeriodDefData } from '../data/useTimetablePeriodDefData'; // Use module-specific hook
import Spinner from '@/components/ui/Spinner';
import { useTranslation } from 'react-i18next';

type TimetablePeriodFormData = Omit<Partial<TimetablePeriodDef>, 'id'>;

const TimetablePeriodsPage: React.FC = () => {
  const {
    data: timetablePeriodDefs,
    create,
    update,
    remove
  } = useTimetablePeriodDefData(); // Use module-specific hook
  
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

  const handleSubmit = async () => {
    if (!formData.period_name || !formData.start_time || !formData.end_time) {
      alert("All fields are required.");
      return;
    }
    if (formData.start_time >= formData.end_time) {
        alert("End time must be after start time.");
        return;
    }

    const payload: TimetablePeriodDef = {
      id: editingPeriod?.id || Date.now(), // Generate ID for new items
      period_name: formData.period_name!,
      start_time: formData.start_time!,
      end_time: formData.end_time!,
    };

    if (editingPeriod) {
      update(editingPeriod.id, payload);
    } else {
      create(payload);
    }
    closeModal();
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this timetable period?')) {
      remove(id);
    }
  };

  const columns = [
    { header: 'ID', accessor: 'id' as keyof TimetablePeriodDef },
    { header: 'Period Name', accessor: 'period_name' as keyof TimetablePeriodDef },
    { header: 'Start Time', accessor: 'start_time' as keyof TimetablePeriodDef },
    { header: 'End Time', accessor: 'end_time' as keyof TimetablePeriodDef },
    {
      header: 'Actions',
      accessor: 'id' as keyof TimetablePeriodDef,
      render: (item: TimetablePeriodDef) => (
        <div className="space-x-2">
          <Button size="sm" variant="ghost" onClick={() => openModal(item)} leftIcon={<EditIcon className="w-4 h-4" />}>Edit</Button>
          <Button size="sm" variant="danger" onClick={() => handleDelete(item.id)} leftIcon={<DeleteIcon className="w-4 h-4" />}>Delete</Button>
        </div>
      ),
    },
  ];

  // Module-specific hooks don't have loading states like global context
  // Remove loading check since data is immediately available

  return (
    <div className="space-y-6">
      <Card title="Timetable Periods Definition" actions={
        <Button onClick={() => openModal()} leftIcon={<PlusIcon className="w-5 h-5" />}>
          Add Period
        </Button>
      }>
        <p className="text-sm text-gray-600 mb-4">
          Define standard lesson periods for the school day (e.g., Lesson 1, Break) along with their start and end times.
        </p>
        <Table columns={columns} data={timetablePeriodDefs} />
      </Card>

      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingPeriod ? 'Edit Timetable Period' : 'Add New Timetable Period'}
        footer={
          <>
            <Button variant="secondary" onClick={closeModal}>Cancel</Button>
            <Button onClick={handleSubmit}>
              {editingPeriod ? 'Save Changes' : 'Add Period'}
            </Button>
          </>
        }
      >
        <Input 
          name="period_name" 
          label="Period Name" 
          value={formData.period_name || ''} 
          onChange={handleInputChange} 
          required 
        />
        <Input 
          name="start_time" 
          label="Start Time" 
          type="time"
          value={formData.start_time || ''} 
          onChange={handleInputChange} 
          required 
        />
        <Input 
          name="end_time" 
          label="End Time" 
          type="time"
          value={formData.end_time || ''} 
          onChange={handleInputChange} 
          required 
        />
      </Modal>
    </div>
  );
};

export default TimetablePeriodsPage;
