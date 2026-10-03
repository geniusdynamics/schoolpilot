import React, { useState, useMemo, useCallback } from 'react';
import Card from '@/components/ui/Card';
import { DataGrid, DataGridColumn } from '@/components/ui/data';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import DialogForm from '@/components/ui/forms/DialogForm';
import FormSection from '@/components/ui/forms/FormSection';
import FormActions from '@/components/ui/forms/FormActions';
import FormField from '@/components/ui/forms/FormField';
import Spinner from '@/components/ui/Spinner';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  DownloadIcon,
  ClipboardDocumentListIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
} from '@/components/ui/icons';
import { usePickupData } from '../../data/pickup/usePickupData';
import { PickupLog } from '../../data/pickup/types';
import { useToast } from '@/hooks/useToast';
import { useTranslation } from 'react-i18next';

interface LogFilters {
  searchQuery?: string;
  studentId?: string;
  authorizedPersonId?: string;
  flaggedOnly?: boolean;
  dateFrom?: string;
  dateTo?: string;
}

const PickupLogsPage: React.FC = () => {
  const { t } = useTranslation('pickup');
  const { pickupLogs, loading, authorizedPersons, pickupCodes, recordPickup } = usePickupData();
  const { showToast } = useToast();

  const [filters, setFilters] = useState<LogFilters>({});
  const [showFilters, setShowFilters] = useState(false);
  const [addLogModalOpen, setAddLogModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Add manual log form state
  const [logForm, setLogForm] = useState({
    studentId: '',
    authorizedPersonId: '',
    notes: '',
    pickupDate: new Date().toISOString().split('T')[0],
    pickupTime: new Date().toTimeString().slice(0, 5),
  });

  // Unique students for filter
  const uniqueStudents = useMemo(() => {
    const seen = new Set<string>();
    return pickupLogs
      .filter(l => l.studentName && !seen.has(l.studentId))
      .map(l => {
        seen.add(l.studentId);
        return { id: l.studentId, name: l.studentName || 'Unknown' };
      });
  }, [pickupLogs]);

  // Unique persons for filter
  const uniquePersons = useMemo(() => {
    const seen = new Set<string>();
    return pickupLogs
      .filter(l => l.authorizedPersonName && !seen.has(l.authorizedPersonId))
      .map(l => {
        seen.add(l.authorizedPersonId);
        return { id: l.authorizedPersonId, name: l.authorizedPersonName };
      });
  }, [pickupLogs]);

  // Filtered logs
  const filteredLogs = useMemo(() => {
    return pickupLogs.filter(log => {
      if (filters.studentId && log.studentId !== filters.studentId) return false;
      if (filters.authorizedPersonId && log.authorizedPersonId !== filters.authorizedPersonId) return false;
      if (filters.flaggedOnly && !log.notes?.toLowerCase().includes('flag')) return false;
      if (filters.dateFrom && log.pickupDate < filters.dateFrom) return false;
      if (filters.dateTo && log.pickupDate > filters.dateTo) return false;
      if (filters.searchQuery) {
        const search = filters.searchQuery.toLowerCase();
        return (
          (log.studentName || '').toLowerCase().includes(search) ||
          (log.authorizedPersonName?.toLowerCase() ?? '').includes(search) ||
          (log.verifiedByName || '').toLowerCase().includes(search) ||
          (log.notes || '').toLowerCase().includes(search)
        );
      }
      return true;
    }).sort((a, b) => new Date(b.pickupTime).getTime() - new Date(a.pickupTime).getTime());
  }, [pickupLogs, filters]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters(prev => ({ ...prev, searchQuery: e.target.value }));
  };

  const handleFilterChange = (key: keyof LogFilters, value: string | boolean) => {
    setFilters(prev => ({ ...prev, [key]: value || undefined }));
  };

  const clearFilters = () => setFilters({});

  const resetLogForm = () => {
    setLogForm({
      studentId: '',
      authorizedPersonId: '',
      notes: '',
      pickupDate: new Date().toISOString().split('T')[0],
      pickupTime: new Date().toTimeString().slice(0, 5),
    });
  };

  const handleLogFormChange = (key: string, value: string) => {
    setLogForm(prev => ({ ...prev, [key]: value }));
  };

  // Export to CSV
  const handleExport = useCallback(() => {
    const headers = [
      'Pickup Date', 'Pickup Time', 'Student', 'Authorized Person',
      'Relationship', 'Method', 'Verified By', 'Notes',
    ];
    const rows = filteredLogs.map(log => [
      log.pickupDate,
      new Date(log.pickupTime).toLocaleTimeString(),
      log.studentName || 'N/A',
      log.authorizedPersonName,
      log.relationship,
      log.method,
      log.verifiedByName,
      log.notes || '',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pickup_logs_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    showToast({ variant: 'success', message: 'Pickup logs exported successfully.' });
  }, [filteredLogs, showToast]);

  // Add manual log handler
  const handleAddLog = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!logForm.studentId || !logForm.authorizedPersonId) {
      showToast({ variant: 'error', message: 'Please select a student and authorized person.' });
      return;
    }

    setSaving(true);
    try {
      const pickupDateTime = new Date(`${logForm.pickupDate}T${logForm.pickupTime}`);
      const person = authorizedPersons.find(p => p.id === logForm.authorizedPersonId);
      const code = pickupCodes.find(c => c.studentId === logForm.studentId && c.status === 'ACTIVE');

      await recordPickup({
        studentId: logForm.studentId,
        studentName: uniqueStudents.find(s => s.id === logForm.studentId)?.name,
        authorizedPersonId: logForm.authorizedPersonId,
        authorizedPersonName: person ? `${person.firstName} ${person.lastName}` : 'Unknown',
        relationship: person?.relationship || 'Other',
        pickupTime: pickupDateTime.toISOString(),
        pickupDate: logForm.pickupDate,
        verifiedBy: 'current-user',
        verifiedByName: 'Current User',
        method: 'manual',
        notes: logForm.notes || null,
        pickupCodeId: code?.id || null,
      });

      showToast({ variant: 'success', message: 'Manual pickup log recorded successfully.' });
      setAddLogModalOpen(false);
      resetLogForm();
    } catch (error) {
      showToast({ variant: 'error', message: 'Failed to record pickup log.' });
    } finally {
      setSaving(false);
    }
  };

  // Check if a log should be flagged
  const isFlagged = (log: PickupLog): boolean => {
    return log.notes?.toLowerCase().includes('flag') ||
           log.notes?.toLowerCase().includes('issue') ||
           log.notes?.toLowerCase().includes('unauthorized') ||
           false;
  };

  const columns: DataGridColumn<PickupLog>[] = [
    {
      key: 'flagged',
      header: '',
      width: 40,
      sortable: false,
      filterable: false,
      render: (_, item) => {
        const flagged = isFlagged(item);
        return flagged ? (
          <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />
        ) : (
          <CheckCircleIcon className="w-5 h-5 text-emerald-500" />
        );
      },
    },
    {
      key: 'pickupTime',
      header: 'Timestamp',
      sortable: true,
      width: 170,
      render: (value) => new Date(value).toLocaleString(),
    },
    {
      key: 'studentName',
      header: 'Student',
      sortable: true,
      filterable: true,
      width: 160,
      render: (value) => value || 'N/A',
    },
    {
      key: 'authorizedPersonName',
      header: 'Picked Up By',
      sortable: true,
      filterable: true,
      width: 170,
    },
    {
      key: 'relationship',
      header: 'Relationship',
      width: 120,
      render: (value) => <span className="text-sm">{value}</span>,
    },
    {
      key: 'method',
      header: 'Method',
      sortable: true,
      filterable: true,
      width: 120,
      render: (value) => {
        const label = t(`pickupLog.method.${value}`, value);
        const colors: Record<string, string> = {
          qr_scan: 'bg-purple-100 text-purple-800',
          code_entry: 'bg-primary-100 text-primary-800',
          manual: 'bg-surface-accent text-surface-foreground',
        };
        return (
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[value] || 'bg-surface-accent'}`}>
            {String(label)}
          </span>
        );
      },
    },
    {
      key: 'verifiedByName',
      header: 'Verified By',
      sortable: true,
      width: 160,
      render: (value) => value || 'N/A',
    },
    {
      key: 'notes',
      header: 'Notes',
      width: 200,
      render: (value) => (
        <span className="text-sm text-surface-muted-fg truncate max-w-[200px] block" title={value || ''}>
          {value || '-'}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <Card
        title={t('pickupLog.plural')}
        
        actions={
          <div className="flex space-x-2">
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              leftIcon={<MagnifyingGlassIcon className="w-4 h-4" />}
            >
              Filters
            </Button>
            <Button
              variant="outline"
              onClick={handleExport}
              leftIcon={<DownloadIcon className="w-4 h-4" />}
            >
              {t('pickupLog.actions.export')}
            </Button>
            <Button
              variant="primary"
              onClick={() => setAddLogModalOpen(true)}
              leftIcon={<PlusIcon className="w-5 h-5" />}
            >
              Add Manual Log
            </Button>
          </div>
        }
      >
        {/* Search and Filters */}
        <div className="p-4 border-b">
          <div className="flex items-center space-x-4">
            <div className="flex-1 relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-surface-muted-fg" />
              <Input label="Search"
                placeholder="Search logs..."
                value={filters.searchQuery || ''}
                onChange={handleSearchChange}
                className="pl-10"
              />
            </div>
          </div>

          {showFilters && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-surface-foreground mb-1">Date From</label>
                <Input label="Date From"
                  type="date"
                  value={filters.dateFrom || ''}
                  onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-foreground mb-1">Date To</label>
                <Input label="Date From"
                  type="date"
                  value={filters.dateTo || ''}
                  onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                />
              </div>
              <Select
                label="Student"
                value={filters.studentId || ''}
                onChange={(value) => handleFilterChange('studentId', typeof value === 'string' ? value : '')}
              >
                <option value="">All Students</option>
                {uniqueStudents.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </Select>
              <div className="flex items-end space-x-2">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={!!filters.flaggedOnly}
                    onChange={(e) => handleFilterChange('flaggedOnly', e.target.checked)}
                    className="h-4 w-4 text-red-600 border-surface-border rounded focus:ring-red-500"
                  />
                  <span className="text-sm text-surface-foreground">Flagged Only</span>
                </label>
                <Button variant="ghost" onClick={clearFilters}>
                  Clear
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Data Grid */}
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <Spinner size="md" />
          </div>
        ) : (
          <DataGrid
            columns={columns}
            data={filteredLogs}
            sortable
            filterable
            loading={false}
            onRowClick={(row) => {
              if (isFlagged(row)) {
                // Highlight flagged rows
              }
            }}
            emptyState={
              <div className="text-center py-12">
                <ClipboardDocumentListIcon className="mx-auto h-12 w-12 text-surface-muted-fg" />
                <h3 className="mt-2 text-sm font-medium text-surface-foreground">
                  No pickup logs found
                </h3>
                <p className="mt-1 text-sm text-surface-muted-fg">
                  Pickup logs will appear here when students are released.
                </p>
              </div>
            }
          />
        )}
      </Card>

      {/* Add Manual Log Modal */}
      <DialogForm
        isOpen={addLogModalOpen}
        onClose={() => { setAddLogModalOpen(false); resetLogForm(); }}
        title="Add Manual Pickup Log"
        size="md"
        footer={
          <FormActions>
            <Button
              variant="secondary"
              onClick={() => { setAddLogModalOpen(false); resetLogForm(); }}
            >
              {t('common.cancel')}
            </Button>
            <Button
              variant="primary"
              onClick={handleAddLog}
              loading={saving}
            >
              Record Pickup
            </Button>
          </FormActions>
        }
      >
        <form onSubmit={handleAddLog}>
          <FormSection title="Pickup Details" columns={2}>
            <FormField label={t('pickupLog.fields.student')} required>
              <Select
                value={logForm.studentId}
                onChange={(value) => handleLogFormChange('studentId', typeof value === 'string' ? value : '')}
              >
                <option value="">Select student</option>
                {uniqueStudents.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </Select>
            </FormField>
            <FormField label={t('pickupLog.fields.authorizedPerson')} required>
              <Select
                value={logForm.authorizedPersonId}
                onChange={(value) => handleLogFormChange('authorizedPersonId', typeof value === 'string' ? value : '')}
              >
                <option value="">Select authorized person</option>
                {authorizedPersons
                  .filter(p => !logForm.studentId || p.studentId === logForm.studentId)
                  .map(p => (
                    <option key={p.id} value={p.id}>
                      {p.firstName} {p.lastName} ({p.relationship})
                    </option>
                  ))}
              </Select>
            </FormField>
            <div>
              <label className="block text-sm font-medium text-surface-foreground mb-1">
                {t('pickupLog.fields.pickupDate')}
              </label>
              <Input label="Date From"
                type="date"
                value={logForm.pickupDate}
                onChange={(e) => handleLogFormChange('pickupDate', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-foreground mb-1">
                {t('pickupLog.fields.pickupTime')}
              </label>
              <Input label="Date From"
                type="time"
                value={logForm.pickupTime}
                onChange={(e) => handleLogFormChange('pickupTime', e.target.value)}
              />
            </div>
            <FormField label={t('pickupLog.fields.notes')} className="col-span-2">
              <textarea
                value={logForm.notes}
                onChange={(e) => handleLogFormChange('notes', e.target.value)}
                placeholder="Any notes about this pickup..."
                rows={3}
                className="w-full px-3 py-2 border border-surface-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </FormField>
          </FormSection>
        </form>
      </DialogForm>
    </div>
  );
};

export default PickupLogsPage;
