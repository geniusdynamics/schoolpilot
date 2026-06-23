import React, { useState, useMemo } from 'react';
import { useAppData } from '@/hooks/useAppData';
import Card from '@/components/ui/Card';
import { DataGrid, DataGridColumn } from '@/components/ui/data';
import Button from '@/components/ui/Button';
import DialogForm from '@/components/ui/forms/DialogForm';
import FormSection from '@/components/ui/forms/FormSection';
import FormField from '@/components/ui/forms/FormField';
import FormActions from '@/components/ui/forms/FormActions';
import { MegaphoneIcon, CalendarIcon, UserIcon, CheckCircleIcon, XCircleIcon } from '@/components/ui/icons';
import Spinner from '@/components/ui/Spinner';
import { useTranslation } from 'react-i18next';
import { initialMockResultDistributions } from '../data/mockData';
import type { ResultDistribution } from '../data/types';

export const DistributeResultsPageContent: React.FC = () => {
  const { t } = useTranslation('academics');
  const { examSessions, classes, students, loading } = useAppData();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDistribution, setSelectedDistribution] = useState<ResultDistribution | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [methodFilter, setMethodFilter] = useState('');

  const initialFormData = {
    exam_session_id: '',
    class_id: '',
    distribution_method: 'Portal' as const,
    scheduled_date: new Date().toISOString().split('T')[0],
    notes: ''
  };
  const [formData, setFormData] = useState(initialFormData);

  // Use centralized mock data (in production, this would come from useAppData)
  const mockDistributions: ResultDistribution[] = useMemo(() => {
    let filtered = initialMockResultDistributions;

    if (searchTerm) {
      filtered = filtered.filter(dist => 
        (dist.exam_session_name?.toLowerCase() ?? '').includes(searchTerm.toLowerCase()) ||
        (dist.class_name?.toLowerCase() ?? '').includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter) {
      filtered = filtered.filter(dist => dist.status === statusFilter);
    }

    if (methodFilter) {
      filtered = filtered.filter(dist => dist.distribution_method === methodFilter);
    }

    return filtered;
  }, [searchTerm, statusFilter, methodFilter]);

  const openModal = (distribution?: ResultDistribution) => {
    setSelectedDistribution(distribution || null);
    setFormData(distribution ? {
      exam_session_id: distribution.exam_session_id,
      class_id: distribution.class_id,
      distribution_method: distribution.distribution_method,
      scheduled_date: distribution.scheduled_date.split('T')[0],
      notes: distribution.notes || ''
    } : initialFormData);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedDistribution(null);
    setFormData(initialFormData);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = () => {
    if (!formData.exam_session_id || !formData.class_id) {
      alert('Exam session and class are required.');
      return;
    }
    console.log('Scheduling distribution:', formData);
    closeModal();
  };

  const handleDistributeNow = (distribution: ResultDistribution) => {
    console.log('Distributing now:', distribution.id);
    // In production, this would trigger immediate distribution
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      'Pending': 'bg-yellow-100 text-yellow-800',
      'Distributed': 'bg-green-100 text-green-800',
      'Failed': 'bg-red-100 text-red-800'
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status as keyof typeof styles]}`}>
        {status}
      </span>
    );
  };

  const getMethodBadge = (method: string) => {
    const styles = {
      'Portal': 'bg-blue-100 text-blue-800',
      'SMS': 'bg-purple-100 text-purple-800',
      'Email': 'bg-green-100 text-green-800',
      'Print': 'bg-gray-100 text-gray-800'
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[method as keyof typeof styles]}`}>
        {method}
      </span>
    );
  };

  const columns: DataGridColumn<ResultDistribution>[] = [
    {
      key: 'exam_session_name',
      header: 'Exam Session',
      sortable: true,
      filterable: true
    },
    {
      key: 'class_name',
      header: 'Class',
      sortable: true,
      filterable: true
    },
    {
      key: 'distribution_method',
      header: 'Method',
      sortable: true,
      filterable: true,
      render: (value) => getMethodBadge(value)
    },
    {
      key: 'scheduled_date',
      header: 'Scheduled',
      sortable: true,
      render: (value) => value ? new Date(value).toLocaleDateString() : '-'
    },
    {
      key: 'distributed_at',
      header: 'Distributed',
      sortable: true,
      render: (value) => value ? new Date(value).toLocaleDateString() : '-'
    },
    {
      key: 'recipients_count',
      header: 'Recipients',
      sortable: true,
      render: (value) => value
    },
    {
      key: 'success_count',
      header: 'Success',
      sortable: true,
      render: (value) => <span className="text-green-600 font-semibold">{value}</span>
    },
    {
      key: 'failure_count',
      header: 'Failed',
      sortable: true,
      render: (value) => value > 0 ? <span className="text-red-600 font-semibold">{value}</span> : <span className="text-gray-400">0</span>
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      filterable: true,
      render: (value) => getStatusBadge(value)
    }
  ];

  const statusOptions = ['Pending', 'Distributed', 'Failed'];
  const methodOptions = ['Portal', 'SMS', 'Email', 'Print'];

  const totals = useMemo(() => {
    return {
      total: mockDistributions.length,
      distributed: mockDistributions.filter(r => r.status === 'Distributed').length,
      pending: mockDistributions.filter(r => r.status === 'Pending').length,
      failed: mockDistributions.filter(r => r.status === 'Failed').length
    };
  }, [mockDistributions]);

  if (loading?.all && mockDistributions.length === 0) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner size="lg" />
        <span className="ml-2">Loading result distributions...</span>
      </div>
    );
  }

  return (
    <div className="p-6">
      <Card 
        title={
          <div className="flex items-center gap-2">
            <MegaphoneIcon className="w-6 h-6 text-pink-600" />
            <span>Distribute Results</span>
          </div>
        }
        extra={
          <Button onClick={() => openModal()} variant="primary">
            Schedule Distribution
          </Button>
        }
      >
        <div className="mb-6 p-4 bg-pink-50 border border-pink-200 rounded-lg">
          <div className="flex items-start gap-3">
            <MegaphoneIcon className="w-5 h-5 text-pink-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-pink-800">Result Distribution Workflow</h3>
              <p className="text-sm text-pink-700 mt-1">
                Distribute exam results to students and parents through multiple channels: student portal, SMS, email, or printed copies. 
                Schedule distributions for automatic delivery or trigger immediate distribution.
              </p>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-gray-600">
              <MegaphoneIcon className="w-5 h-5" />
              <span className="text-sm font-medium">Total Distributions</span>
            </div>
            <p className="text-2xl font-bold text-gray-800 mt-2">
              {totals.total}
            </p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-gray-600">
              <CheckCircleIcon className="w-5 h-5 text-green-600" />
              <span className="text-sm font-medium">Distributed</span>
            </div>
            <p className="text-2xl font-bold text-green-600 mt-2">
              {totals.distributed}
            </p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-gray-600">
              <CalendarIcon className="w-5 h-5 text-yellow-600" />
              <span className="text-sm font-medium">Pending</span>
            </div>
            <p className="text-2xl font-bold text-yellow-600 mt-2">
              {totals.pending}
            </p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-gray-600">
              <XCircleIcon className="w-5 h-5 text-red-600" />
              <span className="text-sm font-medium">Failed</span>
            </div>
            <p className="text-2xl font-bold text-red-600 mt-2">
              {totals.failed}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 flex gap-4 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setStatusFilter(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="">All Statuses</option>
              {statusOptions.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Method</label>
            <select
              value={methodFilter}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setMethodFilter(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="">All Methods</option>
              {methodOptions.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <input
              type="text"
              placeholder="Exam session, class..."
              value={searchTerm}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </div>
        </div>

        <DataGrid
          data={mockDistributions}
          columns={columns}
          searchable={false}
          exportable={true}
        />
      </Card>

      {/* Schedule Distribution Modal */}
      <DialogForm
        isOpen={isModalOpen}
        onClose={closeModal}
        title={selectedDistribution ? 'Edit Distribution' : 'Schedule Distribution'}
      >
        <FormSection>
          <FormField label="Exam Session" required>
            <select
              name="exam_session_id"
              value={formData.exam_session_id}
              onChange={handleInputChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="">Select exam session</option>
              {examSessions?.map(session => (
                <option key={session.id} value={session.id}>{session.name}</option>
              ))}
            </select>
          </FormField>

          <FormField label="Class" required>
            <select
              name="class_id"
              value={formData.class_id}
              onChange={handleInputChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="">Select class</option>
              {classes?.map(cls => (
                <option key={cls.id} value={cls.id}>{cls.name}</option>
              ))}
            </select>
          </FormField>

          <FormField label="Distribution Method">
            <select
              name="distribution_method"
              value={formData.distribution_method}
              onChange={handleInputChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              {methodOptions.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </FormField>

          <FormField label="Scheduled Date">
            <input
              type="date"
              name="scheduled_date"
              value={formData.scheduled_date}
              onChange={handleInputChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </FormField>

          <FormField label="Notes">
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              placeholder="Add distribution notes..."
              rows={3}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </FormField>
        </FormSection>

        <FormActions
          onCancel={closeModal}
          onSubmit={handleSubmit}
          submitLabel={selectedDistribution ? 'Update' : 'Schedule'}
        />
      </DialogForm>
    </div>
  );
};
const DistributeResultsPage: React.FC = () => (
  <div className="space-y-6">
    <DistributeResultsPageContent />
  </div>
);

export default DistributeResultsPage;
