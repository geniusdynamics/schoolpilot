import React, { useState, useMemo, useCallback } from 'react';
import Card from '@/components/ui/Card';
import { DataGrid, DataGridColumn } from '@/components/ui/data';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import DialogForm from '@/components/ui/forms/DialogForm';
import FormSection from '@/components/ui/forms/FormSection';
import FormActions from '@/components/ui/forms/FormActions';
import { useNavigate } from 'react-router-dom';
import {
  PlusIcon,
  EyeIcon,
  EditIcon,
  DeleteIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  DocumentTextIcon,
} from '@/components/ui/icons';
import { useAssignmentsData } from '../../data/useAssignmentsData';
import type { Assignment } from '../../data/types';
import { AssignmentStatus } from '../../data/types';
import { useToast } from '@/hooks/useToast';
import { useTranslation } from 'react-i18next';

const statusColors: Record<AssignmentStatus, string> = {
  [AssignmentStatus.DRAFT]: 'bg-gray-100 text-gray-800',
  [AssignmentStatus.PUBLISHED]: 'bg-blue-100 text-blue-800',
  [AssignmentStatus.ARCHIVED]: 'bg-orange-100 text-orange-800',
};

const AssignmentsListPage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation('assignments');
  const { assignments, submissions, loading, createAssignment, updateAssignment, deleteAssignment } = useAssignmentsData();
  const { showToast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterSubject, setFilterSubject] = useState('');
  const [filterClass, setFilterClass] = useState('');

  // Create/Edit dialog state
  const [createFormOpen, setCreateFormOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    instructions: '',
    subjectId: '',
    classStreamId: '',
    teacherId: '',
    teacherName: '',
    assignedDate: new Date().toISOString().split('T')[0],
    dueDate: '',
    status: AssignmentStatus.DRAFT as AssignmentStatus,
    maxScore: '100',
    weightPercentage: '10',
    allowLateSubmission: true,
    latePenaltyPercentage: '10',
  });

  // Delete confirmation state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [assignmentToDelete, setAssignmentToDelete] = useState<Assignment | null>(null);

  // Get unique subjects and classes for filters
  const uniqueSubjects = useMemo(() => {
    const subjects = new Map<string, string>();
    assignments.forEach(a => {
      if (a.subjectName) subjects.set(a.subjectName, a.subjectId);
    });
    return Array.from(subjects.entries());
  }, [assignments]);

  const uniqueClasses = useMemo(() => {
    const classes = new Map<string, string>();
    assignments.forEach(a => {
      if (a.classStreamName) classes.set(a.classStreamName, a.classStreamId);
    });
    return Array.from(classes.entries());
  }, [assignments]);

  // Filter assignments
  const filteredAssignments = useMemo(() => {
    return assignments.filter(assignment => {
      if (filterStatus && assignment.status !== filterStatus) return false;
      if (filterSubject && assignment.subjectId !== filterSubject) return false;
      if (filterClass && assignment.classStreamId !== filterClass) return false;
      if (searchQuery) {
        const search = searchQuery.toLowerCase();
        return (
          (assignment.title?.toLowerCase() ?? '').includes(search) ||
          (assignment.description?.toLowerCase() ?? '').includes(search) ||
          (assignment.teacherName || '').toLowerCase().includes(search)
        );
      }
      return true;
    });
  }, [assignments, filterStatus, filterSubject, filterClass, searchQuery]);

  // Get submission count for an assignment
  const getSubmissionCount = useCallback((assignmentId: string) => {
    return submissions.filter(s => s.assignmentId === assignmentId).length;
  }, [submissions]);

  // Reset form data
  const resetForm = useCallback(() => {
    setFormData({
      title: '',
      description: '',
      instructions: '',
      subjectId: '',
      classStreamId: '',
      teacherId: '',
      teacherName: '',
      assignedDate: new Date().toISOString().split('T')[0],
      dueDate: '',
      status: AssignmentStatus.DRAFT,
      maxScore: '100',
      weightPercentage: '10',
      allowLateSubmission: true,
      latePenaltyPercentage: '10',
    });
  }, []);

  // Open create form
  const handleCreate = useCallback(() => {
    setEditingAssignment(null);
    resetForm();
    setCreateFormOpen(true);
  }, [resetForm]);

  // Open edit form
  const handleEdit = useCallback((assignment: Assignment) => {
    setEditingAssignment(assignment);
    setFormData({
      title: assignment.title,
      description: assignment.description,
      instructions: assignment.instructions || '',
      subjectId: String(assignment.subjectId),
      classStreamId: String(assignment.classStreamId),
      teacherId: assignment.teacherId,
      teacherName: assignment.teacherName || '',
      assignedDate: assignment.assignedDate.split('T')[0],
      dueDate: assignment.dueDate.split('T')[0],
      status: assignment.status,
      maxScore: String(assignment.maxScore || 100),
      weightPercentage: String(assignment.weightPercentage || 10),
      allowLateSubmission: assignment.allowLateSubmission,
      latePenaltyPercentage: String(assignment.latePenaltyPercentage || 10),
    });
    setCreateFormOpen(true);
  }, []);

  // Handle form submission
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title || !formData.dueDate) {
      showToast({
        type: 'error',
        message: 'Please fill in all required fields.',
      });
      return;
    }

    try {
      if (editingAssignment) {
        await updateAssignment(editingAssignment.id, {
          title: formData.title,
          description: formData.description,
          instructions: formData.instructions,
          subjectId: formData.subjectId,
          classStreamId: formData.classStreamId,
          teacherId: formData.teacherId,
          teacherName: formData.teacherName,
          dueDate: formData.dueDate,
          status: formData.status,
          maxScore: Number(formData.maxScore),
          weightPercentage: Number(formData.weightPercentage),
          allowLateSubmission: formData.allowLateSubmission,
          latePenaltyPercentage: Number(formData.latePenaltyPercentage),
        });
        showToast({
          type: 'success',
          message: 'Assignment updated successfully.',
        });
      } else {
        await createAssignment({
          title: formData.title,
          description: formData.description,
          instructions: formData.instructions,
          subjectId: formData.subjectId,
          classStreamId: formData.classStreamId,
          teacherId: formData.teacherId,
          teacherName: formData.teacherName,
          assignedDate: formData.assignedDate,
          dueDate: formData.dueDate,
          status: formData.status,
          maxScore: Number(formData.maxScore),
          weightPercentage: Number(formData.weightPercentage),
          allowLateSubmission: formData.allowLateSubmission,
          latePenaltyPercentage: Number(formData.latePenaltyPercentage),
        });
        showToast({
          type: 'success',
          message: 'Assignment created successfully.',
        });
      }
      setCreateFormOpen(false);
      resetForm();
    } catch (error) {
      showToast({
        type: 'error',
        message: editingAssignment ? 'Failed to update assignment.' : 'Failed to create assignment.',
      });
    }
  }, [formData, editingAssignment, createAssignment, updateAssignment, showToast, resetForm]);

  // Handle delete
  const handleDeleteClick = useCallback((assignment: Assignment) => {
    setAssignmentToDelete(assignment);
    setDeleteModalOpen(true);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (assignmentToDelete) {
      try {
        await deleteAssignment(assignmentToDelete.id);
        showToast({
          type: 'success',
          message: 'Assignment deleted successfully.',
        });
      } catch (error) {
        showToast({
          type: 'error',
          message: 'Failed to delete assignment.',
        });
      }
    }
    setDeleteModalOpen(false);
    setAssignmentToDelete(null);
  }, [assignmentToDelete, deleteAssignment, showToast]);

  // Handle view details
  const handleView = useCallback((assignment: Assignment) => {
    navigate(`/assignments/${assignment.id}`);
  }, [navigate]);

  // Columns for DataGrid
  const columns: DataGridColumn<Assignment>[] = [
    {
      key: 'title',
      header: t('assignment.fields.title'),
      sortable: true,
      filterable: true,
      width: 280,
      render: (value, item) => (
        <div>
          <span className="font-medium text-gray-900">{value}</span>
          {item.subjectName && (
            <p className="text-xs text-gray-500 truncate">{item.subjectName}</p>
          )}
        </div>
      ),
    },
    {
      key: 'classStreamName',
      header: t('assignment.fields.class'),
      sortable: true,
      filterable: true,
      width: 140,
      render: (value) => value || 'N/A',
    },
    {
      key: 'teacherName',
      header: t('assignment.fields.teacher'),
      sortable: true,
      filterable: true,
      width: 140,
      render: (value) => value || 'N/A',
    },
    {
      key: 'dueDate',
      header: t('assignment.fields.dueDate'),
      sortable: true,
      width: 140,
      render: (value) => {
        if (!value) return 'N/A';
        return new Date(value).toLocaleDateString();
      },
    },
    {
      key: 'status',
      header: t('assignment.fields.status'),
      sortable: true,
      filterable: true,
      width: 120,
      render: (value: AssignmentStatus) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[value]}`}>
          {t(`assignment.status.${value}`)}
        </span>
      ),
    },
    {
      key: 'submissions',
      header: 'Submissions',
      sortable: true,
      width: 120,
      render: (_, item) => {
        const count = getSubmissionCount(item.id);
        const total = item.submissionCount || 0;
        return (
          <span className="text-sm text-gray-700">
            {count} / {total || '?'}
          </span>
        );
      },
    },
    {
      key: 'maxScore',
      header: t('assignment.fields.maxScore'),
      sortable: true,
      width: 100,
      render: (value) => value ? `${value} pts` : '-',
    },
    {
      key: 'actions',
      header: 'Actions',
      sortable: false,
      filterable: false,
      width: 220,
      sticky: 'right',
      render: (_, item) => (
        <div className="flex space-x-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleView(item)}
            leftIcon={<EyeIcon className="w-4 h-4" />}
          >
            {t('common.edit').replace('Edit', 'View')}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleEdit(item)}
            leftIcon={<EditIcon className="w-4 h-4" />}
          >
            {t('common.edit')}
          </Button>
          <Button
            size="sm"
            variant="danger"
            onClick={() => handleDeleteClick(item)}
            leftIcon={<DeleteIcon className="w-4 h-4" />}
          >
            {t('common.delete')}
          </Button>
        </div>
      ),
    },
  ];

  const clearFilters = () => {
    setFilterStatus('');
    setFilterSubject('');
    setFilterClass('');
    setSearchQuery('');
  };

  return (
    <div className="space-y-6">
      <Card
        title={t('assignment.plural')}
        subtitle={t('description')}
        actions={
          <div className="flex space-x-2">
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              leftIcon={<FunnelIcon className="w-4 h-4" />}
            >
              Filters
            </Button>
            <Button
              onClick={handleCreate}
              leftIcon={<PlusIcon className="w-5 h-5" />}
            >
              {t('assignment.actions.create')}
            </Button>
          </div>
        }
      >
        {/* Search and Filters */}
        <div className="p-4 border-b">
          <div className="flex items-center space-x-4">
            <div className="flex-1 relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                placeholder="Search assignments..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {showFilters && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4">
              <Select
                label={t('assignment.fields.status')}
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="">All Statuses</option>
                {Object.values(AssignmentStatus).map((status) => (
                  <option key={status} value={status}>
                    {t(`assignment.status.${status}`)}
                  </option>
                ))}
              </Select>
              <Select
                label={t('assignment.fields.subject')}
                value={filterSubject}
                onChange={(e) => setFilterSubject(e.target.value)}
              >
                <option value="">All Subjects</option>
                {uniqueSubjects.map(([name, id]) => (
                  <option key={id} value={id}>
                    {name}
                  </option>
                ))}
              </Select>
              <Select
                label={t('assignment.fields.class')}
                value={filterClass}
                onChange={(e) => setFilterClass(e.target.value)}
              >
                <option value="">All Classes</option>
                {uniqueClasses.map(([name, id]) => (
                  <option key={id} value={id}>
                    {name}
                  </option>
                ))}
              </Select>
              <div className="flex items-end">
                <Button variant="ghost" onClick={clearFilters}>
                  Clear Filters
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Data Grid */}
        <DataGrid
          columns={columns}
          data={filteredAssignments}
          sortable
          filterable
          loading={loading}
          emptyState={
            <div className="text-center py-12">
              <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                {t('common.noData')}
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Get started by creating a new assignment.
              </p>
              <div className="mt-6">
                <Button onClick={handleCreate} leftIcon={<PlusIcon className="w-5 h-5" />}>
                  {t('assignment.actions.create')}
                </Button>
              </div>
            </div>
          }
        />
      </Card>

      {/* Create/Edit Assignment Dialog */}
      <DialogForm
        open={createFormOpen}
        onClose={() => {
          setCreateFormOpen(false);
          resetForm();
        }}
        title={editingAssignment ? t('assignment.actions.edit') : t('assignment.actions.create')}
        size="lg"
        onSubmit={handleSubmit}
      >
        <FormSection title="Basic Information" columns={2}>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('assignment.fields.title')} *
            </label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Enter assignment title"
              required
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('assignment.fields.description')}
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Brief description of the assignment"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={2}
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('assignment.fields.instructions')}
            </label>
            <textarea
              value={formData.instructions}
              onChange={(e) => setFormData(prev => ({ ...prev, instructions: e.target.value }))}
              placeholder="Detailed instructions for students"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
            />
          </div>
        </FormSection>

        <FormSection title="Details" columns={2}>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('assignment.fields.subject')}
            </label>
            <Input
              value={formData.subjectId}
              onChange={(e) => setFormData(prev => ({ ...prev, subjectId: e.target.value }))}
              placeholder="Subject ID"
              type="number"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('assignment.fields.class')}
            </label>
            <Input
              value={formData.classStreamId}
              onChange={(e) => setFormData(prev => ({ ...prev, classStreamId: e.target.value }))}
              placeholder="Class Stream ID"
              type="number"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('assignment.fields.teacher')}
            </label>
            <Input
              value={formData.teacherName}
              onChange={(e) => setFormData(prev => ({ ...prev, teacherName: e.target.value }))}
              placeholder="Teacher name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('assignment.fields.status')}
            </label>
            <Select
              value={formData.status}
              onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as AssignmentStatus }))}
            >
              {Object.values(AssignmentStatus).map((status) => (
                <option key={status} value={status}>
                  {t(`assignment.status.${status}`)}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('assignment.fields.assignedDate')}
            </label>
            <Input
              type="date"
              value={formData.assignedDate}
              onChange={(e) => setFormData(prev => ({ ...prev, assignedDate: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('assignment.fields.dueDate')} *
            </label>
            <Input
              type="date"
              value={formData.dueDate}
              onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
              required
            />
          </div>
        </FormSection>

        <FormSection title="Scoring & Options" columns={2}>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('assignment.fields.maxScore')}
            </label>
            <Input
              type="number"
              value={formData.maxScore}
              onChange={(e) => setFormData(prev => ({ ...prev, maxScore: e.target.value }))}
              min="0"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('assignment.fields.weightPercentage')}
            </label>
            <Input
              type="number"
              value={formData.weightPercentage}
              onChange={(e) => setFormData(prev => ({ ...prev, weightPercentage: e.target.value }))}
              min="0"
              max="100"
            />
          </div>
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="allowLate"
              checked={formData.allowLateSubmission}
              onChange={(e) => setFormData(prev => ({ ...prev, allowLateSubmission: e.target.checked }))}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="allowLate" className="text-sm text-gray-700">
              {t('assignment.fields.allowLateSubmission')}
            </label>
          </div>
          {formData.allowLateSubmission && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('assignment.fields.latePenaltyPercentage')}
              </label>
              <Input
                type="number"
                value={formData.latePenaltyPercentage}
                onChange={(e) => setFormData(prev => ({ ...prev, latePenaltyPercentage: e.target.value }))}
                min="0"
                max="100"
              />
            </div>
          )}
        </FormSection>

        <FormActions>
          <Button
            variant="secondary"
            onClick={() => {
              setCreateFormOpen(false);
              resetForm();
            }}
          >
            {t('common.cancel')}
          </Button>
          <Button type="submit" variant="primary">
            {editingAssignment ? t('common.save') : t('common.create')}
          </Button>
        </FormActions>
      </DialogForm>

      {/* Delete Confirmation Dialog */}
      <DialogForm
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Confirm Delete"
        size="sm"
        actions={
          <FormActions>
            <Button variant="secondary" onClick={() => setDeleteModalOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button variant="danger" onClick={confirmDelete}>
              {t('common.delete')}
            </Button>
          </FormActions>
        }
      >
        <p>
          Are you sure you want to delete the assignment{' '}
          <strong>{assignmentToDelete?.title}</strong>?
          {' '}This action cannot be undone.
        </p>
      </DialogForm>
    </div>
  );
};

export default AssignmentsListPage;
