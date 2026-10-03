// ABOUTME: Dialog component for configuring quick edit fields
// ABOUTME: Allows users to customize which fields appear in the quick edit slideout

import React, { useState, useEffect } from 'react';
import DialogForm from '../../../components/ui/forms/DialogForm';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';

import FormActions from '../../../components/ui/forms/FormActions';
import { PlusIcon, XIcon } from '@/components/ui/icons';
import {
  QuickEditConfig,
  QuickEditField,
  getQuickEditConfig,
  saveQuickEditConfig,
  resetQuickEditConfig,
  DEFAULT_QUICK_EDIT_CONFIG
} from '../config/quickEditConfig';

interface QuickEditConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigUpdate: (config: QuickEditConfig) => void;
}

const QuickEditConfigModal: React.FC<QuickEditConfigModalProps> = ({
  isOpen,
  onClose,
  onConfigUpdate,
}) => {
  const [config, setConfig] = useState<QuickEditConfig>(getQuickEditConfig());
  const [activeTab, setActiveTab] = useState<'fields' | 'styling'>('fields');

  useEffect(() => {
    if (isOpen) {
      setConfig(getQuickEditConfig());
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveQuickEditConfig(config);
    onConfigUpdate(config);
    onClose();
  };

  const handleReset = () => {
    resetQuickEditConfig();
    setConfig(DEFAULT_QUICK_EDIT_CONFIG);
  };

  const addField = () => {
    const newField: QuickEditField = {
      key: '',
      label: '',
      type: 'text',
      section: 'basic',
    };
    setConfig(prev => ({
      ...prev,
      fields: [...prev.fields, newField],
    }));
  };

  const removeField = (index: number) => {
    setConfig(prev => ({
      ...prev,
      fields: prev.fields.filter((_, i) => i !== index),
    }));
  };

  const updateField = (index: number, updates: Partial<QuickEditField>) => {
    setConfig(prev => ({
      ...prev,
      fields: prev.fields.map((field, i) =>
        i === index ? { ...field, ...updates } : field
      ),
    }));
  };

  const availableFields = [
    { value: 'first_name', label: 'First Name' },
    { value: 'last_name', label: 'Last Name' },
    { value: 'middle_name', label: 'Middle Name' },
    { value: 'status', label: 'Status' },
    { value: 'gender', label: 'Gender' },
    { value: 'date_of_birth', label: 'Date of Birth' },
    { value: 'admission_date', label: 'Admission Date' },
    { value: 'current_class_stream_id', label: 'Class Stream' },
    { value: 'student_category_id', label: 'Student Category' },
    { value: 'dormitory_id', label: 'Dormitory' },
    { value: 'primary_guardian_name', label: 'Guardian Name' },
    { value: 'primary_guardian_phone', label: 'Guardian Phone' },
    { value: 'religion', label: 'Religion' },
    { value: 'county', label: 'County' },
  ];

  return (
    <DialogForm
      isOpen={isOpen}
      onClose={onClose}
      title="Configure Quick Edit"
      size="lg"
      onSubmit={handleSubmit}
    >
      <div className="space-y-6">
        {/* Tab Navigation */}
        <div className="border-b border-surface-border">
          <nav className="-mb-px flex space-x-8">
            <button
              type="button"
              onClick={() => setActiveTab('fields')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'fields'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-surface-muted-fg hover:text-surface-foreground hover:border-surface-border'
              }`}
            >
              Fields Configuration
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('styling')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'styling'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-surface-muted-fg hover:text-surface-foreground hover:border-surface-border'
              }`}
            >
              Styling Options
            </button>
          </nav>
        </div>

        {/* Fields Configuration Tab */}
        {activeTab === 'fields' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium text-surface-foreground">Quick Edit Fields</h3>
              <Button size="sm" onClick={addField} leftIcon={<PlusIcon className="w-4 h-4" />}>
                Add Field
              </Button>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {config.fields.map((field, index) => (
                <div key={index} className="border border-surface-border rounded-lg p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="grid grid-cols-2 gap-3 flex-1">
                      <Select
                        label="Field"
                        value={field.key}
                        onChange={(e) => updateField(index, { key: e.target.value })}
                      >
                        <option value="">Select Field</option>
                        {availableFields.map(option => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </Select>
                      <Input
                        label="Label"
                        value={field.label}
                        onChange={(e) => updateField(index, { label: e.target.value })}
                      />
                      <Select
                        label="Type"
                        value={field.type}
                        onChange={(e) => updateField(index, { type: e.target.value as any })}
                      >
                        <option value="text">Text</option>
                        <option value="select">Select</option>
                        <option value="date">Date</option>
                        <option value="number">Number</option>
                      </Select>
                      <Select
                        label="Section"
                        value={field.section || 'basic'}
                        onChange={(e) => updateField(index, { section: e.target.value as any })}
                      >
                        <option value="basic">Basic</option>
                        <option value="academic">Academic</option>
                        <option value="guardian">Guardian</option>
                      </Select>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeField(index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <XIcon className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex items-center space-x-4">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={field.required || false}
                        onChange={(e) => updateField(index, { required: e.target.checked })}
                        className="rounded border-surface-border text-primary-600 focus:ring-primary-500"
                      />
                      <span className="ml-2 text-sm text-surface-foreground">Required</span>
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Styling Options Tab */}
        {activeTab === 'styling' && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-surface-foreground">Styling Options</h3>

            <div className="grid grid-cols-2 gap-4">
              <Select
                label="Theme"
                value={config.styling.theme}
                onChange={(e) => setConfig(prev => ({
                  ...prev,
                  styling: { ...prev.styling, theme: e.target.value as 'dark' | 'light' }
                }))}
              >
                <option value="dark">Dark</option>
                <option value="light">Light</option>
              </Select>

              <Input
                label="Accent Color"
                type="color"
                value={config.styling.accentColor}
                onChange={(e) => setConfig(prev => ({
                  ...prev,
                  styling: { ...prev.styling, accentColor: e.target.value }
                }))}
              />
            </div>

            <div className="bg-surface-muted p-4 rounded-lg">
              <h4 className="font-medium text-surface-foreground mb-2">Preview</h4>
              <div
                className={`p-3 rounded border ${
                  config.styling.theme === 'dark'
                    ? 'bg-slate-800 border-slate-600 text-white'
                    : 'bg-surface-card border-surface-border text-surface-foreground'
                }`}
                style={{ borderRadius: config.styling.borderRadius }}
              >
                <div className="flex items-center space-x-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: config.styling.accentColor }}
                  />
                  <span className="text-sm">Quick Edit Preview</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Form Actions */}
      <FormActions>
        <div className="flex justify-between w-full">
          <Button variant="outline" onClick={handleReset}>
            Reset to Default
          </Button>
          <div className="space-x-3">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">
              Save Configuration
            </Button>
          </div>
        </div>
      </FormActions>
    </DialogForm>
  );
};

export default QuickEditConfigModal;

