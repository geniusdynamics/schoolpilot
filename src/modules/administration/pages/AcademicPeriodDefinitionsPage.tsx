import React, { useState, useMemo } from 'react';
import { AcademicPeriodDefinition, AcademicYearStructure } from '@/types';
import Card from '@/components/ui/Card';
import { DataGrid, DataGridColumn } from '@/components/ui/data';
import Button from '@/components/ui/Button';
import DialogForm from '@/components/ui/forms/DialogForm';
import FormField from '@/components/ui/forms/FormField';
import FormSection from '@/components/ui/forms/FormSection';
import FormActions from '@/components/ui/forms/FormActions';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { PlusIcon, EditIcon, DeleteIcon, DocumentDuplicateIcon } from '@/components/ui/icons';
import { useAppData } from '@/hooks/useAppData';
import Spinner from '@/components/ui/Spinner';
import { useTranslation } from 'react-i18next';

type PeriodDefinitionFormData = Omit<Partial<AcademicPeriodDefinition>, 'id' | 'structure_name'>;

const AcademicPeriodDefinitionsPage: React.FC = () => {
  const appData = useAppData();
  const academicPeriodDefinitionsData = appData.academicPeriodDefinitions || [];
  const academicYearStructures = appData.academicYearStructures || [];
  const loading = appData.loading || {};
  const addAcademicPeriodDefinition = appData.addAcademicPeriodDefinition;
  const updateAcademicPeriodDefinition = appData.updateAcademicPeriodDefinition;
  const deleteAcademicPeriodDefinition = appData.deleteAcademicPeriodDefinition;
  
  const { t } = useTranslation('administration');
  
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
      alert(t('validation.nameStructureSequenceRequired'));
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

  const columns: DataGridColumn<AcademicPeriodDefinition>[] = [
    { 
      key: 'id', 
      header: 'ID', 
      sortable: true, 
      filterable: true, 
      width: 80,
      render: (value, item) => value
    },
    { 
      key: 'name', 
      header: 'Definition Name', 
      sortable: true, 
      filterable: true, 
      width: 200,
      render: (value, item) => value
    },
    { 
      key: 'structure_name', 
      header: 'Structure', 
      sortable: true, 
      filterable: true, 
      width: 180,
      render: (value, item) => value
    },
    { 
      key: 'sequence_order', 
      header: 'Sequence Order', 
      sortable: true, 
      filterable: true, 
      width: 140,
      render: (value, item) => value
    },
    {
      key: 'actions',
      header: 'Actions',
      sortable: false,
      filterable: false,
      width: 160,
      sticky: 'right',
      render: (value, item) => (
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
        <DataGrid 
          columns={columns} 
          data={sortedDefinitions} 
          loading={loading.academicPeriodDefinitions && isModalOpen}
          sortable 
          filterable 
          emptyState={
            <div className="text-center py-12">
              <DocumentDuplicateIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No period definitions found</h3>
              <p className="mt-1 text-sm text-gray-500">Get started by creating your first academic period definition.</p>
            </div>
          }
        />
      </Card>

      <DialogForm isOpen={isModalOpen} onClose={closeModal} title={editingDefinition ? 'Edit Period Definition' : 'Add New Period Definition'} size="lg">
        <FormSection columns={1}>
          <FormField label="Period Name" required>
            <Input 
              name="name" 
              placeholder="e.g., Term 1, Semester 2"
              value={formData.name || ''} 
              onChange={handleInputChange} 
              required 
            />
          </FormField>
          <FormField label="Academic Year Structure" required>
            <Select 
              name="structure_id" 
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
          </FormField>
          <FormField label="Sequence Order" required>
            <Input 
              name="sequence_order" 
              type="number"
              min="1"
              value={formData.sequence_order?.toString() || '1'} 
              onChange={handleInputChange} 
              required 
            />
          </FormField>
        </FormSection>
        <FormActions>
          <Button variant="secondary" onClick={closeModal}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading.academicPeriodDefinitions}>
            {loading.academicPeriodDefinitions ? <Spinner size="sm"/> : (editingDefinition ? 'Save Changes' : 'Add Definition')}
          </Button>
        </FormActions>
      </DialogForm>
    </div>
  );
};

export default AcademicPeriodDefinitionsPage;
