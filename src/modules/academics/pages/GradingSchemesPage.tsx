import React, { useState } from 'react';
import { GradingScheme, GradingSchemeLevel } from '@/modules/academics/data/types'; // Corrected import
import Card from '@/components/ui/Card';
import { DataGrid, DataGridColumn } from '@/components/ui/data';
import Button from '@/components/ui/Button';
import DialogForm from '@/components/ui/forms/DialogForm';
import FormSection from '@/components/ui/forms/FormSection';
import FormField from '@/components/ui/forms/FormField';
import FormActions from '@/components/ui/forms/FormActions';
import Input from '@/components/ui/Input';

import { useAppData } from '@/hooks/useAppData'; // Updated
import Spinner from '@/components/ui/Spinner';
import { useTranslation } from 'react-i18next';
import { DeleteIcon, EditIcon, ListBulletIcon, PlusIcon } from '@/components/ui/icons';

type GradingSchemeFormData = Omit<Partial<GradingScheme>, 'id' | 'created_at' | 'updated_at' | 'levels'>;
type LevelFormData = Omit<Partial<GradingSchemeLevel>, 'id' | 'scheme_id'>;

export const GradingSchemesContent: React.FC = () => {
  const { 
    gradingSchemes, 
    loading, 
    addGradingScheme, 
    updateGradingScheme, 
    deleteGradingScheme 
  } = useAppData(); // Updated
  
  const { t } = useTranslation('academics');
  
  const [isSchemeModalOpen, setIsSchemeModalOpen] = useState(false);
  const [isLevelModalOpen, setIsLevelModalOpen] = useState(false);
  
  const [editingScheme, setEditingScheme] = useState<GradingScheme | null>(null);
  const [editingLevel, setEditingLevel] = useState<GradingSchemeLevel | null>(null);
  const [currentSchemeForLevels, setCurrentSchemeForLevels] = useState<GradingScheme | null>(null);

  const initialSchemeFormData: GradingSchemeFormData = { name: '', is_default: false };
  const initialLevelFormData: LevelFormData = { grade: '', min_score: 0, points: undefined, comment: '' };

  const [schemeFormData, setSchemeFormData] = useState<GradingSchemeFormData>(initialSchemeFormData);
  const [levelFormData, setLevelFormData] = useState<LevelFormData>(initialLevelFormData);

  // Scheme Modal
  const openSchemeModal = (scheme?: GradingScheme) => {
    setEditingScheme(scheme || null);
    setSchemeFormData(scheme ? { name: scheme.name, is_default: scheme.is_default } : initialSchemeFormData);
    setIsSchemeModalOpen(true);
  };
  const closeSchemeModal = () => {
    setIsSchemeModalOpen(false);
    setEditingScheme(null);
    setSchemeFormData(initialSchemeFormData);
  };

  // Level Modal
  const openLevelModal = (scheme: GradingScheme, level?: GradingSchemeLevel) => {
    setCurrentSchemeForLevels(scheme);
    setEditingLevel(level || null);
    setLevelFormData(level ? 
      { grade: level.grade, min_score: level.min_score, points: level.points, comment: level.comment } : 
      initialLevelFormData
    );
    setIsLevelModalOpen(true);
  };
  const closeLevelModal = () => {
    setIsLevelModalOpen(false);
    setEditingLevel(null);
    setCurrentSchemeForLevels(null); // Clear context
    setLevelFormData(initialLevelFormData);
  };

  const handleSchemeInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setSchemeFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleLevelInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setLevelFormData(prev => ({ ...prev, [name]: type === 'number' ? parseFloat(value) || 0 : value }));
  };
  
  const handleSchemeSubmit = async () => {
    if (!schemeFormData.name) {
      alert(t('validation.schemeNameIsRequired'));
      return;
    }
    const payload = {
      name: schemeFormData.name!,
      is_default: schemeFormData.is_default || false,
      levels: editingScheme?.levels || [] // Preserve existing levels if editing
    };

    if (editingScheme) {
      await updateGradingScheme(String(editingScheme.id), payload);
    } else {
      await addGradingScheme(payload);
    }
    closeSchemeModal();
  };

  const handleLevelSubmit = async () => {
    if (!currentSchemeForLevels || !levelFormData.grade || levelFormData.min_score === undefined) {
      alert(t('validation.gradeAndMinimumScoreAreRequiredForALevel'));
      return;
    }

    let updatedLevels: GradingSchemeLevel[];
    const now = new Date().toISOString();

    if (editingLevel) {
      updatedLevels = (currentSchemeForLevels.levels || []).map(l => 
        l.id === editingLevel.id ? { ...editingLevel, ...levelFormData, grade: levelFormData.grade!, min_score: Number(levelFormData.min_score!) } : l
      );
    } else {
      const newLevel: GradingSchemeLevel = { 
        grade: levelFormData.grade!,
        min_score: Number(levelFormData.min_score!),
        points: levelFormData.points,
        comment: levelFormData.comment,
        id: Date.now(), // Mock ID
        scheme_id: currentSchemeForLevels.id,
      };
      updatedLevels = [...(currentSchemeForLevels.levels || []), newLevel];
    }
    
    await updateGradingScheme(String(currentSchemeForLevels.id), { levels: updatedLevels, updated_at: now });
    // Optimistically update the current scheme for levels display if modal stays open for multiple adds
    setCurrentSchemeForLevels(prev => prev ? {...prev, levels: updatedLevels, updated_at: now} : null);
    setEditingLevel(null); // Reset for next add
    setLevelFormData(initialLevelFormData); // Reset form for next add
    // Note: If you want to close level modal after each add/edit, call closeLevelModal() here.
  };
  
  const handleDeleteScheme = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this grading scheme? All its levels will also be deleted.')) {
      await deleteGradingScheme(String(id));
    }
  };

  const handleDeleteLevel = async (levelId: number) => {
    if (!currentSchemeForLevels) return;
    if (window.confirm('Are you sure you want to delete this grading level?')) {
      const updatedLevels = (currentSchemeForLevels.levels || []).filter(l => l.id !== levelId);
      await updateGradingScheme(String(currentSchemeForLevels.id), { levels: updatedLevels, updated_at: new Date().toISOString() });
      setCurrentSchemeForLevels(prev => prev ? {...prev, levels: updatedLevels, updated_at: new Date().toISOString()} : null);
    }
  };

  const schemeColumns: DataGridColumn<GradingScheme>[] = [
    { key: 'id', header: 'ID' },
    { key: 'name', header: 'Scheme Name' },
    { key: 'is_default', header: 'Is Default' },
    { key: 'levels', header: 'Levels', render: (_value: any, item: GradingScheme) => (item.levels?.length || 0) },
    {
      key: 'actions',
      header: 'Actions',
      render: (_value: any, item: GradingScheme) => (
        <div className="space-x-2">
          <Button size="sm" variant="ghost" onClick={() => openSchemeModal(item)} leftIcon={<EditIcon className="w-4 h-4" />}>Edit Scheme</Button>
          <Button size="sm" variant="secondary" onClick={() => openLevelModal(item)} leftIcon={<ListBulletIcon className="w-4 h-4" />}>Manage Levels</Button>
          <Button size="sm" variant="danger" onClick={() => handleDeleteScheme(item.id)} leftIcon={<DeleteIcon className="w-4 h-4" />}>Delete</Button>
        </div>
      ),
    },
  ];

  const levelColumns: DataGridColumn<GradingSchemeLevel>[] = [
    { key: 'grade', header: 'Grade' },
    { key: 'min_score', header: 'Min Score' },
    { key: 'points', header: 'Points' },
    { key: 'comment', header: 'Comment' },
    {
      key: 'actions',
      header: 'Actions',
      render: (_value: any, item: GradingSchemeLevel) => (
        <div className="space-x-1">
          <Button size="sm" variant="ghost" onClick={() => openLevelModal(currentSchemeForLevels!, item)} leftIcon={<EditIcon className="w-4 h-4" />}>Edit</Button>
          <Button size="sm" variant="danger" onClick={() => handleDeleteLevel(item.id)} leftIcon={<DeleteIcon className="w-4 h-4" />}>Delete</Button>
        </div>
      ),
    },
  ];

  if (loading.gradingSchemes && !isSchemeModalOpen && !isLevelModalOpen) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner size="lg" /> <span className="ml-2">Loading Grading Schemes...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card title="Grading Schemes Management" actions={
        <Button onClick={() => openSchemeModal()} leftIcon={<PlusIcon className="w-5 h-5" />}>
          Add Grading Scheme
        </Button>
      }>
        <p className="text-sm text-gray-600 mb-4">
          Define grading schemes and their corresponding levels (grades, minimum scores, points).
        </p>
        <DataGrid columns={schemeColumns} data={gradingSchemes} />
      </Card>

      {/* Scheme Modal */}
      <DialogForm
        open={isSchemeModalOpen}
        onClose={closeSchemeModal}
        title={editingScheme ? 'Edit Grading Scheme' : 'Add New Grading Scheme'}
        onSubmit={handleSchemeSubmit}
        actions={
          <FormActions>
            <Button variant="secondary" onClick={closeSchemeModal}>Cancel</Button>
            <Button type="submit" disabled={loading.gradingSchemes}>
              {loading.gradingSchemes ? <Spinner size="sm"/> : (editingScheme ? 'Save Changes' : 'Add Scheme')}
            </Button>
          </FormActions>
        }
      >
        <FormSection>
          <FormField>
            <Input
              name="name"
              label="Scheme Name"
              value={schemeFormData.name || ''}
              onChange={handleSchemeInputChange}
              required
            />
          </FormField>
          <FormField>
            <div className="flex items-center">
              <input
                id="is_default"
                name="is_default"
                type="checkbox"
                checked={schemeFormData.is_default || false}
                onChange={handleSchemeInputChange}
                className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
              />
              <label htmlFor="is_default" className="ml-2 block text-sm text-gray-900">
                Set as Default Scheme
              </label>
            </div>
          </FormField>
        </FormSection>
      </DialogForm>

      {/* Level Management Dialog */}
      <DialogForm 
        open={isLevelModalOpen} 
        onClose={closeLevelModal} 
        title={`Manage Levels for: ${currentSchemeForLevels?.name || ''}`} 
        size="xl"
        actions={<FormActions><Button variant="secondary" onClick={closeLevelModal}>Done</Button></FormActions>}
      >
        {currentSchemeForLevels && (
          <div className="space-y-4">
            <Card title="Add/Edit Level">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input name="grade" label="Grade (e.g., A, B+)" value={levelFormData.grade || ''} onChange={handleLevelInputChange} />
                <Input name="min_score" label="Minimum Score" type="number" value={levelFormData.min_score || ''} onChange={handleLevelInputChange} />
                <Input name="points" label="Points (Optional)" type="number" value={levelFormData.points || ''} onChange={handleLevelInputChange} />
                <Input name="comment" label="Comment (Optional)" value={levelFormData.comment || ''} onChange={handleLevelInputChange} className="md:col-span-2"/>
              </div>
              <div className="text-right mt-4">
                <Button onClick={handleLevelSubmit} size="sm">
                  {editingLevel ? 'Update Level' : 'Add Level'}
                </Button>
              </div>
            </Card>
            
            <h4 className="text-md font-semibold text-gray-700 mt-6">Existing Levels</h4>
            <DataGrid 
              columns={levelColumns} 
              data={currentSchemeForLevels.levels || []} 
            />
          </div>
        )}
      </DialogForm>
    </div>
  );
};

const GradingSchemesPage: React.FC = () => {
  return <GradingSchemesContent />;
};

export default GradingSchemesPage;
