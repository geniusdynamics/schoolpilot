import React, { useState } from 'react';
import { withCanonicalRepository } from '../data/withCanonicalRepository';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Select from '@/components/ui/Select';
import Textarea from '@/components/ui/Textarea';
import Badge from '@/components/ui/Badge';
import { DataGrid, DataGridColumn } from '@/components/ui/data';

import { useAppData } from '@/hooks/useAppData';
import { useCanonicalLearners } from '../data/useCanonicalLearners';
import { useTranslation } from 'react-i18next';
import type { StudentClearanceRequest, ClearanceRequestStatus, ClearanceStatus } from '../data/types';
import { CheckCircleIcon, EyeIcon, PlusIcon } from '@/components/ui/icons';
import { useToast } from '@/hooks/useToast';

const StudentClearancePage: React.FC = () => {
  const { t } = useTranslation('administration');
  const {
    student_clearance_requests = [],
    academic_years = [],
  } = useAppData();
  const { learners: students, isLoading: loading } = useCanonicalLearners();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<StudentClearanceRequest | null>(null);
  const [formData, setFormData] = useState({
    student_id: '',
    academic_year_id: '',
    reason: ''
  });

  const handleInputChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const openModal = () => {
    setFormData({ student_id: '', academic_year_id: '', reason: '' });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedRequest(null);
  };

  const toast = useToast();
  const handleSubmit = async () => {
    if (!formData.student_id || !formData.reason) {
      toast.showWarning('Please select a student and provide a reason');
      return;
    }

    closeModal();
  };

  const getStatusBadge = (status: ClearanceRequestStatus | ClearanceStatus) => {
    return <Badge variant={status === 'Completed' || status === 'Cleared' ? 'success' : status === 'In Progress' || status === 'Pending' ? 'info' : status === 'Not Cleared' ? 'danger' : 'warning'}>{status}</Badge>;
  };

  const requestColumns: DataGridColumn<StudentClearanceRequest>[] = [
    { key: 'admission_number', header: 'Admission No', width: 120, sortable: true, filterable: true },
    { key: 'student_name', header: 'Student Name', width: 180, sortable: true, filterable: true },
    { key: 'academic_year_name', header: 'Academic Year', width: 120, sortable: true },
    { key: 'reason', header: 'Reason', width: 200, sortable: false },
    {
      key: 'cleared_departments',
      header: 'Progress',
      width: 150,
      sortable: true,
      render: (value, item) => (
        <div className="flex items-center">
          <div className="flex-1 bg-gray-200 rounded-full h-2 mr-2">
            <div
              className="bg-green-500 h-2 rounded-full"
              style={{ width: `${item.total_departments > 0 ? (item.cleared_departments / item.total_departments) * 100 : 0}%` }}
            />
          </div>
          <span className="text-xs font-medium">{item.cleared_departments}/{item.total_departments}</span>
        </div>
      )
    },
    {
      key: 'status',
      header: 'Status',
      width: 110,
      sortable: true,
      filterable: true,
      render: (value, item) => getStatusBadge(item.status)
    },
    {
      key: 'requested_at',
      header: 'Requested',
      width: 110,
      sortable: true,
      render: (value) => new Date(value).toLocaleDateString()
    },
    {
      key: 'id',
      header: 'Actions',
      width: 100,
      sortable: false,
      render: (value, item) => (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setSelectedRequest(item)}
          leftIcon={<EyeIcon className="w-4 h-4" />}
        >
          View
        </Button>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <Card
        title={t('clearance.title')}
        description={t('clearance.description')}
        actions={
          <Button onClick={openModal} leftIcon={<PlusIcon className="w-5 h-5" />}>
            {t('clearance.newRequest')}
          </Button>
        }
      >
        <DataGrid
          data={student_clearance_requests as StudentClearanceRequest[]}
          columns={requestColumns}
          sortable={true}
          filterable={true}
          loading={loading}
          emptyState={
            <div className="text-center py-8">
              <CheckCircleIcon className="w-12 h-12 text-surface-muted-fg mx-auto mb-4" />
              <p className="text-surface-muted-fg">No clearance requests found.</p>
            </div>
          }
        />
      </Card>

      {/* Request Details Modal */}
      {selectedRequest && (
        <Modal
          isOpen={!!selectedRequest}
          onClose={() => setSelectedRequest(null)}
          title="Clearance Request Details"
          size="lg"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-surface-foreground">Student Name</label>
                <p className="mt-1">{selectedRequest.student_name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-surface-foreground">Admission Number</label>
                <p className="mt-1">{selectedRequest.admission_number}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-surface-foreground">Academic Year</label>
                <p className="mt-1">{selectedRequest.academic_year_name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-surface-foreground">Status</label>
                <div className="mt-1">{getStatusBadge(selectedRequest.status)}</div>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-surface-foreground">Reason</label>
              <p className="mt-1">{selectedRequest.reason}</p>
            </div>

            <div className="grid grid-cols-4 gap-4">
              <div className="bg-primary-50 border border-primary-200 rounded-lg p-3">
                <div className="text-lg font-bold text-primary-700">{selectedRequest.total_departments}</div>
                <div className="text-xs text-primary-600">Total</div>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="text-lg font-bold text-green-700">{selectedRequest.cleared_departments}</div>
                <div className="text-xs text-green-600">Cleared</div>
              </div>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <div className="text-lg font-bold text-yellow-700">{selectedRequest.pending_departments}</div>
                <div className="text-xs text-yellow-600">Pending</div>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <div className="text-lg font-bold text-red-700">{selectedRequest.rejected_departments}</div>
                <div className="text-xs text-red-600">Rejected</div>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* New Request Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={t('clearance.newRequest')}
        footer={
          <>
            <Button variant="secondary" onClick={closeModal}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleSubmit}>
              {t('clearance.submitRequest')}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Select
            label="Student"
            value={formData.student_id}
            onChange={(value) => handleInputChange('student_id', value)}
            options={students.map((s) => ({ label: `${[s.first_name, s.last_name].filter(Boolean).join(' ')} (${s.admission_no})`, value: s.id }))}
            required
          />
          <Select
            label="Academic Year"
            value={formData.academic_year_id}
            onChange={(value) => handleInputChange('academic_year_id', value)}
            options={academic_years.map((y: any) => ({ label: y.name, value: y.id }))}
          />
          <Textarea
            label="Reason for Clearance"
            value={formData.reason}
            onChange={(value) => handleInputChange('reason', value)}
            required
            rows={4}
          />
        </div>
      </Modal>
    </div>
  );
};

const StudentClearancePageWithRepository = withCanonicalRepository(StudentClearancePage);
export default StudentClearancePageWithRepository;

export const StudentClearanceContent = StudentClearancePage;
