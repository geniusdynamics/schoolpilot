// GAP(P1-E02): the registry models no structure-validation record entity, so it stays on the legacy collection.
import React, { useState, useMemo } from 'react';
import { useAppData } from '@/hooks/useAppData';
import Card from '@/components/ui/Card';
import { DataGrid, DataGridColumn } from '@/components/ui/data';

import Spinner from '@/components/ui/Spinner';
import { useDatabaseCollection } from '@/hooks/useDatabaseCollection';
import type { StructureValidationItem } from '../data/types';
import { CheckCircleIcon, DocumentTextIcon, ExclamationTriangleIcon, XCircleIcon } from '@/components/ui/icons';

export const VerifyMarksByStructurePageContent: React.FC = () => {

  const { loading } = useAppData();

  const validationCollection = useDatabaseCollection<StructureValidationItem>('structure_validation_records');

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedSession, setSelectedSession] = useState('');

  // Live collection data from structure_validation_records
  const mockValidationItems: StructureValidationItem[] = useMemo(() => {
    let filtered = validationCollection.data;

    if (searchTerm) {
      filtered = filtered.filter(item => 
        (item.subject_name?.toLowerCase() ?? '').includes(searchTerm.toLowerCase()) ||
        (item.class_name?.toLowerCase() ?? '').includes(searchTerm.toLowerCase()) ||
        (item.structure_component?.toLowerCase() ?? '').includes(searchTerm.toLowerCase())
      );
    }

    if (selectedSession) {
      filtered = filtered.filter(item => item.exam_session_id === selectedSession);
    }

    if (statusFilter) {
      filtered = filtered.filter(item => item.status === statusFilter);
    }

    return filtered;
  }, [validationCollection.data, searchTerm, selectedSession, statusFilter]);

  const getStatusBadge = (status: string) => {
    const styles = {
      'Valid': 'bg-green-100 text-green-800',
      'Invalid': 'bg-red-100 text-red-800',
      'Warning': 'bg-yellow-100 text-yellow-800'
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status as keyof typeof styles]}`}>
        {status}
      </span>
    );
  };

  const columns: DataGridColumn<StructureValidationItem>[] = [
    {
      key: 'exam_session_name',
      header: 'Exam Session',
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
      key: 'structure_component',
      header: 'Structure Component',
      sortable: true,
      filterable: true
    },
    {
      key: 'expected_max_marks',
      header: 'Expected Max',
      sortable: true,
      render: (value) => value
    },
    {
      key: 'actual_max_marks',
      header: 'Actual Max',
      sortable: true,
      render: (value) => value
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
    },
    {
      key: 'notes',
      header: 'Notes',
      sortable: false,
      render: (value) => value || '-'
    }
  ];

  const statusOptions = ['Valid', 'Invalid', 'Warning'];

  const totals = useMemo(() => {
    return {
      total: mockValidationItems.length,
      valid: mockValidationItems.filter(r => r.status === 'Valid').length,
      invalid: mockValidationItems.filter(r => r.status === 'Invalid').length,
      warnings: mockValidationItems.filter(r => r.status === 'Warning').length
    };
  }, [mockValidationItems]);

  const uniqueSessions = useMemo(() => {
    const sessions = [...new Set(mockValidationItems.map(r => r.exam_session_id))];
    return sessions.map(id => mockValidationItems.find(r => r.exam_session_id === id)?.exam_session_name || id);
  }, [mockValidationItems]);

  if ((loading?.all || validationCollection.loading) && mockValidationItems.length === 0) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner size="lg" />
        <span className="ml-2">Loading structure validation...</span>
      </div>
    );
  }

  return (
    <div className="p-6">
      <Card 
        title={
          <div className="flex items-center gap-2">
            <DocumentTextIcon className="w-6 h-6 text-cyan-600" />
            <span>Verify Marks by Structure</span>
          </div>
        }
        info="This page validates that entered marks conform to the defined exam structure/pattern. It checks that maximum marks per component match the expected values and identifies any discrepancies."
      >

        {/* Summary Cards */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-surface-card border border-surface-border rounded-lg p-4">
            <div className="flex items-center gap-2 text-surface-muted-fg">
              <DocumentTextIcon className="w-5 h-5" />
              <span className="text-sm font-medium">Total Components</span>
            </div>
            <p className="text-2xl font-bold text-surface-foreground mt-2">
              {totals.total}
            </p>
          </div>
          <div className="bg-surface-card border border-surface-border rounded-lg p-4">
            <div className="flex items-center gap-2 text-surface-muted-fg">
              <CheckCircleIcon className="w-5 h-5 text-green-600" />
              <span className="text-sm font-medium">Valid</span>
            </div>
            <p className="text-2xl font-bold text-green-600 mt-2">
              {totals.valid}
            </p>
          </div>
          <div className="bg-surface-card border border-surface-border rounded-lg p-4">
            <div className="flex items-center gap-2 text-surface-muted-fg">
              <XCircleIcon className="w-5 h-5 text-red-600" />
              <span className="text-sm font-medium">Invalid</span>
            </div>
            <p className="text-2xl font-bold text-red-600 mt-2">
              {totals.invalid}
            </p>
          </div>
          <div className="bg-surface-card border border-surface-border rounded-lg p-4">
            <div className="flex items-center gap-2 text-surface-muted-fg">
              <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600" />
              <span className="text-sm font-medium">Warnings</span>
            </div>
            <p className="text-2xl font-bold text-yellow-600 mt-2">
              {totals.warnings}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 flex gap-4 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-surface-foreground mb-1">Exam Session</label>
            <select
              value={selectedSession}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedSession(e.target.value)}
              className="w-full border border-surface-border rounded-md px-3 py-2"
            >
              <option value="">All Sessions</option>
              {uniqueSessions.map(session => (
                <option key={session} value={session}>{session}</option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-surface-foreground mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setStatusFilter(e.target.value)}
              className="w-full border border-surface-border rounded-md px-3 py-2"
            >
              <option value="">All Statuses</option>
              {statusOptions.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-surface-foreground mb-1">Search</label>
            <input
              type="text"
              placeholder="Subject, class, component..."
              value={searchTerm}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
              className="w-full border border-surface-border rounded-md px-3 py-2"
            />
          </div>
        </div>

        <DataGrid
          data={mockValidationItems}
          columns={columns}
        />
      </Card>
    </div>
  );
};

const VerifyMarksByStructurePage: React.FC = () => (
  <div className="space-y-3">
    <VerifyMarksByStructurePageContent />
  </div>
);

export default VerifyMarksByStructurePage;
