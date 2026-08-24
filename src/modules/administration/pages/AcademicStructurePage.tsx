import React, { useState } from 'react';
import { AcademicYearStructure } from '@/types';
import Card from '@/components/ui/Card';
import { DataGrid, DataGridColumn } from '@/components/ui/data';
import Button from '@/components/ui/Button';
import DialogForm from '../../../components/ui/forms/DialogForm';
import FormField from '../../../components/ui/forms/FormField';
import FormSection from '../../../components/ui/forms/FormSection';
import FormActions from '../../../components/ui/forms/FormActions';
import Input from '@/components/ui/Input';
import { PlusIcon, EditIcon, DeleteIcon, PuzzlePieceIcon } from '@/components/ui/icons';
import { useAppData } from '@/hooks/useAppData'; // Updated
import Spinner from '@/components/ui/Spinner';
import { useTranslation } from 'react-i18next';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/hooks/useToast';

type AcademicStructureFormData = Omit<Partial<AcademicYearStructure>, 'id'>;

const AcademicStructurePage: React.FC = () => {
  const { t } = useTranslation();
  const appData = useAppData();
  const academicYearStructures = appData.academicYearStructures || [];
  const loading = appData.loading || {};
  const addAcademicYearStructure = appData.addAcademicYearStructure;
  const updateAcademicYearStructure = appData.updateAcademicYearStructure;
  const deleteAcademicYearStructure = appData.deleteAcademicYearStructure;
  
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

  const toast = useToast();
  const handleSubmit = async () => {
    if (!formData.name) {
      toast.showWarning(t('validation.structureNameRequired'));
      return;
    }
    const payload = { name: formData.name! };

    if (editingStructure) {
      await updateAcademicYearStructure(String(editingStructure.id), payload);
    } else {
      await addAcademicYearStructure(payload);
    }
    closeModal();
  };

  const confirm = useConfirm();
  const handleDelete = async (id: number | string) => {
    if ((await confirm({ variant: 'danger', message: 'Are you sure you want to delete this academic structure? This might affect related period definitions and academic years.' }))) {
      await deleteAcademicYearStructure(String(id));
    }
  };

  const columns: DataGridColumn<AcademicYearStructure>[] = [
    { 
      key: 'id',
      header: 'ID', 
      sortable: true,
      filterable: true,
      width: 80,
      render: (_value, item) => item.id
    },
    { 
      key: 'name',
      header: 'Structure Name', 
      sortable: true,
      filterable: true,
      width: 300,
      render: (_value, item) => item.name
    },
    {
      key: 'actions',
      header: 'Actions',
      sortable: false,
      filterable: false,
      width: 200,
      sticky: 'right',
      render: (_value, item) => (
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
          emptyState={{
            icon: <PuzzlePieceIcon className="h-12 w-12 text-gray-400" />,
            title: 'No academic structures found',
            description: 'Get started by creating your first academic year structure.',
          }}
        />
      </Card>

      <DialogForm isOpen={isModalOpen} onClose={closeModal} title={editingStructure ? 'Edit Academic Year Structure' : 'Add New Academic Year Structure'}>
        <FormSection columns={1}>
          <FormField label="Structure Name" required>
            <Input 
              name="name" 
              placeholder="e.g., Standard 3-Term System"
              value={formData.name || ''} 
              onChange={handleInputChange} 
              required 
            />
          </FormField>
        </FormSection>
        <FormActions>
          <Button variant="secondary" onClick={closeModal}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading.academicYearStructures}>
            {loading.academicYearStructures ? <Spinner size="sm"/> : (editingStructure ? 'Save Changes' : 'Add Structure')}
          </Button>
        </FormActions>
      </DialogForm>
    </div>
  );
};

export default AcademicStructurePage;

export const AcademicStructureContent = AcademicStructurePage;
