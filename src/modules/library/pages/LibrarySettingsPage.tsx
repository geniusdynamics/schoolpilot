// ABOUTME: Page for managing borrowing rules via LibrarySettings with CRUD operations
// ABOUTME: Uses existing Card/DataGrid/Modal components for UI consistency

import React, { useState } from 'react';
import { LibrarySettingsType } from '../data/types';
import { useLibrarySettingsData } from '../data/useLibrarySettingsData';
import Card from '@/components/ui/Card';
import { DataGrid, DataGridColumn } from '@/components/ui/data';
import Button from '@/components/ui/Button';
import DialogForm from '../../../components/ui/forms/DialogForm';
import FormField from '../../../components/ui/forms/FormField';
import FormSection from '../../../components/ui/forms/FormSection';
import FormActions from '../../../components/ui/forms/FormActions';
import Input from '@/components/ui/Input';

import Spinner from '@/components/ui/Spinner';
import { EditIcon, PlusIcon } from '@/components/ui/icons';

export const LibrarySettingsPageContent: React.FC = () => {

  const {
    data: settings,
    create: addSetting,
    update: updateSetting,
    remove: deleteSetting,
    isLoading: settingsLoading,
  } = useLibrarySettingsData();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSetting, setEditingSetting] = useState<LibrarySettingsType | null>(null);
  const [newSetting, setNewSetting] = useState<Partial<LibrarySettingsType>>({
    name: '',
    max_loan_days: 0,
    max_renewals: 0,
    fine_per_day: 0,
    max_books_per_user: 0,
    book_categories: [],
    user_types: [],
    is_active: true,
  });

  const openModal = (setting?: LibrarySettingsType) => {
    if (setting) {
      setEditingSetting(setting);
      setNewSetting(setting);
    } else {
      setEditingSetting(null);
      setNewSetting({
        name: '',
        max_loan_days: 0,
        max_renewals: 0,
        fine_per_day: 0,
        max_books_per_user: 0,
        book_categories: [],
        user_types: [],
        is_active: true,
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingSetting(null);
  };

  const handleInputChange = (field: keyof Partial<LibrarySettingsType>, value: any) => {
    setNewSetting((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!newSetting.name || !newSetting.max_loan_days || !newSetting.max_books_per_user) {
      alert('Name, Max Loan Days, and Max Books per User are required fields.');
      return;
    }

    if (editingSetting) {
      await updateSetting(editingSetting.id, newSetting);
    } else {
      await addSetting(newSetting);
    }

    closeModal();
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this setting?')) {
      await deleteSetting(id);
    }
  };

  const columns: DataGridColumn<LibrarySettingsType>[] = [
    {
      key: 'name',
      header: 'Name',
      sortable: true,
      filterable: true,
    },
    {
      key: 'max_loan_days',
      header: 'Max Loan Days',
    },
    {
      key: 'max_renewals',
      header: 'Max Renewals',
    },
    {
      key: 'fine_per_day',
      header: 'Fine per Day',
      render: (setting) => `KES ${(setting.fine_per_day || 0).toFixed(2)}`,
    },
    {
      key: 'max_books_per_user',
      header: 'Max Books per User',
    },
    {
      key: 'is_active',
      header: 'Active',
      render: (setting) => (setting.is_active ? 'Yes' : 'No'),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (_, setting) => (
        <div className="flex space-x-2">
          <Button size="sm" variant="ghost" onClick={() => openModal(setting)}>
            Edit
          </Button>
          <Button size="sm" variant="danger" onClick={() => handleDelete(setting.id)}>
            Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <Card
        title="Library Borrowing Rules Management"
        actions={
          <Button onClick={() => openModal()} leftIcon={<PlusIcon className="w-5 h-5" /> }>
            Add Rule
          </Button>
        }
      >
        {settingsLoading ? (
          <div className="flex justify-center items-center h-64">
            <Spinner size="lg" /> <span className="ml-2">Loading Settings...</span>
          </div>
        ) : (
          <DataGrid<LibrarySettingsType>
            columns={columns}
            data={settings}
            sortable={true}
            filterable={true}
            emptyState={
              <div className="text-center py-12">
                <EditIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No settings available</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Get started by adding new borrowing rules.
                </p>
              </div>
            }
          />
        )}
      </Card>

      <DialogForm
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingSetting ? 'Edit Borrowing Rule' : 'Add New Borrowing Rule'}
      >
        <FormSection columns={1}>
          <FormField label="Rule Name" required>
            <Input
              value={newSetting.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              required
            />
          </FormField>
          <FormField label="Max Loan Days" required>
            <Input
              type="number"
              value={newSetting.max_loan_days || 0}
              onChange={(e) => handleInputChange('max_loan_days', parseInt(e.target.value))}
              required
            />
          </FormField>
          <FormField label="Max Renewals">
            <Input
              type="number"
              value={newSetting.max_renewals || 0}
              onChange={(e) => handleInputChange('max_renewals', parseInt(e.target.value))}
            />
          </FormField>
          <FormField label="Fine per Day (KES)">
            <Input
              type="number"
              step="0.01"
              value={newSetting.fine_per_day || 0}
              onChange={(e) => handleInputChange('fine_per_day', parseFloat(e.target.value))}
            />
          </FormField>
          <FormField label="Max Books per User" required>
            <Input
              type="number"
              value={newSetting.max_books_per_user || 0}
              onChange={(e) => handleInputChange('max_books_per_user', parseInt(e.target.value))}
              required
            />
          </FormField>
          <FormField label="Book Categories (comma-separated)">
            <Input
              value={newSetting.book_categories?.join(', ') || ''}
              onChange={(e) => handleInputChange('book_categories', e.target.value.split(',').map(cat => cat.trim()))}
            />
          </FormField>
          <FormField label="User Types (comma-separated)">
            <Input
              value={newSetting.user_types?.join(', ') || ''}
              onChange={(e) => handleInputChange('user_types', e.target.value.split(',').map(type => type.trim()))}
            />
          </FormField>
        </FormSection>
        <FormActions>
          <Button variant="secondary" onClick={closeModal}>Cancel</Button>
          <Button onClick={handleSubmit}>
            {editingSetting ? 'Save Changes' : 'Add Rule'}
          </Button>
        </FormActions>
      </DialogForm>
    </div>
  );
};
const LibrarySettingsPage: React.FC = () => (
  <div className="space-y-6">
    <LibrarySettingsPageContent />
  </div>
);

export default LibrarySettingsPage;
