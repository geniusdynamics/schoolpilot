import React, { useState, useMemo } from 'react';

import Card from '@/components/ui/Card';
import { DataGrid, DataGridColumn } from '@/components/ui';
import Button from '@/components/ui/Button';
import DialogForm from '@/components/ui/forms/DialogForm';
import FormSection from '@/components/ui/forms/FormSection';
import FormField from '@/components/ui/forms/FormField';
import FormActions from '@/components/ui/forms/FormActions';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Textarea from '@/components/ui/Textarea';
import { PlusIcon, ArrowsRightLeftIcon } from '@/components/ui/icons';
import { useAppData } from '@/hooks/useAppData'; // Updated
import Spinner from '@/components/ui/Spinner';
import { StockTransactionType } from '@/core/types';

type StockTransactionFormData = Omit<Partial<StockTransaction>, 'id' | 'item_name' | 'warehouse_name' | 'transaction_type' | 'transaction_date'> & {
    transaction_date?: string; // For form input
};

export const StockIssuancePageContent: React.FC = () => {
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
      alert(t('validation.itemWarehouseValidQuantityAndTransactionDateAreRequired'));
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

  const columns: DataGridColumn<StockTransaction>[] = [
    { 
      key: 'id', 
      header: 'Transaction ID', 
      sortable: true,
      filterable: true,
      width: '140px'
    },
    { 
      key: 'item_name', 
      header: 'Item Name', 
      sortable: true,
      filterable: true,
      width: '200px'
    },
    { 
      key: 'warehouse_name', 
      header: 'Warehouse', 
      sortable: true,
      filterable: true,
      width: '150px'
    },
    { 
      key: 'quantity', 
      header: 'Quantity Issued', 
      sortable: true,
      width: '140px'
    },
    { 
      key: 'transaction_date', 
      header: 'Date', 
      render: (value: any, item: StockTransaction) => item.transaction_date ? new Date(item.transaction_date).toLocaleDateString() : 'N/A',
      sortable: true,
      filterable: true,
      width: '120px'
    },
    { 
      key: 'notes', 
      header: 'Notes', 
      sortable: true,
      filterable: true,
      width: '200px'
    },
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
        <DataGrid 
          columns={columns} 
          data={issueTransactions} 
          sortable
          filterable
          emptyState={{
            icon: <ArrowsRightLeftIcon className="w-8 h-8 text-gray-400" />,
            title: "No stock issuance records found",
            description: "Start by issuing your first stock item."
          }}
        />
      </Card>

      <DialogForm open={isModalOpen} onClose={closeModal} title="Issue Stock Item" size="lg"
        actions={
          <FormActions>
            <Button variant="secondary" onClick={closeModal}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={loading.stockTransactions}>
              {loading.stockTransactions ? <Spinner size="sm"/> : 'Issue Item'}
            </Button>
          </FormActions>
        }
      >
        <FormSection>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Item to Issue">
              <Select name="item_id" value={formData.item_id || ''} onChange={handleInputChange} required>
                <option value="">Select Item</option>
                {itemsInv.map(item => <option key={item.id} value={item.id}>{item.name} ({item.unit_of_measure})</option>)}
              </Select>
            </FormField>
            <FormField label="Issue From Warehouse">
              <Select name="warehouse_id" value={formData.warehouse_id || ''} onChange={handleInputChange} required>
                <option value="">Select Warehouse</option>
                {warehouses.map(wh => <option key={wh.id} value={wh.id}>{wh.name}</option>)}
              </Select>
            </FormField>
            <FormField label="Quantity to Issue">
              <Input name="quantity" type="number" min="1" value={formData.quantity || ''} onChange={handleInputChange} required />
            </FormField>
            <FormField label="Issuance Date">
              <Input name="transaction_date" type="date" value={formData.transaction_date || ''} onChange={handleInputChange} required />
            </FormField>
          </div>
          <FormField label="Notes (e.g., Issued to, Requisition No.)">
            <Textarea name="notes" value={formData.notes || ''} onChange={handleInputChange} rows={3} />
          </FormField>
        </FormSection>
      </DialogForm>
    </div>
  );
};
const StockIssuancePage: React.FC = () => (
  <div className="space-y-6">
    <StockIssuancePageContent />
  </div>
);

export default StockIssuancePage;
