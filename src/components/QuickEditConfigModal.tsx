import React, { useState, useEffect } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import FormField from '@/components/ui/forms/FormField';
import Spinner from '@/components/ui/Spinner';

interface QuickEditConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: any) => void;
  initialConfig?: any;
  loading?: boolean;
}

export const QuickEditConfigModal: React.FC<QuickEditConfigModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialConfig = {},
  loading = false,
}) => {
  const [config, setConfig] = useState<any>(initialConfig);

  useEffect(() => {
    setConfig(initialConfig);
  }, [initialConfig]);

  const handleSave = () => {
    onSave(config);
  };

  const handleCancel = () => {
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleCancel}
      title="Quick Edit Configuration"
      size="medium"
    >
      <div className="space-y-4">
        <FormField
          label="Edit Field"
          type="text"
          value={config.field || ''}
          onChange={(e) => setConfig({ ...config, field: e.target.value })}
          placeholder="Enter field name"
        />

        <FormField
          label="New Value"
          type="text"
          value={config.value || ''}
          onChange={(e) => setConfig({ ...config, value: e.target.value })}
          placeholder="Enter new value"
        />

        <FormField
          label="Notes"
          type="textarea"
          value={config.notes || ''}
          onChange={(e) => setConfig({ ...config, notes: e.target.value })}
          placeholder="Optional notes"
        />
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
          {loading ? <Spinner size="small" /> : 'Save Changes'}
        </Button>
      </div>
    </Modal>
  );
};

export default QuickEditConfigModal;