import React, { useState, useMemo, useEffect } from 'react';
import { StudentWallet, WalletTransaction, Student, WalletTransactionType, StudentStatus } from '@/types';
import Card from '@/components/ui/Card';
import Table from '@/components/ui/Table';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Textarea from '@/components/ui/Textarea';
import { PlusIcon, EyeIcon, CreditCardIcon } from '@/components/ui/icons';
import { useAppData } from '@/contexts/AppDataContext';
import Spinner from '@/components/ui/Spinner';
import { useTranslation } from 'react-i18next';

type WalletTransactionFormData = {
    student_id: string;
    transaction_type: WalletTransactionType.DEPOSIT | WalletTransactionType.ADJUSTMENT_DEBIT | WalletTransactionType.ADJUSTMENT_CREDIT; // Admin transaction types
    amount: number;
    description: string;
};

const StudentWalletPage: React.FC = () => {
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
  
  const initialTxFormData: WalletTransactionFormData = { 
    student_id: '', 
    transaction_type: WalletTransactionType.DEPOSIT, 
    amount: 0, 
    description: '' 
  };
  const [txFormData, setTxFormData] = useState<WalletTransactionFormData>(initialTxFormData);

  const filteredStudentWallets = useMemo(() => {
    return studentWallets.filter(sw => {
        const student = students.find(s => s.id === sw.student_id);
        return student && `${student.first_name} ${student.last_name} ${student.admission_no}`.toLowerCase().includes(searchTerm.toLowerCase());
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
      alert("Student, valid Amount, and Description are required.");
      return;
    }
    
    const validAdminTxTypes: WalletTransactionType[] = [WalletTransactionType.DEPOSIT, WalletTransactionType.ADJUSTMENT_DEBIT, WalletTransactionType.ADJUSTMENT_CREDIT];
    if(!validAdminTxTypes.includes(txFormData.transaction_type as WalletTransactionType)){
        alert("Invalid transaction type for manual entry.");
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

    await addWalletTransaction(payload);
    closeTxModal();
  };

  const walletColumns = [
    { header: 'Student Name', accessor: 'student_name' as keyof StudentWallet },
    { header: 'Admission No.', accessor: (item: StudentWallet) => students.find(s => s.id === item.student_id)?.admission_no || 'N/A' },
    { header: 'Wallet Balance (KES)', accessor: 'balance' as keyof StudentWallet, render: (item: StudentWallet) => item.balance.toFixed(2) },
    { header: 'Last Updated', accessor: 'last_updated' as keyof StudentWallet, render: (item: StudentWallet) => new Date(item.last_updated).toLocaleString() },
    {
      header: 'Actions',
      accessor: 'student_id' as keyof StudentWallet,
      render: (item: StudentWallet) => (
        <Button size="sm" variant="ghost" onClick={() => openHistoryModal(item)} leftIcon={<EyeIcon className="w-4 h-4" />}>
          View History
        </Button>
      ),
    },
  ];

  const historyColumns = [
    { header: 'Date', accessor: 'transaction_date' as keyof WalletTransaction, render: (item: WalletTransaction) => new Date(item.transaction_date).toLocaleString() },
    { header: 'Type', accessor: 'transaction_type' as keyof WalletTransaction },
    { header: 'Amount (KES)', accessor: 'amount' as keyof WalletTransaction, render: (item:WalletTransaction) => item.amount.toFixed(2)},
    { header: 'Description', accessor: 'description' as keyof WalletTransaction },
    { header: 'Running Balance (KES)', accessor: 'running_balance' as keyof WalletTransaction, render: (item:WalletTransaction) => item.running_balance.toFixed(2) },
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
        <Table columns={walletColumns} data={filteredStudentWallets} isLoading={loading.studentWallets && !isTxModalOpen} />
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
                <Table 
                    columns={historyColumns} 
                    data={studentTransactionHistory} 
                    isLoading={loading.walletTransactions}
                    emptyStateMessage="No transactions found for this student."
                />
            </div>
        )}
      </Modal>
    </div>
  );
};

export default StudentWalletPage;
