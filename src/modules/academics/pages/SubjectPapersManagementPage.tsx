import React, { useState } from 'react';
import { SubjectPaper, Subject } from '@/modules/academics/data/types'; // Corrected import
import Card from '@/components/ui/Card';
import { DataGrid, DataGridColumn } from '@/components/ui/data';
import Button from '@/components/ui/Button';
import DialogForm from '@/components/ui/forms/DialogForm';
import FormSection from '@/components/ui/forms/FormSection';
import FormField from '@/components/ui/forms/FormField';
import FormActions from '@/components/ui/forms/FormActions';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';

import { useAppData } from '@/hooks/useAppData'; // Updated
import Spinner from '@/components/ui/Spinner';
import { useTranslation } from 'react-i18next';
import { DeleteIcon, EditIcon, PlusIcon } from '@/components/ui/icons';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/hooks/useToast';

type SubjectPaperFormData = Omit<Partial<SubjectPaper>, 'id' | 'created_at' | 'updated_at' | 'subject_name'>;

export const SubjectPapersManagementContent: React.FC = () => {
  const { t } = useTranslation();
  const { 
    subjectPapers, 
    subjects, // Need subjects for the dropdown
    loading, 
    addSubjectPaper, 
    updateSubjectPaper, 
    deleteSubjectPaper 
  } = useAppData(); // Updated
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPaper, setEditingPaper] = useState<SubjectPaper | null>(null);
  const initialFormData: SubjectPaperFormData = { name: '', subject_id: undefined };
  const [formData, setFormData] = useState<SubjectPaperFormData>(initialFormData);

  const openModal = (paper?: SubjectPaper) => {
    setEditingPaper(paper || null);
    setFormData(paper ? 
      { name: paper.name, subject_id: paper.subject_id } : 
      initialFormData
    );
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingPaper(null);
    setFormData(initialFormData);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: name === 'subject_id' ? (value ? parseInt(value) : undefined) : value }));
  };

  const toast = useToast();
  const handleSubmit = async () => {
    if (!formData.name || !formData.subject_id) {
      toast.showWarning(t('validation.paperNameAndSubjectAreRequired'));
      return;
    }
    const payload = { 
        name: formData.name!, 
        subject_id: Number(formData.subject_id!)
    };

    if (editingPaper) {
      await updateSubjectPaper(String(editingPaper.id), payload);
    } else {
      await addSubjectPaper(payload);
    }
    closeModal();
  };

  const confirm = useConfirm();
  const handleDelete = async (id: number) => {
    if ((await confirm({ variant: 'danger', message: 'Are you sure you want to delete this subject paper? This might affect exam paper settings.' }))) {
      await deleteSubjectPaper(String(id));
    }
  };
  
  const columns: DataGridColumn<SubjectPaper>[] = [
    { key: 'id', header: 'ID' },
    { key: 'name', header: 'Paper Name' },
    { key: 'subject_name', header: 'Subject' }, // Resolved name
    { key: 'created_at', header: 'Created At', render: (_value: any, item: SubjectPaper) => new Date(item.created_at).toLocaleDateString() },
    {
      key: 'actions',
      header: 'Actions',
      render: (_value: any, item: SubjectPaper) => (
        <div className="space-x-2">
          <Button size="sm" variant="ghost" onClick={() => openModal(item)} leftIcon={<EditIcon className="w-4 h-4" />}>Edit</Button>
          <Button size="sm" variant="danger" onClick={() => handleDelete(item.id)} leftIcon={<DeleteIcon className="w-4 h-4" />}>Delete</Button>
        </div>
      ),
    },
  ];

  if ((loading.subjectPapers || loading.subjects) && !isModalOpen) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner size="lg" /> <span className="ml-2">Loading Subject Papers...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card title="Subject Papers Management" actions={
        <Button onClick={() => openModal()} leftIcon={<PlusIcon className="w-5 h-5" />}>
          Add Subject Paper
        </Button>
      }>
        <p className="text-sm text-gray-600 mb-4">
          Define individual papers for each subject (e.g., "Mathematics Paper 1", "Chemistry Practical Paper 2"). These papers are then used in exam settings.
        </p>
        <DataGrid columns={columns} data={subjectPapers} loading={loading.subjectPapers && isModalOpen} />
      </Card>

      <DialogForm
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingPaper ? 'Edit Subject Paper' : 'Add New Subject Paper'}
        size="lg"
        onSubmit={handleSubmit}
      >
        <FormSection columns={1}>
          <FormField label="Subject" required>
            <Select
              name="subject_id"
              value={formData.subject_id ? String(formData.subject_id) : ''}
              onChange={handleInputChange}
              required
            >
              <option value="">Select Subject</option>
              {subjects.map((subject: Subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name} ({subject.subject_code})
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Paper Name" required>
            <Input
              name="name"
              placeholder="e.g., Paper 1 (Theory)"
              value={formData.name || ''}
              onChange={handleInputChange}
              required
            />
          </FormField>
        </FormSection>
        <FormActions>
          <Button variant="secondary" onClick={closeModal}>Cancel</Button>
          <Button type="submit" disabled={loading.subjectPapers}>
            {loading.subjectPapers ? <Spinner size="sm"/> : (editingPaper ? 'Save Changes' : 'Add Paper')}
          </Button>
        </FormActions>
      </DialogForm>
    </div>
  );
};

const SubjectPapersManagementPage: React.FC = () => {
  return <SubjectPapersManagementContent />;
};

export default SubjectPapersManagementPage;
