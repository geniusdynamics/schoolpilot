import React, { useState, useMemo } from 'react';
import { SubjectPaper, Subject } from '@/modules/academics/data/types'; // Corrected import
import Card from '@/components/ui/Card';
import Table from '@/components/ui/Table';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { PlusIcon, EditIcon, DeleteIcon, BookOpenIcon } from '@/components/ui/icons';
import { useAppData } from '@/contexts/AppDataContext'; // Updated
import Spinner from '@/components/ui/Spinner';
import { useTranslation } from 'react-i18next';

type SubjectPaperFormData = Omit<Partial<SubjectPaper>, 'id' | 'created_at' | 'updated_at' | 'subject_name'>;

const SubjectPapersManagementPage: React.FC = () => {
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

  const handleSubmit = async () => {
    if (!formData.name || !formData.subject_id) {
      alert("Paper name and subject are required.");
      return;
    }
    const payload = { 
        name: formData.name!, 
        subject_id: Number(formData.subject_id!)
    };

    if (editingPaper) {
      await updateSubjectPaper({ ...editingPaper, ...payload });
    } else {
      await addSubjectPaper(payload);
    }
    closeModal();
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this subject paper? This might affect exam paper settings.')) {
      await deleteSubjectPaper(id);
    }
  };
  
  const columns = [
    { header: 'ID', accessor: 'id' as keyof SubjectPaper },
    { header: 'Paper Name', accessor: 'name' as keyof SubjectPaper },
    { header: 'Subject', accessor: 'subject_name' as keyof SubjectPaper }, // Resolved name
    { header: 'Created At', accessor: 'created_at' as keyof SubjectPaper, render: (item: SubjectPaper) => new Date(item.created_at).toLocaleDateString() },
    {
      header: 'Actions',
      accessor: 'id' as keyof SubjectPaper,
      render: (item: SubjectPaper) => (
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
        <Table columns={columns} data={subjectPapers} isLoading={loading.subjectPapers && isModalOpen} />
      </Card>

      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingPaper ? 'Edit Subject Paper' : 'Add New Subject Paper'} size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={closeModal}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={loading.subjectPapers}>
              {loading.subjectPapers ? <Spinner size="sm"/> : (editingPaper ? 'Save Changes' : 'Add Paper')}
            </Button>
          </>
        }
      >
        <Select 
          name="subject_id" 
          label="Subject" 
          value={formData.subject_id || ''} 
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
        <Input 
          name="name" 
          label="Paper Name" 
          placeholder="e.g., Paper 1 (Theory)"
          value={formData.name || ''} 
          onChange={handleInputChange} 
          required 
        />
      </Modal>
    </div>
  );
};

export default SubjectPapersManagementPage;
