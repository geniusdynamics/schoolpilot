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
import { PlusIcon, CopyIcon, XCircleIcon, MagnifyingGlassIcon, TicketIcon } from '@/components/ui/icons';
import { usePickupData } from '../../data/pickup/usePickupData';
import { PickupCode, PickupCodeStatus } from '../../data/pickup/types';
import { useToast } from '@/hooks/useToast';
import { useTranslation } from 'react-i18next';

const statusColors: Record<PickupCodeStatus, string> = {
  [PickupCodeStatus.ACTIVE]: 'bg-emerald-100 text-emerald-800',
  [PickupCodeStatus.EXPIRED]: 'bg-gray-100 text-gray-800',
  [PickupCodeStatus.USED]: 'bg-blue-100 text-blue-800',
  [PickupCodeStatus.REVOKED]: 'bg-red-100 text-red-800',
};

interface CodeFilters {
  searchQuery?: string;
  status?: string;
  studentId?: string;
}

const PickupCodesPage: React.FC = () => {
  const { t } = useTranslation('pickup');
  const { pickupCodes, loading, generatePickupCode, revokePickupCode } = usePickupData();
  const { showToast } = useToast();

  const [filters, setFilters] = useState<CodeFilters>({});
  const [showFilters, setShowFilters] = useState(false);
  const [generateModalOpen, setGenerateModalOpen] = useState(false);
  const [revokeModalOpen, setRevokeModalOpen] = useState(false);
  const [codeToRevoke, setCodeToRevoke] = useState<PickupCode | null>(null);
  const [generating, setGenerating] = useState(false);
  const [revoking, setRevoking] = useState(false);

  // Generate form state
  const [studentId, setStudentId] = useState('');
  const [expiryMinutes, setExpiryMinutes] = useState('30');

  // Unique students for filter
  const uniqueStudents = useMemo(() => {
    const seen = new Set<string>();
    return pickupCodes
      .filter(c => c.studentName && !seen.has(c.studentId))
      .map(c => {
        seen.add(c.studentId);
        return { id: c.studentId, name: c.studentName || 'Unknown' };
      });
  }, [pickupCodes]);

  // Filtered codes
  const filteredCodes = useMemo(() => {
    return pickupCodes.filter(code => {
      if (filters.status && code.status !== filters.status) return false;
      if (filters.studentId && code.studentId !== filters.studentId) return false;
      if (filters.searchQuery) {
        const search = filters.searchQuery.toLowerCase();
        return (
          (code.code?.toLowerCase() ?? '').includes(search) ||
          (code.studentName || '').toLowerCase().includes(search)
        );
      }
      return true;
    });
  }, [pickupCodes, filters]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters(prev => ({ ...prev, searchQuery: e.target.value }));
  };

  const handleFilterChange = (key: keyof CodeFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value || undefined }));
  };

  const clearFilters = () => setFilters({});

  // Copy code to clipboard
  const copyCode = useCallback(async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      showToast({ variant: 'success', message: 'Code copied to clipboard.' });
    } catch {
      showToast({ variant: 'error', message: 'Failed to copy code.' });
    }
  }, [showToast]);

  // Generate code handler
  const handleGenerateCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenerating(true);
    try {
      const expiresAt = new Date(Date.now() + parseInt(expiryMinutes) * 60 * 1000).toISOString();
      await generatePickupCode({
        studentId: studentId || undefined,
        studentName: uniqueStudents.find(s => s.id === studentId)?.name,
        expiresAt,
      });
      showToast({ variant: 'success', message: 'Pickup code generated successfully.' });
      setGenerateModalOpen(false);
      setStudentId('');
      setExpiryMinutes('30');
    } catch (error) {
      showToast({ variant: 'error', message: 'Failed to generate pickup code.' });
    } finally {
      setGenerating(false);
    }
  };

  // Revoke handlers
  const handleRevokeClick = (code: PickupCode) => {
    setCodeToRevoke(code);
    setRevokeModalOpen(true);
  };

  const confirmRevoke = async () => {
    if (codeToRevoke) {
      setRevoking(true);
      try {
        await revokePickupCode(codeToRevoke.id);
        showToast({ variant: 'success', message: `Code ${codeToRevoke.code} has been revoked.` });
      } catch (error) {
        showToast({ variant: 'error', message: 'Failed to revoke code.' });
      } finally {
        setRevoking(false);
        setRevokeModalOpen(false);
        setCodeToRevoke(null);
      }
    }
  };

  const columns: DataGridColumn<PickupCode>[] = [
    {
      key: 'code',
      header: 'Code',
      sortable: true,
      filterable: true,
      width: 120,
      render: (value) => (
        <span className="font-mono text-sm font-semibold tracking-wider">{value}</span>
      ),
    },
    {
      key: 'studentName',
      header: 'Student',
      sortable: true,
      filterable: true,
      width: 180,
      render: (value) => value || 'N/A',
    },
    {
      key: 'generatedAt',
      header: 'Generated',
      sortable: true,
      width: 150,
      render: (value) => value ? new Date(value).toLocaleString() : 'N/A',
    },
    {
      key: 'expiresAt',
      header: 'Expires',
      sortable: true,
      width: 150,
      render: (value) => value ? new Date(value).toLocaleString() : 'N/A',
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      filterable: true,
      width: 120,
      render: (value: PickupCodeStatus) => (
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[value]}`}>
          {t(`pickupCode.status.${value}`)}
        </span>
      ),
    },
    {
      key: 'usedBy',
      header: 'Used By',
      width: 150,
      render: (value) => value || '-',
    },
    {
      key: 'verifiedByName',
      header: 'Verified By',
      width: 150,
      render: (value) => value || '-',
    },
    {
      key: 'actions',
      header: 'Actions',
      sortable: false,
      filterable: false,
      width: 220,
      sticky: 'right',
      render: (_, item) => (
        <div className="flex space-x-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => copyCode(item.code)}
            leftIcon={<CopyIcon className="w-4 h-4" />}
          >
            Copy
          </Button>
          {item.status === PickupCodeStatus.ACTIVE && (
            <Button
              size="sm"
              variant="danger"
              onClick={() => handleRevokeClick(item)}
              leftIcon={<XCircleIcon className="w-4 h-4" />}
            >
              Revoke
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <Card
        title={t('pickupCode.plural')}
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
              variant="primary"
              onClick={() => setGenerateModalOpen(true)}
              leftIcon={<PlusIcon className="w-5 h-5" />}
            >
              {t('pickupCode.actions.generate')}
            </Button>
          </div>
        }
      >
        {/* Search and Filters */}
        <div className="p-4 border-b">
          <div className="flex items-center space-x-4">
            <div className="flex-1 relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                label="Search"
                placeholder="Search by code or student name..."
                value={filters.searchQuery || ''}
                onChange={handleSearchChange}
                className="pl-10"
              />
            </div>
          </div>

          {showFilters && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              <Select
                label="Status"
                value={filters.status || ''}
                onChange={(value) => handleFilterChange('status', typeof value === 'string' ? value : '')}
              >
                <option value="">All Statuses</option>
                {Object.values(PickupCodeStatus).map((status) => (
                  <option key={status} value={status}>
                    {t(`pickupCode.status.${status}`)}
                  </option>
                ))}
              </Select>
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
              <div className="flex items-end">
                <Button variant="ghost" onClick={clearFilters}>
                  Clear Filters
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
            data={filteredCodes}
            sortable
            filterable
            loading={false}
            emptyState={
              <div className="text-center py-12">
                <TicketIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                  No pickup codes found
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Generate a new pickup code to get started.
                </p>
                <div className="mt-6">
                  <Button
                    variant="primary"
                    onClick={() => setGenerateModalOpen(true)}
                    leftIcon={<PlusIcon className="w-5 h-5" />}
                  >
                    {t('pickupCode.actions.generate')}
                  </Button>
                </div>
              </div>
            }
          />
        )}
      </Card>

      {/* Generate Code Modal */}
      <DialogForm
        isOpen={generateModalOpen}
        onClose={() => setGenerateModalOpen(false)}
        title={t('pickupCode.actions.generate')}
        size="md"
        footer={
          <FormActions>
            <Button variant="secondary" onClick={() => setGenerateModalOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="primary"
              onClick={handleGenerateCode}
              loading={generating}
            >
              Generate
            </Button>
          </FormActions>
        }
      >
        <form onSubmit={handleGenerateCode}>
          <FormSection title="Code Details" columns={1}>
            <FormField label="Student (Optional)">
              <Select
                value={studentId}
                onChange={(value) => setStudentId(typeof value === 'string' ? value : '')}
              >
                <option value="">General Code (No Student)</option>
                {uniqueStudents.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </Select>
            </FormField>
            <FormField label="Expiry Duration (minutes)">
              <Input
                label="Expiry Duration"
                type="number"
                value={expiryMinutes}
                onChange={(e) => setExpiryMinutes(e.target.value)}
                min="5"
                max="480"
              />
              <p className="mt-1 text-xs text-gray-500">
                Default: 30 minutes. Maximum: 8 hours (480 min).
              </p>
            </FormField>
          </FormSection>
        </form>
      </DialogForm>

      {/* Revoke Confirmation Modal */}
      <DialogForm
        isOpen={revokeModalOpen}
        onClose={() => setRevokeModalOpen(false)}
        title="Confirm Revoke"
        size="sm"
        footer={
          <FormActions>
            <Button variant="secondary" onClick={() => setRevokeModalOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="danger"
              onClick={confirmRevoke}
              loading={revoking}
            >
              Revoke Code
            </Button>
          </FormActions>
        }
      >
        <p>
          Are you sure you want to revoke code{' '}
          <code className="font-mono bg-gray-100 px-1 py-0.5 rounded">
            {codeToRevoke?.code}
          </code>{' '}
          for <strong>{codeToRevoke?.studentName}</strong>?
          This action cannot be undone.
        </p>
      </DialogForm>
    </div>
  );
};

export default PickupCodesPage;
