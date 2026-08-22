import React, { useState, useMemo } from 'react';

import { Card, DataGrid, Button, Modal, Input, Select, Textarea, Toast, Spinner } from '@/components/ui';

import { useAppData } from '@/hooks/useAppData';
import { StudentStatus, WalletTransactionType } from '@/core/types';
import type { StudentWallet } from '@/core/types';
import { EyeIcon, PlusIcon } from '@/components/ui/icons';

type WalletTransactionFormData = {
    student_id: string;
    transaction_type: WalletTransactionType.DEPOSIT | WalletTransactionType.ADJUSTMENT_DEBIT | WalletTransactionType.ADJUSTMENT_CREDIT; // Admin transaction types
    amount: number;
    description: string;
};

export const StudentWalletPageContent: React.FC = () => {
  const { 
    studentWallets, 
    students,
    walletTransactions,
    loading, 
    addWalletTransaction 
  } = useAppData();
  
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  
  const [selectedStudentForHistory, setSelectedStudentForHistory] = useState<StudentWallet | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  
  const initialTxFormData: WalletTransactionFormData = { 
    student_id: '', 
    transaction_type: WalletTransactionType.DEPOSIT, 
    amount: 0, 
    description: '' 
  };
  const [txFormData, setTxFormData] = useState<WalletTransactionFormData>(initialTxFormData);

  const filteredStudentWallets = useMemo(() => {
    return (studentWallets || []).filter(sw => {
        const student = (students || []).find(s => s.id === sw.student_id);
        return student && [student.first_name, student.last_name, student.admission_no].filter(Boolean).join(' ').toLowerCase().includes(searchTerm.toLowerCase());
    });
  }, [studentWallets, students, searchTerm]);

  const studentTransactionHistory = useMemo(() => {
    if (!selectedStudentForHistory) return [];
    return walletTransactions
        .filter(tx => tx.student_id === selectedStudentForHistory.student_id)
        .sort((a,b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime());
  }, [selectedStudentForHistory, walletTransactions]);

  const openTxModal = () => {
    setTxFormData(initialTxFormData);
    setIsTxModalOpen(true);
  };
  const closeTxModal = () => setIsTxModalOpen(false);

  const openHistoryModal = (studentWallet: StudentWallet) => {
    setSelectedStudentForHistory(studentWallet);
    setIsHistoryModalOpen(true);
  };
  const closeHistoryModal = () => {
    setSelectedStudentForHistory(null);
    setIsHistoryModalOpen(false);
  };

  const handleTxFormInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setTxFormData(prev => ({ ...prev, [name]: name === 'amount' ? parseFloat(value) || 0 : value }));
  };

  const handleTxSubmit = async () => {
    if (!txFormData.student_id || txFormData.amount <= 0 || !txFormData.description) {
      setToast({ message: 'Student, valid Amount, and Description are required.', type: 'error' });
      return;
    }
    
    const validAdminTxTypes: WalletTransactionType[] = [WalletTransactionType.DEPOSIT, WalletTransactionType.ADJUSTMENT_DEBIT, WalletTransactionType.ADJUSTMENT_CREDIT];
    if(!validAdminTxTypes.includes(txFormData.transaction_type as WalletTransactionType)){
        setToast({ message: 'Invalid transaction type for manual entry.', type: 'error' });
        return;
    }
    
    let finalAmount = txFormData.amount;
    if (txFormData.transaction_type === WalletTransactionType.ADJUSTMENT_DEBIT) {
        finalAmount = -Math.abs(txFormData.amount); 
    } else { // DEPOSIT or ADJUSTMENT_CREDIT
        finalAmount = Math.abs(txFormData.amount); 
    }

    const payload: Omit<WalletTransaction, 'id' | 'transaction_date' | 'running_balance' | 'student_name' | 'reference_id' | 'reference_type'> = {
      student_id: txFormData.student_id!,
      transaction_type: txFormData.transaction_type,
      amount: finalAmount,
      description: txFormData.description!,
    };

    try {
      await addWalletTransaction(payload);
      setToast({ message: 'Transaction posted successfully!', type: 'success' });
      closeTxModal();
    } catch (error) {
      setToast({ message: 'Failed to post transaction. Please try again.', type: 'error' });
    }
  };

  const walletColumns = [
    { 
      key: 'student_name', 
      header: 'Student Name', 
      sortable: true,
      searchable: true
    },
    { 
      key: 'admission_no', 
      header: 'Admission No.', 
      render: (item: StudentWallet) => students.find(s => s.id === item.student_id)?.admission_no || 'N/A',
      sortable: true,
      searchable: true
    },
    { 
      key: 'balance', 
      header: 'Wallet Balance (KES)', 
      render: (item: StudentWallet) => item.balance.toFixed(2),
      sortable: true,
      align: 'right' as const
    },
    { 
      key: 'last_updated', 
      header: 'Last Updated', 
      render: (item: StudentWallet) => new Date(item.last_updated).toLocaleString(),
      sortable: true
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (item: StudentWallet) => (
        <Button size="sm" variant="ghost" onClick={() => openHistoryModal(item)} leftIcon={<EyeIcon className="w-4 h-4" />}>
          View History
        </Button>
      ),
      width: 150
    },
  ];

  const historyColumns = [
    { 
      key: 'transaction_date', 
      header: 'Date', 
      render: (item: WalletTransaction) => new Date(item.transaction_date).toLocaleString(),
      sortable: true
    },
    { 
      key: 'transaction_type', 
      header: 'Type', 
      sortable: true
    },
    { 
      key: 'amount', 
      header: 'Amount (KES)', 
      render: (item: WalletTransaction) => item.amount.toFixed(2),
      sortable: true,
      align: 'right' as const
    },
    { 
      key: 'description', 
      header: 'Description',
      searchable: true
    },
    { 
      key: 'running_balance', 
      header: 'Running Balance (KES)', 
      render: (item: WalletTransaction) => item.running_balance.toFixed(2),
      align: 'right' as const
    },
  ];

  if ((loading.studentWallets || loading.students || loading.walletTransactions) && !isTxModalOpen && !isHistoryModalOpen) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner size="lg" /> <span className="ml-2">Loading Student Wallets...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card title="Student Wallet Management" actions={
        <Button onClick={openTxModal} leftIcon={<PlusIcon className="w-5 h-5" />}>
          Manual Transaction
        </Button>
      }>
        <div className="mb-4">
            <Input 
                type="text" 
                placeholder="Search by student name or admission no..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
            />
        </div>
        <DataGrid 
          columns={walletColumns} 
          data={filteredStudentWallets} 
          loading={loading.studentWallets && !isTxModalOpen}
          selectable
          selectedRows={selectedRows}
          onSelectionChange={setSelectedRows}
          searchable
          sortable
          pagination
          pageSize={10}
        />
      </Card>

      {/* Manual Transaction Modal */}
      <Modal isOpen={isTxModalOpen} onClose={closeTxModal} title="Manual Wallet Transaction" size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={closeTxModal}>Cancel</Button>
            <Button onClick={handleTxSubmit} disabled={loading.walletTransactions}>
              {loading.walletTransactions ? <Spinner size="sm"/> : 'Post Transaction'}
            </Button>
          </>
        }
      >
        <Select name="student_id" label="Select Student" value={txFormData.student_id || ''} onChange={handleTxFormInputChange} required>
            <option value="">-- Select Student --</option>
            {students.filter(s => s.status === StudentStatus.ACTIVE).map(s => <option key={s.id} value={s.id}>{s.first_name} {s.last_name} ({s.admission_no})</option>)}
        </Select>
        <Select name="transaction_type" label="Transaction Type" value={txFormData.transaction_type} onChange={handleTxFormInputChange} required>
            <option value={WalletTransactionType.DEPOSIT}>Deposit (Credit Wallet)</option>
            <option value={WalletTransactionType.ADJUSTMENT_DEBIT}>Adjustment (Debit Wallet)</option>
            <option value={WalletTransactionType.ADJUSTMENT_CREDIT}>Adjustment (Credit Wallet)</option>
        </Select>
        <Input name="amount" label="Amount (KES)" type="number" step="0.01" min="0.01" value={txFormData.amount || ''} onChange={handleTxFormInputChange} required />
        <Textarea name="description" label="Description / Reason" value={txFormData.description} onChange={handleTxFormInputChange} rows={3} required />
      </Modal>

      {/* Transaction History Modal */}
      <Modal 
        isOpen={isHistoryModalOpen} 
        onClose={closeHistoryModal} 
        title={`Wallet History for ${selectedStudentForHistory?.student_name || ''}`} 
        size="2xl"
        footer={<Button variant="secondary" onClick={closeHistoryModal}>Close</Button>}
      >
        {selectedStudentForHistory && (
            <div>
                 <div className="mb-4 p-3 bg-indigo-50 rounded-md">
                    Current Balance: <strong className="text-indigo-700">KES {selectedStudentForHistory.balance.toFixed(2)}</strong>
                </div>
                <DataGrid 
                    columns={historyColumns} 
                    data={studentTransactionHistory} 
                    loading={loading.walletTransactions}
                    searchable
                    sortable
                    pagination
                    pageSize={5}
                    emptyStateMessage="No transactions found for this student."
                />
            </div>
        )}
      </Modal>
      
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
};
const StudentWalletPage: React.FC = () => (
  <div className="space-y-6">
    <StudentWalletPageContent />
  </div>
);

export default StudentWalletPage;
