// ABOUTME: Academic Years admin page: list, create, edit and delete canonical academic years.
// ABOUTME: The calendar is chosen through an EntityPicker; the form binds the academic_year schema.

import React, { useMemo, useState } from 'react';
import { withCanonicalRepository } from '../data/withCanonicalRepository';
import { useTranslation } from 'react-i18next';

import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Modal from '@/components/ui/Modal';
import { DataGrid, DataGridColumn } from '@/components/ui/data';
import { PlusIcon, EditIcon, DeleteIcon } from '@/components/ui/icons';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { SchemaEntityForm } from '@/components/ui/forms';
import { createSchemaFor, toWritableValues, updateSchemaFor } from '@/data/repository';
import { asId } from '@/domain/ids';
import { CALENDAR_YEAR_STATUSES } from '@/domain/schema';
import { formatDate } from '@/utils/format';

import { useWritableRepository } from '../data/useWritableRepository';
import { useInstitutionId } from '../data/useCanonicalStaff';
import { useCanonicalCalendar, type AcademicYearView } from '../data/useCanonicalCalendar';

const STATUS_OPTIONS = CALENDAR_YEAR_STATUSES.map((status) => ({ value: status, label: status }));

export const AcademicYearsContent: React.FC = () => {
  const { t } = useTranslation();
  const repository = useWritableRepository();
  const institutionId = useInstitutionId();
  const { calendars, academicYearRows } = useCanonicalCalendar();
  const confirm = useConfirm();

  const [editing, setEditing] = useState<AcademicYearView | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openModal = (year?: AcademicYearView) => {
    setEditing(year ?? null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditing(null);
  };

  const handleDelete = async (id: string) => {
    if (
      await confirm({
        variant: 'danger',
        message:
          'Are you sure you want to delete this academic year? This might affect related school periods and other academic data.',
      })
    ) {
      await repository.remove('academic_year', asId<'academic_year'>(id));
    }
  };

  const columns: DataGridColumn<AcademicYearView>[] = useMemo(
    () => [
      {
        key: 'name',
        header: 'Year Name',
        sortable: true,
        filterable: true,
        render: (_value, item) => <span className="font-medium">{item.name}</span>,
      },
      {
        key: 'structure_name',
        header: 'Calendar',
        sortable: true,
        filterable: true,
        render: (_value, item) => (
          <span className="text-primary-600">{item.structure_name || '—'}</span>
        ),
      },
      {
        key: 'start_date',
        header: 'Start Date',
        sortable: true,
        render: (_value, item) => (
          <span className="font-medium text-green-600">{formatDate(item.start_date)}</span>
        ),
      },
      {
        key: 'end_date',
        header: 'End Date',
        sortable: true,
        render: (_value, item) => (
          <span className="font-medium text-red-600">{formatDate(item.end_date)}</span>
        ),
      },
      {
        key: 'status',
        header: 'Status',
        sortable: true,
        filterable: true,
        render: (_value, item) => item.status,
      },
      {
        key: 'actions',
        header: 'Actions',
        sortable: false,
        filterable: false,
        sticky: 'right',
        render: (_value, item) => (
          <div className="space-x-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => openModal(item)}
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
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the handlers close over the repository
    [repository]
  );

  return (
    <div className="space-y-6">
      <Card
        title="Academic Years Management"
        actions={
          <Button onClick={() => openModal()} leftIcon={<PlusIcon className="w-5 h-5" />}>
            Add Academic Year
          </Button>
        }
      >
        <p className="mb-4 text-sm text-surface-muted-fg">
          Define academic years (e.g., "AY 2023/2024"), link them to a calendar, and set their
          start and end dates.
        </p>
        <DataGrid
          columns={columns}
          data={academicYearRows.slice()}
          loading={academicYearRows.length === 0 && calendars.status === 'loading'}
          sortable
          filterable
          pagination
          emptyState={{
            icon: <span className="text-3xl">📅</span>,
            title: 'No academic years found',
            description: 'Create your first academic year to get started.',
          }}
        />
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={
          editing
            ? String(t('academicYears.editYear', 'Edit Academic Year'))
            : String(t('academicYears.addNewYear', 'Add New Academic Year'))
        }
        size="lg"
      >
        <SchemaEntityForm
          schema={editing ? updateSchemaFor('academic_year') : createSchemaFor('academic_year')}
          recordKey={editing?.id ?? 'new'}
          initialValues={
            editing
              ? toWritableValues(editing.row)
              : {
                  institution_id: institutionId ?? '',
                  name: '',
                  start_date: '',
                  end_date: '',
                  status: 'planned',
                }
          }
          fields={[
            { path: 'name', label: t('academicYears.yearName', 'Year Name'), order: 1, required: true },
            {
              path: 'calendar_id',
              label: t('academicYears.structure', 'Calendar'),
              order: 2,
              widget: 'entity',
              lookupKey: 'calendar_id',
              required: true,
            },
            {
              path: 'start_date',
              label: t('academicYears.startDate', 'Start Date'),
              order: 3,
              widget: 'date',
              required: true,
            },
            {
              path: 'end_date',
              label: t('academicYears.endDate', 'End Date'),
              order: 4,
              widget: 'date',
              required: true,
            },
            {
              path: 'status',
              label: 'Status',
              order: 5,
              widget: 'select',
              options: STATUS_OPTIONS,
            },
          ]}
          lookups={{ calendar_id: calendars }}
          onSubmit={async (values) => {
            const name = String(values.name ?? '').trim();
            const calendarId = String(values.calendar_id ?? '');
            const startDate = String(values.start_date ?? '');
            const endDate = String(values.end_date ?? '');
            const status =
              values.status === 'current' || values.status === 'closed' ? values.status : 'planned';
            if (editing) {
              await repository.update(
                'academic_year',
                asId<'academic_year'>(editing.id),
                {
                  name,
                  calendar_id: calendarId,
                  start_date: startDate,
                  end_date: endDate,
                  status,
                },
                { expectedVersion: editing.row.rowVersion }
              );
            } else {
              await repository.create('academic_year', {
                name,
                calendar_id: calendarId,
                start_date: startDate,
                end_date: endDate,
                status,
                institution_id: institutionId ?? '',
              });
            }
            closeModal();
          }}
          onCancel={closeModal}
          submitLabel={
            editing ? String(t('common:save', 'Save changes')) : String(t('common:add', 'Add year'))
          }
          cancelLabel={String(t('common:cancel', 'Cancel'))}
        />
      </Modal>
    </div>
  );
};

const AcademicYearsPage: React.FC = () => (
  <div className="space-y-6">
    <AcademicYearsContent />
  </div>
);

const AcademicYearsPageWithRepository = withCanonicalRepository(AcademicYearsPage);
export default AcademicYearsPageWithRepository;
