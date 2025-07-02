import React, { useState, useMemo } from 'react';
import { Loan, Book, User, BookStatus } from '../../types';
import Card from '../../components/ui/Card';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Select from '../../components/ui/Select';
import Input from '../../components/ui/Input';
import { PlusIcon } from '../../components/ui/icons';
import { useAppData } from '@/contexts/AppDataContext';
import Spinner from '../../components/ui/Spinner';
import { useTranslation } from 'react-i18next';
import { useLoanData } from '../../modules/library/data/useLoanData';

type LoanFormData = Omit<Partial<Loan>, 'id' | 'created_at' | 'updated_at' | 'book_title' | 'user_name' | 'loan_date'> & {
    userType?: string;
};

const BookLoansPage: React.FC = () => {
  const { t } = useTranslation(['library', 'common']);
  const { books, users, loading } = useAppData();
  const { data: loans, create: addLoan, update: updateLoan } = useLoanData();

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
  const borrowers = useMemo(() => users.filter(u => u.isActive && (u.userType === 'Student' || u.userType === 'Staff')), [users]);

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
    const payload: Omit<Loan, 'id' | 'created_at' | 'updated_at' | 'book_title' | 'user_name'> = {
      book_id: formData.book_id!,
      user_id: formData.user_id!,
      loan_date: new Date().toISOString().split('T')[0],
      due_date: formData.due_date!,
      return_date: undefined,
    };
    addLoan(payload);
    closeModal();
  };

  const handleMarkAsReturned = async (loanId: string) => {
    const loanToReturn = loans.find(l => l.id === loanId);
    if (loanToReturn) {
      if (window.confirm(t('library:bookLoans.confirmMarkReturned', { bookTitle: loanToReturn.book_title }))) {
        updateLoan(loanId, { ...loanToReturn, return_date: new Date().toISOString().split('T')[0] });
      }
    }
  };

  const columns = [
    { header: t('library:bookLoans.loanId'), accessor: 'id' as keyof Loan },
    { header: t('library:bookLoans.bookTitle'), accessor: 'book_title' as keyof Loan },
    { header: t('library:bookLoans.userName'), accessor: 'user_name' as keyof Loan },
    { header: t('library:bookLoans.loanDate'), accessor: 'loan_date' as keyof Loan, render: (item: Loan) => new Date(item.loan_date).toLocaleDateString() },
    { header: t('library:bookLoans.dueDate'), accessor: 'due_date' as keyof Loan, render: (item: Loan) => new Date(item.due_date).toLocaleDateString() },
    { header: t('library:bookLoans.returnDate'), accessor: 'return_date' as keyof Loan, render: (item: Loan) => item.return_date ? new Date(item.return_date).toLocaleDateString() : t('library:bookLoans.notReturned') },
    {
      header: t('common:actions'),
      accessor: 'id' as keyof Loan,
      render: (item: Loan) => (
        !item.return_date ? (
          <Button size="sm" variant="secondary" onClick={() => handleMarkAsReturned(item.id)}>{t('library:bookLoans.markReturned')}</Button>
        ) : <span className="text-xs text-green-600 font-semibold">{t('library:bookLoans.returned')}</span>
      ),
    },
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
        <p className="text-sm text-gray-600 mb-4">
          {t('library:bookLoans.description')}
        </p>
        <Table columns={columns} data={loans} isLoading={loading.loans && isModalOpen} />
      </Card>
      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingLoan ? t('library:bookLoans.viewLoanDetails') : t('library:bookLoans.issueNewBookLoan')} size="lg"
        footer={ editingLoan ? <Button variant="secondary" onClick={closeModal}>{t('common:close')}</Button> :
          <>
            <Button variant="secondary" onClick={closeModal}>{t('common:cancel')}</Button>
            <Button onClick={handleIssueBook} disabled={loading.loans}>
              {loading.loans ? <Spinner size="sm"/> : t('library:bookLoans.issueBook')}
            </Button>
          </>
        }
      >
        <Select 
          name="book_id" 
          label={t('library:bookLoans.bookToLoan')} 
          value={formData.book_id || ''} 
          onChange={handleInputChange}
          required
          disabled={!!editingLoan}
        >
          <option value="">{t('library:bookLoans.selectBook')}</option>
          {availableBooks.map(book => <option key={book.id} value={book.id}>{book.title} (Acc: {book.accession_no})</option>)}
        </Select>
        <Select 
          name="user_id" 
          label={t('library:bookLoans.borrower')} 
          value={formData.user_id || ''} 
          onChange={handleInputChange}
          required
          disabled={!!editingLoan}
        >
          <option value="">{t('library:bookLoans.selectUser')}</option>
          {borrowers.map(user => <option key={user.id} value={user.id}>{user.display_name} ({user.userType})</option>)}
        </Select>
        <Input 
          name="due_date" 
          label={t('library:bookLoans.dueDate')} 
          type="date"
          value={formData.due_date || ''} 
          onChange={handleInputChange} 
          required 
          disabled={!!editingLoan}
        />
        {editingLoan && formData.return_date && (
             <Input 
                name="return_date" 
                label={t('library:bookLoans.returnDate')} 
                type="date"
                value={formData.return_date || ''} 
                disabled 
            />
        )}
      </Modal>
    </div>
  );
};

export default BookLoansPage;
