// src/modules/academics/pages/EducationSystemsPage.tsx

import React, { useState } from 'react';
import { EducationSystemConfiguration } from '../data/types';
import { DataGrid, DataGridColumn } from '@/components/ui/data';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { PlusIcon, EditIcon, CopyIcon, EyeIcon } from '@/components/ui/icons';
import { useAppData } from '@/hooks/useAppData';
import EducationSystemConfigPage from './EducationSystemConfigPage';

export const EducationSystemsPageContent: React.FC = () => {
  const { 
    educationSystemConfigurations = [], 
    loading = false, 
    addEducationSystemConfiguration,
    updateEducationSystemConfiguration,
    deleteEducationSystemConfiguration 
  } = useAppData();

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
      render: (value, item) => (
        <div className="flex space-x-1">
          <Button 
            size="sm" 
            variant="ghost" 
            onClick={() => handlePreview(item)}
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

  const handlePreview = (system: EducationSystemConfiguration) => {
    // Navigate to preview page
  };

  if (showConfigPage) {
    return (
      <EducationSystemConfigPage
        editingSystem={editingSystem}
        onSave={async (system) => {
          if (editingSystem) {
            await updateEducationSystemConfiguration({ ...editingSystem, ...system });
          } else {
            await addEducationSystemConfiguration(system);
          }
          setShowConfigPage(false);
          setEditingSystem(null);
        }}
        onCancel={() => {
          setShowConfigPage(false);
          setEditingSystem(null);
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <Card 
        title="Education System Configurations" 
        actions={
          <Button 
            onClick={() => setShowConfigPage(true)}
            leftIcon={<PlusIcon className="w-5 h-5" />}
          >
            Add Education System
          </Button>
        }
      >
        <p className="text-sm text-gray-600 mb-4">
          Configure education systems to support different curricula, grading schemes, and assessment methods.
        </p>
        <DataGrid columns={columns} data={educationSystemConfigurations} />
      </Card>
    </div>
  );
};
const EducationSystemsPage: React.FC = () => (
  <div className="space-y-6">
    <EducationSystemsPageContent />
  </div>
);

export default EducationSystemsPage;
