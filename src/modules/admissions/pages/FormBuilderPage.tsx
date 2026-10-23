import React, { useMemo, useCallback } from 'react';
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
import { useDatabaseCollection } from '@/hooks/useDatabaseCollection';
import { logger } from '@/utils/logging';
import { PageHeaderWithTabs } from '@/components/ui/PageHeaderWithTabs';

interface FormTemplate {
  id: string;
  name: string;
  description: string;
  sections: number;
  fields: number;
  isActive: boolean;
  lastModified: string;
}

// Live-backed form templates ('application_form_templates' collection,
// seeded via applicationFormTemplates in administration/data/mockData.ts).
// GAP(P1-E04): the canonical registry models no application form template, so the builder
// keeps this collection until a registry change adds the entity.
const FORM_TEMPLATES_COLLECTION = 'application_form_templates';

export const FormBuilderPageContent: React.FC = () => {
  const { t } = useTranslation('admissions');
  const { showInfo, showSuccess } = useToast();
  const { data: forms, loading, insert, update, remove } = useDatabaseCollection<FormTemplate>(FORM_TEMPLATES_COLLECTION);

  const today = new Date().toISOString().slice(0, 10);

  const handleCreate = useCallback(async () => {
    try {
      await insert({
        name: t('formBuilder.newFormName', 'New Application Form'),
        description: '',
        sections: 1,
        fields: 0,
        isActive: false,
        lastModified: today,
      });
      showInfo(t('formBuilder.createNotice', 'Create new form'));
    } catch (err) {
      logger.error('[FormBuilderPage] Failed to create form template:', err);
    }
  }, [insert, showInfo, t, today]);

  const handleEdit = useCallback(async (row: FormTemplate) => {
    try {
      // Inline edit: toggle activation until the full builder UI lands.
      await update(row.id, { isActive: !row.isActive, lastModified: today });
      showInfo(t('formBuilder.editNotice', 'Edit form: ' + row.name));
    } catch (err) {
      logger.error('[FormBuilderPage] Failed to update form template:', err);
    }
  }, [update, showInfo, t, today]);

  const handleDuplicate = useCallback(async (row: FormTemplate) => {
    try {
      await insert({
        name: `${row.name} (Copy)`,
        description: row.description,
        sections: row.sections,
        fields: row.fields,
        isActive: false,
        lastModified: today,
      });
      showSuccess(t('formBuilder.duplicateNotice', 'Form duplicated'));
    } catch (err) {
      logger.error('[FormBuilderPage] Failed to duplicate form template:', err);
    }
  }, [insert, showSuccess, t, today]);

  const handleDelete = useCallback(async (row: FormTemplate) => {
    try {
      await remove(row.id);
      showInfo(t('formBuilder.deleteNotice', 'Form deleted'));
    } catch (err) {
      logger.error('[FormBuilderPage] Failed to delete form template:', err);
    }
  }, [remove, showInfo, t]);

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
      render: (_value: any, row: FormTemplate) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${row.isActive ? 'bg-green-100 text-green-800' : 'bg-surface-accent text-surface-muted-fg'}`}>
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
      align: 'center',
      sortable: false,
      filterable: false,
      render: (_value: any, row: FormTemplate) => (
        <div className="flex gap-2">
          <button
            onClick={() => handleEdit(row)}
            className="p-1 hover:bg-surface-accent rounded"
            title={t('formBuilder.edit', 'Edit')}
          >
            <PencilSquareIcon className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleDuplicate(row)}
            className="p-1 hover:bg-surface-accent rounded"
            title={t('formBuilder.duplicate', 'Duplicate')}
          >
            <DocumentDuplicateIcon className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleDelete(row)}
            className="p-1 hover:bg-red-100 rounded text-red-600"
            title={t('formBuilder.delete', 'Delete')}
          >
            <TrashIcon className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ], [t, handleEdit, handleDuplicate, handleDelete]);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-surface-muted-fg">
          {t('formBuilder.subtitle', 'Design and manage application forms for admissions')}
        </p>
        <Button
          variant="primary"
          size="sm"
          leftIcon={<PlusIcon className="w-4 h-4" />}
          onClick={handleCreate}
        >
          {t('formBuilder.createForm', 'Create Form')}
        </Button>
      </div>
      <Card>
        <DataGrid
          data={forms}
          columns={columns}
          keyField="id"
          pagination
          loading={loading}
        />
      </Card>
    </div>
  );
};

const FormBuilderPage: React.FC = () => {
  const { t } = useTranslation('admissions');

  return (
    <div className="space-y-3">
      <PageHeaderWithTabs
        title={t('formBuilder.title', 'Form Builder')}
        info={t('formBuilder.pageSubtitle', 'Design and manage admission application forms')}
      />
      <FormBuilderPageContent />
    </div>
  );
};

export default FormBuilderPage;
