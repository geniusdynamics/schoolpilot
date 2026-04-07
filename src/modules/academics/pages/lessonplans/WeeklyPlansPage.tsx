import React, { useState, useMemo } from 'react';
import Card from '@/components/ui/Card';
import { DataGrid, DataGridColumn } from '@/components/ui/data';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Textarea from '@/components/ui/Textarea';
import DialogForm from '@/components/ui/forms/DialogForm';
import FormSection from '@/components/ui/forms/FormSection';
import FormField from '@/components/ui/forms/FormField';
import FormActions from '@/components/ui/forms/FormActions';
import { useNavigate } from 'react-router-dom';
import {
  PlusIcon,
  EyeIcon,
  EditIcon,
  DeleteIcon,
  SearchIcon,
  FilterIcon,
  PaperAirplaneIcon,
  CalendarDaysIcon,
} from '@/components/ui/icons';
import { useLessonPlansData } from '../../data/lessonplans/useLessonPlansData';
import { WeeklyPlan, PlanStatus } from '../../data/types';
import { useToast } from '@/hooks/useToast';
import { useTranslation } from 'react-i18next';

const statusColors: Record<PlanStatus, string> = {
  [PlanStatus.DRAFT]: 'bg-gray-100 text-gray-800',
  [PlanStatus.SUBMITTED]: 'bg-blue-100 text-blue-800',
  [PlanStatus.APPROVED]: 'bg-green-100 text-green-800',
  [PlanStatus.REJECTED]: 'bg-red-100 text-red-800',
};

const statusLabels: Record<PlanStatus, string> = {
  [PlanStatus.DRAFT]: 'Draft',
  [PlanStatus.SUBMITTED]: 'Submitted',
  [PlanStatus.APPROVED]: 'Approved',
  [PlanStatus.REJECTED]: 'Rejected',
};

const WeeklyPlansPage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation('lessonplans');
  const { weeklyPlans, loading, createWeeklyPlan, updateWeeklyPlan, deleteWeeklyPlan, submitPlan } = useLessonPlansData();
  const { showToast } = useToast();

  const [filters, setFilters] = useState({
    status: '',
    searchQuery: '',
  });
  const [showFilters, setShowFilters] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [planToDelete, setPlanToDelete] = useState<WeeklyPlan | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<WeeklyPlan | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    teacherId: '',
    teacherName: '',
    subjectId: '',
    subjectName: '',
    classStreamId: '',
    classStreamName: '',
    weekStartDate: '',
    weekEndDate: '',
    overallObjectives: '',
    teachingAids: '',
    references: '',
  });

  const filteredPlans = useMemo(() => {
    return weeklyPlans.filter(plan => {
      if (filters.status && plan.status !== filters.status) return false;
      if (filters.searchQuery) {
        const search = filters.searchQuery.toLowerCase();
        return (
          (plan.teacherName || '').toLowerCase().includes(search) ||
          (plan.subjectName || '').toLowerCase().includes(search) ||
          (plan.classStreamName || '').toLowerCase().includes(search) ||
          plan.id.toLowerCase().includes(search)
        );
      }
      return true;
    });
  }, [weeklyPlans, filters]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters(prev => ({ ...prev, searchQuery: e.target.value }));
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value || '' }));
  };

  const clearFilters = () => {
    setFilters({ status: '', searchQuery: '' });
  };

  const resetForm = () => {
    setFormData({
      teacherId: '',
      teacherName: '',
      subjectId: '',
      subjectName: '',
      classStreamId: '',
      classStreamName: '',
      weekStartDate: '',
      weekEndDate: '',
      overallObjectives: '',
      teachingAids: '',
      references: '',
    });
  };

  const handleCreate = () => {
    resetForm();
    setCreateModalOpen(true);
  };

  const handleEdit = (plan: WeeklyPlan) => {
    setEditingPlan(plan);
    setFormData({
      teacherId: plan.teacherId,
      teacherName: plan.teacherName || '',
      subjectId: String(plan.subjectId),
      subjectName: plan.subjectName || '',
      classStreamId: String(plan.classStreamId),
      classStreamName: plan.classStreamName || '',
      weekStartDate: plan.weekStartDate,
      weekEndDate: plan.weekEndDate,
      overallObjectives: plan.overallObjectives,
      teachingAids: plan.teachingAids,
      references: plan.references,
    });
    setEditModalOpen(true);
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createWeeklyPlan({
        teacherId: formData.teacherId,
        teacherName: formData.teacherName,
        subjectId: Number(formData.subjectId),
        subjectName: formData.subjectName,
        classStreamId: Number(formData.classStreamId),
        classStreamName: formData.classStreamName,
        weekStartDate: formData.weekStartDate,
        weekEndDate: formData.weekEndDate,
        overallObjectives: formData.overallObjectives,
        teachingAids: formData.teachingAids,
        references: formData.references,
      });
      showToast({
        type: 'success',
        message: 'Weekly plan created successfully.',
      });
      setCreateModalOpen(false);
      resetForm();
    } catch (error) {
      showToast({
        type: 'error',
        message: 'Failed to create weekly plan.',
      });
    }
  };

  const handleUpdateForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlan) return;
    try {
      await updateWeeklyPlan(editingPlan.id, {
        teacherId: formData.teacherId,
        teacherName: formData.teacherName,
        subjectId: Number(formData.subjectId),
        subjectName: formData.subjectName,
        classStreamId: Number(formData.classStreamId),
        classStreamName: formData.classStreamName,
        weekStartDate: formData.weekStartDate,
        weekEndDate: formData.weekEndDate,
        overallObjectives: formData.overallObjectives,
        teachingAids: formData.teachingAids,
        references: formData.references,
      });
      showToast({
        type: 'success',
        message: 'Weekly plan updated successfully.',
      });
      setEditModalOpen(false);
      setEditingPlan(null);
    } catch (error) {
      showToast({
        type: 'error',
        message: 'Failed to update weekly plan.',
      });
    }
  };

  const handleDeleteClick = (plan: WeeklyPlan) => {
    setPlanToDelete(plan);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (planToDelete) {
      try {
        await deleteWeeklyPlan(planToDelete.id);
        showToast({
          type: 'success',
          message: 'Weekly plan deleted successfully.',
        });
      } catch (error) {
        showToast({
          type: 'error',
          message: 'Failed to delete weekly plan.',
        });
      }
    }
    setDeleteModalOpen(false);
    setPlanToDelete(null);
  };

  const handleView = (plan: WeeklyPlan) => {
    navigate(`/lessonplans/weekly/${plan.id}`);
  };

  const handleSubmitForApproval = async (plan: WeeklyPlan) => {
    try {
      await submitPlan(plan.id, plan.teacherName || 'Teacher');
      showToast({
        type: 'success',
        message: 'Plan submitted for approval.',
      });
    } catch (error) {
      showToast({
        type: 'error',
        message: 'Failed to submit plan for approval.',
      });
    }
  };

  const columns: DataGridColumn<WeeklyPlan>[] = [
    {
      key: 'id',
      header: 'Plan ID',
      sortable: true,
      width: 100,
      render: (value) => <span className="font-mono text-sm">{value}</span>,
    },
    {
      key: 'weekStartDate',
      header: 'Week',
      sortable: true,
      width: 200,
      render: (_, item) => {
        const start = new Date(item.weekStartDate).toLocaleDateString();
        const end = new Date(item.weekEndDate).toLocaleDateString();
        return <span className="text-sm">{start} - {end}</span>;
      },
    },
    {
      key: 'subjectName',
      header: 'Subject',
      sortable: true,
      width: 150,
      render: (value) => value || 'N/A',
    },
    {
      key: 'classStreamName',
      header: 'Class',
      sortable: true,
      width: 120,
      render: (value) => value || 'N/A',
    },
    {
      key: 'teacherName',
      header: 'Teacher',
      sortable: true,
      width: 150,
      render: (value) => value || 'N/A',
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      width: 130,
      render: (value: PlanStatus) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[value]}`}>
          {statusLabels[value]}
        </span>
      ),
    },
    {
      key: 'overallObjectives',
      header: 'Objectives',
      sortable: false,
      width: 250,
      render: (value) => (
        <span className="text-sm text-gray-600 line-clamp-2">{value}</span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      sortable: false,
      filterable: false,
      width: 250,
      sticky: 'right',
      render: (_, item) => (
        <div className="flex space-x-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleView(item)}
            leftIcon={<EyeIcon className="w-4 h-4" />}
          >
            View
          </Button>
          {item.status === PlanStatus.DRAFT && (
            <>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleEdit(item)}
                leftIcon={<EditIcon className="w-4 h-4" />}
              >
                Edit
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleSubmitForApproval(item)}
                leftIcon={<PaperAirplaneIcon className="w-4 h-4" />}
              >
                Submit
              </Button>
              <Button
                size="sm"
                variant="danger"
                onClick={() => handleDeleteClick(item)}
                leftIcon={<DeleteIcon className="w-4 h-4" />}
              >
                Delete
              </Button>
            </>
          )}
        </div>
      ),
    },
  ];

  const renderFormFields = () => (
    <FormSection columns={2}>
      <FormField label="Teacher" required>
        <Input
          value={formData.teacherName}
          onChange={(e) => setFormData(prev => ({ ...prev, teacherName: e.target.value, teacherId: e.target.value }))}
          placeholder="Enter teacher name"
        />
      </FormField>
      <FormField label="Subject" required>
        <Input
          value={formData.subjectName}
          onChange={(e) => setFormData(prev => ({ ...prev, subjectName: e.target.value, subjectId: e.target.value }))}
          placeholder="Enter subject"
        />
      </FormField>
      <FormField label="Class" required>
        <Input
          value={formData.classStreamName}
          onChange={(e) => setFormData(prev => ({ ...prev, classStreamName: e.target.value, classStreamId: e.target.value }))}
          placeholder="Enter class"
        />
      </FormField>
      <FormField label="Week Start Date" required>
        <Input
          type="date"
          value={formData.weekStartDate}
          onChange={(e) => setFormData(prev => ({ ...prev, weekStartDate: e.target.value }))}
        />
      </FormField>
      <FormField label="Week End Date" required>
        <Input
          type="date"
          value={formData.weekEndDate}
          onChange={(e) => setFormData(prev => ({ ...prev, weekEndDate: e.target.value }))}
        />
      </FormField>
      <FormField label="Teaching Aids">
        <Input
          value={formData.teachingAids}
          onChange={(e) => setFormData(prev => ({ ...prev, teachingAids: e.target.value }))}
          placeholder="e.g., Whiteboard, markers, textbook"
        />
      </FormField>
      <div className="col-span-2">
        <FormField label="Overall Objectives" required>
          <Textarea
            value={formData.overallObjectives}
            onChange={(e) => setFormData(prev => ({ ...prev, overallObjectives: e.target.value }))}
            placeholder="Enter overall learning objectives for the week..."
            rows={3}
          />
        </FormField>
      </div>
      <div className="col-span-2">
        <FormField label="References">
          <Textarea
            value={formData.references}
            onChange={(e) => setFormData(prev => ({ ...prev, references: e.target.value }))}
            placeholder="Enter references and textbooks..."
            rows={2}
          />
        </FormField>
      </div>
    </FormSection>
  );

  return (
    <div className="space-y-6">
      <Card
        title={t('weeklyPlan.plural')}
        subtitle={t('weeklyPlan.description', 'Manage weekly lesson plans')}
        actions={
          <div className="flex space-x-2">
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              leftIcon={<FilterIcon className="w-4 h-4" />}
            >
              Filters
            </Button>
            <Button
              onClick={handleCreate}
              leftIcon={<PlusIcon className="w-5 h-5" />}
            >
              {t('weeklyPlan.actions.create')}
            </Button>
          </div>
        }
      >
        {/* Search and Filters */}
        <div className="p-4 border-b">
          <div className="flex items-center space-x-4">
            <div className="flex-1 relative">
              <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                placeholder="Search by teacher, subject, or class..."
                value={filters.searchQuery}
                onChange={handleSearchChange}
                className="pl-10"
              />
            </div>
          </div>

          {showFilters && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              <Select
                label="Status"
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
              >
                <option value="">All Statuses</option>
                {Object.values(PlanStatus).map((status) => (
                  <option key={status} value={status}>
                    {statusLabels[status]}
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
          data={filteredPlans}
          sortable
          loading={loading}
          emptyState={
            <div className="text-center py-12">
              <CalendarDaysIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                {t('common.noData')}
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Get started by creating a new weekly plan.
              </p>
              <div className="mt-6">
                <Button onClick={handleCreate} leftIcon={<PlusIcon className="w-5 h-5" />}>
                  {t('weeklyPlan.actions.create')}
                </Button>
              </div>
            </div>
          }
        />
      </Card>

      {/* Create Dialog */}
      <DialogForm
        open={createModalOpen}
        onClose={() => { setCreateModalOpen(false); resetForm(); }}
        title={t('weeklyPlan.actions.create')}
        size="lg"
        actions={
          <FormActions>
            <Button variant="secondary" onClick={() => { setCreateModalOpen(false); resetForm(); }}>
              {t('common.cancel')}
            </Button>
            <Button variant="primary" onClick={handleSubmitForm}>
              {t('common.save')}
            </Button>
          </FormActions>
        }
      >
        {renderFormFields()}
      </DialogForm>

      {/* Edit Dialog */}
      <DialogForm
        open={editModalOpen}
        onClose={() => { setEditModalOpen(false); setEditingPlan(null); }}
        title={t('weeklyPlan.actions.edit')}
        size="lg"
        actions={
          <FormActions>
            <Button variant="secondary" onClick={() => { setEditModalOpen(false); setEditingPlan(null); }}>
              {t('common.cancel')}
            </Button>
            <Button variant="primary" onClick={handleUpdateForm}>
              {t('common.save')}
            </Button>
          </FormActions>
        }
      >
        {renderFormFields()}
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
          Are you sure you want to delete the weekly plan{' '}
          <strong>{planToDelete?.id}</strong> for {planToDelete?.subjectName}? This action cannot be undone.
        </p>
      </DialogForm>
    </div>
  );
};

export default WeeklyPlansPage;
