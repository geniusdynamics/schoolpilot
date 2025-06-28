
import React, { useState, useMemo } from 'react';
import { ClassStream, AcademicYear } from '../../types';
import { ClassSubjectAllocation, Subject } from '../../modules/academics/data/types'; // Corrected imports
import Card from '../../components/ui/Card';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Select from '../../components/ui/Select';
import { PlusIcon, EditIcon, DeleteIcon, BookOpenIcon } from '../../components/ui/icons';
import { useAppData } from '@/contexts/AppDataContext'; // Updated
import Spinner from '../../components/ui/Spinner';

type AllocationFormData = Omit<Partial<ClassSubjectAllocation>, 'id' | 'class_stream_name' | 'subject_name' | 'academic_year_name'>;

const ClassSubjectAllocationsPage: React.FC = () => {
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
      alert("Class Stream, Subject, and Academic Year are required.");
      return;
    }

    const isDuplicate = classSubjectAllocations.some(
        alloc => alloc.id !== editingAllocation?.id &&
                 alloc.class_stream_id === Number(formData.class_stream_id) &&
                 alloc.subject_id === Number(formData.subject_id) &&
                 alloc.academic_year_id === Number(formData.academic_year_id)
    );

    if (isDuplicate) {
        alert("This subject is already allocated to this class stream for the selected academic year.");
        return;
    }

    const payload: Omit<ClassSubjectAllocation, 'id' | 'class_stream_name' | 'subject_name' | 'academic_year_name'> = { 
        class_stream_id: Number(formData.class_stream_id!), 
        subject_id: Number(formData.subject_id!),
        academic_year_id: Number(formData.academic_year_id!),
    };

    if (editingAllocation) {
      await updateClassSubjectAllocation({ ...editingAllocation, ...payload });
    } else {
      await addClassSubjectAllocation(payload);
    }
    closeModal();
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this subject allocation?')) {
      await deleteClassSubjectAllocation(id);
    }
  };

  const columns = [
    { header: 'ID', accessor: 'id' as keyof ClassSubjectAllocation },
    { header: 'Class Stream', accessor: 'class_stream_name' as keyof ClassSubjectAllocation },
    { header: 'Subject', accessor: 'subject_name' as keyof ClassSubjectAllocation },
    { header: 'Academic Year', accessor: 'academic_year_name' as keyof ClassSubjectAllocation },
    {
      header: 'Actions',
      accessor: 'id' as keyof ClassSubjectAllocation,
      render: (item: ClassSubjectAllocation) => (
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
      <Card title="Class Subject Allocations" actions={
        <Button onClick={() => openModal()} leftIcon={<PlusIcon className="w-5 h-5" />}>
          Allocate Subject
        </Button>
      }>
        <p className="text-sm text-gray-600 mb-4">
          Assign subjects to specific class streams for a given academic year.
        </p>
        <Table columns={columns} data={classSubjectAllocations} isLoading={loading.classSubjectAllocations && isModalOpen} />
      </Card>

      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingAllocation ? 'Edit Subject Allocation' : 'Allocate New Subject'} size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={closeModal}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={loading.classSubjectAllocations}>
              {loading.classSubjectAllocations ? <Spinner size="sm"/> : (editingAllocation ? 'Save Changes' : 'Allocate Subject')}
            </Button>
          </>
        }
      >
        <Select 
          name="class_stream_id" 
          label="Class Stream" 
          value={formData.class_stream_id || ''} 
          onChange={handleInputChange}
          required
        >
          <option value="">Select Class Stream</option>
          {classStreams.map((cs: ClassStream) => (
            <option key={cs.id} value={cs.id}>{cs.class_name} - {cs.name}</option>
          ))}
        </Select>
        <Select 
          name="subject_id" 
          label="Subject" 
          value={formData.subject_id || ''} 
          onChange={handleInputChange}
          required
        >
          <option value="">Select Subject</option>
          {subjects.map((sub: Subject) => (
            <option key={sub.id} value={sub.id}>{sub.name} ({sub.subject_code})</option>
          ))}
        </Select>
        <Select 
          name="academic_year_id" 
          label="Academic Year" 
          value={formData.academic_year_id || ''} 
          onChange={handleInputChange}
          required
        >
          <option value="">Select Academic Year</option>
          {academicYears.map((ay: AcademicYear) => (
            <option key={ay.id} value={ay.id}>{ay.name}</option>
          ))}
        </Select>
      </Modal>
    </div>
  );
};

export default ClassSubjectAllocationsPage;
