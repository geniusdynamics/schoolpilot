import React, { useState, useMemo } from 'react';
import { ClassStream, AcademicYear } from '@/types';
import { ClassSubjectAllocation, Subject } from '@/modules/academics/data/types'; // Corrected imports
import Card from '@/components/ui/Card';
import { DataGrid, DataGridColumn } from '@/components/ui/data';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Select from '@/components/ui/Select';
import { PlusIcon, EditIcon, DeleteIcon, BookOpenIcon } from '@/components/ui/icons';
import { useAppData } from '@/contexts/AppDataContext'; // Updated
import Spinner from '@/components/ui/Spinner';
import { useTranslation } from 'react-i18next';
import { Subject as CoreSubject } from '@/core/types';

type AllocationFormData = Omit<Partial<ClassSubjectAllocation>, 'id' | 'class_stream_name' | 'subject_name' | 'academic_year_name'>;

const ClassSubjectAllocationsPage: React.FC = () => {
  const { t } = useTranslation(['academics', 'common']);
  const { 
    classSubjectAllocations, 
    classStreams,
    subjects,
    academicYears,
    loading
    // addClassSubjectAllocation, 
    // updateClassSubjectAllocation, 
    // deleteClassSubjectAllocation 
  } = useAppData(); // Updated
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAllocation, setEditingAllocation] = useState<ClassSubjectAllocation | null>(null);
  
  const initialFormData: AllocationFormData = { 
    class_stream_id: undefined, 
    subject_id: undefined,
    academic_year_id: undefined,
  };
  const [formData, setFormData] = useState<AllocationFormData>(initialFormData);

  const openModal = (allocation?: ClassSubjectAllocation) => {
    setEditingAllocation(allocation || null);
    setFormData(allocation ? 
      { 
        class_stream_id: allocation.class_stream_id, 
        subject_id: allocation.subject_id,
        academic_year_id: allocation.academic_year_id,
      } : 
      initialFormData
    );
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingAllocation(null);
    setFormData(initialFormData);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value ? parseInt(value) : undefined }));
  };

  const handleSubmit = async () => {
    if (!formData.class_stream_id || !formData.subject_id || !formData.academic_year_id) {
      alert(t('validation.classStreamSubjectAcademicYearRequired'));
      return;
    }

    const isDuplicate = (classSubjectAllocations || []).some(
        alloc => alloc.id !== editingAllocation?.id &&
                 alloc.class_stream_id === Number(formData.class_stream_id) &&
                 alloc.subject_id === Number(formData.subject_id) &&
                 alloc.academic_year_id === Number(formData.academic_year_id)
    );

    if (isDuplicate) {
        alert(t('validation.subjectAlreadyAllocated'));
        return;
    }

    const payload: Omit<ClassSubjectAllocation, 'id' | 'class_stream_name' | 'subject_name' | 'academic_year_name'> = { 
        class_stream_id: Number(formData.class_stream_id!), 
        subject_id: Number(formData.subject_id!),
        academic_year_id: Number(formData.academic_year_id!),
    };

    if (editingAllocation) {
      // await updateClassSubjectAllocation({ ...editingAllocation, ...payload });
    } else {
      // await addClassSubjectAllocation(payload);
    }
    closeModal();
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this subject allocation?')) {
      // await deleteClassSubjectAllocation(id);
    }
  };

  const columns: DataGridColumn<ClassSubjectAllocation>[] = [
    { header: 'ID', key: 'id' },
    { header: 'Class Stream', key: 'class_stream_name' },
    { header: 'Subject', key: 'subject_name' },
    { header: 'Academic Year', key: 'academic_year_name' },
    {
      header: 'Actions',
      key: 'id',
      render: (value: any, item: ClassSubjectAllocation) => (
        <div className="space-x-2">
          {/* <Button size="sm" variant="ghost" onClick={() => openModal(item)} leftIcon={<EditIcon className="w-4 h-4" />}>Edit</Button> */}
          <Button size="sm" variant="danger" onClick={() => handleDelete(item.id)} leftIcon={<DeleteIcon className="w-4 h-4" />}>Delete</Button>
        </div>
      ),
    },
  ];

  const isLoadingPage = loading.classSubjectAllocations || loading.classStreams || loading.subjects || loading.academicYears;

  if (isLoadingPage && !isModalOpen) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner size="lg" /> <span className="ml-2">Loading Class Subject Allocations...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card title={t('classSubjectAllocations.title')} actions={
        <Button onClick={() => openModal()} leftIcon={<PlusIcon className="w-5 h-5" />}>{t('classSubjectAllocations.addButton')}</Button>
      }>
        <p className="text-sm text-gray-600 mb-4">
          Assign subjects to specific class streams for a given academic year.
        </p>
        <DataGrid columns={columns} data={classSubjectAllocations} loading={loading.classSubjectAllocations} />
      </Card>

      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingAllocation ? t('classSubjectAllocations.modalEditTitle') : t('classSubjectAllocations.modalAddTitle')} size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={closeModal}>{t('common:cancel')}</Button>
            <Button onClick={handleSubmit} disabled={loading.classSubjectAllocations}>
              {loading.classSubjectAllocations ? <Spinner size="sm"/> : t('common:save')}
            </Button>
          </>
        }
      >
        <Select 
          name="class_stream_id" 
          label={t('classSubjectAllocations.classStreamLabel')} 
          value={formData.class_stream_id || ''} 
          onChange={handleInputChange}
          required
        >
          <option value="">{t('classSubjectAllocations.selectClassStreamOption')}</option>
          {(classStreams || []).map((cs: ClassStream) => (
            <option key={cs.id} value={cs.id}>{cs.name}</option>
          ))}
        </Select>
        <Select 
          name="subject_id" 
          label={t('classSubjectAllocations.subjectLabel')} 
          value={formData.subject_id || ''} 
          onChange={handleInputChange}
          required
        >
          <option value="">{t('classSubjectAllocations.selectSubjectOption')}</option>
          {(subjects || []).map((subject: CoreSubject) => (
            <option key={subject.id} value={subject.id}>{subject.name} ({subject.subject_code})</option>
          ))}
        </Select>
        <Select 
          name="academic_year_id" 
          label={t('classSubjectAllocations.academicYearLabel')} 
          value={formData.academic_year_id || ''} 
          onChange={handleInputChange}
          required
        >
          <option value="">{t('classSubjectAllocations.selectAcademicYearOption')}</option>
          {(academicYears || []).map((ay: AcademicYear) => (
            <option key={ay.id} value={ay.id}>{ay.name}</option>
          ))}
        </Select>
      </Modal>
    </div>
  );
};

export default ClassSubjectAllocationsPage;
