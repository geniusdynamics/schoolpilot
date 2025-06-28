
import React, { useState, useMemo } from 'react';
import { StockTransaction, StockTransactionType, ItemInv, Warehouse } from '../../types';
import Card from '../../components/ui/Card';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Textarea from '../../components/ui/Textarea';
import { PlusIcon, ArrowsRightLeftIcon } from '../../components/ui/icons';
import { useAppData } from '@/contexts/AppDataContext'; // Updated
import Spinner from '../../components/ui/Spinner';

type StockTransactionFormData = Omit<Partial<StockTransaction>, 'id' | 'item_name' | 'warehouse_name' | 'transaction_type' | 'transaction_date'> & {
    transaction_date?: string; // For form input
};

const StockIssuancePage: React.FC = () => {
  const { 
    stockTransactions, 
    itemsInv,
    warehouses,
    loading, 
    addStockTransaction 
  } = useAppData(); // Updated
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  // No editing for stock transactions in this simplified version, only adding new 'Issue'
  const initialFormData: StockTransactionFormData = { 
    item_id: undefined, 
    warehouse_id: undefined, 
    quantity: 1, 
    notes: '', 
    transaction_date: new Date().toISOString().split('T')[0]
  };
  const [formData, setFormData] = useState<StockTransactionFormData>(initialFormData);

  const issueTransactions = useMemo(() => 
    stockTransactions.filter(st => st.transaction_type === StockTransactionType.ISSUE),
    [stockTransactions]
  );

  const openModal = () => {
    setFormData(initialFormData);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    let processedValue: string | number | undefined = value;
     if (name === 'item_id' || name === 'warehouse_id') {
        processedValue = value ? (name === 'item_id' ? value : parseInt(value)) : undefined;
    } else if (name === 'quantity') {
        processedValue = parseInt(value) || 0;
    }
    setFormData(prev => ({ ...prev, [name]: processedValue }));
  };

  const handleSubmit = async () => {
    if (!formData.item_id || !formData.warehouse_id || formData.quantity <= 0 || !formData.transaction_date) {
      alert("Item, Warehouse, valid Quantity, and Transaction Date are required.");
      return;
    }
    const payload: Omit<StockTransaction, 'id' | 'item_name' | 'warehouse_name'> = {
      item_id: formData.item_id!,
      warehouse_id: Number(formData.warehouse_id!),
      transaction_type: StockTransactionType.ISSUE,
      quantity: Number(formData.quantity),
      transaction_date: formData.transaction_date,
      notes: formData.notes || undefined,
      // source_table and source_id could be added for linking to requisitions
    };

    await addStockTransaction(payload);
    closeModal();
  };

  const columns = [
    { header: 'Transaction ID', accessor: 'id' as keyof StockTransaction },
    { header: 'Item Name', accessor: 'item_name' as keyof StockTransaction },
    { header: 'Warehouse', accessor: 'warehouse_name' as keyof StockTransaction },
    { header: 'Quantity Issued', accessor: 'quantity' as keyof StockTransaction },
    { header: 'Date', accessor: 'transaction_date' as keyof StockTransaction, render: (item: StockTransaction) => item.transaction_date ? new Date(item.transaction_date).toLocaleDateString() : 'N/A' },
    { header: 'Notes', accessor: 'notes' as keyof StockTransaction },
  ];

  if ((loading.stockTransactions || loading.itemsInv || loading.warehouses) && !isModalOpen) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner size="lg" /> <span className="ml-2">Loading Stock Issuance Data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card title="Stock Issuance" actions={
        <Button onClick={openModal} leftIcon={<PlusIcon className="w-5 h-5" />}>
          Issue Stock
        </Button>
      }>
        <p className="text-sm text-gray-600 mb-4">
          Record items issued from stores. This will update stock levels.
        </p>
        <Table columns={columns} data={issueTransactions} isLoading={loading.stockTransactions && isModalOpen} emptyStateMessage="No stock issuance records found."/>
      </Card>

      <Modal isOpen={isModalOpen} onClose={closeModal} title="Issue Stock Item" size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={closeModal}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={loading.stockTransactions}>
              {loading.stockTransactions ? <Spinner size="sm"/> : 'Issue Item'}
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select name="item_id" label="Item to Issue" value={formData.item_id || ''} onChange={handleInputChange} required>
                <option value="">Select Item</option>
                {itemsInv.map(item => <option key={item.id} value={item.id}>{item.name} ({item.unit_of_measure})</option>)}
            </Select>
            <Select name="warehouse_id" label="Issue From Warehouse" value={formData.warehouse_id || ''} onChange={handleInputChange} required>
                <option value="">Select Warehouse</option>
                {warehouses.map(wh => <option key={wh.id} value={wh.id}>{wh.name}</option>)}
            </Select>
            <Input name="quantity" label="Quantity to Issue" type="number" min="1" value={formData.quantity || ''} onChange={handleInputChange} required />
            <Input name="transaction_date" label="Issuance Date" type="date" value={formData.transaction_date || ''} onChange={handleInputChange} required />
             <Textarea name="notes" label="Notes (e.g., Issued to, Requisition No.)" value={formData.notes || ''} onChange={handleInputChange} rows={3} containerClassName="md:col-span-2" />
        </div>
      </Modal>
    </div>
  );
};

export default StockIssuancePage;
