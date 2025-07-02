import React, { useState, useMemo } from 'react';
import { Loan, Book, User, BookStatus } from '../../types';
import Card from '../../components/ui/Card';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Select from '../../components/ui/Select';
import Input from '../../components/ui/Input';
import { PlusIcon, EditIcon, DeleteIcon, ArrowsRightLeftIcon } from '../../components/ui/icons';
import { useAppData } from '@/contexts/AppDataContext'; // Updated
import Spinner from '../../components/ui/Spinner';

type LoanFormData = Omit<Partial<Loan>, 'id' | 'created_at' | 'updated_at' | 'book_title' | 'user_name' | 'loan_date' | 'user_type'> & {
    user_type?: 'Staff' | 'Student' | 'Parent' | ...; // for selection
};

const BookLoansPage: React.FC = () => {
  const { 
    loans, 
    books, 
    users, // users from core.users table
    loading, 
    addLoan, 
    updateLoan, 
    // deleteLoan is not a primary action, typically loans are returned or marked lost.
  } = useAppData(); // Updated
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLoan, setEditingLoan] = useState<Loan | null>(null); // For marking returned mainly
  
  const initialFormData: LoanFormData = { 
    book_id: undefined, 
    user_id: undefined, 
    due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Default 2 weeks
    user_type: undefined
  };
  const [formData, setFormData] = useState<LoanFormData>(initialFormData);

  const availableBooks = useMemo(() => books.filter(b => b.status === BookStatus.AVAILABLE), [books]);
  const borrowers = useMemo(() => users.filter(u => u.isActive && (u.userType === 'Student' || u.userType === 'Staff')), [users]);


  const openModal = (loan?: Loan) => {
    setEditingLoan(loan || null);
    // For new loans, set default due date. If editing, load existing.
    // Edit modal might be different (e.g. only for extending due date or marking returned)
    setFormData(loan ? 
      { 
        book_id: loan.book_id, 
        user_id: loan.user_id, 
        user_type: loan.user_type,
        due_date: loan.due_date,
        return_date: loan.return_date,
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
    let processedValue: string | number | undefined | 'Staff' | 'Student' | 'Parent' | ... = value;
    if (name === 'book_id' || name === 'user_id') {
        processedValue = value || undefined;
    } else if (name === 'user_type') {
        processedValue = value as 'Staff' | 'Student' | 'Parent' | ... || undefined;
    }
    setFormData(prev => ({ ...prev, [name]: processedValue }));
  };

  const handleIssueBook = async () => {
    if (!formData.book_id || !formData.user_id || !formData.due_date) {
      alert("Book, User, and Due Date are required to issue a loan.");
      return;
    }
    const selectedUser = users.find(u => u.id === formData.user_id);
    if (!selectedUser) {
        alert("Selected user not found.");
        return;
    }

    const payload: Omit<Loan, 'id' | 'created_at' | 'updated_at' | 'book_title' | 'user_name'> = {
      book_id: formData.book_id!,
      user_id: formData.user_id!,
      user_type: selectedUser.user_type, // Get user_type from selected user
      loan_date: new Date().toISOString().split('T')[0], // Today's date
      due_date: formData.due_date!,
      return_date: undefined, // Not returned yet
    };

    await addLoan(payload);
    closeModal();
  };

  const handleMarkAsReturned = async (loanId: string) => {
    const loanToReturn = loans.find(l => l.id === loanId);
    if (loanToReturn) {
      if (window.confirm(`Mark book "${loanToReturn.book_title}" as returned?`)) {
        await updateLoan({ ...loanToReturn, return_date: new Date().toISOString().split('T')[0] });
      }
    }
  };

  const columns = [
    { header: 'Loan ID', accessor: 'id' as keyof Loan },
    { header: 'Book Title', accessor: 'book_title' as keyof Loan },
    { header: 'User Name', accessor: 'user_name' as keyof Loan },
    { header: 'User Type', accessor: 'user_type' as keyof Loan },
    { header: 'Loan Date', accessor: 'loan_date' as keyof Loan, render: (item: Loan) => new Date(item.loan_date).toLocaleDateString() },
    { header: 'Due Date', accessor: 'due_date' as keyof Loan, render: (item: Loan) => new Date(item.due_date).toLocaleDateString() },
    { header: 'Return Date', accessor: 'return_date' as keyof Loan, render: (item: Loan) => item.return_date ? new Date(item.return_date).toLocaleDateString() : 'Not Returned' },
    {
      header: 'Actions',
      accessor: 'id' as keyof Loan,
      render: (item: Loan) => (
        !item.return_date ? (
          <Button size="sm" variant="secondary" onClick={() => handleMarkAsReturned(item.id)}>Mark Returned</Button>
        ) : <span className="text-xs text-green-600 font-semibold">Returned</span>
      ),
    },
  ];

  if ((loading.loans || loading.books || loading.users) && !isModalOpen) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner size="lg" /> <span className="ml-2">Loading Book Loans...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card title="Book Loans Management" actions={
        <Button onClick={() => openModal()} leftIcon={<PlusIcon className="w-5 h-5" />}>
          Issue New Loan
        </Button>
      }>
        <p className="text-sm text-gray-600 mb-4">
          Issue books to users and manage returns. Overdue books may automatically generate fines.
        </p>
        <Table columns={columns} data={loans} isLoading={loading.loans && isModalOpen} />
      </Card>

      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingLoan ? 'View Loan Details' : 'Issue New Book Loan'} size="lg"
        footer={ editingLoan ? <Button variant="secondary" onClick={closeModal}>Close</Button> :
          <>
            <Button variant="secondary" onClick={closeModal}>Cancel</Button>
            <Button onClick={handleIssueBook} disabled={loading.loans}>
              {loading.loans ? <Spinner size="sm"/> : 'Issue Book'}
            </Button>
          </>
        }
      >
        <Select 
          name="book_id" 
          label="Book to Loan" 
          value={formData.book_id || ''} 
          onChange={handleInputChange}
          required
          disabled={!!editingLoan}
        >
          <option value="">Select Book</option>
          {availableBooks.map(book => <option key={book.id} value={book.id}>{book.title} (Acc: {book.accession_no})</option>)}
        </Select>
        <Select 
          name="user_id" 
          label="Borrower (Student/Staff)" 
          value={formData.user_id || ''} 
          onChange={handleInputChange}
          required
          disabled={!!editingLoan}
        >
          <option value="">Select User</option>
          {borrowers.map(user => <option key={user.id} value={user.id}>{user.displayName} ({user.userType})</option>)}
        </Select>
        <Input 
          name="due_date" 
          label="Due Date" 
          type="date"
          value={formData.due_date || ''} 
          onChange={handleInputChange} 
          required 
          disabled={!!editingLoan}
        />
        {editingLoan && formData.return_date && (
             <Input 
                name="return_date" 
                label="Return Date" 
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
