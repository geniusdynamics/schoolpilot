import React, { useState, useMemo } from 'react';

import { Card, DataGrid, Button, Modal, Input, Select, Textarea, Toast } from '@/components/ui';

import { EntityPicker } from '@/components/ui/EntityPicker';
import { asId } from '@/domain/ids';
import { CanonicalRepositoryProvider } from '../data/canonicalRepository';
import { useCanonicalLearners } from '../data/useCanonicalLearners';
import { useDatabaseCollection } from '@/hooks/useDatabaseCollection';
import { useNutrition } from '../hooks/useNutrition';
import { WalletTransactionType } from '@/core/types';
import type { WalletTransaction } from '@/core/types';
// The library module's StudentWallet type has no id, while the stored wallet rows
// carry id, last_updated and student_name. Local view shape bridges the two until
// the wallet types are unified. Ids are opaque strings (SO-22).
interface WalletRow {
  id: string;
  student_id: string;
  balance: number;
  last_updated: string;
  student_name?: string | null;
  status?: string;
}
import { EyeIcon, PlusIcon } from '@/components/ui/icons';

// Manual (admin) transaction kinds and how each one is stored.
type ManualTransactionKind = 'deposit' | 'adjustment_debit' | 'adjustment_credit';
const MANUAL_TRANSACTION_TYPES: Record<ManualTransactionKind, WalletTransactionType> = {
    deposit: WalletTransactionType.CREDIT,
    adjustment_debit: WalletTransactionType.DEBIT,
    adjustment_credit: WalletTransactionType.ADJUSTMENT,
};

type WalletTransactionFormData = {
    student_id: string;
    transaction_type: ManualTransactionKind;
    amount: number;
    description: string;
};

export const StudentWalletPageContent: React.FC = () => {
  // The learner a wallet belongs to is canonical; the wallet and its transactions are not modelled yet.
  // GAP(P1-E05): the canonical registry models no student wallet and no wallet transaction,
  // so the wallet keeps reading the legacy collections.
  const { learners, learnersLookup } = useCanonicalLearners();
  const { studentWallets, addWalletTransaction } = useNutrition();
  const transactionsCollection = useDatabaseCollection<WalletTransaction>('wallet_transactions');
  const walletTransactions = transactionsCollection.data;
  const [posting, setPosting] = useState(false);
  
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  
  const [selectedStudentForHistory, setSelectedStudentForHistory] = useState<WalletRow | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [, setSelectedRows] = useState<string[]>([]);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  
  const initialTxFormData: WalletTransactionFormData = { 
    student_id: '', 
    transaction_type: 'deposit', 
    amount: 0, 
    description: '' 
  };
  const [txFormData, setTxFormData] = useState<WalletTransactionFormData>(initialTxFormData);

  const filteredStudentWallets = useMemo(() => {
    return ((studentWallets as unknown as WalletRow[]) || []).filter(sw => {
        const student = (learners || []).find(s => s.id === String(sw.student_id));
        return student && [student.first_name, student.last_name, student.admission_no].filter(Boolean).join(' ').toLowerCase().includes(searchTerm.toLowerCase());
    });
  }, [studentWallets, learners, searchTerm]);

  const studentTransactionHistory = useMemo(() => {
    if (!selectedStudentForHistory) return [];
    return walletTransactions
        .filter(tx => String(tx.student_id) === String(selectedStudentForHistory.student_id))
        .sort((a,b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime());
  }, [selectedStudentForHistory, walletTransactions]);

  const openTxModal = () => {
    setTxFormData(initialTxFormData);
    setIsTxModalOpen(true);
  };
  const closeTxModal = () => setIsTxModalOpen(false);

  const openHistoryModal = (studentWallet: WalletRow) => {
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
    
    if (!(txFormData.transaction_type in MANUAL_TRANSACTION_TYPES)) {
        setToast({ message: 'Invalid transaction type for manual entry.', type: 'error' });
        return;
    }
    
    let finalAmount = txFormData.amount;
    if (txFormData.transaction_type === 'adjustment_debit') {
        finalAmount = -Math.abs(txFormData.amount); 
    } else { // DEPOSIT or ADJUSTMENT_CREDIT
        finalAmount = Math.abs(txFormData.amount); 
    }

    // The signed amount drives the balance; pass the running balance so the hook does not
    // have to infer the direction from the stored transaction type.
    const currentWallet = ((studentWallets as unknown as WalletRow[]) || []).find(sw => String(sw.student_id) === txFormData.student_id);
    const student = learners.find(s => s.id === txFormData.student_id);
    const payload = {
      student_id: txFormData.student_id,
      transaction_type: MANUAL_TRANSACTION_TYPES[txFormData.transaction_type],
      amount: finalAmount,
      description: txFormData.description,
      transaction_date: new Date().toISOString(),
      running_balance: (currentWallet?.balance || 0) + finalAmount,
      student_name: student ? [student.first_name, student.last_name].filter(Boolean).join(' ') : undefined,
    };

    setPosting(true);
    try {
      await addWalletTransaction(payload);
      await transactionsCollection.refresh();
      setToast({ message: 'Transaction posted successfully!', type: 'success' });
      closeTxModal();
    } catch {
      setToast({ message: 'Failed to post transaction. Please try again.', type: 'error' });
    } finally {
      setPosting(false);
    }
  };

  const walletColumns = [
    {
      key: 'student_name',
      header: 'Student Name',
      sortable: true
    },
    {
      key: 'admission_no',
      header: 'Admission No.',
      render: (_v: any, item: WalletRow) => learners.find(s => s.id === String(item.student_id))?.admission_no || 'N/A',
      sortable: true
    },
    {
      key: 'balance',
      header: 'Wallet Balance (KES)',
      render: (_v: any, item: WalletRow) => item.balance.toFixed(2),
      sortable: true,
      align: 'right' as const
    },
    {
      key: 'last_updated',
      header: 'Last Updated',
      render: (_v: any, item: WalletRow) => new Date(item.last_updated).toLocaleString(),
      sortable: true
    },
    {
      key: 'actions',
      header: 'Actions',
      sortable: false,
      filterable: false,
      render: (_v: any, item: WalletRow) => (
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
      render: (_v: any, item: WalletTransaction) => new Date(item.transaction_date).toLocaleString(),
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
      render: (_v: any, item: WalletTransaction) => item.amount.toFixed(2),
      sortable: true,
      align: 'right' as const
    },
    {
      key: 'description',
      header: 'Description'
    },
    { 
      key: 'running_balance', 
      header: 'Running Balance (KES)', 
      render: (_v: any, item: WalletTransaction) => item.running_balance.toFixed(2),
      align: 'right' as const
    },
  ];

  return (
    <div className="space-y-3">
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
          keyField="student_id"
          selectable
          onSelectionChange={(rows) => setSelectedRows(rows.map(r => String(r.id)))}
          sortable
          pagination={{ pageSize: 10 }}
        />
      </Card>

      {/* Manual Transaction Modal */}
      <Modal isOpen={isTxModalOpen} onClose={closeTxModal} title="Manual Wallet Transaction" size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={closeTxModal}>Cancel</Button>
            <Button onClick={handleTxSubmit} loading={posting}>
              {'Post Transaction'}
            </Button>
          </>
        }
      >
        <EntityPicker
          value={txFormData.student_id ? asId<'learner'>(txFormData.student_id) : null}
          onChange={(id) => setTxFormData(prev => ({ ...prev, student_id: id ?? '' }))}
          lookup={learnersLookup}
          label="Select Student"
          placeholder="-- Select Student --"
          data-testid="wallet-student-picker"
        />
        <Select name="transaction_type" label="Transaction Type" value={txFormData.transaction_type} onChange={handleTxFormInputChange} required>
            <option value="deposit">Deposit (Credit Wallet)</option>
            <option value="adjustment_debit">Adjustment (Debit Wallet)</option>
            <option value="adjustment_credit">Adjustment (Credit Wallet)</option>
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
                    loading={transactionsCollection.loading}
                    sortable
                    pagination={{ pageSize: 5 }}
                    emptyState="No transactions found for this student."
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
  <CanonicalRepositoryProvider>
    <div className="space-y-3">
      <StudentWalletPageContent />
    </div>
  </CanonicalRepositoryProvider>
);

export default StudentWalletPage;
