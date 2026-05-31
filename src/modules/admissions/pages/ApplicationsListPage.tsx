import React, { useState, useMemo } from 'react';
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
  SearchIcon,
  FilterIcon,
  DownloadIcon,
  DocumentTextIcon,
} from '@/components/ui/icons';
import { useAdmissionsData } from '../data/useAdmissionsData';
import {
  Application,
  ApplicationStatus,
  ApplicationFilters,
  ApplicationType,
} from '../data/types';
import { useToast } from '@/hooks/useToast';

const statusColors: Record<ApplicationStatus, string> = {
  [ApplicationStatus.DRAFT]: 'bg-gray-100 text-gray-800',
  [ApplicationStatus.SUBMITTED]: 'bg-blue-100 text-blue-800',
  [ApplicationStatus.UNDER_REVIEW]: 'bg-yellow-100 text-yellow-800',
  [ApplicationStatus.INTERVIEW_SCHEDULED]: 'bg-purple-100 text-purple-800',
  [ApplicationStatus.APPROVED]: 'bg-green-100 text-green-800',
  [ApplicationStatus.REJECTED]: 'bg-red-100 text-red-800',
  [ApplicationStatus.DEFERRED]: 'bg-orange-100 text-orange-800',
  [ApplicationStatus.WAITLISTED]: 'bg-indigo-100 text-indigo-800',
  [ApplicationStatus.ENROLLED]: 'bg-teal-100 text-teal-800',
};

export const ApplicationsListPageContent: React.FC = () => {
  const navigate = useNavigate();
  const { applications, loading, deleteApplication } = useAdmissionsData();
  const { showToast } = useToast();
  const [filters, setFilters] = useState<ApplicationFilters>({});
  const [showFilters, setShowFilters] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [applicationToDelete, setApplicationToDelete] = useState<Application | null>(null);

  const filteredApplications = useMemo(() => {
    return applications.filter(app => {
      if (filters.status && app.status !== filters.status) return false;
      if (filters.classId && app.intendedClassId !== filters.classId) return false;
      if (filters.applicationType && app.applicationType !== filters.applicationType) return false;
      if (filters.searchQuery) {
        const search = filters.searchQuery.toLowerCase();
        const fullName = `${app.firstName} ${app.middleName || ''} ${app.lastName}`.toLowerCase();
        return (
          fullName.includes(search) ||
          app.applicationNumber.toLowerCase().includes(search)
        );
      }
      return true;
    });
  }, [applications, filters]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters(prev => ({ ...prev, searchQuery: e.target.value }));
  };

  const handleFilterChange = (key: keyof ApplicationFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value || undefined }));
  };

  const clearFilters = () => {
    setFilters({});
  };

  const handleView = (application: Application) => {
    navigate(`/admissions/applications/${application.id}`);
  };

  const handleEdit = (application: Application) => {
    if (application.status === ApplicationStatus.DRAFT) {
      navigate(`/admissions/applications/${application.id}/edit`);
    } else {
      showToast({
        type: 'warning',
        message: 'Only draft applications can be edited.',
      });
    }
  };

  const handleDeleteClick = (application: Application) => {
    setApplicationToDelete(application);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (applicationToDelete) {
      try {
        await deleteApplication(applicationToDelete.id);
        showToast({
          type: 'success',
          message: 'Application deleted successfully.',
        });
      } catch (error) {
        showToast({
          type: 'error',
          message: 'Failed to delete application.',
        });
      }
    }
    setDeleteModalOpen(false);
    setApplicationToDelete(null);
  };

  const handleExport = () => {
    // Export to CSV functionality
    const csvContent = [
      ['Application Number', 'Student Name', 'Class', 'Status', 'Submission Date'].join(','),
      ...filteredApplications.map(app => [
        app.applicationNumber,
        `${app.firstName} ${app.lastName}`,
        app.intendedClassName || 'N/A',
        app.status,
        app.submissionDate ? new Date(app.submissionDate).toLocaleDateString() : 'N/A',
      ].join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `applications_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const columns: DataGridColumn<Application>[] = [
    {
      key: 'applicationNumber',
      header: 'Application #',
      sortable: true,
      filterable: true,
      width: 150,
      render: (value) => <span className="font-mono text-sm">{value}</span>,
    },
    {
      key: 'name',
      header: 'Applicant Name',
      sortable: true,
      filterable: true,
      width: 200,
      render: (_, item) => (
        <span>{`${item.firstName} ${item.middleName || ''} ${item.lastName}`}</span>
      ),
    },
    {
      key: 'intendedClassName',
      header: 'Intended Class',
      sortable: true,
      filterable: true,
      width: 150,
      render: (value) => value || 'N/A',
    },
    {
      key: 'applicationType',
      header: 'Type',
      sortable: true,
      filterable: true,
      width: 120,
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      filterable: true,
      width: 150,
      render: (value: ApplicationStatus) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[value]}`}>
          {value}
        </span>
      ),
    },
    {
      key: 'submissionDate',
      header: 'Submission Date',
      sortable: true,
      width: 150,
      render: (value) =>
        value ? new Date(value).toLocaleDateString() : 'Not submitted',
    },
    {
      key: 'actions',
      header: 'Actions',
      sortable: false,
      filterable: false,
      width: 200,
      sticky: 'right',
      render: (_, item) => (
        <div className="flex space-x-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleView(item)}
            leftIcon={<EyeIcon className="w-4 h-4" />}
          >
            View
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleEdit(item)}
            disabled={item.status !== ApplicationStatus.DRAFT}
            leftIcon={<EditIcon className="w-4 h-4" />}
          >
            Edit
          </Button>
          <Button
            size="sm"
            variant="danger"
            onClick={() => handleDeleteClick(item)}
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
        title="Applications"
        subtitle="Manage and track all admission applications"
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
              variant="outline"
              onClick={handleExport}
              leftIcon={<DownloadIcon className="w-4 h-4" />}
            >
              Export
            </Button>
            <Button
              as="a"
              href="/admissions/new-application"
              leftIcon={<PlusIcon className="w-5 h-5" />}
            >
              New Application
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
                placeholder="Search by name or application number..."
                value={filters.searchQuery || ''}
                onChange={handleSearchChange}
                className="pl-10"
              />
            </div>
          </div>

          {showFilters && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4">
              <Select
                label="Status"
                value={filters.status || ''}
                onChange={(e) => handleFilterChange('status', e.target.value)}
              >
                <option value="">All Statuses</option>
                {Object.values(ApplicationStatus).map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </Select>
              <Select
                label="Application Type"
                value={filters.applicationType || ''}
                onChange={(e) => handleFilterChange('applicationType', e.target.value)}
              >
                <option value="">All Types</option>
                {Object.values(ApplicationType).map((type) => (
                  <option key={type} value={type}>
                    {type}
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
          data={filteredApplications}
          sortable
          filterable
          loading={loading}
          emptyState={
            <div className="text-center py-12">
              <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                No applications found
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Get started by creating a new application.
              </p>
              <div className="mt-6">
                <Button as="a" href="/admissions/new-application">
                  New Application
                </Button>
              </div>
            </div>
          }
        />
      </Card>

      {/* Delete Confirmation Dialog */}
      <DialogForm
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Confirm Delete"
        size="sm"
        actions={
          <FormActions>
            <Button variant="secondary" onClick={() => setDeleteModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={confirmDelete}>
              Delete
            </Button>
          </FormActions>
        }
      >
        <p>
          Are you sure you want to delete the application for{' '}
          <strong>
            {applicationToDelete
              ? `${applicationToDelete.firstName} ${applicationToDelete.lastName}`
              : ''}
          </strong>
          ? This action cannot be undone.
        </p>
      </DialogForm>
    </div>
  );
};
const ApplicationsListPage: React.FC = () => (
  <div className="space-y-6">
    <ApplicationsListPageContent />
  </div>
);

export default ApplicationsListPage;
