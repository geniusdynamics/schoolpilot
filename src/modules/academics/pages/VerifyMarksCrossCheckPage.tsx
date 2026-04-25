import React, { useState, useMemo } from 'react';
import { useAppData } from '@/hooks/useAppData';
import Card from '@/components/ui/Card';
import { DataGrid, DataGridColumn } from '@/components/ui/data';
import Button from '@/components/ui/Button';
import DialogForm from '@/components/ui/forms/DialogForm';
import FormSection from '@/components/ui/forms/FormSection';
import FormActions from '@/components/ui/forms/FormActions';
import { CheckCircleIcon, XCircleIcon, UserIcon, CalendarIcon, ExclamationTriangleIcon } from '@/components/ui/icons';
import Spinner from '@/components/ui/Spinner';
import { useTranslation } from 'react-i18next';
import { initialMockCrossCheckRecords } from '../data/mockData';
import type { CrossCheckRecord } from '../data/types';

const VerifyMarksCrossCheckPage: React.FC = () => {
  const { t } = useTranslation('academics');
  const { examSessions, subjects, classes, teachers, loading } = useAppData();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<CrossCheckRecord | null>(null);
  const [verifiedMarks, setVerifiedMarks] = useState(0);
  const [notes, setNotes] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Use centralized mock data (in production, this would come from useAppData)
  const mockRecords: CrossCheckRecord[] = useMemo(() => {
    let filtered = initialMockCrossCheckRecords;

    if (searchTerm) {
      filtered = filtered.filter(record => 
        record.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.admission_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.subject_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter) {
      filtered = filtered.filter(record => record.status === statusFilter);
    }

    return filtered;
  }, [searchTerm, statusFilter]);

  const openVerifyModal = (record: CrossCheckRecord) => {
    setSelectedRecord(record);
    setVerifiedMarks(record.verified_marks || record.primary_marks);
    setNotes(record.notes || '');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedRecord(null);
    setVerifiedMarks(0);
    setNotes('');
  };

  const handleVerify = () => {
    if (!selectedRecord) return;
    // In production, this would save the verification
    console.log('Verifying marks:', {
      recordId: selectedRecord.id,
      verifiedMarks,
      notes
    });
    closeModal();
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      'Pending': 'bg-yellow-100 text-yellow-800',
      'Verified': 'bg-green-100 text-green-800',
      'Discrepancy': 'bg-red-100 text-red-800',
      'Resolved': 'bg-blue-100 text-blue-800'
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status as keyof typeof styles]}`}>
        {status}
      </span>
    );
  };

  const columns: DataGridColumn<CrossCheckRecord>[] = [
    {
      key: 'student_name',
      header: 'Student Name',
      sortable: true,
      filterable: true
    },
    {
      key: 'admission_no',
      header: 'Admission No',
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
      key: 'subject_name',
      header: 'Subject',
      sortable: true,
      filterable: true
    },
    {
      key: 'primary_teacher_name',
      header: 'Primary Teacher',
      sortable: true,
      filterable: true
    },
    {
      key: 'primary_marks',
      header: 'Primary Marks',
      sortable: true,
      render: (value) => value
    },
    {
      key: 'verifying_teacher_name',
      header: 'Verifying Teacher',
      sortable: true,
      filterable: true
    },
    {
      key: 'verified_marks',
      header: 'Verified Marks',
      sortable: true,
      render: (value) => value !== null ? value : '-'
    },
    {
      key: 'marks_difference',
      header: 'Difference',
      sortable: true,
      render: (value) => (
        <span className={`font-semibold ${value === 0 ? 'text-green-600' : 'text-red-600'}`}>
          {value === 0 ? '0' : `${value > 0 ? '+' : ''}${value}`}
        </span>
      )
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      filterable: true,
      render: (value) => getStatusBadge(value)
    }
  ];

  const statusOptions = ['Pending', 'Verified', 'Discrepancy', 'Resolved'];

  const totals = useMemo(() => {
    return {
      total: mockRecords.length,
      verified: mockRecords.filter(r => r.status === 'Verified').length,
      discrepancies: mockRecords.filter(r => r.status === 'Discrepancy').length,
      pending: mockRecords.filter(r => r.status === 'Pending').length
    };
  }, [mockRecords]);

  if (loading && mockRecords.length === 0) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner size="lg" />
        <span className="ml-2">Loading cross-check records...</span>
      </div>
    );
  }

  return (
    <div className="p-6">
      <Card 
        title={
          <div className="flex items-center gap-2">
            <UserIcon className="w-6 h-6 text-teal-600" />
            <span>Verify Marks Cross-Check</span>
          </div>
        }
      >
        <div className="mb-6 p-4 bg-teal-50 border border-teal-200 rounded-lg">
          <div className="flex items-start gap-3">
            <UserIcon className="w-5 h-5 text-teal-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-teal-800">Cross-Teacher Verification Workflow</h3>
              <p className="text-sm text-teal-700 mt-1">
                This page enables cross-verification of marks entered by primary teachers. A different teacher reviews and confirms 
                the marks, ensuring accuracy and identifying discrepancies that need further review.
              </p>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-gray-600">
              <CalendarIcon className="w-5 h-5" />
              <span className="text-sm font-medium">Total Records</span>
            </div>
            <p className="text-2xl font-bold text-gray-800 mt-2">
              {totals.total}
            </p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-gray-600">
              <CheckCircleIcon className="w-5 h-5 text-green-600" />
              <span className="text-sm font-medium">Verified</span>
            </div>
            <p className="text-2xl font-bold text-green-600 mt-2">
              {totals.verified}
            </p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-gray-600">
              <ExclamationTriangleIcon className="w-5 h-5 text-red-600" />
              <span className="text-sm font-medium">Discrepancies</span>
            </div>
            <p className="text-2xl font-bold text-red-600 mt-2">
              {totals.discrepancies}
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <input
              type="text"
              placeholder="Student, admission, subject..."
              value={searchTerm}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </div>
        </div>

        <DataGrid
          data={mockRecords}
          columns={columns}
          searchable={false}
          exportable={true}
          onRowClick={(record) => openVerifyModal(record as CrossCheckRecord)}
        />
      </Card>

      {/* Verify Modal */}
      <DialogForm
        isOpen={isModalOpen}
        onClose={closeModal}
        title={`Verify Marks - ${selectedRecord?.student_name}`}
      >
        {selectedRecord && (
          <>
            <div className="mb-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Admission No:</span>
                  <span className="ml-2 font-semibold">{selectedRecord.admission_no}</span>
                </div>
                <div>
                  <span className="text-gray-600">Class:</span>
                  <span className="ml-2 font-semibold">{selectedRecord.class_name}</span>
                </div>
                <div>
                  <span className="text-gray-600">Subject:</span>
                  <span className="ml-2 font-semibold">{selectedRecord.subject_name}</span>
                </div>
                <div>
                  <span className="text-gray-600">Primary Teacher:</span>
                  <span className="ml-2 font-semibold">{selectedRecord.primary_teacher_name}</span>
                </div>
                <div>
                  <span className="text-gray-600">Primary Marks:</span>
                  <span className="ml-2 font-semibold">{selectedRecord.primary_marks}</span>
                </div>
                <div>
                  <span className="text-gray-600">Current Status:</span>
                  <span className="ml-2">{getStatusBadge(selectedRecord.status)}</span>
                </div>
              </div>
            </div>

            <FormSection>
              <FormField label="Verified Marks">
                <input
                  type="number"
                  min="0"
                  max={100}
                  value={verifiedMarks}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setVerifiedMarks(parseInt(e.target.value) || 0)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </FormField>

              <FormField label="Notes">
                <textarea
                  value={notes}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNotes(e.target.value)}
                  placeholder="Add verification notes..."
                  rows={3}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </FormField>

              {selectedRecord.marks_difference !== 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-red-800">
                    <ExclamationTriangleIcon className="w-5 h-5" />
                    <span className="font-semibold">Discrepancy Detected</span>
                  </div>
                  <p className="text-sm text-red-700 mt-1">
                    There is a {Math.abs(selectedRecord.marks_difference)} mark difference between primary and verified marks.
                  </p>
                </div>
              )}
            </FormSection>

            <FormActions
              onCancel={closeModal}
              onSubmit={handleVerify}
              submitLabel="Verify Marks"
            />
          </>
        )}
      </DialogForm>
    </div>
  );
};

export default VerifyMarksCrossCheckPage;
