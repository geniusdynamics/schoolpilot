import React, { useState } from 'react';
import { AcademicYearStructure } from '@/types';
import Card from '@/components/ui/Card';
import { DataGrid, DataGridColumn } from '@/components/ui/data';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import { PlusIcon, EditIcon, DeleteIcon, PuzzlePieceIcon } from '@/components/ui/icons';
import { useAppData } from '@/contexts/AppDataContext'; // Updated
import Spinner from '@/components/ui/Spinner';
import { useTranslation } from 'react-i18next';

type AcademicStructureFormData = Omit<Partial<AcademicYearStructure>, 'id'>;

const AcademicStructurePage: React.FC = () => {
  const { t } = useTranslation();
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
      alert(t('validation.structureNameRequired'));
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

  const columns: DataGridColumn<AcademicYearStructure>[] = [
    { 
      key: 'id',
      header: 'ID', 
      sortable: true,
      filterable: true,
      width: 80,
      render: (value, item) => item.id
    },
    { 
      key: 'name',
      header: 'Structure Name', 
      sortable: true,
      filterable: true,
      width: 300,
      render: (value, item) => item.name
    },
    {
      key: 'actions',
      header: 'Actions',
      sortable: false,
      filterable: false,
      width: 200,
      sticky: 'right',
      render: (value, item) => (
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
        <DataGrid 
          columns={columns} 
          data={academicYearStructures} 
          loading={loading.academicYearStructures && isModalOpen}
          sortable
          filterable
          emptyState={
            <div className="text-center py-12">
              <PuzzlePieceIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No academic structures found</h3>
              <p className="mt-1 text-sm text-gray-500">Get started by creating your first academic year structure.</p>
            </div>
          }
        />
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
