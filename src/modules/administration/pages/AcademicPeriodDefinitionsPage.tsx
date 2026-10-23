// ABOUTME: Academic Period Definitions admin page: the ordered periods (terms, semesters) of each year structure.
// ABOUTME: Uses string structure ids and resolves structure names from the structures collection at read time.

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
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/hooks/useToast';

type PeriodDefinitionFormData = Omit<Partial<AcademicPeriodDefinition>, 'id' | 'structure_name'>;

const AcademicPeriodDefinitionsPage: React.FC = () => {
  // GAP(P1-E01): the canonical registry models academic periods of a year, not the period
  // definition templates ("Term 1" inside a year structure). The definitions therefore stay
  // on their own collection until a registry change adds `academic_period_definition`.
  const appData = useAppData();
  const academicPeriodDefinitionsData = useMemo(
    () => appData.academicPeriodDefinitions || [],
    [appData.academicPeriodDefinitions],
  );
  const academicYearStructures = useMemo(
    () => appData.academicYearStructures || [],
    [appData.academicYearStructures],
  );
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
            ? (academicPeriodDefinitionsData.filter(apd => String(apd.structure_id) === String(defaultStructureId)).length || 0) + 1 
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
        processedValue = value || undefined; 
    } else if (name === 'sequence_order') {
        processedValue = value ? parseInt(value) : undefined;
        if (Number.isNaN(processedValue as number)) processedValue = 1;
    }
    
    setFormData(prev => {
        const newState = { ...prev, [name]: processedValue };
        if (name === 'structure_id' && processedValue) {
            const existingForStructure = academicPeriodDefinitionsData.filter(apd => String(apd.structure_id) === String(processedValue));
            newState.sequence_order = (existingForStructure.length || 0) + 1;
        }
        return newState;
    });
  };

  const toast = useToast();
  const handleSubmit = async () => {
    if (!formData.name || !formData.structure_id || formData.sequence_order === undefined || formData.sequence_order <= 0) {
      toast.showWarning(t('validation.nameStructureSequenceRequired'));
      return;
    }
    const payload = { 
        name: formData.name!, 
        structure_id: String(formData.structure_id!), 
        sequence_order: Number(formData.sequence_order!),
    };

    if (editingDefinition) {
      await updateAcademicPeriodDefinition(String(editingDefinition.id), payload);
    } else {
      await addAcademicPeriodDefinition(payload);
    }
    closeModal();
  };

  const confirm = useConfirm();
  const handleDelete = async (id: number | string) => {
    if ((await confirm({ variant: 'danger', message: 'Are you sure you want to delete this period definition? This might affect related school periods.' }))) {
      await deleteAcademicPeriodDefinition(String(id));
    }
  };

  const columns: DataGridColumn<AcademicPeriodDefinition>[] = [
    {
      key: 'name',
      header: 'Definition Name',
      sortable: true,
      filterable: true,
      render: (_value, item) => item.name
    },
    {
      key: 'structure_name',
      header: 'Structure',
      sortable: true,
      filterable: true,
      render: (_value, item) => item.structure_name || '—'
    },
    {
      key: 'sequence_order',
      header: 'Sequence Order',
      sortable: true,
      render: (_value, item) => item.sequence_order
    },
    {
      key: 'actions',
      header: 'Actions',
      sortable: false,
      filterable: false,
      width: 160,
      sticky: 'right',
      render: (_value, item) => (
        <div className="space-x-2">
          <Button size="sm" variant="ghost" onClick={() => openModal(item)} leftIcon={<EditIcon className="w-4 h-4" />}>Edit</Button>
          <Button size="sm" variant="danger" onClick={() => handleDelete(item.id)} leftIcon={<DeleteIcon className="w-4 h-4" />}>Delete</Button>
        </div>
      ),
    },
  ];

  // Structure names are resolved from the structures collection, never trusted from the row.
  const sortedDefinitions = useMemo(() => {
    const structureNames = new Map(academicYearStructures.map(s => [String(s.id), s.name]));
    return academicPeriodDefinitionsData
      .map(apd => ({ ...apd, structure_name: structureNames.get(String(apd.structure_id)) ?? null }))
      .sort((a,b) => String(a.structure_id ?? '').localeCompare(String(b.structure_id ?? '')) || a.sequence_order - b.sequence_order);
  }, [academicPeriodDefinitionsData, academicYearStructures]);

  if ((loading.academicPeriodDefinitions || loading.academicYearStructures) && !isModalOpen) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner size="lg" /> <span className="ml-2">Loading Academic Period Definitions...</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Card title="Academic Period Definitions" actions={
        <Button onClick={() => openModal()} leftIcon={<PlusIcon className="w-5 h-5" />}>
          Add Definition
        </Button>
      }>
        <p className="text-sm text-surface-muted-fg mb-4">
          Define the individual periods within an Academic Year Structure (e.g., "Term 1", "Term 2", "Semester 1"). 
          Set their sequence order within the structure.
        </p>
        <DataGrid 
          columns={columns} 
          data={sortedDefinitions} 
          loading={loading.academicPeriodDefinitions && isModalOpen}
          sortable 
          filterable 
          emptyState={{
            icon: <DocumentDuplicateIcon className="h-12 w-12 text-surface-muted-fg" />,
            title: 'No period definitions found',
            description: 'Get started by creating your first academic period definition.',
          }}
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
          <Button onClick={handleSubmit} loading={loading.academicPeriodDefinitions}>
            {editingDefinition ? 'Save Changes' : 'Add Definition'}
          </Button>
        </FormActions>
      </DialogForm>
    </div>
  );
};

export default AcademicPeriodDefinitionsPage;

export const AcademicPeriodDefinitionsContent = AcademicPeriodDefinitionsPage;
