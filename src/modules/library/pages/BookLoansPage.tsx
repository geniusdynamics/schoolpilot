import React, { useState, useMemo } from 'react';

import Card from '@/components/ui/Card';
import { DataGrid, DataGridColumn } from '@/components/ui/data';
import Button from '@/components/ui/Button';
import DialogForm from '@/components/ui/forms/DialogForm';
import FormField from '@/components/ui/forms/FormField';
import FormSection from '@/components/ui/forms/FormSection';
import FormActions from '@/components/ui/forms/FormActions';
import Select from '@/components/ui/Select';
import Input from '@/components/ui/Input';
import { EntityPicker } from '@/components/ui/EntityPicker';
import { asId } from '@/domain/ids';
import { PlusIcon } from '@/components/ui/icons';
import { useAppData } from '@/hooks/useAppData';
import { CanonicalRepositoryProvider } from '../data/canonicalRepository';
import { useCanonicalUsers } from '../data/useCanonicalUsers';
import Spinner from '@/components/ui/Spinner';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { useTranslation } from 'react-i18next';
import { useLoanData } from '@/modules/library/data/useLoanData';
import { useLibrarySettingsData } from '@/modules/library/data/useLibrarySettingsData';
import { LibrarySettingsType } from '@/modules/library/data/types';
import { BookStatus } from '@/core/types';
import type { Loan } from '@/core/types';

type LoanFormData = Omit<Partial<Loan>, 'id' | 'created_at' | 'updated_at' | 'book_title' | 'user_name' | 'loan_date'> & {
    userType?: string;
};

export const BookLoansPageContent: React.FC = () => {
  const { t } = useTranslation(['library', 'common']);
  // The borrower is a canonical user; the book and the loan are not modelled yet.
  // GAP(P1-E05): the canonical registry models no book, no loan and no fine, so the
  // catalogue keeps reading the legacy collections.
  const { books, loading } = useAppData();
  const { users, usersLookup } = useCanonicalUsers();
  const { data: loans, create: addLoan, update: updateLoan } = useLoanData();
  const { data: librarySettings } = useLibrarySettingsData();

  const confirm = useConfirm();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLoan, setEditingLoan] = useState<Loan | null>(null);

  const initialFormData: LoanFormData = {
    book_id: undefined,
    user_id: undefined,
    due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    userType: undefined
  };
  const [formData, setFormData] = useState<LoanFormData>(initialFormData);

  const availableBooks = useMemo(() => books.filter(b => b.status === BookStatus.AVAILABLE), [books]);

  // Borrowing rules validation functions
  const getBorrowingRule = (userType: string): LibrarySettingsType | null => {
    const activeSettings = librarySettings.filter(setting => setting.is_active);
    return activeSettings.find(setting => setting.user_types.includes(userType)) || null;
  };

  const getUserActiveLoans = (userId: string): number => {
    return loans.filter(loan => loan.user_id === userId && !loan.return_date).length;
  };

  const validateBorrowingRules = (userId: string, userType: string): { isValid: boolean; message?: string } => {
    const rule = getBorrowingRule(userType);
    if (!rule) {
      return { isValid: false, message: 'No borrowing rules found for this user type.' };
    }

    const activeLoans = getUserActiveLoans(userId);
    if (activeLoans >= rule.max_books_per_user) {
      return {
        isValid: false,
        message: `User has reached the maximum limit of ${rule.max_books_per_user} books. Currently has ${activeLoans} active loans.`
      };
    }

    return { isValid: true };
  };

  const calculateDueDate = (userType: string): string => {
    const rule = getBorrowingRule(userType);
    const loanDays = rule ? rule.max_loan_days : 14; // Default to 14 days
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + loanDays);
    return dueDate.toISOString().split('T')[0];
  };

  const openModal = (loan?: Loan) => {
    setEditingLoan(loan || null);
    setFormData(loan ?
      {
        book_id: loan.book_id,
        user_id: loan.user_id,
        due_date: loan.due_date,
        return_date: loan.return_date,
        userType: users.find(u => u.id === loan.user_id)?.userType
      } :
      initialFormData
    );
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingLoan(null);
    setFormData(initialFormData);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    let processedValue: string | number | undefined = value;
    if (name === 'book_id' || name === 'user_id') {
      processedValue = value || undefined;
    } else if (name === 'userType') {
      processedValue = value || undefined;
    }
    setFormData(prev => ({ ...prev, [name]: processedValue }));
  };

  const handleIssueBook = async () => {
    if (!formData.book_id || !formData.user_id || !formData.due_date) {
      alert(t('library:bookLoans.alertRequiredFields'));
      return;
    }
    const selectedUser = users.find(u => u.id === formData.user_id);
    if (!selectedUser) {
      alert(t('library:bookLoans.alertUserNotFound'));
      return;
    }

    // Validate borrowing rules
    const validation = validateBorrowingRules(selectedUser.id, selectedUser.userType);
    if (!validation.isValid) {
      alert(`Borrowing limit exceeded: ${validation.message}`);
      return;
    }

    // Auto-calculate due date based on user type if not manually set
    const dueDate = formData.due_date || calculateDueDate(selectedUser.userType);

    const payload: Omit<Loan, 'id' | 'created_at' | 'updated_at' | 'book_title' | 'user_name'> = {
      book_id: formData.book_id!,
      user_id: formData.user_id!,
      loan_date: new Date().toISOString().split('T')[0],
      due_date: dueDate,
      return_date: undefined,
    };
    addLoan(payload);
    closeModal();
  };

  const handleMarkAsReturned = async (loanId: string) => {
    const loanToReturn = loans.find(l => l.id === loanId);
    if (loanToReturn) {
      if (await confirm({ title: t('library:bookLoans.markReturned'), message: t('library:bookLoans.confirmMarkReturned', { bookTitle: loanToReturn.book_title }) })) {
        updateLoan(loanId, { ...loanToReturn, return_date: new Date().toISOString().split('T')[0] });
      }
    }
  };

  const columns: DataGridColumn<Loan>[] = [
    {
      key: 'id',
      header: t('library:bookLoans.loanId'),
      sortable: true,
      filterable: true,
      sticky: true,
      width: 120
    },
    {
      key: 'book_title',
      header: t('library:bookLoans.bookTitle'),
      sortable: true,
      filterable: true
    },
    {
      key: 'user_name',
      header: t('library:bookLoans.userName'),
      sortable: true,
      filterable: true
    },
    {
      key: 'loan_date',
      header: t('library:bookLoans.loanDate'),
      sortable: true,
      filterable: true,
      width: 120,
      render: (value, item) => new Date(item.loan_date).toLocaleDateString()
    },
    {
      key: 'due_date',
      header: t('library:bookLoans.dueDate'),
      sortable: true,
      filterable: true,
      width: 120,
      render: (value, item) => new Date(item.due_date).toLocaleDateString()
    },
    {
      key: 'return_date',
      header: t('library:bookLoans.returnDate'),
      sortable: true,
      filterable: true,
      width: 140,
      render: (value, item) => item.return_date ? new Date(item.return_date).toLocaleDateString() : (
        <span className="text-xs text-orange-600 font-semibold">{t('library:bookLoans.notReturned')}</span>
      )
    },
    {
      key: 'actions',
      header: t('common:actions'),
      width: 150,
      render: (_, item) => (
        !item.return_date ? (
          <Button size="sm" variant="secondary" onClick={() => handleMarkAsReturned(item.id)}>
            {t('library:bookLoans.markReturned')}
          </Button>
        ) : (
          <span className="text-xs text-green-600 font-semibold">{t('library:bookLoans.returned')}</span>
        )
      )
    }
  ];

  if ((loading.loans || loading.books || loading.users) && !isModalOpen) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner size="lg" /> <span className="ml-2">{t('library:bookLoans.loading')}</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card title={t('library:bookLoans.title')} actions={
        <Button onClick={() => openModal()} leftIcon={<PlusIcon className="w-5 h-5" />}>
          {t('library:bookLoans.issueNewLoan')}
        </Button>
      }>
        <p className="text-sm text-surface-muted-fg mb-4">
          {t('library:bookLoans.description')}
        </p>
        <DataGrid
          columns={columns}
          data={loans || []}
          loading={loading.loans && isModalOpen}
          sortable={true}
          filterable={true}
          emptyState={
            <div className="text-center py-8">
              <PlusIcon className="w-12 h-12 text-surface-muted-fg mx-auto mb-4" />
              <p className="text-surface-muted-fg">{t('library:bookLoans.noLoansFound')}</p>
            </div>
          }
        />
      </Card>
      <DialogForm isOpen={isModalOpen} onClose={closeModal} title={editingLoan ? t('library:bookLoans.viewLoanDetails') : t('library:bookLoans.issueNewBookLoan')} size="lg">
        {formData.user_id && !editingLoan && (
          <div className="mb-4 p-3 bg-primary-50 rounded-lg">
            <p className="text-sm font-medium text-primary-900 mb-1">Borrowing Status:</p>
            {(() => {
              const selectedUser = users.find(u => u.id === formData.user_id);
              if (!selectedUser) return null;
              
              const rule = getBorrowingRule(selectedUser.userType);
              const activeLoans = getUserActiveLoans(selectedUser.id);
              
              return (
                <div className="text-sm text-primary-800">
                  <p>Active Loans: {activeLoans}/{rule?.max_books_per_user || 'N/A'}</p>
                  <p>Max Loan Days: {rule?.max_loan_days || 'N/A'} days</p>
                  <p>Fine per Day: KES {rule?.fine_per_day || 'N/A'}</p>
                  {activeLoans >= (rule?.max_books_per_user || 0) && (
                    <p className="text-red-600 font-medium mt-1">⚠️ Borrowing limit reached!</p>
                  )}
                </div>
              );
            })()}
          </div>
        )}
        <FormSection columns={1}>
          <FormField label={t('library:bookLoans.bookToLoan')} required>
            <Select 
              name="book_id" 
              value={formData.book_id || ''} 
              onChange={handleInputChange}
              required
              disabled={!!editingLoan}
            >
              <option value="">{t('library:bookLoans.selectBook')}</option>
              {availableBooks.map(book => <option key={book.id} value={book.id}>{book.title} (Acc: {book.accession_no})</option>)}
            </Select>
          </FormField>
          <FormField label={t('library:bookLoans.borrower')} required>
            <EntityPicker
              value={formData.user_id ? asId<'user'>(formData.user_id) : null}
              onChange={(id) => setFormData(prev => ({ ...prev, user_id: id ?? undefined }))}
              lookup={usersLookup}
              label={t('library:bookLoans.borrower')}
              placeholder={t('library:bookLoans.selectUser')}
              disabled={!!editingLoan}
              data-testid="book-loan-borrower-picker"
            />
          </FormField>
          <FormField label={t('library:bookLoans.dueDate')} required>
            <Input 
              name="due_date" 
              type="date"
              value={formData.due_date || ''} 
              onChange={handleInputChange} 
              required 
              disabled={!!editingLoan}
            />
          </FormField>
          {editingLoan && formData.return_date && (
            <FormField label={t('library:bookLoans.returnDate')}>
              <Input 
                name="return_date" 
                type="date"
                value={formData.return_date || ''} 
                disabled 
              />
            </FormField>
          )}
        </FormSection>
        <FormActions>
          {editingLoan ? (
            <Button variant="secondary" onClick={closeModal}>{t('common:close')}</Button>
          ) : (
            <>
              <Button variant="secondary" onClick={closeModal}>{t('common:cancel')}</Button>
              <Button onClick={handleIssueBook} loading={loading.loans}>
                {t('library:bookLoans.issueBook')}
              </Button>
            </>
          )}
        </FormActions>
      </DialogForm>
    </div>
  );
};
const BookLoansPage: React.FC = () => (
  <CanonicalRepositoryProvider>
    <div className="space-y-6">
      <BookLoansPageContent />
    </div>
  </CanonicalRepositoryProvider>
);

export default BookLoansPage;
