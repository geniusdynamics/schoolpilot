import React, { useState, useMemo } from 'react';
import { useAppData } from '@/hooks/useAppData';
import Card from '@/components/ui/Card';
import { DataGrid, DataGridColumn } from '@/components/ui/data';
import Button from '@/components/ui/Button';
import DialogForm from '@/components/ui/forms/DialogForm';
import FormSection from '@/components/ui/forms/FormSection';
import FormField from '@/components/ui/forms/FormField';
import { TicketIcon, PlusIcon, CheckIcon, XMarkIcon, PrinterIcon } from '@/components/ui/icons';
import Spinner from '@/components/ui/Spinner';
import { useTranslation } from 'react-i18next';
import { initialMockGatePasses } from '../data/mockData';
import type { GatePass, PassType, PassStatus } from '../data/types';

export const GatePassContent: React.FC = () => {
  const { t } = useTranslation('administration');
  const { loading } = useAppData();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const initialFormData: Partial<GatePass> = {
    student_id: '',
    student_name: '',
    class_name: '',
    section: '',
    pass_type: 'Early Departure',
    reason: '',
    departure_time: '',
    return_time: '',
    authorized_by: ''
  };
  const [formData, setFormData] = useState(initialFormData);

  // Use centralized mock data (in production, this would come from useAppData)
  const mockGatePasses: GatePass[] = useMemo(() => {
    let filtered = initialMockGatePasses;

    if (selectedStatus) {
      filtered = filtered.filter(p => p.status === selectedStatus);
    }

    if (selectedType) {
      filtered = filtered.filter(p => p.pass_type === selectedType);
    }

    if (searchTerm) {
      filtered = filtered.filter(p => 
        (p.student_name?.toLowerCase() ?? '').includes(searchTerm.toLowerCase()) ||
        (p.student_id?.toLowerCase() ?? '').includes(searchTerm.toLowerCase())
      );
    }

    return filtered;
  }, [selectedStatus, selectedType, searchTerm]);

  const openModal = () => {
    setFormData(initialFormData);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setFormData(initialFormData);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = () => {
    if (!formData.student_name || !formData.pass_type || !formData.reason) {
      alert('Student name, pass type, and reason are required.');
      return;
    }
    console.log('Creating gate pass:', formData);
    closeModal();
  };

  const approvePass = (pass: GatePass) => {
    console.log('Approving pass:', pass.id);
  };

  const rejectPass = (pass: GatePass) => {
    if (confirm('Are you sure you want to reject this gate pass?')) {
      console.log('Rejecting pass:', pass.id);
    }
  };

  const issuePass = (pass: GatePass) => {
    console.log('Issuing pass:', pass.id);
  };

  const printPass = (pass: GatePass) => {
    console.log('Printing pass:', pass.id);
  };

  const getStatusBadge = (status: PassStatus) => {
    const styles = {
      'Pending': 'bg-yellow-100 text-yellow-800',
      'Approved': 'bg-blue-100 text-blue-800',
      'Rejected': 'bg-red-100 text-red-800',
      'Issued': 'bg-green-100 text-green-800',
      'Returned': 'bg-gray-100 text-gray-800'
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status]}`}>
        {status}
      </span>
    );
  };

  const getTypeBadge = (type: PassType) => {
    const styles = {
      'Early Departure': 'bg-purple-100 text-purple-800',
      'Medical Emergency': 'bg-red-100 text-red-800',
      'Personal': 'bg-blue-100 text-blue-800',
      'Other': 'bg-gray-100 text-gray-800'
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[type]}`}>
        {type}
      </span>
    );
  };

  const passTypes: PassType[] = ['Early Departure', 'Medical Emergency', 'Personal', 'Other'];
  const passStatuses: PassStatus[] = ['Pending', 'Approved', 'Rejected', 'Issued', 'Returned'];

  const totals = useMemo(() => {
    return {
      total: mockGatePasses.length,
      pending: mockGatePasses.filter(p => p.status === 'Pending').length,
      approved: mockGatePasses.filter(p => p.status === 'Approved').length,
      issued: mockGatePasses.filter(p => p.status === 'Issued').length
    };
  }, [mockGatePasses]);

  if (loading && mockGatePasses.length === 0) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner size="lg" />
        <span className="ml-2">{t('gatePass.loading', 'Loading gate passes...')}</span>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-gray-800">{t('gatePass.title', 'Student Gate Pass Issuance')}</h1>
        <Button onClick={openModal} variant="primary">
          <PlusIcon className="w-4 h-4 mr-2" />
          {t('gatePass.newPass', 'New Gate Pass')}
        </Button>
      </div>
      <Card>
        <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
          <div className="flex items-start gap-3">
            <TicketIcon className="w-5 h-5 text-orange-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-orange-800">{t('gatePass.management', 'Gate Pass Management')}</h3>
              <p className="text-sm text-orange-700 mt-1">
                {t('gatePass.description', 'Manage student gate passes for early departures, medical emergencies, and personal reasons.')}
              </p>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-gray-600">
              <TicketIcon className="w-5 h-5" />
              <span className="text-sm font-medium">{t('gatePass.totalPasses', 'Total Passes')}</span>
            </div>
            <p className="text-2xl font-bold text-gray-800 mt-2">
              {totals.total}
            </p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-gray-600">
              <TicketIcon className="w-5 h-5 text-yellow-600" />
              <span className="text-sm font-medium">{t('gatePass.pending', 'Pending')}</span>
            </div>
            <p className="text-2xl font-bold text-yellow-600 mt-2">
              {totals.pending}
            </p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-gray-600">
              <TicketIcon className="w-5 h-5 text-blue-600" />
              <span className="text-sm font-medium">{t('gatePass.approved', 'Approved')}</span>
            </div>
            <p className="text-2xl font-bold text-blue-600 mt-2">
              {totals.approved}
            </p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-gray-600">
              <TicketIcon className="w-5 h-5 text-green-600" />
              <span className="text-sm font-medium">{t('gatePass.issued', 'Issued')}</span>
            </div>
            <p className="text-2xl font-bold text-green-600 mt-2">
              {totals.issued}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 flex gap-4 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('gatePass.status', 'Status')}</label>
            <select
              value={selectedStatus}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedStatus(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="">{t('gatePass.allStatuses', 'All Statuses')}</option>
              {passStatuses.map(status => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('gatePass.passType', 'Pass Type')}</label>
            <select
              value={selectedType}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedType(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="">{t('gatePass.allTypes', 'All Types')}</option>
              {passTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('common.search', 'Search')}</label>
            <input
              type="text"
              placeholder={t('gatePass.searchPlaceholder', 'Student name, ID...')}
              value={searchTerm}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </div>
        </div>

        <DataGrid
          data={mockGatePasses}
          columns={[
            {
              key: 'student_name',
              header: t('gatePass.student', 'Student'),
              sortable: true,
              render: (_, record) => (
                <div>
                  <p className="font-semibold">{record.student_name}</p>
                  <p className="text-xs text-gray-500">{record.student_id}</p>
                </div>
              )
            },
            {
              key: 'class_name',
              header: t('common.class', 'Class'),
              sortable: true,
              render: (_, record) => `${record.class_name} - ${record.section}`
            },
            {
              key: 'pass_type',
              header: t('gatePass.type', 'Type'),
              sortable: true,
              render: (value) => getTypeBadge(value)
            },
            {
              key: 'reason',
              header: 'Reason',
              sortable: false
            },
            {
              key: 'departure_time',
              header: 'Departure Time',
              sortable: true,
              render: (value) => value ? new Date(value).toLocaleString() : '-'
            },
            {
              key: 'authorized_by',
              header: 'Authorized By',
              sortable: true
            },
            {
              key: 'status',
              header: 'Status',
              sortable: true,
              render: (value) => getStatusBadge(value)
            },
            {
              key: 'actions',
              header: 'Actions',
              sortable: false,
              render: (_, record) => (
                <div className="flex gap-2">
                  {record.status === 'Pending' && (
                    <>
                      <Button size="sm" variant="secondary" onClick={() => approvePass(record)}>
                        <CheckIcon className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => rejectPass(record)}>
                        <XMarkIcon className="w-4 h-4" />
                      </Button>
                    </>
                  )}
                  {record.status === 'Approved' && (
                    <Button size="sm" variant="secondary" onClick={() => issuePass(record)}>
                      Issue
                    </Button>
                  )}
                  <Button size="sm" variant="secondary" onClick={() => printPass(record)}>
                    <PrinterIcon className="w-4 h-4" />
                  </Button>
                </div>
              )
            }
          ]}
        />
      </Card>

      {/* New Gate Pass Modal */}
      <DialogForm
        isOpen={isModalOpen}
        onClose={closeModal}
        title="New Gate Pass"
      >
        <FormSection>
          <FormField label="Student Name" required>
            <input
              type="text"
              name="student_name"
              value={formData.student_name}
              onChange={handleInputChange}
              placeholder="Student name"
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </FormField>

          <FormField label="Student ID">
            <input
              type="text"
              name="student_id"
              value={formData.student_id}
              onChange={handleInputChange}
              placeholder="Student ID"
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </FormField>

          <FormField label="Class">
            <input
              type="text"
              name="class_name"
              value={formData.class_name}
              onChange={handleInputChange}
              placeholder="Class"
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </FormField>

          <FormField label="Section">
            <input
              type="text"
              name="section"
              value={formData.section}
              onChange={handleInputChange}
              placeholder="Section"
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </FormField>

          <FormField label="Pass Type" required>
            <select
              name="pass_type"
              value={formData.pass_type}
              onChange={handleInputChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              {passTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </FormField>

          <FormField label="Reason" required>
            <textarea
              name="reason"
              value={formData.reason}
              onChange={handleInputChange}
              placeholder="Reason for gate pass"
              rows={3}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </FormField>

          <FormField label="Departure Time" required>
            <input
              type="datetime-local"
              name="departure_time"
              value={formData.departure_time}
              onChange={handleInputChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </FormField>

          <FormField label="Return Time">
            <input
              type="datetime-local"
              name="return_time"
              value={formData.return_time}
              onChange={handleInputChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </FormField>

          <FormField label="Authorized By" required>
            <input
              type="text"
              name="authorized_by"
              value={formData.authorized_by}
              onChange={handleInputChange}
              placeholder="Parent/Guardian name"
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </FormField>
        </FormSection>

        <div className="flex justify-end gap-3 mt-6">
          <Button onClick={closeModal} variant="secondary">
            Cancel
          </Button>
          <Button onClick={handleSubmit} variant="primary">
            Submit Request
          </Button>
        </div>
      </DialogForm>
    </div>
  );
};

const GatePassPage: React.FC = () => (
  <div className="space-y-6">
    <GatePassContent />
  </div>
);

export default GatePassPage;
