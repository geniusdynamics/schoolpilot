// ABOUTME: Designations page — grid plus add/edit/delete dialog bound to the canonical job_title schema.
// ABOUTME: Every read is a repository lookup and every write goes through the repository.

import React, { useState } from 'react';
import { withCanonicalRepository } from '../data/withCanonicalRepository';
import { useTranslation } from 'react-i18next';

import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Modal from '@/components/ui/Modal';
import { DataGrid, DataGridColumn } from '@/components/ui/data';
import { PlusIcon, EditIcon, DeleteIcon, IdentificationIcon } from '@/components/ui/icons';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { SchemaEntityForm } from '@/components/ui/forms';
import { createSchemaFor, toWritableValues, updateSchemaFor } from '@/data/repository';
import { asId } from '@/domain/ids';
import { JOB_TITLE_CATEGORIES } from '@/domain/schema';

import { useWritableRepository } from '../data/useWritableRepository';
import { useInstitutionId } from '../data/useCanonicalStaff';
import { useCanonicalOrganisation, type JobTitleRow, type JobTitleView } from '../data/useCanonicalOrganisation';

const CATEGORY_OPTIONS = JOB_TITLE_CATEGORIES.map((category) => ({ value: category, label: category }));

export const DesignationsContent: React.FC = () => {
  const repository = useWritableRepository();
  const institutionId = useInstitutionId();
  const { jobTitles, jobTitleRows } = useCanonicalOrganisation();
  const { t } = useTranslation('administration');
  const confirm = useConfirm();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<JobTitleRow | null>(null);

  const openModal = (row?: JobTitleRow) => {
    setEditing(row ?? null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditing(null);
  };

  const handleDelete = async (id: string) => {
    if ((await confirm({ variant: 'danger', message: 'Are you sure you want to delete this designation?' }))) {
      await repository.remove('job_title', asId<'job_title'>(id));
    }
  };

  const columns: DataGridColumn<JobTitleView>[] = [
    {
      key: 'title',
      header: 'Designation Title',
      sortable: true,
      filterable: true,
      width: 280,
      render: (value) => <span className="font-medium">{value}</span>,
    },
    {
      key: 'category',
      header: 'Category',
      sortable: true,
      filterable: true,
      width: 160,
      render: (value) => String(value),
    },
    {
      key: 'actions',
      header: 'Actions',
      sortable: false,
      filterable: false,
      width: 150,
      sticky: 'right',
      render: (_value, item) => (
        <div className="space-x-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => openModal(item.row)}
            leftIcon={<EditIcon className="w-4 h-4" />}
          >
            Edit
          </Button>
          <Button
            size="sm"
            variant="danger"
            onClick={() => handleDelete(item.id)}
            leftIcon={<DeleteIcon className="w-4 h-4" />}
          >
            Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <Card
        title={t('designations.management')}
        actions={
          <Button onClick={() => openModal()} leftIcon={<PlusIcon className="w-5 h-5" />}>
            {t('designations.addDesignation')}
          </Button>
        }
      >
        <DataGrid
          columns={columns}
          data={jobTitleRows.slice()}
          loading={jobTitles.status === 'loading' && jobTitleRows.length === 0}
          sortable
          filterable
          emptyState={
            <div className="py-8 text-center">
              <IdentificationIcon className="mx-auto mb-4 h-12 w-12 text-surface-muted-fg" />
              <p className="text-surface-muted-fg">
                No designations found. Create your first designation to get started.
              </p>
            </div>
          }
        />
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editing ? t('designations.editDesignation') : t('designations.addNewDesignation')}
        size="lg"
      >
        <SchemaEntityForm
          schema={editing ? updateSchemaFor('job_title') : createSchemaFor('job_title')}
          recordKey={editing?.id ?? 'new'}
          initialValues={
            editing
              ? toWritableValues(editing)
              : { institution_id: institutionId ?? '', name: '', category: 'teaching' }
          }
          fields={[
            { path: 'name', label: t('designations.designationTitle'), order: 1, required: true },
            {
              path: 'category',
              label: 'Category',
              order: 2,
              widget: 'select',
              options: CATEGORY_OPTIONS,
            },
          ]}
          onSubmit={async (values) => {
            const name = String(values.name ?? '').trim();
            const category = values.category === 'non_teaching' ? 'non_teaching' : 'teaching';
            if (editing) {
              await repository.update('job_title', editing.id, { name, category }, {
                expectedVersion: editing.rowVersion,
              });
            } else {
              await repository.create('job_title', {
                name,
                category,
                institution_id: institutionId ?? '',
              });
            }
            closeModal();
          }}
          onCancel={closeModal}
          submitLabel={editing ? t('designations.saveChanges') : t('designations.addDesignation')}
          cancelLabel={t('designations.cancel')}
        />
      </Modal>
    </div>
  );
};

const DesignationsPage: React.FC = () => <DesignationsContent />;

const DesignationsPageWithRepository = withCanonicalRepository(DesignationsPage);
export default DesignationsPageWithRepository;
