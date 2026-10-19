// ABOUTME: User library portal for managing personal loans, renewals, and reservations
// ABOUTME: Allows logged-in users to view and modify their current book loans

import React, { useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLoanData } from '@/modules/library/data/useLoanData';
import { useLibrarySettingsData } from '@/modules/library/data/useLibrarySettingsData';
import type { LibLoanType } from '@/modules/library/data/types';
import { useToastHelpers } from '@/hooks/useToast';
import { DataGrid, DataGridColumn } from '@/components/ui/data';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { useTranslation } from 'react-i18next';

export const UserLibraryPortalPageContent: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const { data: loans, extendLoan, returnBook, isLoading } = useLoanData();
  const { data: librarySettings } = useLibrarySettingsData();
  const { showSuccess, showError, showWarning, showInfo } = useToastHelpers();
  const { t } = useTranslation(['library', 'common']);

  // Get borrowing rules for current user
  const userBorrowingRules = useMemo(() => {
    if (!user?.role) return null;
    const userType = user.role === 'student' ? 'Student' : 'Staff';
    return librarySettings.find(setting => 
      setting.is_active && setting.user_types.includes(userType)
    );
  }, [librarySettings, user?.role]);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      showError(t('common:authRequired', 'User not authenticated! Please log in.'));
    }
  }, [user, isAuthenticated, showError, t]);

  const handleRenew = async (loanId: string) => {
    try {
      const loan = userLoans.find(l => l.id === loanId);
      if (!loan) {
        showError('Loan not found');
        return;
      }

      // Check renewal rules
      if (!canRenewLoan(loan)) {
        showError('This loan cannot be renewed. Maximum renewals reached or loan is overdue.');
        return;
      }

      const renewalDays = userBorrowingRules?.max_loan_days || 14;
      const newDueDate = new Date();
      newDueDate.setDate(newDueDate.getDate() + renewalDays);
      
      await extendLoan(loanId, newDueDate.toISOString().split('T')[0]);
      showSuccess(t('library:userPortal.renewSuccess'));
    } catch {
      showError(t('library:userPortal.renewError'));
    }
  };

  const handleReturn = async (loanId: string) => {
    try {
      await returnBook(loanId);
      showSuccess(t('library:userPortal.returnSuccess'));
    } catch {
      showError(t('library:userPortal.returnError'));
    }
  };

  // Filter user loans and check for overdue items
  const userLoans = useMemo(() => {
    if (!user?.id) return [];
    return loans.filter((loan) => loan.user_id === user.id && !loan.return_date);
  }, [loans, user?.id]);

  const overdueLoans = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return userLoans.filter(loan => loan.due_date < today);
  }, [userLoans]);

  // Show overdue warning and borrowing rules info
  useEffect(() => {
    if (overdueLoans.length > 0) {
      showWarning(
        t('library:userPortal.overdueAlert') + ` You have ${overdueLoans.length} overdue loan(s).`
      );
    }
    
    // Show borrowing rules info on first load
    if (userBorrowingRules && userLoans.length === 0) {
      showInfo(
        `Your borrowing limits: ${userBorrowingRules.max_books_per_user} books max, ` +
        `${userBorrowingRules.max_loan_days} days loan period, ` +
        `${userBorrowingRules.max_renewals} renewals allowed.`
      );
    }
  }, [overdueLoans.length, userBorrowingRules, userLoans.length, showWarning, showInfo, t]);

  const isLoanOverdue = (loan: LibLoanType) => {
    const today = new Date().toISOString().split('T')[0];
    return loan.due_date < today;
  };

  const canRenewLoan = (loan: LibLoanType) => {
    // Check if loan is overdue
    if (isLoanOverdue(loan)) return false;
    
    // Check maximum renewals (assuming we track renewal count - this would need to be added to the loan schema)
    // For now, allow renewal if extended_due_date is not set (first renewal)
    // In a real system, you'd track renewal count in the loan record
    const maxRenewals = userBorrowingRules?.max_renewals || 0;
    
    // Simple check: if extended_due_date exists, assume one renewal has been used
    const renewalsUsed = loan.extended_due_date ? 1 : 0;
    
    return renewalsUsed < maxRenewals;
  };

  const getRenewalInfo = (loan: LibLoanType) => {
    const maxRenewals = userBorrowingRules?.max_renewals || 0;
    const renewalsUsed = loan.extended_due_date ? 1 : 0;
    return `${renewalsUsed}/${maxRenewals} renewals used`;
  };

  const columns: DataGridColumn<LibLoanType>[] = [
    {
      key: 'book_title',
      header: t('library:tableHeaders.bookTitle'),
      sortable: true,
      filterable: true,
    },
    {
      key: 'loan_date',
      header: t('library:tableHeaders.loanDate'),
      sortable: true,
      width: 120,
      render: (_, item) => new Date(item.loan_date).toLocaleDateString(),
    },
    {
      key: 'due_date',
      header: t('library:tableHeaders.dueDate'),
      sortable: true,
      width: 120,
      render: (_, item) => {
        const isOverdue = isLoanOverdue(item);
        return (
          <span className={isOverdue ? 'text-red-600 font-semibold' : ''}>
            {new Date(item.due_date).toLocaleDateString()}
            {isOverdue && <span className="ml-1">⚠️</span>}
          </span>
        );
      },
    },
    {
      key: 'extended_due_date',
      header: 'Extended Due',
      width: 140,
      render: (_, item) => 
        item.extended_due_date ? new Date(item.extended_due_date).toLocaleDateString() : '--',
    },
    {
      key: 'renewal_status',
      header: 'Renewals',
      width: 120,
      render: (_, item) => (
        <span className="text-xs text-surface-muted-fg">
          {getRenewalInfo(item)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: t('common:actions'),
      width: 200,
      render: (_, item) => (
        <div className="flex gap-2">
          <Button 
            size="sm" 
            variant="secondary" 
            onClick={() => handleRenew(item.id)}
            disabled={isLoading || !canRenewLoan(item)}
            title={!canRenewLoan(item) ? 'Cannot renew: Maximum renewals reached or overdue' : ''}
          >
            {t('library:userPortal.renewButton')}
          </Button>
          <Button 
            size="sm" 
            variant="primary" 
            onClick={() => handleReturn(item.id)}
            disabled={isLoading}
          >
            {t('library:userPortal.returnButton')}
          </Button>
        </div>
      ),
    },
  ];

  if (!isAuthenticated) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-center">
          <p className="text-lg text-surface-muted-fg">Please log in to access your library portal.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card 
        title={t('library:userPortal.title')} 
        subtitle={t('library:userPortal.description')}
      >
        {/* Borrowing Rules Info */}
        {userBorrowingRules && (
          <div className="bg-surface-muted p-4 rounded-lg mb-6">
            <h3 className="text-sm font-semibold text-surface-foreground mb-2">Your Borrowing Limits</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-surface-muted-fg">Max Books:</span>
                <span className="ml-1 font-medium">{userBorrowingRules.max_books_per_user}</span>
              </div>
              <div>
                <span className="text-surface-muted-fg">Loan Period:</span>
                <span className="ml-1 font-medium">{userBorrowingRules.max_loan_days} days</span>
              </div>
              <div>
                <span className="text-surface-muted-fg">Max Renewals:</span>
                <span className="ml-1 font-medium">{userBorrowingRules.max_renewals}</span>
              </div>
              <div>
                <span className="text-surface-muted-fg">Fine Rate:</span>
                <span className="ml-1 font-medium">KES {userBorrowingRules.fine_per_day}/day</span>
              </div>
            </div>
          </div>
        )}

        {/* Summary stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-primary-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-primary-900">Active Loans</h3>
            <p className="text-2xl font-bold text-primary-600">{userLoans.length}</p>
            <p className="text-xs text-primary-700">of {userBorrowingRules?.max_books_per_user || 'N/A'} max</p>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-yellow-900">Overdue</h3>
            <p className="text-2xl font-bold text-yellow-600">{overdueLoans.length}</p>
            <p className="text-xs text-yellow-700">
              {overdueLoans.length > 0 ? 'Action required!' : 'All good!'}
            </p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-green-900">On Time</h3>
            <p className="text-2xl font-bold text-green-600">{userLoans.length - overdueLoans.length}</p>
            <p className="text-xs text-green-700">Current & good</p>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-purple-900">Available</h3>
            <p className="text-2xl font-bold text-purple-600">
              {Math.max(0, (userBorrowingRules?.max_books_per_user || 0) - userLoans.length)}
            </p>
            <p className="text-xs text-purple-700">Books to borrow</p>
          </div>
        </div>

        {/* Loans table */}
        <DataGrid 
          columns={columns} 
          data={userLoans} 
          loading={isLoading}
          sortable={true}
          filterable={true}
          emptyState={
            <div className="text-center py-8">
              <p className="text-surface-muted-fg">{t('library:userPortal.noLoansMessage')}</p>
            </div>
          }
        />
      </Card>
    </div>
  );
};
const UserLibraryPortalPage: React.FC = () => (
  <div className="space-y-6">
    <UserLibraryPortalPageContent />
  </div>
);

export default UserLibraryPortalPage;
