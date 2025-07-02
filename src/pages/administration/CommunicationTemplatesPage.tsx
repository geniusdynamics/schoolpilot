import React, { useState } from 'react';
import { AdminTemplateCommType as TemplateComm, TemplateType } from '../../modules/administration/data/types';
import Card from '../../components/ui/Card';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Textarea from '../../components/ui/Textarea';
import { PlusIcon, EditIcon, DeleteIcon, EnvelopeIcon } from '../../components/ui/icons';
import { useAppData } from '@/contexts/AppDataContext'; // Updated
import Spinner from '../../components/ui/Spinner';
import { useTranslation } from 'react-i18next';

type TemplateFormData = Omit<Partial<TemplateComm>, 'id' | 'created_at' | 'updated_at' | 'type'> & {
    type: TemplateType; // Make type required
};

const CommunicationTemplatesPage: React.FC = () => {
  const { 
    templatesComm, 
    loading, 
    addTemplateComm, 
    updateTemplateComm, 
    deleteTemplateComm 
  } = useAppData(); // Updated
  
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

  const handleSubmit = async () => {
    if (!formData.name || !formData.type || !formData.body_template) {
      alert("Template name, type, and body are required.");
      return;
    }
    if ((formData.type === TemplateType.EMAIL || formData.type === TemplateType.PUSH_NOTIFICATION) && !formData.subject) {
        alert("Subject is required for Email and Push Notification templates.");
        return;
    }

    const payload: Omit<TemplateComm, 'id' | 'created_at' | 'updated_at'> = {
      name: formData.name!,
      type: formData.type,
      subject: formData.type !== TemplateType.SMS ? formData.subject || undefined : undefined,
      body_template: formData.body_template!,
    };

    if (editingTemplate) {
      await updateTemplateComm({ ...editingTemplate, ...payload });
    } else {
      await addTemplateComm(payload);
    }
    closeModal();
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this communication template?')) {
      await deleteTemplateComm(id);
    }
  };

  const columns = [
    { header: 'ID', accessor: 'id' as keyof TemplateComm },
    { header: 'Template Name', accessor: 'name' as keyof TemplateComm },
    { header: 'Type', accessor: 'type' as keyof TemplateComm },
    { header: 'Subject', accessor: 'subject' as keyof TemplateComm, render: (item: TemplateComm) => item.subject || '-' },
    { header: 'Body Preview', accessor: 'body_template' as keyof TemplateComm, render: (item: TemplateComm) => <p className="truncate max-w-xs">{item.body_template}</p> },
    {
      header: 'Actions',
      accessor: 'id' as keyof TemplateComm,
      render: (item: TemplateComm) => (
        <div className="space-x-2">
          <Button size="sm" variant="ghost" onClick={() => openModal(item)} leftIcon={<EditIcon className="w-4 h-4" />}>Edit</Button>
          <Button size="sm" variant="danger" onClick={() => handleDelete(item.id)} leftIcon={<DeleteIcon className="w-4 h-4" />}>Delete</Button>
        </div>
      ),
    },
  ];

  if (loading.templatesComm && !isModalOpen) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner size="lg" /> <span className="ml-2">Loading Communication Templates...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card title="Communication Templates Management" actions={
        <Button onClick={() => openModal()} leftIcon={<PlusIcon className="w-5 h-5" />}>
          Add Template
        </Button>
      }>
        <p className="text-sm text-gray-600 mb-4">
          Create and manage templates for SMS, Email, and Push Notifications. Use placeholders like {"{{student_name}}"}, {"{{parent_name}}"}, {"{{balance}}"} in the body/subject.
        </p>
        <Table columns={columns} data={templatesComm} isLoading={loading.templatesComm && isModalOpen} />
      </Card>

      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingTemplate ? 'Edit Template' : 'Add New Template'} size="xl"
        footer={
          <>
            <Button variant="secondary" onClick={closeModal}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={loading.templatesComm}>
              {loading.templatesComm ? <Spinner size="sm"/> : (editingTemplate ? 'Save Changes' : 'Add Template')}
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input 
                name="name" 
                label="Template Name" 
                value={formData.name || ''} 
                onChange={handleInputChange} 
                required 
                containerClassName="md:col-span-2"
            />
            <Select 
                name="type" 
                label="Template Type" 
                value={formData.type} 
                onChange={handleInputChange}
                required
                >
                {Object.values(TemplateType).map((type) => (
                    <option key={type} value={type}>{type}</option>
                ))}
            </Select>
            {(formData.type === TemplateType.EMAIL || formData.type === TemplateType.PUSH_NOTIFICATION) && (
                 <Input 
                    name="subject" 
                    label="Subject" 
                    value={formData.subject || ''} 
                    onChange={handleInputChange} 
                    required={formData.type === TemplateType.EMAIL || formData.type === TemplateType.PUSH_NOTIFICATION}
                />
            )}
        </div>
         <Textarea
            name="body_template"
            label="Template Body"
            value={formData.body_template || ''}
            onChange={handleInputChange}
            rows={6}
            placeholder="Enter template content. Use placeholders like {{student_name}}, {{balance}}..."
            containerClassName="mt-4"
            required
        />
        <div className="mt-2 text-xs text-gray-500">
            Available placeholders (examples): {"{{student_name}}"}, {"{{parent_name}}"}, {"{{first_name}}"}, {"{{last_name}}"}, {"{{admission_no}}"}, {"{{class_name}}"}, {"{{balance}}"}, {"{{due_date}}"}, {"{{event_name}}"}, {"{{school_name}}."}
        </div>
      </Modal>
    </div>
  );
};

export default CommunicationTemplatesPage;
