import React, { useState, useEffect, useMemo } from 'react';
import { Staff, Class, ClassStream } from '@/types';
import { AdminCampaignType as Campaign, CampaignStatus, CampaignAudienceType, AdminTemplateCommType as TemplateComm, TemplateType } from '@/modules/administration/data/types';
import Card from '@/components/ui/Card';
import Table from '@/components/ui/Table';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Textarea from '@/components/ui/Textarea';
import { PlusIcon, EditIcon, DeleteIcon, MegaphoneIcon } from '@/components/ui/icons';
import { useCampaignData } from '@/modules/administration/data/useCampaignData';
import { useTemplateCommData } from '@/modules/administration/data/useTemplateCommData';
import { useAppData } from '@/contexts/AppDataContext'; // For classStreams only
import Spinner from '@/components/ui/Spinner';
import { useUser } from '@/contexts/UserContext'; // Import useUser
import { useTranslation } from 'react-i18next';

type CampaignFormData = Omit<Partial<Campaign>, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'template_name' | 'created_by_name' | 'target_audience_display' | 'approved_by' | 'status' | 'template_id' | 'target_audience_type' | 'approved_by_name'> & {
    status: CampaignStatus;
    template_id?: number;
    target_audience_type?: CampaignAudienceType;
};


const MessageCampaignsPage: React.FC = () => {
  const { campaigns, addCampaign, updateCampaign, deleteCampaign } = useCampaignData();
  const { templateComms } = useTemplateCommData();
  const { classStreams = [] } = useAppData(); // For classStreams only
  
  const { currentUser } = useUser(); // Get currentUser
  const { t } = useTranslation();

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
    return templateComms.find((t: TemplateComm) => t.id === formData.template_id);
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
    let processedValue: string | number | undefined = value;
    if (name === 'template_id') {
        processedValue = value ? parseInt(value) : undefined;
    }
    
    setFormData(prev => {
        const newState = {...prev, [name]: processedValue};
        if (name === 'template_id' && processedValue) {
            const newSelectedTemplate = templateComms.find((t: TemplateComm) => t.id === processedValue);
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

  const handleSubmit = async () => {
    if (!formData.name || !formData.status) {
      alert("Campaign name and status are required.");
      return;
    }
    if (!formData.body) {
        alert("Campaign body content is required.");
        return;
    }
    if (selectedTemplate && (selectedTemplate.type === TemplateType.EMAIL || selectedTemplate.type === TemplateType.PUSH_NOTIFICATION) && !formData.subject) {
        alert("Subject is required for Email/Push Notification campaigns based on the selected template.");
        return;
    }
     if ((formData.target_audience_type === CampaignAudienceType.STUDENTS_OF_CLASS || formData.target_audience_type === CampaignAudienceType.PARENTS_OF_CLASS) && !formData.target_id) {
        alert("Please select a class/stream for the chosen target audience.");
        return;
    }

    const payload: Omit<Campaign, 'id' | 'created_at' | 'updated_at' | 'approved_by' | 'template_name' | 'created_by_name' | 'target_audience_display'| 'approved_by_name'> = {
      name: formData.name!,
      template_id: formData.template_id ? Number(formData.template_id) : undefined,
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

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this message campaign?')) {
      deleteCampaign(id);
    }
  };

  const columns = [
    { header: 'ID', accessor: 'id' as keyof Campaign },
    { header: 'Campaign Name', accessor: 'name' as keyof Campaign },
    { header: 'Status', accessor: 'status' as keyof Campaign, 
        render: (item: Campaign) => {
            let colorClass = 'bg-gray-200 text-gray-800';
            if (item.status === CampaignStatus.DRAFT) colorClass = 'bg-yellow-100 text-yellow-800';
            else if (item.status === CampaignStatus.APPROVED) colorClass = 'bg-blue-100 text-blue-800';
            else if (item.status === CampaignStatus.SENT) colorClass = 'bg-green-100 text-green-800';
            else if (item.status === CampaignStatus.CANCELLED) colorClass = 'bg-red-100 text-red-800';
            return <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${colorClass}`}>{item.status}</span>;
        } 
    },
    { header: 'Template Used', accessor: (item: Campaign) => item.template_name || 'Custom Content' },
    { header: 'Target Audience', accessor: 'target_audience_display' as keyof Campaign },
    { header: 'Scheduled For', accessor: 'scheduled_for' as keyof Campaign, render: (item: Campaign) => item.scheduled_for ? new Date(item.scheduled_for).toLocaleString() : 'Not Scheduled' },
    { header: 'Created By', accessor: (item: Campaign) => item.created_by_name || 'N/A' },
    {
      header: 'Actions',
      accessor: 'id' as keyof Campaign,
      render: (item: Campaign) => (
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
        <p className="text-sm text-gray-600 mb-4">
          {t('MessageCampaignsPage.designAndManageCommunicationCampaigns')}
        </p>
        <Table columns={columns} data={campaigns} />
      </Card>

      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingCampaign ? t('MessageCampaignsPage.editCampaign') : t('MessageCampaignsPage.createNewCampaign')} size="xl"
        footer={
          <>
            <Button variant="secondary" onClick={closeModal}>{t('MessageCampaignsPage.cancel')}</Button>
            <Button onClick={handleSubmit}>
              {editingCampaign ? t('MessageCampaignsPage.saveChanges') : t('MessageCampaignsPage.createCampaign')}
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input 
                name="name" 
                label={t('MessageCampaignsPage.campaignName')} 
                value={formData.name || ''} 
                onChange={handleInputChange} 
                required 
                containerClassName="md:col-span-2"
            />
            <Select 
                name="template_id" 
                label={t('MessageCampaignsPage.communicationTemplateOptional')} 
                value={formData.template_id || ''} 
                onChange={handleInputChange}
                >
                <option value="">{t('MessageCampaignsPage.useCustomSubjectBody')}</option>
                {templateComms.map((template) => (
                    <option key={template.id} value={template.id}>{template.name} ({template.type})</option>
                ))}
            </Select>
            <Input 
                name="subject" 
                label={t('MessageCampaignsPage.subjectForEmailPush')} 
                value={formData.subject || ''} 
                onChange={handleInputChange} 
                disabled={!!selectedTemplate && selectedTemplate.type === TemplateType.SMS}
                required={!!selectedTemplate && (selectedTemplate.type === TemplateType.EMAIL || selectedTemplate.type === TemplateType.PUSH_NOTIFICATION)}
            />
            <Select 
                name="target_audience_type" 
                label={t('MessageCampaignsPage.targetAudience')} 
                value={formData.target_audience_type || ''} 
                onChange={handleInputChange}
                >
                <option value="">{t('MessageCampaignsPage.selectTargetAudience')}</option>
                {Object.values(CampaignAudienceType).map((type) => (
                    <option key={type} value={type}>{type}</option>
                ))}
            </Select>
            {(formData.target_audience_type === CampaignAudienceType.STUDENTS_OF_CLASS || formData.target_audience_type === CampaignAudienceType.PARENTS_OF_CLASS) && (
                 <Select 
                    name="target_id" 
                    label={t('MessageCampaignsPage.selectClassStream')} 
                    value={formData.target_id || ''} 
                    onChange={handleInputChange}
                    required
                >
                    <option value="">{t('MessageCampaignsPage.selectClassStream')}</option>
                    {classStreams.map(cs => <option key={cs.id} value={cs.id}>{cs.class_name} - {cs.name}</option>)}
                </Select>
            )}
             <Input 
                name="scheduled_for" 
                label={t('MessageCampaignsPage.scheduleForOptional')} 
                type="datetime-local"
                value={formData.scheduled_for || ''} 
                onChange={handleInputChange} 
            />
            <Select 
                name="status" 
                label={t('MessageCampaignsPage.campaignStatus')} 
                value={formData.status} 
                onChange={handleInputChange}
                required
                >
                {Object.values(CampaignStatus).map((status) => (
                    <option key={status} value={status}>{status}</option>
                ))}
            </Select>
        </div>
         <Textarea
            name="body"
            label={t('MessageCampaignsPage.campaignBodyContent')}
            value={formData.body || ''}
            onChange={handleInputChange}
            rows={8}
            placeholder={t('MessageCampaignsPage.enterCampaignMessageHere')}
            containerClassName="mt-4"
            required
        />
      </Modal>
    </div>
  );
};

export default MessageCampaignsPage;
