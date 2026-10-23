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
import type { ExamToken } from '../data/types';
import { logger } from '@/utils/logging';
import { KeyIcon, PlusIcon } from '@/components/ui/icons';
import { useToast } from '@/hooks/useToast';

import { formatDate } from '@/utils/format';
type ExamTokenFormData = Omit<Partial<ExamToken>, 'id' | 'generated_at' | 'used_at'>;

export const ExamTokensPageContent: React.FC = () => {
  const { examSessions, teacherSubjectAssignments, subjects, classes, loading } = useAppData();

  const teachers = useMemo(() => {
    const map = new Map<string, { id: string; first_name: string; last_name: string }>();
    teacherSubjectAssignments.forEach(a => {
      if (a.teacher_id && !map.has(a.teacher_id)) {
        const parts = (a.teacher_name || '').split(' ');
        map.set(a.teacher_id, { id: a.teacher_id, first_name: parts[0] || (a.teacher_name || ''), last_name: parts.slice(1).join(' ') });
      }
    });
    return Array.from(map.values());
  }, [teacherSubjectAssignments]);

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

  const tokensCollection = useDatabaseCollection<ExamToken>('exam_tokens');

  const examTokens: ExamToken[] = useMemo(() => {
    let filtered = tokensCollection.data;

    if (searchTerm) {
      filtered = filtered.filter(token => 
        (token.token_code?.toLowerCase() ?? '').includes(searchTerm.toLowerCase()) ||
        (token.teacher_name?.toLowerCase() ?? '').includes(searchTerm.toLowerCase()) ||
        (token.subject_name?.toLowerCase() ?? '').includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter) {
      filtered = filtered.filter(token => token.status === statusFilter);
    }

    return filtered;
  }, [tokensCollection.data, searchTerm, statusFilter]);

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

  const toast = useToast();
  const handleSubmit = async () => {
    if (!formData.exam_session_id || !formData.teacher_id) {
      toast.showWarning('Exam session and teacher are required.');
      return;
    }

    const session = examSessions?.find(s => String(s.id) === String(formData.exam_session_id));
    const subject = subjects?.find(s => String(s.id) === String(formData.subject_id));
    const cls = classes?.find(c => String(c.id) === String(formData.class_id));
    const teacher = teachers.find(t => t.id === formData.teacher_id);
    const teacherName = teacher ? `${teacher.first_name} ${teacher.last_name}`.trim() : '';

    try {
      if (editingToken) {
        await tokensCollection.update(editingToken.id, {
          exam_session_id: formData.exam_session_id,
          exam_session_name: session?.name ?? editingToken.exam_session_name,
          teacher_id: formData.teacher_id,
          teacher_name: teacherName || editingToken.teacher_name,
          subject_id: formData.subject_id,
          subject_name: subject?.name ?? editingToken.subject_name,
          class_id: formData.class_id,
          class_name: cls?.name ?? editingToken.class_name,
          expires_at: formData.expires_at || editingToken.expires_at,
          status: formData.status
        });
        toast.showSuccess('Exam token updated.');
      } else {
        await tokensCollection.insert({
          token_code: `TKN-${new Date().getFullYear()}-${Math.random().toString(36).slice(2, 10).toUpperCase()}`,
          exam_session_id: formData.exam_session_id,
          exam_session_name: session?.name ?? '',
          teacher_id: formData.teacher_id,
          teacher_name: teacherName,
          subject_id: formData.subject_id ?? '',
          subject_name: subject?.name ?? '',
          class_id: formData.class_id ?? '',
          class_name: cls?.name ?? '',
          generated_at: new Date().toISOString(),
          expires_at: formData.expires_at || new Date(Date.now() + 7 * 86400000).toISOString(),
          status: formData.status ?? 'Active',
          used_at: null
        });
        toast.showSuccess('Exam token generated.');
      }
      logger.info('Saved exam token:', formData);
    } catch (err) {
      logger.error('Failed to save exam token:', err);
      toast.showError('Failed to save exam token.');
    }
    closeModal();
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      'Active': 'bg-green-100 text-green-800',
      'Used': 'bg-primary-100 text-primary-800',
      'Expired': 'bg-red-100 text-red-800',
      'Revoked': 'bg-surface-accent text-surface-foreground'
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
      render: (value) => value ? formatDate(value) : '-'
    },
    {
      key: 'expires_at',
      header: 'Expires',
      sortable: true,
      render: (value) => value ? formatDate(value) : '-'
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

  if ((loading?.all || tokensCollection.loading) && examTokens.length === 0) {
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
        actions={
          <Button onClick={() => openModal()} variant="primary">
            <PlusIcon className="w-4 h-4 mr-2" />
            Generate Token
          </Button>
        }
        info="Exam tokens provide secure verification for marks entry. Each teacher receives a unique token for their subject/class that must be used during marks entry to ensure authenticity and prevent unauthorized access."
      >

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
            <label className="block text-sm font-medium text-surface-foreground mb-1">Search</label>
            <input
              type="text"
              placeholder="Token, teacher, subject..."
              value={searchTerm}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
              className="w-full border border-surface-border rounded-md px-3 py-2"
            />
          </div>
        </div>

        <DataGrid
          data={examTokens}
          columns={columns}
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

          <FormField label="Teacher" required>
            <Select
              name="teacher_id"
              value={formData.teacher_id}
              onChange={handleInputChange}
              className="w-full"
            >
              <option value="">Select teacher</option>
              {teachers?.map(teacher => (
                <option key={teacher.id} value={teacher.id}>{teacher.first_name} {teacher.last_name}</option>
              ))}
            </Select>
          </FormField>

          <FormField label="Subject">
            <Select
              name="subject_id"
              value={formData.subject_id}
              onChange={handleInputChange}
              className="w-full"
            >
              <option value="">Select subject</option>
              {subjects?.map(subject => (
                <option key={subject.id} value={subject.id}>{subject.name}</option>
              ))}
            </Select>
          </FormField>

          <FormField label="Class">
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

          <FormField label="Expires At">
            <input
              type="datetime-local"
              name="expires_at"
              value={formData.expires_at}
              onChange={handleInputChange}
              className="w-full border border-surface-border rounded-md px-3 py-2"
            />
          </FormField>

          <FormField label="Status">
            <Select
              name="status"
              value={formData.status}
              onChange={handleInputChange}
              className="w-full"
            >
              {statusOptions.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </Select>
          </FormField>
        </FormSection>

        <FormActions>
          <Button variant="ghost" onClick={closeModal}>Cancel</Button>
          <Button variant="primary" onClick={handleSubmit}>{editingToken ? 'Update' : 'Generate'}</Button>
        </FormActions>
      </DialogForm>
    </div>
  );
};

const ExamTokensPage: React.FC = () => (
  <div className="space-y-3">
    <ExamTokensPageContent />
  </div>
);

export default ExamTokensPage;
