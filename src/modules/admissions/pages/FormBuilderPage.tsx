import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { DataGrid, DataGridColumn } from '@/components/ui/data';
import {
  PlusIcon,
  PencilSquareIcon,
  DocumentDuplicateIcon,
  TrashIcon,
} from '@/components/ui/icons';
import { useToast } from '@/hooks/useToast';

interface FormTemplate {
  id: string;
  name: string;
  description: string;
  sections: number;
  fields: number;
  isActive: boolean;
  lastModified: string;
}

const mockForms: FormTemplate[] = [
  { id: '1', name: 'Standard Application Form', description: 'Default application form for new students', sections: 4, fields: 24, isActive: true, lastModified: '2025-12-01' },
  { id: '2', name: 'Transfer Application Form', description: 'For students transferring from other schools', sections: 3, fields: 18, isActive: true, lastModified: '2025-11-15' },
  { id: '3', name: 'International Student Form', description: 'For international student applications', sections: 5, fields: 30, isActive: false, lastModified: '2025-10-20' },
];

export const FormBuilderPageContent: React.FC = () => {
  const { t } = useTranslation('admissions');
  const { showToast } = useToast();
  const [forms] = useState<FormTemplate[]>(mockForms);

  const columns: DataGridColumn<FormTemplate>[] = useMemo(() => [
    { key: 'name', header: t('formBuilder.formName', 'Form Name'), sortable: true },
    { key: 'description', header: t('formBuilder.description', 'Description'), sortable: false },
    { key: 'sections', header: t('formBuilder.sections', 'Sections'), sortable: true, width: '100px', align: 'center' },
    { key: 'fields', header: t('formBuilder.fields', 'Fields'), sortable: true, width: '100px', align: 'center' },
    {
      key: 'isActive',
      header: t('formBuilder.status', 'Status'),
      width: '120px',
      align: 'center',
      render: (row: FormTemplate) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${row.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
          {row.isActive ? t('formBuilder.active', 'Active') : t('formBuilder.inactive', 'Inactive')}
        </span>
      ),
    },
    {
      key: 'lastModified',
      header: t('formBuilder.lastModified', 'Last Modified'),
      sortable: true,
      width: '140px',
    },
    {
      key: 'actions',
      header: t('formBuilder.actions', 'Actions'),
      width: '140px',
      render: (row: FormTemplate) => (
        <div className="flex gap-2">
          <button
            onClick={() => showToast(t('formBuilder.editNotice', 'Edit form: ' + row.name), 'info')}
            className="p-1 hover:bg-gray-100 rounded"
            title={t('formBuilder.edit', 'Edit')}
          >
            <PencilSquareIcon className="w-4 h-4" />
          </button>
          <button
            onClick={() => showToast(t('formBuilder.duplicateNotice', 'Form duplicated'), 'success')}
            className="p-1 hover:bg-gray-100 rounded"
            title={t('formBuilder.duplicate', 'Duplicate')}
          >
            <DocumentDuplicateIcon className="w-4 h-4" />
          </button>
          <button
            onClick={() => showToast(t('formBuilder.deleteNotice', 'Form deleted'), 'info')}
            className="p-1 hover:bg-red-100 rounded text-red-600"
            title={t('formBuilder.delete', 'Delete')}
          >
            <TrashIcon className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ], [t, showToast]);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-600">
          {t('formBuilder.subtitle', 'Design and manage application forms for admissions')}
        </p>
        <Button
          variant="primary"
          size="sm"
          leftIcon={<PlusIcon className="w-4 h-4" />}
          onClick={() => showToast(t('formBuilder.createNotice', 'Create new form'), 'info')}
        >
          {t('formBuilder.createForm', 'Create Form')}
        </Button>
      </div>
      <Card>
        <DataGrid
          data={forms}
          columns={columns}
          pageSize={10}
          searchable
          searchPlaceholder={t('formBuilder.searchForms', 'Search forms...')}
        />
      </Card>
    </div>
  );
};

const FormBuilderPage: React.FC = () => {
  const { t } = useTranslation('admissions');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('formBuilder.title', 'Form Builder')}</h1>
        <p className="text-sm text-gray-600 mt-1">
          {t('formBuilder.pageSubtitle', 'Design and manage admission application forms')}
        </p>
      </div>
      <FormBuilderPageContent />
    </div>
  );
};

export default FormBuilderPage;
