import React, { useState, useEffect } from 'react';
import {
  PlusIcon,
  TrashIcon,
  ArrowUturnLeftIcon,
} from '@heroicons/react/24/outline';
import { useItemData, useWarehouseData, useStockTransactionData, useStockLevelData, StockTransactionType } from '../data';
import { Card, Input, Select, Button, Alert, Badge } from '@/components/ui';
import { DialogForm } from '@/components/ui/forms';

interface StockReturnItem {
  id: string;
  item_id: string;
  item_name: string;
  quantity: number;
  batch_number?: string;
  expiry_date?: string;
  warehouse_id: number;
  warehouse_name: string;
  return_reason: string;
  condition: 'GOOD' | 'DAMAGED' | 'EXPIRED' | 'DEFECTIVE';
  notes?: string;
}

interface StockReturnForm {
  return_date: string;
  reference_number?: string;
  return_type: 'RETURN_TO_STORE' | 'RETURN_TO_SUPPLIER';
  supplier_reference?: string;
  notes?: string;
  items: StockReturnItem[];
}

const RETURN_REASONS = [
  'Overstocked',
  'Damaged in transit',
  'Wrong item received',
  'Quality issues',
  'Expired product',
  'Customer return',
  'Defective product',
  'Other'
];

export const StockReturnsPageContent: React.FC = () => {
  const [returns, setReturns] = useState<any[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingReturn, setEditingReturn] = useState<StockReturnForm | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Data hooks — the hooks expose { data, create, update, remove }
  const { data: items } = useItemData();
  const { data: warehouses } = useWarehouseData();
  const { data: stockTransactions, create: createStockTransaction } = useStockTransactionData();
  const { data: stockLevels, create: createStockLevel, update: updateStockLevel } = useStockLevelData();

  // Derive returns from return transactions whenever the data changes
  useEffect(() => {
    try {
      setLoading(true);
      const returnTransactions = (stockTransactions || []).filter(
        t => String(t.transaction_type) === StockTransactionType.RETURN_TO_STORE ||
             String(t.transaction_type) === StockTransactionType.RETURN_TO_SUPPLIER
      );
      setReturns(groupTransactionsByReturn(returnTransactions));
    } catch (err) {
      setError('Failed to load stock returns');
    } finally {
      setLoading(false);
    }
  }, [stockTransactions]);

  const groupTransactionsByReturn = (transactions: any[]) => {
    const grouped = transactions.reduce((acc, transaction) => {
      const key = transaction.source_id || transaction.transaction_date;
      if (!acc[key]) {
        acc[key] = {
          id: key,
          return_date: transaction.transaction_date,
          reference_number: transaction.source_id,
          return_type: transaction.transaction_type,
          items: [],
          total_quantity: 0
        };
      }
      acc[key].items.push(transaction);
      acc[key].total_quantity += Math.abs(transaction.quantity);
      return acc;
    }, {});
    return Object.values(grouped);
  };

  const handleOpenDialog = (returnRecord?: any) => {
    if (returnRecord) {
      setEditingReturn({
        return_date: returnRecord.return_date,
        reference_number: returnRecord.reference_number,
        return_type: returnRecord.return_type,
        supplier_reference: '',
        notes: '',
        items: returnRecord.items.map((item: any) => ({
          id: item.id,
          item_id: item.item_id,
          item_name: item.item_name,
          quantity: Math.abs(item.quantity),
          batch_number: item.batch_number,
          expiry_date: item.expiry_date,
          warehouse_id: item.warehouse_id,
          warehouse_name: item.warehouse_name,
          return_reason: 'Other',
          condition: 'GOOD' as const,
          notes: item.notes
        }))
      });
    } else {
      setEditingReturn({
        return_date: new Date().toISOString().split('T')[0],
        reference_number: `RET-${Date.now()}`,
        return_type: 'RETURN_TO_STORE',
        supplier_reference: '',
        notes: '',
        items: []
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingReturn(null);
    setError(null);
    setSuccess(null);
  };

  const handleAddItem = () => {
    if (!editingReturn) return;

    const newItem: StockReturnItem = {
      id: `temp-${Date.now()}`,
      item_id: '',
      item_name: '',
      quantity: 0,
      batch_number: '',
      expiry_date: '',
      warehouse_id: 0,
      warehouse_name: '',
      return_reason: '',
      condition: 'GOOD',
      notes: ''
    };

    setEditingReturn({
      ...editingReturn,
      items: [...editingReturn.items, newItem]
    });
  };

  const handleRemoveItem = (index: number) => {
    if (!editingReturn) return;

    const updatedItems = editingReturn.items.filter((_, i) => i !== index);
    setEditingReturn({
      ...editingReturn,
      items: updatedItems
    });
  };

  const handleItemChange = (index: number, field: keyof StockReturnItem, value: any) => {
    if (!editingReturn) return;

    const updatedItems = [...editingReturn.items];
    updatedItems[index] = { ...updatedItems[index], [field]: value };

    // Auto-populate item name when item is selected
    if (field === 'item_id') {
      const selectedItem = items.find(item => String(item.id) === String(value));
      if (selectedItem) {
        updatedItems[index].item_name = selectedItem.name;
      }
    }

    // Auto-populate warehouse name when warehouse is selected
    if (field === 'warehouse_id') {
      const selectedWarehouse = warehouses.find(wh => String(wh.id) === String(value));
      if (selectedWarehouse) {
        updatedItems[index].warehouse_name = selectedWarehouse.name;
      }
    }

    setEditingReturn({
      ...editingReturn,
      items: updatedItems
    });
  };

  const handleSaveReturn = async () => {
    if (!editingReturn) return;

    try {
      setLoading(true);
      setError(null);

      // Validate form
      if (editingReturn.items.length === 0) {
        setError('Please add at least one item to return');
        return;
      }

      for (const item of editingReturn.items) {
        if (!item.item_id || !item.warehouse_id || item.quantity <= 0 || !item.return_reason) {
          setError('Please fill in all required fields for each item');
          return;
        }
      }

      // Create stock transactions for each item and adjust stock levels
      for (const item of editingReturn.items) {
        await createStockTransaction({
          item_id: item.item_id,
          warehouse_id: Number(item.warehouse_id),
          transaction_type: editingReturn.return_type === 'RETURN_TO_STORE'
            ? StockTransactionType.RETURN_TO_STORE
            : StockTransactionType.RETURN_TO_SUPPLIER,
          quantity: -item.quantity, // Negative quantity for returns
          source_table: 'stock_return',
          source_id: editingReturn.reference_number,
          transaction_date: editingReturn.return_date,
          notes: [
            `Return Reason: ${item.return_reason}`,
            `Condition: ${item.condition}`,
            editingReturn.notes,
            item.notes,
            item.batch_number ? `Batch: ${item.batch_number}` : ''
          ].filter(Boolean).join(' | ')
        });

        // Reduce stock levels only for returns back to store
        if (editingReturn.return_type === 'RETURN_TO_STORE') {
          const warehouseId = Number(item.warehouse_id);
          const existingLevel = stockLevels.find(
            l => String(l.item_id) === String(item.item_id) && l.warehouse_id === warehouseId
          );
          if (existingLevel) {
            await updateStockLevel(existingLevel.id, { quantity: existingLevel.quantity - item.quantity });
          } else {
            await createStockLevel({
              item_id: Number(item.item_id),
              warehouse_id: warehouseId,
              quantity: -item.quantity
            });
          }
        }
      }

      setSuccess('Stock return recorded successfully');
      handleCloseDialog();
    } catch (err) {
      setError('Failed to save stock return');
    } finally {
      setLoading(false);
    }
  };

  const getReturnTypeChip = (returnType: string) => (
    <Badge variant={returnType === 'RETURN_TO_STORE' ? 'primary' : 'secondary'} size="sm">
      {returnType === 'RETURN_TO_STORE' ? 'To Store' : 'To Supplier'}
    </Badge>
  );

  return (
    <div className="p-6 space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 dark:bg-primary-500/15 text-primary-600 dark:text-primary-400">
            <ArrowUturnLeftIcon className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-surface-foreground">Stock Returns</h1>
            <p className="text-sm text-surface-muted-fg">Send stock back to storage or suppliers</p>
          </div>
        </div>
        <Button leftIcon={<PlusIcon className="h-4 w-4" />} onClick={() => handleOpenDialog()} disabled={loading}>
          New Return
        </Button>
      </div>

      {error && (
        <Alert variant="destructive" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert variant="success" onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      <Card title="Recent Stock Returns">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-surface-border text-sm">
            <thead>
              <tr className="table-header">
                <th className="px-4 py-3 text-left font-medium">Reference</th>
                <th className="px-4 py-3 text-left font-medium">Date</th>
                <th className="px-4 py-3 text-left font-medium">Type</th>
                <th className="px-4 py-3 text-left font-medium">Items Count</th>
                <th className="px-4 py-3 text-left font-medium">Total Quantity</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-surface-muted-fg">
                    Loading...
                  </td>
                </tr>
              ) : returns.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-surface-muted-fg">
                    No stock returns found
                  </td>
                </tr>
              ) : (
                returns.map((returnRecord) => (
                  <tr key={returnRecord.id} className="hover:bg-surface-accent/60 transition-colors">
                    <td className="px-4 py-3 font-medium text-surface-foreground">{returnRecord.reference_number || 'N/A'}</td>
                    <td className="px-4 py-3 text-surface-muted-fg">{new Date(returnRecord.return_date).toLocaleDateString()}</td>
                    <td className="px-4 py-3">{getReturnTypeChip(returnRecord.return_type)}</td>
                    <td className="px-4 py-3 text-surface-muted-fg">{returnRecord.items.length}</td>
                    <td className="px-4 py-3 text-surface-muted-fg">{returnRecord.total_quantity}</td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="ghost" size="sm" onClick={() => handleOpenDialog(returnRecord)}>
                        View
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Return Dialog */}
      <DialogForm
        isOpen={openDialog}
        onClose={handleCloseDialog}
        title={editingReturn?.reference_number && editingReturn.reference_number.startsWith('RET-') ? 'New Stock Return' : 'View Stock Return'}
        description="Specify the items being returned, their condition and destination."
        size="xl"
        onSubmit={(e) => { e.preventDefault(); void handleSaveReturn(); }}
      >
        {editingReturn && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-5">
              <Input
                label="Return Date"
                type="date"
                value={editingReturn.return_date}
                onChange={(e) => setEditingReturn({
                  ...editingReturn,
                  return_date: e.target.value
                })}
              />
              <Input
                label="Reference Number"
                value={editingReturn.reference_number}
                onChange={(e) => setEditingReturn({
                  ...editingReturn,
                  reference_number: e.target.value
                })}
              />
              <Select
                label="Return Type"
                value={editingReturn.return_type}
                onChange={(e) => setEditingReturn({
                  ...editingReturn,
                  return_type: e.target.value as 'RETURN_TO_STORE' | 'RETURN_TO_SUPPLIER'
                })}
              >
                <option value="RETURN_TO_STORE">Return to Store</option>
                <option value="RETURN_TO_SUPPLIER">Return to Supplier</option>
              </Select>
            </div>

            {editingReturn.return_type === 'RETURN_TO_SUPPLIER' && (
              <Input
                label="Supplier Reference"
                value={editingReturn.supplier_reference}
                onChange={(e) => setEditingReturn({
                  ...editingReturn,
                  supplier_reference: e.target.value
                })}
              />
            )}

            <Input
              label="Notes"
              value={editingReturn.notes}
              onChange={(e) => setEditingReturn({
                ...editingReturn,
                notes: e.target.value
              })}
            />

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-surface-foreground">Items to Return</h3>
                <Button type="button" variant="outline" size="sm" leftIcon={<PlusIcon className="h-4 w-4" />} onClick={handleAddItem}>
                  Add Item
                </Button>
              </div>

              {editingReturn.items.length === 0 ? (
                <div className="rounded-lg border border-dashed border-surface-border px-4 py-8 text-center text-sm text-surface-muted-fg">
                  No items added. Click "Add Item" to start.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-surface-border">
                  <table className="min-w-full divide-y divide-surface-border text-sm">
                    <thead>
                      <tr className="table-header">
                        <th className="px-3 py-2.5 text-left font-medium">Item</th>
                        <th className="px-3 py-2.5 text-left font-medium">Warehouse</th>
                        <th className="px-3 py-2.5 text-left font-medium w-20">Qty</th>
                        <th className="px-3 py-2.5 text-left font-medium w-28">Batch/Lot</th>
                        <th className="px-3 py-2.5 text-left font-medium min-w-[140px]">Reason</th>
                        <th className="px-3 py-2.5 text-left font-medium w-28">Condition</th>
                        <th className="px-3 py-2.5 text-left font-medium w-28">Notes</th>
                        <th className="px-3 py-2.5 text-right font-medium w-14"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-border">
                      {editingReturn.items.map((item, index) => (
                        <tr key={index}>
                          <td className="px-3 py-2 min-w-[200px]">
                            <Select
                              searchable
                              size="sm"
                              placeholder="Select item"
                              options={items.map(i => ({ value: String(i.id), label: i.name }))}
                              value={String(item.item_id ?? '')}
                              onValueChange={(value) => handleItemChange(index, 'item_id', value)}
                            />
                          </td>
                          <td className="px-3 py-2 min-w-[140px]">
                            <Select
                              size="sm"
                              placeholder="Select warehouse"
                              value={item.warehouse_id ? String(item.warehouse_id) : ''}
                              onChange={(e) => handleItemChange(index, 'warehouse_id', e.target.value)}
                            >
                              <option value="">Select warehouse…</option>
                              {warehouses.map((warehouse) => (
                                <option key={warehouse.id} value={warehouse.id}>
                                  {warehouse.name}
                                </option>
                              ))}
                            </Select>
                          </td>
                          <td className="px-3 py-2">
                            <Input
                              size="sm"
                              type="number"
                              min={0}
                              value={item.quantity}
                              onChange={(e) => handleItemChange(index, 'quantity', Number(e.target.value))}
                            />
                          </td>
                          <td className="px-3 py-2">
                            <Input
                              size="sm"
                              value={item.batch_number}
                              onChange={(e) => handleItemChange(index, 'batch_number', e.target.value)}
                            />
                          </td>
                          <td className="px-3 py-2">
                            <Select
                              size="sm"
                              value={item.return_reason}
                              onChange={(e) => handleItemChange(index, 'return_reason', e.target.value)}
                            >
                              <option value="">Select reason…</option>
                              {RETURN_REASONS.map((reason) => (
                                <option key={reason} value={reason}>
                                  {reason}
                                </option>
                              ))}
                            </Select>
                          </td>
                          <td className="px-3 py-2">
                            <Select
                              size="sm"
                              value={item.condition}
                              onChange={(e) => handleItemChange(index, 'condition', e.target.value)}
                            >
                              <option value="GOOD">Good</option>
                              <option value="DAMAGED">Damaged</option>
                              <option value="EXPIRED">Expired</option>
                              <option value="DEFECTIVE">Defective</option>
                            </Select>
                          </td>
                          <td className="px-3 py-2">
                            <Input
                              size="sm"
                              value={item.notes}
                              onChange={(e) => handleItemChange(index, 'notes', e.target.value)}
                            />
                          </td>
                          <td className="px-3 py-2 text-right">
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(index)}
                              className="rounded-md p-1.5 text-red-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                              aria-label={`Remove item ${index + 1}`}
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {error && (
              <Alert variant="destructive">
                {error}
              </Alert>
            )}

            <div className="flex items-center justify-end gap-3 border-t border-surface-border pt-4">
              <Button variant="secondary" onClick={handleCloseDialog} disabled={loading}>
                Cancel
              </Button>
              <Button
                type="submit"
                loading={loading}
                disabled={loading || !editingReturn?.items.length}
              >
                Save Return
              </Button>
            </div>
          </div>
        )}
      </DialogForm>
    </div>
  );
};

const StockReturnsPage: React.FC = () => (
  <div className="space-y-6">
    <StockReturnsPageContent />
  </div>
);

export default StockReturnsPage;
