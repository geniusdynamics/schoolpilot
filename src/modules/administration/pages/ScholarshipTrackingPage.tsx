import React, { useState, useMemo } from 'react';
import { useAppData } from '@/hooks/useAppData';
import Card from '@/components/ui/Card';
import Select from '@/components/ui/Select';
import { DataGrid, DataGridColumn } from '@/components/ui/data';
import Button from '@/components/ui/Button';
import DialogForm from '@/components/ui/forms/DialogForm';
import FormSection from '@/components/ui/forms/FormSection';
import FormField from '@/components/ui/forms/FormField';
import { UserIcon, CurrencyDollarIcon, PlusIcon, CheckIcon } from '@/components/ui/icons';
import Spinner from '@/components/ui/Spinner';
import { useTranslation } from 'react-i18next';
import { useDatabaseCollection } from '@/hooks/useDatabaseCollection';
import type { ScholarshipRecord } from '../data/types';

import { logger } from '@/utils/logging';
import { useToast } from '@/hooks/useToast';

const ScholarshipTrackingPage: React.FC = () => {
  const { t } = useTranslation('administration');
  const { students } = useAppData();
  const scholarshipCollection = useDatabaseCollection<ScholarshipRecord>('scholarships');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingScholarship, setEditingScholarship] = useState<ScholarshipRecord | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const initialFormData: Partial<ScholarshipRecord> = {
    student_id: '',
    scholarship_type: '',
    amount: 0,
    academic_year: '2024-2025',
    status: 'Active',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    criteria: ''
  };
  const [formData, setFormData] = useState<Partial<ScholarshipRecord>>(initialFormData);

  // Live scholarship records from the database
  const scholarships: ScholarshipRecord[] = useMemo(() => {
    let filtered = scholarshipCollection.data;

    if (selectedClass) {
      filtered = filtered.filter(s => s.class_name === selectedClass);
    }

    if (statusFilter) {
      filtered = filtered.filter(s => s.status === statusFilter);
    }

    if (searchTerm) {
      filtered = filtered.filter(s =>
        (s.student_name?.toLowerCase() ?? '').includes(searchTerm.toLowerCase()) ||
        (s.admission_no?.toLowerCase() ?? '').includes(searchTerm.toLowerCase()) ||
        (s.scholarship_type?.toLowerCase() ?? '').includes(searchTerm.toLowerCase())
      );
    }

    return filtered;
  }, [scholarshipCollection.data, selectedClass, statusFilter, searchTerm]);

  const getStudentDisplayName = (studentId: string): string => {
    const student = students?.find(s => String(s.id) === String(studentId));
    if (!student) return '';
    return student.display_name || `${student.first_name} ${student.last_name}`.trim();
  };

  const getStudentClassName = (studentId: string): string => {
    const student = students?.find(s => String(s.id) === String(studentId));
    if (!student) return '';
    const cls = student.current_class_name || '';
    const stream = student.current_class_stream_name || '';
    if (cls && stream) return `${cls} - ${stream}`;
    return cls || stream;
  };

  const openModal = (scholarship?: ScholarshipRecord) => {
    setEditingScholarship(scholarship || null);
    setFormData(scholarship ? {
      student_id: scholarship.student_id,
      scholarship_type: scholarship.scholarship_type,
      amount: scholarship.amount,
      academic_year: scholarship.academic_year,
      status: scholarship.status,
      start_date: scholarship.start_date,
      end_date: scholarship.end_date,
      criteria: scholarship.criteria,
      notes: scholarship.notes
    } : initialFormData);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingScholarship(null);
    setFormData(initialFormData);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ 
      ...prev, 
      [name]: name === 'amount' ? Number(value) : value 
    }));
  };

  const toast = useToast();
  const handleSubmit = () => {
    if (!formData.student_id || !formData.scholarship_type) {
      toast.showWarning('Student and scholarship type are required.');
      return;
    }
    logger.info('Saving scholarship:', formData);
    const payload = {
      student_id: formData.student_id || '',
      student_name: getStudentDisplayName(formData.student_id || ''),
      admission_no: students?.find(s => String(s.id) === String(formData.student_id))?.admission_no || '',
      class_name: getStudentClassName(formData.student_id || ''),
      scholarship_type: formData.scholarship_type || '',
      amount: Number(formData.amount) || 0,
      academic_year: formData.academic_year || '',
      status: formData.status || 'Active',
      start_date: formData.start_date || '',
      end_date: formData.end_date || '',
      criteria: formData.criteria,
      notes: formData.notes,
      created_at: new Date().toISOString()
    };
    const save = editingScholarship
      ? scholarshipCollection.update(editingScholarship.id, payload)
      : scholarshipCollection.insert(payload as Omit<ScholarshipRecord, 'id'> & { id?: string });

    void save.then(() => {
      toast.showSuccess(editingScholarship ? 'Scholarship updated.' : 'Scholarship added.');
      closeModal();
    }).catch((err: unknown) => {
      logger.error('Failed to save scholarship:', err);
      toast.showError('Failed to save scholarship.');
    });
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      'Active': 'bg-green-100 text-green-800',
      'Inactive': 'bg-surface-accent text-surface-foreground',
      'Pending': 'bg-yellow-100 text-yellow-800'
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status as keyof typeof styles]}`}>
        {status}
      </span>
    );
  };

  const columns: DataGridColumn<ScholarshipRecord>[] = [
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
      key: 'scholarship_type',
      header: 'Scholarship Type',
      sortable: true,
      filterable: true
    },
    {
      key: 'amount',
      header: 'Amount',
      sortable: true,
      render: (value) => `$${value.toLocaleString()}`
    },
    {
      key: 'academic_year',
      header: 'Academic Year',
      sortable: true,
      render: (value) => value
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (value) => getStatusBadge(value)
    },
    {
      key: 'start_date',
      header: 'Start Date',
      sortable: true,
      render: (value) => value ? new Date(value).toLocaleDateString() : '-'
    },
    {
      key: 'end_date',
      header: 'End Date',
      sortable: true,
      render: (value) => value ? new Date(value).toLocaleDateString() : '-'
    }
  ];

  const uniqueClasses = useMemo(() => {
    const classNames = [...new Set(scholarships.map(s => s.class_name).filter((name): name is string => Boolean(name)))];
    return classNames;
  }, [scholarships]);

  const scholarshipTypes = ['Merit Scholarship', 'Need-Based Scholarship', 'Sports Scholarship', 'Arts Scholarship', 'Other'];
  const statuses = ['Active', 'Inactive', 'Pending'];

  const totals = useMemo(() => {
    return {
      total: scholarships.length,
      active: scholarships.filter(s => s.status === 'Active').length,
      totalAmount: scholarships.filter(s => s.status === 'Active').reduce((sum, s) => sum + s.amount, 0)
    };
  }, [scholarships]);

  if (scholarshipCollection.loading && scholarships.length === 0) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner size="lg" />
        <span className="ml-2">Loading scholarship records...</span>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-surface-foreground">Scholarship Tracking</h1>
        <Button onClick={() => openModal()} variant="primary">
          <PlusIcon className="w-4 h-4 mr-2" />
          Add Scholarship
        </Button>
      </div>
      <Card>
        <div className="mb-6 p-4 bg-teal-50 border border-teal-200 rounded-lg">
          <div className="flex items-start gap-3">
            <CurrencyDollarIcon className="w-5 h-5 text-teal-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-teal-800">Scholarship Recipient Tracking and Reporting</h3>
              <p className="text-sm text-teal-700 mt-1">
                Track scholarship recipients, manage scholarship types, amounts, and statuses. 
                Monitor active scholarships and generate reports for financial planning.
              </p>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-surface-card border border-surface-border rounded-lg p-4">
            <div className="flex items-center gap-2 text-surface-muted-fg">
              <UserIcon className="w-5 h-5" />
              <span className="text-sm font-medium">Total Scholarships</span>
            </div>
            <p className="text-2xl font-bold text-surface-foreground mt-2">
              {totals.total}
            </p>
          </div>
          <div className="bg-surface-card border border-surface-border rounded-lg p-4">
            <div className="flex items-center gap-2 text-surface-muted-fg">
              <CheckIcon className="w-5 h-5 text-green-600" />
              <span className="text-sm font-medium">Active</span>
            </div>
            <p className="text-2xl font-bold text-green-600 mt-2">
              {totals.active}
            </p>
          </div>
          <div className="bg-surface-card border border-surface-border rounded-lg p-4">
            <div className="flex items-center gap-2 text-surface-muted-fg">
              <CurrencyDollarIcon className="w-5 h-5 text-teal-600" />
              <span className="text-sm font-medium">Total Disbursed</span>
            </div>
            <p className="text-2xl font-bold text-teal-600 mt-2">
              ${totals.totalAmount.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 flex gap-4 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-surface-foreground mb-1">Class</label>
            <Select
              value={selectedClass}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedClass(e.target.value)}
              className="w-full"
            >
              <option value="">All Classes</option>
              {uniqueClasses.map(cls => (
                <option key={cls} value={cls}>{cls}</option>
              ))}
            </Select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-surface-foreground mb-1">Status</label>
            <Select
              value={statusFilter}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setStatusFilter(e.target.value)}
              className="w-full"
            >
              <option value="">All Statuses</option>
              {statuses.map(status => (
                <option key={status} value={status}>{status}</option>
              ))}
            </Select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-surface-foreground mb-1">Search</label>
            <input
              type="text"
              placeholder="Student, type..."
              value={searchTerm}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
              className="w-full border border-surface-border rounded-md px-3 py-2"
            />
          </div>
        </div>

        <DataGrid
          data={scholarships}
          columns={columns}
        />
      </Card>

      {/* Add/Edit Scholarship Modal */}
      <DialogForm
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingScholarship ? 'Edit Scholarship' : 'Add Scholarship'}
      >
        <FormSection>
          <FormField label="Student" required>
            <Select
              name="student_id"
              value={formData.student_id}
              onChange={handleInputChange}
              className="w-full"
            >
              <option value="">Select student</option>
              {students?.map(student => (
                <option key={student.id} value={student.id}>{student.first_name} {student.last_name}</option>
              ))}
            </Select>
          </FormField>

          <FormField label="Scholarship Type" required>
            <Select
              name="scholarship_type"
              value={formData.scholarship_type}
              onChange={handleInputChange}
              className="w-full"
            >
              <option value="">Select type</option>
              {scholarshipTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </Select>
          </FormField>

          <FormField label="Amount" required>
            <input
              type="number"
              name="amount"
              value={formData.amount}
              onChange={handleInputChange}
              min="0"
              className="w-full border border-surface-border rounded-md px-3 py-2"
            />
          </FormField>

          <FormField label="Academic Year" required>
            <input
              type="text"
              name="academic_year"
              value={formData.academic_year}
              onChange={handleInputChange}
              placeholder="e.g., 2024-2025"
              className="w-full border border-surface-border rounded-md px-3 py-2"
            />
          </FormField>

          <FormField label="Status" required>
            <Select
              name="status"
              value={formData.status}
              onChange={handleInputChange}
              className="w-full"
            >
              {statuses.map(status => (
                <option key={status} value={status}>{status}</option>
              ))}
            </Select>
          </FormField>

          <FormField label="Start Date">
            <input
              type="date"
              name="start_date"
              value={formData.start_date}
              onChange={handleInputChange}
              className="w-full border border-surface-border rounded-md px-3 py-2"
            />
          </FormField>

          <FormField label="End Date">
            <input
              type="date"
              name="end_date"
              value={formData.end_date}
              onChange={handleInputChange}
              className="w-full border border-surface-border rounded-md px-3 py-2"
            />
          </FormField>

          <FormField label="Criteria">
            <input
              type="text"
              name="criteria"
              value={formData.criteria}
              onChange={handleInputChange}
              placeholder="e.g., Top 5% in class"
              className="w-full border border-surface-border rounded-md px-3 py-2"
            />
          </FormField>

          <FormField label="Notes">
            <input
              type="text"
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              placeholder="Additional notes"
              className="w-full border border-surface-border rounded-md px-3 py-2"
            />
          </FormField>
        </FormSection>

        <div className="flex justify-end gap-3 mt-6">
          <Button onClick={closeModal} variant="secondary">
            Cancel
          </Button>
          <Button onClick={handleSubmit} variant="primary">
            {editingScholarship ? 'Update' : 'Add'}
          </Button>
        </div>
      </DialogForm>
    </div>
  );
};

export default ScholarshipTrackingPage;
