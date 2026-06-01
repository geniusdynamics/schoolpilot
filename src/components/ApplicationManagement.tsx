import React, { useState } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import FormField from '@/components/ui/forms/FormField';
import Input from '@/components/ui/Input';
import Select, { SelectOption } from '@/components/ui/Select';

interface Application {
  id: string;
  name: string;
  type: string;
  status: string;
  description?: string;
  createdAt: string;
}

interface ApplicationManagementProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (application: Partial<Application>) => void;
  initialApplication?: Partial<Application>;
  loading?: boolean;
}

export const ApplicationManagement: React.FC<ApplicationManagementProps> = ({
  isOpen,
  onClose,
  onSave,
  initialApplication = {},
  loading = false,
}) => {
  const [application, setApplication] = useState<Partial<Application>>(initialApplication);

  const handleSave = () => {
    onSave(application);
  };

  const handleCancel = () => {
    onClose();
  };

  if (!isOpen) return null;

  const statusOptions: SelectOption[] = [
    { label: 'Active', value: 'active' },
    { label: 'Inactive', value: 'inactive' },
    { label: 'Pending', value: 'pending' },
    { label: 'Archived', value: 'archived' },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleCancel}
      title="Application Management"
      size="md"
    >
      <div className="space-y-4">
        <FormField label="Application Name">
          <Input
            label=""
            value={application.name || ''}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setApplication({ ...application, name: e.target.value })}
            placeholder="Enter application name"
          />
        </FormField>

        <FormField label="Type">
          <Input
            label=""
            value={application.type || ''}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setApplication({ ...application, type: e.target.value })}
            placeholder="Enter application type"
          />
        </FormField>

        <FormField label="Status">
          <Select
            value={application.status || 'active'}
            onChange={(value) => setApplication({ ...application, status: String(value) })}
            options={statusOptions}
            placeholder="Select status"
          />
        </FormField>

        <FormField label="Description" helperText="Brief description of the application">
          <textarea
            value={application.description || ''}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setApplication({ ...application, description: e.target.value })}
            placeholder="Enter application description"
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </FormField>
      </div>

      <div className="flex justify-end space-x-3 mt-6">
        <Button
          variant="secondary"
          onClick={handleCancel}
          disabled={loading}
        >
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={handleSave}
          disabled={loading}
        >
          {loading ? 'Saving...' : 'Save Application'}
        </Button>
      </div>
    </Modal>
  );
};

export default ApplicationManagement;