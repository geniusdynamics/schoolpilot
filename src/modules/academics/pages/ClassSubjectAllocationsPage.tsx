// ABOUTME: Class-subject allocations page — which subjects each class stream takes in an academic year.
// ABOUTME: CRUD goes through the academics module context with string ids; names are resolved at read time.

import React, { useCallback, useMemo, useState } from 'react';

import Card from '@/components/ui/Card';
import { DataGrid, DataGridColumn } from '@/components/ui/data';
import Button from '@/components/ui/Button';
import DialogForm from '@/components/ui/forms/DialogForm';
import FormSection from '@/components/ui/forms/FormSection';
import FormField from '@/components/ui/forms/FormField';
import FormActions from '@/components/ui/forms/FormActions';
import Select from '@/components/ui/Select';

import { useTranslation } from 'react-i18next';
import { logger } from '@/utils/logging';
import { useAcademicDataContext } from '../data/AcademicDataContext';
import { useAdministrationDataContext } from '@/modules/administration/data/AdministrationDataContext';
import { DeleteIcon, EditIcon, PlusIcon } from '@/components/ui/icons';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/hooks/useToast';

type Id = string | number;

/** An allocation row as shown in the grid; ids are strings and names are resolved from the referenced records. */
interface AllocationRow {
  id: string;
  class_stream_id: string;
  subject_id: string;
  academic_year_id: string;
  class_stream_name: string;
  subject_name: string;
  academic_year_name: string;
}

interface AllocationFormData {
  class_stream_id?: string;
  subject_id?: string;
  academic_year_id?: string;
}

interface Named { id: Id; name?: string | null }
interface StreamRecord extends Named { class_id?: Id | null; class_name?: string | null }
interface SubjectRecord extends Named { subject_code?: string | null }
interface StoredAllocation {
  id: Id;
  class_stream_id?: Id | null;
  subject_id?: Id | null;
  academic_year_id?: Id | null;
  class_stream_name?: string | null;
  subject_name?: string | null;
  academic_year_name?: string | null;
}

const idOf = (value: Id | null | undefined): string => (value == null ? '' : String(value));

export const ClassSubjectAllocationsContent: React.FC = () => {
  const { t } = useTranslation(['academics', 'common']);
  const academic = useAcademicDataContext();
  const admin = useAdministrationDataContext();
  const { addClassSubjectAllocation, updateClassSubjectAllocation, deleteClassSubjectAllocation } = academic;
  const [isSaving, setIsSaving] = useState(false);

  const classStreams = admin.classStreams as unknown as StreamRecord[];
  const classes = admin.classes as unknown as Named[];
  const subjects = academic.subjects as SubjectRecord[];
  const academicYears = academic.academicYears as unknown as Named[];

  const streamLabel = useCallback((stream: StreamRecord) => {
    const className = classes.find(c => idOf(c.id) === idOf(stream.class_id))?.name ?? stream.class_name;
    return className ? `${className} - ${stream.name ?? ''}` : (stream.name ?? '');
  }, [classes]);

  const classSubjectAllocations = useMemo<AllocationRow[]>(() =>
    (academic.classSubjectAllocations as unknown as StoredAllocation[]).map(alloc => {
      const stream = classStreams.find(cs => idOf(cs.id) === idOf(alloc.class_stream_id));
      return {
        id: idOf(alloc.id),
        class_stream_id: idOf(alloc.class_stream_id),
        subject_id: idOf(alloc.subject_id),
        academic_year_id: idOf(alloc.academic_year_id),
        class_stream_name: (stream ? streamLabel(stream) : alloc.class_stream_name) ?? '',
        subject_name: subjects.find(s => idOf(s.id) === idOf(alloc.subject_id))?.name ?? alloc.subject_name ?? '',
        academic_year_name: academicYears.find(ay => idOf(ay.id) === idOf(alloc.academic_year_id))?.name ?? alloc.academic_year_name ?? '',
      };
    }), [academic.classSubjectAllocations, classStreams, streamLabel, subjects, academicYears]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAllocation, setEditingAllocation] = useState<AllocationRow | null>(null);
  
  const initialFormData: AllocationFormData = { 
    class_stream_id: undefined, 
    subject_id: undefined,
    academic_year_id: undefined,
  };
  const [formData, setFormData] = useState<AllocationFormData>(initialFormData);

  const openModal = (allocation?: AllocationRow) => {
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
    setFormData(prev => ({ ...prev, [name]: value || undefined }));
  };

  const handleSubmit = async () => {
    if (!formData.class_stream_id || !formData.subject_id || !formData.academic_year_id) {
      toast.showWarning(t('validation.classStreamSubjectAcademicYearRequired'));
      return;
    }

    const isDuplicate = classSubjectAllocations.some(
        alloc => alloc.id !== editingAllocation?.id &&
                 alloc.class_stream_id === formData.class_stream_id &&
                 alloc.subject_id === formData.subject_id &&
                 alloc.academic_year_id === formData.academic_year_id
    );

    if (isDuplicate) {
        toast.showError(t('validation.subjectAlreadyAllocated'));
        return;
    }

    const payload = {
        class_stream_id: formData.class_stream_id,
        subject_id: formData.subject_id,
        academic_year_id: formData.academic_year_id,
    };

    setIsSaving(true);
    try {
      if (editingAllocation) {
        await updateClassSubjectAllocation(editingAllocation.id, payload as never);
      } else {
        await addClassSubjectAllocation(payload as never);
      }
      closeModal();
    } catch (error) {
      logger.error('Error saving allocation:', error);
      toast.showError('Error saving allocation');
    } finally {
      setIsSaving(false);
    }
  };

  const confirm = useConfirm();
  const toast = useToast();
  const handleDelete = async (id: string) => {
    if ((await confirm({ variant: 'danger', message: 'Are you sure you want to delete this subject allocation?' }))) {
      try {
        await deleteClassSubjectAllocation(id);
      } catch (error) {
        logger.error('Error deleting allocation:', error);
        toast.showError('Error deleting allocation');
      }
    }
  };

  const columns: DataGridColumn<AllocationRow>[] = [
    { header: 'ID', key: 'id', sortable: true },
    { header: 'Class Stream', key: 'class_stream_name', sortable: true, filterable: true, render: (_v: any, item: AllocationRow) => <span className="truncate block max-w-[220px]" title={item.class_stream_name || ''}>{item.class_stream_name || '—'}</span> },
    { header: 'Subject', key: 'subject_name', sortable: true, filterable: true, render: (_v: any, item: AllocationRow) => <span className="truncate block max-w-[240px]" title={item.subject_name || ''}>{item.subject_name || '—'}</span> },
    { header: 'Academic Year', key: 'academic_year_name', sortable: true },
    {
      header: 'Actions',
      key: 'actions',
      sticky: 'right',
      sortable: false,
      filterable: false,
      render: (_value: any, item: AllocationRow) => (
        <div className="flex items-center gap-1">
          <Button size="sm" variant="ghost" onClick={() => openModal(item)} leftIcon={<EditIcon className="w-4 h-4" />}>Edit</Button>
          <Button size="sm" variant="danger" onClick={() => handleDelete(item.id)} leftIcon={<DeleteIcon className="w-4 h-4" />}>Delete</Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <Card title={t('classSubjectAllocations.title')} bodyClassName="p-0" actions={
        <Button onClick={() => openModal()} leftIcon={<PlusIcon className="w-5 h-5" />}>{t('classSubjectAllocations.addButton')}</Button>
      }>
        <div className="p-4 sm:p-6 pb-3 text-sm text-surface-muted-fg border-b border-surface-border">
          Assign subjects to specific class streams for a given academic year.
        </div>
        <DataGrid columns={columns} data={classSubjectAllocations} sortable filterable />
      </Card>

      <DialogForm open={isModalOpen} onClose={closeModal} title={editingAllocation ? t('classSubjectAllocations.modalEditTitle') : t('classSubjectAllocations.modalAddTitle')} size="lg"
        actions={
          <FormActions>
            <Button variant="secondary" onClick={closeModal}>{t('common:cancel')}</Button>
            <Button onClick={handleSubmit} loading={isSaving}>
              {t('common:save')}
            </Button>
          </FormActions>
        }
      >
        <FormSection>
          <FormField label={t('classSubjectAllocations.classStreamLabel')}>
            <Select 
              name="class_stream_id" 
              value={formData.class_stream_id ?? ''}
              onChange={handleInputChange}
              required
            >
              <option value="">{t('classSubjectAllocations.selectClassStreamOption')}</option>
              {classStreams.map(cs => (
                <option key={cs.id} value={idOf(cs.id)}>{streamLabel(cs)}</option>
              ))}
            </Select>
          </FormField>
          <FormField label={t('classSubjectAllocations.subjectLabel')}>
            <Select 
              name="subject_id" 
              value={formData.subject_id ?? ''}
              onChange={handleInputChange}
              required
            >
              <option value="">{t('classSubjectAllocations.selectSubjectOption')}</option>
              {subjects.map(subject => (
                <option key={subject.id} value={idOf(subject.id)}>{subject.name} ({subject.subject_code})</option>
              ))}
            </Select>
          </FormField>
          <FormField label={t('classSubjectAllocations.academicYearLabel')}>
            <Select 
              name="academic_year_id" 
              value={formData.academic_year_id ?? ''}
              onChange={handleInputChange}
              required
            >
              <option value="">{t('classSubjectAllocations.selectAcademicYearOption')}</option>
              {academicYears.map(ay => (
                <option key={ay.id} value={idOf(ay.id)}>{ay.name}</option>
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
