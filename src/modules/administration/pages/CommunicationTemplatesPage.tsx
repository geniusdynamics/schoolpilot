import React, { useState } from 'react';
import { TemplateType } from '@/modules/administration/data/types';
import Card from '@/components/ui/Card';
import { DataGrid } from '@/components/ui/data';
import Button from '@/components/ui/Button';

import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Textarea from '@/components/ui/Textarea';
import { PlusIcon, PencilIcon, TrashIcon, EnvelopeIcon } from '@heroicons/react/24/outline';
import { useTemplateCommData, type TemplateCommRecord as TemplateComm } from '../data/useTemplateCommData';

import DialogForm from '@/components/ui/forms/DialogForm';
import FormSection from '@/components/ui/forms/FormSection';
import FormField from '@/components/ui/forms/FormField';
import FormActions from '@/components/ui/forms/FormActions';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/hooks/useToast';

type TemplateFormData = Omit<Partial<TemplateComm>, 'id' | 'created_at' | 'updated_at' | 'type'> & {
    type: TemplateType; // Make type required
};

const CommunicationTemplatesPage: React.FC = () => {
  const {
    data: templateComms,
    create: addTemplateComm,
    update: updateTemplateComm,
    remove: deleteTemplateComm
  } = useTemplateCommData(); // Use module-specific hook
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<TemplateComm | null>(null);
  const initialFormData: TemplateFormData = { 
    name: '', 
    type: TemplateType.SMS, 
    subject: '', 
    body_template: '' 
  };
  const [formData, setFormData] = useState<TemplateFormData>(initialFormData);

  const openModal = (template?: TemplateComm) => {
    setEditingTemplate(template || null);
    setFormData(template ? 
      { name: template.name, type: template.type, subject: template.subject, body_template: template.body_template } : 
      initialFormData
    );
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingTemplate(null);
    setFormData(initialFormData);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name === 'type') {
        setFormData(prev => ({ ...prev, [name]: value as TemplateType }));
    } else {
        setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const toast = useToast();
  const handleSubmit = async () => {
    if (!formData.name || !formData.type || !formData.body_template) {
      toast.showWarning(t('validation.templateNameTypeAndBodyAreRequired'));
      return;
    }
    if ((formData.type === TemplateType.EMAIL || formData.type === TemplateType.PUSH_NOTIFICATION) && !formData.subject) {
        toast.showWarning(t('validation.subjectIsRequiredForEmailAndPushNotificationTemplates'));
        return;
    }

    const payload: Omit<TemplateComm, 'id' | 'created_at' | 'updated_at'> = {
      name: formData.name!,
      type: formData.type,
      subject: formData.type !== TemplateType.SMS ? formData.subject || undefined : undefined,
      body_template: formData.body_template!,
    };

    if (editingTemplate) {
      await updateTemplateComm(String(editingTemplate.id), payload);
    } else {
      await addTemplateComm(payload);
    }
    closeModal();
  };

  const confirm = useConfirm();
  const handleDelete = async (id: string) => {
    if ((await confirm({ variant: 'danger', message: 'Are you sure you want to delete this communication template?' }))) {
      await deleteTemplateComm(id);
    }
  };

  const columns = [
    { 
      key: 'id' as keyof TemplateComm, 
      header: 'ID',
      sortable: true,
      width: '80px'
    },
    { 
      key: 'name' as keyof TemplateComm, 
      header: 'Template Name',
      sortable: true,
      filterable: true
    },
    { 
      key: 'type' as keyof TemplateComm, 
      header: 'Type',
      sortable: true,
      filterable: true,
      width: '120px'
    },
    { 
      key: 'subject' as keyof TemplateComm, 
      header: 'Subject',
      sortable: true,
      filterable: true,
      render: (value: any, item: TemplateComm) => item.subject || '-'
    },
    { 
      key: 'body_template' as keyof TemplateComm, 
      header: 'Body Preview',
      render: (value: any, item: TemplateComm) => (
        <p className="truncate max-w-xs" title={item.body_template}>
          {item.body_template}
        </p>
      )
    },
    {
      key: 'actions',
      header: 'Actions',
      width: '200px',
      render: (value: any, item: TemplateComm) => (
        <div className="flex space-x-2">
          <Button 
            size="sm" 
            variant="ghost" 
            onClick={(e) => {
              e.stopPropagation();
              openModal(item);
            }} 
            leftIcon={<PencilIcon className="w-4 h-4" />}
          >
            Edit
          </Button>
          <Button 
            size="sm" 
            variant="danger" 
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(item.id);
            }} 
            leftIcon={<TrashIcon className="w-4 h-4" />}
          >
            Delete
          </Button>
        </div>
      ),
    },
  ];

  // Module-specific hooks don't have loading states like global context
  // Remove loading check since data is immediately available

  return (
    <div className="space-y-6">
      <Card title="Communication Templates Management" actions={
        <Button onClick={() => openModal()} leftIcon={<PlusIcon className="w-5 h-5" />}>
          Add Template
        </Button>
      }>
        <p className="text-sm text-surface-muted-fg mb-4">
          Create and manage templates for SMS, Email, and Push Notifications. Use placeholders like {"{{student_name}}"}, {"{{parent_name}}"}, {"{{balance}}"} in the body/subject.
        </p>
        <DataGrid
          columns={columns}
          data={templateComms}
          sortable={true}
          filterable={true}
          selectable={false}
          emptyState={
            <div className="text-center py-12">
              <EnvelopeIcon className="mx-auto h-12 w-12 text-surface-muted-fg" />
              <h3 className="mt-2 text-sm font-medium text-surface-foreground">No templates found</h3>
              <p className="mt-1 text-sm text-surface-muted-fg">
                Get started by creating your first communication template.
              </p>
              <div className="mt-6">
                <Button onClick={() => openModal()} leftIcon={<PlusIcon className="w-5 h-5" />}>
                  Add Template
                </Button>
              </div>
            </div>
          }
          className="mt-4"
        />
      </Card>

      <DialogForm
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingTemplate ? 'Edit Template' : 'Add New Template'}
        size="xl"
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
      >
        <FormSection columns={2}>
          <FormField label="Template Name" required>
            <Input
              name="name"
              value={formData.name || ''}
              onChange={handleInputChange}
              required
            />
          </FormField>
          <FormField label="Template Type" required>
            <Select
              name="type"
              value={formData.type}
              onChange={handleInputChange}
              required
            >
              {Object.values(TemplateType).map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </Select>
          </FormField>
          {(formData.type === TemplateType.EMAIL || formData.type === TemplateType.PUSH_NOTIFICATION) && (
            <FormField label="Subject" required={formData.type === TemplateType.EMAIL || formData.type === TemplateType.PUSH_NOTIFICATION}>
              <Input
                name="subject"
                value={formData.subject || ''}
                onChange={handleInputChange}
              />
            </FormField>
          )}
        </FormSection>
        <FormSection>
          <FormField label="Template Body" required>
            <Textarea
              name="body_template"
              value={formData.body_template || ''}
              onChange={handleInputChange}
              rows={6}
              placeholder="Enter template content. Use placeholders like {{student_name}}, {{balance}}..."
              required
            />
          </FormField>
        </FormSection>
        <div className="mt-2 text-xs text-surface-muted-fg">
          Available placeholders (examples): {"{{student_name}}"}, {"{{parent_name}}"}, {"{{first_name}}"}, {"{{last_name}}"}, {"{{admission_no}}"}, {"{{class_name}}"}, {"{{balance}}"}, {"{{due_date}}"}, {"{{event_name}}"}, {"{{school_name}}."}
        </div>
        <FormActions>
          <Button variant="secondary" onClick={closeModal}>Cancel</Button>
          <Button type="submit">
            {editingTemplate ? 'Save Changes' : 'Add Template'}
          </Button>
        </FormActions>
      </DialogForm>
    </div>
  );
};

export default CommunicationTemplatesPage;

export const CommunicationTemplatesContent = CommunicationTemplatesPage;
