import React, { useState, useMemo } from 'react';
import { AcademicPeriodDefinition, AcademicYearStructure } from '../../types';
import Card from '../../components/ui/Card';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import { PlusIcon, EditIcon, DeleteIcon, DocumentDuplicateIcon } from '../../components/ui/icons';
import { useAppData } from '@/contexts/AppDataContext';
import Spinner from '../../components/ui/Spinner';
import { useTranslation } from 'react-i18next';

type PeriodDefinitionFormData = Omit<Partial<AcademicPeriodDefinition>, 'id' | 'structure_name'>;

const AcademicPeriodDefinitionsPage: React.FC = () => {
  const { 
    academicPeriodDefinitions: academicPeriodDefinitionsData, 
    academicYearStructures,
    loading, 
    addAcademicPeriodDefinition, 
    updateAcademicPeriodDefinition, 
    deleteAcademicPeriodDefinition 
  } = useAppData();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDefinition, setEditingDefinition] = useState<AcademicPeriodDefinition | null>(null);
  const initialFormData: PeriodDefinitionFormData = { name: '', structure_id: undefined, sequence_order: 1 };
  const [formData, setFormData] = useState<PeriodDefinitionFormData>(initialFormData);

  const openModal = (definition?: AcademicPeriodDefinition) => {
    setEditingDefinition(definition || null);
    if (definition) {
        setFormData({ 
            name: definition.name, 
            structure_id: definition.structure_id, 
            sequence_order: definition.sequence_order 
        });
    } else {
        const defaultStructureId = formData.structure_id || (academicYearStructures.length > 0 ? academicYearStructures[0].id : undefined);
        const defaultSequence = defaultStructureId 
            ? (academicPeriodDefinitionsData.filter(apd => apd.structure_id === defaultStructureId).length || 0) + 1 
            : 1;
        setFormData({...initialFormData, structure_id: defaultStructureId, sequence_order: defaultSequence });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingDefinition(null);
    setFormData(initialFormData);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    let processedValue: string | number | undefined = value;
    if (name === 'structure_id') { 
        processedValue = value ? parseInt(value) : undefined; 
    } else if (name === 'sequence_order') {
        processedValue = value ? parseInt(value) : undefined;
        if (Number.isNaN(processedValue as number)) processedValue = 1;
    }
    
    setFormData(prev => {
        const newState = { ...prev, [name]: processedValue };
        if (name === 'structure_id' && processedValue) {
            const existingForStructure = academicPeriodDefinitionsData.filter(apd => apd.structure_id === Number(processedValue));
            newState.sequence_order = (existingForStructure.length || 0) + 1;
        }
        return newState;
    });
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.structure_id || formData.sequence_order === undefined || formData.sequence_order <= 0) {
      alert("Name, Structure, and a valid positive Sequence Order are required.");
      return;
    }
    const payload = { 
        name: formData.name!, 
        structure_id: Number(formData.structure_id!), 
        sequence_order: Number(formData.sequence_order!),
    };

    if (editingDefinition) {
      await updateAcademicPeriodDefinition({ ...editingDefinition, ...payload });
    } else {
      await addAcademicPeriodDefinition(payload);
    }
    closeModal();
  };

  const handleDelete = async (id: number) => { 
    if (window.confirm('Are you sure you want to delete this period definition? This might affect related school periods.')) {
      await deleteAcademicPeriodDefinition(id);
    }
  };

  const columns = [
    { header: 'ID', accessor: 'id' as keyof AcademicPeriodDefinition },
    { header: 'Definition Name', accessor: 'name' as keyof AcademicPeriodDefinition },
    { header: 'Structure', accessor: 'structure_name' as keyof AcademicPeriodDefinition },
    { header: 'Sequence Order', accessor: 'sequence_order' as keyof AcademicPeriodDefinition },
    {
      header: 'Actions',
      accessor: 'id' as keyof AcademicPeriodDefinition,
      render: (item: AcademicPeriodDefinition) => (
        <div className="space-x-2">
          <Button size="sm" variant="ghost" onClick={() => openModal(item)} leftIcon={<EditIcon className="w-4 h-4" />}>Edit</Button>
          <Button size="sm" variant="danger" onClick={() => handleDelete(item.id)} leftIcon={<DeleteIcon className="w-4 h-4" />}>Delete</Button>
        </div>
      ),
    },
  ];

  const sortedDefinitions = useMemo(() => 
    [...academicPeriodDefinitionsData].sort((a,b) => String(a.structure_id ?? '').localeCompare(String(b.structure_id ?? '')) || a.sequence_order - b.sequence_order),
    [academicPeriodDefinitionsData]
  );

  if ((loading.academicPeriodDefinitions || loading.academicYearStructures) && !isModalOpen) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner size="lg" /> <span className="ml-2">Loading Academic Period Definitions...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card title="Academic Period Definitions" actions={
        <Button onClick={() => openModal()} leftIcon={<PlusIcon className="w-5 h-5" />}>
          Add Definition
        </Button>
      }>
        <p className="text-sm text-gray-600 mb-4">
          Define the individual periods within an Academic Year Structure (e.g., "Term 1", "Term 2", "Semester 1"). 
          Set their sequence order within the structure.
        </p>
        <Table columns={columns} data={sortedDefinitions} isLoading={loading.academicPeriodDefinitions && isModalOpen} />
      </Card>

      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingDefinition ? 'Edit Period Definition' : 'Add New Period Definition'} size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={closeModal}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={loading.academicPeriodDefinitions}>
              {loading.academicPeriodDefinitions ? <Spinner size="sm"/> : (editingDefinition ? 'Save Changes' : 'Add Definition')}
            </Button>
          </>
        }
      >
        <Input 
          name="name" 
          label="Period Name" 
          placeholder="e.g., Term 1, Semester 2"
          value={formData.name || ''} 
          onChange={handleInputChange} 
          required 
        />
        <Select 
          name="structure_id" 
          label="Academic Year Structure" 
          value={formData.structure_id?.toString() || ''} 
          onChange={handleInputChange}
          required
        >
          <option value="">Select Structure</option>
          {academicYearStructures.map((structure: AcademicYearStructure) => (
            <option key={structure.id} value={structure.id}>
              {structure.name}
            </option>
          ))}
        </Select>
        <Input 
          name="sequence_order" 
          label="Sequence Order" 
          type="number"
          min="1"
          value={formData.sequence_order?.toString() || '1'} 
          onChange={handleInputChange} 
          required 
        />
      </Modal>
    </div>
  );
};

export default AcademicPeriodDefinitionsPage;
