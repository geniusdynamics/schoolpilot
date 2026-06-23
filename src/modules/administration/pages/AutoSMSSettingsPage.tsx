import React, { useState, useMemo } from 'react';
import { useAppData } from '@/hooks/useAppData';
import Card from '@/components/ui/Card';
import { DataGrid, DataGridColumn } from '@/components/ui/data';
import Button from '@/components/ui/Button';
import DialogForm from '@/components/ui/forms/DialogForm';
import FormSection from '@/components/ui/forms/FormSection';
import FormField from '@/components/ui/forms/FormField';
import { ChatBubbleLeftRightIcon, PlusIcon, BellIcon, CheckIcon, XMarkIcon } from '@/components/ui/icons';
import Spinner from '@/components/ui/Spinner';
import { useTranslation } from 'react-i18next';
import { initialMockAutoSMSSettings } from '../data/mockData';
import type { AutoSMSSetting, TriggerType, RecipientType } from '../data/types';

export const AutoSMSSettingsContent: React.FC = () => {
  const { t } = useTranslation('administration');
  const { loading } = useAppData();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSetting, setEditingSetting] = useState<AutoSMSSetting | null>(null);
  const [selectedTrigger, setSelectedTrigger] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const initialFormData: Partial<AutoSMSSetting> = {
    trigger_type: 'Attendance',
    trigger_name: '',
    recipient_type: 'Student',
    template_id: '',
    template_name: '',
    is_enabled: true,
    send_time: '09:00',
    conditions: ''
  };
  const [formData, setFormData] = useState<Partial<AutoSMSSetting>>(initialFormData);

  // Use centralized mock data (in production, this would come from useAppData)
  const mockSettings: AutoSMSSetting[] = useMemo(() => {
    let filtered = initialMockAutoSMSSettings;

    if (selectedTrigger) {
      filtered = filtered.filter(s => s.trigger_type === selectedTrigger);
    }

    if (searchTerm) {
      filtered = filtered.filter(s => 
        (s.trigger_name?.toLowerCase() ?? '').includes(searchTerm.toLowerCase()) ||
        (s.template_name?.toLowerCase() ?? '').includes(searchTerm.toLowerCase())
      );
    }

    return filtered;
  }, [selectedTrigger, searchTerm]);

  const openModal = (setting?: AutoSMSSetting) => {
    setEditingSetting(setting || null);
    setFormData(setting ? {
      trigger_type: setting.trigger_type,
      trigger_name: setting.trigger_name,
      recipient_type: setting.recipient_type,
      template_id: setting.template_id,
      template_name: setting.template_name,
      is_enabled: setting.is_enabled,
      send_time: setting.send_time,
      conditions: setting.conditions
    } : initialFormData);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingSetting(null);
    setFormData(initialFormData);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ 
      ...prev, 
      [name]: name === 'is_enabled' ? (e.target as HTMLInputElement).checked : value 
    }));
  };

  const handleSubmit = () => {
    if (!formData.trigger_name || !formData.template_id) {
      alert('Trigger name and template are required.');
      return;
    }
    console.log('Saving auto-SMS setting:', formData);
    closeModal();
  };

  const toggleEnabled = (setting: AutoSMSSetting) => {
    console.log('Toggling setting:', setting.id, !setting.is_enabled);
  };

  const getTriggerBadge = (type: TriggerType) => {
    const styles = {
      'Attendance': 'bg-blue-100 text-blue-800',
      'Fees Due': 'bg-red-100 text-red-800',
      'Exam Results': 'bg-green-100 text-green-800',
      'Announcements': 'bg-purple-100 text-purple-800',
      'Birthday': 'bg-pink-100 text-pink-800'
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[type]}`}>
        {type}
      </span>
    );
  };

  const columns: DataGridColumn<AutoSMSSetting>[] = [
    {
      key: 'trigger_name',
      header: 'Trigger Name',
      sortable: true,
      filterable: true
    },
    {
      key: 'trigger_type',
      header: 'Trigger Type',
      sortable: true,
      render: (value) => getTriggerBadge(value)
    },
    {
      key: 'recipient_type',
      header: 'Recipient',
      sortable: true,
      render: (value) => value
    },
    {
      key: 'template_name',
      header: 'Template',
      sortable: true,
      render: (value) => value
    },
    {
      key: 'send_time',
      header: 'Send Time',
      sortable: true,
      render: (value) => value || '-'
    },
    {
      key: 'conditions',
      header: 'Conditions',
      sortable: false,
      render: (value) => value || '-'
    },
    {
      key: 'is_enabled',
      header: 'Status',
      sortable: true,
      render: (value, record) => (
        <button
          onClick={() => toggleEnabled(record)}
          className={`px-2 py-1 rounded-full text-xs font-medium ${value ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}
        >
          {value ? 'Enabled' : 'Disabled'}
        </button>
      )
    },
    {
      key: 'actions',
      header: 'Actions',
      sortable: false,
      render: (_, record) => (
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => openModal(record)}>
            Edit
          </Button>
        </div>
      )
    }
  ];

  const triggerTypes: TriggerType[] = ['Attendance', 'Fees Due', 'Exam Results', 'Announcements', 'Birthday'];
  const recipientTypes: RecipientType[] = ['Student', 'Staff', 'Parent', 'All'];

  const totals = useMemo(() => {
    return {
      total: mockSettings.length,
      enabled: mockSettings.filter(s => s.is_enabled).length,
      disabled: mockSettings.filter(s => !s.is_enabled).length
    };
  }, [mockSettings]);

  if (loading?.all && mockSettings.length === 0) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner size="lg" />
        <span className="ml-2">Loading auto-SMS settings...</span>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-gray-800">Auto-Send SMS Settings</h1>
        <Button onClick={() => openModal()} variant="primary">
          <PlusIcon className="w-4 h-4 mr-2" />
          Add Rule
        </Button>
      </div>
      <Card>
        <div className="mb-6 p-4 bg-violet-50 border border-violet-200 rounded-lg">
          <div className="flex items-start gap-3">
            <BellIcon className="w-5 h-5 text-violet-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-violet-800">Trigger-Based SMS Automation</h3>
              <p className="text-sm text-violet-700 mt-1">
                Configure automatic SMS notifications triggered by events like attendance, fees due, exam results, 
                announcements, and birthdays. Set recipient types, templates, and conditions for each automation rule.
              </p>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-gray-600">
              <ChatBubbleLeftRightIcon className="w-5 h-5" />
              <span className="text-sm font-medium">Total Rules</span>
            </div>
            <p className="text-2xl font-bold text-gray-800 mt-2">
              {totals.total}
            </p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-gray-600">
              <CheckIcon className="w-5 h-5 text-green-600" />
              <span className="text-sm font-medium">Enabled</span>
            </div>
            <p className="text-2xl font-bold text-green-600 mt-2">
              {totals.enabled}
            </p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-gray-600">
              <XMarkIcon className="w-5 h-5 text-gray-600" />
              <span className="text-sm font-medium">Disabled</span>
            </div>
            <p className="text-2xl font-bold text-gray-600 mt-2">
              {totals.disabled}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 flex gap-4 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Trigger Type</label>
            <select
              value={selectedTrigger}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedTrigger(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="">All Triggers</option>
              {triggerTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <input
              type="text"
              placeholder="Trigger, template..."
              value={searchTerm}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </div>
        </div>

        <DataGrid
          data={mockSettings}
          columns={columns}
        />
      </Card>

      {/* Add/Edit Rule Modal */}
      <DialogForm
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingSetting ? 'Edit Auto-SMS Rule' : 'Add Auto-SMS Rule'}
      >
        <FormSection>
          <FormField label="Trigger Name" required>
            <input
              type="text"
              name="trigger_name"
              value={formData.trigger_name}
              onChange={handleInputChange}
              placeholder="e.g., Daily Attendance Notification"
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </FormField>

          <FormField label="Trigger Type" required>
            <select
              name="trigger_type"
              value={formData.trigger_type}
              onChange={handleInputChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              {triggerTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </FormField>

          <FormField label="Recipient Type" required>
            <select
              name="recipient_type"
              value={formData.recipient_type}
              onChange={handleInputChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              {recipientTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </FormField>

          <FormField label="Template" required>
            <select
              name="template_id"
              value={formData.template_id}
              onChange={handleInputChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="">Select template</option>
              <option value="tpl-001">Attendance Alert</option>
              <option value="tpl-002">Fee Reminder</option>
              <option value="tpl-003">Result Notification</option>
              <option value="tpl-004">Announcement Template</option>
              <option value="tpl-005">Birthday Wishes</option>
            </select>
          </FormField>

          <FormField label="Send Time">
            <input
              type="time"
              name="send_time"
              value={formData.send_time}
              onChange={handleInputChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </FormField>

          <FormField label="Conditions">
            <input
              type="text"
              name="conditions"
              value={formData.conditions}
              onChange={handleInputChange}
              placeholder="e.g., When marked absent"
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </FormField>

          <FormField label="Status">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                name="is_enabled"
                checked={formData.is_enabled}
                onChange={handleInputChange}
                className="w-4 h-4"
              />
              <span>Enable this rule</span>
            </label>
          </FormField>
        </FormSection>

        <div className="flex justify-end gap-3 mt-6">
          <Button onClick={closeModal} variant="secondary">
            Cancel
          </Button>
          <Button onClick={handleSubmit} variant="primary">
            {editingSetting ? 'Update' : 'Add'}
          </Button>
        </div>
      </DialogForm>
    </div>
  );
};

const AutoSMSSettingsPage: React.FC = () => (
  <div className="space-y-6">
    <AutoSMSSettingsContent />
  </div>
);

export default AutoSMSSettingsPage;
