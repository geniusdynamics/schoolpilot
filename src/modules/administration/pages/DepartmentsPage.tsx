// ABOUTME: Departments page — grid plus add/edit/delete dialog bound to the canonical department schema.
// ABOUTME: Every read is a repository lookup and every write goes through the repository; the head is an EntityPicker.

import React, { useState } from 'react';
import { withCanonicalRepository } from '../data/withCanonicalRepository';
import { useTranslation } from 'react-i18next';

import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Modal from '@/components/ui/Modal';
import { DataGrid, DataGridColumn } from '@/components/ui/data';
import { PlusIcon, EditIcon, DeleteIcon } from '@/components/ui/icons';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { SchemaEntityForm } from '@/components/ui/forms';
import { useLookup } from '@/data/query';
import { createSchemaFor, toWritableValues, updateSchemaFor } from '@/data/repository';
import { asId } from '@/domain/ids';
import { DEPARTMENT_KINDS } from '@/domain/schema';

import { useWritableRepository } from '../data/useWritableRepository';
import { useInstitutionId } from '../data/useCanonicalStaff';
import { useCanonicalOrganisation, type DepartmentRow, type DepartmentView } from '../data/useCanonicalOrganisation';

const DEPARTMENT_KIND_OPTIONS = DEPARTMENT_KINDS.map((kind) => ({ value: kind, label: kind }));

export const DepartmentsContent: React.FC = () => {
  const repository = useWritableRepository();
  const institutionId = useInstitutionId();
  const { departments, departmentRows } = useCanonicalOrganisation();
  const staff = useLookup(repository, 'staff', {});
  const { t } = useTranslation('administration');
  const confirm = useConfirm();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<DepartmentRow | null>(null);

  const openModal = (row?: DepartmentRow) => {
    setEditing(row ?? null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setEditing(null);
    setIsModalOpen(false);
  };

  const handleDelete = async (id: string) => {
    if ((await confirm({ variant: 'danger', message: 'Are you sure you want to delete this department?' }))) {
      await repository.remove('department', asId<'department'>(id));
    }
  };

  const columns: DataGridColumn<DepartmentView>[] = [
    {
      key: 'name',
      header: 'Department Name',
      sortable: true,
      filterable: true,
      width: 220,
      render: (value) => <span className="font-medium">{value}</span>,
    },
    {
      key: 'kind',
      header: 'Kind',
      sortable: true,
      filterable: true,
      width: 140,
      render: (value) => (
        <span className="inline-flex rounded-full bg-surface-accent px-2 py-1 text-xs font-semibold text-surface-foreground">
          {String(value)}
        </span>
      ),
    },
    {
      key: 'is_academic',
      header: 'Is Academic',
      sortable: true,
      filterable: true,
      width: 120,
      render: (value) => (
        <span
          className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
            value ? 'bg-green-100 text-green-800' : 'bg-surface-accent text-surface-foreground'
          }`}
        >
          {value ? 'Yes' : 'No'}
        </span>
      ),
    },
    {
      key: 'head_staff_id',
      header: 'Head',
      sortable: false,
      filterable: false,
      width: 200,
      render: (value) =>
        value ? staff.label(asId<'staff'>(String(value)), '—') : '—',
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
    <div className="space-y-3">
      <Card
        title={t('departments.management')}
        actions={
          <Button onClick={() => openModal()} leftIcon={<PlusIcon className="w-5 h-5" />}>
            {t('departments.addDepartment')}
          </Button>
        }
      >
        <DataGrid
          columns={columns}
          data={departmentRows.slice()}
          loading={departments.status === 'loading' && departmentRows.length === 0}
          sortable
          filterable
          emptyState={
            <div className="py-8 text-center">
              <PlusIcon className="mx-auto mb-4 h-12 w-12 text-surface-muted-fg" />
              <p className="text-surface-muted-fg">
                No departments found. Create your first department to get started.
              </p>
            </div>
          }
        />
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editing ? t('departments.editDepartment') : t('departments.addNewDepartment')}
        size="lg"
      >
        <SchemaEntityForm
          schema={editing ? updateSchemaFor('department') : createSchemaFor('department')}
          recordKey={editing?.id ?? 'new'}
          initialValues={
            editing
              ? toWritableValues(editing)
              : { institution_id: institutionId ?? '', name: '', kind: 'administrative' }
          }
          fields={[
            { path: 'name', label: t('departments.departmentName'), order: 1, required: true },
            {
              path: 'kind',
              label: t('departments.isAcademicDepartment', 'Department kind'),
              order: 2,
              widget: 'select',
              options: DEPARTMENT_KIND_OPTIONS,
            },
          ]}
          onSubmit={async (values) => {
            const name = String(values.name ?? '').trim();
            const kind =
              values.kind === 'academic' || values.kind === 'support'
                ? values.kind
                : 'administrative';
            if (editing) {
              await repository.update('department', editing.id, { name, kind }, {
                expectedVersion: editing.rowVersion,
              });
            } else {
              await repository.create('department', {
                name,
                kind,
                institution_id: institutionId ?? '',
              });
            }
            closeModal();
          }}
          onCancel={closeModal}
          submitLabel={editing ? t('departments.saveChanges') : t('departments.addDepartment')}
          cancelLabel={t('departments.cancel')}
        />
      </Modal>
    </div>
  );
};

const DepartmentsPage: React.FC = () => <DepartmentsContent />;

const DepartmentsPageWithRepository = withCanonicalRepository(DepartmentsPage);
export default DepartmentsPageWithRepository;
export const DepartmentsPageContent = DepartmentsPage;
