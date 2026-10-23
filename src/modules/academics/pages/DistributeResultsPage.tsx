import React, { useState, useMemo } from 'react';
import { useAppData } from '@/hooks/useAppData';
import Card from '@/components/ui/Card';
import { DataGrid, DataGridColumn } from '@/components/ui/data';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import DialogForm from '@/components/ui/forms/DialogForm';
import FormSection from '@/components/ui/forms/FormSection';
import FormField from '@/components/ui/forms/FormField';
import FormActions from '@/components/ui/forms/FormActions';

import Spinner from '@/components/ui/Spinner';
import { useDatabaseCollection } from '@/hooks/useDatabaseCollection';
import type { ResultDistribution } from '../data/types';
import { logger } from '@/utils/logging';
import { CalendarIcon, CheckCircleIcon, MegaphoneIcon, XCircleIcon } from '@/components/ui/icons';
import { useToast } from '@/hooks/useToast';

export const DistributeResultsPageContent: React.FC = () => {
  const { examSessions, classes, loading } = useAppData();

  const distributionsCollection = useDatabaseCollection<ResultDistribution>('result_distributions');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDistribution, setSelectedDistribution] = useState<ResultDistribution | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [methodFilter, setMethodFilter] = useState('');

  const initialFormData = {
    exam_session_id: '',
    class_id: '',
    distribution_method: 'Portal' as ResultDistribution['distribution_method'],
    scheduled_date: new Date().toISOString().split('T')[0],
    notes: ''
  };
  const [formData, setFormData] = useState(initialFormData);

  // Live collection data from result_distributions
  const mockDistributions: ResultDistribution[] = useMemo(() => {
    let filtered = distributionsCollection.data;

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
  }, [distributionsCollection.data, searchTerm, statusFilter, methodFilter]);

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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const toast = useToast();
  const handleSubmit = async () => {
    if (!formData.exam_session_id || !formData.class_id) {
      toast.showWarning('Exam session and class are required.');
      return;
    }

    const session = examSessions?.find(s => String(s.id) === String(formData.exam_session_id));
    const cls = classes?.find(c => String(c.id) === String(formData.class_id));

    try {
      if (selectedDistribution) {
        await distributionsCollection.update(selectedDistribution.id, {
          exam_session_id: formData.exam_session_id,
          exam_session_name: session?.name ?? selectedDistribution.exam_session_name,
          class_id: formData.class_id,
          class_name: cls?.name ?? selectedDistribution.class_name,
          distribution_method: formData.distribution_method,
          scheduled_date: formData.scheduled_date,
          notes: formData.notes
        });
        toast.showSuccess('Distribution updated.');
      } else {
        await distributionsCollection.insert({
          exam_session_id: formData.exam_session_id,
          exam_session_name: session?.name ?? '',
          class_id: formData.class_id,
          class_name: cls?.name ?? '',
          distribution_method: formData.distribution_method,
          status: 'Pending',
          scheduled_date: formData.scheduled_date,
          distributed_at: null,
          recipients_count: 0,
          success_count: 0,
          failure_count: 0,
          notes: formData.notes || undefined
        });
        toast.showSuccess('Distribution scheduled.');
      }
      logger.info('Saved result distribution:', formData);
    } catch (err) {
      logger.error('Failed to save result distribution:', err);
      toast.showError('Failed to save result distribution.');
    }
    closeModal();
  };

  const handleDistributeNow = async (distribution: ResultDistribution) => {
    try {
      await distributionsCollection.update(distribution.id, {
        status: 'Distributed',
        distributed_at: new Date().toISOString(),
        success_count: distribution.recipients_count,
        failure_count: 0
      });
      toast.showSuccess('Distribution completed.');
      logger.info('Distributing now:', distribution.id);
    } catch (err) {
      logger.error('Failed to distribute results:', err);
      toast.showError('Failed to distribute results.');
    }
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
      'Portal': 'bg-primary-100 text-primary-800',
      'SMS': 'bg-purple-100 text-purple-800',
      'Email': 'bg-green-100 text-green-800',
      'Print': 'bg-surface-accent text-surface-foreground'
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
      render: (value) => value > 0 ? <span className="text-red-600 font-semibold">{value}</span> : <span className="text-surface-muted-fg">0</span>
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      filterable: true,
      render: (value) => getStatusBadge(value)
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (_value, record) => record.status === 'Pending' ? (
        <Button variant="ghost" onClick={() => handleDistributeNow(record)}>Distribute Now</Button>
      ) : null
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

  if ((loading?.all || distributionsCollection.loading) && mockDistributions.length === 0) {
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
        actions={
          <Button onClick={() => openModal()} variant="primary">
            Schedule Distribution
          </Button>
        }
        info="Distribute exam results to students and parents through multiple channels: student portal, SMS, email, or printed copies. Schedule distributions for automatic delivery or trigger immediate distribution."
      >

        {/* Summary Cards */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-surface-card border border-surface-border rounded-lg p-4">
            <div className="flex items-center gap-2 text-surface-muted-fg">
              <MegaphoneIcon className="w-5 h-5" />
              <span className="text-sm font-medium">Total Distributions</span>
            </div>
            <p className="text-2xl font-bold text-surface-foreground mt-2">
              {totals.total}
            </p>
          </div>
          <div className="bg-surface-card border border-surface-border rounded-lg p-4">
            <div className="flex items-center gap-2 text-surface-muted-fg">
              <CheckCircleIcon className="w-5 h-5 text-green-600" />
              <span className="text-sm font-medium">Distributed</span>
            </div>
            <p className="text-2xl font-bold text-green-600 mt-2">
              {totals.distributed}
            </p>
          </div>
          <div className="bg-surface-card border border-surface-border rounded-lg p-4">
            <div className="flex items-center gap-2 text-surface-muted-fg">
              <CalendarIcon className="w-5 h-5 text-yellow-600" />
              <span className="text-sm font-medium">Pending</span>
            </div>
            <p className="text-2xl font-bold text-yellow-600 mt-2">
              {totals.pending}
            </p>
          </div>
          <div className="bg-surface-card border border-surface-border rounded-lg p-4">
            <div className="flex items-center gap-2 text-surface-muted-fg">
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
            <label className="block text-sm font-medium text-surface-foreground mb-1">Status</label>
            <Select
              value={statusFilter}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setStatusFilter(e.target.value)}
              className="w-full"
            >
              <option value="">All Statuses</option>
              {statusOptions.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </Select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-surface-foreground mb-1">Method</label>
            <Select
              value={methodFilter}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setMethodFilter(e.target.value)}
              className="w-full"
            >
              <option value="">All Methods</option>
              {methodOptions.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </Select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-surface-foreground mb-1">Search</label>
            <input
              type="text"
              placeholder="Exam session, class..."
              value={searchTerm}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
              className="w-full border border-surface-border rounded-md px-3 py-2"
            />
          </div>
        </div>

        <DataGrid
          data={mockDistributions}
          columns={columns}
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
            <Select
              name="exam_session_id"
              value={formData.exam_session_id}
              onChange={handleInputChange}
              className="w-full"
            >
              <option value="">Select exam session</option>
              {examSessions?.map(session => (
                <option key={session.id} value={session.id}>{session.name}</option>
              ))}
            </Select>
          </FormField>

          <FormField label="Class" required>
            <Select
              name="class_id"
              value={formData.class_id}
              onChange={handleInputChange}
              className="w-full"
            >
              <option value="">Select class</option>
              {classes?.map(cls => (
                <option key={cls.id} value={cls.id}>{cls.name}</option>
              ))}
            </Select>
          </FormField>

          <FormField label="Distribution Method">
            <Select
              name="distribution_method"
              value={formData.distribution_method}
              onChange={handleInputChange}
              className="w-full"
            >
              {methodOptions.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </Select>
          </FormField>

          <FormField label="Scheduled Date">
            <input
              type="date"
              name="scheduled_date"
              value={formData.scheduled_date}
              onChange={handleInputChange}
              className="w-full border border-surface-border rounded-md px-3 py-2"
            />
          </FormField>

          <FormField label="Notes">
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              placeholder="Add distribution notes..."
              rows={3}
              className="w-full border border-surface-border rounded-md px-3 py-2"
            />
          </FormField>
        </FormSection>

        <FormActions>
          <Button variant="secondary" onClick={closeModal}>Cancel</Button>
          <Button onClick={handleSubmit}>{selectedDistribution ? 'Update' : 'Schedule'}</Button>
        </FormActions>
      </DialogForm>
    </div>
  );
};
const DistributeResultsPage: React.FC = () => (
  <div className="space-y-3">
    <DistributeResultsPageContent />
  </div>
);

export default DistributeResultsPage;
