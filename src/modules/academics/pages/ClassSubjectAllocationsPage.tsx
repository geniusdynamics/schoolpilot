import React, { useState } from 'react';
import { ClassStream, AcademicYear } from '@/types';

import Card from '@/components/ui/Card';
import { DataGrid, DataGridColumn } from '@/components/ui/data';
import Button from '@/components/ui/Button';
import DialogForm from '@/components/ui/forms/DialogForm';
import FormSection from '@/components/ui/forms/FormSection';
import FormField from '@/components/ui/forms/FormField';
import FormActions from '@/components/ui/forms/FormActions';
import Select from '@/components/ui/Select';

import { useAppData } from '@/hooks/useAppData'; // Updated
import Spinner from '@/components/ui/Spinner';
import { useTranslation } from 'react-i18next';
import { Subject as CoreSubject } from '@/core/types';
import { logger } from '@/utils/logging';
import type { ClassSubjectAllocation } from '@/core/types';
import { DeleteIcon, EditIcon, PlusIcon } from '@/components/ui/icons';
import { useConfirm } from '@/components/ui/ConfirmDialog';

type AllocationFormData = Omit<Partial<ClassSubjectAllocation>, 'id' | 'class_stream_name' | 'subject_name' | 'academic_year_name'>;

export const ClassSubjectAllocationsContent: React.FC = () => {
  const { t } = useTranslation(['academics', 'common']);
  const { 
    classSubjectAllocations, 
    classStreams,
    subjects,
    academicYears,
    loading,
    addClassSubjectAllocation, 
    updateClassSubjectAllocation, 
    deleteClassSubjectAllocation 
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
      await updateClassSubjectAllocation(String(editingAllocation.id), payload);
    } else {
      await addClassSubjectAllocation(payload);
    }
    closeModal();
  };

  const confirm = useConfirm();
  const handleDelete = async (id: string) => {
    if ((await confirm({ variant: 'danger', message: 'Are you sure you want to delete this subject allocation?' }))) {
      try {
        await deleteClassSubjectAllocation(id);
      } catch (error) {
        logger.error('Error deleting allocation:', error);
        alert('Error deleting allocation');
      }
    }
  };

  const columns: DataGridColumn<ClassSubjectAllocation>[] = [
    { header: 'ID', key: 'id', sortable: true },
    { header: 'Class Stream', key: 'class_stream_name', sortable: true, filterable: true, render: (_v: any, item: ClassSubjectAllocation) => <span className="truncate block max-w-[220px]" title={item.class_stream_name || ''}>{item.class_stream_name || '—'}</span> },
    { header: 'Subject', key: 'subject_name', sortable: true, filterable: true, render: (_v: any, item: ClassSubjectAllocation) => <span className="truncate block max-w-[240px]" title={item.subject_name || ''}>{item.subject_name || '—'}</span> },
    { header: 'Academic Year', key: 'academic_year_name', sortable: true },
    {
      header: 'Actions',
      key: 'actions',
      sticky: 'right',
      sortable: false,
      filterable: false,
      render: (_value: any, item: ClassSubjectAllocation) => (
        <div className="flex items-center gap-1">
          <Button size="sm" variant="ghost" onClick={() => openModal(item)} leftIcon={<EditIcon className="w-4 h-4" />}>Edit</Button>
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
      <Card title={t('classSubjectAllocations.title')} bodyClassName="p-0" actions={
        <Button onClick={() => openModal()} leftIcon={<PlusIcon className="w-5 h-5" />}>{t('classSubjectAllocations.addButton')}</Button>
      }>
        <div className="p-4 sm:p-6 pb-3 text-sm text-gray-600 border-b border-gray-200">
          Assign subjects to specific class streams for a given academic year.
        </div>
        <DataGrid columns={columns} data={classSubjectAllocations || []} loading={loading.classSubjectAllocations} sortable filterable />
      </Card>

      <DialogForm open={isModalOpen} onClose={closeModal} title={editingAllocation ? t('classSubjectAllocations.modalEditTitle') : t('classSubjectAllocations.modalAddTitle')} size="lg"
        actions={
          <FormActions>
            <Button variant="secondary" onClick={closeModal}>{t('common:cancel')}</Button>
            <Button onClick={handleSubmit} disabled={loading.classSubjectAllocations}>
              {loading.classSubjectAllocations ? <Spinner size="sm"/> : t('common:save')}
            </Button>
          </FormActions>
        }
      >
        <FormSection>
          <FormField label={t('classSubjectAllocations.classStreamLabel')}>
            <Select 
              name="class_stream_id" 
              value={formData.class_stream_id != null ? String(formData.class_stream_id) : ''} 
              onChange={handleInputChange}
              required
            >
              <option value="">{t('classSubjectAllocations.selectClassStreamOption')}</option>
              {(classStreams || []).map((cs: ClassStream) => (
                <option key={cs.id} value={cs.id}>{cs.name}</option>
              ))}
            </Select>
          </FormField>
          <FormField label={t('classSubjectAllocations.subjectLabel')}>
            <Select 
              name="subject_id" 
              value={formData.subject_id != null ? String(formData.subject_id) : ''} 
              onChange={handleInputChange}
              required
            >
              <option value="">{t('classSubjectAllocations.selectSubjectOption')}</option>
              {(subjects || []).map((subject: CoreSubject) => (
                <option key={subject.id} value={subject.id}>{subject.name} ({subject.subject_code})</option>
              ))}
            </Select>
          </FormField>
          <FormField label={t('classSubjectAllocations.academicYearLabel')}>
            <Select 
              name="academic_year_id" 
              value={formData.academic_year_id != null ? String(formData.academic_year_id) : ''} 
              onChange={handleInputChange}
              required
            >
              <option value="">{t('classSubjectAllocations.selectAcademicYearOption')}</option>
              {(academicYears || []).map((ay: AcademicYear) => (
                <option key={ay.id} value={ay.id}>{ay.name}</option>
              ))}
            </Select>
          </FormField>
        </FormSection>
      </DialogForm>
    </div>
  );
};

const ClassSubjectAllocationsPage: React.FC = () => {
  return <ClassSubjectAllocationsContent />;
};

export default ClassSubjectAllocationsPage;
