import React, { useState, useEffect, useMemo } from 'react';
import { CampaignStatus, CampaignAudienceType, TemplateType } from '@/modules/administration/data/types';
import Card from '@/components/ui/Card';
import { DataGrid, DataGridColumn } from '@/components/ui/data';
import Button from '@/components/ui/Button';

import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Textarea from '@/components/ui/Textarea';
import { PlusIcon, EditIcon, DeleteIcon, MegaphoneIcon } from '@/components/ui/icons';
import { useCampaignData, type CampaignRecord as Campaign } from '@/modules/administration/data/useCampaignData';
import { useTemplateCommData, type TemplateCommRecord as TemplateComm } from '@/modules/administration/data/useTemplateCommData';
import { useAppData } from '@/hooks/useAppData'; // For classStreams only
import { useUser } from '@/contexts/UserContext'; // Import useUser
import { useTranslation } from 'react-i18next';
import DialogForm from '@/components/ui/forms/DialogForm';
import FormSection from '@/components/ui/forms/FormSection';
import FormField from '@/components/ui/forms/FormField';
import FormActions from '@/components/ui/forms/FormActions';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/hooks/useToast';

type CampaignFormData = Omit<Partial<Campaign>, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'template_name' | 'created_by_name' | 'target_audience_display' | 'approved_by' | 'status' | 'template_id' | 'target_audience_type' | 'approved_by_name'> & {
    status: CampaignStatus;
    template_id?: string;
    target_audience_type?: CampaignAudienceType;
};


export const MessageCampaignsContent: React.FC = () => {
  const { campaigns, addCampaign, updateCampaign, deleteCampaign } = useCampaignData();
  const { templateComms } = useTemplateCommData();
  const { classStreams = [] } = useAppData(); // For classStreams only
  
  const { currentUser } = useUser(); // Get currentUser
  const { t } = useTranslation('administration');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  
  const initialFormData: CampaignFormData = { 
    name: '', 
    template_id: undefined,
    subject: '',
    body: '',
    status: CampaignStatus.DRAFT, 
    target_audience_type: undefined,
    target_id: undefined,
    scheduled_for: new Date(new Date().setDate(new Date().getDate() + 1)).toISOString().slice(0, 16) 
  };
  const [formData, setFormData] = useState<CampaignFormData>(initialFormData);
  
  const selectedTemplate = useMemo(() => {
    return (templateComms || []).find((t: TemplateComm) => t.id === formData.template_id);
  }, [templateComms, formData.template_id]);

  useEffect(() => {
    if (selectedTemplate && !editingCampaign) { 
        setFormData(prev => ({
            ...prev,
            subject: selectedTemplate.subject || '',
            body: selectedTemplate.body_template || ''
        }));
    }
  }, [selectedTemplate, editingCampaign]);


  const openModal = (campaign?: Campaign) => {
    setEditingCampaign(campaign || null);
    setFormData(campaign ? 
      { 
        name: campaign.name, 
        template_id: campaign.template_id,
        subject: campaign.subject || '', 
        body: campaign.body || '', 
        status: campaign.status, 
        target_audience_type: campaign.target_audience_type,
        target_id: campaign.target_id,
        scheduled_for: campaign.scheduled_for ? new Date(campaign.scheduled_for).toISOString().slice(0,16) : initialFormData.scheduled_for
      } : 
      initialFormData
    );
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingCampaign(null);
    setFormData(initialFormData);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    let processedValue: string | undefined = value;
    if (name === 'template_id') {
        processedValue = value || undefined;
    }
    
    setFormData(prev => {
        const newState = {...prev, [name]: processedValue};
        if (name === 'template_id' && processedValue) {
            const newSelectedTemplate = (templateComms || []).find((t: TemplateComm) => t.id === processedValue);
            if (newSelectedTemplate) {
                newState.subject = newSelectedTemplate.subject || '';
                newState.body = newSelectedTemplate.body_template || '';
            }
        }
        if (name === 'target_audience_type' && value !== CampaignAudienceType.STUDENTS_OF_CLASS && value !== CampaignAudienceType.PARENTS_OF_CLASS) {
            newState.target_id = undefined;
        }
        return newState;
    });
  };

  const toast = useToast();
  const handleSubmit = async () => {
    if (!formData.name || !formData.status) {
      toast.showWarning(t('validation.campaignNameAndStatusAreRequired'));
      return;
    }
    if (!formData.body) {
        toast.showWarning(t('validation.campaignBodyContentIsRequired'));
        return;
    }
    if (selectedTemplate && (selectedTemplate.type === TemplateType.EMAIL || selectedTemplate.type === TemplateType.PUSH_NOTIFICATION) && !formData.subject) {
        toast.showWarning(t('validation.subjectIsRequiredForEmailpushNotificationCampaignsBasedOnTheSelectedTemplate'));
        return;
    }
     if ((formData.target_audience_type === CampaignAudienceType.STUDENTS_OF_CLASS || formData.target_audience_type === CampaignAudienceType.PARENTS_OF_CLASS) && !formData.target_id) {
        toast.showError(t('validation.pleaseSelectAClassstreamForTheChosenTargetAudience'));
        return;
    }

    const payload: Omit<Campaign, 'id' | 'created_at' | 'updated_at' | 'approved_by' | 'template_name' | 'created_by_name' | 'target_audience_display'| 'approved_by_name'> = {
      name: formData.name!,
      template_id: formData.template_id || undefined,
      subject: formData.subject || undefined,
      body: formData.body!,
      status: formData.status!,
      target_audience_type: formData.target_audience_type || undefined,
      target_id: formData.target_id || undefined,
      scheduled_for: formData.scheduled_for ? new Date(formData.scheduled_for).toISOString() : undefined,
      created_by: currentUser!.id, // Add created_by
      // approved_by would be set through a separate approval workflow
    };

    if (editingCampaign) {
      await updateCampaign({ ...editingCampaign, ...payload, created_by: editingCampaign.created_by }); // Keep original created_by on update
    } else {
      await addCampaign(payload);
    }
    closeModal();
  };

  const confirm = useConfirm();
  const handleDelete = async (id: string) => {
    if ((await confirm({ variant: 'danger', message: 'Are you sure you want to delete this message campaign?' }))) {
      await deleteCampaign(id);
    }
  };

  const columns: DataGridColumn<Campaign>[] = [
    { 
      key: 'id', 
      header: 'ID', 
      sortable: true, 
      filterable: true, 
      width: 80,
      render: (value) => value
    },
    { 
      key: 'name', 
      header: 'Campaign Name', 
      sortable: true, 
      filterable: true, 
      width: 200,
      render: (value) => value
    },
    { 
      key: 'status', 
      header: 'Status', 
      sortable: true, 
      filterable: true, 
      width: 120,
      render: (value, item) => {
        let colorClass = 'bg-gray-200 text-surface-foreground';
        if (item.status === CampaignStatus.DRAFT) colorClass = 'bg-yellow-100 text-yellow-800';
        else if (item.status === CampaignStatus.APPROVED) colorClass = 'bg-primary-100 text-primary-800';
        else if (item.status === CampaignStatus.SENT) colorClass = 'bg-green-100 text-green-800';
        else if (item.status === CampaignStatus.CANCELLED) colorClass = 'bg-red-100 text-red-800';
        return <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${colorClass}`}>{item.status}</span>;
      }
    },
    { 
      key: 'template_name', 
      header: 'Template Used', 
      sortable: true, 
      filterable: true, 
      width: 150,
      render: (value, item) => item.template_name || 'Custom Content'
    },
    { 
      key: 'target_audience_display', 
      header: 'Target Audience', 
      sortable: true, 
      filterable: true, 
      width: 180,
      render: (value) => value
    },
    { 
      key: 'scheduled_for', 
      header: 'Scheduled For', 
      sortable: true, 
      filterable: true, 
      width: 160,
      render: (value, item) => item.scheduled_for ? new Date(item.scheduled_for).toLocaleString() : 'Not Scheduled'
    },
    { 
      key: 'created_by_name', 
      header: 'Created By', 
      sortable: true, 
      filterable: true, 
      width: 120,
      render: (value, item) => item.created_by_name || 'N/A'
    },
    {
      key: 'actions',
      header: 'Actions',
      sortable: false,
      filterable: false,
      width: 160,
      sticky: 'right',
      render: (value, item) => (
        <div className="space-x-2">
          <Button size="sm" variant="ghost" onClick={() => openModal(item)} leftIcon={<EditIcon className="w-4 h-4" />}>Edit</Button>
          <Button size="sm" variant="danger" onClick={() => handleDelete(item.id)} leftIcon={<DeleteIcon className="w-4 h-4" />}>Delete</Button>
        </div>
      ),
    },
  ];


  return (
    <div className="space-y-6">
      <Card title={t('MessageCampaignsPage.title')} actions={
        <Button onClick={() => openModal()} leftIcon={<PlusIcon className="w-5 h-5" />}>
          {t('MessageCampaignsPage.createCampaign')}
        </Button>
      }>
        <p className="text-sm text-surface-muted-fg mb-4">
          {t('MessageCampaignsPage.designAndManageCommunicationCampaigns')}
        </p>
        <DataGrid 
          columns={columns} 
          data={campaigns || []} 
          sortable 
          filterable 
          emptyState={{
            icon: <MegaphoneIcon className="h-12 w-12 text-surface-muted-fg" />,
            title: 'No message campaigns found',
            description: 'Get started by creating your first message campaign.',
          }}
        />
      </Card>

      <DialogForm
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingCampaign ? t('MessageCampaignsPage.editCampaign') : t('MessageCampaignsPage.createNewCampaign')}
        size="xl"
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
      >
        <FormSection columns={2}>
          <FormField label={t('MessageCampaignsPage.campaignName')} required>
            <Input 
              name="name"
              value={formData.name || ''}
              onChange={handleInputChange}
              required
            />
          </FormField>
          <FormField label={t('MessageCampaignsPage.communicationTemplateOptional')}>
            <Select
              name="template_id"
              value={formData.template_id || ''}
              onChange={handleInputChange}
            >
              <option value="">{t('MessageCampaignsPage.useCustomSubjectBody')}</option>
              {(templateComms || []).map((template) => (
                <option key={template.id} value={template.id}>{template.name} ({template.type})</option>
              ))}
            </Select>
          </FormField>
          <FormField label={t('MessageCampaignsPage.subjectForEmailPush')} required={!!selectedTemplate && (selectedTemplate.type === TemplateType.EMAIL || selectedTemplate.type === TemplateType.PUSH_NOTIFICATION)}>
            <Input
              name="subject"
              value={formData.subject || ''}
              onChange={handleInputChange}
              disabled={!!selectedTemplate && selectedTemplate.type === TemplateType.SMS}
            />
          </FormField>
          <FormField label={t('MessageCampaignsPage.targetAudience')}>
            <Select
              name="target_audience_type"
              value={formData.target_audience_type || ''}
              onChange={handleInputChange}
            >
              <option value="">{t('MessageCampaignsPage.selectTargetAudience')}</option>
              {Object.values(CampaignAudienceType).map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </Select>
          </FormField>
          {(formData.target_audience_type === CampaignAudienceType.STUDENTS_OF_CLASS || formData.target_audience_type === CampaignAudienceType.PARENTS_OF_CLASS) && (
            <FormField label={t('MessageCampaignsPage.selectClassStream')} required>
              <Select
                name="target_id"
                value={formData.target_id || ''}
                onChange={handleInputChange}
                required
              >
                <option value="">{t('MessageCampaignsPage.selectClassStream')}</option>
                {(classStreams || []).map(cs => <option key={cs.id} value={cs.id}>{cs.class_name} - {cs.name}</option>)}
              </Select>
            </FormField>
          )}
          <FormField label={t('MessageCampaignsPage.scheduleForOptional')}>
            <Input
              name="scheduled_for"
              type="datetime-local"
              value={formData.scheduled_for || ''}
              onChange={handleInputChange}
            />
          </FormField>
          <FormField label={t('MessageCampaignsPage.campaignStatus')} required>
            <Select
              name="status"
              value={formData.status}
              onChange={handleInputChange}
              required
            >
              {Object.values(CampaignStatus).map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </Select>
          </FormField>
        </FormSection>
        <FormSection>
          <FormField label={t('MessageCampaignsPage.campaignBodyContent')} required>
            <Textarea
              name="body"
              value={formData.body || ''}
              onChange={handleInputChange}
              rows={8}
              placeholder={t('MessageCampaignsPage.enterCampaignMessageHere')}
              required
            />
          </FormField>
        </FormSection>
        <FormActions>
          <Button variant="secondary" onClick={closeModal}>{t('MessageCampaignsPage.cancel')}</Button>
          <Button type="submit">
            {editingCampaign ? t('MessageCampaignsPage.saveChanges') : t('MessageCampaignsPage.createCampaign')}
          </Button>
        </FormActions>
      </DialogForm>
    </div>
  );
};

const MessageCampaignsPage: React.FC = () => (
  <div className="space-y-6">
    <MessageCampaignsContent />
  </div>
);

export default MessageCampaignsPage;
