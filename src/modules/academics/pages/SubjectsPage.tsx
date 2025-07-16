import React, { useState } from 'react';
import { Subject, SubjectGrouping } from '@/core/types';
import { useTranslation } from 'react-i18next';
import { useAppData } from '@/contexts/AppDataContext'; 
import Spinner from '@/components/ui/Spinner';

import Card from '@/components/ui/Card';
import Table from '@/components/ui/Table';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { PlusIcon, EditIcon, DeleteIcon } from '@/components/ui/icons';

interface SubjectFormData extends Omit<Partial<Subject>, 'id' | 'department_name' | 'papers'> {
  department_id?: string | null;
}

const SubjectsPage: React.FC = () => {
  const { subjects: subjectsState, loading, rawInitialData } = useAppData();
  const { initialMockDepartments } = rawInitialData;
  const { t } = useTranslation('academics');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const initialFormData: SubjectFormData = { subject_code: '', abbreviation: '', name: '', grouping: SubjectGrouping.OTHER, is_compulsory: false };
  const [formData, setFormData] = useState<SubjectFormData>({});


  const openModal = (subject?: Subject) => {
    setEditingSubject(subject || null);
    setFormData(subject ? 
        { 
            subject_code: subject.subject_code, 
            abbreviation: subject.abbreviation, 
            name: subject.name, 
            department_id: subject.department_id, 
            is_compulsory: subject.is_compulsory, 
            grouping: subject.grouping 
        } : 
        initialFormData);
    setIsModalOpen(true);
  };
  const closeModal = () => {
    setIsModalOpen(false);
    setEditingSubject(null);
    setFormData(initialFormData);
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    let processedValue: string | boolean | number | undefined = value;

    if (type === 'checkbox' && 'checked' in e.target) {
        processedValue = (e.target as HTMLInputElement).checked;
    } else if (name === 'department_id') {
        processedValue = value ? parseInt(value, 10) : undefined;
        if (Number.isNaN(processedValue as number)) processedValue = undefined;
    }
    
    setFormData(prev => ({ ...prev, [name]: processedValue }));
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.subject_code || !formData.abbreviation || !formData.grouping) {
        alert(t('validation.nameCodeAbbreviationAndGroupingAreRequired'));
        return;
    }
    
    const payload: Omit<Subject, 'id' | 'department_name' | 'papers'> = {
        subject_code: formData.subject_code!,
        abbreviation: formData.abbreviation!,
        name: formData.name!,
        department_id: formData.department_id,
        is_compulsory: formData.is_compulsory || false,
        grouping: formData.grouping!,
    };

    if (editingSubject) {
        // Placeholder for updateSubject
    } else {
        // Placeholder for addSubject
    }
    closeModal();
  };

  const handleDelete = async (subjectId: number) => {
    if (window.confirm('Are you sure you want to delete this subject?')) {
        // Placeholder for deleteSubject
    }
  };


  const columns: Array<{ header: string; accessor: keyof Subject | ((item: Subject) => React.ReactNode); render?: (item: Subject) => React.ReactNode }> = [
    { header: t('subjects.code'), accessor: 'subject_code' },
    { header: t('subjects.abbreviation'), accessor: 'abbreviation' },
    { header: t('subjects.name'), accessor: 'name' },
    { header: t('subjects.department'), accessor: 'department_name' },
    { header: t('subjects.grouping'), accessor: 'grouping' },
    { header: t('subjects.isCompulsory'), accessor: 'is_compulsory', render: (item: Subject) => item.is_compulsory ? t('common:yes') : t('common:no') },
    {
      header: t('common:actions'),
      accessor: 'id',
      render: (item: Subject) => (
        <div className="space-x-2">
          <Button size="sm" variant="ghost" onClick={() => openModal(item)} leftIcon={<EditIcon className="w-4 h-4" />}>{t('common:edit')}</Button>
          <Button size="sm" variant="danger" onClick={() => handleDelete(item.id)} leftIcon={<DeleteIcon className="w-4 h-4" />}>{t('common:delete')}</Button>
        </div>
      ),
    },
  ];
  
  if ((loading.subjects || loading.departments) && !isModalOpen) {
     return <div className="flex justify-center items-center h-full"> <Spinner size="lg" /> </div>;
  }

  return (
    <div className="space-y-6">
      <Card title={t('subjects.management')} actions={
          <Button onClick={() => openModal()} leftIcon={<PlusIcon className="w-5 h-5" />}>Add Subject</Button>
      }>
        <Table columns={columns} data={subjectsState || []} isLoading={loading.subjects && isModalOpen} />
      </Card>

      <Modal isOpen={isModalOpen} onClose={closeModal} title={t(editingSubject ? 'subjects.edit' : 'subjects.addNew')} size="lg"
        footer={<><Button variant="secondary" onClick={closeModal}>Cancel</Button><Button onClick={handleSubmit} disabled={loading.subjects}>{loading.subjects ? <Spinner size="sm" /> : 'Save'}</Button></>}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input name="subject_code" label={t('subjects.code')} value={formData.subject_code || ''} onChange={handleInputChange} required />
            <Input name="abbreviation" label={t('subjects.abbreviation')} value={formData.abbreviation || ''} onChange={handleInputChange} required />
            <Input name="name" label={t('subjects.name')} value={formData.name || ''} onChange={handleInputChange} className="md:col-span-2" required />
            <Select name="department_id" label={t('subjects.department')} value={formData.department_id ?? ''} onChange={handleInputChange}>
                <option value="">Select Department</option>
                {(initialMockDepartments || []).filter((d: { is_academic: boolean }) => d.is_academic).map((dep: { id: string; name: string }) => <option key={dep.id} value={dep.id}>{dep.name}</option>)}
            </Select>
            <Select name="grouping" label={t('subjects.grouping')} value={formData.grouping || SubjectGrouping.OTHER} onChange={handleInputChange} required>
                {Object.values(SubjectGrouping).map(group => <option key={group} value={group}>{group}</option>)}
            </Select>
            <div className="flex items-center mt-2 md:col-span-2">
                <input id="is_compulsory" name="is_compulsory" type="checkbox" className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500" 
                    checked={formData.is_compulsory || false} onChange={handleInputChange} />
                <label htmlFor="is_compulsory" className="ml-2 block text-sm text-gray-900">{t('subjects.isCompulsory')}</label>
            </div>
        </div>
      </Modal>
    </div>
  );
};

export default SubjectsPage;
