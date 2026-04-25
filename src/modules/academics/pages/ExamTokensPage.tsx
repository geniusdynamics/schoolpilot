import React, { useState, useMemo } from 'react';
import { useAppData } from '@/hooks/useAppData';
import Card from '@/components/ui/Card';
import { DataGrid, DataGridColumn } from '@/components/ui/data';
import Button from '@/components/ui/Button';
import DialogForm from '@/components/ui/forms/DialogForm';
import FormSection from '@/components/ui/forms/FormSection';
import FormField from '@/components/ui/forms/FormField';
import FormActions from '@/components/ui/forms/FormActions';
import { KeyIcon, CalendarIcon, UserIcon, CheckCircleIcon, XCircleIcon, PlusIcon } from '@/components/ui/icons';
import Spinner from '@/components/ui/Spinner';
import { useTranslation } from 'react-i18next';
import { initialMockExamTokens } from '../data/mockData';
import type { ExamToken } from '../data/types';

type ExamTokenFormData = Omit<Partial<ExamToken>, 'id' | 'generated_at' | 'used_at'>;

const ExamTokensPage: React.FC = () => {
  const { t } = useTranslation('academics');
  const { examSessions, teachers, subjects, classes, loading } = useAppData();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingToken, setEditingToken] = useState<ExamToken | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const initialFormData: ExamTokenFormData = {
    exam_session_id: '',
    teacher_id: '',
    subject_id: '',
    class_id: '',
    expires_at: '',
    status: 'Active'
  };
  const [formData, setFormData] = useState<ExamTokenFormData>(initialFormData);

  // Use centralized mock data (in production, this would come from useAppData)
  const mockExamTokens: ExamToken[] = useMemo(() => {
    let filtered = initialMockExamTokens;

    if (searchTerm) {
      filtered = filtered.filter(token => 
        token.token_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        token.teacher_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        token.subject_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter) {
      filtered = filtered.filter(token => token.status === statusFilter);
    }

    return filtered;
  }, [searchTerm, statusFilter]);

  const openModal = (token?: ExamToken) => {
    setEditingToken(token || null);
    setFormData(token ? {
      exam_session_id: token.exam_session_id,
      teacher_id: token.teacher_id,
      subject_id: token.subject_id,
      class_id: token.class_id,
      expires_at: token.expires_at,
      status: token.status
    } : initialFormData);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingToken(null);
    setFormData(initialFormData);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    if (!formData.exam_session_id || !formData.teacher_id) {
      alert('Exam session and teacher are required.');
      return;
    }
    // In production, this would call generateExamToken or updateExamToken
    console.log('Saving exam token:', formData);
    closeModal();
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      'Active': 'bg-green-100 text-green-800',
      'Used': 'bg-blue-100 text-blue-800',
      'Expired': 'bg-red-100 text-red-800',
      'Revoked': 'bg-gray-100 text-gray-800'
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status as keyof typeof styles]}`}>
        {status}
      </span>
    );
  };

  const columns: DataGridColumn<ExamToken>[] = [
    {
      key: 'token_code',
      header: 'Token Code',
      sortable: true,
      filterable: true
    },
    {
      key: 'exam_session_name',
      header: 'Exam Session',
      sortable: true,
      filterable: true
    },
    {
      key: 'teacher_name',
      header: 'Teacher',
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
      key: 'class_name',
      header: 'Class',
      sortable: true,
      filterable: true
    },
    {
      key: 'generated_at',
      header: 'Generated',
      sortable: true,
      render: (value) => value ? new Date(value).toLocaleDateString() : '-'
    },
    {
      key: 'expires_at',
      header: 'Expires',
      sortable: true,
      render: (value) => value ? new Date(value).toLocaleDateString() : '-'
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      filterable: true,
      render: (value) => getStatusBadge(value)
    }
  ];

  const statusOptions = ['Active', 'Used', 'Expired', 'Revoked'];

  if (loading && mockExamTokens.length === 0) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner size="lg" />
        <span className="ml-2">Loading exam tokens...</span>
      </div>
    );
  }

  return (
    <div className="p-6">
      <Card 
        title={
          <div className="flex items-center gap-2">
            <KeyIcon className="w-6 h-6 text-orange-600" />
            <span>Exam Tokens</span>
          </div>
        }
        extra={
          <Button onClick={() => openModal()} variant="primary">
            <PlusIcon className="w-4 h-4 mr-2" />
            Generate Token
          </Button>
        }
      >
        <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
          <div className="flex items-start gap-3">
            <KeyIcon className="w-5 h-5 text-orange-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-orange-800">Secure Tokens for Marks Entry Verification</h3>
              <p className="text-sm text-orange-700 mt-1">
                Exam tokens provide secure verification for marks entry. Each teacher receives a unique token for their subject/class 
                that must be used during marks entry to ensure authenticity and prevent unauthorized access.
              </p>
            </div>
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
              placeholder="Token, teacher, subject..."
              value={searchTerm}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </div>
        </div>

        <DataGrid
          data={mockExamTokens}
          columns={columns}
          searchable={false}
          exportable={true}
        />
      </Card>

      {/* Generate/Edit Token Modal */}
      <DialogForm
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingToken ? 'Edit Token' : 'Generate Token'}
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

          <FormField label="Teacher" required>
            <select
              name="teacher_id"
              value={formData.teacher_id}
              onChange={handleInputChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="">Select teacher</option>
              {teachers?.map(teacher => (
                <option key={teacher.id} value={teacher.id}>{teacher.first_name} {teacher.last_name}</option>
              ))}
            </select>
          </FormField>

          <FormField label="Subject">
            <select
              name="subject_id"
              value={formData.subject_id}
              onChange={handleInputChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="">Select subject</option>
              {subjects?.map(subject => (
                <option key={subject.id} value={subject.id}>{subject.name}</option>
              ))}
            </select>
          </FormField>

          <FormField label="Class">
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

          <FormField label="Expires At">
            <input
              type="datetime-local"
              name="expires_at"
              value={formData.expires_at}
              onChange={handleInputChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </FormField>

          <FormField label="Status">
            <select
              name="status"
              value={formData.status}
              onChange={handleInputChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              {statusOptions.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </FormField>
        </FormSection>

        <FormActions
          onCancel={closeModal}
          onSubmit={handleSubmit}
          submitLabel={editingToken ? 'Update' : 'Generate'}
        />
      </DialogForm>
    </div>
  );
};

export default ExamTokensPage;
