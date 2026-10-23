// ABOUTME: Student Transport Assignments page - assigns learners to transport routes for a school period.
// ABOUTME: The learner and period are canonical and picked through EntityPicker; the assignment itself
// ABOUTME: stays on its legacy collection because the registry models no transport route
// ABOUTME: (GAP(P1-E03): transport_route and student_transport_assignment are not canonical entities).

import React, { useState, useMemo } from 'react';
import Card from '@/components/ui/Card';
import { DataGrid, DataGridColumn } from '@/components/ui/data';
import Button from '@/components/ui/Button';
import { EntityPicker } from '@/components/ui/EntityPicker';
import DialogForm from "@/components/ui/forms/DialogForm";
import Select from '@/components/ui/Select';
import { Alert } from '@/components/ui/Alert';
import { PlusIcon, EditIcon, DeleteIcon, TruckIcon } from '@/components/ui/icons';
import { useFinance } from '@/modules/finance/hooks/useFinance';
import { TransportAssignmentStatus } from '@/core/types';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/hooks/useToast';
import { useTranslation } from 'react-i18next';
import { asId } from '@/domain/ids';
import { useCanonicalFinance } from '../data/canonicalFinance';
import { CanonicalRepositoryProvider } from '../data/canonicalRepository';

/** An assignment as shown in the grid; ids are strings and names are resolved at read time. */
interface AssignmentRow {
  id: string;
  student_id: string;
  route_id: string;
  school_period_id: string;
  status: TransportAssignmentStatus;
  student_name: string | null;
  route_name: string | null;
  school_period_name: string | null;
}

interface AssignmentFormData {
  student_id: string;
  route_id: string;
  school_period_id: string;
  status: TransportAssignmentStatus;
}

const errorMessage = (error: unknown): string => (error instanceof Error ? error.message : String(error));
const idOf = (value: unknown): string => (value == null ? '' : String(value));

export const StudentTransportAssignmentsPageContent: React.FC = () => {
  const { t } = useTranslation('finance');
  const {
    studentTransportAssignments,
    transportRoutes,
    addStudentTransportAssignment,
    updateStudentTransportAssignment,
    deleteStudentTransportAssignment,
  } = useFinance();
  const finance = useCanonicalFinance();
  const { showSuccess, showError } = useToast();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<AssignmentRow | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const initialFormData: AssignmentFormData = {
    student_id: '',
    route_id: '',
    school_period_id: '',
    status: TransportAssignmentStatus.ACTIVE,
  };
  const [formData, setFormData] = useState<AssignmentFormData>(initialFormData);

  const rows = useMemo<AssignmentRow[]>(() => studentTransportAssignments.map(assignment => {
    const route = transportRoutes.find(r => idOf(r.id) === idOf(assignment.route_id));
    return {
      id: idOf(assignment.id),
      student_id: idOf(assignment.student_id),
      route_id: idOf(assignment.route_id),
      school_period_id: idOf(assignment.school_period_id),
      status: assignment.status || TransportAssignmentStatus.ACTIVE,
      student_name:
        finance.lookups.learner.label(asId<'learner'>(idOf(assignment.student_id)), '') ||
        assignment.student_name ||
        null,
      route_name: route?.name ?? assignment.route_name ?? null,
      school_period_name:
        finance.lookups.period.label(asId<'academic_period'>(idOf(assignment.school_period_id)), '') ||
        assignment.school_period_name ||
        null,
    };
  }), [studentTransportAssignments, transportRoutes, finance.lookups.learner, finance.lookups.period]);

  const openModal = (assignment?: AssignmentRow) => {
    setEditingAssignment(assignment || null);
    setFormError(null);
    setFormData(assignment ?
      {
        student_id: assignment.student_id,
        route_id: assignment.route_id,
        school_period_id: assignment.school_period_id,
        status: assignment.status,
      } :
      initialFormData
    );
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingAssignment(null);
    setFormError(null);
    setFormData(initialFormData);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormError(null);
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    if (saving) return;
    if (!formData.student_id || !formData.route_id || !formData.school_period_id) {
      setFormError(t('transportAssignments.validation', 'Student, Route, and School Period are required.'));
      return;
    }
    const payload = { ...formData };

    setSaving(true);
    try {
      // The finance record types still declare numeric foreign keys (SO-22); stored ids are strings.
      if (editingAssignment) {
        await updateStudentTransportAssignment(editingAssignment.id, payload as unknown as Parameters<typeof updateStudentTransportAssignment>[1]);
      } else {
        await addStudentTransportAssignment(payload as unknown as Parameters<typeof addStudentTransportAssignment>[0]);
      }
      showSuccess(t('transportAssignments.saved', 'Transport assignment saved.'));
      closeModal();
    } catch (error) {
      setFormError(`${t('transportAssignments.saveFailed', 'Failed to save transport assignment:')} ${errorMessage(error)}`);
    } finally {
      setSaving(false);
    }
  };

  const confirm = useConfirm();
  const handleDelete = async (id: string) => {
    if (!(await confirm({ variant: 'danger', message: 'Are you sure you want to delete this transport assignment?' }))) return;
    try {
      await deleteStudentTransportAssignment(id);
      showSuccess(t('transportAssignments.deleted', 'Transport assignment deleted.'));
    } catch (error) {
      showError(`${t('transportAssignments.deleteFailed', 'Failed to delete transport assignment:')} ${errorMessage(error)}`);
    }
  };

  const columns: DataGridColumn<AssignmentRow>[] = [
    {
      key: 'student_name',
      header: 'Student Name',
      sortable: true,
      filterable: true,
      width: 200,
      render: (value) => <span className="font-medium">{value}</span>
    },
    {
      key: 'route_name',
      header: 'Route',
      sortable: true,
      filterable: true,
      width: 180,
      render: (value) => <span className="text-primary-600">{value}</span>
    },
    {
      key: 'school_period_name',
      header: 'School Period',
      sortable: true,
      filterable: true,
      width: 150,
      render: (value) => <span className="text-purple-600">{value}</span>
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      filterable: true,
      width: 120,
      render: (value, row) => <span className={`px-2 py-1 rounded-full text-xs font-medium ${
        row.status === TransportAssignmentStatus.ACTIVE ? 'bg-green-100 text-green-800' :
        row.status === TransportAssignmentStatus.INACTIVE ? 'bg-surface-accent text-surface-foreground' :
        'bg-red-100 text-red-800'
      }`}>{value}</span>
    },
    {
      key: 'id',
      header: 'Actions',
      sortable: false,
      filterable: false,
      width: 150,
      sticky: 'right',
      render: (_value, row) => (
        <div className="space-x-1">
          <Button size="sm" variant="ghost" onClick={() => openModal(row)} leftIcon={<EditIcon className="w-4 h-4" />}>Edit</Button>
          <Button size="sm" variant="danger" onClick={() => handleDelete(row.id)} leftIcon={<DeleteIcon className="w-4 h-4" />}>Delete</Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-3">
      <Card title="Student Transport Assignments" actions={
        <Button onClick={() => openModal()} leftIcon={<PlusIcon className="w-5 h-5" />}>
          Assign Student to Route
        </Button>
      }>
        <DataGrid
          columns={columns}
          data={rows}
          sortable
          filterable
          emptyState={{
            icon: <TruckIcon className="w-12 h-12 text-surface-muted-fg" />,
            title: "No Transport Assignments",
            description: "No students have been assigned to transport routes yet. Start by assigning students to available routes.",
          }}
        />
      </Card>

      <DialogForm isOpen={isModalOpen} onClose={closeModal} title={editingAssignment ? 'Edit Transport Assignment' : 'Assign Student to Transport Route'} size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={closeModal}>Cancel</Button>
            <Button onClick={handleSubmit} loading={saving}>
              {editingAssignment ? 'Save Changes' : 'Assign'}
            </Button>
          </>
        }
      >
        {formError && <Alert variant="destructive" className="mb-4">{formError}</Alert>}
        <EntityPicker
            value={formData.student_id ? asId<'learner'>(formData.student_id) : null}
            onChange={(id) => {
              setFormError(null);
              setFormData(prev => ({ ...prev, student_id: id ?? '' }));
            }}
            lookup={finance.lookups.learner}
            label="Student"
            placeholder="Select Student"
            disabled={!!editingAssignment}
            data-testid="transport-student-picker"
        />
        <Select name="route_id" label="Transport Route" value={formData.route_id} onChange={handleInputChange} required>
            <option value="">Select Route</option>
            {transportRoutes.map(route => (<option key={route.id} value={idOf(route.id)}>{route.name}</option>))}
        </Select>
        <EntityPicker
            value={formData.school_period_id ? asId<'academic_period'>(formData.school_period_id) : null}
            onChange={(id) => {
              setFormError(null);
              setFormData(prev => ({ ...prev, school_period_id: id ?? '' }));
            }}
            lookup={finance.lookups.period}
            label="School Period"
            placeholder="Select School Period"
            data-testid="transport-period-picker"
        />
        <Select name="status" label="Status" value={formData.status} onChange={handleInputChange} required>
            {Object.values(TransportAssignmentStatus).map(status => (<option key={status} value={status}>{status}</option>))}
        </Select>
      </DialogForm>
    </div>
  );
};
const StudentTransportAssignmentsPage: React.FC = () => (
  <CanonicalRepositoryProvider>
    <div className="space-y-3">
      <StudentTransportAssignmentsPageContent />
    </div>
  </CanonicalRepositoryProvider>
);

export default StudentTransportAssignmentsPage;
