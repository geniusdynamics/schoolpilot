import React, { useState, useMemo } from 'react';
import Card from '@/components/ui/Card';
import { DataGrid, DataGridColumn } from '@/components/ui/data';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Textarea from '@/components/ui/Textarea';
import FormSection from '@/components/ui/forms/FormSection';
import FormField from '@/components/ui/forms/FormField';
import FormActions from '@/components/ui/forms/FormActions';
import Spinner from '@/components/ui/Spinner';
import { PlusIcon, CheckCircleIcon, XCircleIcon } from '@/components/ui/icons';
import { useHousesData } from '../../data/houses/useHousesData';
import { useTranslation } from 'react-i18next';
import { TransactionType, TransactionStatus } from '../../data/houses/types';
import type { PointTransaction } from '../../data/houses/types';
import { logger } from '@/utils/logging';


interface AwardFormData {
  studentId: string;
  studentName: string;
  houseId: string;
  houseName: string;
  className: string;
  categoryId: string;
  categoryName: string;
  type: TransactionType;
  points: number;
  reason: string;
  eventName: string;
}

const AwardPointsPage: React.FC = () => {
  const { t } = useTranslation('houses');
  const {
    houses,
    categories,
    transactions,
    loading,
    createTransaction,
    approveTransaction,
    rejectTransaction,
  } = useHousesData();

  const [showAwardForm, setShowAwardForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedHouseFilter, setSelectedHouseFilter] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('');

  const initialFormData: AwardFormData = {
    studentId: '',
    studentName: '',
    houseId: '',
    houseName: '',
    className: '',
    categoryId: '',
    categoryName: '',
    type: TransactionType.MERIT,
    points: 0,
    reason: '',
    eventName: '',
  };

  const [formData, setFormData] = useState<AwardFormData>(initialFormData);

  // Filter categories by type
  const filteredCategories = useMemo(() => {
    return categories.filter(c => c.type === formData.type && c.isActive);
  }, [categories, formData.type]);

  // Auto-fill category details when selected
  const handleCategoryChange = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    if (category) {
      setFormData(prev => ({
        ...prev,
        categoryId: category.id,
        categoryName: category.name,
        type: category.type,
        points: Math.abs(category.defaultPoints),
      }));
    }
  };

  // Auto-fill house when student is selected (mock - in real app, student lookup would populate this)
  const handleStudentChange = (studentInfo: string) => {
    // In a real app, this would look up the student and auto-fill house/class
    // For now, we just set the name
    setFormData(prev => ({
      ...prev,
      studentName: studentInfo,
    }));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name === 'points') {
      setFormData(prev => ({ ...prev, points: Number(value) || 0 }));
    } else if (name === 'categoryId') {
      handleCategoryChange(value);
    } else if (name === 'studentName') {
      handleStudentChange(value);
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.studentName || !formData.categoryId || !formData.reason) {
      return;
    }

    setSubmitting(true);
    try {
      await createTransaction({
        studentId: formData.studentId || `STU${Date.now()}`,
        studentName: formData.studentName,
        houseId: formData.houseId,
        houseName: formData.houseName,
        className: formData.className,
        categoryId: formData.categoryId,
        categoryName: formData.categoryName,
        type: formData.type,
        points: Math.abs(formData.points),
        reason: formData.reason,
        eventName: formData.eventName || undefined,
        awardedBy: 'CURRENT_USER', // Replace with actual user ID
        awardedAt: new Date().toISOString(),
      });

      // Reset form
      setFormData(initialFormData);
      setShowAwardForm(false);
    } catch (error) {
      logger.error('Failed to award points:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (transaction: PointTransaction) => {
    try {
      await approveTransaction(transaction.id, 'CURRENT_USER');
    } catch (error) {
      logger.error('Failed to approve transaction:', error);
    }
  };

  const handleReject = async (transaction: PointTransaction) => {
    try {
      await rejectTransaction(transaction.id);
    } catch (error) {
      logger.error('Failed to reject transaction:', error);
    }
  };

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      if (selectedHouseFilter && tx.houseId !== selectedHouseFilter) return false;
      if (selectedStatusFilter && tx.status !== selectedStatusFilter) return false;
      return true;
    });
  }, [transactions, selectedHouseFilter, selectedStatusFilter]);

  const pendingCount = transactions.filter(tx => tx.status === TransactionStatus.PENDING).length;

  const columns: DataGridColumn<PointTransaction>[] = [
    {
      key: 'awardedAt',
      header: t('transactions.fields.awardedAt'),
      sortable: true,
      filterable: false,
      width: 120,
      render: (value) => value ? new Date(value).toLocaleDateString() : '-',
    },
    {
      key: 'studentName',
      header: t('transactions.fields.student'),
      sortable: true,
      filterable: true,
      width: 160,
    },
    {
      key: 'houseName',
      header: t('transactions.fields.house'),
      sortable: true,
      filterable: true,
      width: 120,
    },
    {
      key: 'categoryName',
      header: t('transactions.fields.category'),
      sortable: true,
      filterable: true,
      width: 160,
    },
    {
      key: 'type',
      header: t('transactions.fields.type'),
      sortable: true,
      filterable: true,
      width: 100,
      align: 'center',
      render: (value: TransactionType) => (
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${
            value === TransactionType.MERIT
              ? 'bg-green-100 text-green-800'
              : 'bg-red-100 text-red-800'
          }`}
        >
          {value === TransactionType.MERIT ? 'Merit' : 'Demerit'}
        </span>
      ),
    },
    {
      key: 'points',
      header: t('transactions.fields.points'),
      sortable: true,
      filterable: false,
      width: 80,
      align: 'center',
      render: (value: number, item) => (
        <span className={`font-semibold ${item.type === TransactionType.DEMERIT ? 'text-red-600' : 'text-green-600'}`}>
          {item.type === TransactionType.DEMERIT ? '-' : '+'}{value}
        </span>
      ),
    },
    {
      key: 'reason',
      header: t('transactions.fields.reason'),
      sortable: false,
      filterable: true,
      width: 250,
    },
    {
      key: 'status',
      header: t('transactions.fields.status'),
      sortable: true,
      filterable: true,
      width: 120,
      align: 'center',
      render: (value: TransactionStatus) => {
        const statusConfig = {
          [TransactionStatus.PENDING]: { color: 'bg-yellow-100 text-yellow-800', label: t('transactions.status.pending') },
          [TransactionStatus.APPROVED]: { color: 'bg-green-100 text-green-800', label: t('transactions.status.approved') },
          [TransactionStatus.REJECTED]: { color: 'bg-red-100 text-red-800', label: t('transactions.status.rejected') },
        };
        const config = statusConfig[value];
        return (
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
            {config.label}
          </span>
        );
      },
    },
    {
      key: 'actions',
      header: t('common.actions'),
      sortable: false,
      filterable: false,
      width: 180,
      sticky: 'right',
      render: (_, item) => (
        <div className="flex space-x-2">
          {item.status === TransactionStatus.PENDING && (
            <>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleApprove(item)}
                leftIcon={<CheckCircleIcon className="w-4 h-4 text-green-600" />}
              >
                {t('common.approve')}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleReject(item)}
                leftIcon={<XCircleIcon className="w-4 h-4 text-red-600" />}
              >
                {t('common.reject')}
              </Button>
            </>
          )}
          {item.status !== TransactionStatus.PENDING && (
            <span className="text-xs text-gray-400">-</span>
          )}
        </div>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Award Points Form */}
      <Card
        title={t('transactions.award')}
        subtitle="Award merit or demerit points to a student"
        actions={
          <Button
            onClick={() => setShowAwardForm(!showAwardForm)}
            leftIcon={<PlusIcon className="w-5 h-5" />}
          >
            {showAwardForm ? 'Hide Form' : t('transactions.award')}
          </Button>
        }
      >
        {showAwardForm && (
          <form onSubmit={handleSubmit}>
            <FormSection columns={2}>
              <FormField label={t('transactions.fields.student')} required>
                <Input
                  name="studentName"
                  value={formData.studentName}
                  onChange={handleInputChange}
                  placeholder="Enter student name..."
                  required
                />
              </FormField>
              <FormField label={t('transactions.fields.category')} required>
                <Select
                  name="categoryId"
                  value={formData.categoryId}
                  onChange={handleInputChange}
                  required
                >
                  <option value="">Select a category</option>
                  {filteredCategories.map(category => (
                    <option key={category.id} value={category.id}>
                      {category.name} ({category.type === TransactionType.MERIT ? '+' : '-'}{Math.abs(category.defaultPoints)} pts)
                    </option>
                  ))}
                </Select>
              </FormField>
              <FormField label={t('transactions.fields.points')} required>
                <Input
                  name="points"
                  type="number"
                  min="1"
                  value={formData.points}
                  onChange={handleInputChange}
                  required
                />
              </FormField>
              <FormField label={t('transactions.fields.eventName')}>
                <Input
                  name="eventName"
                  value={formData.eventName}
                  onChange={handleInputChange}
                  placeholder="Optional event name"
                />
              </FormField>
            </FormSection>
            <FormSection>
              <FormField label={t('transactions.fields.reason')} required>
                <Textarea
                  name="reason"
                  value={formData.reason}
                  onChange={handleInputChange}
                  rows={3}
                  placeholder="Reason for awarding points..."
                  required
                />
              </FormField>
            </FormSection>
            <FormActions>
              <Button variant="secondary" onClick={() => setShowAwardForm(false)}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={submitting}>
                {t('transactions.award')}
              </Button>
            </FormActions>
          </form>
        )}
      </Card>

      {/* Pending Transactions Alert */}
      {pendingCount > 0 && (
        <Card variant="outlined">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center">
                <span className="text-yellow-600 font-semibold">{pendingCount}</span>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {pendingCount} pending transaction{pendingCount > 1 ? 's' : ''} awaiting approval
                </p>
                <p className="text-xs text-gray-500">
                  Review and approve or reject pending point awards
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              onClick={() => setSelectedStatusFilter(selectedStatusFilter === 'pending' ? '' : 'pending')}
            >
              {selectedStatusFilter === 'pending' ? 'Show All' : 'View Pending'}
            </Button>
          </div>
        </Card>
      )}

      {/* Transactions Table */}
      <Card
        title={t('transactions.title')}
        subtitle="All point transactions"
      >
        {/* Filters */}
        <div className="flex items-center gap-4 mb-4">
          <Select
            value={selectedHouseFilter}
            onChange={(e: any) => setSelectedHouseFilter(e.target.value)}
          >
            <option value="">All Houses</option>
            {houses.map(house => (
              <option key={house.id} value={house.id}>{house.name}</option>
            ))}
          </Select>
          <Select
            value={selectedStatusFilter}
            onChange={(e: any) => setSelectedStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value={TransactionStatus.PENDING}>{t('transactions.status.pending')}</option>
            <option value={TransactionStatus.APPROVED}>{t('transactions.status.approved')}</option>
            <option value={TransactionStatus.REJECTED}>{t('transactions.status.rejected')}</option>
          </Select>
          {(selectedHouseFilter || selectedStatusFilter) && (
            <Button
              variant="ghost"
              onClick={() => {
                setSelectedHouseFilter('');
                setSelectedStatusFilter('');
              }}
            >
              Clear Filters
            </Button>
          )}
        </div>

        <DataGrid
          columns={columns}
          data={filteredTransactions}
          sortable
          filterable
          emptyState={
            <div className="text-center py-12">
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                {t('common.noData')}
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                No point transactions found.
              </p>
            </div>
          }
        />
      </Card>
    </div>
  );
};

export default AwardPointsPage;
