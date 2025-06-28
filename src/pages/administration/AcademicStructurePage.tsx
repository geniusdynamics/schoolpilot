
import React, { useState } from 'react';
import { AcademicYearStructure } from '../../types';
import Card from '../../components/ui/Card';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import { PlusIcon, EditIcon, DeleteIcon, PuzzlePieceIcon } from '../../components/ui/icons';
import { useAppData } from '@/contexts/AppDataContext'; // Updated
import Spinner from '../../components/ui/Spinner';

type AcademicStructureFormData = Omit<Partial<AcademicYearStructure>, 'id'>;

const AcademicStructurePage: React.FC = () => {
  const { 
    academicYearStructures, 
    loading, 
    addAcademicYearStructure, 
    updateAcademicYearStructure, 
    deleteAcademicYearStructure 
  } = useAppData(); // Updated
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStructure, setEditingStructure] = useState<AcademicYearStructure | null>(null);
  const initialFormData: AcademicStructureFormData = { name: '' };
  const [formData, setFormData] = useState<AcademicStructureFormData>(initialFormData);

  const openModal = (structure?: AcademicYearStructure) => {
    setEditingStructure(structure || null);
    setFormData(structure ? { name: structure.name } : initialFormData);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingStructure(null);
    setFormData(initialFormData);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    if (!formData.name) {
      alert("Structure name is required.");
      return;
    }
    const payload = { name: formData.name! };

    if (editingStructure) {
      await updateAcademicYearStructure({ ...editingStructure, ...payload });
    } else {
      await addAcademicYearStructure(payload);
    }
    closeModal();
  };

  const handleDelete = async (id: number) => { 
    if (window.confirm('Are you sure you want to delete this academic structure? This might affect related period definitions and academic years.')) {
      await deleteAcademicYearStructure(id);
    }
  };

  const columns = [
    { header: 'ID', accessor: 'id' as keyof AcademicYearStructure },
    { header: 'Structure Name', accessor: 'name' as keyof AcademicYearStructure },
    {
      header: 'Actions',
      accessor: 'id' as keyof AcademicYearStructure,
      render: (item: AcademicYearStructure) => (
        <div className="space-x-2">
          <Button size="sm" variant="ghost" onClick={() => openModal(item)} leftIcon={<EditIcon className="w-4 h-4" />}>Edit</Button>
          <Button size="sm" variant="danger" onClick={() => handleDelete(item.id)} leftIcon={<DeleteIcon className="w-4 h-4" />}>Delete</Button>
        </div>
      ),
    },
  ];

  if (loading.academicYearStructures && !isModalOpen) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner size="lg" /> <span className="ml-2">Loading Academic Structures...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card title="Academic Year Structures" actions={
        <Button onClick={() => openModal()} leftIcon={<PlusIcon className="w-5 h-5" />}>
          Add Structure
        </Button>
      }>
        <p className="text-sm text-gray-600 mb-4">
          Define the overall structure of an academic year (e.g., "Standard 3-Term System", "Semester System"). 
          Academic Period Definitions will be linked to these structures.
        </p>
        <Table columns={columns} data={academicYearStructures} isLoading={loading.academicYearStructures && isModalOpen} />
      </Card>

      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingStructure ? 'Edit Academic Year Structure' : 'Add New Academic Year Structure'}
        footer={
          <>
            <Button variant="secondary" onClick={closeModal}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={loading.academicYearStructures}>
              {loading.academicYearStructures ? <Spinner size="sm"/> : (editingStructure ? 'Save Changes' : 'Add Structure')}
            </Button>
          </>
        }
      >
        <Input 
          name="name" 
          label="Structure Name" 
          placeholder="e.g., Standard 3-Term System"
          value={formData.name || ''} 
          onChange={handleInputChange} 
          required 
        />
      </Modal>
    </div>
  );
};

export default AcademicStructurePage;
