// GAP(P1-E03): the registry models an issued receipt, not a receipt template.
import React, { useState, useMemo } from 'react';
import { useAppData } from '@/hooks/useAppData';
import Card from '@/components/ui/Card';
import { DataGrid, DataGridColumn } from '@/components/ui/data';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import DialogForm from '@/components/ui/forms/DialogForm';
import FormSection from '@/components/ui/forms/FormSection';
import FormField from '@/components/ui/forms/FormField';
import FormActions from '@/components/ui/forms/FormActions';
import { PrinterIcon, DocumentTextIcon, EyeIcon, PlusIcon, TrashIcon } from '@/components/ui/icons';
import { useToast } from '@/hooks/useToast';
import { fileToImageDataUrl, ImageUploadError } from '@/services/storage/imageUpload';
import Spinner from '@/components/ui/Spinner';
import { ReceiptTemplate } from '../data/types';
import { logger } from '@/utils/logging';
import { formatDate } from '@/utils/format';
import { useSchoolProfile, formatSchoolAddress, formatSchoolContact } from '@/hooks/useSchoolProfile';

export const FeesReceiptTemplatePageContent: React.FC = () => {
  const { receiptTemplates, loading } = useAppData();
  // The saved school profile (school_details) fills receipt headers a template leaves blank
  const { profile: schoolProfile, schoolName } = useSchoolProfile();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ReceiptTemplate | null>(null);

  const initialFormData: Partial<ReceiptTemplate> = {
    name: '',
    school_name: '',
    school_address: '',
    school_phone: '',
    school_email: '',
    header_text: 'OFFICIAL RECEIPT',
    footer_text: 'Thank you for your payment.',
    logo_url: '',
    is_default: false
  };
  const [formData, setFormData] = useState<Partial<ReceiptTemplate>>(initialFormData);

  const templates: ReceiptTemplate[] = useMemo(() => receiptTemplates || [], [receiptTemplates]);

  const openModal = (template?: ReceiptTemplate) => {
    setEditingTemplate(template || null);
    setFormData(template ? { ...template } : {
      ...initialFormData,
      school_name: schoolName ?? '',
      school_address: formatSchoolAddress(schoolProfile),
      school_phone: schoolProfile?.telephone || schoolProfile?.phone || '',
      school_email: schoolProfile?.email || '',
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingTemplate(null);
    setFormData(initialFormData);
  };

  const openPreview = (template: ReceiptTemplate) => {
    setEditingTemplate(template);
    setFormData(template);
    setIsPreviewOpen(true);
  };

  const closePreview = () => {
    setIsPreviewOpen(false);
    setEditingTemplate(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const checkbox = e.target as HTMLInputElement;
    const val = checkbox.type === 'checkbox' ? checkbox.checked : value;
    setFormData(prev => ({ ...prev, [name]: val }));
  };

  // Logo upload — size/type-guarded data URL stored in logo_url (2.6)
  const handleLogoSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const dataUrl = await fileToImageDataUrl(file);
      setFormData(prev => ({ ...prev, logo_url: dataUrl }));
      toast.showSuccess('Logo uploaded. Save the template to keep it.');
    } catch (error) {
      if (error instanceof ImageUploadError) {
        toast.showWarning(error.message);
      } else {
        toast.showError('Failed to read the logo image.');
      }
    }
  };

  const toast = useToast();
  const handleSubmit = async () => {
    if (!formData.name || !formData.school_name) {
      toast.showWarning('Template name and school name are required.');
      return;
    }
    // In production, this would call addReceiptTemplate or updateReceiptTemplate
    logger.info('Saving template:', formData);
    closeModal();
  };

  const handlePrint = () => {
    window.print();
  };

  // Receipt header: the template's own school details, else the saved school profile
  const receiptSchoolName = formData.school_name || schoolName || '';
  const receiptSchoolAddress = formData.school_address || formatSchoolAddress(schoolProfile);
  const receiptSchoolContact = (formData.school_phone || formData.school_email)
    ? [formData.school_phone, formData.school_email].filter(Boolean).join(' | ')
    : formatSchoolContact(schoolProfile);

  const columns: DataGridColumn<ReceiptTemplate>[] = [
    {
      key: 'name',
      header: 'Template Name',
      sortable: true,
      filterable: true,
      render: (value, item) => (
        <div className="flex items-center gap-2">
          {value}
          {item.is_default && (
            <span className="px-2 py-1 bg-primary-100 text-primary-800 text-xs rounded-full">Default</span>
          )}
        </div>
      )
    },
    {
      key: 'school_name',
      header: 'School Name',
      sortable: true,
      filterable: true,
      render: (value) => value || schoolName || '-'
    },
    {
      key: 'school_address',
      header: 'Address',
      sortable: false,
      render: (value) => value || '-'
    },
    {
      key: 'created_at',
      header: 'Created',
      sortable: true,
      render: (value) => value ? formatDate(value) : '-'
    },
    {
      key: 'actions',
      header: 'Actions',
      sortable: false,
      render: (_, item) => (
        <div className="flex gap-2">
          <button
            onClick={() => openPreview(item)}
            className="text-primary-600 hover:text-primary-800"
            title="Preview"
          >
            <EyeIcon className="w-4 h-4" />
          </button>
          <button
            onClick={() => openModal(item)}
            className="text-green-600 hover:text-green-800"
            title="Edit"
          >
            Edit
          </button>
          <button
            className="text-red-600 hover:text-red-800"
            title="Delete"
          >
            <TrashIcon className="w-4 h-4" />
          </button>
        </div>
      )
    }
  ];

  if (loading?.all && templates.length === 0 && !receiptTemplates) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner size="lg" />
        <span className="ml-2">Loading receipt templates...</span>
      </div>
    );
  }

  return (
    <div className="p-6">
      <Card
        title={
          <div className="flex items-center gap-2">
            <DocumentTextIcon className="w-6 h-6 text-primary-600" />
            <span>Custom Fees Receipt Templates</span>
          </div>
        }
        actions={
          <Button onClick={() => openModal()} variant="primary">
            <PlusIcon className="w-4 h-4 mr-2" />
            New Template
          </Button>
        }
        info="Create custom receipt templates with your school branding, logo, and personalized messages. These templates are used when generating fee payment receipts for students and parents."
      >
        <DataGrid
          data={templates}
          columns={columns}
          pageSize={20}
          searchable={true}
          exportable={true}
        />
      </Card>

      {/* Edit/Create Modal */}
      <DialogForm
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingTemplate ? 'Edit Receipt Template' : 'New Receipt Template'}
      >
        <FormSection>
          <FormField label="Template Name" required>
            <Input
              name="name"
              value={formData.name || ''}
              onChange={handleInputChange}
              placeholder="e.g., Default Receipt, Official Receipt"
            />
          </FormField>

          <FormField label="School Name" required>
            <Input
              name="school_name"
              value={formData.school_name || ''}
              onChange={handleInputChange}
              placeholder="Your school name"
            />
          </FormField>

          <FormField label="School Address">
            <Textarea
              name="school_address"
              value={formData.school_address || ''}
              onChange={handleInputChange}
              placeholder="School address"
              rows={2}
            />
          </FormField>

          <FormField label="School Phone">
            <Input
              name="school_phone"
              value={formData.school_phone || ''}
              onChange={handleInputChange}
              placeholder="Phone number"
            />
          </FormField>

          <FormField label="School Email">
            <Input
              name="school_email"
              value={formData.school_email || ''}
              onChange={handleInputChange}
              placeholder="Email address"
              type="email"
            />
          </FormField>

          <FormField label="Header Text">
            <Input
              name="header_text"
              value={formData.header_text || ''}
              onChange={handleInputChange}
              placeholder="e.g., OFFICIAL RECEIPT"
            />
          </FormField>

          <FormField label="Footer Text">
            <Textarea
              name="footer_text"
              value={formData.footer_text || ''}
              onChange={handleInputChange}
              placeholder="Footer message for receipts"
              rows={2}
            />
          </FormField>

          <FormField label="School Logo">
            <div className="space-y-2">
              {formData.logo_url && (
                <img src={formData.logo_url} alt="School logo preview" className="h-12 w-auto rounded border border-surface-border bg-surface-card p-1" />
              )}
              <Input
                name="logo_url"
                value={formData.logo_url || ''}
                onChange={handleInputChange}
                placeholder="Paste an image URL or upload below"
              />
              <label className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 cursor-pointer">
                <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="sr-only" onChange={handleLogoSelected} />
                Upload logo (max 2 MB)
              </label>
            </div>
          </FormField>

          <FormField label="Set as Default">
            <label className="flex items-center">
              <input
                type="checkbox"
                name="is_default"
                checked={formData.is_default || false}
                onChange={handleInputChange}
                className="mr-2"
              />
              Make this the default receipt template
            </label>
          </FormField>
        </FormSection>

        <FormActions
          onCancel={closeModal}
          onSubmit={handleSubmit}
          submitLabel={editingTemplate ? 'Update' : 'Create'}
        />
      </DialogForm>

      {/* Preview Modal */}
      <DialogForm
        isOpen={isPreviewOpen}
        onClose={closePreview}
        title="Receipt Preview"
        size="large"
      >
        <div className="bg-surface-card p-8 border border-surface-border max-w-2xl mx-auto">
          {/* Receipt Header */}
          <div className="text-center mb-6">
            {formData.logo_url && (
              <img src={formData.logo_url} alt="School Logo" className="h-16 mx-auto mb-2" />
            )}
            <h1 className="text-2xl font-bold text-surface-foreground">{receiptSchoolName}</h1>
            {receiptSchoolAddress && <p className="text-sm text-surface-muted-fg">{receiptSchoolAddress}</p>}
            {receiptSchoolContact && <p className="text-sm text-surface-muted-fg">{receiptSchoolContact}</p>}
          </div>

          <div className="border-t-2 border-b-2 border-gray-800 py-3 mb-6 text-center">
            <h2 className="text-xl font-bold text-surface-foreground">{formData.header_text}</h2>
          </div>

          {/* Sample Receipt Content */}
          <div className="space-y-3 text-sm mb-6">
            <div className="flex justify-between">
              <span className="text-surface-muted-fg">Receipt No:</span>
              <span className="font-semibold">RCP-2024-001234</span>
            </div>
            <div className="flex justify-between">
              <span className="text-surface-muted-fg">Date:</span>
              <span className="font-semibold">{formatDate()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-surface-muted-fg">Student:</span>
              <span className="font-semibold">John Doe (ADM-001)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-surface-muted-fg">Class:</span>
              <span className="font-semibold">Grade 10 - A</span>
            </div>
          </div>

          <table className="w-full mb-6 text-sm">
            <thead>
              <tr className="border-b border-surface-border">
                <th className="text-left py-2">Description</th>
                <th className="text-right py-2">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-surface-border">
                <td className="py-2">Tuition Fee - Term 1</td>
                <td className="text-right py-2">KES 45,000.00</td>
              </tr>
              <tr className="border-b border-surface-border">
                <td className="py-2">Activity Fee</td>
                <td className="text-right py-2">KES 5,000.00</td>
              </tr>
              <tr className="border-b border-surface-border font-bold">
                <td className="py-2">Total</td>
                <td className="text-right py-2">KES 50,000.00</td>
              </tr>
            </tbody>
          </table>

          <div className="text-center text-sm text-surface-muted-fg mb-6">
            <p>Amount Paid: KES 50,000.00</p>
            <p>Payment Method: Cash</p>
          </div>

          {/* Receipt Footer */}
          <div className="border-t border-surface-border pt-4 text-center text-sm text-surface-muted-fg">
            <p>{formData.footer_text}</p>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <Button onClick={closePreview} variant="secondary">
            Close
          </Button>
          <Button onClick={handlePrint} variant="primary">
            <PrinterIcon className="w-4 h-4 mr-2" />
            Print
          </Button>
        </div>
      </DialogForm>
    </div>
  );
};

const FeesReceiptTemplatePage: React.FC = () => (
  <div className="space-y-3">
    <FeesReceiptTemplatePageContent />
  </div>
);

export default FeesReceiptTemplatePage;
