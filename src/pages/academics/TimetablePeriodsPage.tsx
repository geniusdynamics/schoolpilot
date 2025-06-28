
import React, { useState } from 'react';
import { TimetablePeriodDef } from '../../modules/academics/data/types'; // Corrected import
import Card from '../../components/ui/Card';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import { PlusIcon, EditIcon, DeleteIcon, ClockIcon } from '../../components/ui/icons';
import { useAppData } from '@/contexts/AppDataContext'; // Updated
import Spinner from '../../components/ui/Spinner';

type TimetablePeriodFormData = Omit<Partial<TimetablePeriodDef>, 'id'>;

const TimetablePeriodsPage: React.FC = () => {
  const { 
    timetablePeriodDefs, 
    loading, 
    addTimetablePeriodDef, 
    updateTimetablePeriodDef, 
    deleteTimetablePeriodDef 
  } = useAppData(); // Updated
  
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

    const payload: Omit<TimetablePeriodDef, 'id'> = {
      period_name: formData.period_name!,
      start_time: formData.start_time!,
      end_time: formData.end_time!,
    };

    if (editingPeriod) {
      await updateTimetablePeriodDef({ ...editingPeriod, ...payload });
    } else {
      await addTimetablePeriodDef(payload);
    }
    closeModal();
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this timetable period?')) {
      await deleteTimetablePeriodDef(id);
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

  if (loading.timetablePeriodDefs && !isModalOpen) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner size="lg" /> <span className="ml-2">Loading Timetable Periods...</span>
      </div>
    );
  }

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
        <Table columns={columns} data={timetablePeriodDefs} isLoading={loading.timetablePeriodDefs && isModalOpen} />
      </Card>

      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingPeriod ? 'Edit Timetable Period' : 'Add New Timetable Period'}
        footer={
          <>
            <Button variant="secondary" onClick={closeModal}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={loading.timetablePeriodDefs}>
              {loading.timetablePeriodDefs ? <Spinner size="sm"/> : (editingPeriod ? 'Save Changes' : 'Add Period')}
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
