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
import { useTranslation } from 'react-i18next';
import { ReceiptTemplate } from '../data/types';
import { logger } from '@/utils/logging';
import { formatDate } from '@/utils/format';

export const FeesReceiptTemplatePageContent: React.FC = () => {
  const { t } = useTranslation('finance');
  const { receiptTemplates, loading } = useAppData();

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
    setFormData(template ? { ...template } : initialFormData);
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
            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">Default</span>
          )}
        </div>
      )
    },
    {
      key: 'school_name',
      header: 'School Name',
      sortable: true,
      filterable: true
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
            className="text-blue-600 hover:text-blue-800"
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
            <DocumentTextIcon className="w-6 h-6 text-blue-600" />
            <span>Custom Fees Receipt Templates</span>
          </div>
        }
        extra={
          <Button onClick={() => openModal()} variant="primary">
            <PlusIcon className="w-4 h-4 mr-2" />
            New Template
          </Button>
        }
      >
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-3">
            <DocumentTextIcon className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-blue-800">About Receipt Templates</h3>
              <p className="text-sm text-blue-700 mt-1">
                Create custom receipt templates with your school branding, logo, and personalized messages.
                These templates are used when generating fee payment receipts for students and parents.
              </p>
            </div>
          </div>
        </div>

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
                <img src={formData.logo_url} alt="School logo preview" className="h-12 w-auto rounded border border-gray-200 bg-white p-1" />
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
        <div className="bg-white p-8 border border-gray-300 max-w-2xl mx-auto">
          {/* Receipt Header */}
          <div className="text-center mb-6">
            {formData.logo_url && (
              <img src={formData.logo_url} alt="School Logo" className="h-16 mx-auto mb-2" />
            )}
            <h1 className="text-2xl font-bold text-gray-800">{formData.school_name}</h1>
            <p className="text-sm text-gray-600">{formData.school_address}</p>
            <p className="text-sm text-gray-600">{formData.school_phone} | {formData.school_email}</p>
          </div>

          <div className="border-t-2 border-b-2 border-gray-800 py-3 mb-6 text-center">
            <h2 className="text-xl font-bold text-gray-800">{formData.header_text}</h2>
          </div>

          {/* Sample Receipt Content */}
          <div className="space-y-3 text-sm mb-6">
            <div className="flex justify-between">
              <span className="text-gray-600">Receipt No:</span>
              <span className="font-semibold">RCP-2024-001234</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Date:</span>
              <span className="font-semibold">{formatDate()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Student:</span>
              <span className="font-semibold">John Doe (ADM-001)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Class:</span>
              <span className="font-semibold">Grade 10 - A</span>
            </div>
          </div>

          <table className="w-full mb-6 text-sm">
            <thead>
              <tr className="border-b border-gray-300">
                <th className="text-left py-2">Description</th>
                <th className="text-right py-2">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-200">
                <td className="py-2">Tuition Fee - Term 1</td>
                <td className="text-right py-2">KES 45,000.00</td>
              </tr>
              <tr className="border-b border-gray-200">
                <td className="py-2">Activity Fee</td>
                <td className="text-right py-2">KES 5,000.00</td>
              </tr>
              <tr className="border-b border-gray-300 font-bold">
                <td className="py-2">Total</td>
                <td className="text-right py-2">KES 50,000.00</td>
              </tr>
            </tbody>
          </table>

          <div className="text-center text-sm text-gray-600 mb-6">
            <p>Amount Paid: KES 50,000.00</p>
            <p>Payment Method: Cash</p>
          </div>

          {/* Receipt Footer */}
          <div className="border-t border-gray-300 pt-4 text-center text-sm text-gray-600">
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
  <div className="space-y-6">
    <FeesReceiptTemplatePageContent />
  </div>
);

export default FeesReceiptTemplatePage;
