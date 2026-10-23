// ABOUTME: Education systems page — lists curriculum configurations and opens the editor to add, edit or clone one.
// ABOUTME: CRUD goes through the academics module context with update(id, patch).

import React, { useState } from 'react';
import { EducationSystemConfiguration } from '../data/types';
import { DataGrid, DataGridColumn } from '@/components/ui/data';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { PlusIcon, EditIcon, CopyIcon, EyeIcon } from '@/components/ui/icons';
import { logger } from '@/utils/logging';
import { useToast } from '@/hooks/useToast';
import { useAcademicDataContext } from '../data/AcademicDataContext';
import { EducationSystemConfigPageContent } from './EducationSystemConfigPage';

export const EducationSystemsPageContent: React.FC = () => {
  const {
    educationSystemConfigurations = [],
    addEducationSystemConfiguration,
    updateEducationSystemConfiguration,
  } = useAcademicDataContext();
  const toast = useToast();

  const [showConfigPage, setShowConfigPage] = useState(false);
  const [editingSystem, setEditingSystem] = useState<EducationSystemConfiguration | null>(null);

  const columns: DataGridColumn<EducationSystemConfiguration>[] = [
    { key: 'name', header: 'System Name' },
    { key: 'country_code', header: 'Country' },
    { key: 'system_type', header: 'Type' },
    { 
      key: 'grading_system_type', 
      header: 'Grading System',
      render: (value) => value || 'N/A'
    },
    {
      key: 'is_default',
      header: 'Default',
      render: (value) => value ? '✅' : ''
    },
    {
      key: 'is_active',
      header: 'Status',
      render: (value) => value ? 'Active' : 'Inactive'
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (_value, item) => (
        <div className="flex space-x-1">
          <Button 
            size="sm" 
            variant="ghost" 
            onClick={handlePreview}
            leftIcon={<EyeIcon className="w-4 h-4" />}
          >
            Preview
          </Button>
          <Button 
            size="sm" 
            variant="secondary" 
            onClick={() => handleEdit(item)}
            leftIcon={<EditIcon className="w-4 h-4" />}
          >
            Edit
          </Button>
          <Button 
            size="sm" 
            variant="outline" 
            onClick={() => handleClone(item)}
            leftIcon={<CopyIcon className="w-4 h-4" />}
          >
            Clone
          </Button>
        </div>
      )
    }
  ];

  const handleEdit = (system: EducationSystemConfiguration) => {
    setEditingSystem(system);
    setShowConfigPage(true);
  };

  const handleClone = async (system: EducationSystemConfiguration) => {
    const clonedSystem = {
      ...system,
      id: undefined, // Will be generated
      name: `${system.name} (Copy)`,
      is_default: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    await addEducationSystemConfiguration(clonedSystem);
  };

  const handlePreview = () => {
    // Navigate to preview page (not built yet)
  };

  if (showConfigPage) {
    return (
      <EducationSystemConfigPageContent
        editingSystem={editingSystem}
        onSave={async (system: EducationSystemConfiguration) => {
          try {
            if (editingSystem?.id) {
              const patch: Partial<EducationSystemConfiguration> = { ...system };
              delete patch.id;
              await updateEducationSystemConfiguration(editingSystem.id, patch);
            } else {
              await addEducationSystemConfiguration(system);
            }
            setShowConfigPage(false);
            setEditingSystem(null);
          } catch (error) {
            logger.error('Failed to save education system:', error);
            toast.showError('Failed to save education system.');
          }
        }}
        onCancel={() => {
          setShowConfigPage(false);
          setEditingSystem(null);
        }}
      />
    );
  }

  return (
    <div className="space-y-3">
      <Card 
        title="Education System Configurations" 
        info="Configure education systems to support different curricula, grading schemes, and assessment methods."
        actions={
          <Button 
            onClick={() => setShowConfigPage(true)}
            leftIcon={<PlusIcon className="w-5 h-5" />}
          >
            Add Education System
          </Button>
        }
      >
        <DataGrid columns={columns} data={educationSystemConfigurations} />
      </Card>
    </div>
  );
};
const EducationSystemsPage: React.FC = () => (
  <div className="space-y-3">
    <EducationSystemsPageContent />
  </div>
);

export default EducationSystemsPage;
